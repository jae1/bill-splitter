# Feature Specification: Receipt Split MVP

**Feature Branch**: `main`

**Created**: 2026-06-19

**Status**: Approved for planning

**Input**: Build a US-focused bill splitter where a host uploads a receipt, reviews
extracted items, assigns items to diners, saves locally, and shares a portable copy.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build an Accurate Split (Priority: P1)

A host uploads or starts from a receipt, corrects its line items, adds diners, assigns
each item to one or more people, and receives reconciled per-person totals including
tax and tip.

**Why this priority**: This is the product's essential value even without automated
extraction or payment handoff.

**Independent Test**: Enter a sample receipt, assign individual and shared items, and
verify that every person's explained total sums to the receipt total.

**Acceptance Scenarios**:

1. **Given** an empty split, **When** the host enters receipt items and participants,
   **Then** each item can be assigned to one or more participants.
2. **Given** assigned items, **When** the host enters tax and tip, **Then** those
   adjustments are allocated proportionally and visibly.
3. **Given** an unassigned item or total mismatch, **When** the host reviews the split,
   **Then** the product identifies the discrepancy before settlement.

---

### User Story 2 - Enter or Review Receipt Items (Priority: P2)

A host can enter items manually without a receipt photo. Optionally, they may upload a
photo to produce a draft that is reviewed before replacing any existing work.

**Why this priority**: Manual entry guarantees the product remains useful when OCR is
unavailable or inaccurate.

**Independent Test**: Starting from blank, add, edit, duplicate, reorder, and delete items
without uploading a file.

**Acceptance Scenarios**:

1. **Given** a blank split, **When** the host adds items manually, **Then** the complete
   split flow works without an uploaded image.
2. **Given** existing manual work, **When** extraction completes, **Then** the host sees a
   separate draft and chooses whether to apply it.
2. **Given** uncertain or inconsistent extraction, **When** the draft is displayed,
   **Then** questionable fields and total mismatches are clearly identified.
3. **Given** extraction failure, **When** the host continues, **Then** manual receipt
   entry remains available.

---

### User Story 3 - Save and Share a Split (Priority: P3)

The host's work is saved automatically on the current device and can be shared as a
portable link. A recipient opens an independent copy and may identify themselves or
continue editing without changing the host's local copy.

**Why this priority**: It prevents accidental data loss and enables coordination without
requiring accounts, servers, or paid infrastructure.

**Independent Test**: Reload after editing and verify restoration; create a share link,
open it in a separate browser context, and verify an independent copy is reconstructed.

**Acceptance Scenarios**:

1. **Given** an edited split, **When** the page reloads, **Then** the latest valid state
   is restored from the current browser.
2. **Given** a current split, **When** the host creates a share link, **Then** all receipt,
   participant, assignment, and split-rule data is encoded without uploading it.
3. **Given** a shared link, **When** a recipient opens it, **Then** an independent local
   copy is created and the recipient can highlight their participant identity.

---

### User Story 4 - Collaborate in a Live Room (Priority: P4)

A host creates a room and shares its room link. Anyone with the link joins through an
anonymous account, edits the same split, and sees remote changes without reloading.

**Why this priority**: Live collaboration removes the need to send updated copies while
preserving a no-registration experience.

**Independent Test**: Open one room in two browser contexts, change an assignment in one,
and verify the other receives the same revision.

**Acceptance Scenarios**:

1. **Given** a local split, **When** the host creates a room, **Then** the current state is
   stored and a room link is generated.
2. **Given** a valid room link, **When** another participant opens it, **Then** they join
   anonymously and load the latest shared state.
3. **Given** two connected clients, **When** one saves a valid change, **Then** the other
   receives the updated room state.

### Edge Cases

- A receipt contains duplicate names, quantity-based lines, discounts, service fees,
  negative adjustments, or an already-included gratuity.
- Quantity formats such as `3x Taco`, `Taco x3`, and `3 Taco` remain a single item with
  quantity three rather than three duplicate rows.
- An item is split among people in unequal shares or is left unassigned.
- Receipt math differs by one or more cents due to printed rounding.
- The uploaded file is unsupported, too large, blurry, rotated, or not a receipt.
- A participant owes zero, the host owes part of the bill, or one person paid everything.
- A shared URL is too large for a messaging service or contains malformed data.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The product MUST allow a host to create a split without registering.
- **FR-001a**: A new or reset split MUST start blank with no sample receipt values and
  no pre-created participants.
- **FR-002**: The product MUST support complete manual receipt entry without an image.
- **FR-003**: The product MUST present extracted receipt fields as an editable draft.
- **FR-003a**: Receipt OCR MUST run in the browser without a paid API and MUST show
  visible progress, success, and failure states.
- **FR-003b**: Extracted text MUST be parsed into candidate line items and totals; when
  parsing is uncertain, the raw recognized text MUST remain available for review.
- **FR-003c**: Before OCR, users MUST be able to preview, rotate, and crop the receipt
  image so surrounding tables, hands, and backgrounds are excluded from recognition.
- **FR-004**: The host MUST be able to add, edit, remove, and reorder receipt items.
- **FR-004a**: The host MUST be able to duplicate an item and rapidly add consecutive
  item rows using the keyboard.
- **FR-004b**: OCR results MUST NOT overwrite existing receipt data without explicit
  confirmation.
- **FR-005**: The host MUST be able to add, rename, and remove participants.
- **FR-005a**: Removing a participant MUST also remove that participant from every item
  assignment and MUST require confirmation when the participant has assigned items.
- **FR-006**: Each item MUST support one or more participant assignments.
- **FR-007**: Shared items MUST support equal shares in the MVP.
- **FR-007a**: Each item MUST support equal, quantity, percentage, and fixed-amount
  allocation modes.
- **FR-007b**: Quantity shares MUST be positive whole numbers, percentage shares MUST
  total 100%, and fixed-amount shares MUST total the item price before reconciliation.
- **FR-007c**: Purchased item quantity MUST be distinct from weighted split mode. Whole
  purchased units MUST be assignable to participants, and assigned units MUST equal the
  purchased quantity before reconciliation.
- **FR-008**: Tax, tip, discounts, and fees MUST be represented separately from items.
- **FR-009**: Tax and tip MUST default to proportional allocation by assigned subtotal.
- **FR-010**: The product MUST use currency-safe rounding and assign residual cents
  deterministically while showing where they were assigned.
- **FR-011**: The product MUST display unassigned items and reconciliation differences.
- **FR-012**: The product MUST show an explainable subtotal, adjustments, rounding, and
  final total for each participant.
- **FR-013**: Finalization MUST be blocked when required items are unassigned or the
  calculated total differs from the receipt beyond the displayed tolerance.
- **FR-014**: The active split MUST save automatically in browser storage after edits.
- **FR-015**: The host MUST be able to reset locally saved data intentionally.
- **FR-016**: The host MUST be able to generate a self-contained share link without
  uploading receipt or participant data to a server.
- **FR-017**: The host MUST be able to copy or share a plain-text split summary.
- **FR-018**: Uploaded receipt data MUST be removable from the active session.
- **FR-019**: Core calculation and correction flows MUST be keyboard accessible and
  usable on common phone screen sizes.
- **FR-020**: Participant controls and item assignment controls MUST remain fully visible
  and operable with at least 20 participants without overflowing their containers.
- **FR-021**: Receipt item names, prices, and confidence indicators MUST remain fully
  visible and editable without horizontal page overflow at a 320 CSS pixel viewport.
- **FR-021a**: Money inputs MUST use mobile-friendly decimal text entry without
  browser number steppers, and MUST preserve in-progress values such as `8`, `8.`,
  and `.75` while editing.
- **FR-022**: Opening a share link MUST create an independent local copy and MUST NOT
  mutate the sender's saved browser state.
- **FR-023**: A recipient MUST be able to select which participant represents them.
- **FR-024**: The product MUST support anonymous-authenticated live rooms when Supabase
  configuration and schema are available.
- **FR-025**: Only authenticated room members MUST be able to read or update a room.
- **FR-026**: Room updates MUST use monotonically increasing revisions to reduce silent
  overwrites.
- **FR-027**: If the live backend is unavailable, local persistence and portable sharing
  MUST remain usable.

### Key Entities

- **Receipt**: Merchant details, image reference, currency, line items, adjustments, and
  printed total.
- **Receipt Item**: Description, quantity, unit or line price, confidence, and assignments.
- **Participant**: Display name and optional selected identity in a shared copy.
- **Assignment**: Links an item to one or more participants with equal shares in the MVP.
- **Adjustment**: Tax, tip, discount, service fee, or rounding amount and allocation rule.
- **Split Summary**: Reconciled participant totals and explanation lines.
- **Payment Handoff**: Provider, recipient, amount, memo, and explicit completion status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user can complete a typical four-person, ten-item split in
  under two minutes after receipt review.
- **SC-002**: Every finalized split reconciles to the entered receipt total to the cent.
- **SC-003**: Users can identify the source of every participant charge without help.
- **SC-004**: At least 90% of usability-test participants complete the primary split flow
  on their first attempt.
- **SC-005**: A failed or inaccurate extraction never prevents completion by manual entry.
- **SC-007**: Selecting a supported image produces visible feedback within one second,
  even when recognition ultimately fails.
- **SC-006**: Payment handoffs always display the same amount as the finalized participant
  total and never imply unverified payment completion.

## Assumptions

- The initial release uses USD and targets US restaurant receipts.
- One host creates and edits the split; collaborative participant editing is later scope.
- Equal item sharing is sufficient for the MVP; custom percentages are later scope.
- Payment-provider integrations are deferred.
- Accounts, persistent history, bank credential storage, and payment processing are
  outside the initial skeleton.
