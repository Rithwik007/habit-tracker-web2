import cron from 'node-cron';
import webpush from 'web-push';
import User from './models/User.js';
import Habit from './models/Habit.js';
import Goal from './models/Goal.js';
import dotenv from 'dotenv';

dotenv.config();



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
            const userName = user.display_name || 'there';
            const payload = JSON.stringify({
              title: '💧 Hydration Alert',
              body: `Hi ${userName}! [From: App]\nTime to drink some water! Stay healthy. 🌊`,
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
        const habits = await Habit.find({ userId: user.firebaseId });
        
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

          // 2. Check Overdue Nagging (Using Standard Reminder Time as Deadline)
          if (!shouldNotify && pref?.enabled && habit.naggingInterval > 0 && pref.time) {
            const [deadlineH, deadlineM] = pref.time.split(':').map(Number);
            const currentH = Number(currentHours);
            const currentM = Number(currentMinutes);

            const totalDeadlineMins = deadlineH * 60 + deadlineM;
            const totalCurrentMins = currentH * 60 + currentM;

            // If we are past the reminder time
            if (totalCurrentMins > totalDeadlineMins) {
              const diff = totalCurrentMins - totalDeadlineMins;
              // If we land exactly on a nagging interval
              if (diff % habit.naggingInterval === 0) {
                shouldNotify = true;
                messageTag = `nag-${habit._id}-${totalCurrentMins}`; 
              }
            }
          }

          if (shouldNotify) {
            const userName = user.display_name || 'there';
            const messageBody = habit.reminderMessage 
              ? habit.reminderMessage 
              : `Don't break the streak! It's time for ${habit.name} 🔥`;

            const payload = JSON.stringify({
              title: '⏰ Habit Reminder',
              body: `Hi ${userName}! [From: App]\n${messageBody}`,
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
          let goalMessageTag = `goal-${goal._id}`;
          
          const [deadlineH, deadlineM] = goal.time.split(':').map(Number);
          const currentH = Number(currentHours);
          const currentM = Number(currentMinutes);

          const totalDeadlineMins = deadlineH * 60 + deadlineM;
          const totalCurrentMins = currentH * 60 + currentM;

          // 1. Check Standard Deadline Trigger
          if (totalCurrentMins === totalDeadlineMins) {
            shouldNotifyGoal = true;
          }
          
          // 2. Check Overdue Nagging
          if (!shouldNotifyGoal && goal.nagTime > 0) {
            if (totalCurrentMins > totalDeadlineMins) {
              const diff = totalCurrentMins - totalDeadlineMins;
              if (diff % goal.nagTime === 0) {
                shouldNotifyGoal = true;
                goalMessageTag = `goal-nag-${goal._id}-${totalCurrentMins}`; 
              }
            }
          }

          if (shouldNotifyGoal) {
            const userName = user.display_name || 'there';
            const payload = JSON.stringify({
              title: '🎯 Goal Reminder',
              body: `Hi ${userName}! [From: App]\nDon't forget your goal: ${goal.text}`,
              tag: goalMessageTag,
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
