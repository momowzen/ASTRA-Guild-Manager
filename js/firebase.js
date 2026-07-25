let db = null;

function initFirebase() {
  if (typeof firebase === "undefined" || typeof firebase.firestore === "undefined") {
    console.warn("Firebase SDK not loaded. Using local mock mode.");
    return false;
  }

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    const settings = { merge: true };
    db.settings(settings);
    return true;
  } catch (e) {
    console.error("Firebase init error:", e);
    return false;
  }
}

function getDb() {
  return db;
}

async function getCollection(collectionName) {
  if (db) {
    const snapshot = await db.collection(collectionName).get();
    const items = [];
    snapshot.forEach(doc => {
      items.push({ id: doc.id, ...doc.data() });
    });
    return items;
  }
  return getLocalCollection(collectionName);
}

async function getDocument(collectionName, docId) {
  if (db) {
    const doc = await db.collection(collectionName).doc(docId).get();
    if (doc.exists) {
      return { id: doc.id, ...doc.data() };
    }
    return null;
  }
  return getLocalDocument(collectionName, docId);
}

async function addDocument(collectionName, data) {
  if (db) {
    const docRef = await db.collection(collectionName).add(data);
    return { id: docRef.id, ...data };
  }
  return addLocalDocument(collectionName, data);
}

async function setDocument(collectionName, docId, data) {
  if (db) {
    await db.collection(collectionName).doc(docId).set(data, { merge: true });
    return { id: docId, ...data };
  }
  return setLocalDocument(collectionName, docId, data);
}

async function updateDocument(collectionName, docId, data) {
  if (db) {
    await db.collection(collectionName).doc(docId).update(data);
    return { id: docId, ...data };
  }
  return updateLocalDocument(collectionName, docId, data);
}

async function deleteDocument(collectionName, docId) {
  if (db) {
    await db.collection(collectionName).doc(docId).delete();
    return true;
  }
  return deleteLocalDocument(collectionName, docId);
}

async function queryCollection(collectionName, field, operator, value) {
  if (db) {
    const snapshot = await db.collection(collectionName).where(field, operator, value).get();
    const items = [];
    snapshot.forEach(doc => {
      items.push({ id: doc.id, ...doc.data() });
    });
    return items;
  }
  return getLocalCollection(collectionName);
}

const LOCAL_STORAGE_KEY = "astra_local_db";

function getLocalStore() {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  return data ? JSON.parse(data) : {};
}

function saveLocalStore(store) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
}

function getLocalCollection(collectionName) {
  const store = getLocalStore();
  return store[collectionName] || [];
}

function getLocalDocument(collectionName, docId) {
  const items = getLocalCollection(collectionName);
  return items.find(item => item.id === docId) || null;
}

function addLocalDocument(collectionName, data) {
  const store = getLocalStore();
  if (!store[collectionName]) store[collectionName] = [];
  const id = "local_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  const doc = { id, ...data };
  store[collectionName].push(doc);
  saveLocalStore(store);
  return doc;
}

function setLocalDocument(collectionName, docId, data) {
  const store = getLocalStore();
  if (!store[collectionName]) store[collectionName] = [];
  const idx = store[collectionName].findIndex(d => d.id === docId);
  const doc = { id: docId, ...data };
  if (idx >= 0) {
    store[collectionName][idx] = { ...store[collectionName][idx], ...doc };
  } else {
    store[collectionName].push(doc);
  }
  saveLocalStore(store);
  return doc;
}

function updateLocalDocument(collectionName, docId, data) {
  return setLocalDocument(collectionName, docId, data);
}

function deleteLocalDocument(collectionName, docId) {
  const store = getLocalStore();
  if (!store[collectionName]) return false;
  store[collectionName] = store[collectionName].filter(d => d.id !== docId);
  saveLocalStore(store);
  return true;
}
