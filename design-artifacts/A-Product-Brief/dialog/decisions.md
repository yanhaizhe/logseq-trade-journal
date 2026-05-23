# Key Decisions Log

**Project:** logseq-trade-journal
**Format:** Append-only decision log

---

## Decision 1: Greenfield Development Path

**Date:** 2026-05-21
**Step:** Phase 0 - Project Setup
**Session:** 1

**Context:**
The user wants to completely redesign their trade journal & learning system around K-line chart interactive notes. Although there is some existing code, the system is being re-conceived from first principles.

**What was decided:**
Adopt the WDS Greenfield process starting from Phase 1 (Product Brief) and Phase 2 (Trigger Mapping).

**Why:**
This ensures the core strategic positioning, Logseq integration boundaries, and user psychology triggers are fully mapped before building high-fidelity components and pages.

**Impact:**
Development is guided by design specifications, ensuring high visual and UX quality.

**Alternatives considered:**
- Brownfield evolution (skip planning) — rejected because the architecture of Logseq integration and the learning/trading subsystems require a fresh product concept.

**Documented in:** [wds-project-outline.yaml](../_progress/wds-project-outline.yaml)

---

## Decision 2: Tech Stack & Custom Component Styling

**Date:** 2026-05-21
**Step:** Phase 0 - Project Setup
**Session:** 1

**Context:**
The user has an existing Vite + React + TS workspace. They need a custom component library with premium visual styling.

**What was decided:**
Use React (Vite + TS) and write custom Vanilla CSS (no Tailwind CSS, no standard UI kits).

**Why:**
Vanilla CSS allows maximum flexibility to implement custom glassmorphism, responsive K-line drawing tools, and TradingView-like aesthetic enhancements without being boxed in by framework defaults.

**Impact:**
Ensures visual excellence and high performance, but requires writing bespoke CSS tokens and layout rules.

**Alternatives considered:**
- Tailwind CSS — rejected as user preferred standard styling controls and wanted maximum aesthetic control without utility bloat.

**Documented in:** [wds-project-outline.yaml](../_progress/wds-project-outline.yaml)

---

## Decision 3: Asset Class Scope and Personal Stakes

**Date:** 2026-05-21
**Step:** Phase 1 - Welcome & Setup
**Session:** 1

**Context:**
The trade journal needs to be versatile enough to cover the user's trading activities across multiple markets.

**What was decided:**
Design the system to support: A-shares, Cryptocurrencies, US Stocks, Futures, HK Stocks, and Forex. Keep documentation minimal as this is a personal hobby project.

**Why:**
These asset classes have different data feeds and annotation needs, but the underlying note-taking and trade journaling principles remain consistent.

**Impact:**
The UI needs to support different market data formats and display custom metadata for each asset class (e.g., leverage for Forex/Futures, gas fees for Crypto).

**Alternatives considered:**
- Narrow down to A-shares only — rejected because the user trades all of these classes.

**Documented in:** [client-profile.md](client-profile.md)

---

## Decision 4: Non-Commercial / Personal Utility Model

**Date:** 2026-05-21
**Step:** Phase 1 - Determine Business Model
**Session:** 1

**Context:**
The plugin needs to be clear on whether it will target external users, require subscriptions, or serve as a commercial product.

**What was decided:**
The system is designated as a 100% non-commercial, personal utility tool tailored specifically to Yale's individual trading and learning habits.

**Why:**
This eliminates all scope bloat such as subscription billing, user account databases, cloud sync APIs, and multi-tenant security rules. It allows the development to focus entirely on local-first performance, Logseq markdown integration, and custom K-line interactive notes.

**Impact:**
All data resides locally within Yale's Logseq folder. Architecture decisions will favor local-first state management (React state, localStorage, Logseq's local DB API) rather than cloud databases.

**Alternatives considered:**
- Building a commercial Logseq SaaS plugin — rejected because the user's primary goal is personal utility, learning, and fast iteration for their own trading.

---

## Decision 5: Product Brief Synthesis

**Date:** 2026-05-21
**Step:** Step 12 - Review & Synthesis
**Session:** 1

**Context:**
All strategic, technical, and styling boundaries have been explored, discussed, and aligned.

**What was decided:**
Finalized the strategic narrative and compiled the Complete Product Brief document. Key choices on KLineCharts dependency, local FastAPI servers, and local-first architecture have been locked.

**Impact:**
All subsequent WDS phases (Trigger Mapping, Scenarios, UX design, and development) will trace back to this brief.

**Documented in:**
- `design-artifacts/A-Product-Brief/01-product-brief.md`
- `_bmad-output/A-Product-Brief/project-brief.md`
- `dialog/progress-tracker.md`

---

_Continue appending decisions as they're made throughout the Product Brief process._

