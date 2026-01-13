// Auth Logic
const userIcon = document.getElementById('user-icon');
const usernameModal = document.getElementById('username-modal');
const usernameInput = document.getElementById('username-input');
const saveUsernameBtn = document.getElementById('save-username-btn');
const usernameError = document.getElementById('username-error');

let currentUser = null; // { uid, username, highestScore, photoURL }

// 1. Auth State Listener
if (auth) {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // User is signed in.
            console.log("User signed in:", user.uid);

            // Check if user has a profile in Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();

            if (userDoc.exists) {
                // Load Profile
                currentUser = userDoc.data();
                updateUserIcon(currentUser.avatarUrl || user.photoURL);
            } else {
                // New User -> Show Username Modal
                usernameModal.classList.remove('hidden');
                // Temporarily store basic info
                currentUser = {
                    uid: user.uid,
                    email: user.email,
                    avatarUrl: user.photoURL,
                    highestScore: 0
                };
            }
        } else {
            // User is signed out.
            currentUser = null;
            userIcon.innerHTML = '👤';
            console.log("User signed out");
        }
    });
}

// 2. Login Trigger
userIcon.addEventListener('click', () => {
    if (!auth) return alert("Firebase not configured!");

    if (currentUser && currentUser.username) {
        // Already logged in -> Show Profile or Logout?
        // Simple: Logout on click for now (or toggle menu)
        const logout = confirm(`Logged in as ${currentUser.username}. Logout?`);
        if (logout) auth.signOut();
    } else {
        // Not logged in -> Google Popup
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch((error) => {
            console.error("Login Error:", error);
            alert("Login Failed: " + error.message);
        });
    }
});

// 3. Save Username Logic
saveUsernameBtn.addEventListener('click', async () => {
    const newName = usernameInput.value.trim();
    if (newName.length < 3) return usernameError.innerText = "Too short!";

    // Check uniqueness
    const check = await db.collection('usernames').doc(newName).get();
    if (check.exists) {
        usernameError.innerText = "Username taken!";
        return;
    }

    // Transactions: Save Username Mapping AND User Profile
    const batch = db.batch();

    const userRef = db.collection('users').doc(currentUser.uid);
    const usernameRef = db.collection('usernames').doc(newName);

    currentUser.username = newName;

    batch.set(userRef, currentUser);
    batch.set(usernameRef, { uid: currentUser.uid });

    await batch.commit();

    usernameModal.classList.add('hidden');
    updateUserIcon(currentUser.avatarUrl);
    alert("Welcome " + newName + "!");
});

function updateUserIcon(url) {
    if (url) {
        userIcon.innerHTML = `<img src="${url}" alt="User">`;
    } else {
        userIcon.innerHTML = '👤';
    }
}

// 4. Score Saving (Exported function to be used by script.js)
async function saveHighScore(score) {
    if (!currentUser || !currentUser.username) return; // Not logged in

    if (score > (currentUser.highestScore || 0)) {
        console.log("New High Score!", score);
        currentUser.highestScore = score;

        // Update Firestore
        await db.collection('users').doc(currentUser.uid).update({
            highestScore: score
        });
    }
}
