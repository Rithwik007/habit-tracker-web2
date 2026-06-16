# Habit Mastery - Premium Habit Tracker

A high-performance, dark-themed habit tracking application built with React, Vite, and Express, backed by MongoDB. Features a glassmorphic design, real-time weather integration, push notifications, and detailed analytics. Installable as a Progressive Web App (PWA) with offline support.

## 🚀 Features

- **Personalized Header**: Greets you as "Hi, Rithwik Racharla" with real-time weather and date/time.
- **Daily Checklist**: Interactive habit tracking with instant progress updates.
- **Monthly Grid**: Comprehensive overview of your consistency across the month.
- **Analytics**: Visualized progress using Line, Bar, and Donut charts (Recharts).
- **Streaks & Momentum**: Automated streak calculation to keep you motivated.
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
- `Habit` — individual habit definitions, linked to a profile
- `HabitProfile` — named sets of habits with optional scheduling (start/end dates) for auto-switching
- `Goal` — longer-term goals tied to habits

## 🔔 Notifications

Push notifications are handled via `web-push` and a VAPID key pair. The service worker (`public/sw.js`) listens for `push` events and displays notifications, and handles `notificationclick` to focus or open the app. Reminder logic (standard reminder time, overdue nagging, custom messages) is configured per-habit in the Notification Settings Panel.

## 📱 PWA / Offline Support

- `public/manifest.json` defines app metadata, icons, and display mode for installability.
- `public/sw.js` caches static assets for offline use and handles push/notification events.
- On Android (Chrome), use the ⋮ menu → "Install app" / "Add to Home Screen".
- On iOS (Safari), use Share → "Add to Home Screen" (manual step; Apple does not show an automatic install prompt).

## 🧪 Migration Note

This project was originally prototyped on Supabase (PostgreSQL) and has since been migrated to MongoDB. `server/migrate-from-supabase.js` is a one-time migration script kept for reference; it is not part of the running application. The `@supabase/supabase-js` package may still be listed as a dependency from this migration — confirm it's no longer needed before removing it.

---
*Maintained by Rithwik Racharla*
