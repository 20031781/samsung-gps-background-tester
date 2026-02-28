# Samsung GPS Background Tester (Expo + TypeScript)

Mini app React Native (Expo managed) per testare raccolta GPS in background su Android Samsung.
UI minimale con 3 schermate:
1. **Home**: start/stop tracking + stato sessione.
2. **Setup**: checklist permessi/impostazioni.
3. **Sessions/Export**: elenco sessioni, export CSV/JSONL, dump diagnostica.

## Setup

```bash
npm install
npm run start
```

Per Android (consigliato):
```bash
npm run android
```

> Nota: per background location affidabile su Android è consigliato un build dev client / release, non solo Expo Go.

## Build/Run

- `npm run start`: Metro + QR.
- `npm run android`: esegue su emulator/device Android.
- `npm run lint`: lint frontend.
- `npm run type-check`: controllo TypeScript.

## Parametri tracking

In Home puoi impostare:
- `timeInterval` (default 5000 ms): frequenza minima richiesta.
- `distanceInterval` (default 5 m): distanza minima richiesta.
- `deferredUpdatesInterval` (default 15000 ms): batch interval OS.
- `deferredUpdatesDistance` (default 20 m): batch distance OS.

Tracking usa:
- `expo-location.startLocationUpdatesAsync`
- `accuracy: Highest`
- foreground service Android con notifica persistente **“Tracking attivo”**.

Ogni punto salvato include (direttamente o in `rawJson`):
- timestamp ISO, lat/lon, accuracy, altitude, altitudeAccuracy, speed, heading
- info provider se disponibile
- battery level/state (best effort)
- appState dedotto
- sessionId e seq incrementale

## Persistenza

SQLite (`expo-sqlite`) con tabelle:
- `sessions`
- `points`
- `logs`
- `kv` (stato runtime / errori)

Indici:
- `(sessionId, seq)`
- `(ts)`

## Export dati

Schermata Sessions/Export:
- selezioni sessione
- export in:
  - `CSV`
  - `JSONL` (un punto per riga)
- file salvati in `FileSystem.documentDirectory/exports/`
- condivisione via `expo-sharing`

## Setup guidato e troubleshooting Samsung

In Setup:
1. Richiesta permessi foreground + background location.
2. Richiesta permesso notifiche.
3. Link impostazioni location e notifiche.
4. Link impostazioni battery optimization (Android).
5. Se device Samsung: sezione “Samsung tips” con passi pratici:
   - Device care → Battery → Background usage limits
   - Never sleeping apps
   - Controllo Always allow location

### Note Android 12+

- Il background location richiede foreground service + notifica persistente.
- Samsung può limitare processi in background: le ottimizzazioni batteria possono interrompere il tracking.

## Dump diagnostics

Produce un JSON con:
- platform, brand/model, OS version
- permessi foreground/background
- location services enabled
- battery optimization status (`unknown` in managed se non ricavabile)
- app version/build
- last task error

## Config Expo (`app.json`)

Permessi Android impostati:
- `ACCESS_FINE_LOCATION`
- `ACCESS_COARSE_LOCATION`
- `ACCESS_BACKGROUND_LOCATION`
- `FOREGROUND_SERVICE`
- `FOREGROUND_SERVICE_LOCATION`
- `POST_NOTIFICATIONS`
- `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`

Plugin:
- `expo-location` (background + foreground service)
- `expo-notifications`

## Test manuali suggeriti

1. **Camminata 10 minuti, schermo acceso**:
   - Avvia tracking, percorri un tratto, verifica incremento `seq` e punti.
2. **Camminata 10 minuti, schermo spento**:
   - Blocca schermo, continua movimento, riapri app e verifica `last update` + nuovi punti.
3. **Test aggressivo Samsung**:
   - Senza whitelist batteria, verifica eventuali gap.
   - Poi aggiungi in “Never sleeping apps” e ripeti confronto.
4. **Export**:
   - Esporta CSV/JSONL, controlla ordinamento `seq`, timestamp e assenza buchi evidenti.
