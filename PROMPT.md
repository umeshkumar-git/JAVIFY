# 🔧 JAVIFY — Feature Enhancement Prompt

Use this prompt to add **Two-Factor Authentication (2FA)**, **Admin Panel**, **User Panel**, and **Visitor Analytics** to the existing Javify project.

---

## 📋 PROJECT CONTEXT

This is an existing React + TypeScript + Vite + TailwindCSS project called **Javify** — a gamified Java learning platform. It already has:

- Authentication system (register/login with Zustand store)
- Dashboard, World Map, Coding Challenge Arena
- AI Assistant floating widget
- Monaco code editor with Java compiler integration
- Light/dark theme toggle
- Glassmorphism UI with 3D effects

The app uses:
- `react-router-dom` (HashRouter) for routing
- `zustand` with `persist` middleware for state
- `framer-motion` for animations
- `@tanstack/react-query` for data fetching
- `@monaco-editor/react` for code editing

---

## 🎯 REQUIREMENTS

### 1. Two-Factor Authentication (2FA) via Email Verification

**Flow:**
1. User fills in the registration form (username, email, password)
2. When they click "Create Account", instead of logging in immediately, show a **verification code screen**
3. Generate a random **6-digit numeric code** and store it in the Zustand store
4. Display a professional UI with 6 individual digit input boxes
5. Each input auto-focuses to the next box when a digit is entered
6. Pressing Backspace on an empty box moves focus to the previous box
7. User enters the code and clicks "Verify & Create Account"
8. If the code matches, complete registration and navigate to dashboard
9. If the code doesn't match, show an error and clear the inputs
10. Include a "Cancel" button to go back to the registration form
11. Include an "Auto-fill demo code" button that reads the code from the store (for demo/testing purposes)
12. Show the email address the code was "sent to" on the verification screen

**Store changes needed:**
```typescript
// Add to the store interface:
twoFactorPending: boolean;
verificationCode: string;
verificationEmail: string;
startVerification: (email: string) => void;
verifyCode: (code: string) => boolean;
cancelVerification: () => void;
```

**startVerification** should:
- Generate a 6-digit random code: `Math.floor(100000 + Math.random() * 900000).toString()`
- Set `twoFactorPending: true`
- Store the code and email

**verifyCode** should:
- Compare the input code with the stored code
- If match: set `twoFactorPending: false`, clear code, set `isAuthenticated: true`, return `true`
- If no match: return `false`

**cancelVerification** should:
- Reset `twoFactorPending`, `verificationCode`, and `verificationEmail`

**Verification Code UI requirements:**
- Centered on screen with a glassmorphism card
- Icon at top (mail/shield icon)
- "Check your email" heading
- Show the email address in cyan color
- 6 input boxes in a row, each `h-14 w-12` on desktop, smaller on mobile
- Each input: `type="text"`, `inputMode="numeric"`, `maxLength={1}`
- Auto-focus next on input, auto-focus previous on backspace
- Error message in a red-tinted box
- Two buttons: "Cancel" (outline) and "Verify & Create Account" (primary gradient)
- Demo helper text with auto-fill button at the bottom

---

### 2. Admin Panel (`/admin` route)

**Access Control:**
- Only users with `role: "admin"` can access
- Users get admin role when their email contains the word "admin" (e.g., `admin@javify.dev`)
- Non-admin users see a locked message with a "Back to Dashboard" button

**Add `role` field to the store:**
```typescript
role: "user" | "admin";
```

In the `register` function, detect admin:
```typescript
const isAdmin = email.toLowerCase().includes("admin");
set({ role: isAdmin ? "admin" : "user" });
```

**Admin Panel UI — Tabbed Dashboard with 4 tabs:**

#### Tab 1: Overview
Display these stat cards in a 4-column grid:
- Total Page Views (all-time count)
- Unique Visitors (distinct visitor IDs)
- Today's Views (current day count)
- Active Now (visitors in last 5 minutes)

Charts:
- **Daily Traffic (14 days):** Vertical bar chart showing page views per day
- **Hourly Today:** 24-bar chart showing traffic distribution by hour

Session Quality metrics:
- Average Pages per Session
- Bounce Rate (% of sessions with only 1 page)
- This Week total

Device Breakdown:
- Desktop / Mobile / Tablet percentages with progress bars

#### Tab 2: Pages
- All tracked pages ranked by view count
- Each page shows: rank number, page label, path, view count
- Animated progress bar showing relative traffic

#### Tab 3: Visitors
- Table showing last 20 unique visitors
- Columns: Visitor ID (first 8 chars), Last Page, Screen Resolution, Time ago
- Each visitor has a colored avatar with their ID initials

#### Tab 4: Activity
- Feed of user actions (login, challenge completion, profile updates)
- Each entry shows: user avatar, username, action badge, time ago, details

**Platform Status section** at bottom:
- 4 service indicators: Java Compiler, Auth System, Analytics Engine, AI Assistant
- Each shows a green dot and "Operational" status

**Header features:**
- Admin avatar icon with "Admin Panel" title
- "Reset Data" button to clear all analytics
- "User Panel" link

---

### 3. User Panel (`/user` route)

**Profile Header:**
- Large avatar with user's initial letter (gradient background)
- Username with inline edit button (click to edit, save/cancel)
- Email display
- Role badge (User/Admin)
- Player title based on level
- XP progress bar with animated fill showing progress to next level

**Stats Grid (4 cards):**
- Campaign Progress (% complete, X/Y missions)
- Daily Streak (fire emoji, Xd format)
- Coins (with count)
- Code Runs (total runs, debug attempts)

**Achievements Section:**
- Grid of achievement cards
- Each shows: title, description, unlocked/locked status
- Unlocked cards have cyan border glow
- Locked cards are dimmed with 60% opacity

**World Progress:**
- List of all 9 Java worlds
- Each shows: icon, name, topic, status badge (Done/Active/Locked)

**Account Settings:**
- Grid of action buttons: Dashboard, World Map, Admin Panel (if admin), Logout
- Admin Panel button has amber styling
- Logout button has rose/red styling

---

### 4. Analytics Service (`src/services/analytics.ts`)

Create a complete client-side analytics engine using localStorage.

**Data stored:**

```typescript
// Visit Entry
interface VisitEntry {
  id: string;
  visitorId: string;    // Unique per browser, persisted
  sessionId: string;    // New session after 30min inactivity
  path: string;         // Route path
  timestamp: number;
  screen: string;       // e.g. "1920x1080"
  language: string;     // navigator.language
  referrer: string;     // document.referrer
}

// Session Entry
interface SessionEntry {
  sessionId: string;
  visitorId: string;
  startedAt: number;
  lastActiveAt: number;
  pageCount: number;
}

// User Activity
interface UserActivity {
  userId: string;
  action: string;       // "login", "page_view", "challenge_completed", etc.
  details: string;
  timestamp: number;
}
```

**Visitor ID:** Generated once per browser using `crypto.randomUUID()`, stored in localStorage key `javify-analytics-vid`.

**Session ID:** Generated when no existing session or last activity > 30 minutes ago. Stored in localStorage key `javify-analytics-sid`.

**Public functions:**

```typescript
recordVisit(path: string)      // Record a page view
recordActivity(userId, action, details)  // Record user action
getAnalytics(): AnalyticsSnapshot        // Get computed dashboard data
clearAnalytics()               // Reset all data
```

**AnalyticsSnapshot shape:**
```typescript
interface AnalyticsSnapshot {
  totalPageViews: number;
  uniqueVisitors: number;
  totalSessions: number;
  visitsToday: number;
  visitsThisWeek: number;
  activeNow: number;           // Visitors in last 5 minutes
  bounceRate: string;          // "23%"
  avgPagesPerSession: string;  // "3.2"
  growthRate: string;          // "+15%"
  topPages: { path: string; count: number; label: string }[];
  dailyVisits: { date: string; count: number }[];     // Last 14 days
  hourlyToday: { hour: string; count: number }[];      // 24 hours
  recentVisitors: { visitorId: string; path: string; timestamp: number; screen: string }[];
  activityLog: UserActivity[];
  deviceBreakdown: { label: string; count: number; percent: string }[];
}
```

**Automatic Global Tracking:**
In the main app layout component, add a `useEffect` that fires on every route change:
```typescript
useEffect(() => {
  recordVisit(location.pathname);
}, [location.pathname]);
```

This ensures EVERY page navigation is tracked without manual calls on individual pages.

**Activity tracking should be added for:**
- User login (via Google, GitHub, or email)
- Challenge completion (with challenge name and XP)
- Profile name updates
- Dashboard visits
- World map visits

---

### 5. Navigation Updates

Add "My Profile" to the main navigation array:
```typescript
const navigation = [
  { label: "Home", to: "/" },
  { label: "Dashboard", to: "/dashboard" },
  { label: "World Map", to: "/map" },
  { label: "Architecture", to: "/architecture" },
  { label: "My Profile", to: "/user" },
];
```

Add routes for admin and user panels:
```jsx
<Route path="/admin" element={<AdminPanel />} />
<Route path="/user" element={<UserPanel />} />
```

---

## 🎨 UI/UX REQUIREMENTS

All new screens must follow the existing Javify design system:

- **Dark theme:** Navy backgrounds (#0B1020, #0F172A), white/slate text
- **Glass panels:** `glass-panel` class with backdrop blur
- **Rounded corners:** `rounded-2xl` to `rounded-3xl`
- **Text colors:** White for headings, slate-300/400 for body, cyan-300 for accents
- **Badges:** Rounded-full pills with colored backgrounds (cyan, violet, emerald, amber, rose)
- **Buttons:** `btn-3d` class for primary actions, outline style for secondary
- **Animations:** Framer Motion for page transitions and list items
- **Responsive:** Mobile-first, works on all screen sizes
- **3D effects:** Use existing `card-3d`, `tile-3d` classes where appropriate
- **Light theme:** All components must work in both dark and light themes

---

## 📁 FILE STRUCTURE

```
src/
├── services/
│   └── analytics.ts          # Analytics engine (create/update)
├── store/
│   └── useJavifyStore.ts     # Add 2FA + role fields (update)
├── pages/
│   ├── AdminPanel.tsx         # Admin analytics dashboard (create)
│   └── UserPanel.tsx          # User profile panel (create)
└── App.tsx                    # Add routes, global tracking (update)
```

---

## ⚠️ IMPORTANT NOTES

1. **Do NOT use real OAuth APIs** — the Google/GitHub buttons are simulated UI only
2. **All analytics are localStorage-based** — no backend required
3. **The verification code is stored client-side** — in production this would be sent via email through a backend API
4. **Admin detection is email-based** — any email containing "admin" grants admin role
5. **Form inputs should use `autoComplete="off"`** to prevent browser credential manager interference
6. **All `recordVisit()` calls should be centralized** in the global AppLayout effect, not scattered across individual pages
7. **Activity logging** should be added at key interaction points (login, challenge completion, profile edit)
8. **The admin panel auto-refreshes** analytics data every 4-5 seconds using React Query's `refetchInterval`
9. **Data retention:** Keep max 2000 visit entries and 500 activity entries to prevent localStorage overflow

---

## ✅ EXPECTED OUTCOME

After implementing these changes:

1. New users see a **6-digit verification code screen** before their account is created
2. Admin users (email contains "admin") can access `/admin` with full **visitor analytics**
3. All users can access `/user` to see their **profile, stats, achievements, and world progress**
4. **Every page visit is automatically tracked** with visitor ID, session, screen size, and timestamp
5. The admin dashboard shows **real-time charts, visitor tables, page rankings, and activity feeds**
6. Navigation includes "My Profile" link
7. All new UI matches the existing Javify glassmorphism + 3D design system
