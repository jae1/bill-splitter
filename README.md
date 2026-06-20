# FairShare

A Spec Kit-driven, mobile-first receipt splitter for US restaurant bills.

```bash
npm install
cp .env.example .env.local
npm run dev
```

The current skeleton uses editable sample extraction and keeps all data in the browser
session. See `specs/001-receipt-split-mvp/` for the specification and implementation plan.

Fill `.env.local` with the Supabase project URL and publishable key to enable live rooms.
The file is intentionally excluded from Git.
