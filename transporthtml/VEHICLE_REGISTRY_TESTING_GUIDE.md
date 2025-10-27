# 🚐 Vehicle Registry - Testing & Troubleshooting Guide

## Issue Fixed: "+ Add Vehicle" Button Disappearing

### **What Was Wrong:**
The "+ Add Vehicle" button was flashing and disappearing on page load because:
1. The button visibility was controlled by permission checks
2. Permission checks happened asynchronously after page load
3. Button would show briefly, then hide before role was properly loaded

### **What Was Fixed:**
1. ✅ Added proper loading state while authentication initializes
2. ✅ Improved permission check logic to wait for role to load
3. ✅ Added console logging to debug role issues
4. ✅ Added better error handling for driver loading failures
5. ✅ Made button visibility more predictable

---

## 🧪 **TESTING CHECKLIST**

### **Step 1: Sign In & Page Load**
- [ ] Open `transportbuses.html` in your browser
- [ ] You should see a "Loading..." message in KPI card
- [ ] Check browser console (F12) for "User role loaded: [your-role]"
- [ ] "+ Add Vehicle" button should appear if you're admin or transport_officer
- [ ] KPI cards should populate with real data

**If button doesn't appear:**
- Check console for your role: Press F12, look for `User role loaded:`
- Your role must be one of: `admin`, `transport_officer`, `super_admin`, `owner`, `director`, `headteacher`
- If your role shows as "guest" or "none", you need to set your role in Firebase

### **Step 2: Click "+ Add Vehicle"**
- [ ] Click the "+ Add Vehicle" button
- [ ] Modal should open with the title "Add New Vehicle"
- [ ] One route card should be visible by default
- [ ] All form fields should be empty and ready for input

**If modal doesn't open:**
- Check browser console for errors
- Make sure you have permission (canEdit = true)

### **Step 3: Fill in Vehicle Details**
**Required Fields (marked with *):**
- [ ] Plate / Registration Number
- [ ] Make & Model (e.g., "Toyota Hiace 2020")
- [ ] Seating Capacity (number)
- [ ] Vehicle Status (dropdown)
- [ ] Owner Full Name
- [ ] Owner Phone Number
- [ ] Ownership Type (School Owned or Contracted)
- [ ] Assigned Driver (should show drivers from workers database)
- [ ] At least one Route
- [ ] Insurance Provider
- [ ] Insurance Policy Number
- [ ] Insurance Expiry Date
- [ ] Insurance Photo (upload image)
- [ ] Road Permit Expiry
- [ ] Road Permit Photo
- [ ] Inspection Expiry
- [ ] Inspection Photo

**If ownership type is "Contracted":**
- [ ] Payment Frequency (Weekly/Monthly/Yearly)
- [ ] Payment Amount (TZS)
- [ ] Contract Notes (optional but recommended)

### **Step 4: Add Multiple Routes**
- [ ] Click "+ Add Route" button
- [ ] New route card should appear
- [ ] Select different route from dropdown
- [ ] Click "❌ Remove" on any route card to remove it
- [ ] At least one route must remain (validation will check)

### **Step 5: Upload Photos**
- [ ] Click "Choose File" for Insurance Photo
- [ ] Select an image file
- [ ] Preview should appear below the file input
- [ ] Repeat for Road Permit Photo
- [ ] Repeat for Inspection Photo

**Supported formats:** JPG, JPEG, PNG, GIF, WEBP

### **Step 6: Save Vehicle**
- [ ] Click "💾 Save Vehicle" button
- [ ] Toast notification should show "Saving vehicle..."
- [ ] Photos should upload to Firebase Storage
- [ ] Toast should show "Vehicle added successfully! ✅"
- [ ] Modal should close automatically
- [ ] New vehicle should appear in the table below

**If save fails:**
- Check console for errors
- Ensure all required fields are filled
- Check Firebase Storage rules allow uploads
- Verify database rules allow writes to `transport/{school}/{year}/buses`

### **Step 7: View Vehicle in Table**
- [ ] Vehicle should appear in table with all details
- [ ] Plate, Make/Model, Owner, Driver name should be visible
- [ ] Routes should show as colored chips
- [ ] Insurance, Permit, Status should show correct chips
- [ ] "✏️ Edit" button should be visible
- [ ] "📄 PDF" button should be visible

### **Step 8: Edit Vehicle**
- [ ] Click "✏️ Edit" on any vehicle
- [ ] Modal should open with title "Edit Vehicle: [PLATE]"
- [ ] All fields should be populated with existing data
- [ ] Routes should show all assigned routes
- [ ] Photo previews should appear if photos exist
- [ ] Modify any field
- [ ] Click "💾 Save Vehicle"
- [ ] Changes should be reflected in table

**Note:** When editing, photo uploads are optional (only upload if changing photos)

### **Step 9: Download PDF**
- [ ] Click "📄 PDF" on any vehicle
- [ ] PDF preview modal should open
- [ ] All vehicle details should be formatted nicely
- [ ] Click "📥 Download PDF"
- [ ] PDF file should download to your computer
- [ ] Open PDF to verify all information is correct

### **Step 10: Driver Integration Test**
**Pre-requisite:** Register a driver in `workersadmission.html` first

1. Go to `workersadmission.html`
2. Fill in worker details
3. **Important:** Set Role to "Dereva / Driver"
4. Save the worker
5. Return to `transportbuses.html`
6. Click "+ Add Vehicle"
7. Check "Assigned Driver" dropdown
- [ ] Your driver should appear with full name and phone
- [ ] Select the driver
- [ ] Save vehicle
- [ ] Driver name should show in table

**If driver doesn't appear:**
- Refresh the page (drivers load on page load)
- Check that worker's role is exactly "driver" in Firebase
- Check that worker's active status is not false
- Check browser console for "Loaded drivers: [number]"

---

## 🔍 **DEBUGGING TIPS**

### Check Your Role in Firebase:
```
Database path: users/{your-user-id}/role
Should be: "admin" or "transport_officer" or similar
```

### Check Drivers in Firebase:
```
Database path: workers/{worker-id}/profile/role
Driver's role should be: "driver"
Driver's active should be: true (or not set)
```

### Check Saved Vehicles:
```
Database path: transport/SoMAp/2025/buses/{bus-id}
Should contain: plate, makeModel, capacity, assignedDriverUid, assignedRoutes, etc.
```

### Browser Console Commands:
Open browser console (F12) and type:
```javascript
// Check current state
console.log('Role:', state.role);
console.log('User:', state.user);
console.log('Drivers loaded:', state.drivers.length);
console.log('Vehicles loaded:', state.vehicles.length);

// Check if you can edit
console.log('Can edit:', canEdit());
```

---

## 🛠️ **COMMON ISSUES & SOLUTIONS**

### Issue: Button Still Disappears
**Solution:**
1. Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)
2. Clear browser cache
3. Check your role in Firebase database
4. Make sure you're signed in

### Issue: No Drivers in Dropdown
**Solution:**
1. Go to `workersadmission.html`
2. Register at least one worker with role = "driver"
3. Return to transportbuses.html and refresh
4. Check console: "Loaded drivers: [number]"

### Issue: Photos Won't Upload
**Solution:**
1. Check file size (should be under 5MB)
2. Check file format (must be image: jpg, png, gif, webp)
3. Check Firebase Storage rules
4. Check browser console for upload errors

### Issue: "No permission" Error
**Solution:**
1. Check Firebase database rules
2. Ensure you're signed in
3. Check your user role in database
4. Contact administrator to grant proper role

### Issue: Save Button Doesn't Work
**Solution:**
1. Check that ALL required fields are filled (look for red *)
2. Ensure at least one route is selected
3. Check browser console for validation errors
4. Try with fewer fields first to isolate issue

---

## ✅ **SUCCESS INDICATORS**

You know everything is working when:
1. ✅ "+ Add Vehicle" button appears and stays visible
2. ✅ Clicking button opens modal smoothly
3. ✅ Drivers appear in dropdown from workers database
4. ✅ All routes are available in dropdowns
5. ✅ Can add multiple routes to one vehicle
6. ✅ Photos upload and preview correctly
7. ✅ Save button works and shows success message
8. ✅ Vehicles appear in table with all details
9. ✅ Edit function loads existing data correctly
10. ✅ PDF download generates professional document
11. ✅ Contract fields appear only when "Contracted" selected
12. ✅ All KPI cards show correct numbers

---

## 📊 **EXPECTED BEHAVIOR**

### On Page Load:
1. Loading indicator appears
2. User authentication verified
3. Role loaded from database
4. Console shows: "User role loaded: [role]"
5. Drivers loaded: "Loaded drivers: [number]"
6. Vehicles data loads
7. KPI cards populate
8. Table shows vehicles or "No vehicles" message
9. "+ Add Vehicle" button shows (if you have permission)

### On Click "+ Add Vehicle":
1. Modal opens instantly
2. Form is clean/empty
3. One route card is present
4. All dropdowns are populated
5. Driver dropdown shows all active drivers
6. Route dropdown shows all 73+ routes

### On Save:
1. Toast shows "Saving vehicle..."
2. Form validates all required fields
3. Photos upload to Firebase Storage
4. Data saves to Firebase Database
5. Toast shows "Vehicle added successfully! ✅"
6. Modal closes
7. Table refreshes
8. New vehicle appears in table

---

## 🆘 **STILL HAVING ISSUES?**

1. **Check Firebase Console:**
   - https://console.firebase.google.com
   - Verify Database rules allow read/write
   - Check Storage rules allow uploads
   - Verify Authentication is working

2. **Check Browser Console:**
   - Press F12
   - Look for errors in red
   - Check Network tab for failed requests

3. **Verify Data Structure:**
   - Database path should be: `transport/SoMAp/2025/buses/`
   - Workers path should be: `workers/{id}/profile/role`
   - Users path should be: `users/{id}/role`

4. **Test with Different Account:**
   - Sign out
   - Sign in with admin account
   - Try adding vehicle

5. **Clear Everything and Start Fresh:**
   - Sign out
   - Clear browser cache (Ctrl+Shift+Del)
   - Close all browser tabs
   - Reopen and sign in
   - Try again

---

## 📝 **NOTES**

- All timestamps are in milliseconds (Date.now())
- Photos are stored in Firebase Storage: `transport/{school}/{year}/buses/{busId}/`
- Vehicle data is stored in Realtime Database: `transport/{school}/{year}/buses/{busId}`
- Drivers come from Workers system: `workers/{id}/profile`
- User roles are stored in: `users/{userId}/role`

---

**Version:** 2.1  
**Last Updated:** October 27, 2025  
**Status:** Fully Functional ✅

---

*If everything works as described above, your Vehicle Registry is production-ready!* 🎉🚐

