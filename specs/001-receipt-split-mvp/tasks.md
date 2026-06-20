# Tasks: Receipt Split MVP

**Input**: Design documents from `specs/001-receipt-split-mvp/`

## Phase 1: Setup

- [x] T001 Initialize the Vite React TypeScript project in `package.json`, `index.html`, and `src/main.tsx`
- [x] T002 [P] Configure TypeScript and Vite in `tsconfig.json`, `tsconfig.app.json`, and `vite.config.ts`
- [x] T003 [P] Add repository ignores and project instructions in `.gitignore` and `README.md`

## Phase 2: Foundational

- [x] T004 Define receipt and participant domain types in `src/domain/types.ts`
- [x] T005 Implement currency parsing, formatting, and split calculation in `src/domain/splitCalculator.ts`
- [x] T006 [P] Create editable sample receipt extraction adapter in `src/services/receiptExtraction.ts`
- [x] T007 [P] Prototype payment handoff helpers (later removed by T036)
- [x] T008 Add calculation and handoff unit tests in `tests/split-calculator.test.ts`

## Phase 3: User Story 1 — Build an Accurate Split (P1) MVP

**Independent Test**: Enter participants and assign all sample items; explained totals
must reconcile to the receipt total.

- [x] T009 [US1] Build the application state and step navigation in `src/App.tsx`
- [x] T010 [P] [US1] Build editable receipt controls in `src/components/ReceiptEditor.tsx`
- [x] T011 [P] [US1] Build participant and item assignment controls in `src/components/AssignmentBoard.tsx`
- [x] T012 [P] [US1] Build reconciliation and per-person totals in `src/components/SplitSummary.tsx`
- [x] T013 [US1] Integrate calculation, validation, and step gating in `src/App.tsx`

## Phase 4: User Story 2 — Review Receipt Extraction (P2)

**Independent Test**: Select a receipt image, receive an editable draft, and recover via
manual entry if extraction is unavailable.

- [x] T014 [US2] Add upload and extraction review states in `src/components/ReceiptEditor.tsx`
- [x] T015 [US2] Integrate the extraction adapter and confidence messaging in `src/App.tsx`

## Phase 5: User Story 3 — Settle with US Payment Apps (P3)

**Independent Test**: Superseded by the local save and portable sharing scope in Phase 9.

- [x] T016 [US3] Prototype payment handoff cards (later removed by T036)
- [x] T017 [US3] Gate and integrate settlement handoffs in `src/components/SplitSummary.tsx`

## Phase 6: Polish and Validation

- [x] T018 [P] Create responsive visual system and accessibility states in `src/styles.css`
- [x] T019 [P] Add product metadata in `index.html`
- [x] T020 Run and document `npm test` and `npm run build` validation in `specs/001-receipt-split-mvp/quickstart.md`

## Phase 7: Participant Management Refinement

- [x] T021 [US1] Add confirmed participant removal and assignment cleanup in `src/components/AssignmentBoard.tsx`
- [x] T022 [US1] Prevent deleting the final participant in `src/components/AssignmentBoard.tsx`
- [x] T023 [US1] Make participant and assignment controls wrap or scroll safely for 20 participants in `src/styles.css`
- [x] T024 Add participant removal coverage in `tests/participant-management.test.ts`
- [x] T025 Re-run `npm test`, `npm run build`, and mobile browser validation

## Phase 8: Mobile Receipt Editor Refinement

- [x] T026 Make receipt item rows shrink safely and stack on narrow screens in `src/styles.css`
- [x] T027 Verify Step 1 at 320px and 390px widths without horizontal page overflow
- [x] T028 Re-run `npm test` and `npm run build`

## Phase 9: Zero-Cost Persistence, Advanced Splits, and Sharing

- [x] T029 Extend item split modes and shares in `src/domain/types.ts`
- [x] T030 Implement equal, quantity, percentage, and fixed allocation in `src/domain/splitCalculator.ts`
- [x] T031 Add versioned local persistence in `src/services/localSplitStorage.ts`
- [x] T032 Add URL snapshot encoding and decoding in `src/services/shareSnapshot.ts`
- [x] T033 Add split mode and share editors in `src/components/AssignmentBoard.tsx`
- [x] T034 Replace payment handoffs with local save and share controls in `src/components/SplitSummary.tsx`
- [x] T035 Add shared-copy identity selection and reset behavior in `src/App.tsx`
- [x] T036 Remove deferred Venmo and Zelle implementation files and UI
- [x] T037 Add calculation, storage, and sharing tests in `tests/`
- [x] T038 Run build, tests, reload restoration, and shared-link browser validation

## Phase 10: Supabase Live Collaboration

- [x] T039 Add Supabase schema, RPCs, RLS, and Realtime publication in `supabase/migrations/001_live_rooms.sql`
- [x] T040 Add configured Supabase client in `src/services/supabaseClient.ts`
- [x] T041 Add anonymous room create, join, load, save, and subscribe service in `src/services/liveRoom.ts`
- [x] T042 Add room create/join/status controls in `src/components/LiveRoomControls.tsx`
- [x] T043 Integrate revision-aware remote synchronization and local fallback in `src/App.tsx`
- [x] T044 Validate live room create and join against the configured Supabase project
- [x] T045 Complete two-tab live update validation; tests and production build pass

## Phase 11: Free On-Device Receipt OCR

- [x] T046 Add browser OCR dependency and receipt text parser in `src/services/receiptExtraction.ts`
- [x] T047 Add OCR progress, error, and raw-text review state in `src/components/ReceiptEditor.tsx`
- [x] T048 Integrate real uploaded-file extraction state in `src/App.tsx`
- [x] T049 Add receipt parser tests in `tests/receipt-extraction.test.ts`
- [x] T050 Run tests, build, and browser upload-state validation

## Phase 12: Receipt OCR Accuracy Pass

- [x] T051 Add image upscaling, grayscale, and contrast preprocessing in `src/services/receiptExtraction.ts`
- [x] T052 Configure receipt-oriented page segmentation and spacing in `src/services/receiptExtraction.ts`
- [x] T053 Recover common OCR price punctuation errors in `src/services/receiptExtraction.ts`
- [ ] T054 Run parser tests, production build, and real receipt retest

## Dependencies and Execution Order

- Setup blocks all other phases.
- Foundational tasks block user stories.
- User Story 1 is the MVP and provides state used by Stories 2 and 3.
- User Story 2 and User Story 3 can proceed in parallel after User Story 1.
- Polish follows all selected stories.

## Parallel Opportunities

- T002 and T003 can run in parallel after T001.
- T006 and T007 can run in parallel after T004.
- T010, T011, and T012 can run in parallel after T009.
- T014 and T016 can run in parallel after User Story 1.
- T018 and T019 can run in parallel after feature integration.

## Implementation Strategy

Complete Setup and Foundational work, then deliver User Story 1 as the independently
testable MVP. Add extraction review and payment handoffs as separate increments. Finish
with responsive styling, automated checks, and quickstart validation.
