/**
 * Database service for Dream Journal using IndexedDB
 * Persists voice audio recordings and dream metadata locally on the user's phone.
 */

const DB_NAME = 'DreamJournalDB';
const DB_VERSION = 1;
const STORE_NAME = 'dreams';

let dbPromise = null;

export function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('mood', 'mood', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };
  });

  return dbPromise;
}

/**
 * Request persistent storage from browser so OS doesn't prune audio data
 */
export async function requestStoragePersistence() {
  if (navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      console.log(`Persistent storage granted: ${isPersisted}`);
      return isPersisted;
    } catch (err) {
      console.warn('Storage persist request failed:', err);
    }
  }
  return false;
}

export async function checkStoragePersistence() {
  if (navigator.storage && navigator.storage.persisted) {
    try {
      return await navigator.storage.persisted();
    } catch (e) {
      return false;
    }
  }
  return false;
}

/**
 * Get estimated storage usage and quota
 */
export async function getStorageStats() {
  let usageBytes = 0;
  let quotaBytes = 0;
  let isPersisted = false;

  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      usageBytes = estimate.usage || 0;
      quotaBytes = estimate.quota || 0;
    } catch (e) {
      console.warn('Storage estimate failed:', e);
    }
  }

  isPersisted = await checkStoragePersistence();

  const dreams = await getAllDreams();
  const totalAudioBytes = dreams.reduce((acc, d) => {
    return acc + (d.audioBlob ? d.audioBlob.size || 0 : 0);
  }, 0);

  return {
    totalDreams: dreams.length,
    totalAudioBytes,
    usageBytes,
    quotaBytes,
    isPersisted
  };
}

/**
 * Save a new dream entry
 */
export async function saveDream(dream) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const record = {
      id: dream.id || `dream_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: dream.title || 'Untitled Dream',
      createdAt: dream.createdAt || Date.now(),
      duration: dream.duration || 0,
      audioBlob: dream.audioBlob, // Stored directly as Blob in IndexedDB
      mimeType: dream.mimeType || 'audio/webm',
      mood: dream.mood || 'mystical',
      tags: Array.isArray(dream.tags) ? dream.tags : [],
      notes: dream.notes || '',
      transcript: dream.transcript || null,
      imageUrl: dream.imageUrl || null
    };

    const req = store.put(record);

    req.onsuccess = () => resolve(record);
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Get all dreams sorted newest to oldest
 */
export async function getAllDreams() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('createdAt');
    const request = index.openCursor(null, 'prev'); // Descending order
    const dreams = [];

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        dreams.push(cursor.value);
        cursor.continue();
      } else {
        resolve(dreams);
      }
    };

    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Get a specific dream by ID
 */
export async function getDream(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);

    req.onsuccess = () => resolve(req.result || null);
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Update specific fields on an existing dream
 */
export async function updateDream(id, updates) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const existing = getReq.result;
      if (!existing) {
        reject(new Error(`Dream with ID ${id} not found`));
        return;
      }
      const updatedRecord = { ...existing, ...updates };
      const putReq = store.put(updatedRecord);
      putReq.onsuccess = () => resolve(updatedRecord);
      putReq.onerror = (e) => reject(e.target.error);
    };

    getReq.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Delete a dream entry by ID
 */
export async function deleteDream(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);

    req.onsuccess = () => resolve(true);
    req.onerror = (e) => reject(e.target.error);
  });
}
