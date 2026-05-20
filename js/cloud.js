// ============================================================
// Cloud-Speicher (Firebase / Firestore)
// ============================================================

let firebaseApp       = null;
let firebaseAuth      = null;
let firestoreDb       = null;
let cloudUser         = null;
let cloudAvailable    = false;
let cloudSyncInProgress  = false;
let cloudLoadInProgress  = false;
let cloudLoadCompleted   = false;

// ---- Debug-Log-System ----------------------------------------
const debugLogs = [];
function addDebugLog(msg) {
  const timestamp = new Date().toLocaleTimeString();
  const logMsg = `[${timestamp}] ${msg}`;
  debugLogs.push(logMsg);
  if (debugLogs.length > 15) debugLogs.shift();
  const debugPanel = document.getElementById('debugLogs');
  if (debugPanel) {
    debugPanel.innerHTML = debugLogs.map(log => `<div>${log}</div>`).join('');
  }
  console.log(msg);
}

function showDebugPanel() {
  const panel = document.getElementById('debugPanel');
  if (panel) panel.style.display = 'block';
}

// Überschreibe console.error für sichtbare Fehler auf Mobilgeräten
const originalError = console.error;
console.error = function(...args) {
  addDebugLog('❌ ' + args.join(' '));
  originalError.apply(console, args);
};

// ---- Status-UI -----------------------------------------------
function setCloudSyncStatus(text, isError = false) {
  const el = document.getElementById('cloudSyncStatus');
  if (!el) return;
  try {
    el.innerText = text;
    el.style.color = isError ? '#fca5a5' : '';
  } catch (e) {
    console.error('Fehler beim setCloudSyncStatus:', e);
  }
}

function updateCloudUserUI() {
  const userStatus = document.getElementById('cloudUserStatus');
  const loginBtn   = document.getElementById('btnGoogleLogin');
  const logoutBtn  = document.getElementById('btnGoogleLogout');
  const syncBtn    = document.getElementById('btnCloudSyncNow');

  if (!userStatus || !loginBtn || !logoutBtn || !syncBtn) return;

  try {
    const signedIn = !!cloudUser;
    userStatus.innerText = signedIn
      ? `Google: ${cloudUser.displayName || cloudUser.email || cloudUser.uid}`
      : (cloudAvailable ? 'Google: nicht angemeldet' : 'Google: Firebase nicht konfiguriert');

    loginBtn.style.display  = signedIn ? 'none' : 'inline-block';
    logoutBtn.style.display = signedIn ? 'inline-block' : 'none';
    syncBtn.style.display   = signedIn ? 'inline-block' : 'none';
    loginBtn.disabled       = !cloudAvailable;
  } catch (e) {
    console.error('Fehler beim Update Cloud UI:', e);
  }
}

// ---- Sync-Benachrichtigung -----------------------------------
function showSyncNotification() {
  const dialog = document.getElementById('cloudConflictDialog');
  if (!dialog) return;
  if (dialog.closeTimer) clearTimeout(dialog.closeTimer);
  dialog.style.display = 'flex';
  dialog.closeTimer = setTimeout(() => { dialog.style.display = 'none'; }, 2000);
}

function showAutosaveIndicator() {
  const statusEl = document.getElementById('saveStatusIndicator');
  if (!statusEl) return;
  statusEl.textContent = '💾 Speichert...';
  statusEl.style.color = '#fbbf24';
  setTimeout(() => {
    statusEl.textContent = '✓ Aktuell';
    statusEl.style.color = '#4ade80';
  }, 300);
}

// ---- Cloud speichern ----------------------------------------
async function saveGameToCloud(showStatus = false) {
  if (!cloudAvailable || !cloudUser || !firestoreDb || cloudSyncInProgress) return;
  try {
    cloudSyncInProgress = true;
    if (showStatus) setCloudSyncStatus('Cloud-Speicher: synchronisiere...');

    game.lastDeviceId = getOrCreateDeviceId();
    game.lastUpdate   = Date.now();

    await firestoreDb
      .collection('users').doc(cloudUser.uid)
      .collection('saves').doc(CLOUD_SAVE_DOC_ID)
      .set({
        saveData:        getSerializableGameState(),
        clientUpdatedAt: Date.now(),
        updatedAt:       firebase.firestore.FieldValue.serverTimestamp(),
        balanceVersion:  SAVE_BALANCE_VERSION
      });

    setCloudSyncStatus('Cloud-Speicher: synchronisiert ✓');
  } catch (error) {
    console.error('Firestore Speicher-Fehler:', error.code, error.message);
    setCloudSyncStatus('Fehler: ' + (error.code || error.message), true);
  } finally {
    cloudSyncInProgress = false;
  }
}

// ---- Cloud laden --------------------------------------------
async function loadGameFromCloud() {
  if (!cloudAvailable || !cloudUser || !firestoreDb || cloudLoadInProgress) return;
  try {
    cloudLoadInProgress = true;
    setCloudSyncStatus('Cloud-Speicher: lade Spielstand...');

    const doc = await firestoreDb
      .collection('users').doc(cloudUser.uid)
      .collection('saves').doc(CLOUD_SAVE_DOC_ID)
      .get();

    if (!doc.exists || !doc.data() || !doc.data().saveData) {
      setCloudSyncStatus('Cloud-Speicher: kein Cloud-Spielstand vorhanden – lokaler Stand wird hochgeladen');
      await saveGameToCloud(false);
      return;
    }

    const cloudSave      = doc.data().saveData;
    const cloudData      = cloudSave.data || 0;
    const cloudServerTs  = doc.data().updatedAt ? doc.data().updatedAt.toMillis() : 0;
    const localSaveRaw   = localStorage.getItem('datacenterIdleSave');
    const localSave      = localSaveRaw ? JSON.parse(localSaveRaw) : null;
    const localLastUpdate = localSave ? (localSave.lastUpdate || 0) : 0;
    const localData      = localSave ? (localSave.data || 0) : 0;

    const cloudIsNewer    = cloudServerTs > localLastUpdate;
    const cloudHasMoreData = cloudData > localData;
    const timestampEqual  = Math.abs(cloudServerTs - localLastUpdate) < 2000;

    let useCloud = false;
    if      (cloudIsNewer && cloudHasMoreData)  useCloud = true;
    else if (cloudIsNewer && !localSave)        useCloud = true;
    else if (timestampEqual && cloudHasMoreData) useCloud = true;
    else if (!localSave)                        useCloud = true;

    if (useCloud) {
      showSyncNotification();
      try {
        loadGame(cloudSave);
        setTimeout(() => {
          localStorage.setItem('datacenterIdleSave', JSON.stringify(getSerializableGameState()));
          try { renderBuildings(); } catch (e) { /* Tab nicht sichtbar */ }
          try { updateUI(); }       catch (e) { /* ignorieren */ }
          setCloudSyncStatus('Cloud-Speicher: Spielstand geladen ✓');
        }, 100);
      } catch (loadError) {
        console.error('Cloud Load Fehler:', loadError);
        setCloudSyncStatus('Cloud-Speicher: Fehler beim Laden', true);
      }
    } else {
      setCloudSyncStatus('Cloud-Speicher: lokaler Spielstand ist weiter – wird hochgeladen');
      await saveGameToCloud(true);
    }
  } catch (error) {
    console.error('Cloud Load Fehler:', error.code, error.message);
    setCloudSyncStatus('Cloud-Speicher: Fehler beim Laden', true);
  } finally {
    cloudLoadInProgress = false;
    cloudLoadCompleted  = true;
  }
}

// ---- Manueller Sync -----------------------------------------
async function syncCloudSaveNow() {
  if (!cloudAvailable)  { setCloudSyncStatus('Firebase nicht bereit', true); return; }
  if (!cloudUser)       { setCloudSyncStatus('Nicht angemeldet', true); return; }
  if (!firestoreDb)     { setCloudSyncStatus('Firestore nicht bereit', true); return; }
  game.lastUpdate = Date.now();
  localStorage.setItem('datacenterIdleSave', JSON.stringify(getSerializableGameState()));
  cloudSyncInProgress = false;
  await saveGameToCloud(true);
}

// ---- Google Sign-In / Sign-Out ------------------------------
async function signInWithGoogle() {
  if (!cloudAvailable || !firebaseAuth) {
    addDebugLog('❌ Firebase nicht verfügbar');
    setCloudSyncStatus('Cloud-Speicher: Firebase nicht konfiguriert', true);
    return;
  }
  try {
    addDebugLog('▶️ Google Sign-In gestartet...');
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      addDebugLog('📱 Versuche Popup-Fenster...');
      await firebaseAuth.signInWithPopup(provider);
      addDebugLog('✅ Popup Login erfolgreich!');
      setCloudSyncStatus('Cloud-Speicher: Google erfolgreich verbunden!');
    } catch (popupError) {
      if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/operation-not-supported-in-this-environment') {
        addDebugLog('⏳ Popup blockiert, nutze Redirect...');
        setCloudSyncStatus('Cloud-Speicher: Weitergeleitet zu Google...');
        await firebaseAuth.signInWithRedirect(provider);
      } else {
        throw popupError;
      }
    }
  } catch (error) {
    addDebugLog('❌ ' + error.code + ': ' + error.message);
    setCloudSyncStatus('Anmeldung fehlgeschlagen: ' + (error.code || error.message), true);
  }
}

async function signOutGoogle() {
  if (!firebaseAuth) return;
  try {
    await firebaseAuth.signOut();
  } catch (error) {
    setCloudSyncStatus('Google-Abmeldung fehlgeschlagen', true);
  }
}

// ---- Firebase initialisieren --------------------------------
function isFirebaseConfigured() {
  return FIREBASE_CONFIG.apiKey    !== 'YOUR_API_KEY' &&
         FIREBASE_CONFIG.projectId !== 'YOUR_PROJECT_ID' &&
         FIREBASE_CONFIG.appId     !== 'YOUR_APP_ID';
}

function initializeCloudSave() {
  if (!window.firebase) {
    setCloudSyncStatus('Cloud-Speicher: Firebase SDK nicht geladen', true);
    updateCloudUserUI();
    return;
  }
  if (!isFirebaseConfigured()) {
    setCloudSyncStatus('Cloud-Speicher: Firebase-Konfiguration fehlt');
    updateCloudUserUI();
    return;
  }

  firebaseApp    = firebase.initializeApp(FIREBASE_CONFIG);
  firebaseAuth   = firebase.auth();
  firestoreDb    = firebase.firestore();
  cloudAvailable = true;
  updateCloudUserUI();
  setCloudSyncStatus('Cloud-Speicher: bereit');
  addDebugLog('✅ Firebase initialisiert');

  addDebugLog('🔄 Prüfe Google Redirect...');
  firebaseAuth.getRedirectResult()
    .then((result) => {
      if (result.user) {
        addDebugLog('✅ Google Login erfolgreich: ' + result.user.email);
        setCloudSyncStatus('Cloud-Speicher: Google erfolgreich verbunden!');
        showDebugPanel();
      }
    })
    .catch((error) => {
      addDebugLog('⚠️ Redirect: ' + (error.code || 'unbekannt'));
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error('Redirect Result Fehler:', error.code, error.message);
      }
    });

  firebaseAuth.onAuthStateChanged(async (user) => {
    cloudUser = user;
    updateCloudUserUI();
    if (cloudUser) {
      setCloudSyncStatus('Cloud-Speicher: angemeldet');
      await loadGameFromCloud();
    } else {
      cloudLoadCompleted = true;
      setCloudSyncStatus('Cloud-Speicher: inaktiv (nur lokal)');
    }
  });
}
