# Carry-Forward Debt - User Guide

## 🎯 Quick Start

The carry-forward debt system automatically tracks unpaid fees from previous years. No setup required—it just works!

---

## 📱 For Parents

### Viewing Your Child's Finance Information

1. **Go to Parent Dashboard** (`parent.html`)
2. **Select Academic Year** using the dropdown at the top
3. **View Stat Cards:**

   ```
   Total Fee (Year)
   TSh 540,000
   includes TSh 40,000 debt carried from 2024
   
   Payment plan: Dirisha la Malipo (6)
   ```

### Understanding the Display

**If you see "debt carried from [year]":**
- This means your child has unpaid fees from a previous year
- The total shown includes BOTH current year fee AND previous debt
- You must clear the previous debt before the balance shows as "PAID"

**Example:**
```
Year 2025:
- Fee: 645,000
- Paid: 605,000
- Debt: 40,000 ❌ (unpaid)

Year 2026:
- Current fee: 500,000
- Debt from 2025: 40,000
- TOTAL TO PAY: 540,000 ✅
```

### Year Switching

- **Switch between years** to see historical data
- Each year shows only that year's fee and payments
- Previous debts are automatically added to the total

---

## 💼 For Finance Admins

### Viewing Student Finance Records

1. **Go to Finance Page** (`finance.html`)
2. **Select Academic Year** from the dropdown
3. **View the table:**
   - **Fee (year)** column shows current year fee
   - **Red note below** shows carry-forward debt if any
   - **Balance (Year)** shows total outstanding

### Understanding Table Display

**Normal student (no debt):**
```
Fee (year): 500,000
Paid: 500,000
Balance: 0 ✅
```

**Student with carry-forward debt:**
```
Fee (year): 500,000
+ Debt from 2024: 40,000    ← RED TEXT
Paid: 0
Balance: 540,000 ❌
```

### Viewing Detailed Breakdown

1. **Click "View"** button next to student name
2. **Modal shows:**
   - Fee/year (current year)
   - **RED WARNING BOX** if carry-forward debt exists
   - Total Due (including carry-forward)
   - Paid (current year)
   - Outstanding Balance
   - Full payment ledger

**Example Modal:**
```
Name: FAIDHATI AWADHI AWADHI
Admission No: AUTO-1758190257488
Class: Class 2
Fee/year (2026): 500,000

┌─────────────────────────────────────────┐
│ ⚠️ Debt carried from 2025: 40,000      │  ← RED BOX
└─────────────────────────────────────────┘

Total Due (including carry-forward): 540,000
Payment Plan: Dirisha la Malipo (6)
Paid (2026): 0
Outstanding Balance: 540,000
```

### KPI Cards

The top stat cards now include carry-forward:

- **Total Due (All Students):** Sum of all fees + carry-forward debts
- **Total Collected:** Sum of all payments for selected year
- **Total Outstanding:** Total Due - Total Collected

### Filtering Debtors

1. Click **"Show Debtors"** button
2. Table filters to show only students with outstanding balances
3. Includes students with carry-forward debt

---

## 🔍 Common Scenarios

### Scenario 1: Student Didn't Complete Payment in 2025

**What happens:**
- 2025: Fee 645,000, Paid 605,000 → **Debt: 40,000**
- 2026: System automatically shows "Debt from 2025: 40,000"
- Parent sees total: 2026 fee + 40,000
- **Action Required:** Parent must clear 40,000 first, then pay 2026 fee

### Scenario 2: Student Paid Zero in 2025

**What happens:**
- 2025: Fee 645,000, Paid 0 → **Debt: 645,000**
- 2026: System shows "Debt from 2025: 645,000"
- Parent sees: 2026 fee + 645,000
- **Action Required:** Parent must clear entire 2025 debt

### Scenario 3: Student Fully Paid in 2025

**What happens:**
- 2025: Fee 645,000, Paid 645,000 → **Debt: 0** ✅
- 2026: No carry-forward shown
- Parent sees only 2026 fee
- **Action Required:** Just pay 2026 fee normally

### Scenario 4: Student Has No Fee Record for Current Year

**What happens:**
- 2025: Had debt of 40,000
- 2026: No fee set yet (fee = 0)
- System shows: "Debt from 2025: 40,000"
- Total Due: 0 + 40,000 = 40,000
- **Parent sees:** Must pay 40,000 (the carry-forward debt)

---

## 📊 Exporting Reports

### For Finance Admins

All export buttons now include carry-forward debt:

1. **Main CSV:** Full student list with fees including carry-forward
2. **Main PDF:** Same as CSV in PDF format
3. **Debt (current) CSV:** Students with unpaid debt (includes carry-forward)
4. **Debt (current) PDF:** Same as CSV in PDF format
5. **Breakdown CSV:** Detailed installment breakdown (shows carry-forward separately)
6. **Breakdown PDF:** Same as CSV in PDF format

### For Parents

- **CSV Export:** Your child's scores and attendance
- **PDF Export:** Formatted report card
- **Receipt Downloads:** All payment receipts (via Receipt Vault)

---

## ⚙️ Settings & Configuration (Admin Only)

### Manually Setting Carry-Forward Amount

If you need to override the automatic calculation:

```javascript
// In browser console (admin only):
await persistCarryForward(
  2026,           // Year to set carry-forward FOR
  'studentId',    // Student's ID
  50000           // Amount in TSh
);
```

**When to use:**
- Correcting errors in previous year data
- Special arrangements with parents
- Adjustments or waivers

### Database Paths

The system reads from:
- `studentFees/{year}/{studentId}/feePerYear` - Base fee
- `approvalsHistory/{year}/{month}/{recordId}` - Approved payments
- `financeCarryForward/{year}/{studentId}/amount` - Manual carry-forward (optional)

---

## 🚨 Troubleshooting

### Problem: Carry-forward not showing

**Check:**
1. Does previous year have a fee record?
2. Are payments recorded in `approvalsHistory`?
3. Is `sourceModule` set to "finance"?

**Solution:**
- Verify database structure
- Check browser console for errors
- Ensure year selector is on correct year

### Problem: Wrong carry-forward amount

**Check:**
1. Previous year fee correct?
2. All payments recorded?
3. Manual override set?

**Solution:**
- Review previous year data
- Check payment records
- Clear manual override if wrong

### Problem: Parent dashboard shows different numbers than finance page

**This should NOT happen!** Both use the same aggregator.

**Check:**
1. Both on same year?
2. Data synced?
3. Cache cleared?

**Solution:**
- Hard refresh browser (Ctrl+Shift+R)
- Check network connectivity
- Report bug if persists

---

## 💡 Best Practices

### For Parents:
1. ✅ Check dashboard regularly
2. ✅ Clear previous year debts ASAP
3. ✅ Download receipts for your records
4. ✅ Contact school if numbers seem wrong

### For Finance Admins:
1. ✅ Set fees at start of each year
2. ✅ Approve payments promptly
3. ✅ Review carry-forward reports monthly
4. ✅ Contact parents with outstanding debt
5. ✅ Export reports for accounting

### For School Admins:
1. ✅ Ensure fee structure is set for each year
2. ✅ Train finance staff on new system
3. ✅ Communicate carry-forward policy to parents
4. ✅ Set deadlines for clearing previous debts

---

## 📞 Support Contacts

**Technical Issues:**
- Contact: System Administrator
- Location: finance.html, parent.html

**Payment Issues:**
- Contact: Finance Office
- Phone: [School phone]

**General Queries:**
- Contact: School Office
- Email: [School email]

---

## 🎓 Summary

**The carry-forward system ensures:**
- ✅ No unpaid fees are lost
- ✅ Parents see complete picture
- ✅ Admins can track debts easily
- ✅ Year-by-year transparency
- ✅ Automatic calculations
- ✅ Consistent across all pages

**Remember:** Unpaid fees from previous years are automatically added to the current year's total. Clear previous debts first to avoid accumulation!

---

## ✨ Happy Finance Tracking! 🚀

