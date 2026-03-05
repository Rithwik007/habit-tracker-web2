# Habit Mastery - Premium Habit Tracker

A high-performance, dark-themed habit tracking application built with React, Vite, and Supabase. Features a glassmorphic design, real-time weather integration, and detailed analytics.

## 🚀 Features

- **Personalized Header**: Greets you as "Hi, Rithwik Racharla" with real-time weather and date/time.
- **Daily Checklist**: Interactive habit tracking with instant progress updates.
- **Monthly Grid**: Comprehensive overview of your consistency across the month.
- **Analytics**: Visualized progress using Line, Bar, and Donut charts (Recharts).
- **Streaks & Momentum**: Automated streak calculation to keep you motivated.
- **Manage Habits**: Easily add, delete, or seed 16 default habits.

## 🛠️ Tech Stack

- **Frontend**: React (Vite)
- **Styling**: Vanilla CSS (Custom Glassmorphic System)
- **Backend**: Supabase (PostgreSQL, Auth-ready)
- **Charts**: Recharts
- **Icons**: SVG & Unicode

## 📦 Getting Started

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd habit-tracker-web
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   - Create a `.env.local` file in the root.
   - Add your Supabase credentials:
     ```env
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

## 🌐 Deployment (Vercel/Netlify)

1. Push your code to GitHub.
2. Link your repository to Vercel or Netlify.
3. **Critical**: Add the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your deployment's **Environment Variables** settings.

## 🗄️ Database Schema

Ensure your Supabase project has the following tables:
- `habits` (id, name, created_at)
- `daily_logs` (id, habit_id, log_date, completed)
- `daily_notes` (id, note_date, note)

*Note: Disable RLS for these tables or set up appropriate policies for production.*
