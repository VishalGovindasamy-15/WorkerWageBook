# PIN Setup & Loading Screen Guide

**Date**: 2026-10-18  
**Status**: ✅ CONFIGURED

---

## 🔐 PIN Configuration

### Current Status: **NO PIN SET**

The database is initialized with:
```sql
INSERT OR IGNORE INTO settings (key, value) VALUES ('pin_set', 'false');
```

**This means:**
- ❌ No default PIN exists
- ❌ No hardcoded PIN in the code
- ✅ You must create your own PIN on first launch

---

## 📱 What Happens on First Launch

### Step 1: Splash Screen (2 seconds)
```
┌─────────────────────────────┐
│                             │
│        [App Logo]           │
│                             │
│    Worker WageBook          │
│   Manage wages with ease    │
│                             │
│         Loading...          │
│                             │
│       Version 1.0.0         │
│                             │
└─────────────────────────────┘
```

**Duration**: 2 seconds minimum (even if database loads faster)

### Step 2: Setup PIN Screen
```
┌─────────────────────────────┐
│                             │
│       🔒 (Lock Icon)        │
│                             │
│   Create a 4-digit PIN      │
│                             │
│       ○ ○ ○ ○               │
│                             │
│    [1]  [2]  [3]            │
│    [4]  [5]  [6]            │
│    [7]  [8]  [9]            │
│         [0]                 │
│                             │
└─────────────────────────────┘
```

### Step 3: Confirm PIN
```
┌─────────────────────────────┐
│                             │
│       🔒 (Lock Icon)        │
│                             │
│    Confirm your PIN         │
│                             │
│       ● ● ● ●               │
│                             │
│    [1]  [2]  [3]            │
│    [4]  [5]  [6]            │
│    [7]  [8]  [9]            │
│         [0]                 │
│                             │
└─────────────────────────────┘
```

### Step 4: Main App
After PIN setup, you'll see the Home dashboard!

---

## 🎨 Loading Screen Features

### What Was Added

1. **SplashScreen Component** (`src/screens/SplashScreen.tsx`)
   - App logo with shadow effect
   - App name: "Worker WageBook"
   - Tagline: "Manage wages with ease"
   - Loading spinner
   - Version number

2. **2-Second Minimum Display**
   - Splash shows for at least 2 seconds
   - Even if database loads in 500ms, splash stays for 2s
   - Prevents jarring transitions

3. **Professional Design**
   - Clean white background
   - Centered content
   - Primary color accents
   - Smooth loading indicator

---

## 🔧 Technical Implementation

### App.tsx Changes

```typescript
export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        await initializeDatabase();
      } catch (error) {
        console.error('[App] Database initialization failed:', error);
      } finally {
        setIsReady(true);
      }
    }
    init();

    // Show splash for minimum 2 seconds
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(splashTimer);
  }, []);

  // Show splash while loading OR for minimum 2 seconds
  if (!isReady || showSplash) {
    return <SplashScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar ... />
      <AppNavigator />
    </GestureHandlerRootView>
  );
}
```

### Logic Flow

```
App Starts
    ↓
Initialize Database (async)
    ↓
Start 2-second timer
    ↓
Show SplashScreen
    ↓
Database ready? → Yes → isReady = true
    ↓
2 seconds passed? → Yes → showSplash = false
    ↓
Both conditions met? → Show AppNavigator
```

---

## 🎯 User Experience

### First Time User

1. **Opens app** → Sees splash screen with logo (2 seconds)
2. **Splash ends** → Sees "Create a 4-digit PIN" screen
3. **Enters PIN** → Types 4 digits (e.g., 1234)
4. **Confirms PIN** → Types same 4 digits again
5. **Success** → Enters main app
6. **Next launch** → Sees splash (2s) → PIN entry → Main app

### Returning User

1. **Opens app** → Sees splash screen with logo (2 seconds)
2. **Splash ends** → Sees "Enter PIN to unlock" screen
3. **Enters PIN** → Types their 4-digit PIN
4. **Success** → Enters main app

---

## 🔒 PIN Security Features

### Built-in Protections

1. **4-Digit Requirement**
   - Must enter exactly 4 digits
   - Auto-submits when 4 digits entered

2. **Confirmation Step**
   - Must enter PIN twice
   - Both entries must match exactly

3. **Error Handling**
   - Wrong PIN: Shows "Wrong PIN. Try again."
   - Mismatch: Shows "PINs do not match. Try again."
   - Red dots indicate error state

4. **Backspace Support**
   - Can delete digits before submitting
   - Clear button (←) removes last digit

5. **Cooldown on Errors**
   - Prevents rapid incorrect attempts
   - Brief delay after wrong PIN

---

## 📊 PIN Storage

### Where is PIN Stored?

- **Database Table**: `settings`
- **Key**: `pin_hash`
- **Value**: Hashed PIN (not plain text)
- **Security**: PIN is hashed before storage

### Database Schema

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Initial seed
INSERT INTO settings (key, value) VALUES ('pin_set', 'false');

-- After PIN setup
INSERT INTO settings (key, value) VALUES ('pin_set', 'true');
INSERT INTO settings (key, value) VALUES ('pin_hash', '<hashed_value>');
```

---

## 🎨 Splash Screen Design

### Visual Elements

```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│         ┌───────────┐               │
│         │           │               │
│         │   LOGO    │  ← 120x120    │
│         │  (80x80)  │    rounded    │
│         │           │    corners    │
│         └───────────┘               │
│                                     │
│      Worker WageBook                │  ← 32px, bold
│    Manage wages with ease           │  ← 16px, gray
│                                     │
│                                     │
│         ◠ (spinner)                 │  ← Primary color
│          Loading...                 │  ← 14px, gray
│                                     │
│                                     │
│                                     │
│        Version 1.0.0                │  ← 12px, light gray
│                                     │
└─────────────────────────────────────┘
```

### Color Scheme

- **Background**: White (#FFFFFF)
- **Logo Container**: Primary[50] (light blue)
- **App Name**: Neutral[900] (dark gray)
- **Tagline**: Neutral[600] (medium gray)
- **Spinner**: Primary[600] (blue)
- **Version**: Neutral[400] (light gray)

---

## 🚀 How to Test

### Test Splash Screen

1. **Stop the server** (Ctrl+C)
2. **Restart the server**:
   ```bash
   cd worker-wagebook
   npx expo start --web --port 8081
   ```
3. **Open browser**: http://localhost:8081
4. **Watch**: Splash screen should appear for 2 seconds
5. **Then**: PIN setup screen appears

### Test PIN Setup

1. **Enter a PIN**: Type 4 digits (e.g., 1234)
2. **Confirm**: Type same 4 digits
3. **Success**: App unlocks
4. **Restart**: Close and reopen app
5. **Enter PIN**: Type your 4-digit PIN
6. **Success**: App unlocks

### Test Wrong PIN

1. **Enter wrong PIN**: Type incorrect 4 digits
2. **Error**: See "Wrong PIN. Try again."
3. **Red dots**: Dots turn red
4. **Try again**: Enter correct PIN

---

## 🔄 Reset PIN (If Needed)

### Option 1: Clear Database
```bash
# Delete the SQLite database file
rm worker-wagebook/workerwagebook.db

# Restart app - will show setup screen again
```

### Option 2: Update Database Directly
```sql
-- In SQLite
UPDATE settings SET value = 'false' WHERE key = 'pin_set';
DELETE FROM settings WHERE key = 'pin_hash';
```

### Option 3: From Settings Screen
- Go to Settings → Security → Clear PIN
- This will remove PIN and show setup screen on next launch

---

## 📝 Summary

### What You Asked For

1. ✅ **Loading page with logo** → Created SplashScreen component
2. ✅ **2-second display time** → Implemented minimum 2-second timer
3. ✅ **PIN information** → No default PIN, user creates their own

### What Was Built

1. **SplashScreen.tsx** - Professional loading screen
2. **App.tsx updates** - 2-second splash timer
3. **Logo integration** - Uses existing icon.png
4. **Smooth transitions** - No jarring jumps

### Current Flow

```
App Launch
    ↓
Splash Screen (2 seconds)
    ↓
First time? → Yes → Setup PIN (create + confirm)
             → No  → Enter PIN
    ↓
Main App (Home Dashboard)
```

---

## 🎉 Result

**You should now see:**

1. **Splash screen** with logo for 2 seconds
2. **Setup PIN screen** (first time) or **Enter PIN screen** (returning)
3. **Main app** after PIN entry

**Refresh your browser** to see the changes!

---

**Status**: ✅ LOADING SCREEN & PIN CONFIGURED
