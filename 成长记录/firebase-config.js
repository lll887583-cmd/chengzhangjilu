// Replace these placeholders with the Web app config from Firebase console.
// Safe to expose in frontend code; Firebase access control comes from Auth + Firestore rules.
export const firebaseConfig = {
  apiKey: 'AIzaSyAPV2POxcFYKzupoM9BHxoAPBH5iefsjcw',
  authDomain: 'growth-record-demo.firebaseapp.com',
  projectId: 'growth-record-demo',
  storageBucket: 'growth-record-demo.firebasestorage.app',
  messagingSenderId: '455304077163',
  appId: '1:455304077163:web:3d38c80dc050451841b62e',
  measurementId: 'G-FCDL3KN6WF'
};

export function isFirebaseConfigured() {
  return Object.values(firebaseConfig).every(value => typeof value === 'string' && value && !value.startsWith('REPLACE_WITH_'));
}
