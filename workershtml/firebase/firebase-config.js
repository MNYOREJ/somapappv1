(function () {
  if (typeof firebase === 'undefined') {
    throw new Error('Firebase SDK must be loaded before firebase-config.js');
  }

  // Paste your Firebase web config below and remove the placeholder values.
  const firebaseConfig = {
    apiKey: '',
    authDomain: '',
    databaseURL: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  };

  if (!firebaseConfig.apiKey) {
    console.warn('[SoMAp] Firebase config is empty. Please populate firebase-config.js.');
  }

  if (!firebase.apps.length && firebaseConfig.apiKey) {
    firebase.initializeApp(firebaseConfig);
  }

  window.somapFirebaseConfig = firebaseConfig;
})();


