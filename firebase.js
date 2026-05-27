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

function mapAuthError(error) {
  const code = error?.code || error?.message || '';
  const messages = {
    'auth/network-request-failed': '网络连接失败，先检查手机网络或关闭内容拦截后再试。',
    'auth/too-many-requests': '尝试次数太多了，请过几分钟再试。',
    'auth/invalid-credential': '账号或密码不对，请重新输入。',
    'auth/invalid-login-credentials': '账号或密码不对，请重新输入。',
    'auth/user-not-found': '这个账号还没有在 Firebase 里创建。',
    'auth/user-disabled': '这个账号已被停用。',
    'auth/invalid-api-key': 'Firebase 配置无效，请检查站点配置。',
    'auth/app-deleted': 'Firebase 应用初始化失败，请刷新页面重试。',
    'auth/operation-not-allowed': 'Firebase 还没开启邮箱密码登录。',
    'auth/invalid-email': '账号映射的邮箱格式不正确。'
  };
  return messages[code] || '登录失败，请稍后再试。';
}

export function getAuthErrorMessage(error) {
  return mapAuthError(error);
}

export async function signInDemoAccount(account, password) {
  const matchedAccount = accountByName(account);
  if (!matchedAccount || matchedAccount.password !== password) {
    const error = new Error('invalid-credentials');
    error.code = 'auth/invalid-credential';
    throw error;
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
