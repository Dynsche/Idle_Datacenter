// ============================================================
// Einheiten & Basis-Konstanten
// ============================================================
const UNITS = ['Bit', 'Byte', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];

const BASE_OFFLINE_LIMIT          = 1500;          // 25 Minuten in Sekunden
const OFFLINE_UPGRADE_BONUS       = 1500;          // +25 Minuten pro Upgrade
const BASE_OFFLINE_UPGRADE_COST   = 200000000;
const OFFLINE_UPGRADE_COST_GROWTH = 2.5;
const BASE_AI_UPGRADE_COST        = 2147483648;
const BASE_PRESTIGE_REQUIREMENT   = 1099511627776;
const PRESTIGE_COST_GROWTH        = 4;
const PRESTIGE_BONUS_PER_LEVEL    = 0.35;
const UPGRADES_TAB_UNLOCK_AT      = 15000000;
const BUILDING_COST_GROWTH        = 1.18;
const SUPPORT_LOG_FACTOR          = 0.18;
const SUPPORT_TRANSFER_RATIO      = 0.25;
const SOFTCAP_STAGE1_START        = 1073741824;    // 1 GB/s
const SOFTCAP_STAGE1_POWER        = 0.82;
const SOFTCAP_STAGE2_START        = 1099511627776; // 1 TB/s
const SOFTCAP_STAGE2_POWER        = 0.65;
const SAVE_BALANCE_VERSION        = 14;

// ============================================================
// Missionen
// ============================================================
const MAX_ACTIVE_MISSIONS  = 3;
const MISSIONS_PER_LEVEL   = 5;
const MAX_MISSION_LEVEL    = 5;

// ============================================================
// Klick-Upgrades
// ============================================================
const CLICK_UPGRADES = [
  {
    name: 'Bessere Maus',
    description: 'Klicks bringen 8 Bit statt 1 Bit',
    cost: 200,
    unlockAt: 0,
    newClickPower: 8
  },
  {
    name: 'Mechanische Tastatur',
    description: 'Klicks bringen 64 Bit',
    cost: 8192,
    unlockAt: 2048,
    newClickPower: 64
  },
  {
    name: 'USB-Optimierung',
    description: 'Klicks bringen 512 Bit',
    cost: 204800,
    unlockAt: 61440,
    newClickPower: 512
  },
  {
    name: 'Skript-Automatisierung',
    description: 'Klicks bringen 8 KB',
    cost: 8388608,
    unlockAt: 2097152,
    newClickPower: 8192
  },
  {
    name: 'Makro-Tool',
    description: 'Klicks bringen 128 KB',
    cost: 629145600,
    unlockAt: 157286400,
    newClickPower: 131072
  },
  {
    name: 'Bot-Assistent',
    description: 'Klicks bringen 2 MB',
    cost: 53687091200,
    unlockAt: 12884901888,
    newClickPower: 2097152
  },
  {
    name: 'KI-Cluster',
    description: 'Klicks bringen 32 MB',
    cost: 3298534883328,
    unlockAt: 751619276800,
    newClickPower: 33554432
  }
];

// ============================================================
// Mission-Templates
// ============================================================
const MISSION_TEMPLATES = [
  // Level 1
  { id: 'm-own-it-25',       level: 1, title: 'Personal aufbauen I',      type: 'own',   targetKey: 'building',   targetId: 'IT Mitarbeiter',    amount: 25,          reward: { type: 'data', amount: 5000 } },
  { id: 'm-reach-data-64kb', level: 1, title: 'Datenspeicher I',           type: 'reach', targetKey: 'data',       amount: 65536,                 reward: { type: 'data', amount: 12000 } },
  { id: 'm-reach-pps-256',   level: 1, title: 'Leitungscheck I',           type: 'reach', targetKey: 'perSecond',  amount: 256,                   reward: { type: 'data', amount: 20000 } },
  { id: 'm-own-desktop-20',  level: 1, title: 'Arbeitsplätze erweitern',   type: 'own',   targetKey: 'building',   targetId: 'Desktop PC',        amount: 20,          reward: { type: 'data', amount: 50000 } },
  { id: 'm-clicks-250',      level: 1, title: 'Manueller Einsatz',         type: 'reach', targetKey: 'clicks',     amount: 180,                   reward: { type: 'data', amount: 80000 } },

  // Level 2
  { id: 'm-reach-data-2mb',      level: 2, title: 'Datenspeicher II',        type: 'reach', targetKey: 'data',      amount: 2097152,    reward: { type: 'data', amount: 250000 } },
  { id: 'm-own-miniserver-15',   level: 2, title: 'Server ausbauen',         type: 'own',   targetKey: 'building',  targetId: 'Mini Server',   amount: 15, reward: { type: 'data', amount: 500000 } },
  { id: 'm-reach-pps-8kb',       level: 2, title: 'Leitungscheck II',        type: 'reach', targetKey: 'perSecond', amount: 8192,       reward: { type: 'data', amount: 900000 } },
  { id: 'm-totaldata-16mb',      level: 2, title: 'Langzeitproduktion',      type: 'reach', targetKey: 'totalData', amount: 16777216,   reward: { type: 'data', amount: 1800000 } },
  { id: 'm-own-workstation-20',  level: 2, title: 'Workstations bereitstellen', type: 'own', targetKey: 'building', targetId: 'Workstation', amount: 20, reward: { type: 'data', amount: 3000000 } },

  // Level 3
  { id: 'm-own-serverrack-12', level: 3, title: 'Rack-Struktur',   type: 'own',   targetKey: 'building',  targetId: 'Server Rack', amount: 12,     reward: { type: 'data', amount: 3500000 } },
  { id: 'm-reach-data-256mb',  level: 3, title: 'Datenspeicher III', type: 'reach', targetKey: 'data',    amount: 268435456,       reward: { type: 'data', amount: 6000000 } },
  { id: 'm-reach-pps-128kb',   level: 3, title: 'Leitungscheck III', type: 'reach', targetKey: 'perSecond', amount: 131072,        reward: { type: 'data', amount: 12000000 } },
  { id: 'm-own-blade-10',      level: 3, title: 'Blade-Ausbau',    type: 'own',   targetKey: 'building',  targetId: 'Blade Server', amount: 10,    reward: { type: 'data', amount: 20000000 } },
  { id: 'm-clicks-2500',       level: 3, title: 'Power-User',      type: 'reach', targetKey: 'clicks',    amount: 1200,            reward: { type: 'data', amount: 35000000 } },

  // Level 4
  { id: 'm-own-micro-12',    level: 4, title: 'Micro Datacenter Netz', type: 'own',   targetKey: 'building',  targetId: 'Micro Datacenter',    amount: 12,        reward: { type: 'data', amount: 70000000 } },
  { id: 'm-reach-data-8gb',  level: 4, title: 'Datenspeicher IV',      type: 'reach', targetKey: 'data',      amount: 8589934592,              reward: { type: 'data', amount: 120000000 } },
  { id: 'm-reach-pps-2mb',   level: 4, title: 'Leitungscheck IV',      type: 'reach', targetKey: 'perSecond', amount: 2097152,                 reward: { type: 'data', amount: 220000000 } },
  { id: 'm-own-edge-10',     level: 4, title: 'Edge-Rollout',          type: 'own',   targetKey: 'building',  targetId: 'Edge Computing Node', amount: 10,        reward: { type: 'data', amount: 400000000 } },
  { id: 'm-totaldata-64gb',  level: 4, title: 'Dauerbetrieb',          type: 'reach', targetKey: 'totalData', amount: 68719476736,             reward: { type: 'data', amount: 700000000 } },

  // Level 5
  { id: 'm-own-halle-10',   level: 5, title: 'Datacenter-Campus', type: 'own',   targetKey: 'building',  targetId: 'Datacenter Halle', amount: 10,        reward: { type: 'data', amount: 2400000000 } },
  { id: 'm-reach-data-256gb', level: 5, title: 'Datenspeicher V', type: 'reach', targetKey: 'data',      amount: 274877906944,         reward: { type: 'data', amount: 4400000000 } },
  { id: 'm-reach-pps-16mb',  level: 5, title: 'Leitungscheck V',  type: 'reach', targetKey: 'perSecond', amount: 16777216,             reward: { type: 'data', amount: 8000000000 } },
  { id: 'm-own-cdn-8',       level: 5, title: 'CDN Ausbau',       type: 'own',   targetKey: 'building',  targetId: 'CDN Server Farm',  amount: 8,         reward: { type: 'data', amount: 14000000000 } },
  { id: 'm-reach-data-1tb',  level: 5, title: 'Prestige-Bereit',  type: 'reach', targetKey: 'data',      amount: 1099511627776,        reward: { type: 'data', amount: 30000000000 } }
];

// ============================================================
// Achievements
// ============================================================
const ACHIEVEMENTS = [
  { id: 'first-click',       title: '🖱️ Erster Klick',       description: 'Klicke einmal auf Daten sammeln',               check: (g) => (g.stats?.totalClicks || 0) >= 1 },
  { id: 'clicker',           title: '⚡ Klick-Meister',       description: 'Sammle 1.000 Klicks',                           check: (g) => (g.stats?.totalClicks || 0) >= 1000 },
  { id: 'data-collector',    title: '📊 Datensammler',        description: 'Sammle 1 GB Daten',                             check: (g) => (g.stats?.totalData || 0) >= 1073741824 },
  { id: 'first-prestige',    title: '🎊 Erster Durchlauf',    description: 'Starte deinen ersten Level-Durchlauf',          check: (g) => g.prestige >= 1 },
  { id: 'prestige-5',        title: '👑 Fünffach König',      description: 'Erreiche Level 5 (5 Durchläufe)',               check: (g) => g.prestige >= 5 },
  { id: 'building-collector',title: '🏢 Gebäude-Tycoon',      description: 'Besitze mindestens 50 Gebäude',                 check: (g) => (g.buildings || []).reduce((sum, b) => sum + b.owned, 0) >= 50 },
  { id: 'upgrade-master',    title: '🔧 Upgrade-Meister',     description: 'Kaufe 20 Upgrades',                             check: (g) => (g.stats?.upgradesBought || 0) >= 20 },
  { id: 'offline-producer',  title: '😴 Offline-Produzent',  description: 'Nutze 1 Stunde Offline-Produktion',             check: (g) => (g.stats?.offlineTimeUsed || 0) >= 3600 },
  { id: 'mission-master',    title: '🎯 Missionen-Meister',   description: 'Schließe 25 Missionen ab',                      check: (g) => (g.missions?.completedCount || 0) >= 25 },
  { id: 'data-tycoon',       title: '💰 Daten-Tycoon',        description: 'Erreiche 1 TB Gesamtproduktion',                check: (g) => (g.stats?.totalData || 0) >= 1099511627776 }
];

// ============================================================
// Gebäude-Upgrades
// ============================================================
const BUILDING_UPGRADES = [
  {
    name: 'Schulungsprogramm',
    description: '+50% IT-Mitarbeiter Produktion',
    cost: 30000000,
    unlockAt: 15000000,
    targetBuilding: 'IT Mitarbeiter',
    multiplier: 1.5,
    requires: null,
    minBuildings: { 'IT Mitarbeiter': 25 }
  },
  {
    name: 'Ergonomische Arbeitsplätze',
    description: '+50% Desktop PC Produktion',
    cost: 150000000,
    unlockAt: 75000000,
    targetBuilding: 'Desktop PC',
    multiplier: 1.5,
    requires: 0,
    minBuildings: { 'IT Mitarbeiter': 40, 'Desktop PC': 20 }
  },
  {
    name: 'Server-Optimierung',
    description: '+75% Mini Server & Workstation',
    cost: 750000000,
    unlockAt: 375000000,
    targetBuilding: ['Mini Server', 'Workstation'],
    multiplier: 1.75,
    requires: 1,
    minBuildings: { 'Desktop PC': 35, 'Mini Server': 25 }
  },
  {
    name: 'Cooling System Upgrade',
    description: '+100% Server Rack & Blade Server',
    cost: 6000000000,
    unlockAt: 3000000000,
    targetBuilding: ['Server Rack', 'Blade Server'],
    multiplier: 2.0,
    requires: 2,
    minBuildings: { 'Mini Server': 40, 'Workstation': 30, 'Server Rack': 20 }
  },
  {
    name: 'Redundante Systeme',
    description: '+150% Datacenter Halle',
    cost: 30000000000,
    unlockAt: 15000000000,
    targetBuilding: 'Datacenter Halle',
    multiplier: 2.5,
    requires: 3,
    minBuildings: { 'Server Rack': 35, 'Blade Server': 25, 'Datacenter Halle': 15 }
  },
  {
    name: 'Edge Computing Protocol',
    description: '+100% Edge Computing Node & Micro Datacenter',
    cost: 75000000000,
    unlockAt: 30000000000,
    targetBuilding: ['Edge Computing Node', 'Micro Datacenter'],
    multiplier: 2.0,
    requires: 4,
    minBuildings: { 'Datacenter Halle': 25, 'Micro Datacenter': 20, 'Edge Computing Node': 15 }
  },
  {
    name: 'Global CDN Network',
    description: '+200% CDN Server Farm',
    cost: 1500000000000,
    unlockAt: 600000000000,
    targetBuilding: 'CDN Server Farm',
    multiplier: 3.0,
    requires: 5,
    minBuildings: { 'Edge Computing Node': 30, 'CDN Server Farm': 20 }
  },
  {
    name: 'Hyperscale Architecture',
    description: '+250% Cloud Region & Hyperscale Campus',
    cost: 30000000000000,
    unlockAt: 12000000000000,
    targetBuilding: ['Cloud Region', 'Hyperscale Campus'],
    multiplier: 3.5,
    requires: 6,
    minBuildings: { 'CDN Server Farm': 30, 'Cloud Region': 15, 'Hyperscale Campus': 10 }
  },
  {
    name: 'Ocean Cooling',
    description: '+300% Submarine Datacenter',
    cost: 750000000000000,
    unlockAt: 300000000000000,
    targetBuilding: 'Submarine Datacenter',
    multiplier: 4.0,
    requires: 7,
    minBuildings: { 'Hyperscale Campus': 20, 'Submarine Datacenter': 12 }
  },
  {
    name: 'Quantum Entanglement',
    description: '+500% Quantum Computing Cluster',
    cost: 30000000000000000,
    unlockAt: 15000000000000000,
    targetBuilding: 'Quantum Computing Cluster',
    multiplier: 6.0,
    requires: 8,
    minBuildings: { 'Submarine Datacenter': 20, 'Satellite Network': 15, 'Quantum Computing Cluster': 8 }
  },
  {
    name: 'Neural Acceleration',
    description: '+400% Neural Network Matrix',
    cost: 240000000000000000,
    unlockAt: 120000000000000000,
    targetBuilding: 'Neural Network Matrix',
    multiplier: 5.0,
    requires: 9,
    minBuildings: { 'Quantum Computing Cluster': 20, 'Neural Network Matrix': 8 }
  },
  {
    name: 'Holographic Projection',
    description: '+500% Holographic Processing Array',
    cost: 1920000000000000000,
    unlockAt: 960000000000000000,
    targetBuilding: 'Holographic Processing Array',
    multiplier: 6.0,
    requires: 10,
    minBuildings: { 'Neural Network Matrix': 15, 'Holographic Processing Array': 8 }
  },
  {
    name: 'Quantum Flux Stabilizer',
    description: '+600% Quantum Entanglement Hub',
    cost: 15360000000000000000,
    unlockAt: 7680000000000000000,
    targetBuilding: 'Quantum Entanglement Hub',
    multiplier: 7.0,
    requires: 11,
    minBuildings: { 'Holographic Processing Array': 12, 'Quantum Entanglement Hub': 8 }
  },
  {
    name: 'Photonic Amplification',
    description: '+700% Photonic Supercomputer',
    cost: 122880000000000000000,
    unlockAt: 61440000000000000000,
    targetBuilding: 'Photonic Supercomputer',
    multiplier: 8.0,
    requires: 12,
    minBuildings: { 'Quantum Entanglement Hub': 12, 'Photonic Supercomputer': 8 }
  },
  {
    name: 'Biosynthetic Integration',
    description: '+800% Biosynthetic Computing Network',
    cost: 983040000000000000000,
    unlockAt: 491520000000000000000,
    targetBuilding: 'Biosynthetic Computing Network',
    multiplier: 9.0,
    requires: 13,
    minBuildings: { 'Photonic Supercomputer': 12, 'Biosynthetic Computing Network': 8 }
  }
];

// ============================================================
// Standard-Gebäude
// ============================================================
const DEFAULT_BUILDINGS = [
  { name: 'IT Mitarbeiter',              baseCost: 64,                  production: 1,            unlockAt: 0 },
  { name: 'Desktop PC',                  baseCost: 256,                 production: 3,            unlockAt: 128 },
  { name: 'Mini Server',                 baseCost: 2048,                production: 12,           unlockAt: 1024 },
  { name: 'Workstation',                 baseCost: 16384,               production: 48,           unlockAt: 8192 },
  { name: 'Server Rack',                 baseCost: 131072,              production: 192,          unlockAt: 65536 },
  { name: 'Blade Server',                baseCost: 1048576,             production: 768,          unlockAt: 524288 },
  { name: 'Micro Datacenter',            baseCost: 8388608,             production: 3072,         unlockAt: 4194304 },
  { name: 'Edge Computing Node',         baseCost: 67108864,            production: 12288,        unlockAt: 33554432 },
  { name: 'Datacenter Halle',            baseCost: 536870912,           production: 49152,        unlockAt: 268435456 },
  { name: 'CDN Server Farm',             baseCost: 4294967296,          production: 196608,       unlockAt: 2147483648 },
  { name: 'Cloud Region',                baseCost: 34359738368,         production: 786432,       unlockAt: 17179869184 },
  { name: 'Hyperscale Campus',           baseCost: 274877906944,        production: 3145728,      unlockAt: 137438953472 },
  { name: 'Submarine Datacenter',        baseCost: 2199023255552,       production: 12582912,     unlockAt: 1099511627776 },
  { name: 'Satellite Network',           baseCost: 17592186044416,      production: 50331648,     unlockAt: 8796093022208 },
  { name: 'Quantum Computing Cluster',   baseCost: 140737488355328,     production: 201326592,    unlockAt: 70368744177664 },
  { name: 'Neural Network Matrix',       baseCost: 1125899906842624,    production: 805306368,    unlockAt: 562949953421312 },
  { name: 'Holographic Processing Array',baseCost: 9007199254740992,    production: 3221225472,   unlockAt: 4503599627370496 },
  { name: 'Quantum Entanglement Hub',    baseCost: 72057594037927936,   production: 12884901888,  unlockAt: 36028797018963968 },
  { name: 'Photonic Supercomputer',      baseCost: 576460752303423488,  production: 51539607552,  unlockAt: 288230376151711744 },
  { name: 'Biosynthetic Computing Network', baseCost: 4611686018427387904, production: 206158430208, unlockAt: 2305843009213693952 }
];

// ============================================================
// Firebase-Konfiguration & Cloud-Konstanten
// ============================================================
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDurgHG0S6kCc4u6BkoE7prLXzxHbJ3RFA',
  authDomain: 'idle-datacenter.firebaseapp.com',
  projectId: 'idle-datacenter',
  storageBucket: 'idle-datacenter.firebasestorage.app',
  messagingSenderId: '503758094362',
  appId: '1:503758094362:web:b3fbb6e62c53efee3fd1a3'
};
const CLOUD_SAVE_DOC_ID = 'main';

// ============================================================
// Ressourcen-Definitionen
// Abhängigkeitskette: Strom → Kühlung → Bandbreite → Rechenleistung
// ============================================================
const RESOURCE_DEFS = [
  {
    id: 'power',
    name: 'Strom',
    icon: '⚡',
    unit: 'kW',
    unlockAt: 1048576,
    dependsOn: null,
    productionBonus: 0.04,
    bonusPerUnits: 25,
    maxBonus: 2.0,
    buildings: [
      { id: 'power_gen',      name: 'Notstromaggregat',   baseCost: 409600,      production: 1,   unlockAt: 0 },
      { id: 'power_solar',    name: 'Solaranlage',         baseCost: 5242880,     production: 8,   unlockAt: 5 },
      { id: 'power_nuclear',  name: 'Kleinreaktor',        baseCost: 104857600,   production: 60,  unlockAt: 20 }
    ]
  },
  {
    id: 'cooling',
    name: 'Kühlung',
    icon: '❄️',
    unit: 'kJ/s',
    unlockAt: 1073741824,
    dependsOn: 'power',
    productionBonus: 0.05,
    bonusPerUnits: 25,
    maxBonus: 3.0,
    buildings: [
      { id: 'cool_fan',       name: 'Lüftersystem',        baseCost: 36700160,    production: 1,   unlockAt: 0 },
      { id: 'cool_liquid',    name: 'Flüssigkühlung',      baseCost: 471859200,   production: 8,   unlockAt: 5 },
      { id: 'cool_cryo',      name: 'Kryokühlung',         baseCost: 10737418240, production: 60,  unlockAt: 20 }
    ]
  },
  {
    id: 'bandwidth',
    name: 'Bandbreite',
    icon: '📡',
    unit: 'Gbps',
    unlockAt: 1099511627776,
    dependsOn: 'cooling',
    productionBonus: 0.06,
    bonusPerUnits: 25,
    maxBonus: 4.0,
    buildings: [
      { id: 'bw_fiber',       name: 'Glasfaseranschluss',  baseCost: 3758096384,  production: 1,   unlockAt: 0 },
      { id: 'bw_backbone',    name: 'Internet-Backbone',   baseCost: 53687091200, production: 8,   unlockAt: 5 },
      { id: 'bw_satellite',   name: 'Satelliten-Uplink',   baseCost: 1099511627776, production: 60, unlockAt: 20 }
    ]
  },
  {
    id: 'compute',
    name: 'Rechenleistung',
    icon: '🖥️',
    unit: 'TFLOPS',
    unlockAt: 1125899906842624,
    dependsOn: 'bandwidth',
    productionBonus: 0.08,
    bonusPerUnits: 25,
    maxBonus: 6.0,
    buildings: [
      { id: 'comp_gpu',       name: 'GPU-Cluster',         baseCost: 375809638400,    production: 1,   unlockAt: 0 },
      { id: 'comp_asic',      name: 'ASIC-Farm',           baseCost: 5497558138880,   production: 8,   unlockAt: 5 },
      { id: 'comp_quantum',   name: 'Quanten-Prozessor',   baseCost: 109951162777600, production: 60,  unlockAt: 20 }
    ]
  }
];

// Ressourcen-Missions-Templates (hängen an bestehende MISSION_TEMPLATES an)
const RESOURCE_MISSION_TEMPLATES = [
  // Strom
  { id: 'rm-power-50',    level: 2, title: 'Stromversorgung I',   type: 'reach', targetKey: 'resource', targetId: 'power',     amount: 50,   reward: { type: 'data', amount: 5000000 } },
  { id: 'rm-power-500',   level: 3, title: 'Stromversorgung II',  type: 'reach', targetKey: 'resource', targetId: 'power',     amount: 500,  reward: { type: 'data', amount: 80000000 } },
  { id: 'rm-power-2000',  level: 4, title: 'Stromversorgung III', type: 'reach', targetKey: 'resource', targetId: 'power',     amount: 2000, reward: { type: 'data', amount: 1500000000 } },
  // Kühlung
  { id: 'rm-cool-50',     level: 3, title: 'Kühlung I',           type: 'reach', targetKey: 'resource', targetId: 'cooling',   amount: 50,   reward: { type: 'data', amount: 200000000 } },
  { id: 'rm-cool-500',    level: 4, title: 'Kühlung II',          type: 'reach', targetKey: 'resource', targetId: 'cooling',   amount: 500,  reward: { type: 'data', amount: 3000000000 } },
  { id: 'rm-cool-2000',   level: 5, title: 'Kühlung III',         type: 'reach', targetKey: 'resource', targetId: 'cooling',   amount: 2000, reward: { type: 'data', amount: 40000000000 } },
  // Bandbreite
  { id: 'rm-bw-50',       level: 4, title: 'Bandbreite I',        type: 'reach', targetKey: 'resource', targetId: 'bandwidth', amount: 50,   reward: { type: 'data', amount: 8000000000 } },
  { id: 'rm-bw-500',      level: 5, title: 'Bandbreite II',       type: 'reach', targetKey: 'resource', targetId: 'bandwidth', amount: 500,  reward: { type: 'data', amount: 100000000000 } },
  // Rechenleistung
  { id: 'rm-comp-50',     level: 5, title: 'Rechenleistung I',    type: 'reach', targetKey: 'resource', targetId: 'compute',   amount: 50,   reward: { type: 'data', amount: 500000000000 } }
];
