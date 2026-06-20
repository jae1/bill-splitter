# Quickstart: Receipt Split MVP

## Run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Validate

1. Load the sample receipt or select an image to trigger the extraction draft.
2. Confirm that receipt items, tax, tip, and total can be edited.
3. Add at least three participants.
4. Assign one item to one person and one item to multiple people.
5. Confirm unassigned items keep the split from reconciling.
6. Assign all items and verify participant totals sum to the receipt total.
7. Reload and confirm the split is restored.
8. Copy a share link, open it separately, and confirm it creates an independent copy.

## Automated checks

```bash
npm test
npm run build
```

Validated on 2026-06-19:

- `npm test`: 3 tests passed
- `npm run build`: production build completed
- Browser smoke test: all three sections rendered with no console errors
- Supabase live room: room creation, joining, and cross-tab receipt updates validated
