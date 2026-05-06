# Hướng dẫn chạy dự án

## Backend (`src/backend`)

```bash
cd src/backend
cp .env.example .env
npm install
npm run dev
```

Before running backend, execute `src/database/supabase-schema.sql` in Supabase SQL Editor.

## Frontend (`src/frontend`)

```bash
cd src/frontend
cp .env.example .env
npm install
npm run dev
```

## Mobile (`src/mobile`)

```bash
cd src/mobile
flutter pub get
flutter run
```

Set backend URL in `src/mobile/lib/services/api_client.dart` (`ApiClient.baseUrl`) for emulator/device networking.

## Mobile React Native (`src/mobile-rn`)

```bash
cd src/mobile-rn
npm install
npm run start
```

Set backend URL in `src/mobile-rn/src/api/client.js`.
