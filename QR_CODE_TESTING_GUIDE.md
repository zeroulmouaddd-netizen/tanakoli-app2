# QR Code Recharge Feature - Testing Guide

## Quick Start Testing

### Option 1: Manual Firestore Update (Fastest)

1. **Open the app and navigate to Account**
   ```
   https://your-app.com/account
   ```

2. **Open the QR Recharge Modal**
   - Click "شحن الرصيد" (Top-up Balance) button
   - Select "شحن عبر السائق" (Recharge via Driver) tab
   - Click the "شحن عبر السائق" button to open the modal

3. **Verify QR Code is Displayed**
   - You should see:
     - A QR code with pulse animation
     - Title: "شحن عبر السائق"
     - Instructions in Arabic
     - Current balance display
     - Close button

4. **Open Firebase Console**
   - Go to: https://console.firebase.google.com
   - Select your project
   - Go to Firestore Database
   - Navigate to: `users` → find your user document (by phone number)
   - Click the document to edit

5. **Update the Balance Field**
   - Find the `balance` field in your user document
   - Increase it by any amount (e.g., from 100 to 500)
   - Click "Save"

6. **Watch the Real-time Update**
   - The modal should update immediately:
     - ✅ Green success overlay appears
     - ✅ Shows amount added
     - ✅ Shows new balance
   - No page refresh needed!

### Option 2: Decode the QR Code (Verification)

1. **Open the QR Recharge Modal** (follow steps 1-3 above)

2. **Use a QR Code Decoder**
   - Online tool: https://zxing.org/w/decode.jspx
   - Browser extension: "QR Code Reader" extension
   - Mobile app: Any QR scanner

3. **Scan/Upload the QR Code**
   - Take a screenshot of the QR code
   - Upload to the decoder
   - You should see JSON data:
     ```json
     {
       "action": "recharge",
       "userId": "0771234567",
       "timestamp": 1717...
     }
     ```

4. **Verify the Data**
   - ✅ `action` = "recharge"
   - ✅ `userId` = Your actual phone number (from Firebase)
   - ✅ `timestamp` = Current time (valid timestamp)

### Option 3: Test with Browser Console

```javascript
// Open Developer Tools (F12) → Console tab
// Run these commands while the QR modal is open:

// Check if listener is active
console.log("Modal is listening for balance updates");

// Simulate what happens when Firestore updates
// (Requires Firebase Admin SDK or Firestore UI update)
```

### Option 4: Driver App Integration Test

If you have the driver app available:

1. **Open QR Recharge Modal** in passenger app
2. **Open Driver App**
3. **In Driver App**:
   - Look for "Scan Payment QR" or similar option
   - Scan the QR code from step 1
   - It should decode to: `{action: "recharge", userId: "..."}`
   - Process the top-up in driver app
4. **Watch Passenger App**:
   - Balance updates in real-time
   - Green success notification appears
   - New balance is displayed

## Testing Scenarios

### Scenario 1: Basic QR Code Generation
**Goal**: Verify real QR code is generated with actual user ID

**Steps**:
1. Login to account
2. Open QR Recharge modal
3. Scan QR code with phone camera or QR reader
4. Decode and verify JSON contains your actual userId

**Expected Result**: ✅ QR code contains actual Firebase user ID (not dummy data)

---

### Scenario 2: Real-time Balance Update
**Goal**: Verify balance updates without page refresh

**Steps**:
1. Open QR Recharge modal
2. Note current balance: e.g., "100 د.ج"
3. Open Firebase Console in another tab
4. Update user's balance field to 600
5. Return to app and watch for update
6. Confirm success notification appears with new balance

**Expected Result**: ✅ Balance updates to "600 د.ج" instantly, success overlay shows

---

### Scenario 3: Multiple Concurrent Updates
**Goal**: Verify app handles multiple balance updates

**Steps**:
1. Open QR Recharge modal
2. Rapidly update Firestore balance 3-4 times
3. Each time increase by 100: 100 → 200 → 300 → 400
4. Watch notifications

**Expected Result**: ✅ Each update shows success notification with correct new balance

---

### Scenario 4: Large Amount Transfer
**Goal**: Verify large amounts display correctly

**Steps**:
1. Open QR Recharge modal
2. Update balance from current value to current + 5000
3. Watch success notification

**Expected Result**: ✅ Large amount displays with proper formatting: "5,000 د.ج"

---

### Scenario 5: Modal Close and Reopen
**Goal**: Verify listener cleanup and fresh listener setup

**Steps**:
1. Open QR Recharge modal
2. Update balance in Firestore → see success notification
3. Close modal
4. Reopen modal
5. Update balance again → should see new success notification

**Expected Result**: ✅ Works correctly both times, no errors in console

---

### Scenario 6: Real Driver Scanning
**Goal**: Test with actual driver app scanning the QR code

**Prerequisites**:
- Driver app installed and configured
- Both apps connected to same Firebase project
- Driver has necessary permissions

**Steps**:
1. Passenger opens QR Recharge modal
2. Driver opens their app and selects "Process Payment"
3. Driver scans the QR code displayed in passenger app
4. Driver enters amount to charge (e.g., 200 د.ج)
5. Driver confirms payment
6. Watch passenger app for real-time update

**Expected Result**: ✅ Passenger app updates instantly showing new balance

---

## Debugging Tips

### Enable Detailed Logging
Add these to browser console while modal is open:

```javascript
// Check Firestore listener
const logs = [];
window.addEventListener('storage', (e) => {
  if (e.key?.includes('balance')) {
    logs.push(`Balance updated: ${e.newValue}`);
    console.log('Balance Update Log:', logs);
  }
});

// Monitor network requests
performance.getEntriesByType("resource").forEach(r => {
  if (r.name.includes('firestore')) {
    console.log('Firestore Request:', r.name, r.duration);
  }
});
```

### Check Firestore Connection
```javascript
// In browser console
db.doc(`users/YOUR_USER_ID`).get().then(doc => {
  console.log("User data:", doc.data());
}).catch(e => {
  console.error("Firestore error:", e);
});
```

### Verify Real-time Listener
```javascript
// Check if listener is active
console.log("QR Modal listener status: Active/Inactive");
// Check last update
console.log("Last balance update:", new Date().toLocaleTimeString());
```

## What Each Test Verifies

| Test | Verifies | Pass Criteria |
|------|----------|---------------|
| QR Code Generation | Real user ID encoded | JSON has actual userId, not "test" or "0000" |
| Real-time Update | Instant balance sync | No page refresh needed, update appears within 1 sec |
| Success Notification | Visual feedback | Green overlay shows, amount and balance display correct |
| Listener Cleanup | No memory leaks | Modal reopens without error |
| Large Amounts | Number formatting | "5,000 د.ج" not "5000 د.ج" |
| Multiple Updates | Rapid processing | All notifications show, last one is correct |
| Driver Integration | Full workflow | Balance updates when driver scans and processes |

## Common Issues & Solutions

### Issue: QR Code Not Visible
```
Solution:
1. Check browser console for errors (F12)
2. Verify firestoreUserId is loaded (not null)
3. Try closing and reopening modal
4. Check internet connection
```

### Issue: Balance Not Updating in Real-time
```
Solution:
1. Verify Firestore document exists for your user
2. Check Firestore security rules allow reads
3. Confirm Firebase connection is active
4. Try manually updating in Firestore console
5. Check browser network tab for Firestore errors
```

### Issue: Old Balance Shows After Update
```
Solution:
1. Confirm Firestore was actually updated
2. Close modal and reopen (forces fresh listener)
3. Do a hard refresh (Ctrl+Shift+R)
4. Check browser console for listener errors
```

### Issue: Success Notification Not Disappearing
```
Solution:
1. Wait 5 seconds (auto-closes)
2. Close modal and reopen
3. Check for JavaScript errors in console (F12)
```

## Performance Testing

### Measure Real-time Latency
```javascript
// Add to browser console when modal is open
let updateTime = Date.now();
// Then trigger a Firestore update
// Measure: (Current Time - updateTime) = latency
// Target: < 1 second (local network)
// Expected: 1-3 seconds (typical internet)
```

### Monitor Memory Usage
```javascript
// Open DevTools → Memory tab
// Take heap snapshot before opening modal
// Trigger updates
// Take another snapshot
// Compare: Should not see growth > 5MB
```

## Testing Checklist

- [ ] QR code displays correctly
- [ ] QR code can be decoded with phone camera
- [ ] Decoded QR code contains correct userId
- [ ] Real-time update triggers when Firestore changes
- [ ] Success notification shows new balance
- [ ] Success notification auto-closes after 5 seconds
- [ ] Modal can be closed and reopened
- [ ] Works after closing and reopening
- [ ] Handles rapid consecutive updates
- [ ] Large amounts format correctly
- [ ] No console errors when testing
- [ ] Works in production APK
- [ ] Driver app can scan the QR code
- [ ] Balance updates in driver app scenario

## APK Testing

### For Android APK Testing:

1. **Build the app as APK**
   ```bash
   # Using your build tool
   npm run build:apk
   # or
   flutter build apk
   ```

2. **Install on device**
   ```bash
   adb install app.apk
   ```

3. **Test QR Feature**
   - Open app on Android device
   - Navigate to Account → Top-up → Driver method
   - Click "شحن عبر السائق"
   - Take screenshot of QR code
   - Use Android QR scanner to verify data
   - Test real-time update via Firebase Console

4. **Monitor Logs**
   ```bash
   adb logcat | grep "QR\|balance\|recharge"
   ```

5. **Test with Driver App**
   - Install driver app on another device
   - Have driver scan the QR code
   - Verify balance updates in real-time

---

## Contact & Support

For issues or questions:
1. Check browser console (F12) for errors
2. Verify Firestore connection status
3. Confirm security rules are correct
4. Test with manual Firestore updates first
5. Contact development team with console errors

**Test Date**: ___________
**Tester Name**: ___________
**Status**: [ ] Pass [ ] Fail [ ] Needs Work
**Notes**: _________________________________

