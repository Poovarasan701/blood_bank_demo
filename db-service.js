// db-service.js
// Firestore-backed data layer for LifeFlow. Replaces the old
// localStorage getStored/setStored approach with a real, shared,
// multi-device database. app.js (public site) and admin.js
// (admin dashboard) both import from this file.
import { db, ready } from './firebase-config.js';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Used only ONCE, to populate a brand-new empty database with some
// starter data so the app isn't blank on first run.
const defaultInventory = [
  { type: 'A+', units: 28, max: 50 },
  { type: 'A-', units: 14, max: 30 },
  { type: 'B+', units: 32, max: 50 },
  { type: 'B-', units: 6, max: 30 },
  { type: 'AB+', units: 21, max: 40 },
  { type: 'AB-', units: 3, max: 20 },
  { type: 'O+', units: 45, max: 60 },
  { type: 'O-', units: 5, max: 30 }
];
const defaultDonors = [
  { id: 1, name: 'Alice Smith', blood: 'O-', phone: '+1 555-0102', location: 'New York', age: 29, lastDonated: '3', mapX: 45, mapY: 35 },
  { id: 2, name: 'Marcus Brody', blood: 'A+', phone: '+1 555-0144', location: 'Boston', age: 34, lastDonated: 'never', mapX: 70, mapY: 55 },
  { id: 3, name: 'Sophia Chen', blood: 'B+', phone: '+1 555-0167', location: 'New York', age: 26, lastDonated: '3', mapX: 30, mapY: 70 },
  { id: 4, name: 'John Miller', blood: 'AB-', phone: '+1 555-0199', location: 'San Francisco', age: 41, lastDonated: 'never', mapX: 20, mapY: 25 },
  { id: 5, name: 'Elena Rostova', blood: 'O+', phone: '+1 555-0112', location: 'Boston', age: 31, lastDonated: '3', mapX: 85, mapY: 40 },
  { id: 6, name: 'David Kim', blood: 'B-', phone: '+1 555-0125', location: 'San Francisco', age: 28, lastDonated: 'never', mapX: 55, mapY: 80 }
];
const defaultRequests = [
  { id: 101, patient: 'Robert Downey', blood: 'O-', hospital: 'Mount Sinai Hospital, NY', contact: '+1 555-8822', units: 3, urgency: 'Critical', notes: 'Emergency cardiac bypass surgery.' },
  { id: 102, patient: 'Emma Watson', blood: 'B-', hospital: "St. Mary's Hospital, London", contact: '+1 555-7766', units: 2, urgency: 'High', notes: 'Severe anemia transfusion needed.' }
];

// Seeds each collection ONLY if it is completely empty, so this is safe
// to call every time the app loads without ever clobbering real data.
export async function seedIfEmpty() {
  try {
    await ready; // wait for anonymous sign-in — rules require request.auth != null
    const invSnap = await getDocs(collection(db, 'inventory'));
    if (invSnap.empty) {
      await Promise.all(defaultInventory.map(item => setDoc(doc(db, 'inventory', item.type), item)));
    }
    const donorsSnap = await getDocs(collection(db, 'donors'));
    if (donorsSnap.empty) {
      await Promise.all(defaultDonors.map(d => setDoc(doc(db, 'donors', String(d.id)), d)));
    }
    const reqSnap = await getDocs(collection(db, 'requests'));
    if (reqSnap.empty) {
      await Promise.all(defaultRequests.map(r => setDoc(doc(db, 'requests', String(r.id)), r)));
    }
  } catch (err) {
    console.error('LifeFlow: seeding starter data failed', err);
  }
}

// Real-time subscriptions. cb(items) fires immediately with current data,
// then again every time the data changes in Firestore — from ANY browser
// or device, not just other tabs on the same machine. Each waits for
// anonymous sign-in to finish before attaching the listener, since the
// Firestore rules require request.auth != null.
export async function subscribeInventory(cb) {
  await ready;
  return onSnapshot(collection(db, 'inventory'), snap => cb(snap.docs.map(d => d.data())),
    err => console.error('LifeFlow: inventory sync error', err));
}
export async function subscribeDonors(cb) {
  await ready;
  return onSnapshot(collection(db, 'donors'), snap => cb(snap.docs.map(d => d.data())),
    err => console.error('LifeFlow: donors sync error', err));
}
export async function subscribeRequests(cb) {
  await ready;
  return onSnapshot(collection(db, 'requests'), snap => cb(snap.docs.map(d => d.data())),
    err => console.error('LifeFlow: requests sync error', err));
}

// Writes
export async function addDonor(donor) {
  await ready;
  await setDoc(doc(db, 'donors', String(donor.id)), donor);
}
export async function updateDonor(id, fields) {
  await ready;
  await updateDoc(doc(db, 'donors', String(id)), fields);
}
export async function addRequest(request) {
  await ready;
  await setDoc(doc(db, 'requests', String(request.id)), request);
}
export async function deleteRequest(id) {
  await ready;
  await deleteDoc(doc(db, 'requests', String(id)));
}
export async function setInventoryUnits(type, units) {
  await ready;
  await updateDoc(doc(db, 'inventory', type), { units });
}
