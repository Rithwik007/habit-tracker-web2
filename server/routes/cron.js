import express from 'express';
import webpush from 'web-push';
import User from '../models/User.js';
import Habit from '../models/Habit.js';
import Goal from '../models/Goal.js';
import HabitProfile from '../models/HabitProfile.js';
import { switchProfile } from '../utils/switchProfile.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Configure VAPID
if (process.env.VITE_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@habit-tracker.com',
    process.env.VITE_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * GET /api/cron-notify
 * Called by cron-job.org every 10 minutes.
 * Sends push notifications for habits and goals that are due.
 * Also serves as a keep-alive ping to prevent Render cold starts.
 */
router.get('/cron-notify', async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  const secret = req.headers['x-cron-secret'] || req.query.secret;
  if (!cronSecret || secret !== cronSecret) {
    return res.status(401).json({ message: 'Unauthorized: Missing or invalid cron secret' });
  }

  try {
    const now = new Date();
    const options = { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' };
    const timeParts = new Intl.DateTimeFormat('en-US', options).formatToParts(now);
    let currentHours = timeParts.find(p => p.type === 'hour').value;
    const currentMinutes = timeParts.find(p => p.type === 'minute').value;
    if (currentHours === '24') currentHours = '00';
    const currentTimeStr = `${currentHours}:${currentMinutes}`;
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);

    const users = await User.find({});
    let notifsSent = 0;
    let errors = 0;

    for (const user of users) {
      // --- PART A0: AUTO-SWITCH PROFILES ---
      try {
        const scheduledProfile = await HabitProfile.findOne({ userId: user.firebaseId, startDate: todayStr });

        // Guard: only switch if this specific profile hasn't already been activated today
        const hasAlreadyActivatedToday = scheduledProfile && user.profileHistory.some(h =>
          h.profileId.toString() === scheduledProfile._id.toString() && h.activatedAt === todayStr
        );

        if (scheduledProfile && user.activeProfileId?.toString() !== scheduledProfile._id.toString() && !hasAlreadyActivatedToday) {
           await switchProfile(user.firebaseId, scheduledProfile._id, todayStr);
           user.activeProfileId = scheduledProfile._id;
        } else if (user.activeProfileId) {
           const activeProfile = await HabitProfile.findById(user.activeProfileId);
           if (activeProfile && activeProfile.endDate && activeProfile.endDate < todayStr && activeProfile.autoRevertToDefault) {
              const defaultProfile = await HabitProfile.findOne({ userId: user.firebaseId, isDefault: true });
              if (defaultProfile && user.activeProfileId.toString() !== defaultProfile._id.toString()) {
                 await switchProfile(user.firebaseId, defaultProfile._id, todayStr);
                 user.activeProfileId = defaultProfile._id;
              }
           }
        }
      } catch (e) { console.error('Auto-switch error:', e); }

      if (!user.pushSubscription) continue;

      // --- SYSTEM REMINDERS (Water) ---
      if (user.systemReminders?.water?.enabled) {
        const water = user.systemReminders.water;
        const lastFired = water.lastFired ? new Date(water.lastFired) : null;
        const minutesSinceLast = lastFired ? (now - lastFired) / (1000 * 60) : 9999;

        if (minutesSinceLast >= water.interval) {
          try {
            await webpush.sendNotification(user.pushSubscription, JSON.stringify({
              title: '💧 Hydration Alert',
              body: 'Time to drink some water! Stay healthy. 🌊',
              tag: 'system-water',
              data: { url: '/' }
            }));
            await User.updateOne({ _id: user._id }, { $set: { 'systemReminders.water.lastFired': now } });
            notifsSent++;
          } catch (err) {
            errors++;
          }
        }
      }

      // --- HABIT REMINDERS ---
      let prefs = {};
      if (user.notifPrefs) {
        prefs = typeof user.notifPrefs.toJSON === 'function' 
          ? user.notifPrefs.toJSON() 
          : (user.notifPrefs instanceof Map ? Object.fromEntries(user.notifPrefs) : user.notifPrefs);
      }
      const habits = await Habit.find({ userId: user.firebaseId, profileId: user.activeProfileId });

      for (const habit of habits) {
        const isCompletedToday = habit.completions?.some(c => c.date === todayStr);
        if (isCompletedToday) continue;

        const pref = prefs[habit._id.toString()];
        if (!pref?.enabled || !pref.time) continue;

        const [deadlineH, deadlineM] = pref.time.split(':').map(Number);
        const currentH = Number(currentHours);
        const currentM = Number(currentMinutes);

        const totalDeadline = deadlineH * 60 + deadlineM;
        const totalCurrent = currentH * 60 + currentM;

        let shouldNotify = false;
        let messageTag = `habit-${habit._id}`;

        // 1. Check Standard Start Time Trigger (Stateful)
        if (totalCurrent >= totalDeadline && habit.lastReminderSentAt !== todayStr) {
          shouldNotify = true;
          await Habit.updateOne({ _id: habit._id }, { $set: { lastReminderSentAt: todayStr } });
        }

        // 2. Check Overdue Nagging (Stateful)
        if (!shouldNotify && habit.naggingInterval > 0 && totalCurrent >= totalDeadline) {
          const lastNagged = habit.lastNaggedAt ? new Date(habit.lastNaggedAt) : null;
          const minutesSinceLastNag = lastNagged ? (now - lastNagged) / (1000 * 60) : 9999;

          if (minutesSinceLastNag >= habit.naggingInterval) {
            shouldNotify = true;
            messageTag = `nag-${habit._id}-${now.getTime()}`; 
            await Habit.updateOne({ _id: habit._id }, { $set: { lastNaggedAt: now } });
          }
        }

        if (shouldNotify) {
          const body = habit.reminderMessage || `Don't break the streak! It's time for ${habit.name} 🔥`;
          try {
            await webpush.sendNotification(user.pushSubscription, JSON.stringify({
              title: '⏰ Habit Reminder',
              body,
              tag: messageTag,
              data: { url: '/' }
            }));
            notifsSent++;
          } catch (err) {
            if (err.statusCode === 410 || err.statusCode === 404) {
              await User.updateOne({ _id: user._id }, { $unset: { pushSubscription: 1 } });
            }
            errors++;
          }
        }
      }

      // --- GOAL REMINDERS ---
      const goals = await Goal.find({ userId: user.firebaseId, date: todayStr, completed: false });
      for (const goal of goals) {
        if (!goal.time) continue;

        const [dH, dM] = goal.time.split(':').map(Number);
        const totalDeadline = dH * 60 + dM;
        const totalCurrent = Number(currentHours) * 60 + Number(currentMinutes);

        let shouldNotify = totalCurrent === totalDeadline;
        let tag = `goal-${goal._id}`;

        if (!shouldNotify && goal.nagTime > 0 && totalCurrent > totalDeadline) {
          if ((totalCurrent - totalDeadline) % goal.nagTime === 0) {
            shouldNotify = true;
            tag = `goal-nag-${goal._id}-${totalCurrent}`;
          }
        }

        if (shouldNotify) {
          try {
            await webpush.sendNotification(user.pushSubscription, JSON.stringify({
              title: '🎯 Goal Reminder',
              body: `Don't forget your goal: ${goal.text}`,
              tag,
              data: { url: '/' }
            }));
            notifsSent++;
          } catch (err) {
            if (err.statusCode === 410 || err.statusCode === 404) {
              await User.updateOne({ _id: user._id }, { $unset: { pushSubscription: 1 } });
            }
            errors++;
          }
        }
      }
    }

    console.log(`[cron-notify] ${new Date().toISOString()} — sent: ${notifsSent}, errors: ${errors}`);
    res.json({ ok: true, time: currentTimeStr, date: todayStr, notifsSent, errors });

  } catch (err) {
    console.error('[cron-notify] Fatal error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/ping
 * Simple health check / keep-alive endpoint.
 */
router.get('/ping', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString(), message: 'Habit Mastery API is alive 🏃' });
});

export default router;
