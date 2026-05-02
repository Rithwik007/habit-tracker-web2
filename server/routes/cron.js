import express from 'express';
import webpush from 'web-push';
import User from '../models/User.js';
import Habit from '../models/Habit.js';
import Goal from '../models/Goal.js';
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
  // Optional: protect with a secret key to prevent abuse
  const secret = req.headers['x-cron-secret'] || req.query.secret;
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ message: 'Unauthorized' });
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

    const users = await User.find({ pushSubscription: { $exists: true, $ne: null } });
    let notifsSent = 0;
    let errors = 0;

    for (const user of users) {
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
      const habits = await Habit.find({ userId: user.firebaseId });

      for (const habit of habits) {
        const isCompletedToday = habit.completions?.some(c => c.date === todayStr);
        if (isCompletedToday) continue;

        const pref = prefs[habit._id.toString()];
        if (!pref?.enabled) continue;

        let shouldNotify = false;
        let messageTag = `habit-${habit._id}`;

        // Check if reminder time matches (within the cron window)
        if (pref.time === currentTimeStr) {
          shouldNotify = true;
        }

        // Check nagging (overdue)
        if (!shouldNotify && habit.naggingInterval > 0 && pref.time) {
          const [dH, dM] = pref.time.split(':').map(Number);
          const totalDeadline = dH * 60 + dM;
          const totalCurrent = Number(currentHours) * 60 + Number(currentMinutes);
          if (totalCurrent > totalDeadline) {
            const diff = totalCurrent - totalDeadline;
            if (diff % habit.naggingInterval === 0) {
              shouldNotify = true;
              messageTag = `nag-${habit._id}-${totalCurrent}`;
            }
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
