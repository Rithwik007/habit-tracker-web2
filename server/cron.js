import cron from 'node-cron';
import webpush from 'web-push';
import User from './models/User.js';
import Habit from './models/Habit.js';
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

      // 1. Find all users with a push subscription
      const users = await User.find({ pushSubscription: { $exists: true, $ne: null } });
      
      for (const user of users) {
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
        if (!user.notifPrefs) continue;
        const prefs = user.notifPrefs instanceof Map ? Object.fromEntries(user.notifPrefs) : user.notifPrefs;
        
        // Find habits to check for this user
        const habits = await Habit.find({ userId: user.id });
        
        for (const habit of habits) {
          const isCompletedToday = habit.completions?.some(c => c.date === todayStr);
          if (isCompletedToday) continue;

          let shouldNotify = false;
          let messageTag = `habit-${habit._id}`;

          // 1. Check Standard Start Time Trigger
          const pref = prefs[habit._id.toString()];
          if (pref?.enabled && pref.time === currentTimeStr) {
            shouldNotify = true;
          }

          // 2. Check Overdue Nagging (Deadline Logic)
          if (!shouldNotify && habit.deadlineTime && habit.naggingInterval > 0) {
            const [deadlineH, deadlineM] = habit.deadlineTime.split(':').map(Number);
            const currentH = Number(currentHours);
            const currentM = Number(currentMinutes);

            const totalDeadlineMins = deadlineH * 60 + deadlineM;
            const totalCurrentMins = currentH * 60 + currentM;

            // If we are past the deadline
            if (totalCurrentMins > totalDeadlineMins) {
              const diff = totalCurrentMins - totalDeadlineMins;
              // If we land exactly on a nagging interval
              if (diff % habit.naggingInterval === 0) {
                shouldNotify = true;
                messageTag = `nag-${habit._id}-${totalCurrentMins}`; // Unique tag for each nag
              }
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
      }
    } catch (error) {
      console.error('Error in cron job:', error);
    }
  });

  console.log('Cron job started: Push Notification Scheduler');
};

export default startCronJobs;
