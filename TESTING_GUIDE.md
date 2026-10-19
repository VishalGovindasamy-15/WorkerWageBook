# Worker WageBook - Testing Guide

**Version**: 1.0  
**Last Updated**: 2026-10-18  
**Status**: Production Ready

---

## Table of Contents

1. [Testing Overview](#testing-overview)
2. [TypeScript Compilation](#typescript-compilation)
3. [Manual Testing Checklist](#manual-testing-checklist)
4. [Business Logic Testing](#business-logic-testing)
5. [Edge Cases & Error Handling](#edge-cases--error-handling)
6. [Performance Testing](#performance-testing)
7. [Security Testing](#security-testing)
8. [Test Data Setup](#test-data-setup)

---

## Testing Overview

This guide provides comprehensive testing procedures for the Worker WageBook application. All tests should be performed before deploying to production.

### Testing Environments

- **Development**: `npm run web` (port 8081)
- **Production Build**: `npx expo export --platform web`
- **Mobile**: Expo Go app or simulator

---

## TypeScript Compilation

### Command
```bash
cd worker-wagebook
npx tsc --noEmit
```

### Expected Result
- **Exit Code**: 0
- **Errors**: 0
- **Warnings**: 0 (strict mode enabled)

### What This Tests
- All type definitions are correct
- No implicit `any` types
- All imports resolve correctly
- Function signatures match usage
- No null/undefined access errors

---

## Manual Testing Checklist

### 1. Application Startup ✅

- [ ] App loads without errors
- [ ] PIN lock screen appears (if PIN set)
- [ ] Home screen displays after unlock
- [ ] Current week dates are correct
- [ ] Navigation tabs are visible (Home, Workers, Attendance, Salary, Reports)

### 2. Worker Management ✅

#### Create Worker
- [ ] Navigate to Workers tab
- [ ] Tap "Add Worker" button
- [ ] Enter only name (all other fields optional)
- [ ] Save worker
- [ ] **Verify**: Employee ID auto-generated (W-001, W-002, etc.)
- [ ] **Verify**: Worker appears in list

#### Create Worker with All Fields
- [ ] Enter name, phone, category, daily wage, joining date, notes
- [ ] Save worker
- [ ] **Verify**: All fields saved correctly
- [ ] **Verify**: Wage change history created

#### Edit Worker
- [ ] Tap on worker from list
- [ ] Edit name and daily wage
- [ ] Save changes
- [ ] **Verify**: Changes saved
- [ ] **Verify**: Wage change history updated with effective date

#### Deactivate Worker
- [ ] Tap on worker from list
- [ ] Tap "Deactivate" button
- [ ] Confirm deactivation
- [ ] **Verify**: Worker marked as inactive
- [ ] **Verify**: Worker hidden from attendance marking

#### Filter Workers
- [ ] Toggle active/inactive filter
- [ ] Select category filter
- [ ] Search by name or Employee ID
- [ ] **Verify**: Filters work correctly
- [ ] **Verify**: Results update in real-time

### 3. Attendance Marking ✅

#### Mark Attendance - Present
- [ ] Navigate to Attendance tab
- [ ] Select a date
- [ ] Tap "Present" for a worker
- [ ] **Verify**: Status changes to present (green checkmark)
- [ ] **Verify**: Daily wage snapshot recorded

#### Mark Attendance - Present with Overtime
- [ ] Tap "Present" for a worker
- [ ] Enter overtime hours (e.g., 2)
- [ ] Select "Calculated" or "Manual" amount
- [ ] Save
- [ ] **Verify**: Overtime hours recorded
- [ ] **Verify**: Overtime amount calculated correctly
- [ ] **Verify**: Overtime is additive (worker still marked present)

#### Mark Attendance - Half Day
- [ ] Tap "Half Day" for a worker
- [ ] **Verify**: Status changes to half day (orange icon)
- [ ] **Verify**: Will pay 50% of daily wage

#### Mark Attendance - Absent
- [ ] Tap "Absent" for a worker
- [ ] **Verify**: Status changes to absent (red X)
- [ ] **Verify**: No pay for this day

#### Mark Attendance - Holiday
- [ ] Tap "Holiday" for a worker
- [ ] **Verify**: Status changes to holiday (sun icon)
- [ ] **Verify**: Will pay full daily wage

#### Mark Attendance - Leave
- [ ] Tap "Leave" for a worker
- [ ] Select "Paid" or "Unpaid"
- [ ] **Verify**: Status changes to leave (calendar icon)
- [ ] **Verify**: Paid leave will pay, unpaid will not

#### Edit Attendance
- [ ] Tap on existing attendance record
- [ ] Change status
- [ ] Enter reason for change (required)
- [ ] Save
- [ ] **Verify**: Change saved
- [ ] **Verify**: Edit history created with old/new values
- [ ] **Verify**: Timestamp and editor recorded

#### View Edit History
- [ ] Tap on attendance record
- [ ] View edit history
- [ ] **Verify**: All changes visible with timestamps
- [ ] **Verify**: Old and new values shown
- [ ] **Verify**: Reason for change displayed

### 4. Advance Management ✅

#### Record Advance
- [ ] Navigate to Salary tab
- [ ] Tap "Record Advance"
- [ ] Select worker
- [ ] Enter amount (e.g., 1000)
- [ ] Enter reason (optional)
- [ ] Save
- [ ] **Verify**: Advance recorded
- [ ] **Verify**: Outstanding balance increased

#### View Outstanding Advances
- [ ] Navigate to Reports → Outstanding Advances
- [ ] **Verify**: Worker appears with outstanding balance
- [ ] **Verify**: Total outstanding calculated correctly

#### Multiple Advances
- [ ] Record second advance for same worker (e.g., 500)
- [ ] **Verify**: Outstanding balance = 1000 + 500 = 1500
- [ ] **Verify**: Both advances visible in worker profile

### 5. Salary Settlement ✅

#### Preview Salary
- [ ] Navigate to Salary tab
- [ ] View weekly salary preview
- [ ] **Verify**: All workers with attendance shown
- [ ] **Verify**: Gross earnings calculated correctly
- [ ] **Verify**: Advance deductions shown
- [ ] **Verify**: Net pay calculated

#### View Detailed Breakdown
- [ ] Tap on worker's salary card
- [ ] View earnings section
- [ ] **Verify**: Base wages listed
- [ ] **Verify**: Overtime earnings listed
- [ ] **Verify**: Half-day adjustments shown
- [ ] View deductions section
- [ ] **Verify**: Advance recoveries listed
- [ ] **Verify**: Net pay = Earnings - Deductions

#### Confirm Settlement
- [ ] Tap "Confirm Settlement" button
- [ ] Review summary
- [ ] Confirm
- [ ] **Verify**: Settlement locked
- [ ] **Verify**: Status changes to "Confirmed"
- [ ] **Verify**: Advance balance decreased by recovery amount

#### Duplicate Settlement Prevention
- [ ] Try to confirm settlement again for same week
- [ ] **Verify**: System returns existing settlement
- [ ] **Verify**: No duplicate created

#### Net Pay Never Negative
- [ ] Create scenario: Worker has ₹1000 earnings, ₹2000 advance
- [ ] Confirm settlement
- [ ] **Verify**: Recovery capped at ₹1000
- [ ] **Verify**: Net pay = ₹0 (not negative)
- [ ] **Verify**: ₹1000 advance carried forward

### 6. Reports ✅

#### Weekly Salary Report
- [ ] Navigate to Reports → Weekly Salary Statement
- [ ] **Verify**: All settled workers shown
- [ ] **Verify**: Gross, deductions, net pay displayed
- [ ] Tap "Share" button
- [ ] **Verify**: Text report generated
- [ ] Tap "Export PDF" button
- [ ] **Verify**: PDF generated with business name
- [ ] **Verify**: Share sheet opens

#### Attendance Report
- [ ] Navigate to Reports → Daily Attendance Register
- [ ] **Verify**: All workers shown with daily status
- [ ] **Verify**: Status icons correct (present, absent, etc.)
- [ ] **Verify**: Overtime hours displayed
- [ ] Tap "Export PDF"
- [ ] **Verify**: PDF generated correctly

#### Outstanding Advances Report
- [ ] Navigate to Reports → Outstanding Advances
- [ ] **Verify**: Only workers with balance shown
- [ ] **Verify**: Total outstanding calculated
- [ ] Tap "Export PDF"
- [ ] **Verify**: PDF generated correctly

#### Cashbook Report
- [ ] Navigate to Reports → Cashbook
- [ ] **Verify**: All advances listed
- [ ] **Verify**: All salary payments listed
- [ ] **Verify**: Total outflow calculated

### 7. Settings ✅

#### Business Profile
- [ ] Navigate to Settings → Business Profile
- [ ] Enter business name, owner name, phone, address
- [ ] Save
- [ ] **Verify**: Settings saved
- [ ] **Verify**: Business name appears in PDF reports

#### Change PIN
- [ ] Navigate to Settings → Change PIN
- [ ] Enter current PIN
- [ ] Enter new PIN (4 digits)
- [ ] Confirm new PIN
- [ ] Save
- [ ] **Verify**: PIN changed
- [ ] **Verify**: Must use new PIN to unlock app

#### Salary Calculation Rules
- [ ] Navigate to Settings → Salary Rules
- [ ] Edit half-day multiplier (e.g., 0.5 → 0.6)
- [ ] Edit overtime multiplier (e.g., 1.5 → 2.0)
- [ ] Edit advance recovery mode (full → partial)
- [ ] Edit max recovery percentage (e.g., 50% → 30%)
- [ ] Save
- [ ] **Verify**: Rules saved
- [ ] **Verify**: Future calculations use new rules

#### Category Management
- [ ] Navigate to Settings → Manage Categories
- [ ] Add new category (e.g., "Electrician")
- [ ] Set default wage
- [ ] Save
- [ ] **Verify**: Category created
- [ ] **Verify**: Available in worker creation dropdown
- [ ] Edit existing category
- [ ] **Verify**: Changes saved
- [ ] Delete category (with no workers)
- [ ] **Verify**: Category deleted

#### Export Data
- [ ] Navigate to Settings → Export All Data (CSV)
- [ ] Confirm export
- [ ] **Verify**: CSV file generated
- [ ] **Verify**: Share sheet opens
- [ ] **Verify**: File contains all workers

#### Import Workers
- [ ] Navigate to Settings → Import Workers (CSV)
- [ ] Select CSV file
- [ ] **Verify**: Import starts
- [ ] **Verify**: Success/failed counts shown
- [ ] **Verify**: Duplicate employee IDs skipped
- [ ] **Verify**: Auto-generated IDs for blank entries

### 8. Audit Trail ✅

- [ ] Navigate to Home → Activity Logs
- [ ] **Verify**: All recent actions logged
- [ ] **Verify**: Worker creation logged
- [ ] **Verify**: Attendance changes logged
- [ ] **Verify**: Advance records logged
- [ ] **Verify**: Settlement confirmations logged
- [ ] **Verify**: Old/new values shown for edits
- [ ] **Verify**: Timestamps and editor recorded

### 9. PIN Lock ✅

- [ ] Set up PIN (if not already set)
- [ ] Close and reopen app
- [ ] **Verify**: PIN lock screen appears
- [ ] Enter wrong PIN
- [ ] **Verify**: Error message shown
- [ ] Enter correct PIN
- [ ] **Verify**: App unlocks
- [ ] Navigate to Settings → Clear PIN
- [ ] Confirm
- [ ] **Verify**: PIN removed
- [ ] **Verify**: App no longer requires PIN

---

## Business Logic Testing

### Salary Calculation Scenarios

#### Scenario 1: Full Week Present
```
Worker: Daily wage ₹500
Attendance: 6 days present
Expected Gross: 6 × 500 = ₹3000
```

#### Scenario 2: Mixed Attendance
```
Worker: Daily wage ₹500
Attendance:
  - Day 1: Present (₹500)
  - Day 2: Half Day (₹250)
  - Day 3: Absent (₹0)
  - Day 4: Holiday (₹500)
  - Day 5: Present (₹500)
  - Day 6: Leave - Unpaid (₹0)
Expected Gross: 500 + 250 + 0 + 500 + 500 + 0 = ₹1750
```

#### Scenario 3: Present with Overtime
```
Worker: Daily wage ₹500, Overtime rate ₹100/hour
Attendance: Present + 2 hours overtime
Expected Gross: 500 (base) + 200 (overtime) = ₹700
```

#### Scenario 4: Advance Recovery - Full Mode
```
Worker: Gross earnings ₹3000
Outstanding advance: ₹1000
Recovery mode: Full
Expected Recovery: ₹1000
Expected Net Pay: ₹2000
```

#### Scenario 5: Advance Recovery - Partial Mode (50%)
```
Worker: Gross earnings ₹3000
Outstanding advance: ₹2000
Recovery mode: Partial (50%)
Max Recovery: 3000 × 50% = ₹1500
Expected Recovery: ₹1500
Expected Net Pay: ₹1500
Expected Carry Forward: ₹500
```

#### Scenario 6: Net Pay Never Negative
```
Worker: Gross earnings ₹1000
Outstanding advance: ₹2000
Recovery mode: Full
Expected Recovery: ₹1000 (capped at gross)
Expected Net Pay: ₹0 (never negative)
Expected Carry Forward: ₹1000
```

---

## Edge Cases & Error Handling

### Edge Cases to Test

1. **Worker with No Attendance**
   - Settle salary for worker with no attendance records
   - Expected: Gross = ₹0, Net = ₹0

2. **Zero Daily Wage**
   - Create worker with ₹0 daily wage
   - Mark attendance
   - Expected: Gross = ₹0

3. **Multiple Advances Same Week**
   - Record 3 advances for same worker
   - Settle salary
   - Expected: All advances considered in recovery

4. **Settlement Adjustment**
   - Confirm settlement
   - Adjust settlement (add bonus)
   - Expected: New settlement created, old one voided

5. **Week Spanning Two Months**
   - Select week that crosses month boundary
   - Expected: Calculations work correctly

6. **All Workers Absent**
   - Mark all workers absent for a day
   - Expected: No errors, gross = ₹0 for all

7. **Very Large Advance Amount**
   - Record advance of ₹100,000
   - Worker earns ₹500/week
   - Expected: Recovery capped, balance carries forward indefinitely

8. **Concurrent Settlement Attempts**
   - Try to confirm same settlement twice rapidly
   - Expected: Only one settlement created (idempotent)

### Error Handling to Test

1. **Invalid CSV Import**
   - Upload CSV with missing required fields
   - Expected: Import fails with clear error message

2. **Database Connection Loss**
   - Simulate database error
   - Expected: User-friendly error message, no crash

3. **File System Unavailable**
   - Try to export when file system unavailable
   - Expected: Error message shown

4. **Invalid Date Selection**
   - Try to mark attendance for future date
   - Expected: Prevented or warned

5. **Negative Wage Input**
   - Try to enter negative daily wage
   - Expected: Validation prevents it

---

## Performance Testing

### Load Testing

1. **Large Worker List**
   - Create 100+ workers
   - Navigate to Workers list
   - Expected: List loads in <2 seconds
   - Expected: Scrolling is smooth

2. **Large Attendance Data**
   - Create 6 months of attendance for 50 workers
   - View attendance report
   - Expected: Report loads in <3 seconds

3. **Multiple Settlements**
   - Create 52 weekly settlements (1 year)
   - View salary history
   - Expected: History loads in <2 seconds

### Memory Testing

1. **Long Session**
   - Use app continuously for 1 hour
   - Expected: No memory leaks, no slowdown

2. **Multiple PDF Exports**
   - Export 10 PDFs in succession
   - Expected: No crashes, consistent performance

---

## Security Testing

### PIN Security

1. **Brute Force Prevention**
   - Try 10 wrong PINs in a row
   - Expected: Account locked or rate limited

2. **PIN Storage**
   - Verify PIN is hashed, not stored in plain text
   - Expected: Database shows hashed PIN

3. **Session Management**
   - Leave app idle for 30 minutes
   - Expected: App locks, requires PIN again

### Data Security

1. **Audit Trail Integrity**
   - Try to delete audit log entries
   - Expected: Not possible (no delete function)

2. **Settlement Locking**
   - Try to edit locked settlement
   - Expected: Not possible (must create adjustment)

3. **Input Sanitization**
   - Enter SQL injection attempts in text fields
   - Expected: Sanitized, no SQL injection possible

---

## Test Data Setup

### Sample Workers

```csv
name,phone,category,daily_wage,joining_date
Raj Kumar,9876543210,Mason,600,2024-01-01
Suresh Patel,9876543211,Helper,400,2024-01-15
Amit Singh,9876543212,Painter,550,2024-02-01
Vijay Sharma,9876543213,Plumber,500,2024-02-15
Ravi Verma,9876543214,Electrician,650,2024-03-01
```

### Sample Attendance Week

```
Week: 2024-10-14 to 2024-10-19

Raj Kumar:
  Mon: Present
  Tue: Present + 2h overtime
  Wed: Half Day
  Thu: Present
  Fri: Present
  Sat: Holiday

Suresh Patel:
  Mon: Present
  Tue: Absent
  Wed: Present
  Thu: Present
  Fri: Leave (Paid)
  Sat: Present
```

### Sample Advances

```
Raj Kumar: ₹2000 (recorded 2024-10-01, reason: "Medical emergency")
Suresh Patel: ₹500 (recorded 2024-10-10, reason: "Festival advance")
Amit Singh: ₹1000 (recorded 2024-09-15, reason: "Family function")
```

---

## Test Results Template

Use this template to document test results:

```
Test Date: ___________
Tester: ___________
App Version: ___________

TypeScript Compilation: ☐ PASS  ☐ FAIL
Errors: _____

Manual Testing:
  Worker Management: ☐ PASS  ☐ FAIL
  Attendance: ☐ PASS  ☐ FAIL
  Advances: ☐ PASS  ☐ FAIL
  Salary Settlement: ☐ PASS  ☐ FAIL
  Reports: ☐ PASS  ☐ FAIL
  Settings: ☐ PASS  ☐ FAIL
  Audit Trail: ☐ PASS  ☐ FAIL
  PIN Lock: ☐ PASS  ☐ FAIL

Business Logic:
  Salary Calculation: ☐ PASS  ☐ FAIL
  Overtime: ☐ PASS  ☐ FAIL
  Advance Recovery: ☐ PASS  ☐ FAIL
  Net Pay Protection: ☐ PASS  ☐ FAIL

Edge Cases: ☐ PASS  ☐ FAIL
Performance: ☐ PASS  ☐ FAIL
Security: ☐ PASS  ☐ FAIL

Issues Found:
1. ___________________________________
2. ___________________________________
3. ___________________________________

Overall Status: ☐ READY FOR PRODUCTION  ☐ NEEDS FIXES

Sign-off: ___________
```

---

## Conclusion

Complete all tests in this guide before deploying to production. Document any issues found and verify fixes before final deployment.

**Minimum Requirements for Production:**
- ✅ TypeScript compilation: 0 errors
- ✅ All manual tests: PASS
- ✅ All business logic tests: PASS
- ✅ No critical edge case failures
- ✅ Performance acceptable
- ✅ Security tests PASS
