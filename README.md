# AddressID — clickable prototype

A two-sided clickable prototype for an address‑permission platform. It shows
both sides of the product: what a **regular user** sees and what a **partner
company** sees. All state lives in memory in the browser (`src/store.tsx`) and
resets to seed data on reload.

## 🔗 Live demo

**https://hrayr2112.github.io/addressid-prototype/**

Sign in with:

| Role    | Username | Password |
| ------- | -------- | -------- |
| User    | `admin`  | `admin`  |
| Partner | `admin`  | `admin`  |

## What's inside

Intro screen → **Sign in as User** or **Sign in as Partner**.

### User cabinet (`src/UserApp.tsx`)
- **My Addresses** — active, pending review, and an inactive toggle; "Add
  address" submits a new one for review (it auto-approves to Active shortly
  after, then partners can request it by its Address ID).
- Address detail with linked Accesses; you can deactivate an address (this
  cascades its Accesses to Inactive and shows up in the partner's Action Required).
- **Accesses** — grouped by address; detail + activity history; change the
  address on an Access and the partner is notified.
- **Notifications** — incoming partner requests with Approve / Decline; on
  approval you pick an active address of the requested type.

### Partner cabinet (`src/PartnerApp.tsx`)
- **Overview** — live counters and quick actions.
- **New Access** — request form (Address ID + name + type) → Pending.
- **Accesses** — approved accesses with detail + history.
- **Action Required** — Inactive accesses with Request new Access / Snooze / Close.
- **Recent Changes** — change feed with unread indicators.
- **My Account** — brand and managing agent.

### End-to-end flow
Partner sends a New Access request → the user gets a notification → the user
approves and picks an address → the Access appears for both sides and lands in
the partner's Recent Changes.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

## Deploy an update

```bash
npm run build
# push the contents of dist/ to the gh-pages branch (served at the URL above)
```

Built with Vite + React + TypeScript.
