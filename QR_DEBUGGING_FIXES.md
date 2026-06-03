# QR Code Debugging & Flow Fixes

## Problem
Two QR code flows were broken:
1. **Payment QR** (passenger pays driver): Driver scans passenger's QR but nothing happens
2. **Recharge QR** (driver recharges passenger): Driver scans QR but recharge button does nothing

## Root Causes Identified

1. **Inconsistent QR Data Format**: 
   - Payment QR included `token` field
   - Recharge QR lacked `type` and `token` fields
   - Scanner couldn't reliably identify which flow to trigger

2. **No Debug Visibility**:
   - No visible raw QR data displayed to driver
   - No error details shown on parsing failures
   - Made debugging impossible in production

3. **Silent Failures**:
   - Errors weren't caught or displayed
   - Transaction logs didn't show what went wrong

## Solutions Implemented

### 1. Standardized QR Code Format ✅

**Payment QR** (`qr-code-display.tsx`):
```json
{
  "type": "payment",
  "userId": "...",
  "name": "...",
  "phone": "...",
  "token": "TNK-...",
  "timestamp": 1234567890
}
```

**Recharge QR** (`qr-recharge-modal.tsx`):
```json
{
  "type": "recharge",
  "action": "recharge",
  "userId": "...",
  "timestamp": 1234567890
}
```

Now both QR codes have a consistent `type` field that clearly identifies the flow.

### 2. Enhanced Processing with Comprehensive Logging ✅

Updated `processQRCode()` in `driver-dashboard.tsx` to:
- Log raw QR data immediately: `console.log("[v0] Raw QR Data:", qrData)`
- Log parsed JSON: `console.log("[v0] Parsed QR Data:", parsedData)`
- Log QR type detection: `console.log("[v0] QR Type:", type)`
- Log user lookups: `console.log("[v0] Found user by Phone/userId:", userDocId)`
- Log balance changes: `console.log("[v0] Current balance:", currentBalance, "Passenger:", passengerName)`
- Log success/failure at each step

All logs use the `[v0]` prefix for easy filtering in browser DevTools.

### 3. Debug Info Display in Result Modal ✅

Added debug section to the result modal that displays:
- **Raw QR Data**: The exact string scanned from the QR code
- **Parsed Data**: The JSON object after parsing (formatted and readable)
- **Error Details**: Specific error messages explaining what went wrong

This appears in both success and error states, making debugging visible to the driver.

### 4. Better Error Messages ✅

Error messages now include specific reasons:
- `"فشل في قراءة رمز QR - صيغة غير صحيحة"` (format error)
- `"رمز QR غير صالح - بيانات المستخدم مفقودة"` (missing user data)
- `"المستخدم غير موجود - تحقق من رمز QR"` (user not found)
- `"رصيد غير كافٍ (X د.ج) - المطلوب Y د.ج"` (insufficient balance with details)

### 5. Updated ScanResult Interface ✅

Added new fields to track debug info:
```typescript
interface ScanResult {
  success: boolean
  passengerName?: string
  newBalance?: number
  amount?: number
  message?: string
  isRecharge?: boolean
  rawData?: string              // The exact QR string scanned
  parsedData?: Record<string, unknown>  // Parsed JSON object
  error?: string                // Detailed error explanation
}
```

## Testing the Flows

### To test Payment Flow:
1. Open Developer Tools (F12)
2. Click "مسح رمز الدفع" (Scan Payment QR)
3. Show passenger's QR code
4. Look for console logs starting with `[v0]` showing raw and parsed data
5. Check result modal for debug section

### To test Recharge Flow:
1. Click "شحن رصيد للمسافر" (Recharge)
2. Enter amount and click "مسح QR"
3. Show passenger's QR code
4. Look for console logs and debug info in result modal

## Expected Console Output

When a QR is successfully scanned, you'll see:
```
[v0] Raw QR Data: {"type":"payment","userId":"...","name":"...","phone":"...","token":"TNK-...","timestamp":1234567890}
[v0] Parsed QR Data: {type: "payment", userId: "...", name: "...", phone: "...", token: "TNK-...", timestamp: 1234567890}
[v0] QR Type: payment User ID: ... Phone: ...
[v0] Found user by Phone/userId: user123
[v0] Current balance: 500 Passenger: أحمد
[v0] Deduction: Balance 500 → 480
[v0] Transaction logged successfully
[v0] Deduction successful
```

## Files Modified

1. **components/qr-code-display.tsx** - Added `type: "payment"` and `timestamp` to QR format
2. **components/qr-recharge-modal.tsx** - Added `type: "recharge"` to QR format
3. **components/driver-dashboard.tsx** - Enhanced processing logic with:
   - Comprehensive logging
   - Updated ScanResult interface
   - Debug info display in result modal
   - Better error messages
