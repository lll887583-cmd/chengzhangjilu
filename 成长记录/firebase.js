import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js';
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';
import { DEMO_ACCOUNTS } from './data.js';
import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';
import { exportPersistedState, hydrateStateForUser, loadCachedUserState } from './store.js';

let appInstance = null;
let authInstance = null;
let dbInstance = null;

function ensureFirebase() {
  if (!isFirebaseConfigured()) {
    throw new Error('missing-config');
  }
  if (!appInstance) {
    appInstance = initializeApp(firebaseConfig);
    authInstance = getAuth(appInstance);
    dbInstance = getFirestore(appInstance);
  }
  return { auth: authInstance, db: dbInstance };
}

function accountByName(account) {
  return DEMO_ACCOUNTS.find(item => item.account === account) || null;
}

function profileFromAccountDoc(accountDoc, authUser) {
  return {
    id: authUser.uid,
    uid: authUser.uid,
    account: accountDoc.account,
    displayName: accountDoc.displayName,
    role: accountDoc.role,
    roleLabel: accountDoc.roleLabel
  };
}

export function firebaseReady() {
  return isFirebaseConfigured();
}

export function getFirebaseSetupMessage() {
  return '请先在 firebase-config.js 填入 Firebase Web App 配置，再使用 s / st 登录。';
}

export function observeSession(callback) {
  if (!isFirebaseConfigured()) {
    callback(null);
    return () => {};
  }
  const { auth } = ensureFirebase();
  return onAuthStateChanged(auth, async authUser => {
    if (!authUser) {
      callback(null);
      return;
    }

    const matchedAccount = DEMO_ACCOUNTS.find(item => item.authEmail === authUser.email) || null;
    if (!matchedAccount) {
      await signOut(auth);
      callback(null);
      return;
    }

    callback({
      authUser,
      profile: profileFromAccountDoc(matchedAccount, authUser)
    });
  });
}

export async function signInDemoAccount(account, password) {
  const matchedAccount = accountByName(account);
  if (!matchedAccount || matchedAccount.password !== password) {
    throw new Error('invalid-credentials');
  }
  const { auth } = ensureFirebase();
  return signInWithEmailAndPassword(auth, matchedAccount.authEmail, password);
}

export async function signOutSession() {
  if (!isFirebaseConfigured()) return;
  const { auth } = ensureFirebase();
  await signOut(auth);
}

export async function loadUserCloudState(profile) {
  const { db } = ensureFirebase();
  const userRef = doc(db, 'users', profile.uid);
  const snapshot = await getDoc(userRef);
  if (!snapshot.exists()) {
    const cachedState = loadCachedUserState(profile.account);
    const seededState = hydrateStateForUser(profile, cachedState);
    await setDoc(userRef, {
      account: profile.account,
      displayName: profile.displayName,
      role: profile.role,
      roleLabel: profile.roleLabel,
      state: exportPersistedState(seededState),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return seededState;
  }

  const data = snapshot.data();
  return hydrateStateForUser(profile, data.state || null);
}

export async function saveUserCloudState(state) {
  if (!state.currentUser || !isFirebaseConfigured()) return;
  const { db } = ensureFirebase();
  const userRef = doc(db, 'users', state.currentUser.uid);
  await setDoc(userRef, {
    account: state.currentUser.account,
    displayName: state.currentUser.displayName,
    role: state.currentUser.role,
    roleLabel: state.currentUser.roleLabel,
    state: exportPersistedState(state),
    updatedAt: serverTimestamp()
  }, { merge: true });
}
