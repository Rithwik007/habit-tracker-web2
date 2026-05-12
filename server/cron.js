import cron from 'node-cron';
import webpush from 'web-push';
import User from './models/User.js';
import Habit from './models/Habit.js';
import Goal from './models/Goal.js';
import HabitProfile from './models/HabitProfile.js';
import { switchProfile } from './utils/switchProfile.js';
import dotenv from 'dotenv';

dotenv.config();

// Configure web-push with VAPID keys
if (process.env.VITE_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@habit-tracker.com',
    process.env.VITE_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('VAPID keys not found in .env. Push notifications will not work.');
}

const startCronJobs = () => {
  // Run every minute: '0 * * * * *' (at the 0th second of every minute)
  // or '* * * * *'
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      // Format current time in user's timezone (IST) as HH:MM
      const options = { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' };
      const timeParts = new Intl.DateTimeFormat('en-US', options).formatToParts(now);
      let currentHours = timeParts.find(p => p.type === 'hour').value;
      const currentMinutes = timeParts.find(p => p.type === 'minute').value;
      if (currentHours === '24') currentHours = '00';
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);

      // 1. Find all users
      const users = await User.find({});
      
      for (const user of users) {
        // --- PART A0: AUTO-SWITCH PROFILES ---
        try {
          const scheduledProfile = await HabitProfile.findOne({ userId: user.firebaseId, startDate: todayStr });
          if (scheduledProfile && user.activeProfileId?.toString() !== scheduledProfile._id.toString()) {
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

        // --- PART A: SYSTEM REMINDERS (Water, etc.) ---
        if (user.systemReminders?.water?.enabled) {
          const water = user.systemReminders.water;
          const lastFired = water.lastFired ? new Date(water.lastFired) : null;
          const minutesSinceLast = lastFired ? (now - lastFired) / (1000 * 60) : 9999;

          if (minutesSinceLast >= water.interval) {
            const payload = JSON.stringify({
              title: '💧 Hydration Alert',
              body: 'Time to drink some water! Stay healthy. 🌊',
              tag: 'system-water',
              data: { url: '/' }
            });
            try {
              await webpush.sendNotification(user.pushSubscription, payload);
              // Update lastFired
              await User.updateOne(
                { _id: user._id },
                { $set: { 'systemReminders.water.lastFired': now } }
              );
            } catch (err) {
              console.error(`System push failed for ${user.email}:`, err);
            }
          }
        }

        // --- PART B: HABIT NOTIFICATIONS (Standard + Nagging) ---
        // Safely parse notifPrefs to a plain object
        let prefs = {};
        if (user.notifPrefs) {
          prefs = typeof user.notifPrefs.toJSON === 'function' 
            ? user.notifPrefs.toJSON() 
            : (user.notifPrefs instanceof Map ? Object.fromEntries(user.notifPrefs) : user.notifPrefs);
        }
        
        // Find habits to check for this user
        const habits = await Habit.find({ userId: user.firebaseId, profileId: user.activeProfileId });
        
        for (const habit of habits) {
          const isCompletedToday = habit.completions?.some(c => c.date === todayStr);
          if (isCompletedToday) continue;

          let shouldNotify = false;
          let messageTag = `habit-${habit._id}`;

          const pref = prefs[habit._id.toString()];
          if (!pref?.enabled || !pref.time) continue;

          const [deadlineH, deadlineM] = pref.time.split(':').map(Number);
          const currentH = Number(currentHours);
          const currentM = Number(currentMinutes);

          const totalDeadlineMins = deadlineH * 60 + deadlineM;
          const totalCurrentMins = currentH * 60 + currentM;

          // 1. Check Standard Start Time Trigger (Stateful)
          if (totalCurrentMins >= totalDeadlineMins && habit.lastReminderSentAt !== todayStr) {
            shouldNotify = true;
            await Habit.updateOne({ _id: habit._id }, { $set: { lastReminderSentAt: todayStr } });
          }

          // 2. Check Overdue Nagging (Stateful)
          if (!shouldNotify && habit.naggingInterval > 0 && totalCurrentMins >= totalDeadlineMins) {
            const lastNagged = habit.lastNaggedAt ? new Date(habit.lastNaggedAt) : null;
            const minutesSinceLastNag = lastNagged ? (now - lastNagged) / (1000 * 60) : 9999;

            if (minutesSinceLastNag >= habit.naggingInterval) {
              shouldNotify = true;
              messageTag = `nag-${habit._id}-${now.getTime()}`; 
              await Habit.updateOne({ _id: habit._id }, { $set: { lastNaggedAt: now } });
            }
          }

          if (shouldNotify) {
            const messageBody = habit.reminderMessage 
              ? habit.reminderMessage 
              : `Don't break the streak! It's time for ${habit.name} 🔥`;

            const payload = JSON.stringify({
              title: '⏰ Habit Reminder',
              body: messageBody,
              tag: messageTag,
              data: { url: '/' }
            });

            try {
              await webpush.sendNotification(user.pushSubscription, payload);
            } catch (err) {
              if (err.statusCode === 410 || err.statusCode === 404) {
                await User.updateOne({ _id: user._id }, { $unset: { pushSubscription: 1 } });
              }
            }
          }
        }

        // --- PART C: GOAL NOTIFICATIONS (Standard + Nagging) ---
        const goals = await Goal.find({ userId: user.firebaseId, date: todayStr, completed: false });
        for (const goal of goals) {
          if (!goal.time) continue; // No deadline, no notification
          
          let shouldNotifyGoal = false;
          if (!goal.time) continue;

          const [dH, dM] = goal.time.split(':').map(Number);
          const totalDeadline = dH * 60 + dM;
          const totalCurrent = Number(currentHours) * 60 + Number(currentMinutes);

          let shouldNotify = false;
          let tag = `goal-${goal._id}`;

          // 1. Check Standard Start Time (Stateful)
          if (totalCurrent >= totalDeadline && goal.lastReminderSentAt !== todayStr) {
            shouldNotify = true;
            await Goal.updateOne({ _id: goal._id }, { $set: { lastReminderSentAt: todayStr } });
          }

          // 2. Check Overdue Nagging (Stateful)
          if (!shouldNotify && goal.nagTime > 0 && totalCurrent >= totalDeadline) {
            const lastNagged = goal.lastNaggedAt ? new Date(goal.lastNaggedAt) : null;
            const minutesSinceLastNag = lastNagged ? (now - lastNagged) / (1000 * 60) : 9999;

            if (minutesSinceLastNag >= goal.nagTime) {
              shouldNotify = true;
              tag = `goal-nag-${goal._id}-${now.getTime()}`;
              await Goal.updateOne({ _id: goal._id }, { $set: { lastNaggedAt: now } });
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
            } catch (err) {
              if (err.statusCode === 410 || err.statusCode === 404) {
                await User.updateOne({ _id: user._id }, { $unset: { pushSubscription: 1 } });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in cron job:', error);
    }
  });

  console.log('Cron job started: Push Notification Scheduler');
};

export default startCronJobs;
