// ============================================================
// Industrie-Übersicht
// ============================================================

function renderResourceTab() {
  const container = document.getElementById('resources-content');
  if (!container) return;
  ensureIndustryState();
  container.innerHTML = '';

  INDUSTRY_DEFS.forEach(industryDef => {
    const industry = getIndustryState(industryDef.id);
    const unlocked = isIndustryUnlocked(industryDef);
    const card = document.createElement('div');
    card.className = 'card';
    card.style.marginBottom = '16px';
    if (!unlocked) card.style.opacity = '0.45';

    const rows = industryDef.producers.map((producerDef, index) => {
      const state = industry.producers[index];
      const target = index === 0 ? industryDef.resourceLabel : industryDef.producers[index - 1].name;
      return `
        <div class="resource-row">
          <span>${producerDef.name}</span>
          <strong>${Math.floor(state.owned).toLocaleString()}</strong>
          <span class="sub">${getProducerRate(industryDef.id, index).toFixed(2)}/s → ${target}</span>
        </div>
      `;
    }).join('');

    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <span style="font-size:30px;">${industryDef.icon}</span>
        <div>
          <div style="font-weight:bold;font-size:19px;">${industryDef.name}</div>
          <div class="sub">${unlocked ? `${formatIndustryAmount(industryDef, industry.amount)} · ${formatIndustryAmount(industryDef, getIndustryPrimaryRate(industryDef.id))}/s` : `Freischaltbar ab ${formatData(industryDef.unlockAt)} Daten`}</div>
        </div>
      </div>
      ${unlocked ? rows : ''}
    `;
    container.appendChild(card);
  });
}

function renderResourceTopbar() {
  const container = document.getElementById('resourceTopbar');
  if (!container) return;
  ensureIndustryState();

  const unlocked = INDUSTRY_DEFS.filter(def => isIndustryUnlocked(def));
  if (unlocked.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = '';

  const signature = unlocked.map(def => def.id).join('|');
  if (container.dataset.signature !== signature) {
    container.dataset.signature = signature;
    container.innerHTML = unlocked.map(def => `
      <div class="card resource-topbar-card" data-industry="${def.id}" style="min-width:140px;">
        <div class="sub">${def.icon} ${def.name}</div>
        <div class="resource rt-amount" style="font-size:18px;"></div>
        <div class="sub"><span class="rt-rate"></span>/s</div>
      </div>
    `).join('');
  }

  unlocked.forEach(def => {
    const industry = getIndustryState(def.id);
    const card = container.querySelector(`[data-industry="${def.id}"]`);
    if (!card) return;
    const amountEl = card.querySelector('.rt-amount');
    const rateEl = card.querySelector('.rt-rate');
    if (amountEl) amountEl.textContent = formatIndustryAmount(def, industry.amount);
    if (rateEl) rateEl.textContent = formatIndustryAmount(def, getIndustryPrimaryRate(def.id));
  });
}
