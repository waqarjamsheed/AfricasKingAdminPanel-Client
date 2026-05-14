# Client UI Handoff

This branch is only for client app UI work.

## What you should work on

- `app/`
- `app/ui/`
- `app/components/`
- `public/`
- client-safe files in `lib/`

## What is already removed

- backend API code
- admin panel
- reseller panel
- cloud functions
- server secrets/integrations

## How the app works

There are 2 data sources in this branch:

1. Firebase Web SDK
- used for login/auth
- used to read Firestore data for the client screens

2. External backend APIs
- used for checkout, billing, renew, cancel, email/session flows
- the frontend calls them through `NEXT_PUBLIC_CLIENT_API_BASE_URL`

## Env you need

Copy `.env.example` to `.env.local`.

Required:

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
- app download URLs

## Firebase data used by the client

The client reads these Firestore collections:

- `users`
- `transactions`
- `provisions`

If you are testing on your own Firebase project, create sample data in those collections as needed for UI states.

## Main client routes

- `/`
- `/login`
- `/register`
- `/register/invite/[code]`
- `/forgot`
- `/dashboard`
- `/subscription`
- `/subscribe`
- `/credentials`
- `/account`
- `/change-password`

## API endpoints used by the client

These are called from the frontend:

- `GET /api/settings/public`
- `POST /api/auth/session`
- `DELETE /api/auth/session`
- `POST /api/auth/send-verification`
- `POST /api/auth/password-reset`
- `POST /api/admin/notifications/signup`
- `POST /api/ref/assign`
- `GET /api/ref/capture`
- `POST /api/checkout/preview`
- `POST /api/checkout`
- `GET /api/subscription/eligibility`
- `POST /api/billing/portal`
- `POST /api/renew/now`
- `POST /api/renew/sync`
- `POST /api/stripe/sync`
- `POST /api/subscription/cancel`

Base URL:

- if `NEXT_PUBLIC_CLIENT_API_BASE_URL=https://example.com`
- then `/api/checkout` becomes `https://example.com/api/checkout`

## Working rule

Keep your changes focused on UI only.

If a screen needs backend support that does not exist yet:

- do not add backend code in this branch
- document the expected request/response shape
- leave the final backend wiring for integration in the main repo
