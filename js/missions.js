// ============================================================
// Missions-System
// ============================================================

function getMissionTemplateById(id) {
  return [...MISSION_TEMPLATES, ...RESOURCE_MISSION_TEMPLATES].find(m => m.id === id) || null;
}

function getAllMissionTemplates() {
  return CHAIN_MISSION_TEMPLATES;
}

// Nur Missionen die abgeschlossen sind oder prinzipiell erreichbar (kein unlösbar gesperrtes Ressourcenziel)
function getReachableMissionTemplates() {
  const claimed = game.missions?.claimedIds || [];
  return getAllMissionTemplates().filter(m => {
    if (claimed.includes(m.id)) return true; // bereits abgeschlossen zählt immer
    if (m.targetKey !== 'resource') return true;
    const def = RESOURCE_DEFS.find(d => d.id === m.targetId);
    if (!def) return false;
    return Object.values(game.resourceBuildings[def.id] || {}).some(v => v > 0);
  });
}

function getMissionCurrentValue(mission) {
  if (!mission) return 0;
  if (mission.targetKey === 'building') {
    const building = game.buildings.find(b => b.name === mission.targetId);
    return building ? building.owned : 0;
  }
  if (mission.targetKey === 'data')      return game.data || 0;
  if (mission.targetKey === 'perSecond') return productionPerSecond();
  if (mission.targetKey === 'clicks')    return game.stats ? (game.stats.totalClicks || 0) : 0;
  if (mission.targetKey === 'totalData') return game.stats ? (game.stats.totalData || 0) : (game.data || 0);
  if (mission.targetKey === 'operators') return game.operators || 0;
  if (mission.targetKey === 'operatorsEarned') return game.totalOperatorsEarned || 0;
  if (mission.targetKey === 'industry') {
    return game.industries?.[mission.targetId]?.amount || 0;
  }
  if (mission.targetKey === 'producer') {
    const [industryId, indexRaw] = String(mission.targetId || '').split(':');
    const index = parseInt(indexRaw, 10);
    return game.industries?.[industryId]?.producers?.[index]?.owned || 0;
  }
  if (mission.targetKey === 'resource') {
    if (!game.resources || !mission.targetId) return 0;
    return game.resources[mission.targetId] || 0;
  }
  return 0;
}

function getLevelScalingFactor() {
  return 1 + (game.prestige * 0.35);
}

function getScaledMissionAmount(mission) {
  const base = mission.amount || 0;
  if (mission.targetKey === 'clicks') {
    const clickScale = Math.pow(1 + ((game.prestige || 0) * 0.12), Math.max(0, (game.prestige || 0) - 1));
    return Math.max(1, Math.floor(base * clickScale));
  }
  const scaled = base * Math.pow(getLevelScalingFactor(), game.prestige || 0);
  return Math.max(1, Math.floor(scaled));
}

function getScaledMissionRewardAmount(mission) {
  const baseReward = mission?.reward?.amount || 0;
  return Math.max(1, Math.floor(baseReward * Math.pow(getLevelScalingFactor(), game.prestige || 0)));
}

function isMissionCompletedById(missionId) {
  const mission = getMissionTemplateById(missionId);
  if (!mission) return false;
  return getMissionCurrentValue(mission) >= getScaledMissionAmount(mission);
}

function getMissionLevel() {
  return Math.max(1, Math.min(MAX_MISSION_LEVEL, game.missions?.currentLevel || 1));
}

function areAllMissionsOfLevelClaimed(level) {
  const levelMissions = getReachableMissionTemplates().filter(m => (m.level || 1) === level);
  if (levelMissions.length === 0) return false;
  const claimed = game.missions?.claimedIds || [];
  return levelMissions.every(m => claimed.includes(m.id));
}

function updateMissionLevelProgression() {
  if (!game.missions) return;
  while (game.missions.currentLevel < MAX_MISSION_LEVEL && areAllMissionsOfLevelClaimed(game.missions.currentLevel)) {
    game.missions.currentLevel++;
  }
}

function getAvailableMissionPool() {
  const active  = game.missions?.activeIds || [];
  const claimed = game.missions?.claimedIds || [];
  const level   = getMissionLevel();
  return getAllMissionTemplates()
    .filter(m => {
      if ((m.level || 1) !== level) return false;
      if (active.includes(m.id) || claimed.includes(m.id)) return false;
      // Ressourcen-Missionen nur wenn mind. 1 Gebäude der Ressource gekauft
      if (m.targetKey === 'resource') {
        const def = RESOURCE_DEFS.find(d => d.id === m.targetId);
        if (!def) return false;
        const hasBuilding = Object.values(game.resourceBuildings[def.id] || {}).some(v => v > 0);
        if (!hasBuilding) return false;
      }
      return true;
    })
    .sort((a, b) => a.amount - b.amount);
}

function ensureActiveMissions() {
  if (!game.missions) game.missions = createMissionState();
  if (!Array.isArray(game.missions.activeIds))  game.missions.activeIds  = [];
  if (!Array.isArray(game.missions.claimedIds)) game.missions.claimedIds = [];
  if (typeof game.missions.completedCount !== 'number') game.missions.completedCount = 0;
  if (typeof game.missions.currentLevel   !== 'number') game.missions.currentLevel   = 1;

  const validIds = new Set(getAllMissionTemplates().map(m => m.id));
  game.missions.activeIds  = game.missions.activeIds.filter(id => validIds.has(id));
  game.missions.claimedIds = game.missions.claimedIds.filter(id => validIds.has(id));

  // Ressourcen-Missionen aus activeIds entfernen wenn noch kein Gebäude gekauft
  game.missions.activeIds = game.missions.activeIds.filter(id => {
    const tmpl = getMissionTemplateById(id);
    if (!tmpl || tmpl.targetKey !== 'resource') return true;
    const def = RESOURCE_DEFS.find(d => d.id === tmpl.targetId);
    if (!def) return false;
    return Object.values(game.resourceBuildings[def.id] || {}).some(v => v > 0);
  });

  updateMissionLevelProgression();

  while (game.missions.activeIds.length < MAX_ACTIVE_MISSIONS) {
    const pool = getAvailableMissionPool();
    if (pool.length === 0) break;
    game.missions.activeIds.push(pool[0].id);
  }
}

function applyMissionReward(reward, mission = null) {
  if (!reward) return;
  const rewardAmount      = mission ? getScaledMissionRewardAmount(mission) : (reward.amount || 0);
  const prestigeMissionBonus = Math.pow(1.01, game.prestige || 0);
  const totalReward       = Math.floor(rewardAmount * prestigeMissionBonus);

  if (reward.type === 'data') {
    ensureIndustryState();
    game.industries.data.amount += totalReward;
    game.data = game.industries.data.amount;
    if (game.stats) game.stats.totalData += totalReward;
    return;
  }
  if (reward.type === 'operators') {
    game.operators += totalReward;
    game.totalOperatorsEarned += totalReward;
    return;
  }
  if (reward.type === 'resource') {
    if (!game.resources) game.resources = {};
    const key = reward.resourceKey;
    if (!key) return;
    game.resources[key] = (game.resources[key] || 0) + rewardAmount;
  }
}

function claimMission(missionId) {
  if (!game.missions || !game.missions.activeIds.includes(missionId)) return;
  if (!isMissionCompletedById(missionId)) return;

  const mission = getMissionTemplateById(missionId);
  if (!mission) return;

  applyMissionReward(mission.reward, mission);
  game.missions.activeIds = game.missions.activeIds.filter(id => id !== missionId);

  if (!game.missions.claimedIds.includes(missionId)) {
    game.missions.claimedIds.push(missionId);
    game.missions.completedCount++;
  }

  showFloatingText('🎉 Mission abgeschlossen!', 'purchase');

  if (game.missions.completedCount >= getReachableMissionTemplates().length) {
    markMissionsDirty();
    updateUI();
    maybeRenderMissions(true);
    return;
  }

  ensureActiveMissions();
  markMissionsDirty();
  updateUI();
  maybeRenderMissions(true);
}

function getMissionTargetText(mission) {
  if (!mission) return '';
  const targetAmount = getScaledMissionAmount(mission);
  if (mission.targetKey === 'building')  return `${targetAmount}x ${mission.targetId}`;
  if (mission.targetKey === 'producer') {
    const [industryId, indexRaw] = String(mission.targetId || '').split(':');
    const industryDef = getIndustryDef(industryId);
    const producer = industryDef?.producers?.[parseInt(indexRaw, 10)];
    return `${targetAmount.toLocaleString()}x ${producer?.name || mission.targetId}`;
  }
  if (mission.targetKey === 'operators' || mission.targetKey === 'operatorsEarned') return `${targetAmount.toLocaleString()} Operatoren`;
  if (mission.targetKey === 'industry') {
    const industryDef = getIndustryDef(mission.targetId);
    return `${formatIndustryAmount(industryDef, targetAmount)} ${industryDef?.name || ''}`;
  }
  if (mission.targetKey === 'perSecond') return `${formatData(targetAmount)}/s`;
  if (mission.targetKey === 'clicks')    return `${targetAmount.toLocaleString()} Klicks`;
  return formatData(targetAmount);
}

function getMissionProgressText(mission, currentValue) {
  const targetAmount = getScaledMissionAmount(mission);
  if (mission.targetKey === 'building' || mission.targetKey === 'clicks' || mission.targetKey === 'producer' || mission.targetKey === 'operators' || mission.targetKey === 'operatorsEarned') {
    return `${Math.floor(currentValue).toLocaleString()} / ${Math.floor(targetAmount).toLocaleString()}`;
  }
  if (mission.targetKey === 'perSecond') {
    return `${formatData(currentValue)}/s / ${formatData(targetAmount)}/s`;
  }
  return `${formatData(currentValue)} / ${formatData(targetAmount)}`;
}

// ---- Render-Throttling ----------------------------------------
function markMissionsDirty() {
  window.__missionsDirty = true;
}

function getMissionsRenderSignature() {
  ensureActiveMissions();
  const parts = [];
  parts.push(`done:${game.missions.completedCount}`);
  parts.push(`active:${(game.missions.activeIds || []).join(',')}`);
  (game.missions.activeIds || []).forEach(id => {
    const mission = getMissionTemplateById(id);
    if (!mission) return;
    const currentValue = getMissionCurrentValue(mission);
    const targetValue  = getScaledMissionAmount(mission);
    parts.push(`${id}:${Math.floor(currentValue)}:${targetValue}`);
  });
  return parts.join('|');
}

function initMissionUIInteractions() {
  const container = document.getElementById('missionsContainer');
  if (!container || container.dataset.bound === '1') return;
  container.dataset.bound = '1';
  container.addEventListener('mouseenter', () => { window.__missionsHovering = true; });
  container.addEventListener('mouseleave', () => {
    window.__missionsHovering = false;
    markMissionsDirty();
    maybeRenderMissions();
  });
}

function maybeRenderMissions(force = false) {
  const signature = getMissionsRenderSignature();
  if (!force && window.__missionsHovering) return;
  if (!force && !window.__missionsDirty && window.__lastMissionSignature === signature) return;
  renderMissions();
  window.__lastMissionSignature = signature;
  window.__missionsDirty = false;
}

function renderMissions() {
  const container = document.getElementById('missionsContainer');
  if (!container) return;

  ensureActiveMissions();
  container.innerHTML = '';

  const missionLevel   = getMissionLevel();
  const completed      = game.missions.completedCount;
  const reachable      = getReachableMissionTemplates();
  const levelMissions  = reachable.filter(m => (m.level || 1) === missionLevel);
  const levelClaimed   = levelMissions.filter(m => game.missions.claimedIds.includes(m.id)).length;

  const summaryCard = document.createElement('div');
  summaryCard.className = 'card mission-card';
  const cycleReady = completed >= reachable.length;
  summaryCard.innerHTML = `
    <div class="sub">Missionen</div>
    <div style="font-size:22px;font-weight:bold;line-height:1.1;margin-top:4px;">Level ${missionLevel} • Rang ${game.prestige}</div>
    <div class="sub" style="margin-top:4px;">${levelClaimed}/${levelMissions.length} in diesem Level</div>
    <div class="sub" style="margin-top:4px;">Gesamt abgeschlossen: ${completed}/${reachable.length}</div>
    <button onclick="startNextLevelCycle()" ${!cycleReady ? 'disabled' : ''} style="margin-top:8px;width:100%;">${cycleReady ? 'Neuen Durchlauf starten' : `Neuer Durchlauf bei ${reachable.length}/${reachable.length}`}</button>
  `;
  container.appendChild(summaryCard);

  if (!game.missions.activeIds.length) {
    const emptyCard = document.createElement('div');
    emptyCard.className = 'card mission-card';
    emptyCard.innerHTML = `
      <div style="font-size:15px;font-weight:bold;">Keine weiteren Missionen</div>
      <div class="sub" style="margin-top:4px;">Weitere Missionen folgen mit dem nächsten Update.</div>
    `;
    container.appendChild(emptyCard);
    return;
  }

  game.missions.activeIds.forEach(missionId => {
    const mission = getMissionTemplateById(missionId);
    if (!mission) return;

    const currentValue     = getMissionCurrentValue(mission);
    const targetValue      = getScaledMissionAmount(mission);
    const progressRatio    = Math.min(1, currentValue / targetValue);
    const isDone           = currentValue >= targetValue;
    const scaledRewardAmt  = getScaledMissionRewardAmount(mission);
    const rewardText       = mission.reward.type === 'data'
      ? `${formatData(scaledRewardAmt)} Daten`
      : mission.reward.type === 'operators'
        ? `${scaledRewardAmt.toLocaleString()} Operatoren`
        : `${scaledRewardAmt} Ressource`;

    const card = document.createElement('div');
    card.className = 'card mission-card';
    card.innerHTML = `
      <div class="mission-row">
        <div style="min-width:0;flex:1;">
          <div style="font-size:15px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${mission.title} <span class="sub">(Lv ${mission.level || 1})</span></div>
          <div class="sub" style="font-size:12px;line-height:1.25;margin-top:2px;">${getMissionProgressText(mission, currentValue)} • Ziel: ${getMissionTargetText(mission)}</div>
          <div class="sub" style="font-size:12px;line-height:1.25;">Belohnung: ${rewardText}</div>
          <button onclick="claimMission('${mission.id}')" ${!isDone ? 'disabled' : ''} style="margin-top:8px;">${isDone ? 'Abholen' : 'In Arbeit'}</button>
        </div>
      </div>
      <div class="mission-track">
        <div class="mission-fill ${isDone ? 'done' : ''}" style="width:${(progressRatio * 100).toFixed(1)}%;"></div>
      </div>
    `;
    container.appendChild(card);
  });
}
