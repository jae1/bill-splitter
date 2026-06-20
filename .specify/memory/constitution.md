<!--
Sync Impact Report
- Version change: template -> 1.0.0
- Added principles: Explainable totals; Human-controlled AI; Reconciliation before settlement;
  Fast guest-first flow; Privacy and payment boundaries
- Added sections: Product Constraints; Spec-Driven Delivery
- Templates reviewed: plan-template.md ✅, spec-template.md ✅, tasks-template.md ✅
- Follow-up TODOs: none
-->
# Bill Splitter Constitution

## Core Principles

### I. Explainable Totals
Every amount shown to a user MUST be traceable to receipt items, assignments, tax,
tip, discounts, fees, and rounding. The product MUST show enough detail for a
participant to understand and independently verify their total.

### II. Human-Controlled AI
Receipt extraction MAY accelerate data entry, but users MUST be able to review,
correct, add, and remove every extracted value before settlement. Low-confidence
or inconsistent results MUST be surfaced rather than silently accepted.

### III. Reconciliation Before Settlement
The sum of assigned items and allocated adjustments MUST reconcile with the receipt
total within an explicitly displayed rounding tolerance. The product MUST block or
clearly warn against finalizing a split when amounts do not reconcile.

### IV. Fast Guest-First Flow
The primary receipt-to-split journey MUST work without account creation and SHOULD
be completable in under two minutes for a typical receipt. Each screen MUST focus on
one decision and remain usable on a phone.

### V. Privacy and Payment Boundaries
Receipt images and participant details MUST be collected minimally, protected when
persisted, and removable by the user. The current product MUST keep receipt processing,
storage, and sharing on-device and MUST NOT include payment-provider integrations.

### VI. Zero-Cost Core
The core product MUST run without paid APIs, paid databases, or required server
infrastructure. Receipt processing, persistence, calculation, and sharing MUST use
browser capabilities or freely deployable static assets. Any future paid integration
requires a separate specification and explicit user opt-in.

## Product Constraints

- The initial market is United States consumers splitting restaurant bills in USD.
- The MVP MUST support item assignment, shared items, proportional tax and tip,
  manual corrections, and an auditable summary.
- Payment-provider integrations are deferred from the current product scope.
- Accessibility, responsive interaction, and clear error recovery are release gates.
- Prefer the smallest architecture that supports the current validated scope.

## Spec-Driven Delivery

Every feature MUST progress through a reviewed specification, implementation plan,
dependency-ordered task list, and implementation validation. User stories MUST be
independently testable. Tests are required for calculation rules, reconciliation,
money rounding, parsing boundaries, and settlement-link generation. A change that
alters user-visible financial calculations MUST update its specification and tests.

## Governance

This constitution takes precedence over informal project practices. Amendments MUST
include a rationale, affected artifacts, and a semantic version change. Pull requests
and implementation reviews MUST verify constitution compliance. Exceptions require
an explicit entry in the implementation plan's Complexity Tracking section and a
documented simpler alternative that was rejected.

**Version**: 1.0.0 | **Ratified**: 2026-06-19 | **Last Amended**: 2026-06-19
