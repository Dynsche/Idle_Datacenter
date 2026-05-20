// ============================================================
// Hilfsfunktionen
// ============================================================
function formatData(bits) {
  let value = bits;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < UNITS.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${UNITS[unitIndex]}`;
}

function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem('datacenterDeviceId');
  if (!deviceId) {
    deviceId = 'device-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('datacenterDeviceId', deviceId);
  }
  return deviceId;
}

function createBuildings() {
  return DEFAULT_BUILDINGS.map(building => ({
    ...building,
    owned: 0,
    cost: building.baseCost
  }));
}

function createMissionState() {
  return {
    activeIds: [],
    claimedIds: [],
    completedCount: 0,
    currentLevel: 1
  };
}

// ============================================================
// Spielzustand
// ============================================================
let game = {
  data: 0,
  clickPower: 1,
  clickUpgradesBought: [],
  prestige: 0,
  productionMultiplier: 1,
  offlineLimit: BASE_OFFLINE_LIMIT,
  lastUpdate: Date.now(),
  lastDeviceId: getOrCreateDeviceId(),
  aiUpgradeBought: false,
  offlineUpgradeCost: BASE_OFFLINE_UPGRADE_COST,
  aiUpgradeCost: BASE_AI_UPGRADE_COST,
  buildings: createBuildings(),
  buyAmount: 1,
  offlineUpgradesBought: 0,
  buildingUpgrades: [],
  prestigeRequirement: BASE_PRESTIGE_REQUIREMENT,
  balanceVersion: SAVE_BALANCE_VERSION,
  stats: {
    totalData: 0,
    totalClicks: 0,
    buildingsBought: 0,
    upgradesBought: 0,
    prestigeCount: 0,
    playTime: 0,
    offlineTime: 0,
    offlineTimeUsed: 0,
    startTime: Date.now()
  },
  missions: createMissionState(),
  achievements: {},
  resources: {},           // wird in initResourceState() befüllt
  resourceBuildings: {}    // wird in initResourceState() befüllt
};

// Nach dem Laden von RESOURCE_DEFS direkt initialisieren
function initResourceState() {
  const rs = createResourceState();
  Object.keys(rs.resources).forEach(k => {
    if (!(k in game.resources)) game.resources[k] = rs.resources[k];
  });
  Object.keys(rs.resourceBuildings).forEach(k => {
    if (!game.resourceBuildings[k]) game.resourceBuildings[k] = {};
    Object.keys(rs.resourceBuildings[k]).forEach(b => {
      if (!(b in game.resourceBuildings[k])) game.resourceBuildings[k][b] = 0;
    });
  });
}

// ============================================================
// Produktionsberechnung
// ============================================================
function getBuildingUpgradeMultiplier(buildingName) {
  let multiplier = 1;
  game.buildingUpgrades.forEach(upgradeIndex => {
    const upgrade = BUILDING_UPGRADES[upgradeIndex];
    const targets = Array.isArray(upgrade.targetBuilding) ? upgrade.targetBuilding : [upgrade.targetBuilding];
    if (targets.includes(buildingName)) {
      multiplier *= upgrade.multiplier;
    }
  });
  return multiplier;
}

function getSupportMultiplierFromBuilding(building) {
  const upgradeMultiplier = getBuildingUpgradeMultiplier(building.name);
  const supportPower = building.owned * building.production * upgradeMultiplier;
  return 1 + (Math.log2(1 + supportPower) * SUPPORT_LOG_FACTOR);
}

function applyProductionSoftcap(rawProduction) {
  let capped = rawProduction;
  if (capped > SOFTCAP_STAGE1_START) {
    capped = SOFTCAP_STAGE1_START * Math.pow(capped / SOFTCAP_STAGE1_START, SOFTCAP_STAGE1_POWER);
  }
  if (capped > SOFTCAP_STAGE2_START) {
    capped = SOFTCAP_STAGE2_START * Math.pow(capped / SOFTCAP_STAGE2_START, SOFTCAP_STAGE2_POWER);
  }
  return capped;
}

function productionPerSecond() {
  if (!game.buildings || game.buildings.length === 0) return 0;

  const effectiveProduction = game.buildings.map(building => {
    const upgradeMultiplier = getBuildingUpgradeMultiplier(building.name);
    return building.owned * building.production * upgradeMultiplier;
  });

  for (let i = game.buildings.length - 1; i > 0; i--) {
    const supporterOwned = game.buildings[i].owned;
    const targetOwned   = game.buildings[i - 1].owned;
    if (supporterOwned > 0 && targetOwned > 0) {
      const supportMultiplier = getSupportMultiplierFromBuilding(game.buildings[i]);
      const transferredPower  = effectiveProduction[i] * SUPPORT_TRANSFER_RATIO;
      effectiveProduction[i - 1] = (effectiveProduction[i - 1] + transferredPower) * supportMultiplier;
    }
  }

  const itOutput  = effectiveProduction[0] || 0;
  const resourceMult = getResourceProductionMultiplier();
  const rawOutput = itOutput * game.productionMultiplier * (1 + game.prestige * PRESTIGE_BONUS_PER_LEVEL) * resourceMult;
  return applyProductionSoftcap(rawOutput);
}

// ============================================================
// Kaufkalkulation
// ============================================================
function calculateBulkCost(building, amount) {
  let totalCost = 0;
  const prestigeDiscount = Math.pow(0.97, game.prestige);
  for (let i = 0; i < amount; i++) {
    totalCost += Math.floor(building.baseCost * Math.pow(BUILDING_COST_GROWTH, building.owned + i) * prestigeDiscount);
  }
  return totalCost;
}

function calculateMaxBuy(building) {
  let count = 0;
  let totalCost = 0;
  const prestigeDiscount = Math.pow(0.97, game.prestige);
  while (totalCost + Math.floor(building.baseCost * Math.pow(BUILDING_COST_GROWTH, building.owned + count) * prestigeDiscount) <= game.data) {
    totalCost += Math.floor(building.baseCost * Math.pow(BUILDING_COST_GROWTH, building.owned + count) * prestigeDiscount);
    count++;
    if (count > 10000) break;
  }
  return count;
}

function getPurchaseEfficiency(building, amount) {
  if (amount <= 0) return 0;
  const cost = calculateBulkCost(building, amount);
  if (cost <= 0) return 0;
  const multiplier     = getBuildingUpgradeMultiplier(building.name);
  const productionGain = amount * building.production * multiplier;
  return productionGain / cost;
}

function getBestAffordableEfficiency(amount) {
  let best = null;
  game.buildings.forEach((building, index) => {
    const isUnlocked = game.data >= building.unlockAt || building.owned > 0;
    if (!isUnlocked) return;
    const buyAmount = amount === -1 ? calculateMaxBuy(building) : amount;
    if (buyAmount <= 0) return;
    const cost = calculateBulkCost(building, buyAmount);
    if (cost > game.data) return;
    const efficiency = getPurchaseEfficiency(building, buyAmount);
    if (!best || efficiency > best.efficiency) {
      best = { index, efficiency, amount: buyAmount, cost };
    }
  });
  return best;
}

function canAffordMultiplier(amount) {
  if (game.buildings.length === 0) return false;
  for (let building of game.buildings) {
    const actualAmount = amount === -1 ? calculateMaxBuy(building) : amount;
    if (actualAmount > 0) {
      const cost = calculateBulkCost(building, actualAmount);
      if (game.data >= cost) return true;
    }
  }
  return false;
}

// ============================================================
// Ressourcen-Hilfsfunktionen
// ============================================================
function createResourceState() {
  const resources = {};
  const resourceBuildings = {};
  RESOURCE_DEFS.forEach(def => {
    resources[def.id] = 0;
    resourceBuildings[def.id] = {};
    def.buildings.forEach(b => {
      resourceBuildings[def.id][b.id] = 0;
    });
  });
  return { resources, resourceBuildings };
}

function isResourceUnlocked(def) {
  if (game.data < def.unlockAt) return false;
  if (def.dependsOn) {
    const dep = RESOURCE_DEFS.find(d => d.id === def.dependsOn);
    if (!dep) return false;
    // Abhängigkeit: mindestens 1 Gebäude der Vorgänger-Ressource gebaut
    const depBuildings = game.resourceBuildings[dep.id] || {};
    const totalOwned = Object.values(depBuildings).reduce((s, v) => s + v, 0);
    if (totalOwned < 1) return false;
  }
  return true;
}

function resourceProductionPerSecond(resId) {
  const def = RESOURCE_DEFS.find(d => d.id === resId);
  if (!def) return 0;
  const buildings = game.resourceBuildings[resId] || {};
  let total = 0;
  def.buildings.forEach(b => {
    total += (buildings[b.id] || 0) * b.production;
  });
  return total;
}

function getResourceBuildingCost(resId, buildingId) {
  const def = RESOURCE_DEFS.find(d => d.id === resId);
  if (!def) return Infinity;
  const bDef = def.buildings.find(b => b.id === buildingId);
  if (!bDef) return Infinity;
  const owned = (game.resourceBuildings[resId] || {})[buildingId] || 0;
  return Math.floor(bDef.baseCost * Math.pow(1.15, owned));
}

// Maximale Ressourcen-Einheiten, die noch Bonus liefern (darüber → Überschuss)
function getMaxResourceUnits(def) {
  return (def.maxBonus / def.productionBonus) * def.bonusPerUnits;
}

// Daten-Bits pro Sekunde, die aus Überschuss-Produktion entstehen
function getExcessDataRate(def) {
  const amount = game.resources[def.id] || 0;
  const max = getMaxResourceUnits(def);
  if (amount < max) return 0;
  const rps = resourceProductionPerSecond(def.id);
  return rps * def.excessConversion;
}

function getResourceProductionMultiplier() {
  let multiplier = 1;
  RESOURCE_DEFS.forEach(def => {
    const amount = (game.resources[def.id] || 0);
    if (amount <= 0) return;
    const bonus = Math.min(
      (amount / def.bonusPerUnits) * def.productionBonus,
      def.maxBonus
    );
    multiplier += bonus;
  });
  return multiplier;
}

// ============================================================
// Spielstand-Serialisierung
// ============================================================
function getSerializableGameState() {
  return JSON.parse(JSON.stringify(game));
}
