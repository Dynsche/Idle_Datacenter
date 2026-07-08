// ============================================================
// UI-Rendering & Aktualisierungen
// ============================================================

function updateUI() {
  let el;
  if ((el = document.getElementById('data')))       el.innerText = formatData(game.data);
  if ((el = document.getElementById('perSecond')))  el.innerText = formatData(productionPerSecond()) + '/s';

  const totalSeconds = Math.floor(game.offlineLimit);
  const hours   = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if ((el = document.getElementById('offlineHours'))) el.innerText = `${hours}h ${minutes}m`;

  if ((el = document.getElementById('prestige')))            el.innerText = game.prestige;
  if ((el = document.getElementById('offlineUpgradeCost')))  el.innerText = formatData(game.offlineUpgradeCost);
  if ((el = document.getElementById('offlineUpgradesCount')))el.innerText = game.offlineUpgradesBought;
  if ((el = document.getElementById('aiUpgradeCost')))       el.innerText = formatData(game.aiUpgradeCost);
  if ((el = document.getElementById('formulaTransferRatio')))el.innerText = `${Math.round(SUPPORT_TRANSFER_RATIO * 100)}%`;
  if ((el = document.getElementById('formulaRangBonus')))    el.innerText = (PRESTIGE_BONUS_PER_LEVEL * 100).toFixed(0);
  if ((el = document.getElementById('formulaSoftcapStage1')))el.innerText = formatData(SOFTCAP_STAGE1_START);
  if ((el = document.getElementById('formulaSoftcapStage2')))el.innerText = formatData(SOFTCAP_STAGE2_START);
  if ((el = document.getElementById('clickPowerDisplay')))   el.innerText = formatData(game.clickPower);
  if ((el = document.getElementById('gameVersion')))         el.innerText = GAME_VERSION;

  updateBuyButtons();
  updateUpgradeButtons();
  checkUpgradesTabUnlock();
  updateTabNotifications();
  updateStats();

  const upgradesTab = document.getElementById('tab-upgrades');
  if (upgradesTab && upgradesTab.classList.contains('active')) {
    maybeRenderClickUpgrades();
    maybeRenderResearchUpgrades();
  }

  const achievementsTab = document.getElementById('tab-achievements');
  if (achievementsTab && achievementsTab.classList.contains('active')) {
    renderAchievements();
  }

  maybeRenderMissions();
}

function updateStats() {
  if (!game.stats) return;
  let el;
  if ((el = document.getElementById('statTotalData')))   el.innerText = formatData(game.stats.totalData);
  if ((el = document.getElementById('statTotalClicks'))) el.innerText = game.stats.totalClicks.toLocaleString();
  if ((el = document.getElementById('statBuildingsBought'))) el.innerText = game.stats.buildingsBought.toLocaleString();
  if ((el = document.getElementById('statUpgradesBought')))  el.innerText = game.stats.upgradesBought.toLocaleString();
  if ((el = document.getElementById('statPrestigeCount')))   el.innerText = game.stats.prestigeCount;

  const totalPlayTime = game.stats.playTime + (Date.now() - game.stats.startTime);
  const playHours   = Math.floor(totalPlayTime / 3600000);
  const playMinutes = Math.floor((totalPlayTime % 3600000) / 60000);
  if ((el = document.getElementById('statPlaytime'))) el.innerText = `${playHours}h ${playMinutes}m`;

  const offlineHours   = Math.floor(game.stats.offlineTime / 3600);
  const offlineMinutes = Math.floor((game.stats.offlineTime % 3600) / 60);
  if ((el = document.getElementById('statOfflineTime'))) el.innerText = `${offlineHours}h ${offlineMinutes}m`;

  const offlineUsedHours   = Math.floor((game.stats.offlineTimeUsed || 0) / 3600);
  const offlineUsedMinutes = Math.floor(((game.stats.offlineTimeUsed || 0) % 3600) / 60);
  if ((el = document.getElementById('statOfflineTimeUsed'))) el.innerText = `${offlineUsedHours}h ${offlineUsedMinutes}m`;

  const clicksPerHour = totalPlayTime > 0 ? Math.round((game.stats.totalClicks / totalPlayTime) * 3600000) : 0;
  if ((el = document.getElementById('statClicksPerHour'))) el.innerText = clicksPerHour.toLocaleString();

  const dataPerHour = totalPlayTime > 0 ? Math.round((game.stats.totalData / totalPlayTime) * 3600000) : 0;
  if ((el = document.getElementById('statDataPerHour'))) el.innerText = formatData(dataPerHour);

  const totalBuildings = game.buildings.reduce((sum, b) => sum + b.owned, 0);
  if ((el = document.getElementById('statCurrentBuildings'))) el.innerText = totalBuildings.toLocaleString();

  const activeUpgrades = game.clickUpgradesBought.length + game.buildingUpgrades.length + (game.aiUpgradeBought ? 1 : 0) + game.offlineUpgradesBought;
  if ((el = document.getElementById('statActiveUpgrades'))) el.innerText = activeUpgrades.toLocaleString();

  const unlockedAchievements = Object.keys(game.achievements || {}).filter(k => game.achievements[k] === true).length;
  if ((el = document.getElementById('statAchievements'))) el.innerText = `${unlockedAchievements}/${ACHIEVEMENTS.length}`;

  const prestigeBonus = (game.prestige * PRESTIGE_BONUS_PER_LEVEL * 100).toFixed(1);
  if ((el = document.getElementById('statPrestigeBonus'))) el.innerText = `+${prestigeBonus}%`;
}

function checkUpgradesTabUnlock() {
  const upgradesTab = document.getElementById('upgradesTab');
  if (upgradesTab) upgradesTab.style.display = 'block';
}

function updateTabNotifications() {
  const upgradesTab = document.getElementById('upgradesTab');
  if (!upgradesTab) return;
  upgradesTab.classList.remove('has-notification');
  const el = document.getElementById('tab-upgrades');
  const upgradesActive = el ? el.classList.contains('active') : false;

  const hasAffordableBuildingUpgrade = BUILDING_UPGRADES.some((upgrade, index) =>
    !game.buildingUpgrades.includes(index) && game.data >= upgrade.unlockAt && game.data >= upgrade.cost
  );
  const hasAffordableClickUpgrade = (() => {
    const nextIndex = CLICK_UPGRADES.findIndex((u, i) => !game.clickUpgradesBought.includes(i));
    if (nextIndex === -1) return false;
    const next = CLICK_UPGRADES[nextIndex];
    return game.data >= next.unlockAt && game.data >= next.cost;
  })();
  const hasAffordableResearchUpgrade = (game.data >= game.offlineUpgradeCost) || (!game.aiUpgradeBought && game.data >= game.aiUpgradeCost);

  if ((hasAffordableBuildingUpgrade || hasAffordableClickUpgrade || hasAffordableResearchUpgrade) && !upgradesActive) {
    upgradesTab.classList.add('has-notification');
  }

  // Ressourcen-Tab Notification: neues Gebäude kaufbar
  const resourcesTab = document.getElementById('resourcesTab');
  if (resourcesTab) {
    resourcesTab.classList.remove('has-notification');
    const resActive = document.getElementById('tab-resources')?.classList.contains('active');
    const hasAffordableResource = RESOURCE_DEFS.some(def => {
      if (!isResourceUnlocked(def)) return false;
      return def.buildings.some(bDef => game.data >= getResourceBuildingCost(def.id, bDef.id));
    });
    if (hasAffordableResource && !resActive) resourcesTab.classList.add('has-notification');
  }
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));

  const el = document.getElementById('tab-' + tabName);
  if (el) el.classList.add('active');

  const tabButtons = {
    buildings:  '#buildingsTab',
    upgrades:   '#upgradesTab',
    resources:  '#resourcesTab',
    achievements: '#achievementsTab',
    stats:      '#statsTab',
    account:    '#accountTab',
    help:       '#helpTab'
  };
  if (tabButtons[tabName]) {
    document.querySelector(tabButtons[tabName])?.classList.add('active');
  }

  if (tabName === 'upgrades') {
    renderBuildingUpgrades();
    renderResearchUpgrades();
    maybeRenderClickUpgrades(true);
  }
  if (tabName === 'resources') renderResourceTab();
  if (tabName === 'achievements') renderAchievements();
  if (tabName === 'stats')   updateStats();
  if (tabName === 'account') { updateCloudUserUI(); updateStats(); }

  updateTabNotifications();
}

function updateBuyButtons() {
  if (typeof updateBuyButtonAffordability === 'function') {
    updateBuyButtonAffordability();
  }
}

function updateUpgradeButtons() {
  const offlineBtn = document.getElementById('btnOfflineUpgrade');
  if (offlineBtn) offlineBtn.disabled = game.data < game.offlineUpgradeCost;

  const aiBtn = document.getElementById('btnAIUpgrade');
  if (aiBtn)  aiBtn.disabled = game.aiUpgradeBought || game.data < game.aiUpgradeCost;
}

// ============================================================
// Klick-Upgrades
// ============================================================
function getClickUpgradeRenderSignature() {
  const nextIndex = CLICK_UPGRADES.findIndex((u, i) => !game.clickUpgradesBought.includes(i));
  if (nextIndex === -1) return `done|${game.clickUpgradesBought.join(',')}`;
  const upgrade   = CLICK_UPGRADES[nextIndex];
  const isUnlocked = game.data >= upgrade.unlockAt;
  const canAfford  = game.data >= upgrade.cost;
  return `${nextIndex}|${isUnlocked ? 1 : 0}|${canAfford ? 1 : 0}|${game.clickUpgradesBought.join(',')}`;
}

function maybeRenderClickUpgrades(force = false) {
  const signature = getClickUpgradeRenderSignature();
  if (!force && window.__lastClickUpgradeSignature === signature) return;
  renderClickUpgrades();
  window.__lastClickUpgradeSignature = signature;
}

function renderClickUpgrades() {
  const container = document.getElementById('clickUpgradesContainer');
  if (!container) return;
  container.innerHTML = '';

  const nextIndex = CLICK_UPGRADES.findIndex((u, i) => !game.clickUpgradesBought.includes(i));
  const div = document.createElement('div');

  if (nextIndex === -1) {
    div.innerHTML = `<div style="font-weight:bold;">✓ Alle Klick-Upgrades gekauft</div><div class="sub">Dein Klick ist maximal optimiert.</div>`;
  } else {
    const upgrade    = CLICK_UPGRADES[nextIndex];
    const isUnlocked = game.data >= upgrade.unlockAt;
    if (!isUnlocked) {
      div.innerHTML = `
        <h3>${upgrade.name}</h3>
        <div>${upgrade.description}</div>
        <div class="sub">Freischaltbar ab: ${formatData(upgrade.unlockAt)}</div>
        <br>
        <button disabled>Kaufen</button>
      `;
    } else {
      const canAfford = game.data >= upgrade.cost;
      div.innerHTML = `
        <h3>${upgrade.name}</h3>
        <div>${upgrade.description}</div>
        <div class="sub">Kosten: ${formatData(upgrade.cost)}</div>
        <br>
        <button onclick="buyClickUpgrade(${nextIndex})" ${!canAfford ? 'disabled' : ''}>Kaufen</button>
      `;
    }
  }
  container.appendChild(div);
}

function buyClickUpgrade(index) {
  const upgrade = CLICK_UPGRADES[index];
  if (game.clickUpgradesBought.includes(index)) return;
  if (game.data < upgrade.cost) return;
  game.data -= upgrade.cost;
  game.clickUpgradesBought.push(index);
  game.clickPower = upgrade.newClickPower;
  if (game.stats) game.stats.upgradesBought++;
  updateUI();
  maybeRenderClickUpgrades(true);
}

// ============================================================
// Forschungs-Upgrades
// ============================================================
let _lastResearchUpgradesState = null;
function maybeRenderResearchUpgrades() {
  const stateKey = `${game.offlineUpgradesBought}|${game.offlineUpgradeCost}|${game.data >= game.offlineUpgradeCost}|${game.aiUpgradeBought}|${game.data >= game.aiUpgradeCost}`;
  if (stateKey === _lastResearchUpgradesState) return;
  _lastResearchUpgradesState = stateKey;
  renderResearchUpgrades();
}

function renderResearchUpgrades() {
  const container = document.getElementById('researchUpgradesContainer');
  if (!container) return;
  container.innerHTML = '';

  const offlineDiv     = document.createElement('div');
  const offlineCanAfford = game.data >= game.offlineUpgradeCost;
  offlineDiv.innerHTML = `
    <div>Offline Speichererweiterung</div>
    <div class="sub">Erhöht das Offline-Limit um 25 Minuten</div>
    <div>Gekauft: <span id="offlineUpgradesCount">${game.offlineUpgradesBought}</span>x</div>
    <div>Kosten: <span id="offlineUpgradeCost">${formatData(game.offlineUpgradeCost)}</span></div>
    <br>
    <button onclick="buyOfflineUpgrade()" ${!offlineCanAfford ? 'disabled' : ''}>Verbessern</button>
  `;
  container.appendChild(offlineDiv);

  const hr = document.createElement('hr');
  hr.style.borderColor = '#334155';
  hr.style.margin      = '14px 0';
  container.appendChild(hr);

  if (!game.aiUpgradeBought) {
    const aiDiv    = document.createElement('div');
    const aiCanAfford = game.data >= game.aiUpgradeCost;
    aiDiv.innerHTML = `
      <div>KI Optimierung</div>
      <div class="sub">Verdoppelt die gesamte Produktion - Einmalig</div>
      <div>Kosten: <span id="aiUpgradeCost">${formatData(game.aiUpgradeCost)}</span></div>
      <br>
      <button onclick="buyAIUpgrade()" ${!aiCanAfford ? 'disabled' : ''}>Aktivieren</button>
    `;
    container.appendChild(aiDiv);
  } else {
    const aiDiv = document.createElement('div');
    aiDiv.innerHTML = `
      <div>KI Optimierung</div>
      <div class="sub">Verdoppelt die gesamte Produktion - Einmalig</div>
      <div style="color: #4ade80; font-weight: bold; margin-top: 6px;">✓ Aktiviert</div>
    `;
    container.appendChild(aiDiv);
  }
}

function buyOfflineUpgrade() {
  if (game.data >= game.offlineUpgradeCost) {
    game.data -= game.offlineUpgradeCost;
    game.offlineUpgradesBought++;
    game.offlineLimit      = BASE_OFFLINE_LIMIT + (game.offlineUpgradesBought * OFFLINE_UPGRADE_BONUS);
    game.offlineUpgradeCost = Math.floor(game.offlineUpgradeCost * OFFLINE_UPGRADE_COST_GROWTH);
    if (game.stats) game.stats.upgradesBought++;
    _lastResearchUpgradesState = null;
    updateUI();
  }
}

function buyAIUpgrade() {
  if (!game.aiUpgradeBought && game.data >= game.aiUpgradeCost) {
    game.data -= game.aiUpgradeCost;
    game.productionMultiplier *= 2;
    game.aiUpgradeBought = true;
    if (game.stats) game.stats.upgradesBought++;
    updateUI();
  }
}

// ============================================================
// Achievements
// ============================================================
function checkAchievements() {
  if (!game.achievements) game.achievements = {};
  ACHIEVEMENTS.forEach(achievement => {
    if (!game.achievements[achievement.id] && achievement.check(game)) {
      game.achievements[achievement.id] = true;
      showAchievementNotification(achievement);
    }
  });
}

function showAchievementNotification(achievement) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed; top: 20px; right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white; padding: 16px 20px; border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 10000;
    font-weight: bold; max-width: 300px; animation: slideIn 0.3s ease-out;
  `;
  notification.innerHTML = `<div style="font-size:20px;margin-bottom:4px;">${achievement.title}</div><div style="font-size:12px;opacity:0.9;">${achievement.description}</div>`;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function renderAchievements() {
  const container = document.getElementById('achievementsContainer');
  if (!container) return;
  container.innerHTML = '';

  let unlockedCount = 0;
  ACHIEVEMENTS.forEach(achievement => {
    const isUnlocked = game.achievements && game.achievements[achievement.id] === true;
    if (isUnlocked) unlockedCount++;

    const card = document.createElement('div');
    card.style.cssText = `
      padding: 12px; margin: 8px 0; border-radius: 6px;
      background: ${isUnlocked ? '#1e3a4a' : '#2a3f54'};
      border-left: 4px solid ${isUnlocked ? '#22c55e' : '#64748b'};
      opacity: ${isUnlocked ? 1 : 0.6};
    `;
    card.innerHTML = `
      <div style="font-weight:bold;font-size:16px;color:#e8f5e9;">${achievement.title}</div>
      <div style="font-size:13px;margin-top:4px;color:#94a3b8;">${achievement.description}</div>
      ${isUnlocked ? '<div style="font-size:11px;color:#4caf50;margin-top:4px;">✓ Freigeschaltet</div>' : ''}
    `;
    container.appendChild(card);
  });

  const header = container.previousElementSibling;
  if (header) header.innerText = `🏆 Erfolge (${unlockedCount}/${ACHIEVEMENTS.length})`;
}

// ============================================================
// Visuelle Effekte
// ============================================================
function showFloatingText(text, type = 'generic') {
  const el = document.createElement('div');
  el.style.cssText = `
    position: fixed; font-weight: bold; font-size: 24px;
    pointer-events: none; z-index: 5000;
    left: 50%; top: 50%;
    transform: translate(-50%, -50%);
    animation: floatUp 1.5s ease-out forwards;
    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    color: ${type === 'click' ? '#fbbf24' : type === 'purchase' ? '#22c55e' : '#60a5fa'};
  `;
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

function showClickPulse() {
  const dataElement = document.getElementById('data');
  if (dataElement) {
    dataElement.classList.add('pulse-animation');
    setTimeout(() => dataElement.classList.remove('pulse-animation'), 600);
  }
}

function showOfflineNotification(offlineSeconds, gained) {
  const hours   = Math.floor(offlineSeconds / 3600);
  const minutes = Math.floor((offlineSeconds % 3600) / 60);
  const seconds = offlineSeconds % 60;

  let timeStr = '';
  if (hours > 0)              timeStr += `${hours}h `;
  if (minutes > 0)            timeStr += `${minutes}m `;
  if (seconds > 0 || !timeStr) timeStr += `${seconds}s`;

  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed; top: 60px; left: 20px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white; padding: 20px 24px; border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.4); z-index: 9999;
    max-width: 360px; font-weight: 500; animation: slideIn 0.4s ease-out;
  `;
  notification.innerHTML = `
    <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">⏱️ Offline Produktion</div>
    <div style="font-size: 14px; opacity: 0.95;">
      <div>Offline Zeit: <strong>${timeStr}</strong></div>
      <div style="margin-top: 4px;">Verdient: <strong>${formatData(gained)}</strong></div>
    </div>
  `;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.4s ease-in';
    setTimeout(() => notification.remove(), 400);
  }, 8000);
}
