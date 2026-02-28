# OilCalcApp v2.0

**Petroleum Product Loss Control & Monitoring Platform**

Full-chain logistics monitoring for petroleum product transportation:

- Refinery → Port
- Port → Depot
- Depot → Gas Station

## Features (inherited from v1)

- Mass/Volume calculator (ASTM D1250-04)
- Trip Loss analysis with multi-point support
- Density corrections (Table 54A/54B, 60A/60B)
- History with full data retention
- iOS 26 Liquid Glass UI design
- Dark/Light theme support
- Bilingual (EN/RU)

## v2.0 Roadmap

- [ ] Route templates (predefined logistics chains)
- [ ] Product nomenclature (Ai-92, Ai-95, Diesel, Crude, etc.)
- [ ] Loss tolerance norms and alerts
- [ ] Analytics dashboard
- [ ] Cloud sync (Firebase)
- [ ] Multi-user roles (Surveyor, Manager, Director)
- [ ] PDF/Excel export
- [ ] Offline mode with sync

## Tech Stack

- Vite 6
- Vanilla JS (no framework)
- Firebase Hosting
- CSS Liquid Glass design system

## Development

```bash
npm install
npm run dev
```

## Build & Deploy

```bash
npm run build
firebase deploy --only hosting
```
