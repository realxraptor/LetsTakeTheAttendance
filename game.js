// Avoid importing Firebase at top-level to prevent module load failures (file:// or CORS issues).
function init() {
    let time = 10;
let maxtime = 10;

let point = 0;

let highestPoint = Number(localStorage.getItem("highestPoint")) || 0;

document.getElementById("bestScoreDisplay").textContent = "Your Highest Score: " + highestPoint;

let currentNumber = "";

let digitLength = 1;

let countForDigit = 0; // how many times current digit length has been asked

let timer;

let countSpeed = 100; // initial timer speed in ms

const timeDisplay = document.getElementById("timeDisplay");

const pointDisplay = document.getElementById("pointDisplay");

const randomNumberBox = document.getElementById("randomNumber");

const userInput = document.getElementById("userInput");

const gameContainer = document.getElementById("gameContainer");
const leaderboardContainer = document.getElementById("leaderboardContainer");
    // leaderboard / auth UI elements
    const playerNameInput = document.getElementById('playerName'); // 9-digit input for sign-up
    const signUpBtn = document.getElementById('signUpBtn');
    const generatedUidDisplay = document.querySelectorAll('.generatedUidDisplay');
    const loginUidInput = document.getElementById('loginUidInput');
    const loginBtn = document.getElementById('loginBtn');
    const submitScoreBtn = document.getElementById('submitScoreBtn');
    const refreshBoardBtn = document.getElementById('refreshBoardBtn');
    const leaderboardDiv = document.getElementById('leaderboard');
    const saveAsInput = document.getElementById('saveAsInput');
    const saveAsBtn = document.getElementById('saveAsBtn');

    // Tab elements (Sign / Login / Leaderboard)
    const tabSign = document.getElementById('tabSign');
    const tabLogin = document.getElementById('tabLogin');
    const tabBoard = document.getElementById('tabBoard');
    const panelSign = document.getElementById('panelSign');
    const panelLogin = document.getElementById('panelLogin');
    const panelBoard = document.getElementById('panelBoard');

    function activateTab(btn) {
        [tabSign, tabLogin, tabBoard].forEach(b => { if (b) b.classList.remove('active'); });
        if (btn) btn.classList.add('active');
    }

    // Simple device detection: Phone vs Computer
    function detectDeviceLabel() {
        const ua = navigator.userAgent || '';
        const isMobile = /Mobi|Android|iPhone|iPad|Tablet/i.test(ua);
        return isMobile ? 'Phone' : 'Computer';
    }

    function showPanel(panel) {
        [panelSign, panelLogin, panelBoard].forEach(p => { if (p) p.style.display = 'none'; });
        if (panel) panel.style.display = 'block';
    }

    // wire tab clicks
    if (tabSign) tabSign.addEventListener('click', () => { activateTab(tabSign); showPanel(panelSign); });
    if (tabLogin) tabLogin.addEventListener('click', () => { activateTab(tabLogin); showPanel(panelLogin); });
    if (tabBoard) tabBoard.addEventListener('click', () => { activateTab(tabBoard); showPanel(panelBoard); });

    // default view: leaderboard
    activateTab(tabBoard);
    showPanel(panelBoard);

    // Save As: change 9-digit player ID for all docs with current UID
    if (saveAsBtn) saveAsBtn.addEventListener('click', async () => {
        const newId = saveAsInput ? String(saveAsInput.value || '').trim() : '';
        if (!/^\d{9}$/.test(newId)) {
            notify('Enter a valid 9-digit Player ID.', 'warn');
            return;
        }

        const uid = localStorage.getItem('player_uid');
        if (!uid) {
            notify('No UID found on this device. Sign up or log in first.', 'warn');
            return;
        }

        try {
            const mod = await import('./firebaseinit.js');
            const { db, collection, query, where, getDocs, doc, updateDoc, addDoc } = mod;

            // find all docs for this uid
            const q = query(collection(db, 'leaderboard'), where('uid', '==', uid));
            const snap = await getDocs(q);

            if (!snap.empty) {
                const updates = [];
                snap.forEach(d => {
                    const ref = doc(db, 'leaderboard', d.id);
                    updates.push(updateDoc(ref, { name: newId }));
                });
                await Promise.all(updates);
                localStorage.setItem('player_9id', newId);
                notify('Player ID updated for this device and server records.', 'success');
                await fetchTopScores();
                return;
            }

            // If no server docs, create one so leaderboard shows the new name
            const currentScore = Number(localStorage.getItem('highestPoint')) || point || 0;
            await addDoc(collection(db, 'leaderboard'), { uid: uid, name: newId, score: currentScore, ts: Date.now(), device: detectDeviceLabel() });
            localStorage.setItem('player_9id', newId);
            notify('No prior server records found — created new leaderboard entry with the new Player ID.', 'success');
            await fetchTopScores();
        } catch (err) {
            console.error('Failed to change Player ID', err);
            notify('Failed to save Player ID. See console.', 'error');
        }
    });

    console.log('Game init running');

    // show stored UID if present
    function updateStoredUidDisplay() {
        const storedUid = localStorage.getItem('player_uid');
        const stored9 = localStorage.getItem('player_9id');

        if (generatedUidDisplay && generatedUidDisplay.length) {
            if (storedUid) {
                generatedUidDisplay.forEach(el => { el.textContent = 'Your UniqueID: ' + storedUid; });
            } else {
                generatedUidDisplay.forEach(el => { el.textContent = ''; });
                
            }
        }

        if (stored9 && playerNameInput) playerNameInput.value = stored9;
    }
    updateStoredUidDisplay();

    // Sign-up handler: create UID and save to device + create initial DB doc
    if (signUpBtn) signUpBtn.addEventListener('click', async () => {
        const id9 = playerNameInput ? playerNameInput.value.trim() : '';
        // if a UID already exists on this device, confirm before creating a new one
        const existingUid = localStorage.getItem('player_uid');
        if (existingUid) {
            const confirmed = confirm('There is already a UID saved on this device (' + existingUid + ').\n\nDo you wish to create a new one anyway? Current one might be removed.');
            if (!confirmed) return;
        }
        if (!/^\d{9}$/.test(id9)) {
            notify('Enter a valid 9-digit Player ID to sign up.', 'warn');
            return;
        }
        const uid = generatePlayerID();
        try {
            const mod = await import('./firebaseinit.js');
            const { db, collection, addDoc } = mod;
            await addDoc(collection(db, 'leaderboard'), {
                uid: uid,
                name: id9,
                score: 0,
                ts: Date.now(),
                device: detectDeviceLabel()
            });
            localStorage.setItem('player_uid', uid);
            localStorage.setItem('player_9id', id9);
            localStorage.setItem('highestPoint', '0');
            highestPoint = 0;
            point = 0;
            document.getElementById('bestScoreDisplay').textContent = 'Your Highest Score: ' + highestPoint;
            updatePoint();
            updateStoredUidDisplay();
            // show the Sign Up panel and the UID immediately so the user can see it
            activateTab(tabSign);
            showPanel(panelSign);
            if (generatedUidDisplay && generatedUidDisplay.length) generatedUidDisplay.forEach(el => { el.textContent = 'Your UniqueID: ' + uid; });
            notify('Signed up! Your UID is saved to this device.', 'success');
            await fetchTopScores();
        } catch (err) {
            console.error('Sign-up failed', err);
            notify('Sign-up failed, see console.', 'error');
        }
    });

    // Login handler: login by uid, save to device and sync score
    async function performLogin(uidVal, { notifyUser = true, showPanelUI = false } = {}) {
        if (!uidVal) return false;
        if (!uidVal.startsWith('#')) uidVal = '#' + uidVal;
        try {
            const mod = await import('./firebaseinit.js');
            const { db, collection, getDocs, query, where, updateDoc, doc, addDoc } = mod;
            // fetch all docs for this uid so we can update device labels if needed
            const qAll = query(collection(db, 'leaderboard'), where('uid', '==', uidVal));
            const allSnap = await getDocs(qAll);
            const deviceLabel = detectDeviceLabel();

            if (allSnap.empty) {
                // No records yet: create a placeholder so we capture device
                const currentScore = Number(localStorage.getItem('highestPoint')) || 0;
                const localName = localStorage.getItem('player_9id') || '';
                await addDoc(collection(db, 'leaderboard'), { uid: uidVal, name: localName, score: currentScore, ts: Date.now(), device: deviceLabel });
                localStorage.setItem('player_uid', uidVal);
                // preserve any existing local 9-digit id; if none, leave empty
                if (localName) localStorage.setItem('player_9id', localName);
                localStorage.setItem('highestPoint', String(currentScore));
                highestPoint = currentScore;
                point = currentScore;
                document.getElementById('bestScoreDisplay').textContent = 'Your Highest Score: ' + highestPoint;
                updatePoint();
                updateStoredUidDisplay();
                if (showPanelUI) { activateTab(tabLogin); showPanel(panelLogin); }
                if (generatedUidDisplay && generatedUidDisplay.length) generatedUidDisplay.forEach(el => { el.textContent = 'Logged in UID: ' + uidVal; });
                if (notifyUser) notify(localName ? 'Logged in — server record created and device saved.' : 'Logged in — server record created (anonymous).', 'success');
                await fetchTopScores();
                return true;
            }

            // If records exist, sync score from highest doc and update device label if needed
            let bestScore = 0;
            const updates = [];
            const localName = localStorage.getItem('player_9id') || '';
            allSnap.forEach(snapDoc => {
                const dat = snapDoc.data();
                if (dat && typeof dat.score === 'number' && dat.score > bestScore) bestScore = dat.score;
                const updatePayload = {};
                if (!dat || dat.device !== deviceLabel) updatePayload.device = deviceLabel;
                if (localName && dat && dat.name !== localName) updatePayload.name = localName;
                if (Object.keys(updatePayload).length) {
                    const ref = doc(db, 'leaderboard', snapDoc.id);
                    updates.push(updateDoc(ref, updatePayload));
                }
            });
            if (updates.length) await Promise.all(updates);

            const s = bestScore;
            localStorage.setItem('player_uid', uidVal);
            // use the highest-scoring doc's name if available
            const nameFromDoc = allSnap.docs.find(d => (d.data() && typeof d.data().score === 'number' && d.data().score === bestScore)) || null;
            const docName = nameFromDoc ? (nameFromDoc.data().name || '') : '';
            // prefer local saved 9-digit id if present, otherwise take from server
            const finalName = localStorage.getItem('player_9id') || docName || '';
            if (finalName) localStorage.setItem('player_9id', finalName);
            localStorage.setItem('highestPoint', String(s));
            highestPoint = s;
            document.getElementById('bestScoreDisplay').textContent = 'Your Highest Score: ' + highestPoint;
            updatePoint();
            updateStoredUidDisplay();
            if (showPanelUI) { activateTab(tabLogin); showPanel(panelLogin); }
            if (generatedUidDisplay && generatedUidDisplay.length) generatedUidDisplay.forEach(el => { el.textContent = 'Logged in UID: ' + uidVal; });
            if (notifyUser) notify('Logged in successfully. Score synced to device and device saved.', 'success');
            return true;
        } catch (err) {
            console.error('Login failed', err);
            if (notifyUser) notify('Login failed, see console.', 'error');
            return false;
        }
    }

    if (loginBtn) loginBtn.addEventListener('click', async () => {
        const uidVal = loginUidInput ? loginUidInput.value.trim() : '';
        if (!uidVal) { notify('Enter your UID to log in.', 'warn'); return; }
        await performLogin(uidVal, { notifyUser: true, showPanelUI: true });
    });

    // Auto-login if a uid is stored locally
    const autoUid = localStorage.getItem('player_uid');
    if (autoUid) {
        // don't show UI elements when auto-logging unless necessary; no notification by default
        performLogin(autoUid, { notifyUser: false, showPanelUI: false }).then(success => {
            if (success) fetchTopScores().catch(() => {});
        });
    }

document.getElementById("startBtn").onclick = startGame;
document.getElementById("quitBtn").onclick = resetGame;

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
    maxtime = 10;
    time = maxtime;
    countSpeed = 100;
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

    }, countSpeed);

}

function updateTime() {

    timeDisplay.textContent = "Time: " + time;
}

function updatePoint() {
    pointDisplay.textContent = "Points: " + point;

    if (point > highestPoint) {
        highestPoint = point;
        localStorage.setItem("highestPoint", highestPoint);
        document.getElementById("bestScoreDisplay").textContent = "Your Highest Score: " + highestPoint;
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

        time = maxtime;
        time = Math.round(time * 10) / 10;
        point += digitLength; 
        countForDigit++;
       

        notify("Attendance given!", "success");
    } else {

        time -= time / maxtime * 2; // penalize wrong answer
        time = Math.round(time * 10) / 10;

         if (point > 0) {

        notify("Couldn't give the attendance.", "error");

         } 
     
    }
  

    updateTime();
    updatePoint();
    // move to next difficulty every 5 numbers

  

    if (countForDigit === 5) {

        digitLength++;
        maxtime += digitLength/6;
        countForDigit = 0;

    }
    if (digitLength > 8) {
        digitLength = 1;
        maxtime = 10;
        time = maxtime;
        time = Math.round(time * 10) / 10;
        countSpeed *= 0.9; // increase timer speed by reducing interval
        clearInterval(timer);
        startTimer();
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
        notify('Player ID must be exactly 9 digits (0-9).', 'warn');
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
        const { db, collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc } = mod;

        // find previous submissions by this uid
        const qPrev = query(collection(db, 'leaderboard'), where('uid', '==', uid));
        const prevSnap = await getDocs(qPrev);

        // determine previous highest score for this uid (if any)
        let prevHighest = null;
        prevSnap.forEach(d => {
            const dat = d.data();
            if (prevHighest === null || (dat && typeof dat.score === 'number' && dat.score > prevHighest)) prevHighest = dat.score;
        });

        // check device differences and update stored device labels if necessary
        const currentDevice = detectDeviceLabel();
        try {
            const updates = [];
            prevSnap.forEach(d => {
                const dat = d.data();
                if (!dat || dat.device !== currentDevice) {
                    updates.push(updateDoc(doc(db, 'leaderboard', d.id), { device: currentDevice }));
                }
            });
            if (updates.length) await Promise.all(updates);
        } catch (devErr) {
            // if updateDoc is not available or update fails, ignore but log
            console.warn('Could not update device labels for previous docs', devErr);
        }

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

        // submit new score document with uid, numeric player ID as name, and device
        await addDoc(collection(db, 'leaderboard'), {
            uid: uid,
            name: name,
            score: score,
            ts: Date.now(),
            device: detectDeviceLabel()
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
    const q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(10));
    const snap = await getDocs(q);
        if (snap.empty) {
            leaderboardDiv.innerHTML = '<div>No scores yet</div>';
            return;
        }
        let html = '<ol style="text-align:left; margin:0; padding-left:18px;font-size:16px;">';
        snap.forEach(docSnap => {
            const d = docSnap.data();
            // display player ID with uid appended for disambiguation, but don't modify stored data
            const baseName = d.name || 'Anonymous';
                        let uidHtml = '';
                     if (typeof d.uid === "string" && d.uid.length > 0) {
                            const shortUid = d.uid.slice(0, 4);

                            // uid zaten baseName içinde varsa tekrar ekleme
                            if (!String(baseName).includes(shortUid)) {
                                uidHtml = ` <span class="uid">${escapeHtml(shortUid)}***</span>`;
                            }
                     }
                     const deviceText = d.device ? `<span class="device">${escapeHtml(d.device)}</span> ` : '';
                     const scoreText = d.score ? '<span class="score">' + d.score + ' POINTS</span>' : '0 POINTS';

                 html += `<li> ${escapeHtml(baseName)}${uidHtml} — ${deviceText} — ${scoreText}   </li>`;  

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
    // prefer saved 9-digit ID, otherwise use the input value
    const saved9 = localStorage.getItem('player_9id');
    const name = saved9 || (playerNameInput ? playerNameInput.value.trim() : '');
    // submit current points for this player
    submitScore(name, point);
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

    // 1.5 saniye sonra DOM'dan sil
    setTimeout(() => {
        box.remove();
    }, 1500);
}

}

// run init now if DOM is ready, otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}



