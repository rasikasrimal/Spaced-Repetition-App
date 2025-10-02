# Spaced Repetition Desktop

This document describes how to build, install, and operate the offline Windows release of the Spaced Repetition dashboard. The desktop shell is implemented with Tauri 2 and the existing React/Tailwind UI from the web app so that all features remain identical while running entirely offline.

## Build requirements

- Windows 10 or 11 x64
- Node.js 18+
- Rust 1.77+
- `npm` for front-end dependencies

Install dependencies and produce a release build:

```bash
npm install
npm run tauri build
```

The build process outputs two artifacts under `src-tauri/target/release/`:

- `SpacedRep.exe` – portable binary. A portable ZIP can be produced by archiving the binary together with the generated `data/` folder.
- `SpacedRep_*.msi` / `SpacedRep_*.exe` – platform installer that registers the application in *Add/Remove Programs*.

## Installing

1. Download the signed installer (`SpacedRepetition_Setup_vX.Y.Z.exe`) and verify the Authenticode signature.
2. Run the installer. The application is placed under `%LOCALAPPDATA%\Programs\SpacedRepetition` and a shortcut is added to the Start menu.
3. Launch **Spaced Repetition**. On first run the app will request notification permissions so that review reminders can appear as Windows toasts.

### Portable mode

1. Extract `SpacedRepetition_Portable_vX.Y.Z.zip` to any folder.
2. Ensure the archive includes an empty `data/` directory next to `SpacedRep.exe`.
3. Run `SpacedRep.exe`. All storage, backups, and configuration stay inside the `data/` directory, making the app fully self-contained.

## Storage, backups, and resilience

- **Primary datastore:** `data.json`
  - Installed builds use `%APPDATA%\SpacedRepetition\data.json`.
  - Portable builds store the file in `<portable folder>\data\data.json`.
- **Atomic writes:** every state change writes to a temporary file and then atomically renames it into place so power loss does not corrupt data.
- **Daily backups:** the shell maintains a rolling seven day history inside `%APPDATA%\SpacedRepetition\Backups` (or `data/Backups` in portable mode). A manual “Create backup now” action is available from the settings panel.
- **Import/Export:** backups are plain JSON. Exported files include a version header and complete snapshot of topics and categories. Import replaces the current datastore and triggers a refresh in the UI.

## Notifications & reminders

The desktop shell runs a background scheduler that:

- Wakes every minute to evaluate reminders whose `nextReviewDate` is due.
- Emits a `spacedrep://notification` event and raises a native toast (via the Web Notification API) containing the topic title, category, and reminder time.
- Clears snoozed reminders once the snooze period expires.

For reliable reminders, keep the app running or enable “Run at startup” from the settings menu so the scheduler starts with Windows.

## Offline & privacy guarantees

- The webview is locked with a CSP of `default-src 'self'; connect-src 'none'` so no external hosts can be contacted.
- All fonts, images, and scripts are bundled locally. There is no telemetry, crash reporting, or auto-update channel.
- Network hardening can be audited by running the executable behind a firewall – zero outbound connections are attempted.
- Run `npm run offline:audit` to scan the repository for disallowed external URLs. Integrate this command into CI to guard the
  zero-network policy.

## Troubleshooting

| Issue | Resolution |
| --- | --- |
| Application reports that data is still loading | The datastore is initialising. Allow a few seconds for the first load or verify that the `%APPDATA%\SpacedRepetition` folder is writable. |
| Import fails with “Invalid backup” | Confirm the JSON file was exported by this version of the app and has not been modified manually. |
| Notifications do not appear | Open Windows **Notifications & actions** settings and ensure notifications are enabled for Spaced Repetition. |
| Portable mode does not persist data | Ensure a writable `data/` folder exists beside `SpacedRep.exe`. |

For further questions see `PRIVACY_OFFLINE.md` and the root `README.md`.

