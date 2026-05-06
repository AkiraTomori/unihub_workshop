# UniHub Workshop Frontend

ReactJS + TailwindCSS client integrated with the Express API.

## Run

```bash
npm install
npm run dev
```

## Covered UI modules

- Authentication with email/password login (JWT session)
- Student workshop listing, seats, registration, payment states, QR ticket, notifications
- Admin workshop management (create/edit/cancel), PDF upload for AI summary states, analytics cards
- Checker flow is mobile-only (web shows mobile-only notice for checker role)
- CSV nightly sync monitoring panel

## Environment

Create `.env` in `src/frontend`:

```bash
VITE_API_BASE_URL=http://localhost:4000/api
```
