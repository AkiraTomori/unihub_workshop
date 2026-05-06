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

- Android emulator: `http://10.0.2.2:4000/api`
- iOS simulator: `http://localhost:4000/api`
- Real device: `http://<your-lan-ip>:4000/api`

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
