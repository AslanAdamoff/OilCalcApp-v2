# OilCalcApp v2.0 — Project Status

> **Last updated:** 2026-03-01
> **Live:** <https://oilcalcapp-web.web.app>
> **Repo:** <https://github.com/AslanAdamoff/OilCalcApp-v2>

## Architecture

| Layer | Tech | Notes |
|-------|------|-------|
| Frontend | Vanilla JS + Vite 6 | No frameworks, SPA with tab navigation |
| Styling | Vanilla CSS | Century Gothic font, dark/light themes, glassmorphism |
| Charts | Custom SVG (`chart-engine.js`) | Line, bar, donut, stacked bar, sparkline — 0 deps |
| Auth | Firestore + SHA-256 | Custom auth, role-based access, session in localStorage |
| Storage | Firebase Firestore | Shared collection, all users see same data |
| Deploy | Firebase Hosting + Firestore | `npx firebase deploy` |
| PDF | html2canvas + jsPDF | Dynamic import for code splitting |

## File Structure

```
src/
├── main.js                     # App entry, auth gate, role-based tab navigation
├── styles/index.css            # All CSS (~2500 lines), responsive layout engine
├── components/
│   └── chart-engine.js         # SVG chart library (line, bar, donut, stacked, sparkline)
├── data/
│   ├── divisions.js            # 5 KMG divisions (PEM, DWS, RPG, RPB, RPM)
│   ├── locations.js            # 7 locations (refinery, depots, ports)
│   ├── routes.js               # 15 logistics routes with transport types
│   ├── products.js             # 12 petroleum products (gasoline, diesel, crude, chemicals)
│   ├── loss-thresholds.js      # Loss tolerance by transport type & product
│   └── demo-data.js            # Generator for 120+ realistic shipments
├── domain/
│   ├── shipment.js             # Shipment model & creation
│   ├── loss-evaluator.js       # Loss calculation, status evaluation (within_norm/warning/critical)
│   ├── formatters.js           # Number/date formatting utilities
│   └── astm-tables.js          # ASTM D1250 volume correction tables
├── services/
│   ├── firebase-config.js      # Firebase app + Firestore init
│   ├── auth-service.js         # Firestore auth, roles, user CRUD, SHA-256 hashing
│   ├── shipment-service.js     # Firestore CRUD for shipments (shared collection)
│   ├── analytics-service.js    # KPIs, trends, division comparison, risk heatmap, alerts
│   └── pdf-export.js           # PDF generation service
└── pages/
    ├── login-page.js           # Login form with demo account hints
    ├── shipment-page.js        # New shipment form (multi-point)
    ├── calculator-page.js      # Mass/volume conversion calculator
    ├── dashboard-page.js       # Analytics dashboard (KPIs, charts, drill-down, filters)
    ├── history-page.js         # Shipment history list
    ├── config-page.js          # Settings (demo data load/clear)
    ├── admin-page.js           # User management (admin only)
    └── about-page.js           # About page with theme toggle
```

## Completed Phases

### Phase 1 — Core App (inherited from v1)

- [x] Mass/volume conversion calculator (ASTM D1250)
- [x] Multi-point shipment form
- [x] Loss evaluation (within_norm / warning / critical)
- [x] Shipment history with localStorage
- [x] Dark/light theme toggle
- [x] Firebase Hosting deploy

### Phase 2A — Analytics Dashboard MVP

- [x] Analytics service (KPIs, trends, division comparison, product breakdown, alerts, heatmap)
- [x] Custom SVG chart engine (0 dependencies)
- [x] Demo data generator (120+ shipments)
- [x] Dashboard page with 6 KPI cards, 4 charts, 2 tables
- [x] Responsive layout (mobile → tablet → desktop)
- [x] Filter bar (period, division, product, status)

### Phase 2B — Dashboard Enhancement

- [x] Drill-down modals (click KPI cards or heatmap cells → detail table)
- [x] PDF export (html2canvas + jsPDF → A4 landscape)
- [x] Light theme CSS polish
- [x] All Russian text → English (НПЗ → Petromidia Refinery)
- [x] Century Gothic font consistency

### Phase 3+4 — Auth + Firestore + Role-Based Views

- [x] Firebase SDK integration (modular v10, tree-shakable)
- [x] Firestore for shared shipment data (all users see same data)
- [x] Firestore-based auth with SHA-256 hashed passwords
- [x] Login page with demo account hints
- [x] 6 default users (admin, ceo, manager, qclp, verifier, operator)
- [x] Role-based tab navigation (admin=all, operator=shipment+calc+settings)
- [x] Admin panel for user management (add/delete/change roles)
- [x] User header bar with name, role badge, logout
- [x] Firestore security rules (permanent, not 30-day test mode)

## Next Steps (Prioritized)

### Phase 5 — Advanced Features

- [ ] Operation Details screen (full shipment detail view)
- [ ] Trend comparison (month vs month, year vs year)
- [ ] Custom report builder
- [ ] Notification system for critical alerts
- [ ] Role-specific dashboards (Manager/QCLP customized views)

### Phase 6 — Production Hardening

- [ ] Firestore security rules (restrict by role)
- [ ] Password change functionality
- [ ] Session expiry
- [ ] Rate limiting

## Known Limitations

- **Firestore test rules** — currently `allow read, write: if true` (open access)
- **Demo data** — must be loaded manually from Settings by admin
- **PDF export** — captures current viewport, not custom report layout
- **No password change** — passwords set at user creation
