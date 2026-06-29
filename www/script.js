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

let total        = Number(localStorage.getItem("total")) || 0;
let boxes        = [];
let manualInput  = "";
let lastAddedIndex    = -1;
let animateNewCompleted = false;
let animateNewEmpty     = false;

const counterEl        = document.getElementById("counter");
const counterMobileEl  = document.getElementById("counter-mobile");
const mainBoxEl        = document.getElementById("mainBox");
const completedBoxesEl = document.getElementById("completedBoxes");

/* Aggiorna entrambi i display del contatore (desktop + mobile) */
function setCounterDisplay(val) {
    counterEl.innerText = val;
    if (counterMobileEl) counterMobileEl.innerText = val;
}

/* =============================================
   TRACCIAMENTO DATI GIORNALIERI
   ============================================= */

function getTodayKey() {
    return new Date().toISOString().slice(0, 10);
}
function getAllDailyData() {
    try { return JSON.parse(localStorage.getItem("dailyData") || "{}"); }
    catch { return {}; }
}
function saveDailyData(data) {
    localStorage.setItem("dailyData", JSON.stringify(data));
}
function recordTodayPages(delta) {
    const data = getAllDailyData();
    const key  = getTodayKey();
    if (!data[key]) data[key] = { pages: 0, seconds: 0 };
    data[key].pages = Math.max(0, (data[key].pages || 0) + delta);
    saveDailyData(data);
}
function recordTodaySeconds(delta) {
    const data = getAllDailyData();
    const key  = getTodayKey();
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
    for (let i = 0; i < MAX; i++) {
        mainBoxEl.appendChild(createSlot(current[i], i, i === lastAddedIndex));
    }
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
        if (animateNewCompleted && i === boxes.length - 2) box.classList.add("new-completed-box");
        for (let j = 0; j < MAX; j++) box.appendChild(createSlot(boxes[i][j], j, false));
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

/* Ridimensiona il box mantenendo il rapporto 2.11:1.
   Su mobile (≤768px) usa CSS (aspect-ratio), non il JS.
   Su tablet (769px–1024px) riduce la gif per evitare sovrapposizioni. */
function fitMainBox() {
    const w = window.innerWidth;

    // Mobile: lascia fare al CSS
    if (w <= 768) {
        mainBoxEl.style.width  = "";
        mainBoxEl.style.height = "";
        return;
    }

    const area = document.querySelector(".current-box-area");
    if (!area || !mainBoxEl) return;

    const ratio  = 2.11;
    let availW = area.clientWidth;
    let availH = area.clientHeight;

    // Su tablet, sottrae lo spazio occupato dalla gif per evitare sovrapposizioni
    if (w <= 1024) {
        const gif = document.querySelector(".study-gif");
        if (gif) {
            const gifW = gif.offsetWidth || 140;
            availW = Math.max(availW - gifW - 20, availW * 0.55);
        }
    }

    if (availW <= 0 || availH <= 0) {
        requestAnimationFrame(fitMainBox);
        return;
    }
    let boxW, boxH;
    if (availW / availH > ratio) { boxH = availH; boxW = boxH * ratio; }
    else                          { boxW = availW; boxH = boxW / ratio; }
    mainBoxEl.style.width  = boxW + "px";
    mainBoxEl.style.height = boxH + "px";
}

function render() {
    setCounterDisplay(manualInput || total);
    buildMain();
    buildArchive();
    updateSpeed();
    save();
    fitMainBox();
}

window.addEventListener("resize", fitMainBox);
window.addEventListener("load",   fitMainBox);

/* =============================================
   CONFETTI
   ============================================= */

function confettiBurst() {
    const end = Date.now() + 1500;
    (function frame() {
        confetti({ particleCount: 3, angle:  60, spread: 65, origin: { x: 0 }, startVelocity: 18, gravity: 0.75, scalar: 1 });
        confetti({ particleCount: 3, angle: 120, spread: 65, origin: { x: 1 }, startVelocity: 18, gravity: 0.75, scalar: 1 });
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
    const delta    = newTotal - total;
    total = newTotal;
    manualInput = "";
    rebuildBoxes();
    if (delta !== 0) recordTodayPages(delta);
    render();
}

/* =============================================
   CRONOMETRO E TIMER
   ============================================= */

let stopwatchSeconds  = 0;
let stopwatchInterval = null;
let stopwatchRunning  = false;
let totalStudySeconds = Number(localStorage.getItem("totalStudySeconds")) || 0;
let timerSeconds  = 1500;
let timerInterval = null;
let timerRunning  = false;

function formatTime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return pad(h) + ":" + pad(m) + ":" + pad(s);
    return pad(m) + ":" + pad(s);
}
function pad(n) { return String(n).padStart(2, "0"); }

function updateStopwatch() { document.getElementById("stopwatch").innerText = formatTime(stopwatchSeconds); }

function toggleStopwatch() {
    if (stopwatchRunning) {
        clearInterval(stopwatchInterval);
        stopwatchRunning = false;
    } else {
        stopwatchRunning = true;
        stopwatchInterval = setInterval(() => {
            stopwatchSeconds++;
            totalStudySeconds++;
            recordTodaySeconds(1);
            updateStopwatch();
            updateTotalTime();
            updateSpeed();
        }, 1000);
    }
}

function resetStopwatch() {
    clearInterval(stopwatchInterval);
    stopwatchRunning  = false;
    stopwatchSeconds  = 0;
    updateStopwatch();
}

function updateTotalTime() {
    document.getElementById("totalTime").innerText = formatTime(totalStudySeconds);
    localStorage.setItem("totalStudySeconds", totalStudySeconds);
}

function resetTotalTime() { totalStudySeconds = 0; updateTotalTime(); updateSpeed(); }

function updateTimer() { document.getElementById("timerDisplay").innerText = formatTime(timerSeconds); }

function changeStudy(amount) {
    const inp = document.getElementById("studyMinutes");
    const val = Math.max(1, (Number(inp.value) || 1) + amount);
    inp.value = val;
    if (!timerRunning) { timerSeconds = val * 60; updateTimer(); }
}

/* Timer: unico tasto Start/Stop */
function toggleTimer() {
    if (timerRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    if (timerRunning) return;
    timerRunning = true;
    timerInterval = setInterval(() => {
        timerSeconds--;
        totalStudySeconds++;
        recordTodaySeconds(1);
        updateTimer();
        updateTotalTime();
        updateSpeed();
        if (timerSeconds <= 0) {
            clearInterval(timerInterval);
            timerRunning = false;
            alert("Tempo finito!");
        }
    }, 1000);
}

function pauseTimer() { clearInterval(timerInterval); timerRunning = false; }

function resetTimer() {
    clearInterval(timerInterval);
    timerRunning  = false;
    timerSeconds  = (Number(document.getElementById("studyMinutes").value) || 25) * 60;
    updateTimer();
}

function changeTotalTime(amount) {
    totalStudySeconds = Math.max(0, totalStudySeconds + amount);
    updateTotalTime();
    updateSpeed();
}

/* =============================================
   STATISTICHE
   ============================================= */

const IT_DAYS   = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
const IT_MON_S  = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const IT_MON_F  = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

let statsMode      = "week";
let statsOffset    = 0;
let editOpen       = false;
let pagesChartInst = null;
let timeChartInst  = null;

function openStats() {
    document.getElementById("statsOverlay").classList.remove("stat-overlay--hidden");
    statsOffset = 0;
    refreshStats();
}

function closeStats() {
    document.getElementById("statsOverlay").classList.add("stat-overlay--hidden");
}

function setStatsMode(mode) {
    statsMode   = mode;
    statsOffset = 0;
    document.querySelectorAll(".period-tab").forEach(b =>
        b.classList.toggle("period-tab--active", b.dataset.mode === mode));
    refreshStats();
}

function changeStatsPeriod(dir) {
    if (dir > 0 && statsOffset >= 0) return;   // non nel futuro
    statsOffset += dir;
    refreshStats();
}

function getPeriodInfo() {
    const allData = getAllDailyData();
    const today   = new Date();
    today.setHours(0, 0, 0, 0);

    let labels = [], pages = [], timeHours = [], days = [], label = "";

    if (statsMode === "week") {
        const dow    = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + statsOffset * 7);

        for (let i = 0; i < 7; i++) {
            const d   = new Date(monday);
            d.setDate(monday.getDate() + i);
            const key   = d.toISOString().slice(0, 10);
            const entry = allData[key] || { pages: 0, seconds: 0 };
            days.push(key);
            labels.push(IT_DAYS[d.getDay()] + " " + d.getDate());
            pages.push(entry.pages || 0);
            timeHours.push(+((entry.seconds || 0) / 3600).toFixed(2));
        }

        const endDate = new Date(monday);
        endDate.setDate(monday.getDate() + 6);
        label = monday.getDate() + " " + IT_MON_S[monday.getMonth()]
              + " – " + endDate.getDate() + " " + IT_MON_S[endDate.getMonth()]
              + " " + endDate.getFullYear();

    } else if (statsMode === "month") {
        const ref        = new Date(today.getFullYear(), today.getMonth() + statsOffset, 1);
        const daysInMon  = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();

        for (let i = 1; i <= daysInMon; i++) {
            const d     = new Date(ref.getFullYear(), ref.getMonth(), i);
            const key   = d.toISOString().slice(0, 10);
            const entry = allData[key] || { pages: 0, seconds: 0 };
            days.push(key);
            labels.push(String(i));
            pages.push(entry.pages || 0);
            timeHours.push(+((entry.seconds || 0) / 3600).toFixed(2));
        }
        label = IT_MON_F[ref.getMonth()] + " " + ref.getFullYear();

    } else {
        const year = today.getFullYear() + statsOffset;
        for (let m = 0; m < 12; m++) {
            const dim   = new Date(year, m + 1, 0).getDate();
            let mPg = 0, mSec = 0;
            const mDays = [];
            for (let i = 1; i <= dim; i++) {
                const d   = new Date(year, m, i);
                const key = d.toISOString().slice(0, 10);
                mDays.push(key);
                const e   = allData[key] || { pages: 0, seconds: 0 };
                mPg  += e.pages   || 0;
                mSec += e.seconds || 0;
            }
            days.push(mDays);
            labels.push(IT_MON_S[m]);
            pages.push(mPg);
            timeHours.push(+(mSec / 3600).toFixed(2));
        }
        label = String(year);
    }

    const totalPages = pages.reduce((a, b) => a + b, 0);
    const totalSeconds = statsMode === "year"
        ? days.flat().reduce((s, k) => s + ((allData[k] || {}).seconds || 0), 0)
        : days.reduce((s, k) => s + ((allData[k] || {}).seconds || 0), 0);

    return { labels, pages, timeHours, days, label, totalPages, totalSeconds };
}

function formatHours(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return h + "h " + pad(m) + "m";
}

function refreshStats() {
    const info = getPeriodInfo();
    document.getElementById("periodLabel").textContent    = info.label;
    document.getElementById("statsTotalPages").textContent = info.totalPages;
    document.getElementById("statsTotalHours").textContent = formatHours(info.totalSeconds);
    renderCharts(info);
    if (editOpen) renderEditTable(info);
}

const PINK_BG     = "rgba(255,182,212,0.78)";
const PINK_BORDER = "#e8749b";

const BASE_SCALE = {
    x: {
        ticks: { color: "#5c2c16", font: { size: 10 }, maxRotation: 45 },
        grid:  { color: "rgba(255,214,231,0.4)" }
    },
    y: {
        beginAtZero: true,
        ticks: { color: "#5c2c16", font: { size: 10 } },
        grid:  { color: "rgba(255,214,231,0.5)" }
    }
};

function barDataset(data) {
    return {
        data,
        backgroundColor: PINK_BG,
        borderColor:     PINK_BORDER,
        borderWidth: 1.5,
        borderRadius: 6,
        borderSkipped: false
    };
}

function renderCharts(info) {
    if (pagesChartInst) { pagesChartInst.destroy(); pagesChartInst = null; }
    if (timeChartInst)  { timeChartInst.destroy();  timeChartInst  = null; }

    pagesChartInst = new Chart(document.getElementById("pagesChart"), {
        type: "bar",
        data: { labels: info.labels, datasets: [barDataset(info.pages)] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: BASE_SCALE
        }
    });

    timeChartInst = new Chart(document.getElementById("timeChart"), {
        type: "bar",
        data: { labels: info.labels, datasets: [barDataset(info.timeHours)] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: BASE_SCALE.x,
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: "#5c2c16",
                        font: { size: 10 },
                        callback: v => v + "h"
                    },
                    grid: BASE_SCALE.y.grid
                }
            }
        }
    });
}

function toggleEdit() {
    editOpen = !editOpen;
    document.getElementById("editArea").classList.toggle("edit-area--hidden", !editOpen);
    if (editOpen) renderEditTable(getPeriodInfo());
}

function renderEditTable(info) {
    const area    = document.getElementById("editArea");
    const allData = getAllDailyData();
    let rows = [];

    if (statsMode === "year") {
        info.days.forEach(monthDays =>
            monthDays.forEach(key => {
                const e = allData[key];
                if (e && (e.pages > 0 || e.seconds > 0))
                    rows.push({ key, label: key, pages: e.pages || 0, minutes: Math.round((e.seconds || 0) / 60) });
            })
        );
    } else {
        info.days.forEach((key, i) => {
            const e = allData[key] || { pages: 0, seconds: 0 };
            rows.push({ key, label: info.labels[i], pages: e.pages || 0, minutes: Math.round((e.seconds || 0) / 60) });
        });
    }

    if (rows.length === 0) {
        area.innerHTML = '<p class="edit-empty">Nessun dato registrato per questo periodo.</p>';
        return;
    }

    area.innerHTML = `<table class="edit-table">
        <thead><tr><th>Data</th><th>Pagine</th><th>Minuti studiati</th><th></th></tr></thead>
        <tbody>${rows.map(r => `<tr>
            <td>${r.label}</td>
            <td><input class="edit-input" type="number" id="ep-${r.key}" value="${r.pages}" min="0"></td>
            <td><input class="edit-input" type="number" id="em-${r.key}" value="${r.minutes}" min="0"></td>
            <td><button class="save-row-btn" onclick="saveEditRow('${r.key}')">Salva</button></td>
        </tr>`).join("")}</tbody></table>`;
}

function saveEditRow(key) {
    const pages   = Math.max(0, Number(document.getElementById("ep-" + key)?.value) || 0);
    const seconds = Math.max(0, (Number(document.getElementById("em-" + key)?.value) || 0) * 60);
    const allData = getAllDailyData();
    allData[key] = { pages, seconds };
    saveDailyData(allData);
    refreshStats();
    const btn = document.querySelector(`[onclick="saveEditRow('${key}')"]`);
    if (btn) { btn.textContent = "✓"; setTimeout(() => btn.textContent = "Salva", 1400); }
}

/* =============================================
   INIT
   ============================================= */

rebuildBoxes();
render();
updateStopwatch();
updateTimer();
updateTotalTime();
updateSpeed();
