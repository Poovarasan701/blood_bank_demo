// firebase-config.js
// ---------------------------------------------------------------
// SETUP (one-time, ~5 minutes):
// 1. Go to https://console.firebase.google.com and create a project
//    (the free "Spark" tier is enough for this app).
// 2. In your new project, click the "</>" (Web) icon to register a web app.
// 3. Firebase will show you a firebaseConfig object — copy those values
//    into the object below.
// 4. In the left sidebar go to Build -> Firestore Database -> Create database.
//    Choose "Start in test mode" so it works immediately (you can lock down
//    security rules later before going to production).
// ---------------------------------------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD1LtGI8jspzE_AZc2pZVTUGmwaJncKUJ8",
  authDomain: "bloodbank-2b6c5.firebaseapp.com",
  projectId: "bloodbank-2b6c5",
  storageBucket: "bloodbank-2b6c5.firebasestorage.app",
  messagingSenderId: "536710719652",
  appId: "1:536710719652:web:e3bbed7772c8d974c91e31"
};


export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);

// Anonymous auth: this gives every visitor a request.auth.uid without
// requiring a login screen, which is what the Firestore rules below check
// for (request.auth != null). ready resolves once a user is signed in, so
// other files can `await ready` before doing their first Firestore write.
export const ready = new Promise((resolve, reject) => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      resolve(user);
    } else {
      signInAnonymously(auth).catch((err) => {
        console.error("LifeFlow: anonymous sign-in failed:", err);
        reject(err);
      });
    }
  });
});

// Fails loudly and visibly instead of silently if the config above was
// never filled in — this is the #1 cause of "nothing happens on submit".
if (firebaseConfig.apiKey.startsWith("YOUR_") || firebaseConfig.projectId.startsWith("YOUR_")) {
  console.error(
    'LifeFlow: firebase-config.js still has placeholder values. ' +
    'Open firebase-config.js and paste in your real Firebase project config ' +
    '(Firebase console -> Project settings -> scroll to "Your apps").'
  );
}
