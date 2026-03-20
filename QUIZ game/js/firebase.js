/**
 * Firebase Realtime Database — Multiplayer sync layer
 *
 * SETUP: Replace the firebaseConfig below with your own Firebase project config.
 * 1. Go to https://console.firebase.google.com
 * 2. Create a project → Add a Web app → Copy config
 * 3. Enable Realtime Database (test mode for dev)
 */
const FirebaseSync = (() => {
  // ⚠️ Replace with your Firebase config
  const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "000000000000",
    appId: "YOUR_APP_ID"
  };

  let db = null;
  let isConnected = false;

  function init() {
    try {
      if (typeof firebase === 'undefined') {
        console.warn('Firebase SDK not loaded — running in offline/local mode');
        return false;
      }
      if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
      db = firebase.database();
      isConnected = true;
      return true;
    } catch (e) {
      console.warn('Firebase init failed — running in offline mode:', e.message);
      return false;
    }
  }

  function roomRef(roomId) {
    return db ? db.ref('rooms/' + roomId) : null;
  }

  // Push full room state to Firebase
  function syncRoom(room) {
    if (!db) return;
    const data = { ...room };
    delete data._localPlayerId;
    roomRef(room.id).set(data);
  }

  // Listen for room changes
  function onRoomUpdate(roomId, callback) {
    if (!db) return () => {};
    const ref = roomRef(roomId);
    ref.on('value', snap => {
      const data = snap.val();
      if (data) callback(data);
    });
    return () => ref.off('value');
  }

  // Find a random open room
  async function findOpenRoom(gameType) {
    if (!db) return null;
    const snap = await db.ref('rooms')
      .orderByChild('status').equalTo('waiting')
      .limitToFirst(10).once('value');
    const rooms = snap.val();
    if (!rooms) return null;

    for (const [id, room] of Object.entries(rooms)) {
      if (room.gameType === gameType && Object.keys(room.players || {}).length < GameManager.MAX_PLAYERS) {
        return { id, ...room };
      }
    }
    return null;
  }

  // Clean up on disconnect
  function onDisconnect(roomId, playerId) {
    if (!db) return;
    roomRef(roomId).child('players/' + playerId + '/connected').onDisconnect().set(false);
  }

  // Remove room
  function deleteRoom(roomId) {
    if (!db) return;
    roomRef(roomId).remove();
  }

  return { init, syncRoom, onRoomUpdate, findOpenRoom, onDisconnect, deleteRoom, get isConnected() { return isConnected; } };
})();
