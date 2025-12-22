// Avoid importing Firebase at top-level to prevent module load failures (file:// or CORS issues).
function init() {
    // ==========================================
    // 1. GAME STATE & CONFIGURATION
    // ==========================================
    let time = 10;
    let maxtime = 10;
    let point = 0;
    let highestPoint = Number(localStorage.getItem("highestPoint")) || 0;
    let currentNumber = "";
    let digitLength = 1;
    let countForDigit = 0; // how many times current digit length has been asked
    let timer;
    let countSpeed = 100; // initial timer speed in ms

    const BASE_SPEED = 100;
    const SPEED_DECAY = 0.9;
    const MIN_SPEED = 30; // ms altına düşmesin
    // ==========================================
    // 2. DOM ELEMENTS
    // ==========================================
    // --- Game Display Elements ---
    const timeDisplay = document.getElementById("timeDisplay");
    const pointDisplay = document.getElementById("pointDisplay");
    const randomNumberBox = document.getElementById("randomNumber");
    const userInput = document.getElementById("userInput");
    const gameContainer = document.getElementById("gameContainer");
    const leaderboardContainer = document.getElementById("leaderboardContainer");
    const bestScoreDisplay = document.getElementById("bestScoreDisplay");
    const notifyContainer = document.getElementById("notifyContainer");

    // --- Buttons ---
    const startBtn = document.getElementById("startBtn");
    const quitBtn = document.getElementById("quitBtn");
    const submitBtn = document.getElementById("submitBtn");

    // --- Leaderboard / Auth UI Elements ---
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

    // --- Tab Elements ---
    const tabSign = document.getElementById('tabSign');
    const tabLogin = document.getElementById('tabLogin');
    const tabBoard = document.getElementById('tabBoard');
    const tabShare = document.getElementById('tabShare');

    // --- Panel Elements ---
    const panelSign = document.getElementById('panelSign');
    const panelLogin = document.getElementById('panelLogin');
    const panelBoard = document.getElementById('panelBoard');
    const panelShare = document.getElementById('panelShare');

    // Initialize Displays
    if (bestScoreDisplay) bestScoreDisplay.textContent = "Your Highest Score: " + highestPoint;


    // ==========================================
    // 3. UTILITY FUNCTIONS
    // ==========================================

    function notify(message, type = "success", duration = 1000) {
        const colors = {
            success: "#28a745",
            warn: "#bf8f00ff",
            error: "#dc3545"
        };

        const box = document.createElement("div");
        box.className = "notifyBox";
        box.style.background = colors[type] || colors.success;
        box.style.animation = 'none'; // Disable CSS animations, control here

        // Transition Settings
        const fadeMs = 300;
        box.style.transition = `opacity ${fadeMs}ms ease, transform ${fadeMs}ms ease`;
        box.style.opacity = '0';
        box.style.transform = 'translateY(20px)';
        box.textContent = message;

        if (!notifyContainer) return;
        notifyContainer.appendChild(box);

        const fadeOutAndRemove = () => {
            if (box.dataset.isClosing) return;
            box.dataset.isClosing = "true";
            box.style.opacity = '0';
            box.style.transform = 'translateY(20px)';
            box.addEventListener('transitionend', () => {
                try { box.remove(); } catch (e) { /* ignore */ }
            }, { once: true });
            setTimeout(() => {
                if (document.body.contains(box)) {
                    try { box.remove(); } catch (e) { /* ignore */ }
                }
            }, fadeMs + 150);
        };

        // Calculate duration based on text length
        const charMs = Math.max(0, String(message || '').length) * 50;
        const visibleMs = Math.max(200, Number(duration) || 1000, charMs);

        requestAnimationFrame(() => {
            box.style.opacity = '1';
            box.style.transform = 'translateY(0)';
            setTimeout(() => {
                fadeOutAndRemove();
            }, fadeMs + visibleMs);
        });

        box.addEventListener('click', fadeOutAndRemove);
    }

    // Simple device detection: Phone vs Computer
    function detectDeviceLabel() {
        const ua = navigator.userAgent || '';
        const isMobile = /Mobi|Android|iPhone|iPad|Tablet/i.test(ua);
        return isMobile ? 'Phone' : 'Computer';
    }

    // Generate internal ID
    function generatePlayerID() {
        const part1 = Math.random().toString(36).substring(2, 5).toUpperCase();
        const part2 = Math.random().toString(36).substring(2, 5).toUpperCase();
        const numbers = Math.floor(100 + Math.random() * 900); // 100–999
        return `#${part1}-${numbers}-${part2}`;
    }

    // Prevent HTML injection
    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function(c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": "&#39;" }[c];
        });
    }


    // ==========================================
    // 4. UI & TAB LOGIC
    // ==========================================

    function UpdateStartButton() {
        let currentStage = getStage(highestPoint);
        if (currentStage >= 1) {
            document.getElementById('startBtn').textContent = 'Continue Stage ' + currentStage + ' ▶';
            document.getElementById('startBtn').style.background = 'linear-gradient(180deg, #8903b5ff, #fa59d4ff)';
        }  else {
            document.getElementById('startBtn').textContent = 'Start Game ▶';
            document.getElementById('startBtn').style.background = 'linear-gradient(180deg, #4CAF50, #45A049)';
        }
    }
    UpdateStartButton();

    function activateTab(btn) {
        [tabSign, tabLogin, tabBoard,tabShare].forEach(b => { if (b) b.classList.remove('active'); });
        if (btn) btn.classList.add('active');
    }

    function showPanel(panel) {
        [panelSign, panelLogin, panelBoard,panelShare].forEach(p => { if (p) p.style.display = 'none'; });
        if (panel) panel.style.display = 'block';
    }

    // Show stored UID if present
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

    // Set Default View
    activateTab(tabBoard);
    showPanel(panelBoard);
    updateStoredUidDisplay();

    // Wire tab clicks
    if (tabSign) tabSign.addEventListener('click', () => { activateTab(tabSign); showPanel(panelSign); });
    if (tabLogin) tabLogin.addEventListener('click', () => { activateTab(tabLogin); showPanel(panelLogin); });
    if (tabBoard) tabBoard.addEventListener('click', () => { activateTab(tabBoard); showPanel(panelBoard); });
    if (tabShare) tabShare.addEventListener('click', () => { activateTab(tabShare); showPanel(panelShare); });


    // ==========================================
    // 5. GAME LOGIC
    // ==========================================

    function getStage(score) {
        return Math.floor(score / 180);
    }


    function startGame() {
        if (startBtn) startBtn.style.display = "none";
        gameContainer.style.display = "block";
        leaderboardContainer.style.display = "none";

       // Reset values
        maxtime = 10;
        time = maxtime;
        digitLength = 1;
        countForDigit = 0;
        currentStage = getStage(highestPoint);
        point = currentStage * 180;
        countSpeed = Math.max( MIN_SPEED, BASE_SPEED * Math.pow(SPEED_DECAY, currentStage));


        startTimer();
        newNumber();
        updatePoint();
    }

    function resetGame() {
        clearInterval(timer);
        notify("Game Over! Your final score: " + point, "error");

        applySumbitScore();

       

        // Reset screens
        gameContainer.style.display = "none";
        leaderboardContainer.style.display = "block";
        if (startBtn) startBtn.style.display = "inline-block";

        // Reset displays
        timeDisplay.textContent = "Time: 10";
        pointDisplay.textContent = "Point: 0";
        randomNumberBox.textContent = "";
        userInput.value = "";

        // Refresh leaderboard
        try { fetchTopScores(); } catch (e) { /* ignore */ }
    }

    function startTimer() {
        timer = setInterval(() => {
            time -= 0.1;
            time = Math.round(time * BASE_SPEED) / BASE_SPEED;
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
            if (bestScoreDisplay) bestScoreDisplay.textContent = "Your Highest Score: " + highestPoint;
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

        // Increase difficulty
        if (countForDigit === 5) {
            digitLength++;
            maxtime += digitLength / 6;
            countForDigit = 0;
        }
        // Max level reset loop
        if (digitLength > 8) {
            digitLength = 1;
            maxtime = 10;
            time = maxtime;
            time = Math.round(time * 10) / 10;
            countSpeed *= SPEED_DECAY; // increase timer speed
            clearInterval(timer);
            startTimer();
        }
        newNumber();
    }

 

    // ==========================================
    // 6. FIREBASE & LEADERBOARD LOGIC
    // ==========================================

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
            let html = '<ol style="text-align:left; margin:0; padding-left:28px;font-size:12px;font-family: \'Press Start 2P\', monospace;">';
            snap.forEach(docSnap => {
                const d = docSnap.data();
                const baseName = d.name || 'Anonymous';
                let uidHtml = '';
                if (typeof d.uid === "string" && d.uid.length > 0) {
                    const shortUid = d.uid.slice(0, 4);
                    // Prevent duplicate UID display
                    if (!String(baseName).includes(shortUid)) {
                        uidHtml = ` <span class="uid">${escapeHtml(shortUid)}***</span>`;
                    }
                }
                const deviceText = d.device ? `<span class="device">${escapeHtml(d.device)}</span> ` : '';
                const scoreText = d.score ? '<span class="score">' + d.score + ' POINTS</span>' : '0 POINTS';
                html += `<li> ${escapeHtml(baseName)}${uidHtml} ${deviceText} ${scoreText} </li>`;
            });
            html += '</ol>';
            leaderboardDiv.innerHTML = html;
        } catch (err) {
            console.error('Failed to fetch leaderboard', err);
            leaderboardDiv.textContent = 'Error loading leaderboard';
        }
    }

    async function submitScore(name, score) {
        let uid = localStorage.getItem('player_uid');
        if (!uid) {
            notify('Sign in to submit your score.', 'warn');
            return;
        }
        if (!name) name = '';
        const idStr = String(name).trim();
        if (!/^\d{9}$/.test(idStr)) {
            notify('Player ID must be exactly 9 digits (0-9).', 'warn');
            return;
        }
        name = idStr;

        try {
            const mod = await import('./firebaseinit.js');
            const { db, collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc } = mod;

            // Find previous submissions
            const qPrev = query(collection(db, 'leaderboard'), where('uid', '==', uid));
            const prevSnap = await getDocs(qPrev);

            let prevHighest = 0;
            prevSnap.forEach(d => {
                const dat = d.data();
                if (dat && typeof dat.score === 'number' && dat.score >= prevHighest) {
                    prevHighest = dat.score;
                }
            });

            // Update device label
            const currentDevice = detectDeviceLabel();
            try {
                const updates = [];
                prevSnap.forEach(d => {
                    const dat = d.data();
                    if (!dat || dat.device !== currentDevice) {
                        updates.push(updateDoc(doc(db, 'leaderboard', d.id), {
                            device: currentDevice
                        }));
                    }
                });
                if (updates.length) await Promise.all(updates);
            } catch (devErr) {
                console.warn('Could not update device labels for previous docs', devErr);
            }

            if (typeof prevHighest === 'number' && score <= prevHighest) {
                notify('Submit blocked — your new score must be higher than your previous submission (' + prevHighest + ').', 'warn');
                return;
            }

            // Cleanup old scores
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
                console.warn('Could not fetch all leaderboard docs to search legacy names', errAll);
            }

            for (const id of idsToDelete) {
                try {
                    await deleteDoc(doc(db, 'leaderboard', id));
                } catch (delErr) {
                    console.warn('Failed to delete previous leaderboard doc', id, delErr);
                }
            }

            // Add new score
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

    // Login Handler
    async function performLogin(uidVal, { notifyUser = true, showPanelUI = false } = {}) {
        if (!uidVal) return false;
        if (!uidVal.startsWith('#')) uidVal = '#' + uidVal;
        try {
            const mod = await import('./firebaseinit.js');
            const { db, collection, getDocs, query, where } = mod;
            const qAll = query(collection(db, 'leaderboard'), where('uid', '==', uidVal));
            const allSnap = await getDocs(qAll);

            if (allSnap.empty) {
                if (notifyUser) notify('UID not found. Please sign up first.', 'warn');
                return false;
            }

            // Sync Score
            let bestScore = 0;
            const updates = [];
            allSnap.forEach(snapDoc => {
                const dat = snapDoc.data();
                if (dat && typeof dat.score === 'number' && dat.score > bestScore) bestScore = dat.score;
            });
            if (updates.length) await Promise.all(updates);

            const s = bestScore;
            localStorage.setItem('player_uid', uidVal);

            // Sync Name
            const nameFromDoc = allSnap.docs.find(d => (d.data() && typeof d.data().score === 'number' && d.data().score === bestScore)) || null;
            const docName = nameFromDoc ? (nameFromDoc.data().name || '') : '';
            const finalName = localStorage.getItem('player_9id') || docName || '';
            if (finalName) localStorage.setItem('player_9id', finalName);

            localStorage.setItem('highestPoint', String(s));
            highestPoint = s;
            if (bestScoreDisplay) bestScoreDisplay.textContent = 'Your Highest Score: ' + highestPoint;
           
            UpdateStartButton();
            updatePoint();
            updateStoredUidDisplay();

            if (showPanelUI) {
                activateTab(tabLogin);
                showPanel(panelLogin);
            }

            if (generatedUidDisplay && generatedUidDisplay.length) generatedUidDisplay.forEach(el => { el.textContent = 'Logged in UID: ' + uidVal; });
            if (notifyUser) notify('Logged in successfully. Score synced to device and device saved.', 'success');
            return true;
        } catch (err) {
            console.error('Login failed', err);
            if (notifyUser) notify('Login failed, see console.', 'error');
            return false;
        }
    }

    function applySumbitScore() {
        const saved9 = localStorage.getItem('player_9id');
        const name = saved9 || (playerNameInput ? playerNameInput.value.trim() : '');
        submitScore(name, highestPoint);
    }


    // ==========================================
    // 7. EVENT LISTENERS
    // ==========================================

    // --- Auth/Backend Buttons ---

    if (signUpBtn) signUpBtn.addEventListener('click', async () => {
        const id9 = playerNameInput ? playerNameInput.value.trim() : '';
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
            highestPoint = 0;
            localStorage.setItem('highestPoint', highestPoint);
            localStorage.setItem('player_uid', uid);
            localStorage.setItem('player_9id', id9);
            if (bestScoreDisplay) bestScoreDisplay.textContent = 'Your Highest Score: ' + highestPoint;
            updatePoint();
            updateStoredUidDisplay();
            UpdateStartButton();
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

    if (loginBtn) loginBtn.addEventListener('click', async () => {
        const uidVal = loginUidInput ? loginUidInput.value.trim() : '';
        if (!uidVal) {
            notify('Enter your UID to log in.', 'warn');
            return;
        }
        await performLogin(uidVal, { notifyUser: true, showPanelUI: true });
    });

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

            const currentScore = Number(localStorage.getItem('highestPoint')) || point || 0;
            await addDoc(collection(db, 'leaderboard'), {
                uid: uid,
                name: newId,
                score: currentScore,
                ts: Date.now(),
                device: detectDeviceLabel()
            });
            localStorage.setItem('player_9id', newId);
            notify('No prior server records found — created new leaderboard entry with the new Player ID.', 'success');
            await fetchTopScores();
        } catch (err) {
            console.error('Failed to change Player ID', err);
            notify('Failed to save Player ID. See console.', 'error');
        }
    });

    if (submitScoreBtn) submitScoreBtn.addEventListener('click', applySumbitScore);
    if (refreshBoardBtn) refreshBoardBtn.addEventListener('click', fetchTopScores);

    // --- Game Control Buttons ---
    if (startBtn) startBtn.onclick = startGame;
    if (quitBtn) quitBtn.onclick = resetGame;
    if (submitBtn) submitBtn.onclick = checkInput;

    if (userInput) {
        userInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") checkInput();
        });
    }

    console.log('Game init running');


    // ==========================================
    // 8. BOOTSTRAP (Auto Login & Init)
    // ==========================================

    const autoUid = localStorage.getItem('player_uid');
    if (autoUid) {
        // don't show UI elements when auto-logging unless necessary; no notification by default
        performLogin(autoUid, { notifyUser: false, showPanelUI: false }).then(success => {
            if (success) fetchTopScores().catch(() => {});
        });
    }

    // Initial leaderboard load
    try { fetchTopScores(); } catch (e) { /* ignore */ }
}

// ==========================================
// 9. EXECUTION
// ==========================================
// run init now if DOM is ready, otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}