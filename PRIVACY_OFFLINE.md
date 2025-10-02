# Privacy & Offline Policy

Spaced Repetition Desktop is designed for fully offline use. This document summarises the guarantees enforced by the Tauri shell and highlights the controls that keep personal study data private.

## Network behaviour

- The application never performs outbound network requests. All assets, fonts, and scripts are bundled locally.
- The Content Security Policy is locked to `default-src 'self'; connect-src 'none'`, blocking accidental requests from third-party libraries.
- Automatic updates are intentionally disabled. New versions must be downloaded and installed manually.
- No telemetry, analytics, crash reporting, or usage metrics are collected.

## Data residency

- Topics, categories, and reminder configuration are persisted to a single JSON database (`data.json`) on disk.
- Installed builds use `%APPDATA%\SpacedRepetition` while portable builds store everything in a sibling `data/` directory.
- Daily rolling backups (7 copies) provide crash protection without ever leaving the device.

## Notifications

- Reminder notifications are generated locally. The scheduler runs inside the Tauri process and does not require any network connectivity or a Microsoft account.
- Notification payloads contain only the topic title, category label, and reminder time. They are not transmitted elsewhere.

## User controls

- Manual “Export JSON” / “Import JSON” actions allow the user to create explicit backups or migrate between machines.
- A “Create backup now” action creates a timestamped copy in the local `Backups/` folder.
- “Open storage folder” opens the on-disk data directory so the user can inspect or purge files as needed.

## Auditing & verification

- Running the binary behind a firewall or with tools such as `netstat` will show that no network sockets are opened after startup.
- The datastore (`data.json`) is human-readable JSON with a version header for transparency.
- Source code under `src-tauri/` contains the Tauri commands responsible for file IO, enabling independent audits.
- The repository includes `npm run offline:audit`, which fails if disallowed external URLs slip into the codebase. Add it to the
  CI pipeline to enforce the zero-network policy over time.

Questions or issues? Open a ticket in the repository with details about the environment and a copy of any relevant log output.

