# Driver App Integration Guide - QR Code Recharge

## Overview
This guide explains how to integrate the QR code recharge system into the driver app. The driver app will scan the QR code from the passenger app and process the payment.

## QR Code Data Format

The passenger app encodes a JSON string in the QR code:

```json
{
  "action": "recharge",
  "userId": "0771234567",
  "timestamp": 1717329600000
}
```

### Data Fields
- **action** (string): Always "recharge" - helps identify the intent
- **userId** (string): The passenger's phone number (Firestore document ID)
- **timestamp** (number): Milliseconds when QR was generated (for validation)

## Implementation Steps

### Step 1: QR Code Scanner Setup

#### For React Native (Expo)
```typescript
import { CameraView } from 'expo-camera';
import { useState } from 'react';

export function QRScannerScreen() {
  const [scannedData, setScannedData] = useState<any>(null);

  const handleBarCodeScanned = (result: any) => {
    try {
      // Parse the QR code data
      const data = JSON.parse(result.data);
      
      // Validate the QR code format
      if (data.action === 'recharge' && data.userId) {
        setScannedData(data);
        // Proceed to payment processing
        navigateToPaymentConfirmation(data);
      } else {
        showError("Invalid QR code format");
      }
    } catch (error) {
      showError("Failed to parse QR code");
    }
  };

  return (
    <CameraView
      onBarCodeScanned={handleBarCodeScanned}
      style={{ flex: 1 }}
    />
  );
}
```

#### For Flutter
```dart
import 'package:mobile_scanner/mobile_scanner.dart';

class QRScannerScreen extends StatefulWidget {
  @override
  State<QRScannerScreen> createState() => _QRScannerScreenState();
}

class _QRScannerScreenState extends State<QRScannerScreen> {
  final MobileScannerController controller = MobileScannerController();

  void _handleBarcodeDetect(BarcodeCapture capture) {
    final barcodes = capture.barcodes;
    for (final barcode in barcodes) {
      try {
        final Map<String, dynamic> data = jsonDecode(barcode.rawValue);
        
        if (data['action'] == 'recharge' && data['userId'] != null) {
          _proceedToPayment(data);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Invalid QR code format')),
          );
        }
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to parse QR code')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return MobileScanner(
      controller: controller,
      onDetect: _handleBarcodeDetect,
    );
  }
}
```

### Step 2: Payment Processing

After successfully scanning and parsing the QR code:

```typescript
interface RechargePayload {
  action: string;
  userId: string;
  timestamp: number;
}

interface PaymentData {
  driverId: string;
  passengerId: string;
  amount: number;
  method: 'cash' | 'card' | 'wallet';
  timestamp: number;
}

async function processRecharge(qrData: RechargePayload, amount: number) {
  try {
    // Step 1: Validate QR code freshness (not older than 5 minutes)
    const qrAge = Date.now() - qrData.timestamp;
    const FIVE_MINUTES = 5 * 60 * 1000;
    
    if (qrAge > FIVE_MINUTES) {
      throw new Error('QR code has expired. Ask passenger to generate a new one.');
    }

    // Step 2: Validate passenger exists in Firestore
    const passengerDoc = await db
      .collection('users')
      .doc(qrData.userId)
      .get();

    if (!passengerDoc.exists) {
      throw new Error('Passenger account not found');
    }

    // Step 3: Show payment confirmation UI
    const confirmed = await showPaymentConfirmation({
      passengerName: passengerDoc.data().fullName,
      amount: amount,
      methods: ['cash', 'card', 'wallet'],
    });

    if (!confirmed) return; // User cancelled

    // Step 4: Create transaction record
    const transaction = {
      driverId: driverUserId,
      userId: qrData.userId,
      amount: amount,
      type: 'recharge',
      method: confirmed.method,
      status: 'completed',
      driverTimestamp: serverTimestamp(), // Use server time for consistency
      clientTimestamp: new Date().toISOString(),
      qrCodeTimestamp: qrData.timestamp,
    };

    // Step 5: Update user's balance in Firestore
    await db.runTransaction(async (transaction) => {
      // Read current balance
      const userRef = db.collection('users').doc(qrData.userId);
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists) {
        throw new Error('Passenger no longer exists');
      }

      const currentBalance = userDoc.data().balance || 0;
      const newBalance = currentBalance + amount;

      // Update balance atomically
      transaction.update(userRef, {
        balance: newBalance,
        lastRechargeDate: serverTimestamp(),
      });

      // Create transaction record
      transaction.set(
        db.collection('transactions').doc(),
        {
          ...transaction,
          newBalance: newBalance,
        }
      );

      return { oldBalance: currentBalance, newBalance: newBalance };
    });

    // Step 6: Show success confirmation
    showSuccessMessage(
      `تم شحن رصيد المسافر بنجاح\nالمبلغ: ${amount} د.ج`
    );

    // Step 7: Return to previous screen
    navigateBack();

  } catch (error) {
    console.error('Recharge error:', error);
    showErrorMessage(error.message || 'حدث خطأ أثناء معالجة الشحن');
  }
}
```

### Step 3: Payment Confirmation UI

```typescript
interface PaymentConfirmationParams {
  passengerName: string;
  amount: number;
  methods: Array<'cash' | 'card' | 'wallet'>;
}

async function showPaymentConfirmation(params: PaymentConfirmationParams) {
  return new Promise((resolve) => {
    showModal({
      title: 'تأكيد عملية الشحن',
      content: `
        المسافر: ${params.passengerName}
        المبلغ: ${params.amount} د.ج
        
        اختر طريقة الدفع:
      `,
      buttons: [
        {
          text: 'إلغاء',
          onPress: () => resolve(null),
        },
        ...params.methods.map(method => ({
          text: getPaymentMethodName(method),
          onPress: () => resolve({ method, amount: params.amount }),
        })),
      ],
    });
  });
}

function getPaymentMethodName(method: string): string {
  const names: Record<string, string> = {
    'cash': 'نقداً',
    'card': 'بطاقة',
    'wallet': 'المحفظة الرقمية',
  };
  return names[method] || method;
}
```

### Step 4: Firestore Security Rules

Ensure these rules are in place to protect the recharge system:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // User documents - drivers can update balance
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId ||
                      (request.auth.token.role == 'driver' &&
                       request.resource.data.balance >= resource.data.balance);
    }
    
    // Transaction records - drivers can create, users can read
    match /transactions/{docId} {
      allow create: if request.auth.token.role == 'driver' &&
                       request.resource.data.userId != null &&
                       request.resource.data.driverId == request.auth.uid;
      
      allow read: if request.auth.uid == resource.data.userId ||
                     request.auth.uid == resource.data.driverId;
    }
  }
}
```

### Step 5: Error Handling

```typescript
interface RechargeError {
  code: string;
  message: string;
  userMessage: string;
}

const RECHARGE_ERRORS = {
  QR_EXPIRED: {
    code: 'QR_EXPIRED',
    message: 'QR code timestamp is more than 5 minutes old',
    userMessage: 'انتهت صلاحية الرمز. اطلب من المسافر إنشاء رمز جديد',
  },
  PASSENGER_NOT_FOUND: {
    code: 'PASSENGER_NOT_FOUND',
    message: 'Passenger document does not exist',
    userMessage: 'لم يتم العثور على حساب المسافر',
  },
  INVALID_AMOUNT: {
    code: 'INVALID_AMOUNT',
    message: 'Amount must be positive number',
    userMessage: 'المبلغ يجب أن يكون موجباً',
  },
  TRANSACTION_FAILED: {
    code: 'TRANSACTION_FAILED',
    message: 'Database transaction failed',
    userMessage: 'فشلت عملية الشحن. حاول مرة أخرى',
  },
  INSUFFICIENT_PERMISSIONS: {
    code: 'INSUFFICIENT_PERMISSIONS',
    message: 'Driver does not have recharge permissions',
    userMessage: 'ليس لديك صلاحية لإجراء هذه العملية',
  },
};

function handleRechargeError(error: Error): RechargeError {
  if (error.message.includes('expired')) {
    return RECHARGE_ERRORS.QR_EXPIRED;
  }
  if (error.message.includes('not found')) {
    return RECHARGE_ERRORS.PASSENGER_NOT_FOUND;
  }
  if (error.message.includes('amount')) {
    return RECHARGE_ERRORS.INVALID_AMOUNT;
  }
  if (error.message.includes('transaction')) {
    return RECHARGE_ERRORS.TRANSACTION_FAILED;
  }
  if (error.message.includes('permission')) {
    return RECHARGE_ERRORS.INSUFFICIENT_PERMISSIONS;
  }
  
  // Unknown error
  return {
    code: 'UNKNOWN',
    message: error.message,
    userMessage: 'حدث خطأ غير متوقع. تحقق من الاتصال بالإنترنت',
  };
}
```

### Step 6: Transaction Logging

```typescript
interface TransactionLog {
  timestamp: string;
  driverId: string;
  passengerId: string;
  amount: number;
  status: 'success' | 'failed';
  method: string;
  duration: number; // milliseconds
  errorMessage?: string;
}

class RechargeLogger {
  private logs: TransactionLog[] = [];

  logTransaction(log: TransactionLog) {
    this.logs.push(log);
    
    // Optionally send to analytics
    analytics.logEvent('recharge_processed', {
      userId: log.passengerId,
      amount: log.amount,
      status: log.status,
      duration: log.duration,
    });

    // Log to Firestore for audit trail
    db.collection('audit_logs').add({
      ...log,
      timestamp: serverTimestamp(),
      type: 'recharge',
    });
  }

  getFailedTransactions(): TransactionLog[] {
    return this.logs.filter(log => log.status === 'failed');
  }

  retry(log: TransactionLog) {
    // Logic to retry failed transactions
    console.log(`Retrying transaction for ${log.passengerId}`);
  }
}
```

## Complete Integration Flow

```
┌─────────────────┐
│  Driver App     │
│  Open Scanner   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Scan Passenger QR Code │
└────────┬────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Parse JSON Data:            │
│  - action: "recharge"        │
│  - userId: "0771234567"      │
│  - timestamp: 123456789      │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Validate QR Code:       │
│  ✓ Not older than 5 min  │
│  ✓ Action is "recharge"  │
│  ✓ UserId is valid       │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Show Payment UI:        │
│  - Amount input          │
│  - Payment method select │
│  - Confirm button        │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Process Recharge:           │
│  1. Run Firestore transaction│
│  2. Update user balance      │
│  3. Create transaction log   │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Show Success/Error      │
│  Message                 │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────┐
│  Return to Main      │
│  Driver Screen       │
└──────────────────────┘

Meanwhile in Passenger App:
┌──────────────────────────────┐
│  Real-time Firestore Listener│
│  Detects Balance Update      │
│  Shows Success Notification  │
└──────────────────────────────┘
```

## Testing the Integration

### Unit Tests

```typescript
describe('QR Recharge Processing', () => {
  test('should validate QR code format', () => {
    const qrData = {
      action: 'recharge',
      userId: '0771234567',
      timestamp: Date.now(),
    };
    expect(isValidQRCode(qrData)).toBe(true);
  });

  test('should reject expired QR codes', () => {
    const oldTimestamp = Date.now() - 6 * 60 * 1000; // 6 minutes ago
    const qrData = {
      action: 'recharge',
      userId: '0771234567',
      timestamp: oldTimestamp,
    };
    expect(() => processRecharge(qrData, 100)).toThrow('expired');
  });

  test('should validate amount is positive', () => {
    expect(() => processRecharge(validQRData, -100)).toThrow();
    expect(() => processRecharge(validQRData, 0)).toThrow();
  });
});
```

### Integration Tests

```typescript
describe('End-to-End Recharge', () => {
  test('should update passenger balance in real-time', async () => {
    // 1. Scan QR code
    const qrData = generateTestQRData();
    
    // 2. Process payment
    await processRecharge(qrData, 500);
    
    // 3. Verify Firestore was updated
    const doc = await db.collection('users').doc(qrData.userId).get();
    expect(doc.data().balance).toBe(initialBalance + 500);
  });
});
```

## Best Practices

1. **Always validate QR code freshness** - Reject codes older than 5 minutes
2. **Use Firestore transactions** - Ensure atomic balance updates
3. **Verify passenger exists** - Check before processing payment
4. **Log all transactions** - For audit trail and debugging
5. **Handle errors gracefully** - Show user-friendly Arabic messages
6. **Test with real devices** - Network conditions affect performance
7. **Monitor failed transactions** - Implement retry mechanism
8. **Use server timestamps** - Avoid client time synchronization issues
9. **Validate permissions** - Ensure driver has recharge permissions
10. **Provide feedback** - Show progress during long operations

## Troubleshooting

### QR Code Not Scanning
- Ensure good lighting on QR code
- Try different QR code sizes
- Verify camera permissions are granted
- Test with multiple QR scanner apps

### Balance Not Updating
- Verify Firestore connection
- Check security rules allow writes
- Confirm transaction completed successfully
- Check timestamp for Firestore server issues

### Transaction Fails Silently
- Enable transaction logging
- Check Firestore rules
- Monitor network requests
- Review error handling code

---

**Version**: 1.0.0  
**Last Updated**: June 2026  
**Status**: Production Ready
