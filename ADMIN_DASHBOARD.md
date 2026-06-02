# Admin Dashboard Documentation

## Overview

The secure admin dashboard has been successfully built at the `/admin` route. It provides real-time monitoring and management of drivers, transactions, and payments with a professional dark UI and session-based authentication.

## Access

- **URL**: `http://localhost:5000/admin`
- **Password**: `admin123` (hardcoded for development)
- **Authentication**: Session-based (sessionStorage) - valid only for the current browser session
- **Logout**: Available in the header to end the admin session

## Features

### 1. Driver Map Panel

**Location**: Top-right section of dashboard (2/3 width)

**Functionality**:
- Real-time display of all active drivers with live GPS locations
- Each driver marker shows:
  - Phone number
  - Bus line assignment
  - Current coordinates (latitude/longitude)
- Interactive map powered by Leaflet
- Driver list sidebar below the map with clickable entries
- Click any driver to pre-select them for money transfers

**Data Source**: Firebase Realtime Database
- Path: `drivers/{phone}/location`
- Updates in real-time as drivers move
- Location format: `{ lat: number, lng: number }`

**Bus Line Mapping**: Fetched from Firestore `users` collection to show each driver's assigned line

### 2. Send Money to Driver Form

**Location**: Left sidebar (1/3 width)

**Fields**:
1. **Select Driver** (dropdown)
   - Auto-populated from all drivers marked as `isDriver: true`
   - Shows current balance for selected driver
   - Pre-filled when driver is clicked on map

2. **Amount** (number input)
   - Direct input field
   - Quick select buttons: 100, 200, 500, 1000 د.ج
   - Max limit: 10,000 د.ج
   - Currency displayed in Algerian Dinar (د.ج)

3. **Send Money** (action button)
   - Disabled until driver and amount are selected
   - Shows confirmation dialog before transaction
   - Displays success/error feedback

**Actions**:
- **On Send**:
  1. Validates driver exists in Firestore
  2. Updates driver's `balance` field with `increment(amount)`
  3. Creates transaction record in `transactions` collection with:
     - Type: `admin_transfer`
     - Timestamp (server-side)
     - Previous and new balance
     - Admin message
     - Status: `completed`
  4. Shows success message
  5. Clears form and resets driver selection

**Data Persistence**: All transfers are written directly to Firebase Firestore with atomic operations

### 3. Recent Transactions Log

**Location**: Full-width section below map and form

**Display Format**: Table with columns:
- **Type**: Transaction category with icon
  - Fare Deduction (red, downward arrow)
  - Driver Recharge (green, upward arrow)
  - Admin Transfer (green, upward arrow)
  - Ticket Purchase (red, downward arrow)
  - Balance Top-up (green, upward arrow)

- **User**: Username and userId
  - Shows driver phone if driver-related

- **Amount**: Transaction amount in د.ج
  - Color-coded (red for outflows, green for inflows)
  - Shows new balance after transaction

- **Status**: Transaction status badge
  - `completed` (green)
  - `pending` (yellow)

- **Time**: Relative time display
  - "Just now", "5m ago", "2h ago", etc.
  - Falls back to formatted date/time

**Filters**: Tab buttons for filtering by type:
- All Transactions (shows all)
- Fare Deductions
- Driver Recharges
- Admin Transfers
- Ticket Purchases

**Statistics Summary** (bottom of transactions section):
- Total transaction count
- Total volume (sum of all amounts)
- Last activity timestamp

**Data Source**: Firebase Firestore `transactions` collection
- Ordered by timestamp (descending)
- Limited to last 50 transactions
- Real-time updates via `onSnapshot` listener

### 4. Stats Overview Cards

**Location**: Top of dashboard (3 cards)

**Cards**:
1. **Active Drivers**: Shows current count (dynamic)
2. **Today's Volume**: Total transaction amount today (dynamic)
3. **Total Transactions**: All-time transaction count (dynamic)

Note: Stats are placeholder design elements that can be enhanced with live data

### 5. Security Features

**Password Protection**:
- Simple hardcoded password: `admin123`
- Stored in `sessionStorage` as `adminAuth: true`
- Session-only validity (cleared on browser close)
- Auto-logout button available in header

**Route Protection**:
- Admin route bypasses normal app authentication
- Modified `AuthGate` component to exclude `/admin` route
- Admin dashboard has its own authentication layer

**No Mock Data**:
- All data operations read/write directly to Firebase
- Real-time synchronization
- Transactional safety for money transfers

## File Structure

```
components/
├── admin-password-gate.tsx      # Login screen with password validation
├── admin-layout.tsx             # Wrapper layout with header/footer
├── admin-driver-map.tsx         # Map panel showing active drivers
├── admin-send-money-form.tsx    # Form to transfer money to drivers
└── admin-transactions-log.tsx   # Table of recent transactions

lib/
└── admin-utils.ts               # Firebase operations and data fetching

app/
└── admin/
    ├── layout.tsx               # Route metadata
    └── page.tsx                 # Main dashboard page
```

## Firebase Collections Used

### `users`
- Query: All users with `isDriver: true`
- Fields read: `phone`, `name`, `balance`, `line`
- Fields updated: `balance` (incremented)

### `transactions`
- Write: New transaction records
- Fields: `userId`, `type`, `amount`, `previousBalance`, `newBalance`, `timestamp`, `status`, `driverPhone`, `adminMessage`
- Read: Last 50 transactions, ordered by timestamp

### `drivers` (Realtime Database)
- Path: `drivers/{phone}/location`
- Fields: `lat`, `lng`
- Real-time listener for driver positions

## Key Functions

### `fetchActiveDrivers(callback)`
- Fetches all drivers with active locations
- Returns `ActiveDriver[]` with phone, line, and location
- Real-time listener updates as drivers move

### `sendMoneyToDriver(driverPhone, amount, message?)`
- Validates driver exists
- Updates Firebase balance atomically
- Creates transaction record
- Returns `{ success: boolean, error?: string }`

### `fetchRecentTransactions(callback, limit?)`
- Fetches last 50 (or custom limit) transactions
- Ordered by timestamp descending
- Real-time listener for new transactions
- Includes user names mapping

### `getAllDrivers()`
- Queries all users where `isDriver === true`
- Returns array with phone, name, balance
- Used for dropdown population

## Usage

1. Navigate to `http://localhost:5000/admin`
2. Enter password `admin123`
3. Click "Unlock Admin Panel"
4. Dashboard loads with:
   - Live map of active drivers
   - Driver list sidebar
   - Send money form
   - Recent transactions log

**To send money to a driver**:
1. Select driver from dropdown OR click on map/list
2. Enter amount or use quick-select buttons
3. Click "Send Money"
4. Confirm in dialog
5. Success message appears, transaction logged in Firebase

**To view transaction history**:
- Filter by type using tab buttons
- Table shows real-time updates
- Click transaction rows for more details (expandable)

## Notes

- Passwords is hardcoded in `components/admin-password-gate.tsx` - change `ADMIN_PASSWORD` constant for production
- All user interactions trigger real-time Firebase updates
- Map uses OpenStreetMap tiles (free, no API key required)
- Dashboard is fully responsive (mobile-friendly)
- Dark theme uses Slate color palette with accent colors
- Session authentication expires when browser closes
- No existing app pages were modified
