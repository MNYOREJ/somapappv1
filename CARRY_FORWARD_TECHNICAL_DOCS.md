# Carry-Forward Debt - Technical Documentation

## 🏗️ Architecture Overview

The carry-forward debt system is built on a **shared aggregator pattern** that ensures consistency across all finance-related pages.

```
┌─────────────────────────────────────────────────┐
│           Finance Aggregator (Core)             │
│  ┌───────────────────────────────────────────┐  │
│  │  getFeePerYear(year, studentId)          │  │
│  │  sumFinancePaymentsForYear(...)          │  │
│  │  getCarryForward(year, studentId)        │  │
│  │  getFinanceAggregate(year, studentId)    │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
              ↓                    ↓
    ┌─────────────────┐  ┌─────────────────┐
    │  finance.html   │  │  parent.html    │
    └─────────────────┘  └─────────────────┘
```

---

## 📚 API Reference

### Core Functions

#### `getFeePerYear(year, studentId)`

**Purpose:** Fetch the base fee for a student for a specific year

**Parameters:**
- `year` (String|Number): Academic year (e.g., "2025")
- `studentId` (String): Student's unique ID

**Returns:** `Promise<Number>` - Fee amount (0 if not found)

**Database Path:** `studentFees/{year}/{studentId}/feePerYear`

**Example:**
```javascript
const fee = await getFeePerYear('2025', 'student123');
console.log(fee); // 645000
```

**Error Handling:** Returns 0 on any error (missing data, network issue, etc.)

---

#### `sumFinancePaymentsForYear(year, studentId, admissionNoOpt)`

**Purpose:** Sum all approved finance payments for a student for a specific year

**Parameters:**
- `year` (String|Number): Academic year
- `studentId` (String): Student's unique ID
- `admissionNoOpt` (String, optional): Student's admission number for matching

**Returns:** `Promise<Number>` - Total payments (0 if none)

**Database Path:** `approvalsHistory/{year}/{month}/{recordId}`

**Matching Logic:**
```javascript
const matches = record.sourceModule === 'finance' && (
  record.modulePayload?.studentKey === studentId ||
  record.studentAdm === admissionNoOpt
);
```

**Example:**
```javascript
const paid = await sumFinancePaymentsForYear('2025', 'student123', 'AUTO-123');
console.log(paid); // 605000
```

**Performance Note:** Scans all months in the year, all payment records. Use sparingly for large datasets.

---

#### `getCarryForward(year, studentId, admissionNoOpt)`

**Purpose:** Get carry-forward debt for a student (from previous year)

**Parameters:**
- `year` (String|Number): Current year (debt FROM year-1)
- `studentId` (String): Student's unique ID
- `admissionNoOpt` (String, optional): Admission number

**Returns:** `Promise<Number>` - Carry-forward amount (0 if none)

**Database Paths:**
1. **Primary:** `financeCarryForward/{year}/{studentId}/amount` (manual override)
2. **Fallback:** Computed as `max(0, fee(year-1) - paid(year-1))`

**Algorithm:**
```javascript
// Step 1: Check for manual override
const stored = await db.ref(`financeCarryForward/${year}/${studentId}/amount`).once('value');
if (stored.val() > 0) return stored.val();

// Step 2: Compute from previous year
const prevYear = String(Number(year) - 1);
if (Number(prevYear) < 2023) return 0; // No data before 2023

const feePrev = await getFeePerYear(prevYear, studentId);
const paidPrev = await sumFinancePaymentsForYear(prevYear, studentId, admissionNoOpt);
const carry = Math.max(0, feePrev - paidPrev);
return carry;
```

**Example:**
```javascript
// For 2026 (looks at 2025 data)
const carry = await getCarryForward('2026', 'student123', 'AUTO-123');
console.log(carry); // 40000 (if 2025 had 645k fee, 605k paid)
```

**Edge Cases:**
- Year < 2023: Returns 0
- Previous year has no data: Returns 0
- Manual override present: Uses that value instead of computing

---

#### `getFinanceAggregate(year, studentId, admissionNoOpt)`

**Purpose:** **Main aggregator** - Get complete finance summary for a student for a year

**Parameters:**
- `year` (String|Number): Academic year
- `studentId` (String): Student's unique ID
- `admissionNoOpt` (String, optional): Admission number

**Returns:** `Promise<Object>`

**Return Object:**
```javascript
{
  year: String,          // "2025"
  fee: Number,           // Current year fee only (e.g., 500000)
  paid: Number,          // Payments for current year only (e.g., 200000)
  carry: Number,         // Debt from previous year (e.g., 40000)
  totalDueDisplay: Number, // fee + carry (e.g., 540000)
  outstanding: Number    // totalDueDisplay - paid (e.g., 340000)
}
```

**Example:**
```javascript
const agg = await getFinanceAggregate('2026', 'student123', 'AUTO-123');
console.log(agg);
// {
//   year: "2026",
//   fee: 500000,
//   paid: 200000,
//   carry: 40000,
//   totalDueDisplay: 540000,
//   outstanding: 340000
// }
```

**Performance:** Runs 3 queries in parallel:
1. Fee for current year
2. Payments for current year
3. Carry-forward from previous year

**Usage in UI:**
```javascript
// finance.html - table row
const agg = await getFinanceAggregate(year, id, adm);
feeDueCell.textContent = fmt(agg.fee);
carryNoteDiv.textContent = agg.carry > 0 ? `Debt from ${year-1}: ${fmt(agg.carry)}` : '';
paidCell.textContent = fmt(agg.paid);
balanceCell.textContent = fmt(agg.outstanding);

// parent.html - stat cards
statFeeDue.textContent = fmtTsh(agg.totalDueDisplay);
statPaid.textContent = fmtTsh(agg.paid);
statBalance.textContent = fmtTsh(agg.outstanding);
```

---

#### `persistCarryForward(year, studentId, amount)` (Admin Only)

**Purpose:** Manually set carry-forward amount (override automatic calculation)

**Parameters:**
- `year` (String|Number): Year to set carry-forward FOR
- `studentId` (String): Student's unique ID
- `amount` (Number): Carry-forward amount in TSh

**Returns:** `Promise<Number>` - The amount that was set

**Database Path:** `financeCarryForward/{year}/{studentId}/amount`

**Example:**
```javascript
// Set 50,000 carry-forward for student123 in 2026
await persistCarryForward('2026', 'student123', 50000);
```

**When to Use:**
- Correcting errors in previous year data
- Special arrangements/waivers
- Manual adjustments

**Important:** This overrides automatic calculation! Use with caution.

---

## 🎨 UI Integration

### finance.html

#### Table Row Display

**Code Location:** `renderTable()` function (line ~869-992)

**Implementation:**
```javascript
const agg = await getFinanceAggregate(year, id, adm);

// Fee cell with carry-forward note
const carryNote = agg.carry > 0 
  ? `<div class="text-xs text-red-600 text-right mt-1 font-semibold">+ Debt from ${year-1}: ${fmt(agg.carry)}</div>`
  : '';

const feeCell = `
  <td class="p-2 border align-top text-right">
    <div>${fmt(agg.fee)}</div>
    ${carryNote}
  </td>
`;
```

**Visual Result:**
```
Fee (year)
500,000
+ Debt from 2025: 40,000  ← RED TEXT
```

#### Details Modal

**Code Location:** `openDetailsModal()` function (line ~1398-1488)

**Implementation:**
```javascript
const agg = await getFinanceAggregate(financeYear, id, adm);

// Red warning box for carry-forward
if (agg.carry > 0) {
  html += `
    <div class="mt-2 p-2 rounded" style="background: #fee2e2; border: 1px solid #fca5a5;">
      <p class="text-sm font-semibold" style="color: #991b1b;">
        <i class="fa fa-exclamation-triangle mr-1"></i>
        Debt carried from ${year-1}: ${fmt(agg.carry)}
      </p>
    </div>
  `;
}
```

**Visual Result:**
```
┌─────────────────────────────────────────┐
│ ⚠️ Debt carried from 2025: 40,000      │  ← RED BOX
└─────────────────────────────────────────┘
```

#### KPI Cards

**Code Location:** `renderTable()` function, totals section (line ~969-984)

**Implementation:**
```javascript
let totalDue = 0, totalCollected = 0;

for (const [id, student] of studentEntries) {
  const agg = await getFinanceAggregate(year, id, adm);
  totalDue += agg.totalDueDisplay;  // Includes carry-forward
  totalCollected += agg.paid;
}

const totalOutstanding = totalDue - totalCollected;
```

**Result:** KPIs accurately reflect ALL money owed including carry-forward debts.

---

### parent.html

#### Stat Cards

**Code Location:** `renderFinanceStats()` function (line ~966-1031)

**Implementation:**
```javascript
const agg = await getFinanceAggregate(yearStr, currentStudentKey, adm);

// Build explanatory note
let debtNote = '';
if (agg.carry > 0) {
  if (agg.fee === 0) {
    debtNote = `<span style="font-size: 0.65rem; color: var(--muted); display: block; margin-top: 2px; text-transform: lowercase;">debt carried from ${yearStr-1}</span>`;
  } else {
    debtNote = `<span style="font-size: 0.65rem; color: var(--muted); display: block; margin-top: 2px; text-transform: lowercase;">includes ${fmtTsh(agg.carry)} debt carried from ${yearStr-1}</span>`;
  }
}

// Update UI
if (debtNote) {
  statFeeDue.innerHTML = fmtTsh(agg.totalDueDisplay) + debtNote;
} else {
  statFeeDue.textContent = fmtTsh(agg.totalDueDisplay);
}
```

**Visual Result:**
```
Total Fee (Year)
TSh 540,000
includes TSh 40,000 debt carried from 2025  ← SMALL GRAY TEXT
```

#### Payment List Consistency

**Code Location:** `loadPaymentsAllSources()` function (line ~1251-1400)

**Implementation:**
```javascript
// Fallback: If renderFinanceStats hasn't run yet
if (!latestFinanceSnapshot) {
  const agg = await getFinanceAggregate(year, studentKey, adm);
  statFeeDue.innerHTML = fmtTsh(agg.totalDueDisplay) + debtNote;
  statPaid.textContent = fmtTsh(agg.paid);
  statBalance.textContent = fmtTsh(agg.outstanding);
}
```

**Ensures:** Payment list and stat cards always show consistent numbers.

---

## 🗄️ Database Schema

### Primary Nodes

#### 1. `studentFees/{year}/{studentId}`

**Structure:**
```json
{
  "feePerYear": 645000,
  "academicYear": "2025",
  "planId": "plan123",
  "classLevel": "Class 1"
}
```

**Purpose:** Stores base fee for each student per year

**Created By:** Admin when setting fee structure

---

#### 2. `approvalsHistory/{year}/{month}/{recordId}`

**Structure:**
```json
{
  "approvalId": "record123",
  "sourceModule": "finance",
  "studentAdm": "AUTO-123",
  "amountPaidNow": 100000,
  "paymentMethod": "MPesa",
  "datePaid": 1704067200000,
  "status": "approved",
  "modulePayload": {
    "studentKey": "student123",
    "payment": {
      "amount": 100000,
      "method": "MPesa",
      "timestamp": 1704067200000
    }
  }
}
```

**Purpose:** Stores all approved payments (pending moved here after admin approval)

**Created By:** Admin approval system (via `approvalsPending` → `approvalsHistory`)

**Key Fields:**
- `sourceModule`: Must be "finance" for fee payments
- `studentAdm`: Admission number (for matching)
- `modulePayload.studentKey`: Student ID (for matching)
- `amountPaidNow`: Payment amount

---

#### 3. `financeCarryForward/{year}/{studentId}`

**Structure:**
```json
{
  "amount": 40000,
  "sourceYear": "2025",
  "setAt": 1704067200000,
  "setBy": "admin@school.com",
  "reason": "Manual adjustment"
}
```

**Purpose:** Manual override for carry-forward amounts

**Created By:** Admin via `persistCarryForward()` or manual database edit

**Optional:** If not present, system auto-computes from previous year

---

## 🔄 Data Flow

### Scenario: Viewing 2026 Finance for Student with 2025 Debt

```
1. User selects year "2026"
   ↓
2. renderTable() calls getFinanceAggregate('2026', studentId, admNo)
   ↓
3. getFinanceAggregate runs 3 parallel queries:
   │
   ├─ getFeePerYear('2026', studentId)
   │  └─ Reads: studentFees/2026/studentId/feePerYear → 500000
   │
   ├─ sumFinancePaymentsForYear('2026', studentId, admNo)
   │  └─ Scans: approvalsHistory/2026/* 
   │     Filter: sourceModule='finance' && matches studentId
   │     Sum: 0 (no payments yet)
   │
   └─ getCarryForward('2026', studentId, admNo)
      ├─ Check: financeCarryForward/2026/studentId/amount → null
      ├─ Compute from 2025:
      │  ├─ getFeePerYear('2025', studentId) → 645000
      │  └─ sumFinancePaymentsForYear('2025', studentId, admNo) → 605000
      └─ Result: max(0, 645000 - 605000) = 40000
   ↓
4. Aggregate result:
   {
     year: "2026",
     fee: 500000,
     paid: 0,
     carry: 40000,
     totalDueDisplay: 540000,
     outstanding: 540000
   }
   ↓
5. UI renders:
   - Fee cell: "500,000" + red note "Debt from 2025: 40,000"
   - Paid cell: "0"
   - Balance cell: "540,000"
```

---

## 🚀 Performance Optimization

### Parallel Queries

The aggregator uses `Promise.all()` to run queries in parallel:

```javascript
const [fee, paid, carry] = await Promise.all([
  getFeePerYear(y, studentId),
  sumFinancePaymentsForYear(y, studentId, admissionNoOpt),
  getCarryForward(y, studentId, admissionNoOpt)
]);
```

**Benefit:** 3x faster than sequential queries

### Batch Processing

When rendering tables with many students:

```javascript
// Prefetch all aggregates in parallel
await Promise.all(studentEntries.map(async ([id, student]) => {
  aggregates[id] = await getFinanceAggregate(year, id, adm);
}));

// Then render using cached aggregates
for (const [id, student] of studentEntries) {
  const agg = aggregates[id];
  // Render...
}
```

**Benefit:** N students processed in ~time of 1 student (network parallelism)

### Caching

**Current:** No caching implemented

**Future Enhancement:**
```javascript
const cache = new Map(); // key: `${year}-${studentId}`

async function getFinanceAggregateWithCache(year, studentId, admNo) {
  const key = `${year}-${studentId}`;
  if (cache.has(key)) return cache.get(key);
  
  const agg = await getFinanceAggregate(year, studentId, admNo);
  cache.set(key, agg);
  return agg;
}
```

**Invalidation:** Clear cache on year change or payment approval

---

## 🐛 Error Handling

### Defensive Programming

All aggregator functions use try-catch and safe fallbacks:

```javascript
async function getFeePerYear(y, studentId){
  try {
    const snap = await db.ref(`studentFees/${y}/${studentId}/feePerYear`).once('value');
    return toInt(snap.val());
  } catch { 
    return 0;  // Safe fallback
  }
}
```

**Philosophy:** Never crash. Return sensible defaults (0 for amounts, empty string for text).

### Validation

```javascript
const toInt = v => Math.round(Number(v||0));  // Ensures integer, never NaN

// Year validation
if (Number.isNaN(Number(prev)) || Number(prev) < 2023) return 0;
```

### Logging

```javascript
console.debug('Payment sum discrepancy:', {
  yearPaymentsSum,
  snapshotPaid: latestFinanceSnapshot.paid,
  year
});
```

**Production:** Use debug-level logging (not shown to users unless console open)

---

## 🔒 Security Considerations

### Read-Only by Default

Aggregator functions are **read-only**. They don't modify data.

**Exception:** `persistCarryForward()` - Admin only, requires explicit call

### Input Sanitization

```javascript
const lowerStudent = String(studentId||'').trim();
const lowerAdm     = String(admissionNoOpt||'').trim();
```

**Prevents:** Injection attacks, type coercion issues

### Year Range Limits

```javascript
if (Number(prev) < 2023) return 0;
```

**Prevents:** Scanning years with no data (performance), negative years (nonsense)

---

## 🧪 Testing

### Unit Tests (Manual)

```javascript
// Test 1: Student with debt
const agg1 = await getFinanceAggregate('2026', 'student123', 'AUTO-123');
console.assert(agg1.carry === 40000, 'Carry-forward should be 40000');
console.assert(agg1.totalDueDisplay === 540000, 'Total due should be 540000');

// Test 2: Student fully paid
const agg2 = await getFinanceAggregate('2026', 'student456', 'AUTO-456');
console.assert(agg2.carry === 0, 'Carry-forward should be 0');
console.assert(agg2.totalDueDisplay === 500000, 'Total due should be 500000');

// Test 3: Student with no previous year data
const agg3 = await getFinanceAggregate('2024', 'newStudent', 'AUTO-789');
console.assert(agg3.carry === 0, 'Carry-forward should be 0 (no 2023 data)');
```

### Integration Tests (Manual)

1. **Year Switch Test:**
   - Switch from 2025 → 2026
   - Verify finance.html table updates
   - Verify parent.html stat cards update
   - Check both show same numbers

2. **Consistency Test:**
   - Open finance.html, note student's balance
   - Open parent.html for same student
   - Verify numbers match exactly

3. **Edge Case Test:**
   - Student with 0 fee current year but carry-forward
   - Student with negative "payment" (refund/overpayment)
   - Student graduated but still has debt

---

## 🔧 Maintenance

### Adding New Data Sources

To add a new payment source (e.g., scholarships):

1. **Update `sumFinancePaymentsForYear()`:**
   ```javascript
   // Add scholarship scan
   const scholarshipSnap = await db.ref(`scholarships/${y}/${studentId}`).once('value');
   const scholarship = scholarshipSnap.val() || {};
   sum += toInt(scholarship.amount);
   ```

2. **Test thoroughly** with students who have scholarships

3. **Update documentation**

### Migrating to New Database Structure

If moving from flat to nested structure:

1. **Write migration script:**
   ```javascript
   async function migrateToNewStructure() {
     const students = await db.ref('students').once('value');
     students.forEach(student => {
       // Migrate each student's data
     });
   }
   ```

2. **Run in test environment first**

3. **Keep old structure for 1 version (backward compatibility)**

4. **Update aggregator to read from both**

5. **Remove old structure after migration complete**

### Debugging

**Common Issues:**

1. **Wrong carry-forward amount:**
   ```javascript
   // Check previous year data
   const fee2025 = await getFeePerYear('2025', studentId);
   const paid2025 = await sumFinancePaymentsForYear('2025', studentId, adm);
   console.log({ fee2025, paid2025, expected: fee2025 - paid2025 });
   ```

2. **No carry-forward showing (should be there):**
   ```javascript
   // Check database paths
   const manualOverride = await db.ref(`financeCarryForward/2026/${studentId}/amount`).once('value');
   console.log('Manual override:', manualOverride.val());
   ```

3. **Performance issues:**
   ```javascript
   // Add timing
   console.time('getFinanceAggregate');
   const agg = await getFinanceAggregate('2026', studentId, adm);
   console.timeEnd('getFinanceAggregate');
   ```

---

## 📦 Deployment Checklist

Before deploying to production:

- [ ] Test with real data in staging
- [ ] Verify all students' carry-forward amounts are correct
- [ ] Check performance with full student list (100+ students)
- [ ] Test year switching (2023-2042)
- [ ] Verify finance.html and parent.html show same numbers
- [ ] Test on mobile devices
- [ ] Clear browser cache after deployment
- [ ] Train finance staff on new features
- [ ] Notify parents of new carry-forward visibility

---

## 🎓 Code Style

### Naming Conventions

- **Functions:** camelCase (`getFinanceAggregate`)
- **Constants:** UPPER_SNAKE_CASE (`EARLIEST_CARRY_FORWARD_YEAR`)
- **Variables:** camelCase (`totalDueDisplay`)
- **Database keys:** camelCase in code, snake_case in DB if legacy

### Async/Await

**Always use async/await**, never `.then()`:

```javascript
// ✅ Good
const agg = await getFinanceAggregate(year, id, adm);

// ❌ Bad
getFinanceAggregate(year, id, adm).then(agg => { ... });
```

### Error Handling

**Always return safe defaults, log errors:**

```javascript
try {
  const result = await dangerousOperation();
  return result;
} catch (err) {
  console.error('Operation failed:', err);
  return DEFAULT_VALUE;
}
```

---

## 📚 Further Reading

- Firebase Realtime Database: https://firebase.google.com/docs/database
- JavaScript Promises: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
- Async/Await: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function

---

## 🎉 Congratulations!

You now have a comprehensive understanding of the carry-forward debt system. Happy coding! 🚀

