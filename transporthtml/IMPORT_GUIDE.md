# 📦 Import & Edit Legacy Routes Guide

## Quick Start: Import Your Routes

### Step 1: Open Routes Management
1. Navigate to: `https://somapv2i.com/transporthtml/transportroutes.html?school=socrates&year=2025`
2. You'll see the **Routes & Pricing Management** page

### Step 2: Import Legacy Routes
1. Make sure **Academic Year** is set to **2025**
2. Click the **"📦 Import Legacy Routes"** button (blue button next to search)
3. Watch the progress:
   - Toast shows: "🔄 Importing legacy routes..."
   - Browser console shows each route being imported
4. Success message: "✅ Imported 67 routes!"

### Step 3: View Imported Routes
All 67 routes will appear as cards in the grid:

```
┌─────────────────────────────────┐
│ Sinoni                    Active│
│ TSh 18,500 /month              │
│ ✏️ Edit  | 🚫 Deactivate | 🗑️  │
└─────────────────────────────────┘
```

## Editing Routes (Any Time, Any Year)

### Edit Price for Current Year

**Example: Change Sinoni from 18,500 to 20,000 in 2025**

1. Find **"Sinoni"** card (use search if needed)
2. Click **"✏️ Edit"** button
3. Modal opens showing:
   ```
   Stop Name: Sinoni
   Base Monthly Fee (TSh): 18500
   ☑️ Active
   ```
4. Change **18,500** → **20,000**
5. Click **"💾 Save Stop"**
6. Toast shows: "Stop updated successfully!"
7. **Result**: All students assigned to Sinoni in 2025 now pay TSh 20,000/month

### Edit Price for Different Year

**Example: Set different price for Sinoni in 2026**

1. **Switch Year**: Change dropdown to **2026**
2. Click **"📦 Import Legacy Routes"** (imports fresh for 2026)
3. Find **"Sinoni"** card
4. Click **"✏️ Edit"**
5. Change **18,500** → **28,500** (2026 increase!)
6. Click **"💾 Save Stop"**
7. **Result**: 
   - 2025 students: Pay TSh 20,000/month (from earlier edit)
   - 2026 students: Pay TSh 28,500/month (new price)

### Edit Multiple Routes at Once

1. Search for routes: Type "kwa" → finds "Kwa Malaika"
2. Edit each one
3. Changes save individually
4. All active immediately

## What Can You Edit?

### ✅ Editable Fields:
- **Stop Name**: Rename route (e.g., "Sinoni" → "Sinoni Junction")
- **Base Monthly Fee**: Change price (e.g., 18,500 → 20,000)
- **Active Status**: Turn on/off (inactive routes won't show in assignment dropdown)

### 🔒 Auto-Managed:
- **Creation Date**: Set on import
- **Updated Date**: Changes when you edit
- **Import Flag**: Marks which routes came from legacy system

## Year-Specific Pricing Examples

### Scenario 1: Inflation Adjustment
```
2025: Sinoni = TSh 18,500 (current)
2026: Sinoni = TSh 20,350 (10% increase)
2027: Sinoni = TSh 22,385 (10% increase)
```

### Scenario 2: Route-Specific Changes
```
2025: All routes at current prices
2026: 
  - City routes: +5,000 (fuel costs)
  - Suburban: +2,000
  - Rural: unchanged
```

### Scenario 3: Mid-Year Adjustment
```
Jan-Jun 2025: Sinoni = 18,500
Jul-Dec 2025: Create new stop "Sinoni (Updated)" = 20,000
              Assign new students to updated stop
```

## Common Operations

### 1. Bulk Import for New Year
```
Switch to 2026 → Import Legacy Routes
→ All 67 routes created with 2025 prices
→ Edit prices individually for 2026
```

### 2. Deactivate Old Routes
```
Find outdated route → Click "🚫 Deactivate"
→ Existing students keep it
→ New students can't be assigned
```

### 3. Delete Unused Routes
```
Click "🗑️" → Confirm
⚠️ Warning: Only delete if NO students assigned
```

### 4. Search & Edit
```
Type "sinoni" → Enter
→ Find all matching routes
→ Edit individually
```

## When Students Get Assigned

### Assignment Time:
When you assign a student to transport:
1. System reads **current year's** stop prices from database
2. Calculates: `Base Fee = Morning Stop + Evening Stop`
3. Saves `baseMonthlyFee` to assignment
4. Monthly payments use: `Base × Month Multiplier`

### Price Lock Behavior:
- **Old System**: Prices hardcoded, same for everyone
- **New System**: Price at assignment time is saved
- **Mid-year change**: New assignments use new price, old keep old price

### Example:
```
Student A assigned Jan 2025:
  Sinoni = 18,500 → saves 18,500

You edit Sinoni to 20,000 (Feb 2025)

Student B assigned Mar 2025:
  Sinoni = 20,000 → saves 20,000

Result:
  Student A pays: 18,500/month (locked)
  Student B pays: 20,000/month (new price)
```

**To update Student A**: Re-assign them from dashboard

## Troubleshooting

### Button Not Working?
1. **Check Console**: Press F12 → Console tab
2. Look for: "Migration started..." 
3. If no logs → Button not found issue
4. **Solution**: Refresh page, clear cache

### Import Says "0 routes imported"?
1. Routes already exist for this year
2. Click "Import" again → Confirm duplicate check
3. Or delete year's stops first, then import

### Can't Edit Price?
1. Check if you're authenticated
2. Verify Firebase connection
3. Check browser console for errors

### Routes Not Showing in Assignment?
1. Check stop is marked **Active**
2. Verify correct **year** selected
3. Refresh assignment page

## Database Structure

After import, your Firebase looks like:
```
transportCatalog/
  └── 2025/
      └── stops/
          ├── -N1a2b3c4d5/
          │   ├── name: "Sinoni"
          │   ├── baseFee: 18500
          │   ├── active: true
          │   ├── createdAt: 1699000000000
          │   ├── updatedAt: 1699000000000
          │   └── imported: true
          ├── -N1a2b3c4d6/
          │   ├── name: "Dampo"
          │   ├── baseFee: 21000
          │   └── ...
          └── ... (67 total)
```

## Best Practices

### ✅ Do:
- Import once per year at start
- Edit prices as needed throughout year
- Keep historical pricing by year
- Test with 1-2 students before mass assignment

### ❌ Don't:
- Delete routes with active students
- Import multiple times without checking duplicates
- Change prices mid-month (confuses parents)
- Skip year backups before major changes

## Summary

🎯 **Import Button** → Loads all 67 routes for selected year
✏️ **Edit Button** → Change price/name any time
📅 **Year Selector** → Different prices per year
💾 **Auto-Save** → Changes reflect immediately
🔄 **Reassign** → Update student's locked price

---

**Need Help?** Check browser console (F12) for detailed logs during import.

