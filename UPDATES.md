# Habit Mastery - Recent Updates Log

This file tracks the latest features and improvements added to the Habit Mastery platform.

## Latest Updates (June 20, 2026)

### 📅 Flexible Habit Frequency Scheduling
- **Custom Schedules**: Habits can now be scheduled for specific days of the week (e.g., Mon/Wed/Fri), a specific number of times per week (e.g., 3x a week), or every N days (e.g., every 2 days).
- **Smart Daily Checklist**: The homepage dashboard now intelligently filters habits, only showing the ones due today based on their unique frequency schedule.
- **Dynamic Monthly Grid**: The monthly history view accurately reflects scheduled days versus off-days, correctly interpreting hits, misses, and excused days.

### 🔢 Optional Numeric Value Tracking
- **Quantifiable Habits**: You can now opt-in to track specific numeric values for habits (e.g., "drank 6 glasses of water", "ran 2 miles", "read 15 pages") with custom units.
- **Inline Value Entry**: The daily checklist provides an inline input for numeric habits, and it forces a value entry before successfully marking the habit as complete.
- **Draft Persistence**: Unfinished numeric entries are auto-saved locally to prevent data loss on page reloads or if you accidentally uncheck a habit.
- **Rich History Tooltips**: Hovering over a completed day on the Monthly Grid reveals the exact numeric value logged for that day.

### ⏭️ Neutral "Skip" State
- **Deliberate Days Off**: You can now mark a habit as "Skipped" using the new slash-circle (⊘) button, representing a sick day or planned rest without penalty.
- **Streak Protection**: Skips are treated as neutral off-days. Skipping a day does not count toward your success rate, but importantly, it will **not break your current streak**.
- **Accurate Analytics**: Skipped days are excluded from both the total completed and the total expected calculations, ensuring your daily scores and heatmaps reflect your actual intent.
- **3-State Monthly Grid**: Toggling a cell on the Monthly Tracker now cycles through Completed (Green ✅) → Skipped (Amber ⊘) → Unchecked.

#### Skip Feature Implementation Steps (Technical Changelog)
To flawlessly implement the skip feature across the stack without breaking legacy data, the following changes were made:
1. **Database & Schema Level**: Added support for a `status` payload (`'completed'` vs `'skipped'`) in the completions array, defaulting to `'completed'` for backward compatibility. Added a validation bypass in the backend `/toggle` API so "skipped" entries for habits requiring numeric values (`tracksValue: true`) are accepted without throwing validation errors.
2. **Frontend State & Caching**: Upgraded the `toggleCompletion` Redux action to instantly handle the optimistic UI for the new 3-state cycle (preventing network lag from freezing the UI). Configured the offline sync queue to correctly propagate the `status` payload to the backend when re-establishing connectivity.
3. **Analytics & Math Engine**: Deeply refactored `profileAnalytics.js`. We mathematically separated the raw dates into `completedSet` and `skippedSet`. Rewrote the streak loops to dynamically step over `skippedSet` dates as "bridges" (+0 to streak, no break) while counting `completedSet` dates (+1 to streak), effectively protecting multi-day streaks across skipped days.
4. **UI Components**: 
   - *Daily Checklist (`HabitItem.jsx`)*: Injected the amber slash-circle (⊘) button, hiding it by default and revealing on hover. Applied conditional amber dashed borders and strikethrough styling when active. 
   - *Monthly Grid (`MonthlyTracker.jsx`)*: Transitioned the static binary toggle into a dynamic 3-way cycle handler, mapping UI clicks to the API accurately.

> **Developer Constraint Note (Average/Target Feature):** When building any future "all-time average" or "target value" features, any calculation doing `sum(values) / count(completions)` **MUST** explicitly filter for `status === 'completed'` first. Skip records write `value: null` to the database and must be excluded entirely, otherwise the denominator will be artificially inflated and the average will be incorrect.

## Previous Updates (April 29, 2026)

### 🔔 Advanced Notification System (Major Update)
- **Consolidated Notification Panel**: All habit-specific notification settings have been moved into a single, intuitive panel at the bottom of the "Manage Disciplines" page.
- **Expandable Habit Settings**: Click the arrow (▶) next to any habit in the reminder list to reveal detailed settings.
- **Simplified Nagging Logic**: 
  - The **Standard Reminder Time** now automatically acts as the deadline.
  - If you enable "Reminders after deadline", the system will start nagging you every X minutes immediately after the first reminder time if the habit is not done.
  - **Logic Guard**: You can only enable "Overdue Nagging" if the primary habit reminder is turned ON. This prevents confusing "impossible" states.
  - Removed the redundant separate "Deadline" input field for a cleaner experience.
- **Custom Reminder Messages**: Every habit can now have its own unique notification text (e.g., "Don't break the streak! Gym time!").

### 💧 System-Wide Reminders
- **Background Water Reminders**: Added a dedicated section for "Default Reminders" that run throughout the day.
- **Configurable Intervals**: Users can set the water reminder frequency (30m, 1h, 2h, etc.).
- **Independent Tracking**: These reminders operate in the background and do not require manual habit completion.

### ⚙️ Management & UX Improvements
- **"Full Reset" Default Habits**: The "Reload Default Set" button now performs a clean reset—it deletes all existing habits first to ensure the default list is perfectly loaded.
