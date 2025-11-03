# Transport Pricing Management System - User Guide

## Overview
The SoMAp transport pricing system has been upgraded to support dynamic, database-driven pricing with full year-scoping. This allows you to manage transport routes, stops, and pricing for each academic year independently.

## Key Features

### 1. **Year-Scoped Data**
- All transport pricing is now stored per academic year (2023-2042)
- Changing the year selector will load the appropriate pricing for that year
- Each year's pricing is completely independent

### 2. **Dynamic Route/Stop Management**
- Add, edit, and delete transport stops through a user-friendly interface
- Set base monthly fees for each stop
- Activate/deactivate stops as needed

### 3. **Monthly Multipliers**
- Customize pricing for different months
- Example: January = 1.5× (higher fees), June = 0× (no payment during holidays)

## How to Use

### Managing Routes & Pricing

1. **Access the Management Page**
   - From the Transport Dashboard, click on "🗺️ Routes & Stops"
   - Or navigate directly to `transportroutes.html`

2. **Select Academic Year**
   - Use the year dropdown at the top to select which year you want to manage
   - Changes are isolated to the selected year only

3. **Add a New Stop**
   - Click the "+ Add Stop" button
   - Enter:
     - **Stop Name**: e.g., "Sinoni", "Dampo", "Mbezi"
     - **Base Monthly Fee**: e.g., 18,500 (in Tanzanian Shillings)
     - **Active Status**: Check if students can be assigned to this stop
   - Click "💾 Save Stop"

4. **Edit an Existing Stop**
   - Click the "✏️ Edit" button on any stop card
   - Modify the details
   - Click "💾 Save Stop"
   - **Note**: Price changes take effect immediately for all students on that route

5. **Activate/Deactivate a Stop**
   - Click the "🚫 Deactivate" or "✅ Activate" button
   - Inactive stops won't appear in assignment dropdowns but existing assignments remain

6. **Delete a Stop**
   - Click the "🗑️" button
   - Confirm deletion
   - **Warning**: Only delete stops that have no active student assignments

### Managing Monthly Multipliers

1. **Access Multipliers Section**
   - Scroll down on `transportroutes.html` to see the "📆 Monthly Multipliers" section

2. **Understanding Multipliers**
   - Actual Monthly Fee = Base Fee × Multiplier
   - Example: If base fee is TSh 20,000 and January multiplier is 1.5:
     - January fee = 20,000 × 1.5 = TSh 30,000

3. **Default Multipliers**
   ```
   January:    1.5×  (Higher fees - term start)
   February:   1.0×  (Normal)
   March:      1.0×
   April:      0.8×  (Reduced - mid-term)
   May:        1.0×
   June:       0.0×  (No payment - long holiday)
   July:       1.5×  (Higher fees - term start)
   August:     1.0×
   September:  0.8×  (Reduced - mid-term)
   October:    1.0×
   November:   1.25× (Slightly higher)
   December:   0.0×  (No payment - holiday)
   ```

4. **Editing Multipliers**
   - Modify any month's multiplier value
   - Click "💾 Save Multipliers"
   - Changes apply to all transport calculations for that year

### Assigning Students to Transport

1. **From Transport Dashboard**
   - Click "Students on Transport" card or open the registry modal
   - Find the student
   - Click "Assign Transport"

2. **In the Assignment Modal**
   - **Route Selection**: Routes now load from the database for the selected year
   - **Time Period**: Choose Morning, Evening, or Both
   - **Drop-off Points**: Select from active stops
   - **Start Date**: Required - determines when billing starts (proration applied)
   - **Fee Preview**: Shows base fee and expected first month payment

3. **Pricing Calculation**
   - Base Fee = Morning Stop Fee + Evening Stop Fee
   - Monthly Fee = Base Fee × Month Multiplier
   - First month is prorated based on start date

### Recording Payments

1. **From Payment Management Page**
   - Navigate to `transportpayments.html`
   - Find the student
   - Click "💰 Pay" button

2. **In Payment Modal**
   - **Month**: Select the month being paid for
   - **Amount**: Pre-filled with current month's fee (can be adjusted)
   - **Payment Method**: Cash, M-Pesa, etc.
   - **Reference**: Transaction code (required)
   - **Payer Name**: Full name of person paying (required)
   - **Payment Date**: Date of payment (required)

3. **Year-Scoped Payments**
   - Payments are stored per year
   - Changing years will show only that year's payment history
   - Debt calculations are year-specific

## Database Structure

```
Firebase Realtime Database
├── transportCatalog/
│   └── {year}/
│       └── stops/
│           └── {stopId}/
│               ├── name: "Sinoni"
│               ├── baseFee: 18500
│               ├── active: true
│               ├── createdAt: timestamp
│               └── updatedAt: timestamp
│
├── transportSettings/
│   └── {year}/
│       └── monthMultipliers/
│           ├── 1: 1.5
│           ├── 2: 1.0
│           └── ... (12 months)
│
├── transportAssignments/
│   └── {year}/
│       └── {studentId}/
│           ├── status: "Using"
│           ├── morningStopId: "stopId"
│           ├── eveningStopId: "stopId"
│           ├── baseMonthlyFee: 35000
│           ├── startDate: "2025-01-15"
│           └── updatedAt: timestamp
│
├── transportLedgers/
│   └── {year}/
│       └── {studentId}/
│           └── payments/
│               └── {paymentId}/
│                   ├── month: "January"
│                   ├── amount: 52500
│                   ├── method: "M-Pesa"
│                   ├── ref: "RFX123..."
│                   ├── payerName: "John Doe"
│                   ├── paidAt: timestamp
│                   └── approved: true
│
└── transportPayments/  (canonical path for year-scoped payments)
    └── {year}/
        └── {studentId}/
            └── {paymentId}/
                ├── month: 1
                ├── amount: 52500
                └── ... (payment details)
```

## Important Notes

### Year Selector Behavior
- **Identity Data**: Student names, admission numbers, and parent contacts are always visible across all years
- **Class Progression**: Classes automatically adjust based on the year
  - Example: Class 6 in 2025 → Class 5 in 2024, Class 7 in 2026
  - Students who were Class 7 in 2025 show as "GRADUATED" in 2026
- **Payment Data**: Each year has its own isolated payment records
- **Route Pricing**: Each year has its own stops and multipliers

### Migration from Hardcoded Pricing
- The old hardcoded pricing is kept as a fallback for legacy compatibility
- New assignments use database pricing
- Old assignments continue to work but will use legacy pricing until reassigned

### Best Practices

1. **Set up pricing at the start of each academic year**
   - Review and adjust stop prices
   - Configure month multipliers
   - Test with a few students before mass assignments

2. **Backup strategy**
   - Export data regularly using the "📥 Export Excel" button
   - Keep records of pricing changes

3. **Price changes**
   - Be cautious when editing prices mid-year
   - Price changes affect all students on that route
   - Consider creating new stops for mid-year price changes

4. **Start dates matter**
   - Always set accurate start dates for proper proration
   - Students joining mid-month pay only for active days

## Troubleshooting

### Routes not showing in dropdown
- Check year selector - routes are year-specific
- Verify stops are marked as "Active" in `transportroutes.html`

### Incorrect pricing calculations
- Check monthly multipliers for the selected year
- Verify stop base fees are correct
- Check student's start date for proration

### Payment not showing
- Confirm you're viewing the correct year
- Check if payment is pending approval
- Verify payment was recorded under the correct student ID

### Year selector not working
- Clear browser cache and reload
- Check browser console for errors
- Verify Firebase connection

## Technical Details

### Proration Logic
When a student starts transport mid-month:
```
Prorated Fee = (Base Fee × Multiplier) × (Active Days / Total Days in Month)
```

Example:
- Base fee: TSh 20,000
- Start date: January 15, 2025
- January multiplier: 1.5
- Days in January: 31
- Active days: 31 - 14 = 17

Calculation:
```
January Fee = (20,000 × 1.5) × (17/31)
            = 30,000 × 0.548
            = TSh 16,440
```

### Debt Calculation
```
Total Expected = Σ (Monthly Fee for each month from start date)
Total Paid = Σ (All approved payments)
Debt = Max(0, Total Expected - Total Paid)
```

## Support

For technical support or questions:
1. Check this guide first
2. Review the Firebase console for data verification
3. Check browser console for error messages
4. Contact system administrator

---

**Version**: 2.1.0  
**Last Updated**: November 2025  
**Compatible with**: SoMAp v2.1 (Firebase Compat 9.6.10)

