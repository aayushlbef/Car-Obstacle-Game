const leaderboardScreen = document.getElementById('leaderboard-screen');
const leaderboardList = document.getElementById('leaderboard-list');
const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');
const leaderboardBtns = [
    document.getElementById('leaderboard-btn'),
    document.getElementById('leaderboard-btn-over')
];

// Open Leaderboard
leaderboardBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        leaderboardScreen.classList.remove('hidden');
        fetchLeaderboard();
    });
});

// Close Leaderboard
closeLeaderboardBtn.addEventListener('click', () => {
    leaderboardScreen.classList.add('hidden');
});

async function fetchLeaderboard() {
    if (!db) return;

    leaderboardList.innerHTML = `
        <div class="leaderboard-row header">
            <span>#</span>
            <span>Racer</span>
            <span>Score</span>
        </div>
        <div style="padding:10px; text-align:center;">Loading...</div>
    `;

    try {
        const snapshot = await db.collection('users')
            .orderBy('highestScore', 'desc')
            .limit(10)
            .get();

        // Clear Loading
        leaderboardList.innerHTML = `
            <div class="leaderboard-row header">
                <span>#</span>
                <span>Racer</span>
                <span>Score</span>
            </div>
        `;

        let rank = 1;
        snapshot.forEach(doc => {
            const data = doc.data();
            const row = document.createElement('div');
            row.classList.add('leaderboard-row');

            // Highlight me
            if (currentUser && currentUser.uid === doc.id) {
                row.classList.add('me');
            }

            row.innerHTML = `
                <span>${rank++}</span>
                <span>${data.username || 'Unknown'}</span>
                <span>${data.highestScore || 0}</span>
            `;
            leaderboardList.appendChild(row);
        });

        if (snapshot.empty) {
            leaderboardList.innerHTML += '<div style="padding:10px; text-align:center;">No scores yet.</div>';
        }

    } catch (err) {
        console.error("Leaderboard Error:", err);
        leaderboardList.innerHTML += '<div style="padding:10px; color:red;">Error loading scores. Check config.</div>';
    }
}
