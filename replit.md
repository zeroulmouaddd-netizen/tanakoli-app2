# تنقلي خنشلة (Tanakoli Khenchela)

A smart urban transportation app for the city of Khenchela, Algeria. Serves both passengers and bus drivers with real-time bus tracking, route management, and a digital wallet system for fare payments via QR codes.

## Tech Stack

- **Framework**: Next.js 15.5 (App Router) with TypeScript
- **Styling**: Tailwind CSS 4.0, Framer Motion, Lucide React
- **Backend/Database**: Firebase Firestore (user data, transactions), Firebase Realtime Database (live GPS tracking), Firebase Auth (phone-based auth)
- **Maps**: Leaflet, MapLibre GL, React Leaflet
- **UI**: Radix UI, Shadcn UI patterns

## Running the App

The app runs on port 5000:

```bash
npm run dev
```

## Environment Variables

All Firebase configuration is stored as environment variables (shared):

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL`

## Key Features

- **Passenger Mode**: Real-time bus tracking on map, station listings, QR-based fare payment
- **Driver Mode**: Toggle to driver dashboard for route management and live GPS broadcasting
- **Digital Wallet**: Balance management, QR code generation and scanning for payments
- **Admin Dashboard**: Live map of all drivers, fund transfers (at `/admin`)

## User Preferences

- Keep Arabic RTL layout and UI text as-is
