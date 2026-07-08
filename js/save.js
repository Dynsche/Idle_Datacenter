// ============================================================
// Speichern & Laden
// ============================================================

function safeParseSavedGame(raw, sourceLabel) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Spielstand ist kein Objekt');
    }
    return parsed;
  } catch (error) {
    console.error(`${sourceLabel} konnte nicht gelesen werden:`, error);
    return null;
  }
}

function quarantineCorruptLocalSave(raw) {
  if (!raw) return;
  const backupKey = `datacenterIdleSaveCorrupt-${Date.now()}`;
  try {
    localStorage.setItem(backupKey, raw);
    localStorage.removeItem('datacenterIdleSave');
    if (typeof setCloudSyncStatus === 'function') {
      setCloudSyncStatus(`Lokaler Spielstand beschaedigt - Backup: ${backupKey}`, true);
    }
  } catch (error) {
    console.error('Beschaedigter Spielstand konnte nicht gesichert werden:', error);
  }
}

function countOwnedBuildings() {
  return (game.buildings || []).reduce((sum, b) => sum + (b.owned || 0), 0);
}

function countOwnedUpgrades() {
  return (game.clickUpgradesBought || []).length +
    (game.buildingUpgrades || []).length +
    (game.offlineUpgradesBought || 0) +
    (game.aiUpgradeBought ? 1 : 0);
}

function normalizeStats() {
  const now = Date.now();
  const defaults = {
    totalData: game.data || 0,
    totalClicks: 0,
    buildingsBought: countOwnedBuildings(),
    upgradesBought: countOwnedUpgrades(),
    prestigeCount: game.prestige || 0,
    playTime: 0,
    offlineTime: 0,
    offlineTimeUsed: 0,
    startTime: now
  };

  game.stats = { ...defaults, ...(game.stats || {}) };
  Object.keys(defaults).forEach(key => {
    if (typeof game.stats[key] !== 'number' || !Number.isFinite(game.stats[key])) {
      game.stats[key] = defaults[key];
    }
  });
}

function saveGame() {
  if (cloudUser && !cloudLoadCompleted) return;
  game.lastUpdate = Date.now();
  if (game.stats) {
    game.stats.playTime += (Date.now() - game.stats.startTime);
    game.stats.startTime = Date.now();
  }
  localStorage.setItem('datacenterIdleSave', JSON.stringify(getSerializableGameState()));
  showAutosaveIndicator();
  saveGameToCloud(false);
}

function loadGame(loadedGameOverride = null) {
  const save = loadedGameOverride ? null : localStorage.getItem('datacenterIdleSave');
  if (!loadedGameOverride && !save) return;

  const loadedGame = loadedGameOverride || safeParseSavedGame(save, 'Lokaler Spielstand');
  if (!loadedGame) {
    if (!loadedGameOverride) quarantineCorruptLocalSave(save);
    return;
  }
  if (typeof loadedGame !== 'object' || Array.isArray(loadedGame)) {
    console.error('Spielstand hat ein ungueltiges Format:', loadedGame);
    return;
  }

  game = { ...game, ...loadedGame };
  game.clickUpgradesBought = Array.isArray(game.clickUpgradesBought) ? game.clickUpgradesBought : [];
  game.buildingUpgrades    = Array.isArray(game.buildingUpgrades) ? game.buildingUpgrades : [];
  game.achievements        = game.achievements && typeof game.achievements === 'object' ? game.achievements : {};

  // Migration: altes 6-Gebäude-System
  const isOldSave = loadedGame.buildings && loadedGame.buildings.length === 6;
  if (isOldSave) {
    game.buildings = createBuildings();
    loadedGame.buildings.forEach((oldBuilding) => {
      const newIndex = game.buildings.findIndex(b => b.name === oldBuilding.name);
      if (newIndex !== -1) {
        game.buildings[newIndex].owned = oldBuilding.owned;
        game.buildings[newIndex].cost  = oldBuilding.cost;
      }
    });
  } else {
    game.buildings = loadedGame.buildings || createBuildings();
  }

  let costsMigrated = false;

  function normalizeBalanceValues() {
    game.offlineUpgradesBought = Math.max(0, Math.floor(game.offlineUpgradesBought || 0));
    game.offlineLimit = BASE_OFFLINE_LIMIT + (game.offlineUpgradesBought * OFFLINE_UPGRADE_BONUS);

    const expectedPrestigeRequirement = Math.floor(BASE_PRESTIGE_REQUIREMENT * Math.pow(PRESTIGE_COST_GROWTH, game.prestige || 0));
    if (game.prestigeRequirement !== expectedPrestigeRequirement) {
      game.prestigeRequirement = expectedPrestigeRequirement;
      costsMigrated = true;
    }

    const expectedOfflineCost = Math.floor(BASE_OFFLINE_UPGRADE_COST * Math.pow(OFFLINE_UPGRADE_COST_GROWTH, game.offlineUpgradesBought));
    if (game.offlineUpgradeCost !== expectedOfflineCost) {
      game.offlineUpgradeCost = expectedOfflineCost;
      costsMigrated = true;
    }

    if (!game.aiUpgradeBought && game.aiUpgradeCost !== BASE_AI_UPGRADE_COST) {
      game.aiUpgradeCost = BASE_AI_UPGRADE_COST;
      costsMigrated = true;
    }
  }

  if (game.balanceVersion === undefined) game.balanceVersion = 0;

  while (game.balanceVersion < SAVE_BALANCE_VERSION) {
    switch (game.balanceVersion) {
      case 0:
        if (game.offlineUpgradesBought === undefined) game.offlineUpgradesBought = 0;
        if (game.buildingUpgrades     === undefined) game.buildingUpgrades = [];
        if (game.prestigeRequirement  === undefined) game.prestigeRequirement = BASE_PRESTIGE_REQUIREMENT;
        game.balanceVersion = 1; costsMigrated = true; break;
      case 1:
        normalizeBalanceValues(); game.balanceVersion = 2; costsMigrated = true; break;
      case 2:
        normalizeBalanceValues(); game.balanceVersion = 3; costsMigrated = true; break;
      case 3:
        normalizeBalanceValues(); game.balanceVersion = 4; costsMigrated = true; break;
      case 4:
        normalizeBalanceValues(); game.balanceVersion = 5; costsMigrated = true; break;
      case 5:
        if (!game.clickUpgradesBought) game.clickUpgradesBought = [];
        if (game.clickUpgradesBought.length > 0) {
          const lastBought = Math.max(...game.clickUpgradesBought);
          game.clickPower = CLICK_UPGRADES[lastBought].newClickPower;
        }
        game.balanceVersion = 6; costsMigrated = true; break;
      case 6:
        if (!game.missions) game.missions = createMissionState();
        ensureActiveMissions();
        game.balanceVersion = 7; costsMigrated = true; break;
      case 7:
        if (!game.missions) game.missions = createMissionState();
        ensureActiveMissions();
        game.balanceVersion = 8; costsMigrated = true; break;
      case 8:
        if (!game.missions) game.missions = createMissionState();
        if (typeof game.missions.currentLevel !== 'number') game.missions.currentLevel = 1;
        ensureActiveMissions();
        game.balanceVersion = 9; costsMigrated = true; break;
      case 9:
        if (!game.missions) game.missions = createMissionState();
        ensureActiveMissions();
        game.balanceVersion = 10; costsMigrated = true; break;
      case 10:
        if (game.offlineLimit > 100000) game.offlineLimit = Math.round(game.offlineLimit / 1000);
        normalizeBalanceValues();
        game.balanceVersion = 11; costsMigrated = true; break;
      case 11:
        if (game.clickUpgradesBought && game.clickUpgradesBought.length > 0) {
          const lastBought = Math.max(...game.clickUpgradesBought);
          game.clickPower = CLICK_UPGRADES[lastBought].newClickPower;
        }
        game.balanceVersion = 12; costsMigrated = true; break;
      case 12:
        if (!game.resources)         game.resources         = {};
        if (!game.resourceBuildings) game.resourceBuildings = {};
        RESOURCE_DEFS.forEach(def => {
          if (!(def.id in game.resources))         game.resources[def.id]         = 0;
          if (!game.resourceBuildings[def.id])     game.resourceBuildings[def.id] = {};
          def.buildings.forEach(b => {
            if (!(b.id in game.resourceBuildings[def.id])) game.resourceBuildings[def.id][b.id] = 0;
          });
        });
        ensureActiveMissions();
        game.balanceVersion = 13; costsMigrated = true; break;
      case 13:
        // Klick-Power neu berechnen nach Balance-Anpassung (neue Stufen, neue Werte)
        if (game.clickUpgradesBought && game.clickUpgradesBought.length > 0) {
          const lastBought = Math.max(...game.clickUpgradesBought);
          if (CLICK_UPGRADES[lastBought]) {
            game.clickPower = CLICK_UPGRADES[lastBought].newClickPower;
          }
        } else {
          game.clickPower = 1;
        }
        game.balanceVersion = 14; costsMigrated = true; break;
      default:
        game.balanceVersion = SAVE_BALANCE_VERSION; costsMigrated = true; break;
    }
  }

  normalizeBalanceValues();

  // Validiere buildingUpgrades
  if (Array.isArray(game.buildingUpgrades)) {
    game.buildingUpgrades = game.buildingUpgrades.filter(
      index => typeof index === 'number' && index >= 0 && index < BUILDING_UPGRADES.length
    );
  } else {
    game.buildingUpgrades = [];
  }

  normalizeStats();

  if (game.stats && game.stats.statsCorrected !== true) {
    game.stats.upgradesBought  = countOwnedUpgrades();
    game.stats.buildingsBought = countOwnedBuildings();
    game.stats.statsCorrected  = true;
  }

  // Offline-Produktion berechnen
  const now = Date.now();
  const offlineSeconds = Math.min(Math.floor((now - game.lastUpdate) / 1000), game.offlineLimit);
  if (offlineSeconds > 3) {
    const gained = offlineSeconds * productionPerSecond();
    game.data += gained;
    if (game.stats) {
      game.stats.totalData    += gained;
      game.stats.offlineTimeUsed = (game.stats.offlineTimeUsed || 0) + offlineSeconds;
      game.stats.offlineTime  += offlineSeconds;
    }
    showOfflineNotification(offlineSeconds, gained);
  } else {
    const offlineInfoBoxAlt = document.getElementById('offlineInfo');
    if (offlineInfoBoxAlt) offlineInfoBoxAlt.style.display = 'none';
  }

  if (costsMigrated) {
    localStorage.setItem('datacenterIdleSave', JSON.stringify(game));
  }
}

// ============================================================
// Export / Import / Löschen
// ============================================================
function exportSave() {
  const saveData = getSerializableGameState();
  const json  = JSON.stringify(saveData, null, 2);
  const blob  = new Blob([json], { type: 'application/json' });
  const url   = URL.createObjectURL(blob);
  const link  = document.createElement('a');
  link.href     = url;
  link.download = `datacenter-idle-save-${new Date().getTime()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importSavePrompt() {
  document.getElementById('importFileInput').click();
}

function importSaveFromFile() {
  const fileInput = document.getElementById('importFileInput');
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importedData = safeParseSavedGame(e.target.result, 'Importierter Spielstand');
      if (!importedData) {
        alert('Fehler beim Lesen der Datei: Spielstand ist kein gueltiges JSON');
        return;
      }
      if (!importedData.buildings || importedData.data === undefined) {
        alert('Ungültiger Spielstand: Datei ist nicht kompatibel');
        return;
      }
      if (confirm('Lokalen Spielstand mit importierter Datei ersetzen?')) {
        Object.assign(game, importedData);
        localStorage.setItem('datacenterIdleSave', JSON.stringify(getSerializableGameState()));
        location.reload();
      }
    } catch (error) {
      alert('Fehler beim Lesen der Datei: ' + error.message);
    }
  };
  reader.readAsText(file);
  fileInput.value = '';
}

function deleteLocalSave() {
  if (confirm('Lokalen Spielstand wirklich löschen? Dies kann nicht rückgängig gemacht werden.')) {
    localStorage.removeItem('datacenterIdleSave');
    location.reload();
  }
}
