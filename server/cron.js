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
      
      // Handle edge case where some Node versions return '24' instead of '00'
      if (currentHours === '24') currentHours = '00';
      
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      // 1. Find all users who have a push subscription
      const usersWithPush = await User.find({ pushSubscription: { $exists: true, $ne: null } });
      
      for (const user of usersWithPush) {
        if (!user.notifPrefs) continue;
        
        // Convert Map to plain object if needed
        const prefs = user.notifPrefs instanceof Map 
          ? Object.fromEntries(user.notifPrefs) 
          : user.notifPrefs;

        // 2. Find habits for this user that are scheduled for RIGHT NOW
        const habitsToNotify = [];
        
        for (const [habitId, pref] of Object.entries(prefs)) {
          if (pref.enabled && pref.time === currentTimeStr) {
            habitsToNotify.push(habitId);
          }
        }

        if (habitsToNotify.length === 0) continue;

        // 3. Fetch the habit docs and filter out those already completed TODAY
        const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now); // YYYY-MM-DD
        const habits = await Habit.find({ _id: { $in: habitsToNotify } });
        
        // 4. Send a push notification for each habit that isn't completed yet
        for (const habit of habits) {
          const isCompletedToday = habit.completions?.some(c => c.date === todayStr);
          if (isCompletedToday) continue;

          const payload = JSON.stringify({
            title: '⏰ Habit Reminder',
            body: `Time for: ${habit.name}`,
            tag: `habit-${habit._id}`,
            data: { url: '/' } // URL to open when clicked
          });

          try {
            await webpush.sendNotification(user.pushSubscription, payload);
          } catch (err) {
            // If subscription is invalid/expired (e.g., HTTP 410), remove it from user
            if (err.statusCode === 410 || err.statusCode === 404) {
              await User.updateOne(
                { _id: user._id },
                { $unset: { pushSubscription: 1 } }
              );
            } else {
              console.error(`Error sending push to ${user.email}:`, err);
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
