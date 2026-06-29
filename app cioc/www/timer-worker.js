/**
 * timer-worker.js
 * Gira su un thread separato (Web Worker).
 * Nel browser evita il throttling del main thread.
 * Nell'APK Capacitor il thread Worker sopravvive anche
 * con schermo spento grazie al WakeLock nativo.
 */

let swInterval    = null;
let timerInterval = null;
let swSecs        = 0;
let timerSecs     = 0;

self.onmessage = function (e) {
    const { cmd, value } = e.data;

    switch (cmd) {

        /* ---- CRONOMETRO ---- */
        case 'sw-start':
            if (swInterval) return;
            swSecs = (value !== undefined) ? value : swSecs;
            swInterval = setInterval(() => {
                swSecs++;
                self.postMessage({ type: 'sw-tick', seconds: swSecs });
            }, 1000);
            break;

        case 'sw-stop':
            clearInterval(swInterval);
            swInterval = null;
            break;

        case 'sw-reset':
            clearInterval(swInterval);
            swInterval = null;
            swSecs = 0;
            self.postMessage({ type: 'sw-tick', seconds: 0 });
            break;

        case 'sw-sync':
            swSecs = value;
            break;

        /* ---- TIMER (conto alla rovescia) ---- */
        case 'timer-start':
            if (timerInterval) return;
            timerSecs = (value !== undefined) ? value : timerSecs;
            timerInterval = setInterval(() => {
                timerSecs--;
                self.postMessage({ type: 'timer-tick', seconds: timerSecs });
                if (timerSecs <= 0) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                    self.postMessage({ type: 'timer-done' });
                }
            }, 1000);
            break;

        case 'timer-stop':
            clearInterval(timerInterval);
            timerInterval = null;
            break;

        case 'timer-reset':
            clearInterval(timerInterval);
            timerInterval = null;
            timerSecs = value;
            self.postMessage({ type: 'timer-tick', seconds: value });
            break;

        case 'timer-sync':
            timerSecs = value;
            break;
    }
};
