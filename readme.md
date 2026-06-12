# PRAEDICTA – Prediction Game with Virtual Points

## Overview
PRAEDICTA is a free, virtual‑points prediction market where users can create predictions about future events (crypto, weather, sports, politics) and bet YES/NO with virtual points. It auto‑resolves using 46+ APIs.

## Tech Stack
- Frontend: HTML/CSS/JS, Chart.js, Lightweight‑Charts, Supabase client
- Backend: Supabase (PostgreSQL, Edge Functions)
- Authentication: Solana Phantom wallet (message signing)
- Order book: Limit & market orders with automatic matching

## Setup for Developers
1. Clone the repository.
2. Set up a Supabase project and run the SQL migrations.
3. Deploy Edge Functions using Supabase CLI.
4. Configure environment variables (API keys, Sentry DSN, Oracle wallet).
5. Host frontend files (static hosting, e.g., GitHub Pages).

## How to Add a New Auto‑Resolve Source
- In `auto_resolve/index.ts`, add a new resolver function and call it in `resolvePrediction()`.
- Add the source name to the auto‑resolve dropdown in `index.html`.

## License
Free prediction game for entertainment only. No real money involved.