# Produttività — Costruire l'APK senza installare nulla

## Cosa serve

- Un **browser** (Chrome, Firefox, Safari…)
- Un **account GitHub gratuito** → https://github.com/signup

Nient'altro. GitHub compila l'APK al posto tuo nel cloud.

---

## Passo 1 — Crea un account GitHub (se non ce l'hai)

1. Vai su **https://github.com/signup**
2. Inserisci email, password, nome utente
3. Verifica l'email

---

## Passo 2 — Crea un nuovo repository

1. Vai su **https://github.com/new**
2. Nome repository: `produttivita` (o qualsiasi nome)
3. Lascia **Public** (o scegli Private, funziona uguale)
4. Clicca **Create repository**

---

## Passo 3 — Carica tutti i file

Nella pagina del repository appena creato:

1. Clicca **"uploading an existing file"** (link sotto il titolo)
   oppure **Add file → Upload files**

2. Trascina **TUTTA la cartella APK** mantenendo la struttura:

```
.github/
    workflows/
        build.yml        ← avvia la compilazione automatica
android-src/
    MainActivity.java
    TimerPlugin.java
    TimerService.java
    manifest-additions.xml
www/
    index.html
    style.css
    script.js
    timer-worker.js
    manifest.json
capacitor.config.json
package.json
patch-manifest.py
README.md
```

> ⚠️ La cartella `.github` inizia con un punto ed è nascosta su Windows.
> Assicurati di includerla — contiene il workflow che avvia la build.

3. Clicca **Commit changes**

---

## Passo 4 — Aspetta la build (5–10 minuti)

1. Vai al tab **Actions** del tuo repository
2. Vedrai un job in esecuzione: **"Build APK"**
3. Quando diventa verde ✅ la build è completata

---

## Passo 5 — Scarica l'APK

1. Clicca sul job completato
2. Scorri in basso fino ad **Artifacts**
3. Clicca **Produttivita-APK** → scarica uno zip
4. Estrai lo zip → dentro c'è `app-debug.apk`

---

## Passo 6 — Installa sul telefono Android

1. Invia l'APK al telefono (email, WhatsApp, Drive, USB…)
2. Aprilo sul telefono
3. Se compare "Installazione bloccata":
   - Impostazioni → Sicurezza → **Installa app sconosciute** → abilita
4. Installa e apri

---

## Come funziona il timer con schermo spento

```
Premi Start
    ↓
JS → TimerNative.startTimer()   [Capacitor Bridge]
    ↓
Android avvia TimerService come Foreground Service
    ↓
TimerService acquisisce CPU WakeLock
(il processore NON va in sleep)
    ↓
Ogni secondo: decrementa → broadcast → JS → aggiorna UI
    ↓
Barra di stato mostra il tempo rimanente
    ↓
Fine: notifica "Tempo finito! 🎉"
```

Nel **browser** (non APK) viene usato un Web Worker — più preciso
di un normale setInterval ma non garantisce il funzionamento
con lo schermo spento.

---

## Aggiornare l'app

Modifica qualsiasi file su GitHub (icona matita ✏️)
→ salva → la build riparte → scarica il nuovo APK.

---

## Se la build fallisce

Vai su Actions → clicca il job → leggi il log rosso.

| Errore | Soluzione |
|--------|-----------|
| `manifest not found` | Controlla che `patch-manifest.py` sia nella root |
| `TimerService not found` | Controlla che `android-src/` sia stato caricato |
| `build.yml not found` | Controlla che `.github/workflows/build.yml` sia presente |
| Errore Gradle generico | Actions → **Re-run all jobs** |
