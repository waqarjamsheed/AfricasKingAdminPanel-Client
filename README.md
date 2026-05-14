AfricasKing Client UI Share Branch

This repo branch is a frontend-only version of the client app for UI integration work.

## Stack

- Next.js App Router
- TypeScript
- Tailwind
- Firebase Web SDK

## What this branch is for

- updating client app UI
- integrating new screens/components
- improving layout, styling, and frontend interactions

## What is not in this branch

- backend API implementation
- admin panel
- reseller panel
- cloud functions
- server secrets

## Setup

1. Copy `.env.example` to `.env.local`
2. Fill in your own Firebase client config
3. Set `NEXT_PUBLIC_CLIENT_API_BASE_URL` if you want the app to call a real backend
4. Install dependencies:
```bash
npm install
```
5. Run locally:
```bash
npm run dev
```

## Important env

- `NEXT_PUBLIC_CLIENT_API_BASE_URL`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Optional:

- `NEXT_PUBLIC_FIRESTICK_APP_URL`
- `NEXT_PUBLIC_STREAM_URL_TEMPLATE`
- app download links

## How data works here

The frontend uses:

- Firebase Auth for login/session state
- Firestore reads for `users`, `transactions`, and `provisions`
- external API calls for checkout/billing/subscription actions

API calls are routed through `lib/clientApi.ts`.

If `NEXT_PUBLIC_CLIENT_API_BASE_URL` is set, the app will call that backend.

## Main routes

- `/`
- `/login`
- `/register`
- `/forgot`
- `/dashboard`
- `/subscription`
- `/subscribe`
- `/credentials`
- `/account`
- `/change-password`

## Working scope

Please keep changes limited to:

- `app/`
- `app/ui/`
- `app/components/`
- `public/`
- client-safe files in `lib/`

Do not add backend/server code in this branch.

## More context

See [docs/client-ui-scope.md](AfricasKingAdminPanel/docs/client-ui-scope.md:1) for the short handoff notes.
