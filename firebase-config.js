// REMEMBER: Replace the following config with your own from the Firebase Console!
// 1. Go to https://console.firebase.google.com/
// 2. Create a project
// 3. Register a web app
// 4. Copy the "firebaseConfig" object and paste it below.

const firebaseConfig = {
    apiKey: "AIzaSyDxVZ2UkTfRQ5wMfjCkoxA0LrxMjKYbU6Y",
    authDomain: "car-obstacle-game.firebaseapp.com",
    projectId: "car-obstacle-game",
    storageBucket: "car-obstacle-game.firebasestorage.app",
    messagingSenderId: "301943444812",
    appId: "1:301943444812:web:c2b0a917faa33c3ed9ebe9"
};

// Initialize Firebase
let app, auth, db;

// We check if firebase is loaded (it will be loaded via CDN in index.html)
if (typeof firebase !== 'undefined') {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
} else {
    console.error("Firebase SDK not loaded. Check index.html");
}
