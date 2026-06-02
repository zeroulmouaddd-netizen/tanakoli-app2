# Admin Dashboard Quick Reference

## Access
- **URL**: `/admin`
- **Password**: `admin123`
- **Logout**: Header button

## Three Main Panels

### 1. Driver Map Panel (Right, 2/3 width)
```
Real-time GPS tracking of all active drivers
├── Interactive Leaflet map
├── Driver markers with phone & line
├── Driver list sidebar (clickable)
└── Updates live as drivers move
```
**Firebase Path**: `drivers/{phone}/location`

### 2. Send Money Form (Left, 1/3 width)
```
Transfer money directly to driver wallet
├── Driver dropdown (auto-populated)
├── Amount input + quick presets
├── Current balance display
└── Send button with confirmation
```
**Firebase Collection**: `users` (balance field)
**Transaction Logged**: `transactions` collection

### 3. Recent Transactions Log (Full width, bottom)
```
Live feed of all system transactions
├── 5 filter tabs (All, Fare, Recharge, Admin, Ticket)
├── Table: Type | User | Amount | Status | Time
├── Color-coded amounts (red=-,green=+)
├── Stats summary (count, volume, last activity)
└── Real-time updates
```
**Firebase Collection**: `transactions` (last 50, ordered by timestamp desc)

## Quick Actions

### Send Money to Driver
1. Click driver in map OR select from dropdown
2. Enter amount (or use 100/200/500/1000د.ج buttons)
3. Click "Send Money"
4. Confirm in dialog
5. ✓ Money sent, transaction logged

### Filter Transactions
- Click tab: "Fare Deductions", "Driver Recharges", "Admin Transfers", etc.
- Table updates instantly
- Stats recalculate

### View Driver Details
- Click any driver marker on map
- Info popup shows: name, line, balance, coordinates
- "Select" button pre-fills the form

## Firebase Integration

### Real-Time Data Sources
- **Drivers**: Fetched from `drivers/{phone}/location` (RTDB)
- **Drivers List**: From `users` collection where `isDriver=true`
- **Transactions**: From `transactions` collection (last 50)

### Operations
- **Read**: `onSnapshot()` listeners for real-time updates
- **Write**: `updateDoc()` + `increment()` for atomic balance updates
- **Create**: `addDoc()` to log transactions
- **Validate**: Query users by phone before money transfer

## Security
- Session-based (sessionStorage)
- Password required on entry
- Logout available in header
- No mock data - all real Firebase operations
- Hardcoded password in production (should be changed)

## File Overview
- `components/admin-*.tsx` - 4 main components
- `lib/admin-utils.ts` - Firebase operations
- `app/admin/page.tsx` - Main dashboard
- `components/auth-gate.tsx` - Modified to bypass auth for `/admin`

## Styling
- Dark theme (Slate palette)
- Tailwind CSS
- Professional business UI
- Responsive design
- Gradient accents (blue, emerald, cyan)

## Notes
- Map loads Leaflet (openstreetmap, no API key needed)
- Dashboard auto-refreshes transaction log
- Driver positions update in real-time
- All money transfers are atomic (no partial updates)
- No data lost - everything persisted in Firebase
