# Research: Receipt Split MVP

## Decision: Use integer cents for all money calculations

**Rationale**: Integer arithmetic prevents floating-point drift and makes residual-cent
allocation deterministic and testable.

**Alternatives considered**: Floating-point numbers were rejected because ordinary
decimal currency values can produce reconciliation errors.

## Decision: Build a client-only product skeleton

**Rationale**: The first increment validates the interaction model and calculation rules
without creating premature account, database, or deployment infrastructure.

**Alternatives considered**: A full API and database were deferred until persistence,
collaboration, or production OCR is in scope.

## Decision: Put receipt extraction behind an adapter

**Rationale**: OCR provider choice affects cost, privacy, accuracy, and backend design.
An adapter lets the skeleton model loading, review, confidence, and failure states now.

**Alternatives considered**: Binding directly to one OCR vendor was rejected before
receipt samples and accuracy targets are established.

## Decision: Defer payment-provider features

**Rationale**: The current product focuses on calculation, free local persistence, and
portable sharing without payment-provider dependencies.

**Alternatives considered**: Direct payment processing and bank integrations are outside
the MVP because they introduce provider approval, security, and compliance obligations.

## Decision: Use React, TypeScript, Vite, and Vitest

**Rationale**: This stack supports a quick mobile-first prototype, typed domain logic,
fast local iteration, and focused tests with little infrastructure.

**Alternatives considered**: A server-rendered framework was deferred because the
skeleton has no authenticated or server-owned data.
