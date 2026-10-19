# 📘 Worker WageBook — Complete User Guide & Manual

Welcome to the **Worker WageBook User Guide**! Whether you are a construction contractor, factory owner, agricultural manager, or site supervisor, this comprehensive manual will guide you step-by-step through every feature of the app with screenshots, visual workflows, and best practices.

---

## 📑 Table of Contents

1. [Introduction & Overview](#1-introduction--overview)
2. [Installation & First-Time Setup](#2-installation--first-time-setup)
   - [Installing the APK](#a-installing-the-apk)
   - [Initial Business Profile Setup](#b-initial-business-profile-setup)
   - [Setting Your 4-Digit Security PIN](#c-setting-your-4-digit-security-pin)
3. [Understanding the Home Dashboard](#3-understanding-the-home-dashboard)
4. [Worker Management](#4-worker-management)
   - [Adding a New Worker](#a-adding-a-new-worker)
   - [Searching & Dynamic Category Filtering](#b-searching--dynamic-category-filtering)
   - [Safely Deleting a Worker (PIN Guarded)](#c-safely-deleting-a-worker-pin-guarded)
5. [Daily Attendance & Overtime Engine](#5-daily-attendance--overtime-engine)
   - [Marking Daily Attendance Status](#a-marking-daily-attendance-status)
   - [Understanding Live Timestamps](#b-understanding-live-timestamps)
   - [Recording Overtime (Hours vs. Flat Cash)](#c-recording-overtime-hours-vs-flat-cash)
   - [Editing Attendance with Mandatory Audit Reasons](#d-editing-attendance-with-mandatory-audit-reasons)
6. [Managing Cash Advances](#6-managing-cash-advances)
   - [Issuing an Advance](#a-issuing-an-advance)
   - [How Advances Carry Forward Across Weeks](#b-how-advances-carry-forward-across-weeks)
7. [Weekly Salary Calculation & Mid-Week Differential Payouts](#7-weekly-salary-calculation--mid-week-differential-payouts)
   - [How the Calculation Works](#a-how-the-calculation-works)
   - [Weekly Settlement Overview](#b-weekly-settlement-overview)
   - [The Game Changer: Mid-Week Payouts & "Pay Remaining"](#c-the-game-changer-mid-week-payouts--pay-remaining)
8. [Worker Profile & 7-Column Monthly Calendar](#8-worker-profile--7-column-monthly-calendar)
   - [Profile Overview & Balance](#a-profile-overview--balance)
   - [The 7-Column Calendar Grid](#b-the-7-column-calendar-grid)
   - [Status Badges & Monthly Summary](#c-status-badges--monthly-summary)
9. [Generating & Exporting Reports](#9-generating--exporting-reports)
   - [Available Reports](#a-available-reports)
   - [Generating Professional PDF Reports](#b-generating-professional-pdf-reports)
   - [CSV Export & Import](#c-csv-export--import)
10. [Appearance, Themes & Settings](#10-appearance-themes--settings)
    - [Switching to High-Contrast Dark Mode](#a-switching-to-high-contrast-dark-mode)
    - [Configuring Salary Calculation Rules](#b-configuring-salary-calculation-rules)
    - [Security & Inactivity Auto-Lock](#c-security--inactivity-auto-lock)
    - [Factory Reset (Danger Zone)](#d-factory-reset-danger-zone)
11. [Mobile Navigation & Gesture Support](#11-mobile-navigation--gesture-support)
12. [Frequently Asked Questions (FAQ)](#12-frequently-asked-questions-faq)
13. [Developer & Support Information](#13-developer--support-information)

---

## 1. Introduction & Overview

**Worker WageBook** is an offline-first mobile application designed specifically for business owners and contractors who pay workers on a daily or weekly basis. 

### Why It Was Created:
Traditional paper khatas (registers) and complex spreadsheets lead to:
- Frequent disputes over overtime hours and missing attendance records.
- Confusion when workers request mid-week cash advances or partial salary payments.
- Loss of historical records when a notebook gets damaged or misplaced.

### Core Guarantees:
- **100% Offline**: All data is stored locally in an embedded SQLite database on your device. You can use it deep inside basements or remote construction sites without internet.
- **PIN Protected**: Your confidential wage and payout data is protected by a 4-digit master PIN.
- **Fair & Transparent**: Attendance records carry live timestamps and edit logs; salaries calculate automatically with clear mathematical breakdowns.

---

## 2. Installation & First-Time Setup

### A. Installing the APK
1. Download the standalone Android `.apk` file:
   - [⬇️ Download Worker WageBook APK](https://expo.dev/artifacts/eas/jMvl-fJoQ7g2plC2UIaEs3pzuvOv4Z8B_yDmldYIkqE.apk)
2. Tap the downloaded file in your browser downloads or file manager.
3. If Android prompts you with a security alert, tap **Settings** and enable **"Allow from this source"**.
4. Tap **Install** and open the app.

---

### B. Initial Business Profile Setup

When you first launch the app, you will be greeted by the **Setup Business Profile** onboarding screen:

<div align="center">
  <img src="./screenshots/01_onboarding_setup.png" width="320" alt="Business Setup Onboarding" />
</div>

1. **Business Name**: Enter your company, enterprise, or site name (e.g., *"ABC Constructions"*).
2. **Owner / Supervisor Name**: Enter your name for report headers.
3. **Contact Phone Number**: Used in official exported PDF reports.
4. **Week Starts On**: Choose the day your business work-week begins (**Monday**, **Sunday**, or **Saturday**). This controls how weekly attendance and salary settlements are grouped.
5. Tap **Continue to PIN Setup**.

---

### C. Setting Your 4-Digit Security PIN

Next, you will set a 4-digit security PIN to protect your business records:

<div align="center">
  <img src="./screenshots/02_pin_lock.png" width="320" alt="PIN Lock Setup" />
</div>

1. Type your desired 4-digit PIN on the numeric keypad.
2. Re-enter the same 4-digit PIN on the confirmation screen to verify.
3. Once confirmed, you will be taken directly to your **Home Dashboard**!

> **💡 Security Tip**: The app automatically locks if left idle for 5 minutes or when minimized. You can quickly unlock it anytime with your 4-digit PIN.

---

## 3. Understanding the Home Dashboard

The **Home Screen** is your command center. At a glance, it provides real-time totals for the active work-week:

<div align="center">
  <img src="./screenshots/03_home_dashboard.png" width="320" alt="Home Dashboard" />
</div>

### Key Elements:
1. **Week Header Banner**: Shows the active week date range (e.g., *Oct 19 – Oct 25, 2026*) and current settlement status (`UNSETTLED` or `SETTLED`).
2. **Summary KPI Cards**:
   - **Present Today**: Active workers present on the current date.
   - **Overtime Hours**: Total overtime accumulated by your team this week.
   - **Advances Given**: Total cash advances issued during the current week.
   - **Pending Wages**: Total net payable amount owed to workers for work completed so far.
3. **Quick Action Shortcuts**:
   - **Mark Attendance**: Jump directly to today's attendance roster.
   - **Give Advance**: Quickly log a cash advance for any worker.
   - **Settle Salaries**: Review and confirm weekly salary payouts.
   - **View Reports**: Access PDF and CSV export tools.
4. **Recent Attendance & Pending Advances**: Scroll down to see today's attendance breakdown and any workers with outstanding balances.

---

## 4. Worker Management

Tap the **Workers** tab in the bottom navigation bar to access the full worker directory.

<div align="center">
  <img src="./screenshots/06_workers_directory.png" width="320" alt="Worker Directory Screen" />
</div>

### A. Adding a New Worker
1. Tap the **+ Add Worker** button at the top-right of the Workers screen.
2. Fill in the worker's details:
   - **Full Name**: (e.g., *Ramesh Kumar*).
   - **Category**: Select their role (e.g., *Mason*, *Carpenter*, *Painter*, *Electrician*, *Helper*).
   - **Daily Wage Rate (₹)**: Base wage paid for a full day's work (e.g., `₹650`).
   - **Phone Number**: (Optional) For direct calling and record keeping.
   - **Photo**: (Optional) Take a photo with the camera or pick from the gallery.
3. **Auto-Generated Employee ID**: The app automatically assigns sequential IDs like `W-001`, `W-002`, `W-003`... ensuring no duplicate numbering.
4. Tap **Save Worker**.

---

### B. Searching & Dynamic Category Filtering

- **Search Bar**: Type any part of a worker's name or Employee ID to instantly filter the list.
- **Dynamic Category Filter Chips**:
  Unlike traditional apps that display a long list of empty categories, Worker WageBook features **Smart Dynamic Chips**. 
  - Only categories that currently have **at least one active worker** appear as filter chips.
  - Tapping **All** shows your entire workforce.
  - Tapping **Mason** shows only masons.
  - If you don't employ any plumbers, the *Plumber* chip is automatically hidden to keep your screen clean and clutter-free!

---

### C. Safely Deleting a Worker (PIN Guarded)

If a worker leaves your employment and you need to delete their record:

<div align="center">
  <img src="./screenshots/08_delete_worker_pin.png" width="320" alt="Delete Worker PIN Confirmation" />
</div>

1. Open the worker's profile from the list.
2. Scroll to the bottom and tap **Delete Worker**.
3. A security confirmation dialog will appear.
4. Enter your **4-digit Security PIN** to authorize deletion.
5. Once verified, the worker is safely removed from active rosters, preventing accidental clicks from disrupting your records.

---

## 5. Daily Attendance & Overtime Engine

Tap the **Attendance** tab in the bottom navigation bar to manage daily rolls.

<div align="center">
  <img src="./screenshots/04_attendance_screen.png" width="320" alt="Daily Attendance Screen" />
</div>

### A. Marking Daily Attendance Status
For each worker, simply tap one of the status buttons:
- **P (Present)**: Full daily wage (1.0x).
- **HD (Half Day)**: Half daily wage (0.5x by default, configurable in settings).
- **A (Absent)**: Zero wage (0.0x).
- **H (Holiday)**: Paid public/festival holiday (1.0x).
- **WO (Weekly Off)**: Paid weekly rest day (1.0x).
- **L (Leave)**: Approved leave.

---

### B. Understanding Live Timestamps
Whenever you tap a status, the app records the exact system timestamp and displays a badge:
- e.g., **"Marked at 08:45 AM"**
- This eliminates disputes with workers about when attendance was taken on site!

---

### C. Recording Overtime (Hours vs. Flat Cash)

Tap the **Overtime** button on any worker's card to expand the overtime drawer:

<div align="center">
  <img src="./screenshots/05_attendance_overtime.png" width="320" alt="Overtime Drawer" />
</div>

Worker WageBook supports **both** standard industry overtime methods:
1. **By Hours**:
   - Tap `+0.5h`, `+1h`, or type specific hours (e.g., `2.5`).
   - The engine automatically computes hourly wage: `(Daily Wage / 8) * Overtime Hours * 1.5x`.
2. **By Flat Cash Amount (₹)**:
   - For agreed task bonuses or fixed extra pay (e.g., `₹200` for night loading).
   - Enter the rupee amount directly; it adds directly to gross earnings.
3. Tap **Save Overtime**.

---

### D. Editing Attendance with Mandatory Audit Reasons
If you need to change an already marked status (e.g., changing *Present* to *Half Day*):
1. Tap the new status.
2. The app prompts: *"Please enter a reason for this modification"*.
3. Type the reason (e.g., *"Worker left early at 1:00 PM due to illness"*).
4. The system logs the change into the **Audit Trail** (`attendance_edits` table) with the previous status, new status, timestamp, and explanation.

---

## 6. Managing Cash Advances

Workers often need emergency money before payday. Worker WageBook tracks advances accurately so you never lose track of money owed.

### A. Issuing an Advance
1. On the Home Dashboard, tap **Give Advance** (or tap **Record Advance** inside any Worker Profile).
2. Select the **Worker**.
3. Enter the **Amount (₹)** (e.g., `₹1,000`).
4. Select the **Date**.
5. Enter an optional **Reason / Note** (e.g., *"Medical emergency"*, *"Festival advance"*).
6. Tap **Save Advance**.

---

### B. How Advances Carry Forward Across Weeks
- Advances are not tied to just one week. 
- The worker's **Outstanding Advance Balance** carries forward week after week until it is settled during salary settlements.
- You can view any worker's cumulative unpaid advance balance at any time on their profile or on the Salary Settlement screen.

---

## 7. Weekly Salary Calculation & Mid-Week Differential Payouts

Tap the **Salary** tab in the bottom navigation bar to review the weekly payroll.

<div align="center">
  <img src="./screenshots/09_weekly_salary_overview.png" width="320" alt="Weekly Salary Overview" />
</div>

### A. How the Calculation Works
The salary engine automatically computes:
1. **Base Attendance Earnings**: Full Days + Half Days (0.5x) + Paid Holidays/Weekly Offs.
2. **Overtime Earnings**: Calculated hourly earnings + direct flat cash amounts.
3. **Gross Earnings** = Base Earnings + Overtime Earnings.
4. **Advance Recovery**: The app deducts outstanding advances up to the configurable maximum (default 50% or 100% of gross pay).
   - *Guaranteed*: Net Pay will **never** go below zero!
5. **Net Payable** = Gross Earnings − Advance Recovery.

---

### B. Weekly Settlement Overview
- The screen lists each worker with their total days worked, overtime hours, gross earnings, advance recovery, and net payable amount.
- Tapping any worker opens the detailed breakdown sheet showing every individual line item.

---

### C. The Game Changer: Mid-Week Payouts & "Pay Remaining"

In construction and field work, a worker often asks to be paid mid-week (e.g., on Wednesday evening) instead of waiting for Sunday.

<div align="center">
  <img src="./screenshots/10_salary_differential_settlement.png" width="320" alt="Differential Settlement Pay Remaining" />
</div>

#### The Problem in Traditional Apps:
If you mark a worker as "Paid" on Wednesday, and then mark them Present on Thursday and Friday, other apps either:
- Block Thursday/Friday attendance because the week is "Locked", OR
- Recalculate and zero-out Wednesday's payment, causing confusion and duplicate payouts.

#### How Worker WageBook Solves This:
1. **Pay on Wednesday**: Tap **Confirm & Pay (₹1,500)** on Wednesday. The app records that ₹1,500 was paid and locks attendance up to Wednesday.
2. **Mark Thursday & Friday**: When you mark attendance for Thursday (+₹500) and Friday (+₹500), the engine detects that the worker has ₹1,000 in **new, unsettled earnings**.
3. **Amber "Due" Badge**: The worker card displays an amber badge: **`Due: ₹1,000`** and notes: *"Paid so far: ₹1,500 · New Due: ₹1,000"*.
4. **"Pay Remaining" Button**: Instead of overwriting or double-paying, the button changes to:
   **`Confirm & Pay Remaining (₹1,000)`**
5. Tap the button to settle the remaining balance cleanly. Both payouts are accurately logged with zero discrepancy!

---

## 8. Worker Profile & 7-Column Monthly Calendar

Tapping any worker in the directory opens their rich profile, containing three tabs:
1. **Overview**: Contact info, joining date, wage rate, and quick stats.
2. **Advances**: Full historical ledger of all advances taken and settled.
3. **Monthly Calendar**: A complete visual attendance calendar for the entire month!

<div align="center">
  <img src="./screenshots/07_worker_monthly_calendar.png" width="320" alt="7-Column Monthly Calendar" />
</div>

### B. The 7-Column Calendar Grid
- Unlike standard mobile lists that scramble dates, Worker WageBook features a **true 7-column calendar grid** aligned under `Mon  Tue  Wed  Thu  Fri  Sat  Sun`.
- The first day of the month automatically aligns under the correct day of the week with empty offset cells.
- You can switch months easily with the `<` and `>` arrows at the top.

### C. Status Badges & Monthly Summary
Every day is marked with a color-coded circular badge:
- 🟢 **Green (P)**: Present
- 🟠 **Orange (HD)**: Half Day
- 🔴 **Red (A)**: Absent
- 🔵 **Blue (H)**: Holiday
- 🟣 **Purple (WO)**: Weekly Off
- 🟡 **Yellow (L)**: Leave

The header displays instant monthly totals: **Total Days Present**, **Half Days**, **Absent Days**, and **Overtime Hours**.

---

## 9. Generating & Exporting Reports

Tap the **Reports** tab to generate professional, audit-ready PDF and CSV documents:

<div align="center">
  <img src="./screenshots/11_reports_hub.png" width="320" alt="Reports Hub Screen" />
</div>

### A. Available Reports
1. **Weekly Salary Statement**: Complete payroll sheet showing base wage, days worked, overtime, advances recovered, and net pay per worker.
2. **Daily Attendance Register**: Grid of daily attendance statuses for all workers across the week.
3. **Outstanding Advances Report**: Complete list of workers with unpaid advance balances.
4. **Cashbook Summary**: Accounting log of all cash outflows (advances paid + salary payouts).

### B. Generating Professional PDF Reports
1. Select any report from the menu.
2. Choose the desired week or date range.
3. Tap **Export to PDF**.
4. The app uses `expo-print` to generate a formatted PDF with your Business Name, Owner Name, date, and tables.
5. Tap **Share / Print** to send via WhatsApp, email, or print directly to a wireless printer!

### C. CSV Export & Import
- **Export Workers to CSV**: Back up your employee list to a spreadsheet file.
- **Import Workers from CSV**: Bulk import worker names, categories, and wages from Excel or Google Sheets.

---

## 10. Appearance, Themes & Settings

Tap the **Settings** tab to customize the app to your preferences.

<div align="center">
  <img src="./screenshots/12_settings_dark_theme.png" width="320" alt="Settings & Dark Theme" />
</div>

### A. Switching to High-Contrast Dark Mode
- Under **Appearance**, toggle between **Light** and **Dark** theme.
- The Dark Theme uses a deeply calibrated palette (`#121212` background, `#1E1E1E` card surfaces, and `#FFFFFF` text) designed specifically for legibility outdoors in bright sunlight and to save battery on AMOLED screens.

<div align="center">
  <img src="./screenshots/13_dark_mode_attendance.png" width="280" alt="Dark Attendance" />
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="./screenshots/14_dark_mode_calendar.png" width="280" alt="Dark Calendar" />
</div>

---

### B. Configuring Salary Calculation Rules
Navigate to **Settings > Salary Calculation Rules** to tweak business policies:
- **Half-Day Multiplier**: Default `0.5x` (can be set to `0.4x`, `0.6x`, etc.).
- **Holiday Pay Multiplier**: Default `1.0x` (set to `0.0x` if unpaid).
- **Weekly Off Multiplier**: Default `1.0x`.
- **Overtime Default Multiplier**: Default `1.5x` (or `2.0x` for double-time).
- **Advance Recovery Mode**: Choose **Full** (recover 100% of wage) or **Partial** (cap deduction at a maximum percentage, e.g. 50%).

---

### C. Security & Inactivity Auto-Lock
- **Change Security PIN**: Go to **Settings > Security & PIN > Change PIN**. Enter your existing PIN, then enter your new 4-digit PIN.
- **Inactivity Timer**: The app locks automatically after 5 minutes of inactivity to keep your wage data private.

---

### D. Factory Reset (Danger Zone)
If you want to clear all data and start completely fresh:

<div align="center">
  <img src="./screenshots/15_factory_reset_modal.png" width="320" alt="Factory Reset Modal" />
</div>

1. Scroll to the bottom of Settings to the red **DANGER ZONE**.
2. Tap **Factory Reset (Wipe All Data)**.
3. The app prompts you for your **4-digit Security PIN**.
4. Enter your PIN and confirm.
5. All local SQLite tables, worker records, attendance logs, and advances are wiped clean, returning the app to the initial business setup screen.

---

## 11. Mobile Navigation & Gesture Support

Worker WageBook is designed to feel native on modern Android smartphones:
- **Gesture Navigation**: Swipe from the left or right edge of the screen to go back seamlessly.
- **3-Button Navigation**: If your phone uses classic **Back - Home - Recents** buttons, the bottom navigation bar and modals include automatic safe-area padding so buttons never overlap with your device navigation bar.
- **Pull-to-Refresh**: Pull down on the Workers, Attendance, or Salary lists to instantly refresh balances.

---

## 12. Frequently Asked Questions (FAQ)

#### Q1: Does Worker WageBook require an active internet connection?
**No.** The app is 100% offline-first. All worker profiles, attendance records, advances, and settlements are stored locally on your device in an embedded SQLite database. You never have to worry about server downtime or weak cellular reception on site.

#### Q2: Can a worker's net salary become negative if their advance is large?
**No.** The salary engine enforces a mathematical floor: `Net Pay >= 0`. If a worker owes ₹5,000 in advances but only earned ₹3,000 this week, the app will deduct at most ₹3,000, leaving net pay at ₹0. The remaining ₹2,000 automatically carries forward to the following week.

#### Q3: What happens if I change a worker's daily wage rate next month?
Past attendance records are preserved through **Wage Snapshots**. If Ramesh was paid ₹500/day in September and you increase his wage to ₹600/day in October, September's attendance records retain the original ₹500 snapshot. Previous salary reports will never be altered.

#### Q4: What if I forget my 4-digit PIN?
For security, PIN data is hashed locally. If you ever forget your PIN, you can re-install the app or perform a reset. We recommend choosing a memorable 4-digit PIN (like your birth year or ATM PIN).

---

## 13. Developer & Support Information

<div align="center">
  <img src="./screenshots/16_about_developer.png" width="320" alt="About Developer Modal" />
</div>

Worker WageBook is actively maintained and developed by:

- **Lead Developer**: **Vishal G**
- **Email**: [vishalgovindasamy@gmail.com](mailto:vishalgovindasamy@gmail.com)
- **Framework**: React Native with Expo SDK 54 & TypeScript
- **License**: Private & Proprietary (All rights reserved)

If you have feedback, feature suggestions, or custom deployment requirements for your business, feel free to reach out via email!
