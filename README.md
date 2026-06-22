# Habit Mastery - Premium Habit Tracker

A high-performance, dark-themed habit tracking application built with React, Vite, and Express, backed by MongoDB. Features a glassmorphic design, real-time weather integration, push notifications, and detailed analytics. Installable as a Progressive Web App (PWA) with offline support.

## 🚀 Features

- **Personalized Header**: Greets you as "Hi, Rithwik Racharla" with real-time weather and date/time.
- **Daily Checklist**: Interactive habit tracking with instant progress updates.
- **Skip State**: Mark any habit as ⊘ Skipped — a deliberate rest day. Skips are neutral: they don't count toward your score, don't break your streak, and are visually distinct (amber dashed border, strikethrough name).
- **Monthly Grid**: 3-state cell cycle (✅ Completed → ⊘ Skipped → Unchecked) with full amber visual treatment for skipped days.
- **Analytics**: Visualized progress using Line, Bar, and Donut charts (Recharts). Percentage scores correctly exclude skipped habits from both numerator and denominator.
- **Flexible Frequency**: Schedule habits for specific days of the week, N times per week, or every N days.
- **Numeric Value Tracking**: Opt-in to log a specific number per completion (e.g. "ran 3.2 miles") with draft persistence.
- **Streaks & Momentum**: Automated streak calculation with skip-aware bridging logic. Verified: 5 complete → 1 skip → 1 complete = streak 6.
- **Habit Profiles**: Scheduled habit sets with automatic cron-based switching.
- **Push Notifications**: Per-habit reminders, overdue nagging, and background system-wide reminders (e.g. water intake).
- **Manage Habits**: Easily add, delete, or seed default habits.
- **Installable PWA**: Add to home screen on Android/iOS with offline support via service worker caching.

## 🛠️ Tech Stack

- **Frontend**: React 19 (Vite), React Router
- **Styling**: Vanilla CSS (Custom Glassmorphic System)
- **Backend**: Node.js, Express 5
- **Database**: MongoDB with Mongoose
- **Auth**: Firebase Auth
- **Push Notifications**: web-push (VAPID)
- **Scheduled Jobs**: node-cron
- **Charts**: Recharts
- **Icons**: lucide-react, SVG & Unicode

## 📦 Getting Started

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd habit-tracker-web2
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   - Create a `.env` file in the root.
   - Add the following variables:
     ```env
     MONGODB_URI=your_mongodb_connection_string
     VITE_VAPID_PUBLIC_KEY=your_vapid_public_key
     VAPID_PRIVATE_KEY=your_vapid_private_key
     # Add Firebase config keys as required by your client setup
     ```

4. **Run the frontend (dev)**:
   ```bash
   npm run dev
   ```

5. **Run the backend server**:
   ```bash
   npm run server
   ```

6. **Seed default habits (optional)**:
   ```bash
   npm run seed
   ```

## 🌐 Deployment

- **Frontend**: Deployed on Vercel. `vercel.json` includes the SPA rewrite rule so client-side routing works on refresh/direct links.
- **Backend**: Deployed separately (e.g. Render) since Vercel serverless functions aren't suited to long-running cron jobs. Set the same environment variables (`MONGODB_URI`, VAPID keys, Firebase config) in your backend host's dashboard.
- **Critical**: After deploying the backend, run `npm run verify:deploy <backend-url> <cron-secret>` to confirm routes and cron endpoints are wired correctly.

## 🗄️ Database Schema (MongoDB / Mongoose)

Models live in `server/models/`:
- `User` — auth identity, push subscription, notification preferences
- `Habit` — individual habit definitions, linked to a profile. Each `completion` subdocument carries `{ date, value, status }` where `status` is `'completed'` (default) or `'skipped'`.
- `HabitProfile` — named sets of habits with optional scheduling (start/end dates) for auto-switching
- `Goal` — longer-term goals tied to habits

## 🔔 Notifications

Push notifications are handled via `web-push` and a VAPID key pair. The service worker (`public/sw.js`) listens for `push` events and displays notifications, and handles `notificationclick` to focus or open the app. Reminder logic (standard reminder time, overdue nagging, custom messages) is configured per-habit in the Notification Settings Panel. With the recent updates, incoming notifications render the high-resolution app icon (`/icon-192.png`).

## 📱 PWA / Offline Support

- `public/manifest.json` defines app metadata, custom dark theme/background configurations (`#0f1117`), and references real high-resolution PNG icons (`icon-192.png`, `icon-512.png`).
- `public/sw.js` implements a robust caching strategy:
  - **Static Pre-caching**: Pre-caches shell resources (`/`, `/index.html`, `/manifest.json`, and app icons) upon service worker installation.
  - **Cache-First Runtime Caching**: Intercepts fetch requests for static assets, returning cached versions immediately, and caching clones of new successful responses.
  - **SPA Navigation Fallback**: Automatically serves the cached `/index.html` shell when requests for other client-side routes (e.g. `/notes`) fail offline.
- On Android (Chrome), use the ⋮ menu → "Install app" / "Add to Home Screen".
- On iOS (Safari), use Share → "Add to Home Screen" (manual step; Apple does not show an automatic install prompt).

## 🧪 Migration Note

This project was originally prototyped on Supabase (PostgreSQL) and has since been migrated to MongoDB. `server/migrate-from-supabase.js` is a one-time migration script kept for reference; it is not part of the running application. The `@supabase/supabase-js` package may still be listed as a dependency from this migration — confirm it's no longer needed before removing it.

---
*Maintained by Rithwik Racharla*
