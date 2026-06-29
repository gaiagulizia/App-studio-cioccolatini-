/* =============================================
   RILEVAMENTO AMBIENTE
   ============================================= */

/** true quando gira dentro l'APK Capacitor */
const IS_NATIVE = typeof window.Capacitor !== 'undefined'
               && window.Capacitor.isNativePlatform?.() === true;

/** Plugin nativo per il timer in background (solo APK) */
const TimerNative = IS_NATIVE ? window.Capacitor.Plugins.TimerNative : null;

/* =============================================
   WEB WORKER — timing background (browser / WebView)
   ============================================= */

let worker = null;

function initWorker() {
    if (worker) return;
    try {
        worker = new Worker('timer-worker.js');
        worker.onmessage = onWorkerMsg;
    } catch (e) {
        console.warn('Web Worker non disponibile, fallback setInterval');
    }
}

function workerSend(cmd, value) {
    if (worker) {
        worker.postMessage({ cmd, value });
    } else {
        fallbackCmd(cmd, value);   // fallback main-thread
    }
}

function onWorkerMsg(e) {
    const { type, seconds } = e.data;
    if (type === 'sw-tick') {
        stopwatchSeconds = seconds;
        totalStudySeconds++;
        recordTodaySeconds(1);
        updateStopwatch();
        updateTotalTime();
        updateSpeed();
    } else if (type === 'timer-tick') {
        timerSeconds = seconds;
        totalStudySeconds++;
        recordTodaySeconds(1);
        updateTimer();
        updateTotalTime();
        updateSpeed();
    } else if (type === 'timer-done') {
        timerRunning = false;
        alert('Tempo finito! 🎉');
    }
}

/* =============================================
   WAKE LOCK — mantiene la CPU attiva (schermo spento)
   ============================================= */

let wakeLock = null;

async function acquireWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
        wakeLock = await navigator.wakeLock.request('screen');
    } catch (_) { /* dispositivo non supporta o schermo già spento */ }
}

function releaseWakeLock() {
    if (wakeLock) { wakeLock.release(); wakeLock = null; }
}

/* Riacquista il WakeLock quando la pagina torna visibile */
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && (stopwatchRunning || timerRunning)) {
        acquireWakeLock();
        /* Sincronizza il Worker con lo stato corrente */
        if (stopwatchRunning) workerSend('sw-sync', stopwatchSeconds);
        if (timerRunning)     workerSend('timer-sync', timerSeconds);
    }
});

/* =============================================
   NATIVE CAPACITOR — timer con servizio in foreground
   ============================================= */

function setupNativeListener() {
    if (!TimerNative) return;
    TimerNative.addListener('timerUpdate', ({ type, seconds }) => {
        if (type === 'sw-tick') {
            stopwatchSeconds = seconds;
            totalStudySeconds++;
            recordTodaySeconds(1);
            updateStopwatch();
            updateTotalTime();
            updateSpeed();
        } else if (type === 'timer-tick') {
            timerSeconds = seconds;
            totalStudySeconds++;
            recordTodaySeconds(1);
            updateTimer();
            updateTotalTime();
            updateSpeed();
        } else if (type === 'timer-done') {
            timerRunning = false;
            alert('Tempo finito! 🎉');
        }
    });
}

/* =============================================
   FALLBACK MAIN-THREAD (se Worker non disponibile)
   ============================================= */

let _swFallback    = null;
let _timerFallback = null;

function fallbackCmd(cmd, value) {
    if (cmd === 'sw-start') {
        if (_swFallback) return;
        _swFallback = setInterval(() => {
            stopwatchSeconds++;
            totalStudySeconds++;
            recordTodaySeconds(1);
            updateStopwatch(); updateTotalTime(); updateSpeed();
        }, 1000);
    } else if (cmd === 'sw-stop') {
        clearInterval(_swFallback); _swFallback = null;
    } else if (cmd === 'sw-reset') {
        clearInterval(_swFallback); _swFallback = null;
        stopwatchSeconds = 0; updateStopwatch();
    } else if (cmd === 'timer-start') {
        if (_timerFallback) return;
        _timerFallback = setInterval(() => {
            timerSeconds--;
            totalStudySeconds++;
            recordTodaySeconds(1);
            updateTimer(); updateTotalTime(); updateSpeed();
            if (timerSeconds <= 0) {
                clearInterval(_timerFallback); _timerFallback = null;
                timerRunning = false;
                alert('Tempo finito! 🎉');
            }
        }, 1000);
    } else if (cmd === 'timer-stop') {
        clearInterval(_timerFallback); _timerFallback = null;
    } else if (cmd === 'timer-reset') {
        clearInterval(_timerFallback); _timerFallback = null;
        timerSeconds = value; updateTimer();
    }
}

/* =============================================
   DATI / COSTANTI
   ============================================= */

const chocolates = [
    { src: 'https://static.vecteezy.com/system/resources/previews/058/270/700/non_2x/glossy-chocolate-truffles-with-textured-striped-pattern-on-white-background-free-png.png', class: '' },
    { src: 'https://img.pikbest.com/png-images/20250203/round-chocolate-striped-sweets-_11491122.png!sw800', class: '' },
    { src: 'https://static.vecteezy.com/system/resources/previews/041/289/521/non_2x/ai-generated-round-chocolate-candy-isolated-on-transparent-background-png.png', class: 'white-choco' },
    { src: 'https://png.pngtree.com/png-vector/20230413/ourmid/pngtree-chocolate-round-illustration-png-image_6703935.png', class: '' },
    { src: 'https://static.vecteezy.com/system/resources/previews/034/763/953/non_2x/ai-generated-chocolate-ball-free-png.png', class: 'fifth-choco' }
];
const lidImage = 'https://i.ibb.co/PGZv7Nnw/IMG-3743.png';
const MAX = 10;

let total               = Number(localStorage.getItem("total")) || 0;
let boxes               = [];
let manualInput         = "";
let lastAddedIndex      = -1;
let animateNewCompleted = false;
let animateNewEmpty     = false;

const counterEl        = document.getElementById("counter");
const counterMobileEl  = document.getElementById("counter-mobile");
const mainBoxEl        = document.getElementById("mainBox");
const completedBoxesEl = document.getElementById("completedBoxes");

function setCounterDisplay(val) {
    if (counterEl)        counterEl.innerText        = val;
    if (counterMobileEl)  counterMobileEl.innerText  = val;
}

/* =============================================
   TRACCIAMENTO DATI GIORNALIERI
   ============================================= */

function getTodayKey() { return new Date().toISOString().slice(0, 10); }

function getAllDailyData() {
    try { return JSON.parse(localStorage.getItem("dailyData") || "{}"); }
    catch { return {}; }
}
function saveDailyData(data) { localStorage.setItem("dailyData", JSON.stringify(data)); }

function recordTodayPages(delta) {
    const data = getAllDailyData(), key = getTodayKey();
    if (!data[key]) data[key] = { pages: 0, seconds: 0 };
    data[key].pages = Math.max(0, (data[key].pages || 0) + delta);
    saveDailyData(data);
}
function recordTodaySeconds(delta) {
    const data = getAllDailyData(), key = getTodayKey();
    if (!data[key]) data[key] = { pages: 0, seconds: 0 };
    data[key].seconds = (data[key].seconds || 0) + delta;
    saveDailyData(data);
}

/* =============================================
   SCATOLA DI CIOCCOLATINI
   ============================================= */

function rebuildBoxes() {
    boxes = [[]];
    for (let i = 0; i < total; i++) {
        let cur = boxes[boxes.length - 1];
        if (cur.length >= MAX) { boxes.push([]); cur = boxes[boxes.length - 1]; }
        cur.push(chocolates[i % chocolates.length]);
    }
}

function save() { localStorage.setItem("total", total); }

function createSlot(data, index, isNew = false) {
    const slot = document.createElement("div");
    slot.className = `slot slot-${index}`;
    if (data) {
        const wrap = document.createElement("div");
        wrap.className = "choco-wrap";
        const img = document.createElement("img");
        img.src = data.src;
        img.classList.add("choco-img");
        if (data.class) img.classList.add(data.class);
        if (isNew) img.classList.add("new-choco");
        wrap.appendChild(img);
        slot.appendChild(wrap);
    }
    return slot;
}

function buildMain() {
    const current = boxes[boxes.length - 1];
    mainBoxEl.innerHTML = "";
    animateNewEmpty ? mainBoxEl.classList.add("new-empty-box")
                    : mainBoxEl.classList.remove("new-empty-box");
    current.length >= MAX ? mainBoxEl.classList.add("full")
                          : mainBoxEl.classList.remove("full");
    for (let i = 0; i < MAX; i++)
        mainBoxEl.appendChild(createSlot(current[i], i, i === lastAddedIndex));
    const overlay = document.createElement("div");
    overlay.className = "closed-overlay";
    overlay.innerHTML = `<img src="${lidImage}" class="lid">`;
    mainBoxEl.appendChild(overlay);
    if (animateNewEmpty) {
        const opening = document.createElement("div");
        opening.className = "opening-lid";
        opening.innerHTML = `<img src="${lidImage}">`;
        mainBoxEl.appendChild(opening);
        setTimeout(() => { animateNewEmpty = false; }, 1450);
    }
}

function buildArchive() {
    completedBoxesEl.innerHTML = "";
    for (let i = 0; i < boxes.length - 1; i++) {
        const box = document.createElement("div");
        box.className = "box completed full";
        if (animateNewCompleted && i === boxes.length - 2)
            box.classList.add("new-completed-box");
        for (let j = 0; j < MAX; j++)
            box.appendChild(createSlot(boxes[i][j], j, false));
        const overlay = document.createElement("div");
        overlay.className = "closed-overlay";
        overlay.style.display = "flex";
        overlay.innerHTML = `<img src="${lidImage}" class="lid">`;
        box.appendChild(overlay);
        completedBoxesEl.appendChild(box);
    }
    animateNewCompleted = false;
}

function updateSpeed() {
    const el = document.getElementById("speedValue");
    if (!el) return;
    if (totalStudySeconds <= 0 || total <= 0) { el.innerText = "0 pag/h"; return; }
    el.innerText = (total / (totalStudySeconds / 3600)).toFixed(1) + " pag/h";
}

function fitMainBox() {
    if (window.innerWidth <= 768) {
        mainBoxEl.style.width = ""; mainBoxEl.style.height = ""; return;
    }
    const area = document.querySelector(".current-box-area");
    if (!area || !mainBoxEl) return;
    const ratio = 2.11, availW = area.clientWidth, availH = area.clientHeight;
    if (availW <= 0 || availH <= 0) { requestAnimationFrame(fitMainBox); return; }
    let w, h;
    if (availW / availH > ratio) { h = availH; w = h * ratio; }
    else                          { w = availW; h = w / ratio; }
    mainBoxEl.style.width = w + "px"; mainBoxEl.style.height = h + "px";
}

function render() {
    setCounterDisplay(manualInput || total);
    buildMain(); buildArchive(); updateSpeed(); save(); fitMainBox();
}

window.addEventListener("resize", fitMainBox);
window.addEventListener("load",   fitMainBox);

/* =============================================
   CONFETTI
   ============================================= */

function confettiBurst() {
    const end = Date.now() + 1500;
    (function frame() {
        confetti({ particleCount: 3, angle:  60, spread: 65, origin: { x: 0 }, startVelocity: 18, gravity: 0.75 });
        confetti({ particleCount: 3, angle: 120, spread: 65, origin: { x: 1 }, startVelocity: 18, gravity: 0.75 });
        if (Date.now() < end) requestAnimationFrame(frame);
    })();
}

/* =============================================
   INTERAZIONI PAGINE
   ============================================= */

function addChocolate() {
    total++;
    rebuildBoxes();
    const cur = boxes[boxes.length - 1];
    lastAddedIndex = cur.length - 1;
    if (total > 10 && total % 10 === 1) animateNewCompleted = true;
    if (total % 10 === 1 && total > 1)  animateNewEmpty     = true;
    recordTodayPages(1);
    render();
    if (total % MAX === 0) confettiBurst();
    setTimeout(() => { lastAddedIndex = -1; }, 350);
}

function removeChocolate() {
    if (total <= 0) return;
    total--;
    rebuildBoxes();
    recordTodayPages(-1);
    render();
}

function pressNumber(n) {
    if (manualInput.length >= 5) return;
    manualInput += n;
    setCounterDisplay(manualInput);
}

function clearInput() { manualInput = ""; render(); }

function applyManualTotal() {
    const newTotal = Number(manualInput) || 0;
    const delta = newTotal - total;
    total = newTotal; manualInput = "";
    rebuildBoxes();
    if (delta !== 0) recordTodayPages(delta);
    render();
}

/* =============================================
   CRONOMETRO E TIMER
   ============================================= */

let stopwatchSeconds  = 0;
let stopwatchRunning  = false;
let totalStudySeconds = Number(localStorage.getItem("totalStudySeconds")) || 0;
let timerSeconds      = 1500;
let timerRunning      = false;

function pad(n) { return String(n).padStart(2, "0"); }

function formatTime(sec) {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function updateStopwatch() { document.getElementById("stopwatch").innerText = formatTime(stopwatchSeconds); }
function updateTimer()     { document.getElementById("timerDisplay").innerText = formatTime(timerSeconds); }

function updateTotalTime() {
    document.getElementById("totalTime").innerText = formatTime(totalStudySeconds);
    localStorage.setItem("totalStudySeconds", totalStudySeconds);
}

/* ---- Cronometro ---- */
function toggleStopwatch() {
    if (stopwatchRunning) {
        stopwatchRunning = false;
        if (IS_NATIVE) { TimerNative.stop(); }
        else           { workerSend('sw-stop'); releaseWakeLock(); }
    } else {
        stopwatchRunning = true;
        if (IS_NATIVE) { TimerNative.startStopwatch({ seconds: stopwatchSeconds }); }
        else           { workerSend('sw-start', stopwatchSeconds); acquireWakeLock(); }
    }
}

function resetStopwatch() {
    stopwatchRunning = false;
    stopwatchSeconds = 0;
    if (IS_NATIVE) { TimerNative.stop(); }
    else           { workerSend('sw-reset'); releaseWakeLock(); }
    updateStopwatch();
}

/* ---- Timer ---- */
function toggleTimer() {
    if (timerRunning) {
        timerRunning = false;
        if (IS_NATIVE) { TimerNative.stop(); }
        else           { workerSend('timer-stop'); releaseWakeLock(); }
    } else {
        timerRunning = true;
        if (IS_NATIVE) { TimerNative.startTimer({ seconds: timerSeconds }); }
        else           { workerSend('timer-start', timerSeconds); acquireWakeLock(); }
    }
}

function resetTimer() {
    timerRunning = false;
    timerSeconds = (Number(document.getElementById("studyMinutes").value) || 25) * 60;
    if (IS_NATIVE) { TimerNative.stop(); }
    else           { workerSend('timer-reset', timerSeconds); releaseWakeLock(); }
    updateTimer();
}

function changeStudy(amount) {
    const inp = document.getElementById("studyMinutes");
    const val = Math.max(1, (Number(inp.value) || 1) + amount);
    inp.value = val;
    if (!timerRunning) { timerSeconds = val * 60; updateTimer(); }
}

function changeTotalTime(amount) {
    totalStudySeconds = Math.max(0, totalStudySeconds + amount);
    updateTotalTime(); updateSpeed();
}

function resetTotalTime() { totalStudySeconds = 0; updateTotalTime(); updateSpeed(); }

/* =============================================
   STATISTICHE
   ============================================= */

const IT_DAYS  = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
const IT_MON_S = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const IT_MON_F = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

let statsMode = "week", statsOffset = 0, editOpen = false;
let pagesChartInst = null, timeChartInst = null;

function openStats() {
    document.getElementById("statsOverlay").classList.remove("stat-overlay--hidden");
    statsOffset = 0; refreshStats();
}
function closeStats() {
    document.getElementById("statsOverlay").classList.add("stat-overlay--hidden");
}
function setStatsMode(mode) {
    statsMode = mode; statsOffset = 0;
    document.querySelectorAll(".period-tab")
        .forEach(b => b.classList.toggle("period-tab--active", b.dataset.mode === mode));
    refreshStats();
}
function changeStatsPeriod(dir) {
    if (dir > 0 && statsOffset >= 0) return;
    statsOffset += dir; refreshStats();
}

function getPeriodInfo() {
    const allData = getAllDailyData();
    const today   = new Date(); today.setHours(0,0,0,0);
    let labels = [], pages = [], timeHours = [], days = [], label = "";

    if (statsMode === "week") {
        const dow = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + statsOffset * 7);
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday); d.setDate(monday.getDate() + i);
            const key = d.toISOString().slice(0,10);
            const e   = allData[key] || { pages:0, seconds:0 };
            days.push(key);
            labels.push(IT_DAYS[d.getDay()] + " " + d.getDate());
            pages.push(e.pages || 0);
            timeHours.push(+((e.seconds || 0) / 3600).toFixed(2));
        }
        const endDate = new Date(monday); endDate.setDate(monday.getDate() + 6);
        label = monday.getDate() + " " + IT_MON_S[monday.getMonth()]
              + " – " + endDate.getDate() + " " + IT_MON_S[endDate.getMonth()]
              + " " + endDate.getFullYear();

    } else if (statsMode === "month") {
        const ref = new Date(today.getFullYear(), today.getMonth() + statsOffset, 1);
        const dim = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= dim; i++) {
            const d = new Date(ref.getFullYear(), ref.getMonth(), i);
            const key = d.toISOString().slice(0,10);
            const e   = allData[key] || { pages:0, seconds:0 };
            days.push(key); labels.push(String(i));
            pages.push(e.pages || 0);
            timeHours.push(+((e.seconds || 0) / 3600).toFixed(2));
        }
        label = IT_MON_F[ref.getMonth()] + " " + ref.getFullYear();

    } else {
        const year = today.getFullYear() + statsOffset;
        for (let m = 0; m < 12; m++) {
            const dim = new Date(year, m+1, 0).getDate();
            let mPg=0, mSec=0; const mDays=[];
            for (let i=1; i<=dim; i++) {
                const d = new Date(year,m,i), key = d.toISOString().slice(0,10);
                mDays.push(key);
                const e = allData[key] || {pages:0,seconds:0};
                mPg += e.pages||0; mSec += e.seconds||0;
            }
            days.push(mDays); labels.push(IT_MON_S[m]);
            pages.push(mPg); timeHours.push(+(mSec/3600).toFixed(2));
        }
        label = String(year);
    }

    const totalPages = pages.reduce((a,b)=>a+b, 0);
    const totalSeconds = statsMode === "year"
        ? days.flat().reduce((s,k) => s + ((allData[k]||{}).seconds||0), 0)
        : days.reduce((s,k) => s + ((allData[k]||{}).seconds||0), 0);

    return { labels, pages, timeHours, days, label, totalPages, totalSeconds };
}

function formatHours(sec) {
    return Math.floor(sec/3600) + "h " + pad(Math.floor((sec%3600)/60)) + "m";
}

function refreshStats() {
    const info = getPeriodInfo();
    document.getElementById("periodLabel").textContent     = info.label;
    document.getElementById("statsTotalPages").textContent = info.totalPages;
    document.getElementById("statsTotalHours").textContent = formatHours(info.totalSeconds);
    renderCharts(info);
    if (editOpen) renderEditTable(info);
}

const PINK_BG = "rgba(255,182,212,0.78)", PINK_BORDER = "#e8749b";
const BASE_SCALE = {
    x: { ticks:{color:"#5c2c16",font:{size:10},maxRotation:45}, grid:{color:"rgba(255,214,231,0.4)"} },
    y: { beginAtZero:true, ticks:{color:"#5c2c16",font:{size:10}}, grid:{color:"rgba(255,214,231,0.5)"} }
};

function barDataset(data) {
    return { data, backgroundColor:PINK_BG, borderColor:PINK_BORDER,
             borderWidth:1.5, borderRadius:6, borderSkipped:false };
}

function renderCharts(info) {
    if (pagesChartInst) { pagesChartInst.destroy(); pagesChartInst=null; }
    if (timeChartInst)  { timeChartInst.destroy();  timeChartInst=null;  }
    pagesChartInst = new Chart(document.getElementById("pagesChart"), {
        type:"bar", data:{labels:info.labels, datasets:[barDataset(info.pages)]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:BASE_SCALE}
    });
    timeChartInst = new Chart(document.getElementById("timeChart"), {
        type:"bar", data:{labels:info.labels, datasets:[barDataset(info.timeHours)]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
            scales:{x:BASE_SCALE.x, y:{beginAtZero:true,
                ticks:{color:"#5c2c16",font:{size:10},callback:v=>v+"h"},
                grid:BASE_SCALE.y.grid}}}
    });
}

function toggleEdit() {
    editOpen = !editOpen;
    document.getElementById("editArea").classList.toggle("edit-area--hidden", !editOpen);
    if (editOpen) renderEditTable(getPeriodInfo());
}

function renderEditTable(info) {
    const area = document.getElementById("editArea"), allData = getAllDailyData();
    let rows = [];
    if (statsMode === "year") {
        info.days.forEach(md => md.forEach(key => {
            const e = allData[key];
            if (e && (e.pages>0||e.seconds>0))
                rows.push({key,label:key,pages:e.pages||0,minutes:Math.round((e.seconds||0)/60)});
        }));
    } else {
        info.days.forEach((key,i) => {
            const e = allData[key]||{pages:0,seconds:0};
            rows.push({key,label:info.labels[i],pages:e.pages||0,minutes:Math.round((e.seconds||0)/60)});
        });
    }
    if (!rows.length) {
        area.innerHTML='<p class="edit-empty">Nessun dato registrato per questo periodo.</p>'; return;
    }
    area.innerHTML = `<table class="edit-table">
        <thead><tr><th>Data</th><th>Pagine</th><th>Minuti studiati</th><th></th></tr></thead>
        <tbody>${rows.map(r=>`<tr>
            <td>${r.label}</td>
            <td><input class="edit-input" type="number" id="ep-${r.key}" value="${r.pages}" min="0"></td>
            <td><input class="edit-input" type="number" id="em-${r.key}" value="${r.minutes}" min="0"></td>
            <td><button class="save-row-btn" onclick="saveEditRow('${r.key}')">Salva</button></td>
        </tr>`).join("")}</tbody></table>`;
}

function saveEditRow(key) {
    const pages   = Math.max(0, Number(document.getElementById("ep-"+key)?.value)||0);
    const seconds = Math.max(0, (Number(document.getElementById("em-"+key)?.value)||0)*60);
    const allData = getAllDailyData(); allData[key]={pages,seconds};
    saveDailyData(allData); refreshStats();
    const btn = document.querySelector(`[onclick="saveEditRow('${key}')"]`);
    if (btn) { btn.textContent="✓"; setTimeout(()=>btn.textContent="Salva",1400); }
}

/* =============================================
   INIT
   ============================================= */

initWorker();
setupNativeListener();

rebuildBoxes();
render();
updateStopwatch();
updateTimer();
updateTotalTime();
updateSpeed();
