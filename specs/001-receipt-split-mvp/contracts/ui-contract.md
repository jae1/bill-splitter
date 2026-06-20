# UI Contract: Receipt Split MVP

## Step 1 — Receipt

- Accept an image selection and expose a visible extraction state.
- Populate an editable draft from the extraction adapter.
- Allow direct manual entry and correction of item, tax, tip, and total values.
- Continue only when at least one valid item exists.

## Step 2 — Assign

- Add, rename, and remove participants.
- Assign an item to one or multiple participants.
- Display unassigned items prominently.
- Recalculate participant totals after every assignment.

## Step 3 — Summary

- Display receipt reconciliation and per-person explanation lines.
- Disable settlement actions while the split is unreconciled.
- Save the active split automatically on the current device.
- Create a portable share URL and explain that recipients receive independent copies.

## Accessibility

- Every input has a programmatic label.
- Interactive controls work by keyboard.
- Status and validation do not rely on color alone.
- Layout remains usable at 320 CSS pixels wide.
