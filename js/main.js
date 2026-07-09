// ============================================================
// Rang-Durchlauf
// ============================================================
function startNextLevelCycle() {
  game.prestige++;
  if (game.stats) game.stats.prestigeCount++;

  game.data = 0;
  game.operators = 0;
  game.totalOperatorsEarned = 0;
  game.industries = createIndustryState();
  game.productionMultiplier = 1;
  game.aiUpgradeBought = false;
  game.buildingUpgrades = [];
  game.buildings = createBuildings();
  game.offlineUpgradesBought = 0;
  game.offlineLimit = BASE_OFFLINE_LIMIT;
  game.offlineUpgradeCost = BASE_OFFLINE_UPGRADE_COST;
  game.aiUpgradeCost = BASE_AI_UPGRADE_COST;
  game.clickUpgradesBought = [];
  game.clickPower = 1;
  game.missions = createMissionState();

  ensureActiveMissions();
  markMissionsDirty();
  maybeRenderClickUpgrades(true);
  updateUI();
  renderBuildings();
  renderResourceTopbar();

  const offlineInfo = document.getElementById('offlineInfo');
  if (offlineInfo) {
    offlineInfo.style.display = 'block';
    offlineInfo.innerHTML = `<strong>Neuer Rang-Durchlauf gestartet</strong><br>Rang: ${game.prestige}<br>Produktionsketten wurden zurueckgesetzt und skalieren jetzt staerker.`;
    setTimeout(() => { offlineInfo.style.display = 'none'; }, 5000);
  }
}

function prestige() {
  if ((game.missions?.completedCount || 0) >= getReachableMissionTemplates().length) {
    startNextLevelCycle();
  }
}

// ============================================================
// Manueller Startimpuls
// ============================================================
function manualClick() {
  ensureIndustryState();
  const prestigeClickBonus = Math.pow(1.02, game.prestige);
  const totalClick = game.clickPower * prestigeClickBonus;

  game.industries.data.amount += totalClick;
  game.data = game.industries.data.amount;
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
let lastAffordabilityState = null;
const BUILDINGS_RENDER_INTERVAL = 500;

function getChainAffordabilitySignature() {
  const parts = [Math.floor(game.operators), game.buyAmount];
  INDUSTRY_DEFS.forEach(industryDef => {
    const industry = getIndustryState(industryDef.id);
    parts.push(industryDef.id, Math.floor(industry.amount));
    industry.producers.forEach((producer, index) => {
      parts.push(index, Math.floor(producer.owned), calculateMaxProducerBuy(industryDef.id, index));
    });
  });
  return parts.join('|');
}

function hasAffordabilityChanged() {
  const currentState = getChainAffordabilitySignature();
  if (currentState !== lastAffordabilityState) {
    lastAffordabilityState = currentState;
    return true;
  }
  return false;
}

function applyIndustryProduction(deltaTime) {
  ensureIndustryState();

  const operatorGain = getOperatorRate() * deltaTime;
  game.operators += operatorGain;
  game.totalOperatorsEarned += operatorGain;

  INDUSTRY_DEFS.forEach(industryDef => {
    const industry = game.industries[industryDef.id];
    for (let i = industryDef.producers.length - 1; i >= 0; i--) {
      const produced = getProducerRate(industryDef.id, i) * deltaTime;
      if (produced <= 0) continue;
      if (i === 0) {
        industry.amount += produced;
        if (industryDef.id === 'data') {
          game.data = industry.amount;
          if (game.stats) game.stats.totalData += produced;
        }
      } else {
        industry.producers[i - 1].owned += produced;
      }
    }
  });
}

function gameLoop() {
  const now = Date.now();
  const deltaTime = (now - lastTickTime) / 1000;
  lastTickTime = now;

  applyIndustryProduction(deltaTime);

  updateUI();
  checkAchievements();
  maybeRenderMissions();
  renderResourceTopbar();

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
ensureIndustryState();
initResourceState();
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

// ============================================================
// Debug / Balance-Helfer
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
    const minutes = Number.isFinite(seconds) ? (seconds / 60).toFixed(2) : 'inf';
    return `${target.name}: ${minutes} min`;
  });
  return {
    currentData: formatData(game.data),
    operators: Math.floor(game.operators).toLocaleString(),
    perSecond: formatData(pps) + '/s',
    operatorRate: getOperatorRate().toFixed(2) + '/s',
    targets: results
  };
};

window.resetStats = function() {
  if (game.stats) {
    game.stats.upgradesBought = countOwnedUpgrades();
    game.stats.buildingsBought = countOwnedBuildings();
    saveGame();
    updateUI();
  }
};

window.debugGame = function() {
  console.log('=== Game Debug Info ===');
  console.log('Rang:', game.prestige);
  console.log('Operatoren:', game.operators);
  console.log('Daten/s:', productionPerSecond());
  console.log('Industrien:', game.industries);
};
