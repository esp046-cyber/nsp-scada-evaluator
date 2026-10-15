# GridProof – NSP Interface Qualification PWA

Offline-capable, zero-dependency tool for assessing SCADA vendors against NSP grid-connection criteria
(named 33kV interface, IEC 61850/DNP3 in service, NSP-witnessed FAT/SAT/energisation, prior NSP relationship).

## Run locally
    python3 -m http.server 8080   # then open http://localhost:8080
(Service workers need http://localhost or https, not file://.)

## Deploy on GitHub Pages
1. Create a repo and push the contents of this folder to the `main` branch root.
2. Settings → Pages → Source: "Deploy from a branch" → `main` / `/ (root)`.
3. Open the published URL; use the browser's Install option to add it as an app.

## Notes
- Data is stored in the browser's localStorage only; nothing leaves the device.
- Bump `CACHE_NAME` in `sw.js` whenever you change any file, so users receive updates.
- Scoring: 30 + 30 + 25 + 15 = 100. A non-compliant answer on criteria 1–3 is a critical blocker (High risk).

## v3 features
- Multiple assessments: create, rename, delete and switch between vendor/project records (stored in localStorage).
- Point list tab: 10 NSP demarcation signals; required points not fully in scope become critical blockers.
- Evidence tab: attach FAT/SAT sheets or SLDs; the app logs name, size, date and SHA-256 hash. Files themselves are not stored.
  Hashing needs https or localhost (Web Crypto requirement).
- Data from v2 is migrated into the first assessment on first load.

## v4 features
- 5-step guided flow (Profile, Core criteria, 33kV point list, Evidence, Final report) with Next/Back; steps can also be clicked freely.
- "?" help dialog, shown automatically on first visit, covering the steps, critical blockers and SHA-256 hashing.
- Collapsible "Auditor tip" boxes (what to ask for, red flags) on each criterion, the point list and the evidence step.
- Demo buttons add a sample passing (Vendor A BESS) or failing (Vendor B rooftop solar) assessment as a new record. Sample data only.
- Final report step shows the full review and holds the export buttons.
