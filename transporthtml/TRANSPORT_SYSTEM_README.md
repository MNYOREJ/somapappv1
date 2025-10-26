# 🚌 SoMAp Transport Management System v2.1

## Overview

A comprehensive, beautiful, and highly functional transport management system with glassmorphic dark UI. This system manages student transport assignments, payments, debts, expenses, and complete financial tracking.

## 🎨 UI/UX Features

### Glassmorphic Dark Beauty Theme
- **Dark gradient background** with animated effects
- **Glassmorphic cards** with backdrop blur and transparency
- **Smooth animations** and transitions
- **Modern color palette** with gradients
- **Responsive design** for all screen sizes
- **Beautiful gradients** for text and buttons

### Design Philosophy
- Clean, organized, and professional
- Easy to navigate and use
- Clear visual hierarchy
- Accessibility-focused
- Mobile-responsive

## 📋 Core Features

### 1. Transport Hub Dashboard (`transport.html`)

#### Year Selection & Date Display
- **Year Dropdown**: Select academic year (2024-2029)
- **Automatic Date Display**: Shows current date and updates in real-time
- **Month Context**: Current month highlighted for payments

#### KPI Cards
1. **Students on Transport** (Clickable)
   - Total number of students using transport
   - Opens detailed student registry
   
2. **Not Using Transport**
   - Students available for enrollment
   
3. **Expected This Month**
   - Total expected transport fees for current month
   - Automatic calculation based on routes and multipliers
   
4. **Paid This Month**
   - Total payments received
   - Collection percentage
   
5. **Outstanding Debt**
   - Total unpaid amounts
   - Critical alert system

#### Management Cards
- **Payments Queue**: Full payment tracking and debt management
- **Vehicle Registry**: Fleet management with insurance tracking
- **Routes & Stops**: Route and stop management
- **Fuel Requests**: Fuel tracking and approval
- **Maintenance Desk**: Repairs and maintenance history
- **Boarding Gate**: No Pay, No Board control
- **Reports & Exports**: Analytics and export tools
- **Operations & Toggles**: System configuration

### 2. Students on Transport Registry

#### Student List Features
- **Complete student data** from `studentlist.html`:
  - Admission Number
  - Full Name (First, Middle, Last)
  - Class
  - Date of Registration
  - Parent Contact
  - School Fee Total
  - School Fee Paid Amount
  - School Debt
  - Debt Till (from finance.html)

#### Transport Status Column
- **Using/Not Using** indicator
- Visual chip badges (green for using, yellow for not using)

#### Transport Assignment
When clicking "Assign Transport", a comprehensive modal opens:

##### 1. Route Selection
All routes organized by distance bands with prices:

**1 KM - 17,000 TZS/month/time:**
- Jirani na Shule, Mazengo, Mbezi, Msikitini, Mlimani RC, Uswahilini Kanisani, International, Kona Dampo, Mauwa, Mwisho wa Fensi, Ghati, Mnara wa Halotel

**1.5 KM - 18,500 TZS/month/time:**
- Sinoni, Kidemi, Soko Mjinga, Mnara wa Voda, Mbugani Kwenye Lami Tu

**2 KM - 21,000 TZS/month/time:**
- Glorious, Ushirika, Tanga Kona, Njia Mtoni, Kaburi Moja, Kwa Malaika, Savanna, Dampo, Darajani, Kikwete Road, Boma Kubwa, Kiwetu Pazuri, Umoja Road, Njiro Ndogo, King David

**3-4 KM - 24,000 TZS/month/time:**
- Chavda, Matokeo, Milano, Jamhuri, Felix Mrema, Lemara, Bonisite, Intel, Patel, Terrati, Si Mbaoil

**5-6 KM - 25,000 TZS/month/time:**
- Mapambazuko, Mkono wa Madukani, Soweto, Mianzini Barabarani, Eliboru JR, Green Valley, Country Coffee, Maua, Pepsi, Majengo

**6-10 KM - 28,000 TZS/month/time:**
- Sanawari, Sekei, Shabani, Kimandolu, Kijenge, Mkono wa Shuleni

**10-15 KM - 38,000 TZS/month/time:**
- Suye, Moshono, Nado, Mwanama Reli, Kisongo

**NJE YA MAENEO HAYA - 44,000 TZS/month/time:**
- Kiserian, Chekereni, Duka Bovu, Tengeru, Ngulelo, Kwamrefu, Shangarai Atomic

##### 2. Time Period Selection
- **Morning Only (Asubuhi)**: Single morning route
- **Evening Only (Jioni)**: Single evening route  
- **Both (Morning & Evening)**: Two routes (can be different)

##### 3. Drop-off Point Selection
- Dynamic dropdowns based on period selection
- Separate morning and evening drop points
- Can select different locations for morning vs evening

##### 4. Automatic Fare Calculator
**Real-time calculation shows:**
- Morning route price (if selected)
- Evening route price (if selected)
- Total monthly base fee
- Monthly multiplier information:
  - January: 1.5× (45,000 for both if base is 30,000)
  - April: 0.8×
  - June: 0× (No payment)
  - July: 1.5×
  - September: 0.8×
  - November: 1.25×
  - December: 0× (No payment)
  - Other months: 1×

##### 5. Vehicle Assignment (Auto)
- Shows route ID
- Auto-populates assigned driver from `transportbuses.html`
- Driver UID linked to vehicle registry

### 3. Transport Payments System (`transportpayments.html`)

#### Financial KPIs Dashboard
1. **Total Expected (This Month)**: Sum of all monthly fees
2. **Total Collected**: All-time transport payments
3. **Total Transport Debt**: Outstanding amounts
4. **Total Expenses**: Fuel + Maintenance + Other
5. **Net Balance**: Collected - Expenses

#### Critical Alert System
- **Red banner** for students with unpaid fees
- **"USIMCHUKUE ANADAIWA"** warning on debtor rows
- Payment deadline reminder (27th of each month)
- Automatic sorting (debtors first)

#### Comprehensive Payment Table
**Columns:**
1. Admission No
2. Full Name (with debt warning if applicable)
3. Class
4. Date Registered
5. Parent Contact
6. School Fee Total (from finance.html)
7. School Fee Paid (from finance.html)
8. School Debt (from finance.html)
9. Debt Till (from finance.html - shows installment)
10. Route (Morning)
11. Route (Evening)
12. Monthly Transport Fee (auto-calculated)
13. Transport Paid (total)
14. Transport Debt
15. Unpaid Months (list of months)
16. **Total Combined Debt** (School + Transport)
17. Actions (Pay, History)

#### Visual Debt Indicators
- **Red background** on entire row for students with debt
- **Bold red text** for debt amounts
- **"⚠️ USIMCHUKUE ANADAIWA"** warning badge
- Green text for paid amounts

#### Filtering & Searching
- **Class Filter**: Filter by specific class
- **Search**: Search by name or admission number
- **Status Filter**: Paid/Partially Paid/Unpaid
- **Debtors Only Toggle**: Show only students with debt
- **Sort**: Auto-sort by debt (highest first)

#### Payment Recording
**Payment Modal includes:**
- Student information display
- Month selection (1-12)
- Amount input (pre-filled with monthly fee)
- Payment method dropdown
- Reference/Transaction number
- Notes field
- Automatic debt recalculation

#### Expense Tracking
**Categories:**
- FUEL
- MAINTENANCE
- REPAIRS
- INSURANCE
- PERMITS
- SALARIES (Driver)
- OTHER

**Expense Features:**
- Quick stats (Fuel, Maintenance, Other)
- Add new expense form
- Expenses table with date, category, description, amount
- Auto-aggregation by category
- Year-based filtering

#### Export Functionality
**Excel Export includes:**
- All student data
- School financial data
- Transport financial data
- Combined debt calculations
- Ready for analysis and reporting

### 4. Pricing System (`transport_pricing.js`)

#### Per-Time Pricing
- Prices are **per time** (morning OR evening)
- If student uses both morning and evening, fees are **added**
- Example: Morning (17,000) + Evening (17,000) = 34,000/month

#### Monthly Multipliers
Automatic application of multipliers:
```javascript
January: 1.5×
April: 0.8×
June: 0× (No payment)
July: 1.5×
September: 0.8×
November: 1.25×
December: 0× (No payment)
Other months: 1×
```

#### Stop Price Lookup
- Normalized stop names (lowercase, trimmed)
- Fuzzy matching for variations
- Default fallback pricing

## 🔗 System Integration

### Integration with finance.html
- **Student debt data** pulled from main finance system
- **Debt Till** installment information
- **School fee payments** displayed alongside transport
- **Combined debt calculations** for complete picture

### Integration with studentlist.html
- **Complete student registry** access
- **All student fields** available
- **Real-time sync** with student data
- **Class-based filtering**

### Integration with transportbuses.html
- **Route ID** linking
- **Driver UID** auto-assignment
- **Vehicle capacity** tracking
- **Insurance status** monitoring

## 📊 Data Structure

### Firebase Realtime Database Paths

```
students/
  {studentId}/
    admissionNumber
    firstName
    middleName
    lastName
    classLevel
    feePerYear
    payments/
      {paymentId}/
        amount
        timestamp
    timestamp
    primaryParentContact

transport_enrollments/
  {studentId}/
    school
    year
    period (morning/evening/both)
    amStop (morning route)
    pmStop (evening route)
    route (primary route)
    updatedAt
    updatedBy

transport_payments/
  {studentId}/
    {paymentId}/
      month
      year
      amount
      method
      reference
      notes
      timestamp
      recordedBy

transport_expenses/
  {expenseId}/
    category
    amount
    description
    year
    timestamp
    addedBy

transport/{school}/{year}/buses/
  {busId}/
    plate
    assignedRouteId
    assignedDriverUid
    capacity
    status
    // ... other vehicle data
```

## 🎯 Key Workflows

### 1. Assigning Transport to a Student
1. Open transport.html
2. Click "Students on Transport" KPI card
3. Find student (filter by class or search)
4. Click "Assign Transport"
5. Select route(s)
6. Select period (morning/evening/both)
7. Select drop-off points
8. Review auto-calculated fare
9. Save assignment

### 2. Recording a Payment
1. Open transportpayments.html
2. Find student (debtors show first)
3. Click "💵 Pay" button
4. Select month
5. Enter amount
6. Select payment method
7. Add reference/notes
8. Save payment
9. Debt automatically recalculates

### 3. Tracking Expenses
1. Open transportpayments.html
2. Scroll to "Transport Expenses Tracker"
3. Select category
4. Enter amount and description
5. Click "Add Expense"
6. View in expenses table
7. Monitor net balance

### 4. Identifying Debtors
1. Open transportpayments.html
2. Click "Show Debtors Only"
3. Red-highlighted rows appear first
4. Check "USIMCHUKUE ANADAIWA" warnings
5. Review "Unpaid Months" column
6. Take action (contact parent, block boarding)

## 🚀 Getting Started

### Prerequisites
- Firebase account with Realtime Database
- Student data in `students/` path
- User authentication set up

### Configuration
1. Update Firebase config in HTML files
2. Set up user roles in database
3. Import student data if migrating
4. Configure school/year context

### First Time Setup
1. Access transport.html
2. Select academic year
3. Import students using transport
4. Assign routes and periods
5. Set up vehicles and drivers
6. Begin payment tracking

## 💡 Best Practices

### Payment Collection
- **Deadline**: 27th of each month for following month
- Example: Pay November fees by October 27th
- Send reminders 3 days before deadline
- Use "Show Debtors" before each deadline

### Debt Management
- Review debtors weekly
- Contact parents immediately
- Combine school + transport debt discussions
- Use "USIMCHUKUE ANADAIWA" status for boarding control

### Expense Tracking
- Record all transport expenses
- Categorize correctly for reporting
- Monitor net balance regularly
- Review fuel consumption patterns

### Route Management
- Assign routes based on proximity
- Balance vehicle capacity
- Consider traffic patterns (AM vs PM)
- Update routes as needed

## 📱 Mobile Responsiveness

All pages are fully responsive:
- Cards stack on mobile
- Tables scroll horizontally
- Touch-friendly buttons
- Readable fonts on small screens

## 🔒 Security & Permissions

### Role-Based Access
- **Admin**: Full access to all features
- **Transport Officer**: View and edit transport data
- **Accountant**: View financial data
- **Driver**: View assigned routes only
- **Parent**: View child's transport info (via parent hub)

### Data Protection
- User authentication required
- Role verification on page load
- Secure Firebase rules
- Audit trail for payments

## 🐛 Troubleshooting

### Common Issues

**Students not showing:**
- Check Firebase data path
- Verify authentication
- Check console for errors

**Prices not calculating:**
- Verify TransportPricing module loaded
- Check route spelling (case-insensitive)
- Review monthly multiplier logic

**Payments not saving:**
- Check user permissions
- Verify Firebase write rules
- Check network connection

## 📈 Future Enhancements

Potential additions:
- SMS notifications for payment reminders
- Parent portal for payment viewing
- GPS tracking integration
- Automated route optimization
- Mobile app version
- QR code for boarding
- Attendance tracking via transport
- Fuel efficiency analytics

## 🤝 Support

For issues or questions:
1. Check console for errors
2. Verify Firebase connection
3. Review data structure
4. Check user permissions

## 📝 Version History

### v2.1 (Current)
- Glassmorphic dark UI theme
- Year dropdowns (2024-2029)
- Automatic date display
- Complete student registry integration
- Transport assignment with route selection
- Automatic fare calculator
- Monthly multipliers
- Comprehensive payment tracking
- Combined debt (school + transport)
- "USIMCHUKUE ANADAIWA" alert system
- Expense tracking
- Excel export
- Mobile responsive design

---

**Built with ❤️ for SoMAp School Management System**

*"Best in transport management, better than any other school system"*

