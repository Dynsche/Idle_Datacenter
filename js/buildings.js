// ============================================================
// Produktionsketten: Rendering & Kauf
// ============================================================

function formatIndustryAmount(industryDef, value) {
  return industryDef.id === 'data' ? formatData(value) : formatResource(value, industryDef.unit);
}

function isIndustryUnlocked(industryDef) {
  const industry = getIndustryState(industryDef.id);
  return industryDef.unlockAt === 0 ||
    game.data >= industryDef.unlockAt ||
    (industry && (industry.amount > 0 || industry.producers.some(p => p.owned > 0)));
}

function isProducerUnlocked(industryDef, producerIndex) {
  if (producerIndex === 0) return true;
  const industry = getIndustryState(industryDef.id);
  const producerDef = industryDef.producers[producerIndex];
  const previousOwned = industry?.producers?.[producerIndex - 1]?.owned || 0;
  const currentOwned = industry?.producers?.[producerIndex]?.owned || 0;
  return currentOwned > 0 || previousOwned >= producerDef.unlockAt;
}

function renderBuildings() {
  const container = document.getElementById('buildings');
  if (!container) return;
  ensureIndustryState();
  container.innerHTML = '';

  const operatorCard = document.createElement('div');
  operatorCard.className = 'card';
  operatorCard.style.marginBottom = '15px';
  operatorCard.innerHTML = `
    <div class="sub">Operatoren</div>
    <div class="resource" style="font-size:26px;">${Math.floor(game.operators).toLocaleString()}</div>
    <div class="sub">+${getOperatorRate().toFixed(2)}/s · Kaufwährung für alle Produktionsketten</div>
  `;
  container.appendChild(operatorCard);

  INDUSTRY_DEFS.forEach(industryDef => {
    const industry = getIndustryState(industryDef.id);
    if (!isIndustryUnlocked(industryDef)) {
      const locked = document.createElement('div');
      locked.className = 'card';
      locked.style.cssText = 'opacity:0.45;margin-bottom:16px;';
      locked.innerHTML = `
        <div style="font-weight:bold;font-size:18px;">${industryDef.icon} ${industryDef.name}</div>
        <div class="sub">Freischaltbar ab ${formatData(industryDef.unlockAt)} Daten</div>
      `;
      container.appendChild(locked);
      return;
    }

    const section = document.createElement('div');
    section.className = 'chain-section';
    section.innerHTML = `
      <div class="chain-header">
        <div>
          <h3>${industryDef.icon} ${industryDef.name}</h3>
          <div class="sub">${formatIndustryAmount(industryDef, industry.amount)} · ${formatIndustryAmount(industryDef, getIndustryPrimaryRate(industryDef.id))}/s</div>
        </div>
      </div>
    `;

    industryDef.producers.forEach((producerDef, producerIndex) => {
      const state = industry.producers[producerIndex];
      const targetName = producerIndex === 0 ? industryDef.resourceLabel : industryDef.producers[producerIndex - 1].name;
      const unlocked = isProducerUnlocked(industryDef, producerIndex);
      const maxBuy = calculateMaxProducerBuy(industryDef.id, producerIndex);
      const buyAmount = game.buyAmount === -1 ? maxBuy : game.buyAmount;
      const displayAmount = game.buyAmount === -1 && buyAmount === 0 ? 1 : buyAmount;
      const cost = calculateProducerBulkCost(industryDef.id, producerIndex, Math.max(displayAmount, 1));
      const canAfford = unlocked && buyAmount > 0 && game.operators >= cost;

      const row = document.createElement('div');
      row.className = 'building';
      if (!unlocked) row.style.opacity = '0.45';
      row.innerHTML = `
        <div>
          <h3>${producerDef.name}</h3>
          <div>Besitzt: <span data-owned-industry="${industryDef.id}" data-owned-index="${producerIndex}">${Math.floor(state.owned).toLocaleString()}</span>${buyAmount > 0 ? ` <span data-buy-preview-industry="${industryDef.id}" data-buy-preview-index="${producerIndex}" style="color:#4ade80;">+${buyAmount}</span>` : ''}</div>
          <div>Kosten: <span data-cost-industry="${industryDef.id}" data-cost-index="${producerIndex}">${Math.floor(cost).toLocaleString()}</span> Operatoren</div>
          <div class="sub">${producerIndex === 0 ? 'Produziert' : 'Erzeugt'} ${targetName}: ${getProducerRate(industryDef.id, producerIndex).toFixed(2)}/s</div>
          <div class="sub">${producerDef.description}</div>
          ${!unlocked ? `<div class="sub" style="color:#f59e0b;">Benötigt ${producerDef.unlockAt} ${targetName}</div>` : ''}
        </div>
        <button data-producer-industry="${industryDef.id}" data-producer-index="${producerIndex}" onclick="buyProducer('${industryDef.id}', ${producerIndex})" ${!canAfford ? 'disabled' : ''}>Kaufen</button>
      `;
      section.appendChild(row);
    });

    container.appendChild(section);
  });
}

function buyProducer(industryId, producerIndex) {
  ensureIndustryState();
  const industryDef = getIndustryDef(industryId);
  if (!industryDef || !isProducerUnlocked(industryDef, producerIndex)) return;

  const amount = game.buyAmount === -1 ? calculateMaxProducerBuy(industryId, producerIndex) : game.buyAmount;
  if (amount <= 0) return;

  const cost = calculateProducerBulkCost(industryId, producerIndex, amount);
  if (game.operators < cost) return;

  const state = getProducerState(industryId, producerIndex);
  game.operators -= cost;
  state.owned += amount;
  if (game.stats) game.stats.buildingsBought += amount;
  updateUI();
  renderBuildings();
}

function setBuyAmount(amount) {
  game.buyAmount = amount;
  sessionStorage.setItem('buyAmount', amount);
  document.querySelectorAll('.buy-buttons button[data-amount]').forEach(btn => {
    const v = btn.dataset.amount === 'max' ? -1 : parseInt(btn.dataset.amount);
    btn.classList.toggle('active', v === amount);
  });
  renderBuildings();
  if (typeof renderResourceTab === 'function') renderResourceTab();
}

function updateBuyButtonAffordability() {
  document.querySelectorAll('.buy-buttons button[data-amount]').forEach(btn => {
    const raw = btn.dataset.amount;
    if (raw === 'max') {
      btn.disabled = false;
      return;
    }
    const amount = parseInt(raw);
    const canAfford = INDUSTRY_DEFS.some(industryDef =>
      isIndustryUnlocked(industryDef) && industryDef.producers.some((producerDef, producerIndex) =>
        isProducerUnlocked(industryDef, producerIndex) &&
        game.operators >= calculateProducerBulkCost(industryDef.id, producerIndex, amount)
      )
    );
    btn.disabled = !canAfford;
  });
}

// ============================================================
// Karten & Automatisierung - Platzhalter für den nächsten Ausbau
// ============================================================

function updateProducerAffordability() {
  if (!document.querySelector('[data-producer-industry]')) return;

  document.querySelectorAll('[data-owned-industry]').forEach(el => {
    const state = getProducerState(el.dataset.ownedIndustry, parseInt(el.dataset.ownedIndex, 10));
    if (state) el.textContent = Math.floor(state.owned).toLocaleString();
  });

  document.querySelectorAll('[data-producer-industry]').forEach(button => {
    const industryId = button.dataset.producerIndustry;
    const producerIndex = parseInt(button.dataset.producerIndex, 10);
    const industryDef = getIndustryDef(industryId);
    if (!industryDef) return;

    const maxBuy = calculateMaxProducerBuy(industryId, producerIndex);
    const buyAmount = game.buyAmount === -1 ? maxBuy : game.buyAmount;
    const displayAmount = game.buyAmount === -1 && buyAmount === 0 ? 1 : buyAmount;
    const cost = calculateProducerBulkCost(industryId, producerIndex, Math.max(displayAmount, 1));
    const canAfford = isProducerUnlocked(industryDef, producerIndex) && buyAmount > 0 && game.operators >= cost;

    button.disabled = !canAfford;

    const costEl = document.querySelector(`[data-cost-industry="${industryId}"][data-cost-index="${producerIndex}"]`);
    if (costEl) costEl.textContent = Math.floor(cost).toLocaleString();

    const previewEl = document.querySelector(`[data-buy-preview-industry="${industryId}"][data-buy-preview-index="${producerIndex}"]`);
    if (previewEl) previewEl.textContent = buyAmount > 0 ? `+${buyAmount}` : '+0';
  });
}

function renderBuildingUpgrades() {
  const container = document.getElementById('buildingUpgrades');
  if (!container) return;
  container.innerHTML = `
    <div class="sub" style="line-height:1.7;">
      Karten und Manager werden im nächsten Schritt auf die neuen Produktionsketten gelegt.
      Aktuell laufen alle freigeschalteten Stufen automatisch, damit der neue Kernloop spielbar ist.
    </div>
  `;
}

function buyBuildingUpgrade() {}
