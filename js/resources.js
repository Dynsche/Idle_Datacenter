// ============================================================
// Ressourcen-Tab: Rendering & Kauflogik
// ============================================================

function buyResourceBuilding(resId, buildingId) {
  const def = RESOURCE_DEFS.find(d => d.id === resId);
  if (!def) return;

  if (!isResourceUnlocked(def)) return;

  const bDef = def.buildings.find(b => b.id === buildingId);
  if (!bDef) return;

  // Prüfe ob Unlock-Schwelle (Anzahl bereits besitzter Gebäude dieser Ressource)
  const owned = (game.resourceBuildings[resId] || {})[buildingId] || 0;
  if (owned === 0 && bDef.unlockAt > 0) {
    const totalOwned = Object.values(game.resourceBuildings[resId] || {}).reduce((s, v) => s + v, 0);
    if (totalOwned < bDef.unlockAt) return;
  }

  // Kaufmenge bestimmen
  const maxBuy = calculateMaxResourceBuy(resId, buildingId);
  const amount = game.buyAmount === -1 ? maxBuy : Math.min(game.buyAmount, maxBuy);
  if (amount <= 0) return;

  // Gesamtkosten für 'amount' Einheiten berechnen
  const currentOwned = (game.resourceBuildings[resId] || {})[buildingId] || 0;
  let totalCost = 0;
  for (let i = 0; i < amount; i++) {
    totalCost += Math.floor(bDef.baseCost * Math.pow(1.15, currentOwned + i));
  }
  if (game.data < totalCost) return;

  game.data -= totalCost;
  if (!game.resourceBuildings[resId]) game.resourceBuildings[resId] = {};
  game.resourceBuildings[resId][buildingId] = (game.resourceBuildings[resId][buildingId] || 0) + amount;

  updateUI();
  renderResourceTab();
}

function getResourceBonusText(def) {
  const amount = game.resources[def.id] || 0;
  const bonus = Math.min(
    (amount / def.bonusPerUnits) * def.productionBonus,
    def.maxBonus
  );
  const atMax = bonus >= def.maxBonus;
  const base = `+${(bonus * 100).toFixed(1)}% Daten (max +${(def.maxBonus * 100).toFixed(0)}%)`;
  if (atMax) {
    const perSec = resourceProductionPerSecond(def.id);
    const dataRate = perSec * def.excessConversion;
    return `${base} ★ <span style="color:#f97316">+${formatData(dataRate)}/s aus Überschuss</span>`;
  }
  return base;
}

function renderResourceTab() {
  const container = document.getElementById('tab-resources');
  if (!container) return;

  // Prüfe ob überhaupt eine Ressource freigeschaltet ist
  const unlocked = RESOURCE_DEFS.filter(def => game.data >= def.unlockAt || (game.resources[def.id] || 0) > 0);

  if (unlocked.length === 0) {
    container.innerHTML = `
      <div class="card" style="text-align:center;padding:40px 20px;">
        <div style="font-size:32px;margin-bottom:12px;">⚡</div>
        <div style="font-weight:bold;font-size:18px;">Ressourcen noch gesperrt</div>
        <div class="sub" style="margin-top:8px;">Sammle mindestens <strong>1 MB</strong> Daten um Strom-Infrastruktur freizuschalten.</div>
      </div>`;
    return;
  }

  container.innerHTML = '';

  // Kaufmengen-Buttons (spiegelt die globale Einstellung)
  const buyLabels = [{v:1,id:'buy1'},{v:10,id:'buy10'},{v:100,id:'buy100'},{v:-1,id:'buyMax'}];
  const btnBar = document.createElement('div');
  btnBar.style.cssText = 'display:flex;gap:6px;margin-bottom:14px;';
  btnBar.innerHTML = buyLabels.map(b =>
    `<button onclick="setBuyAmount(${b.v})" id="res-${b.id}" class="${game.buyAmount===b.v?'active':''}" style="min-width:54px;">${b.v===-1?'Max':'x'+b.v}</button>`
  ).join('');
  container.appendChild(btnBar);
  RESOURCE_DEFS.forEach(def => {
    const dataMet    = game.data >= def.unlockAt;
    const hasAny     = (game.resources[def.id] || 0) > 0 || Object.values(game.resourceBuildings[def.id] || {}).some(v => v > 0);

    // Zeige gesperrte Ressource als Vorschau (wenn Datenmenge noch nicht erreicht)
    if (!dataMet && !hasAny) {
      const depDef = def.dependsOn ? RESOURCE_DEFS.find(d => d.id === def.dependsOn) : null;
      const section = document.createElement('div');
      section.className = 'card';
      section.style.cssText = 'opacity:0.45;margin-bottom:16px;';
      section.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          <span style="font-size:26px;">${def.icon}</span>
          <div>
            <div style="font-weight:bold;font-size:17px;">${def.name} <span class="sub">(${def.unit})</span></div>
            <div class="sub">🔒 Freischaltbar ab ${formatData(def.unlockAt)} Daten${depDef ? ` + mind. 1 ${depDef.name}-Gebäude` : ''}</div>
          </div>
        </div>`;
      container.appendChild(section);
      return;
    }

    // Ressource ist per Datenmenge erreichbar, aber ggf. noch durch Abhängigkeit gesperrt
    const isUnlocked = isResourceUnlocked(def);
    const depBlocked = dataMet && !isUnlocked;

    const section = document.createElement('div');
    section.className = 'card';
    section.style.marginBottom = '16px';

    const current    = game.resources[def.id] || 0;
    const perSec     = resourceProductionPerSecond(def.id);
    const bonusText  = getResourceBonusText(def);
    const curFmt     = formatResource(current, def.unit);
    const rpsFmt     = formatResource(perSec, def.unit);

    let buildingsHtml = '';
    def.buildings.forEach(bDef => {
      const ownedCount = (game.resourceBuildings[def.id] || {})[bDef.id] || 0;

      // Unlock-Prüfung für Gebäude innerhalb der Ressource
      const totalResOwned = Object.values(game.resourceBuildings[def.id] || {}).reduce((s, v) => s + v, 0);
      const bUnlocked = ownedCount > 0 || totalResOwned >= bDef.unlockAt;

      if (!bUnlocked) {
        buildingsHtml += `
          <div class="building" style="opacity:0.4;margin-bottom:10px;">
            <div>
              <h3 style="margin:0 0 4px;">${bDef.name}</h3>
              <div class="sub">🔒 Freischaltbar ab ${bDef.unlockAt} ${def.name}-Gebäuden</div>
            </div>
            <button disabled>Kaufen</button>
          </div>`;
        return;
      }

      const maxBuy    = calculateMaxResourceBuy(def.id, bDef.id);
      const buyAmt    = game.buyAmount === -1 ? maxBuy : Math.min(game.buyAmount, maxBuy);
      let   bulkCost  = 0;
      for (let i = 0; i < Math.max(buyAmt, 1); i++) {
        bulkCost += Math.floor(bDef.baseCost * Math.pow(1.15, ownedCount + i));
      }
      const canAfford = !depBlocked && buyAmt > 0 && game.data >= bulkCost;
      const btnLabel  = game.buyAmount === -1
        ? `Kaufen (Max: ${maxBuy})`
        : buyAmt > 1 ? `Kaufen x${buyAmt}` : 'Kaufen';
      buildingsHtml += `
        <div class="building" style="margin-bottom:10px;">
          <div>
            <h3 style="margin:0 0 4px;">${bDef.name}</h3>
            <div>Besitzt: <strong>${ownedCount}</strong></div>
            <div class="sub">Produziert: +${formatResource(bDef.production * Math.max(buyAmt,1), def.unit)}/s (+${bDef.production} ${def.unit}/s je)</div>
            <div class="sub">Kosten: ${formatData(bulkCost)}</div>
          </div>
          <button onclick="buyResourceBuilding('${def.id}','${bDef.id}')" ${!canAfford ? 'disabled' : ''}>${btnLabel}</button>
        </div>`;
    });

    section.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <span style="font-size:30px;">${def.icon}</span>
        <div style="flex:1;">
          <div style="font-weight:bold;font-size:19px;">${def.name}</div>
          <div class="sub">${curFmt} • ${rpsFmt}/s</div>
          <div class="sub" style="color:#4ade80;">${bonusText}</div>
          ${depBlocked ? `<div class="sub" style="color:#f59e0b;margin-top:4px;">⚠️ Benötigt mind. 1 ${RESOURCE_DEFS.find(d=>d.id===def.dependsOn)?.name}-Gebäude</div>` : ''}
        </div>
      </div>
      ${buildingsHtml}`;

    container.appendChild(section);
  });
}

// Rendert die Ressourcen-Karten in der Topbar (kompakt, in-place Update)
function renderResourceTopbar() {
  const container = document.getElementById('resourceTopbar');
  if (!container) return;

  const unlocked = RESOURCE_DEFS.filter(def =>
    Object.values(game.resourceBuildings[def.id] || {}).some(v => v > 0)
  );

  if (unlocked.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = '';

  // Karten nachrüsten falls neu freigeschaltet
  if (container.children.length !== unlocked.length) {
    container.innerHTML = unlocked.map(def =>
      `<div class="card resource-topbar-card" data-res="${def.id}" style="min-width:140px;">
        <div class="sub">${def.icon} ${def.name}</div>
        <div class="resource" style="font-size:18px;"><span class="rb-val"></span></div>
        <div class="sub"><span class="rb-rps"></span> • <span class="rb-bonus" style="color:#4ade80;"></span></div>
        <div class="sub rb-excess" style="display:none;color:#f97316;font-size:11px;"></div>
      </div>`
    ).join('');
  }

  // Nur Texte aktualisieren — kein innerHTML-Neubau
  unlocked.forEach(def => {
    const card = container.querySelector(`[data-res="${def.id}"]`);
    if (!card) return;
    const current = game.resources[def.id] || 0;
    const perSec  = resourceProductionPerSecond(def.id);
    const bonus   = Math.min((current / def.bonusPerUnits) * def.productionBonus, def.maxBonus);
    const atMax   = bonus >= def.maxBonus;
    const excess  = card.querySelector('.rb-excess');
    card.querySelector('.rb-val').textContent   = formatResource(current, def.unit);
    card.querySelector('.rb-rps').textContent   = `${formatResource(perSec, def.unit)}/s`;
    card.querySelector('.rb-bonus').textContent = atMax ? `+${(bonus*100).toFixed(1)}% ★` : `+${(bonus*100).toFixed(1)}%`;
    card.querySelector('.rb-bonus').style.color = atMax ? '#facc15' : '#4ade80';
    if (atMax && perSec > 0) {
      const dataRate = perSec * def.excessConversion;
      excess.textContent = `+${formatData(dataRate)}/s aus Überschuss`;
      excess.style.display = '';
    } else {
      excess.style.display = 'none';
    }
  });
}
