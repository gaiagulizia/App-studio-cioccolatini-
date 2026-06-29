"""
patch-manifest.py
Aggiunge permessi e dichiarazione del TimerService
all'AndroidManifest.xml generato da Capacitor.
Viene eseguito da GitHub Actions durante la build.
"""

import re
import sys
import os

MANIFEST = "android/app/src/main/AndroidManifest.xml"

if not os.path.exists(MANIFEST):
    print(f"ERRORE: {MANIFEST} non trovato — hai eseguito 'npx cap add android'?")
    sys.exit(1)

with open(MANIFEST, "r", encoding="utf-8") as f:
    xml = f.read()

# ── Permessi da aggiungere ─────────────────────────────────────────────────
PERMISSIONS = """\
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
"""

# ── Dichiarazione del servizio ─────────────────────────────────────────────
SERVICE = """\
        <service
            android:name=".TimerService"
            android:foregroundServiceType="specialUse"
            android:exported="false">
            <property
                android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"
                android:value="timer" />
        </service>
"""

changed = False

# Aggiunge permessi prima del tag <application> (solo se non già presenti)
if "FOREGROUND_SERVICE" not in xml:
    xml = re.sub(r'(\s*)(<application)', lambda m: m.group(1) + PERMISSIONS + m.group(2), xml, count=1)
    print("✓ Permessi aggiunti al manifest")
    changed = True
else:
    print("ℹ  Permessi già presenti, salto")

# Aggiunge il servizio prima di </application> (solo se non già presente)
if "TimerService" not in xml:
    xml = xml.replace("</application>", SERVICE + "\n    </application>", 1)
    print("✓ TimerService aggiunto al manifest")
    changed = True
else:
    print("ℹ  TimerService già presente, salto")

if changed:
    with open(MANIFEST, "w", encoding="utf-8") as f:
        f.write(xml)
    print(f"✓ {MANIFEST} salvato")
else:
    print("ℹ  Nessuna modifica necessaria")

print("\nContenuto rilevante del manifest:")
for i, line in enumerate(xml.splitlines()):
    if any(k in line for k in ["FOREGROUND", "WAKE_LOCK", "TimerService", "POST_NOTIF"]):
        print(f"  {i+1}: {line.strip()}")
