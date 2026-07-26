let db = null;

function initFirebase() {
  if (typeof firebase === "undefined" || typeof firebase.firestore === "undefined") {
    console.warn("Firebase SDK not loaded.");
    return false;
  }

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    const settings = { merge: true };
    db.settings(settings);
    localStorage.removeItem("astra_local_db");
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
  if (!db) return [];
  const snapshot = await db.collection(collectionName).get();
  const items = [];
  snapshot.forEach(doc => {
    items.push({ id: doc.id, ...doc.data() });
  });
  return items;
}

async function getDocument(collectionName, docId) {
  if (!db) return null;
  const doc = await db.collection(collectionName).doc(docId).get();
  if (doc.exists) {
    return { id: doc.id, ...doc.data() };
  }
  return null;
}

async function addDocument(collectionName, data) {
  if (!db) throw new Error("Firebase not initialized");
  const docRef = await db.collection(collectionName).add(data);
  return { id: docRef.id, ...data };
}

async function setDocument(collectionName, docId, data) {
  if (!db) throw new Error("Firebase not initialized");
  await db.collection(collectionName).doc(docId).set(data, { merge: true });
  return { id: docId, ...data };
}

async function updateDocument(collectionName, docId, data) {
  if (!db) throw new Error("Firebase not initialized");
  await db.collection(collectionName).doc(docId).update(data);
  return { id: docId, ...data };
}

async function deleteDocument(collectionName, docId) {
  if (!db) return false;
  await db.collection(collectionName).doc(docId).delete();
  return true;
}

async function queryCollection(collectionName, field, operator, value) {
  if (!db) return [];
  const snapshot = await db.collection(collectionName).where(field, operator, value).get();
  const items = [];
  snapshot.forEach(doc => {
    items.push({ id: doc.id, ...doc.data() });
  });
  return items;
}
