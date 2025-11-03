# 🧪 Testing Guide - Transport Routes

## Quick Start Testing

### 1. Open the Page
- Navigate to: `transporthtml/transportroutes.html`
- Or visit: https://somapv2i.com/transporthtml/transportroutes.html?school=socrates&year=2025

### 2. Check Browser Console (F12)
You should see these logs on page load:
```
🚀 Transport Routes Script Loading...
📄 DOM Content Loaded!
🚀 Starting app initialization...
✨ Initializing Transport Routes app...
📅 Initializing year selector...
✅ Year selector found, populating with years: [2023, 2024, ...]
✅ Year selector initialized with current year: 2025
🔧 Setting up event listeners...
📋 DOM elements check: {...}
✅ Add Stop button listener attached
✅ Bulk Import button listener attached
✅ Import This Year button listener attached
... (more logs)
✨ All event listeners successfully set up!
```

---

## 🎯 Feature Testing Checklist

### ✅ 1. Year Dropdown
**Expected Behavior:**
- Dropdown shows years from 2023 to 2042
- Current year (2025) is pre-selected
- "Working year: 2025" displays next to dropdown

**Test:**
1. Look at the Academic Year dropdown
2. Click it - should show 20 years
3. Select different year
4. Page should reload data for that year

**Console Output:**
```
📅 Year changed to: 2026
🎨 Rendering transport routes page...
```

---

### ✅ 2. Import This Year Button (📦)
**Expected Behavior:**
- Imports 67 routes for currently selected year
- Shows confirmation if routes already exist
- Displays progress and success message

**Test:**
1. Click "📦 Import This Year" button
2. Confirm the dialog
3. Wait for import to complete
4. Check success message

**Console Output:**
```
🔘 Import This Year button clicked!
📦 Import This Year handler called
📦 migrateLegacyRoutes function called
📅 Importing for year: 2025
📊 Will import 67 routes
... (progress logs)
✨ Import complete!
   ✅ Imported: 67
   ⏭️  Skipped: 0
```

---

### ✅ 3. Import All Years Button (🚀)
**Expected Behavior:**
- Imports 67 routes across 6 years (2024-2029)
- Shows confirmation dialog
- Displays total count
- Takes longer (imports 402 routes total)

**Test:**
1. Click "🚀 Import All Years" button
2. Confirm the dialog (shows: "67 routes for 6 years")
3. Wait for bulk import (may take 30-60 seconds)
4. Check success message

**Console Output:**
```
🔘 Bulk Import button clicked!
🚀 Bulk Import handler called
🚀 bulkImportAllYears function called
📊 Will import 67 routes across 6 years
✅ Starting bulk import for years: [2024, 2025, ...]
📅 === Importing for year 2024 ===
   Found 0 existing routes
   ⏳ Progress: 10 imported...
   ⏳ Progress: 20 imported...
... (more progress)
✨ Bulk import complete!
   ✅ Total imported: 402
   ⏭️  Total skipped: 0
```

---

### ✅ 4. Add Stop Button (+)
**Expected Behavior:**
- Opens modal for new stop
- Validates required fields
- Saves to database
- Closes modal and refreshes list

**Test:**
1. Click "+ Add Stop" button
2. Modal should open with title "Add New Stop"
3. Enter stop name: "Test Stop"
4. Enter base fee: 25000
5. Check "Active" checkbox (should be checked by default)
6. Click "💾 Save Stop"
7. Modal closes, new stop appears in list

**Console Output:**
```
🔘 Add Stop button clicked!
➕ Add Stop handler called
📅 Opening modal for year: 2025
... (user fills form)
🔘 Save stop clicked
🎨 Rendering transport routes page...
✅ Loaded X stops
```

---

### ✅ 5. Edit Stop
**Expected Behavior:**
- Opens modal with existing data
- Updates stop on save
- Refreshes display

**Test:**
1. Find any stop in the list
2. Click "✏️ Edit" button
3. Modal opens with existing data
4. Change base fee (e.g., from 25000 to 26000)
5. Click "💾 Save Stop"
6. Changes should reflect in the list

---

### ✅ 6. Toggle Stop Active/Inactive
**Expected Behavior:**
- Changes stop status
- Updates badge (Active ↔ Inactive)
- Button text changes (Activate ↔ Deactivate)

**Test:**
1. Find an active stop (green "Active" badge)
2. Click "🚫 Deactivate" button
3. Badge changes to yellow "Inactive"
4. Button text changes to "✅ Activate"
5. Click again to reactivate

---

### ✅ 7. Delete Stop
**Expected Behavior:**
- Shows confirmation dialog
- Removes stop from database
- Removes from display

**Test:**
1. Find any stop
2. Click "🗑️" (trash) button
3. Confirm deletion
4. Stop disappears from list

**Console Output:**
```
Stop deleted successfully!
```

---

### ✅ 8. Search Stops
**Expected Behavior:**
- Filters stops in real-time
- Case-insensitive
- Instant results

**Test:**
1. Type "sinoni" in search box
2. List filters to show only matching stops
3. Clear search
4. All stops reappear

**Console Output:**
```
🔍 Search input changed
🎨 Rendering transport routes page...
```

---

### ✅ 9. Monthly Multipliers
**Expected Behavior:**
- Shows 12 month inputs
- Color-coded (red=0, green=high, gray=normal)
- Saves all values at once

**Test:**
1. Scroll to "📆 Monthly Multipliers" section
2. Change January multiplier to 2.0
3. Change June to 0 (holiday month)
4. Click "💾 Save" button
5. Success message appears

**Console Output:**
```
🔘 Save Multipliers button clicked!
💾 Save Multipliers handler called
📅 Saving multipliers for year: 2025
📊 Saving 12 multipliers: {1: 2.0, 2: 1.0, ...}
✅ Multipliers saved successfully
```

---

## 🔍 Debugging Commands

### Check All Systems
Open console (F12) and paste:

```javascript
// System check
console.log('=== SYSTEM CHECK ===');
console.log('Year Context:', window.somapYearContext);
console.log('Current Year:', window.somapYearContext.getSelectedYear());
console.log('TransportPricing:', !!window.TransportPricing);
console.log('Firebase:', !!window.firebase);
console.log('Database:', !!firebase.database);
console.log('Auth:', !!firebase.auth);

// Handler check
console.log('\n=== HANDLERS ===');
console.log('handleAddStop:', typeof window.handleAddStop);
console.log('handleBulkImport:', typeof window.handleBulkImport);
console.log('handleMigrateLegacy:', typeof window.handleMigrateLegacy);
console.log('handleSaveMultipliers:', typeof window.handleSaveMultipliers);
```

### Expected Output:
```
=== SYSTEM CHECK ===
Year Context: {getSelectedYear: ƒ, setSelectedYear: ƒ, onYearChanged: ƒ}
Current Year: 2025
TransportPricing: true
Firebase: true
Database: true
Auth: true

=== HANDLERS ===
handleAddStop: function
handleBulkImport: function
handleMigrateLegacy: function
handleSaveMultipliers: function
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Year dropdown is empty
**Symptoms:** Dropdown shows no options
**Solution:** 
- Check console for errors
- Verify `SOMAP_ALLOWED_YEARS` is defined
- Ensure `initYearSelector()` is called

**Debug:**
```javascript
console.log(SOMAP_ALLOWED_YEARS);  // Should show array of years
```

---

### Issue 2: Buttons don't respond
**Symptoms:** Clicking buttons does nothing
**Solution:**
- Check console for "button listener attached" messages
- Verify no JavaScript errors
- Check if handlers are defined

**Debug:**
```javascript
// Try calling directly
window.handleAddStop();  // Should open modal
```

---

### Issue 3: Import fails
**Symptoms:** "Failed to import" error
**Solution:**
- Check Firebase connection
- Verify database rules allow writes
- Check if user is authenticated

**Debug:**
```javascript
// Check Firebase connection
firebase.database().ref('.info/connected').on('value', snap => {
  console.log('Connected:', snap.val());
});

// Check auth
firebase.auth().onAuthStateChanged(user => {
  console.log('User:', user ? user.email : 'Not logged in');
});
```

---

### Issue 4: Data not saving
**Symptoms:** Changes don't persist
**Solution:**
- Check Firebase security rules
- Verify user has write permissions
- Check console for error messages

**Debug:**
```javascript
// Test write permission
firebase.database().ref('test').set({timestamp: Date.now()})
  .then(() => console.log('✅ Write successful'))
  .catch(err => console.error('❌ Write failed:', err));
```

---

### Issue 5: Stops not appearing
**Symptoms:** Empty list after import
**Solution:**
- Check if year is correct
- Verify data exists in Firebase
- Check console logs

**Debug:**
```javascript
// Check database directly
const year = 2025;
firebase.database().ref(`transportCatalog/${year}/stops`)
  .once('value')
  .then(snap => {
    console.log('Stops in database:', snap.val());
  });
```

---

## 📱 Testing on Mobile

### Mobile Browser Testing
1. Open on mobile device
2. All buttons should be touch-friendly
3. Modals should be scrollable
4. Dropdowns should work with native UI

### Responsive Design Check
1. Resize browser window
2. Grid should adapt (2 columns → 1 column)
3. Buttons should wrap properly
4. No horizontal scroll

---

## ✅ Acceptance Criteria

All these should work:
- [ ] Year dropdown shows and changes work
- [ ] Import This Year imports 67 routes
- [ ] Import All Years imports across 6 years
- [ ] Add Stop creates new stops
- [ ] Edit Stop updates existing stops
- [ ] Toggle Stop changes active status
- [ ] Delete Stop removes stops
- [ ] Search filters in real-time
- [ ] Multipliers save successfully
- [ ] Console logs show no errors
- [ ] Toast messages appear for all actions
- [ ] Page is responsive on mobile

---

## 🎉 Success Indicators

### Visual Checks:
✅ Year dropdown populated with years
✅ Stop cards display with prices
✅ Active/Inactive badges show correctly
✅ Search box filters results
✅ Multiplier inputs show values
✅ Buttons have hover effects
✅ Modals open and close smoothly

### Functional Checks:
✅ All buttons clickable and responsive
✅ Data persists after page reload
✅ Import operations complete successfully
✅ CRUD operations work (Create, Read, Update, Delete)
✅ Year changes load correct data
✅ No console errors
✅ Toast notifications appear

### Performance Checks:
✅ Page loads in < 2 seconds
✅ Imports complete in reasonable time
✅ No lag when typing in search
✅ Smooth animations and transitions

---

## 📊 Expected Data After Tests

After running all tests, you should have:
- **67 stops** for year 2025 (if imported)
- **402 stops total** across years 2024-2029 (if bulk imported)
- **Any custom stops** you added during testing
- **12 multiplier values** saved for current year

---

## 🚀 Ready for Production!

If all tests pass, the application is ready for:
- ✅ Production deployment
- ✅ User acceptance testing
- ✅ Real student data import
- ✅ Daily operations

---

**Happy Testing! 🎉**

