# UniHub Mobile (React Native)

React Native (Expo) mobile app integrated with existing backend APIs.

## Covered Functionalities

- Auth login with email/password
- Role-based mobile navigation:
  - Student: workshop list, search, sort, pagination, register, paid payment flow, QR tickets, notifications
  - Admin: create/cancel workshop, upload document trigger, analytics, csv log overview
  - Checker: online QR verify scan, offline queue, sync batch

## Configure backend URL

Edit `src/api/client.js`:

- Android emulator: `http://10.0.2.2:3000/api`
- iOS simulator: `http://localhost:3000/api`
- Real device: `http://<your-lan-ip>:3000/api`

Or set environment variable when starting Expo:

```bash
EXPO_PUBLIC_API_BASE_URL=http://<your-lan-ip>:3000/api npm run start
```

## Run

```bash
cd src/mobile-rn
npm install
npm run start
```

Then press:
- `a` for Android
- `i` for iOS (macOS)
- or scan QR in Expo Go
