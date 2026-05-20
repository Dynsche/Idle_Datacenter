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

  const cost = getResourceBuildingCost(resId, buildingId);
  if (game.data < cost) return;

  game.data -= cost;
  if (!game.resourceBuildings[resId]) game.resourceBuildings[resId] = {};
  game.resourceBuildings[resId][buildingId] = (game.resourceBuildings[resId][buildingId] || 0) + 1;

  updateUI();
  renderResourceTab();
}

function getResourceBonusText(def) {
  const amount = game.resources[def.id] || 0;
  const bonus = Math.min(
    (amount / def.bonusPerUnits) * def.productionBonus,
    def.maxBonus
  );
  return `+${(bonus * 100).toFixed(1)}% Daten (max +${(def.maxBonus * 100).toFixed(0)}%)`;
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

  RESOURCE_DEFS.forEach(def => {
    const isUnlocked = isResourceUnlocked(def);
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
    const depBlocked = dataMet && !isUnlocked;

    const section = document.createElement('div');
    section.className = 'card';
    section.style.marginBottom = '16px';

    const current    = game.resources[def.id] || 0;
    const perSec     = resourceProductionPerSecond(def.id);
    const bonusText  = getResourceBonusText(def);

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

      const cost      = getResourceBuildingCost(def.id, bDef.id);
      const canAfford = !depBlocked && game.data >= cost;
      buildingsHtml += `
        <div class="building" style="margin-bottom:10px;">
          <div>
            <h3 style="margin:0 0 4px;">${bDef.name}</h3>
            <div>Besitzt: <strong>${ownedCount}</strong></div>
            <div class="sub">Produziert: +${bDef.production} ${def.unit}/s pro Einheit</div>
            <div class="sub">Kosten: ${formatData(cost)}</div>
          </div>
          <button onclick="buyResourceBuilding('${def.id}','${bDef.id}')" ${!canAfford ? 'disabled' : ''}>Kaufen</button>
        </div>`;
    });

    section.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <span style="font-size:30px;">${def.icon}</span>
        <div style="flex:1;">
          <div style="font-weight:bold;font-size:19px;">${def.name}</div>
          <div class="sub">${current.toFixed(1)} ${def.unit} • ${perSec.toFixed(1)} ${def.unit}/s</div>
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
    game.data >= def.unlockAt ||
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
      `<div class="card" data-res="${def.id}" style="min-width:140px;">
        <div class="sub">${def.icon} ${def.name}</div>
        <div class="resource" style="font-size:22px;"><span class="rb-val"></span> <span style="font-size:13px;">${def.unit}</span></div>
        <div class="sub"><span class="rb-rps"></span> • <span class="rb-bonus" style="color:#4ade80;"></span></div>
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
    card.querySelector('.rb-val').textContent   = current.toFixed(0);
    card.querySelector('.rb-rps').textContent   = `${perSec.toFixed(1)}/s`;
    card.querySelector('.rb-bonus').textContent = `+${(bonus*100).toFixed(1)}%`;
  });
}
