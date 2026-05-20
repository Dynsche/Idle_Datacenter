// ============================================================
// Gebäude-Rendering & Kauf
// ============================================================

function renderBuildings() {
  const container = document.getElementById('buildings');
  if (!container) return;
  container.innerHTML = '';

  game.buildings.forEach((building, index) => {
    const isUnlocked = game.data >= building.unlockAt || building.owned > 0;
    if (!isUnlocked) return;

    const div = document.createElement('div');
    div.className = 'building';

    const amount       = game.buyAmount === -1 ? calculateMaxBuy(building) : game.buyAmount;
    const fallbackAmt  = game.buyAmount === -1 && amount === 0 ? 1 : amount;
    const cost         = fallbackAmt > 0 ? calculateBulkCost(building, fallbackAmt) : 0;
    const canAfford    = fallbackAmt > 0 && game.data >= cost;
    const costLabel    = game.buyAmount === -1 && amount === 0
      ? `${formatData(cost)} <span class="sub" style="color: #f59e0b;">(nächster Kauf)</span>`
      : formatData(cost);

    const ownedDisplay = game.buyAmount === -1 && amount > 0
      ? `${building.owned} <span style="color: #4ade80;">+${amount}</span>`
      : building.owned;

    const upgradeMultiplier = getBuildingUpgradeMultiplier(building.name);

    const applicableUpgrades = game.buildingUpgrades
      .map(upgradeIndex => BUILDING_UPGRADES[upgradeIndex])
      .filter(upgrade => {
        const targets = Array.isArray(upgrade.targetBuilding) ? upgrade.targetBuilding : [upgrade.targetBuilding];
        return targets.includes(building.name);
      });
    const upgradesInfo = applicableUpgrades.length > 0
      ? `<div class="sub" style="color: #a78bfa;">🔧 Upgrades: ${applicableUpgrades.map(u => u.name).join(', ')}</div>`
      : '';

    let productionDisplay = '';
    if (building.owned > 0) {
      if (index === 0) {
        const finalItOutput = productionPerSecond();
        const rawItOutput   = (game.buildings[0].owned * game.buildings[0].production * getBuildingUpgradeMultiplier(game.buildings[0].name))
          * game.productionMultiplier * (1 + game.prestige * PRESTIGE_BONUS_PER_LEVEL);
        const bonusParts = [];
        if (upgradeMultiplier > 1) bonusParts.push(`+${((upgradeMultiplier - 1) * 100).toFixed(0)}% Upgrade`);
        if (game.prestige > 0)     bonusParts.push(`+${(game.prestige * PRESTIGE_BONUS_PER_LEVEL * 100).toFixed(0)}% Rang`);
        if (rawItOutput > SOFTCAP_STAGE1_START) bonusParts.push('Softcap aktiv');
        const bonusText = bonusParts.length > 0
          ? ` <span style="color: #4ade80;">(${bonusParts.join(' | ')})</span>`
          : '';
        productionDisplay = `<div class="sub" style="color: #60a5fa;">Produziert: ${formatData(finalItOutput)}/s${bonusText}</div>`;
      } else {
        const supportMultiplier = getSupportMultiplierFromBuilding(building);
        const targetName        = game.buildings[index - 1]?.name || 'niedrigere Stufe';
        const isSupportActive   = building.owned > 0 && (game.buildings[index - 1]?.owned || 0) > 0;
        productionDisplay = isSupportActive
          ? `<div class="sub" style="color: #60a5fa;">Unterstützt ${targetName}: x${supportMultiplier.toFixed(2)} + ${Math.round(SUPPORT_TRANSFER_RATIO * 100)}% Transfer</div>`
          : `<div class="sub" style="color: #f59e0b;">Unterstützt ${targetName}: inaktiv (beide Stufen benötigt)</div>`;
      }
    }

    div.innerHTML = `
      <div>
        <h3>${building.name}</h3>
        <div>Besitzt: ${ownedDisplay}</div>
        <div>Kosten: ${costLabel}</div>
        <div class="sub">+${formatData(building.production * upgradeMultiplier)}/s pro Einheit${upgradeMultiplier > 1 ? ` <span style="color: #4ade80;">(+${((upgradeMultiplier - 1) * 100).toFixed(0)}% Upgrade)</span>` : ''}</div>
        ${upgradesInfo}
        ${productionDisplay}
      </div>
      <button onclick="buyBuilding(${index})" ${!canAfford ? 'disabled' : ''}>Kaufen</button>
    `;

    container.appendChild(div);
  });
}

function buyBuilding(index) {
  const building = game.buildings[index];
  const amount   = game.buyAmount === -1 ? calculateMaxBuy(building) : game.buyAmount;
  if (amount === 0) return;

  const cost = calculateBulkCost(building, amount);
  if (game.data >= cost) {
    const selectedEfficiency = getPurchaseEfficiency(building, amount);
    const bestOption         = getBestAffordableEfficiency(game.buyAmount);
    if (bestOption && bestOption.index !== index) {
      const efficiencyGap = bestOption.efficiency / Math.max(selectedEfficiency, 1e-12);
      if (efficiencyGap >= 1.75) {
        const betterBuilding = game.buildings[bestOption.index];
        const confirmed = confirm(`Warnung: ${betterBuilding.name} ist aktuell effizienter zu kaufen.\nTrotzdem ${building.name} kaufen?`);
        if (!confirmed) return;
      }
    }

    game.data          -= cost;
    building.owned     += amount;
    building.cost       = Math.floor(building.baseCost * Math.pow(BUILDING_COST_GROWTH, building.owned));
    if (game.stats) game.stats.buildingsBought += amount;
    updateUI();
    renderBuildings();
  }
}

function setBuyAmount(amount) {
  game.buyAmount = amount;
  sessionStorage.setItem('buyAmount', amount);

  ['buy1', 'buy10', 'buy100', 'buyMax'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });

  const activeId = amount === 1 ? 'buy1' : amount === 10 ? 'buy10' : amount === 100 ? 'buy100' : 'buyMax';
  const el = document.getElementById(activeId);
  if (el) el.classList.add('active');

  renderBuildings();
}

// ============================================================
// Gebäude-Upgrades
// ============================================================
function getUpgradeBlockedReason(upgrade) {
  if (upgrade.requires !== null && upgrade.requires !== undefined) {
    if (!game.buildingUpgrades.includes(upgrade.requires)) {
      const prev = BUILDING_UPGRADES[upgrade.requires];
      return `Benötigt: "${prev.name}" zuerst kaufen`;
    }
  }
  if (upgrade.minBuildings) {
    for (const [buildingName, minCount] of Object.entries(upgrade.minBuildings)) {
      const building = game.buildings.find(b => b.name === buildingName);
      const owned    = building ? building.owned : 0;
      if (owned < minCount) return `Benötigt: ${minCount}x ${buildingName} (du hast ${owned})`;
    }
  }
  return null;
}

function renderBuildingUpgrades() {
  const container = document.getElementById('buildingUpgrades');
  if (!container) return;
  container.innerHTML = '';

  BUILDING_UPGRADES.forEach((upgrade, index) => {
    const isUnlocked = game.data >= upgrade.unlockAt;
    const isBought   = game.buildingUpgrades.includes(index);
    const prevBought = upgrade.requires === null || upgrade.requires === undefined
      ? true
      : game.buildingUpgrades.includes(upgrade.requires);

    if (!isBought && (!prevBought || !isUnlocked)) return;

    const div          = document.createElement('div');
    div.className      = 'upgrade';
    const blockedReason = !isBought ? getUpgradeBlockedReason(upgrade) : null;
    const isBlocked    = !!blockedReason;
    const canAfford    = game.data >= upgrade.cost;
    const targets      = Array.isArray(upgrade.targetBuilding) ? upgrade.targetBuilding.join(', ') : upgrade.targetBuilding;

    if (isBought) {
      div.style.opacity       = '0.6';
      div.style.borderLeftColor = '#4ade80';
      div.innerHTML = `
        <h3>${upgrade.name}</h3>
        <div class="sub">${upgrade.description} – Betrifft: ${targets}</div>
        <div style="color: #4ade80; font-weight: bold; margin-top: 6px;">✓ Gekauft</div>
      `;
    } else if (isBlocked) {
      div.style.opacity       = '0.7';
      div.style.borderLeftColor = '#6b7280';
      div.innerHTML = `
        <h3>${upgrade.name}</h3>
        <div>${upgrade.description}</div>
        <div class="sub">Betrifft: ${targets}</div>
        <div class="sub" style="color: #f59e0b; margin-top: 6px;">🔒 ${blockedReason}</div>
        <div class="sub">Kosten: ${formatData(upgrade.cost)}</div>
        <br>
        <button disabled>Gesperrt</button>
      `;
    } else {
      div.innerHTML = `
        <h3>${upgrade.name}</h3>
        <div>${upgrade.description}</div>
        <div class="sub">Betrifft: ${targets}</div>
        <div class="sub">Kosten: ${formatData(upgrade.cost)}</div>
        <br>
        <button onclick="buyBuildingUpgrade(${index})" ${!canAfford ? 'disabled' : ''}>Kaufen</button>
      `;
    }

    container.appendChild(div);
  });

  if (container.children.length === 0) {
    container.innerHTML = '<div class="sub" style="text-align: center; padding: 40px;">Noch keine Upgrades verfügbar.<br>Sammle mehr Daten!</div>';
  }
}

function buyBuildingUpgrade(index) {
  const upgrade = BUILDING_UPGRADES[index];
  if (game.buildingUpgrades.includes(index)) return;
  if (game.data < upgrade.cost) return;

  game.data -= upgrade.cost;
  game.buildingUpgrades.push(index);
  if (game.stats) game.stats.upgradesBought++;

  updateUI();
  renderBuildingUpgrades();
}
