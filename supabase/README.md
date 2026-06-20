# Supabase setup

1. Open the project dashboard.
2. In **Authentication → Providers**, enable **Anonymous Sign-Ins**.
3. Open **SQL Editor**, paste `migrations/001_live_rooms.sql`, and run it once.
4. Keep automatic RLS enabled.
5. Restart the local Vite server after changing `.env.local`.

The migration creates room and membership tables, RLS policies, secured RPC functions,
and adds the room table to the `supabase_realtime` publication.

The browser uses only the publishable key. Never place a secret or service-role key in
the Vite environment.

For a new environment, only `migrations/001_live_rooms.sql` is required.
