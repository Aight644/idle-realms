/**
 * Storage adapter — drop-in replacement for window.storage using Firestore.
 * 
 * API matches the artifact storage interface:
 *   storage.get(key, shared?)    → { key, value, shared } | throws
 *   storage.set(key, value, shared?) → { key, value, shared } | null
 *   storage.delete(key, shared?) → { key, deleted, shared } | null
 *   storage.list(prefix?, shared?) → { keys, prefix?, shared } | null
 * 
 * Personal data → Firestore doc: saves/{userId}/data/{key}
 * Shared data   → Firestore doc: shared/{key}
 */

import { db, auth } from './firebase.js';
import {
  doc, getDoc, setDoc, deleteDoc,
  collection, getDocs, query, where, orderBy
} from 'firebase/firestore';

// Firestore doc IDs can't contain / so we encode keys
const encodeKey = (k) => k.replace(/\//g, '__SLASH__');
const decodeKey = (k) => k.replace(/__SLASH__/g, '/');

const storage = {
  async get(key, shared = false) {
    const ref = shared
      ? doc(db, 'shared', encodeKey(key))
      : doc(db, 'saves', auth.currentUser?.uid || '_anon', 'data', encodeKey(key));
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error(`Key not found: ${key}`);
    return { key, value: snap.data().value, shared };
  },

  async set(key, value, shared = false) {
    try {
      const ref = shared
        ? doc(db, 'shared', encodeKey(key))
        : doc(db, 'saves', auth.currentUser?.uid || '_anon', 'data', encodeKey(key));
      await setDoc(ref, {
        value,
        key,
        updatedAt: Date.now(),
      });
      return { key, value, shared };
    } catch (e) {
      console.error('storage.set error:', e);
      return null;
    }
  },

  async delete(key, shared = false) {
    try {
      const ref = shared
        ? doc(db, 'shared', encodeKey(key))
        : doc(db, 'saves', auth.currentUser?.uid || '_anon', 'data', encodeKey(key));
      await deleteDoc(ref);
      return { key, deleted: true, shared };
    } catch (e) {
      console.error('storage.delete error:', e);
      return null;
    }
  },

  async list(prefix = '', shared = false) {
    try {
      const colRef = shared
        ? collection(db, 'shared')
        : collection(db, 'saves', auth.currentUser?.uid || '_anon', 'data');
      const snap = await getDocs(colRef);
      const keys = [];
      snap.forEach(d => {
        const k = d.data().key || decodeKey(d.id);
        if (!prefix || k.startsWith(prefix)) keys.push(k);
      });
      return { keys, prefix, shared };
    } catch (e) {
      console.error('storage.list error:', e);
      return { keys: [], prefix, shared };
    }
  }
};

// Install globally so the game code can use window.storage
window.storage = storage;

export default storage;
