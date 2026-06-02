# 🚌 Real-Time Driver Location Tracking Implementation

## Overview

This implementation adds real-time GPS location tracking for drivers to the Tanakoli transit app. When a driver (phone: 0775453629) is logged in and in Driver Mode, their location is continuously sent to Firebase Realtime Database and displayed on the map as a pink/magenta bus marker that updates in real-time.

## Features Implemented

### 1. **Driver Location Hook** (`hooks/use-driver-location-tracking.ts`)
- Automatically starts/stops `navigator.geolocation.watchPosition()` when driver enters/exits mode
- Sends GPS coordinates to Firebase Realtime Database at `drivers/{driverPhone}/location`
- Updates every few seconds with location changes (only sends if location changed by >10m)
- Clears location from Firebase when driver logs out or closes app
- Handles geolocation errors gracefully

### 2. **Driver Dashboard Updates** (`components/driver-dashboard.tsx`)
- Integrated `useDriverLocationTracking` hook to automatically track location when in Driver Mode
- Added live tracking status indicator in header showing "تتبع مباشر" (Live Tracking) with animated pulse
- Status stays active while driver is logged in and Driver Mode is active

### 3. **Map Component Enhancement** (`components/leaflet-map.tsx`)
- **Real-time listener** for driver location from Firebase Realtime Database
- **Dynamic marker rendering** that:
  - Creates a pink/magenta bus marker with special styling
  - Updates smoothly when driver moves
  - Removes marker when driver goes offline (location deleted from Firebase)
- **Visual styling**:
  - 28px circular marker with white border
  - Pink/magenta gradient background (#ec4899 to #db2777)
  - Animated pulse effect with radiating glow
  - Hover scale effect (1.15x) with enhanced shadow
  - Higher z-index (600) than all other markers for visibility
- **Popup information**: Shows driver identification and coordinates

### 4. **Firebase Integration**
- **Realtime Database paths**:
  - `drivers/0775453629/location` - Stores `{lat: number, lng: number}`
  - Automatically deleted when driver logs out
- **Read-only access**: All users can see driver location in real-time
- **Zero persistence**: Location data is ephemeral and auto-clears on logout

## Technical Architecture

### Data Flow

```
Driver App (Browser)
    ↓
navigator.geolocation.watchPosition()
    ↓
useDriverLocationTracking Hook
    ↓
Firebase Realtime Database (drivers/0775453629/location)
    ↓
Map Component (Real-time Listener)
    ↓
Pink/Magenta Marker on Map
```

### Firebase Realtime Database Structure

```
drivers/
  └── 0775453629/
      └── location/
          ├── lat: 35.4377
          └── lng: 7.1458
```

## Security Considerations

### Current Implementation
- **Public visibility**: Driver location is readable by all authenticated users
- **Write-only restriction**: Only the driver's app can write their location
- **Auto-cleanup**: Location data is removed when driver logs out
- **No history**: Location data is ephemeral; no audit trail

### Recommended Firebase Rules (for production)

```json
{
  "rules": {
    "drivers": {
      "$driverPhone": {
        "location": {
          ".read": true,
          ".write": "auth.token.phone_number == '+213' + root.child('drivers').child($driverPhone).val()",
          ".validate": "newData.hasChildren(['lat', 'lng']) && newData.child('lat').isNumber() && newData.child('lng').isNumber()"
        }
      }
    }
  }
}
```

## Testing

### Manual Testing in Browser

1. **Open Driver Dashboard**:
   - Login with driver phone: +213775453629
   - Click to enter Driver Mode
   - Should see "تتبع مباشر" status in header

2. **Allow Location Access**:
   - Browser will request geolocation permission
   - Accept to start tracking

3. **View on Map**:
   - Open map view
   - Should see pink/magenta marker with driver icon
   - Marker updates as location changes

### Testing with Simulation Script

```bash
# Start the simulation (updates location every 5 seconds)
node scripts/test-driver-location.js

# In another terminal, open the app and watch the marker move
# The marker will follow the predefined route waypoints in Khenchela city
```

### Browser Console Logs

The implementation includes debug logging:
- `[v0] Starting driver location tracking` - When tracking begins
- `[v0] Location updated: {lat, lng}` - When location changes
- `[v0] Stopping driver location tracking` - When tracking stops
- `[v0] Driver location updated: {lat, lng}` - When map receives update
- `[v0] Driver marker created at:` - When marker first appears
- `[v0] Driver marker removed (offline)` - When driver goes offline

## Important Phone Numbers

- **Authorized Driver**: `+213775453629` (0775453629)
  - This is the only phone configured to use Driver Mode
  - Their location is tracked at `drivers/0775453629/location`

## Firebase Configuration

The Firebase config includes the Realtime Database URL:
```javascript
databaseURL: "https://tanakoli-khenchela-default-rtdb.firebaseio.com"
```

This is imported in `lib/firebase.ts` and exported as `rtdb`:
```javascript
import { getDatabase } from "firebase/database"
export const rtdb = getDatabase(app)
```

## Files Modified/Created

### Created
- `/hooks/use-driver-location-tracking.ts` - Location tracking hook

### Modified
- `/lib/firebase.ts` - Added Realtime Database support
- `/components/driver-dashboard.tsx` - Integrated location tracking
- `/components/leaflet-map.tsx` - Added driver marker rendering

### Test/Demo
- `/scripts/test-driver-location.js` - Simulation script for testing

## Browser Requirements

- **Geolocation API**: Requires HTTPS in production (HTTP works in dev)
- **Permission**: Browser must grant geolocation permission
- **Firebase**: Active internet connection to Firebase

## Future Enhancements

1. **Route Assignment**: Display driver's current assigned route
2. **Speed Indicator**: Show current speed on marker
3. **History Tracking**: Store location trail for analytics
4. **Multi-Driver**: Support multiple simultaneous driver tracking
5. **ETA Calculation**: Calculate ETA to next stop based on location
6. **Geofencing**: Alert when driver approaches/leaves stations
7. **Battery Optimization**: Reduce update frequency based on battery level

## Troubleshooting

### Marker not appearing
- Check browser console for errors
- Verify geolocation permission is granted
- Check Firebase Realtime Database URL is correct
- Ensure driver is in Driver Mode

### Location not updating
- Check if location actually changed (>10m threshold)
- Verify browser's geolocation is functioning
- Check Firebase Rules allow read access
- Verify internet connection to Firebase

### High power usage
- Reduce watchPosition accuracy requirements
- Implement battery-aware update intervals
- Stop tracking when app is in background

## API References

- [Navigator.geolocation](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/geolocation)
- [Firebase Realtime Database](https://firebase.google.com/docs/database)
- [Leaflet Markers](https://leafletjs.com/reference.html#marker)
