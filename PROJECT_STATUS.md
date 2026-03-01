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
| Storage | localStorage | `ShipmentService` for CRUD |
| Deploy | Firebase Hosting | `npx firebase deploy --only hosting` |
| PDF | html2canvas + jsPDF | Dynamic import for code splitting |

## File Structure

```
src/
├── main.js                     # App entry, tab navigation (Shipment, Calc, Dashboard, History, Settings)
├── styles/index.css            # All CSS (~2100 lines), responsive layout engine
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
│   ├── shipment-service.js     # localStorage CRUD for shipments
│   ├── analytics-service.js    # KPIs, trends, division comparison, risk heatmap, alerts
│   └── pdf-export.js           # PDF generation service
└── pages/
    ├── shipment-page.js        # New shipment form (multi-point)
    ├── calculator-page.js      # Mass/volume conversion calculator
    ├── dashboard-page.js       # Analytics dashboard (KPIs, charts, drill-down, filters)
    ├── history-page.js         # Shipment history list
    ├── config-page.js          # Settings (demo data load/clear)
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

## Next Steps (Prioritized)

### Phase 3 — Role-Based Views

- [ ] Role selector in Settings (Manager, QCLP, Verifier, Operator)
- [ ] Manager Dashboard — aggregated KPIs + subordinate divisions
- [ ] QCLP Dashboard — loss focus, investigations, exceedances
- [ ] Verifier Dashboard — validation queue, approval statuses

### Phase 4 — Backend & Auth

- [ ] Firebase Firestore (replace localStorage)
- [ ] Firebase Auth (login/roles)
- [ ] Real-time sync between devices

### Phase 5 — Advanced Features

- [ ] Operation Details screen (full shipment detail view)
- [ ] Trend comparison (month vs month, year vs year)
- [ ] Custom report builder
- [ ] Notification system for critical alerts

## Known Limitations

- **localStorage only** — no multi-device sync, data lost on cache clear
- **No authentication** — anyone can access any data
- **Demo data** — must be loaded manually from Settings
- **PDF export** — captures current viewport, not custom report layout
