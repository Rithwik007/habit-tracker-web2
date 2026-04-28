import mongoose from 'mongoose';
import webpush from 'web-push';
import dotenv from 'dotenv';
dotenv.config();

webpush.setVapidDetails('mailto:support@habit-tracker.com', process.env.VITE_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({ email: String, notifPrefs: Map, pushSubscription: mongoose.Schema.Types.Mixed }, { strict: false }));
  const Habit = mongoose.model('Habit', new mongoose.Schema({ name: String }, { strict: false }));
  
  const user = await User.findOne({ email: 'rithwikracharla@gmail.com' });
  if (!user || !user.notifPrefs) process.exit(0);
  
  const prefs = Object.fromEntries(user.notifPrefs);
  const habitsToNotify = [];
  
  for (const [habitId, pref] of Object.entries(prefs)) {
    if (pref.enabled) habitsToNotify.push(habitId);
  }
  
  const habits = await Habit.find({ _id: { $in: habitsToNotify } });
  for (const habit of habits) {
    const payload = JSON.stringify({ title: '⏰ Habit Reminder', body: 'Time for: ' + habit.name, data: { url: '/' } });
    try {
      await webpush.sendNotification(user.pushSubscription, payload);
      console.log('Successfully sent push for', habit.name);
    } catch (err) {
      console.error('Push failed', err);
    }
  }
  process.exit(0);
});
