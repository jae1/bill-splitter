# Implementation Plan: Receipt Split MVP

**Branch**: `main` | **Date**: 2026-06-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-receipt-split-mvp/spec.md`

## Summary

Create a mobile-first single-page web application that demonstrates the complete
receipt splitting journey with editable sample extraction, advanced item assignment,
currency-safe totals, reconciliation, local persistence, and portable URL sharing. Keep OCR
behind an adapter so a real extraction service can replace the sample parser later.
Purchased quantity remains receipt metadata; allocation weights may divide those items
among any number of participants, including more participants than purchased units.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+

**Primary Dependencies**: React 19, Vite 7, Supabase JavaScript client

**Storage**: Browser localStorage, URL fragment snapshots, optional Supabase Postgres rooms

**Testing**: Vitest and Testing Library

**Target Platform**: Modern mobile and desktop browsers

**Project Type**: Single-page web application

**Performance Goals**: Interactive shell within 2 seconds on a typical mobile connection;
split recalculation appears immediate for up to 100 items and 20 participants

**Constraints**: USD-only MVP, no account requirement, no paid API, no backend, URL size
limits for sharing, accessible responsive UI

**Scale/Scope**: One host, one receipt per active session, three primary screens, mock
receipt extraction boundary

## Constitution Check

- **Explainable Totals**: PASS — calculation output includes subtotal, tax, tip, and total.
- **Human-Controlled AI**: PASS — extraction produces an editable draft.
- **Reconciliation Before Settlement**: PASS — settlement is disabled until reconciled.
- **Fast Guest-First Flow**: PASS — no authentication and a three-step mobile flow.
- **Privacy and Payment Boundaries**: PASS — session-only data and explicit handoff copy.
- **Spec-Driven Delivery**: PASS — spec, plan, tasks, tests, and validation are required.

Post-design review: PASS. No constitutional exceptions are required.

## Project Structure

### Documentation (this feature)

```text
specs/001-receipt-split-mvp/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── components/
├── data/
├── domain/
├── services/
├── App.tsx
├── main.tsx
└── styles.css

tests/
└── split-calculator.test.ts
```

**Structure Decision**: A single Vite application is sufficient for an interactive
product skeleton. Domain calculation and payment handoff logic remain framework-neutral
under `src/domain` and `src/services`.

## Complexity Tracking

No constitution violations or additional architectural layers are required.
