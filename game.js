// Avoid importing Firebase at top-level to prevent module load failures (file:// or CORS issues).
function init() {
    let time = 10;
let maxtime = 10;

let point = 0;

let highestPoint = Number(localStorage.getItem("highestPoint")) || 0;

document.getElementById("bestScoreDisplay").textContent = "Highest Score: " + highestPoint;

let currentNumber = "";

let digitLength = 1;

let countForDigit = 0; // how many times current digit length has been asked

let timer;



const timeDisplay = document.getElementById("timeDisplay");

const pointDisplay = document.getElementById("pointDisplay");

const randomNumberBox = document.getElementById("randomNumber");

const userInput = document.getElementById("userInput");

const gameContainer = document.getElementById("gameContainer");
const leaderboardContainer = document.getElementById("leaderboardContainer");
    // leaderboard UI elements
    const playerNameInput = document.getElementById('playerName');
    const submitScoreBtn = document.getElementById('submitScoreBtn');
    const refreshBoardBtn = document.getElementById('refreshBoardBtn');
    const leaderboardDiv = document.getElementById('leaderboard');

    console.log('Game init running');

document.getElementById("startBtn").onclick = startGame;

document.getElementById("submitBtn").onclick = checkInput;

userInput.addEventListener("keypress", (e) => { if (e.key === "Enter") checkInput(); });

function startGame() {

    document.getElementById("startBtn").style.display = "none";

    gameContainer.style.display = "block";
    leaderboardContainer.style.display = "none";

    startTimer();

    newNumber();

}

function resetGame() {
    clearInterval(timer);
    notify("Game Over! Your final score: " + point, "error");

    // değerleri sıfırla
    time = 10;
    point = 0;
    digitLength = 1;
    countForDigit = 0;

    // ekranları düzenle
    gameContainer.style.display = "none";
        leaderboardContainer.style.display ="block";
    document.getElementById("startBtn").style.display = "inline-block";

    // göstergeleri sıfırla
    timeDisplay.textContent = "Time: 10";
    pointDisplay.textContent = "Point: 0";

    randomNumberBox.textContent = "";
    userInput.value = "";

    // after reset, refresh leaderboard so player can submit or view
    try { fetchTopScores(); } catch (e) { /* ignore */ }
}


function startTimer() {

    timer = setInterval(() => {
      time -= 0.1;
      time = Math.round(time * 100) / 100;

        updateTime();

        if (time <= 0) {

          resetGame();

        }

    }, 100);

}

function updateTime() {



    if (time > maxtime) {
        time = maxtime;
    }

    timeDisplay.textContent = "Time: " + time;

}

function updatePoint() {
    pointDisplay.textContent = "Points: " + point;

    if (point > highestPoint) {
        highestPoint = point;
        localStorage.setItem("highestPoint", highestPoint);
        document.getElementById("bestScoreDisplay").textContent = "Highest Score: " + highestPoint;
    }

    if (point < 0) {

          resetGame();

    } 
}

function randomDigits(n) {

    let min = Math.pow(10, n - 1);

    let max = Math.pow(10, n) - 1;

    return Math.floor(Math.random() * (max - min + 1)) + min;

}

function newNumber() {

    currentNumber = randomDigits(digitLength).toString();

    randomNumberBox.textContent = currentNumber;

    userInput.value = "";

    userInput.focus();

}

function checkInput() {

    const value = userInput.value.trim();

    if (value === currentNumber) {

        point += digitLength; 
        time += digitLength;
        countForDigit++;

        notify("Attendance given!", "success");
    } else {

        point -= digitLength; 

         if (point > 0) {

        notify("Couldn't give the attendance.", "error");

         } 
     
    }
  

    updateTime();
    updatePoint();
    // move to next difficulty every 5 numbers

  

    if (countForDigit === 5) {

        digitLength++;
        maxtime += digitLength;
        countForDigit = 0;

    }

    newNumber();

}

// --- Leaderboard functions using Firestore (dynamically imported) ---
function generatePlayerID() {
    const part1 = Math.random().toString(36).substring(2, 5).toUpperCase();
    const part2 = Math.random().toString(36).substring(2, 5).toUpperCase();
    const numbers = Math.floor(100 + Math.random() * 900); // 100–999

    return `#${part1}-${numbers}-${part2}`;
}


async function submitScore(name, score) {
    // validate that name is exactly 9 digits (user-supplied ID)
    if (!name) name = '';
    const idStr = String(name).trim();
    if (!/^\d{9}$/.test(idStr)) {
        notify('Student ID must be exactly 9 digits (0-9).', 'warn');
        return;
    }
    name = idStr; // normalize
    // ensure a persistent player uid so we can check / remove prior submits
    let uid = localStorage.getItem('player_uid');
    if (!uid) {
        uid = generatePlayerID();
        notify('Generated new player ID: ' + uid, 'warn');
        localStorage.setItem('player_uid', uid);
    }

    try {
        const mod = await import('./firebaseinit.js');
        const { db, collection, addDoc, getDocs, query, where, deleteDoc, doc } = mod;

        // find previous submissions by this uid
        const qPrev = query(collection(db, 'leaderboard'), where('uid', '==', uid));
        const prevSnap = await getDocs(qPrev);

        // determine previous highest score for this uid (if any)
        let prevHighest = null;
        prevSnap.forEach(d => {
            const dat = d.data();
            if (prevHighest === null || (dat && typeof dat.score === 'number' && dat.score > prevHighest)) prevHighest = dat.score;
        });

        if (prevHighest !== null && score < prevHighest) {
            notify('Submit blocked — your new score is not higher than your previous submission (' + prevHighest + ').', 'warn');
            return;
        }

        // delete all previous submissions for this uid
        // Also remove any legacy documents where the generated UID was appended to the name
        const idsToDelete = new Set(prevSnap.docs.map(d => d.id));

        try {
            const allSnap = await getDocs(collection(db, 'leaderboard'));
            allSnap.forEach(d => {
                const dat = d.data();
                if (!idsToDelete.has(d.id)) {
                    if (dat && dat.name && typeof dat.name === 'string' && dat.name.includes(uid)) {
                        idsToDelete.add(d.id);
                    }
                }
            });
        } catch (errAll) {
            // if fetching all docs fails, continue with deleting the ones we know
            console.warn('Could not fetch all leaderboard docs to search legacy names', errAll);
        }

        for (const id of idsToDelete) {
            try {
                await deleteDoc(doc(db, 'leaderboard', id));
            } catch (delErr) {
                console.warn('Failed to delete previous leaderboard doc', id, delErr);
            }
        }

        // submit new score document with uid and numeric player ID as name
        await addDoc(collection(db, 'leaderboard'), {
            uid: uid,
            name: name,
            score: score,
            ts: Date.now()
        });

        notify('Score submitted!', 'success');
        await fetchTopScores();
    } catch (err) {
        console.error('Failed to submit score', err);
        notify('Failed to submit score. See console.', 'error');
    }
}

async function fetchTopScores() {
    if (!leaderboardDiv) return;
    leaderboardDiv.textContent = 'Loading...';
    try {
    const mod = await import('./firebaseinit.js');
    const { db, collection, getDocs, query, orderBy, limit } = mod;
    const q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(5));
    const snap = await getDocs(q);
        if (snap.empty) {
            leaderboardDiv.innerHTML = '<div>No scores yet</div>';
            return;
        }
        let html = '<ol style="text-align:left; margin:0; padding-left:18px;">';
        snap.forEach(docSnap => {
            const d = docSnap.data();
            html += `<li>${escapeHtml(d.name||'Anonymous')} — ${d.score}</li>`;
        });
        html += '</ol>';
        leaderboardDiv.innerHTML = html;
    } catch (err) {
        console.error('Failed to fetch leaderboard', err);
        leaderboardDiv.textContent = 'Error loading leaderboard';
    }
}

// small helper to avoid HTML injection in leaderboard names
function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]; });
}

// wire leaderboard buttons
if (submitScoreBtn) submitScoreBtn.addEventListener('click', () => {
    const name = playerNameInput ? playerNameInput.value.trim() : 'Anonymous';
    submitScore(name, highestPoint);
});
if (refreshBoardBtn) refreshBoardBtn.addEventListener('click', fetchTopScores);

// initial leaderboard load
try { fetchTopScores(); } catch (e) { /* ignore */ }


function notify(message, type = "success") {
    const colors = {
        success: "#28a745",
        warn: "#ffc107",
        error: "#dc3545"
    };

    const box = document.createElement("div");
    box.className = "notifyBox";
    box.style.background = colors[type] || colors.success;
    box.textContent = message;

    document.getElementById("notifyContainer").appendChild(box);

    // 3.2 saniye sonra DOM'dan sil
    setTimeout(() => {
        box.remove();
    }, 3200);
}

}

// run init now if DOM is ready, otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}



