// ============================================================
// Prestige / Level-Durchlauf
// ============================================================
function startNextLevelCycle() {
  game.prestige++;
  if (game.stats) game.stats.prestigeCount++;

  game.data                = 0;
  game.productionMultiplier = 1;
  game.aiUpgradeBought     = false;
  game.buildingUpgrades    = [];
  game.buildings           = createBuildings();
  game.offlineUpgradesBought = 0;
  game.offlineLimit        = BASE_OFFLINE_LIMIT;
  game.offlineUpgradeCost  = BASE_OFFLINE_UPGRADE_COST;
  game.aiUpgradeCost       = BASE_AI_UPGRADE_COST;
  game.clickUpgradesBought = [];
  game.clickPower          = 1;
  game.missions            = createMissionState();

  ensureActiveMissions();
  markMissionsDirty();
  maybeRenderClickUpgrades(true);
  updateUI();
  renderBuildings();

  const offlineInfo = document.getElementById('offlineInfo');
  if (offlineInfo) {
    offlineInfo.style.display = 'block';
    offlineInfo.innerHTML = `<strong>Neuer Level-Durchlauf gestartet</strong><br>Level-Rang: ${game.prestige}<br>Missionen wurden zurückgesetzt und schwerer skaliert.`;
    setTimeout(() => { offlineInfo.style.display = 'none'; }, 5000);
  }
}

function prestige() {
  if ((game.missions?.completedCount || 0) >= MISSION_TEMPLATES.length) {
    startNextLevelCycle();
  }
}

// ============================================================
// Manueller Klick
// ============================================================
function manualClick() {
  const prestigeClickBonus = Math.pow(1.02, game.prestige);
  const totalClick = game.clickPower * prestigeClickBonus;

  game.data += totalClick;
  if (game.stats) {
    game.stats.totalClicks++;
    game.stats.totalData += totalClick;
  }

  showFloatingText('+' + formatData(totalClick), 'click');
  showClickPulse();
  updateUI();
}

// ============================================================
// Game-Loop
// ============================================================
let lastTickTime = Date.now();
let lastBuildingsRenderTime = 0;
let lastAffordabilityState  = null;
const BUILDINGS_RENDER_INTERVAL = 500;

function hasAffordabilityChanged() {
  const currentState = game.buildings.map(b => {
    const isUnlocked = game.data >= b.unlockAt || b.owned > 0;
    if (!isUnlocked) return null;
    const amount      = game.buyAmount === -1 ? calculateMaxBuy(b) : game.buyAmount;
    const fallbackAmt = game.buyAmount === -1 && amount === 0 ? 1 : amount;
    const cost        = fallbackAmt > 0 ? calculateBulkCost(b, fallbackAmt) : 0;
    return fallbackAmt > 0 && game.data >= cost;
  }).join(',');

  if (currentState !== lastAffordabilityState) {
    lastAffordabilityState = currentState;
    return true;
  }
  return false;
}

function gameLoop() {
  const now       = Date.now();
  const deltaTime = (now - lastTickTime) / 1000;
  lastTickTime    = now;

  const produced = productionPerSecond() * deltaTime;
  game.data += produced;
  if (game.stats) game.stats.totalData += produced;

  updateUI();
  checkAchievements();
  maybeRenderMissions();

  if (now - lastBuildingsRenderTime > BUILDINGS_RENDER_INTERVAL) {
    if (hasAffordabilityChanged()) {
      try { renderBuildings(); } catch (e) { /* Tab nicht sichtbar */ }
    }
    lastBuildingsRenderTime = now;
  }
}

// ============================================================
// Startup
// ============================================================
loadGame();
renderBuildings();
renderBuildingUpgrades();
maybeRenderClickUpgrades(true);
initMissionUIInteractions();
markMissionsDirty();
maybeRenderMissions(true);
const savedBuyAmount = sessionStorage.getItem('buyAmount');
setBuyAmount(savedBuyAmount ? parseInt(savedBuyAmount) : 1);
updateUI();

setInterval(gameLoop, 100);
setInterval(saveGame, 5000);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveGame();
});

window.addEventListener('focus', () => {
  renderBuildings();
  updateUI();
});

window.addEventListener('beforeunload', saveGame);

const buildingsContainer = document.getElementById('buildings');
if (buildingsContainer) {
  buildingsContainer.addEventListener('mouseenter', () => renderBuildings());
}

// ============================================================
// Debug / Balance-Helfer (nur Konsole)
// ============================================================
window.balanceTargets = [
  { name: '1 MB', value: 8388608 },
  { name: '1 GB', value: 8589934592 },
  { name: '1 TB', value: 8796093022208 },
  { name: '1 PB', value: 9007199254740992 }
];

window.estimateTimeToData = function(targetData) {
  const pps = Math.max(productionPerSecond(), 0);
  if (pps <= 0) return Infinity;
  return Math.max(0, targetData - game.data) / pps;
};

window.runBalanceCheck = function() {
  const pps = productionPerSecond();
  const results = window.balanceTargets.map(target => {
    const seconds = window.estimateTimeToData(target.value);
    const minutes = Number.isFinite(seconds) ? (seconds / 60).toFixed(2) : '∞';
    return `${target.name}: ${minutes} min`;
  });
  return {
    currentData:     formatData(game.data),
    perSecond:       formatData(pps) + '/s',
    softcapStage1:   formatData(SOFTCAP_STAGE1_START) + '/s',
    softcapStage2:   formatData(SOFTCAP_STAGE2_START) + '/s',
    targets: results
  };
};

window.resetStats = function() {
  if (game.stats) {
    game.stats.upgradesBought  = game.buildingUpgrades.length + game.offlineUpgradesBought + (game.aiUpgradeBought ? 1 : 0);
    game.stats.buildingsBought = game.buildings.reduce((sum, b) => sum + b.owned, 0);
    saveGame();
    updateUI();
  }
};

window.debugGame = function() {
  console.log('=== Game Debug Info ===');
  console.log('Gebäude-Upgrades:', game.buildingUpgrades.length);
  console.log('Offline-Upgrades:', game.offlineUpgradesBought);
  console.log('KI-Upgrade:',       game.aiUpgradeBought ? 1 : 0);
  console.log('Summe:',            game.buildingUpgrades.length + game.offlineUpgradesBought + (game.aiUpgradeBought ? 1 : 0));
  console.log('Stats zeigt:',      game.stats.upgradesBought);
};
