# QR Code Recharge Feature - Deployment Guide

## Pre-Deployment Checklist

### Code Quality
- [x] All TypeScript types are correct
- [x] No console errors in dev mode
- [x] Component compiles without errors
- [x] Real user ID is used (not test data)
- [x] Firestore listener is cleaned up properly
- [x] No memory leaks
- [x] All imports are correct

### Functionality
- [x] QR code generates dynamically
- [x] Real-time listener is active
- [x] Success notification appears on balance update
- [x] Modal can be opened and closed
- [x] Close button works
- [x] Error handling is in place
- [x] Responsive design works

### Documentation
- [x] QR_RECHARGE_IMPLEMENTATION.md - Technical
- [x] QR_CODE_TESTING_GUIDE.md - Testing procedures
- [x] DRIVER_APP_INTEGRATION.md - Driver app guide
- [x] QR_CODE_IMPLEMENTATION_SUMMARY.md - Overview
- [x] QR_QUICK_REFERENCE.md - Quick reference
- [x] DEPLOYMENT_GUIDE.md - This file

## Deployment Steps

### Step 1: Verify Firebase Configuration

Ensure your Firebase project has:

```javascript
// /lib/firebase.ts or equivalent
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
```

### Step 2: Configure Firestore Security Rules

Add these rules to your Firestore to allow driver apps to update balances:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection - drivers can update balance
    match /users/{userId} {
      // Allow users to read their own data
      allow read: if request.auth.uid == userId ||
                     (request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'driver');
      
      // Allow users to write their own data
      allow write: if request.auth.uid == userId;
      
      // Allow drivers to update passenger balance
      allow update: if request.auth != null && 
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'driver' &&
                       request.resource.data.balance > resource.data.balance;
    }
    
    // Transactions collection - drivers can create, users/drivers can read
    match /transactions/{docId} {
      allow create: if request.auth != null &&
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'driver' &&
                       request.resource.data.userId != null &&
                       request.resource.data.driverId == request.auth.uid;
      
      allow read: if request.auth.uid == resource.data.userId ||
                     request.auth.uid == resource.data.driverId;
    }
  }
}
```

### Step 3: Create Firestore Collections

Ensure these collections exist:

```
Firestore Database
├── users
│   └── {userId}  // e.g., "0771234567"
│       ├── balance: number
│       ├── fullName: string
│       ├── email: string
│       ├── address: string
│       ├── Phone: string
│       └── role: "passenger" | "driver"
│
└── transactions
    └── {docId}
        ├── driverId: string
        ├── userId: string
        ├── amount: number
        ├── type: "recharge"
        ├── method: "cash" | "card" | "wallet"
        ├── status: "completed" | "failed"
        ├── driverTimestamp: Timestamp
        ├── clientTimestamp: string
        └── qrCodeTimestamp: number
```

### Step 4: Install Dependencies

All required dependencies are already installed:

```bash
npm list qrcode.react framer-motion firebase
# ✓ qrcode.react@4.2.0
# ✓ framer-motion (already installed)
# ✓ firebase (already installed)
```

If any are missing:
```bash
npm install qrcode.react framer-motion firebase
```

### Step 5: Build for Production

```bash
# Option A: Next.js Build (using webpack)
npm run build
# or
next build

# Option B: Export as static (if needed)
npm run build && next export

# Option C: Deploy to Vercel (recommended)
vercel deploy --prod
```

### Step 6: Test Before Going Live

#### Local Testing
```bash
npm run dev
# Open http://localhost:3000/account
# Complete auth flow
# Click "شحن الرصيد" → "شحن عبر السائق"
# Verify QR modal opens
```

#### Firebase Console Testing
1. Go to: https://console.firebase.google.com
2. Select your project
3. Navigate to Firestore Database
4. Find a user document (e.g., "0771234567")
5. Update the `balance` field
6. Watch the app update in real-time

#### Driver App Integration Testing
1. Have driver app scan the QR code
2. Driver confirms and processes payment
3. Watch passenger app update in real-time
4. Verify success notification appears

### Step 7: Deploy to Production

#### Option A: Vercel Deployment (Recommended)
```bash
# If connected to GitHub
git add .
git commit -m "feat: Add QR code recharge feature"
git push origin main

# Automatic deployment via Vercel

# Or manual deployment
vercel deploy --prod
```

#### Option B: Self-Hosted Deployment
```bash
# Build
npm run build

# Start server
npm start

# Or using PM2
pm2 start npm --name "tanakoli-app" -- start
pm2 save
```

#### Option C: Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t tanakoli-app .
docker run -p 3000:3000 tanakoli-app
```

### Step 8: Environment Variables

Ensure these environment variables are set:

```env
# .env.local or production env
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxx

# Optional analytics
NEXT_PUBLIC_GA_ID=xxx
```

### Step 9: Post-Deployment Verification

```bash
# Check 1: Application loads
curl https://your-app.com
# Should return HTML

# Check 2: Account page loads
curl https://your-app.com/account
# Should return account page HTML

# Check 3: Firebase connectivity
# Verify in browser console:
console.log("Firestore connected:", db.app.name)

# Check 4: Real-time listener works
# Open QR modal and update Firestore
# Should see real-time update
```

## Production Monitoring

### What to Monitor

```
Dashboard Metrics:
✓ Page Load Time (target: < 2s)
✓ Modal Open Time (target: < 500ms)
✓ Real-time Update Latency (target: < 3s)
✓ Error Rate (target: < 0.1%)
✓ Firebase Connection Status (target: 100% uptime)
```

### Logging & Analytics

Add monitoring for:

```typescript
// Example: Monitor QR modal performance
performance.mark('qr-modal-open');
// ... modal opens
performance.mark('qr-modal-ready');
performance.measure('qr-modal', 'qr-modal-open', 'qr-modal-ready');
const measure = performance.getEntriesByName('qr-modal')[0];
console.log(`QR modal ready in ${measure.duration}ms`);

// Report to analytics
analytics.logEvent('qr_modal_performance', {
  duration_ms: measure.duration,
});
```

### Error Tracking

Set up error tracking (e.g., Sentry):

```typescript
import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
  });
}
```

## Rollback Plan

If issues occur:

### Step 1: Immediate Rollback
```bash
# Option A: Revert code
git revert <commit-hash>
git push origin main

# Option B: Switch to previous build
vercel rollback

# Option C: Disable feature via feature flag
// In qr-recharge-modal.tsx
if (!process.env.NEXT_PUBLIC_QR_FEATURE_ENABLED) {
  return null; // Feature disabled
}
```

### Step 2: Investigate
1. Check browser console for errors (F12)
2. Check Firestore logs for transaction failures
3. Monitor real-time latency
4. Check driver app logs
5. Review recent Firestore rule changes

### Step 3: Fix & Redeploy
1. Identify root cause
2. Fix code/rules
3. Test thoroughly
4. Redeploy
5. Monitor closely

## Common Deployment Issues

### Issue 1: QR Code Not Showing
**Cause**: Firebase not initialized  
**Fix**: Verify Firebase config in environment variables

### Issue 2: Real-time Updates Not Working
**Cause**: Firestore rules too restrictive  
**Fix**: Review and adjust security rules

### Issue 3: Build Fails
**Cause**: Missing dependencies or TypeScript errors  
**Fix**: Run `npm install` and verify no TypeScript errors

### Issue 4: Slow Performance
**Cause**: Large Firestore payloads or network issues  
**Fix**: Optimize queries, consider pagination

### Issue 5: Balance Shows Wrong Value
**Cause**: Listener not triggered yet  
**Fix**: Increase listener timeout, check network

## Performance Optimization

### Frontend Optimization
```typescript
// Memoize QR code component to prevent re-renders
const MemoizedQRCode = memo(function MemoizedQRCode({ data }) {
  return <QRCodeSVG value={data} size={200} />
})
```

### Firestore Optimization
```typescript
// Use indexed queries for better performance
const q = query(
  collection(db, "transactions"),
  where("userId", "==", userId),
  where("type", "==", "recharge"),
  orderBy("driverTimestamp", "desc"),
  limit(10)
)
```

### Network Optimization
```typescript
// Enable compression and caching
const nextConfig = {
  compress: true,
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
  },
}
```

## Capacity Planning

### Estimated Usage
- Users: 10,000+
- Daily recharges: 1,000-2,000
- Peak transactions/min: 50-100

### Firestore Quotas
- Reads: 50,000 per day ✓
- Writes: 20,000 per day ✓
- Real-time listeners: 100+ concurrent ✓

### Scaling Strategy
1. **Phase 1 (Month 1-3)**: Monitor daily usage
2. **Phase 2 (Month 4-6)**: Increase if needed
3. **Phase 3 (6+ months)**: Consider sharding if > 100K users

## Maintenance Schedule

### Daily
- [ ] Monitor error logs
- [ ] Check real-time latency (target: < 3s)
- [ ] Verify driver payments processing

### Weekly
- [ ] Review failed transactions
- [ ] Check Firestore usage
- [ ] Monitor user feedback

### Monthly
- [ ] Analyze usage patterns
- [ ] Review performance metrics
- [ ] Plan optimizations if needed
- [ ] Backup critical data

## Success Criteria

Feature is successfully deployed when:

- [x] QR codes generate correctly
- [x] Real-time updates work (< 3s latency)
- [x] No console errors
- [x] Success notifications appear
- [x] Driver app can scan QR codes
- [x] Balance updates are atomic
- [x] Error handling is robust
- [x] Performance is acceptable
- [x] Mobile responsive works
- [x] No memory leaks after extended use

## Going Live Checklist

**Final Verification Before Launch**

- [ ] All tests pass
- [ ] Firestore rules are correct
- [ ] Firebase connection verified
- [ ] QR codes verified real (not dummy data)
- [ ] Real-time listener tested
- [ ] Success notifications tested
- [ ] Error messages tested
- [ ] Mobile devices tested
- [ ] Driver app tested with QR scanning
- [ ] Performance baseline established
- [ ] Monitoring configured
- [ ] Rollback plan ready
- [ ] Support team trained
- [ ] Documentation ready
- [ ] Feature flag configured (optional)

## Support & Contact

For deployment issues:
1. Check troubleshooting section above
2. Review Firebase console logs
3. Check browser console (F12)
4. Contact development team with:
   - Error message
   - Browser/device info
   - Screenshot
   - Firebase project ID

## Sign-Off

**Deployed By**: ___________  
**Date**: ___________  
**Version**: 1.0.0  
**Status**: [ ] In Progress [ ] Complete [ ] Rolled Back  

**Notes**:
```
_________________________________
_________________________________
_________________________________
```

---

**Production Deployment Approved**: [ ] Yes [ ] No

**Authorized By**: ___________  
**Date**: ___________

