import express from 'express';
import webpush from 'web-push';
import User from '../models/User.js';
import Habit from '../models/Habit.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// GET all users (admin only - no server-side auth check, handled by frontend)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET habits for a specific user (for admin to view their analytics)
router.get('/user-habits/:uid', async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.params.uid });
    res.json(habits);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE a user and all their data
router.delete('/user/:uid', async (req, res) => {
  const uid = req.params.uid;
  try {
    await Habit.deleteMany({ userId: uid });
    await User.deleteOne({ firebaseId: uid });
    
    // Note model uses mongoose.models cache since we redefine it in notes.js
    const NoteSchema = new mongoose.Schema({
      userId: { type: String, required: true },
      date: { type: String, required: true },
      content: { type: String, default: '' },
      updatedAt: { type: Date, default: Date.now }
    });
    const Note = mongoose.models.Note || mongoose.model('Note', NoteSchema);
    
    await Note.deleteMany({ userId: uid });
    
    // Delete all moods for this user
    const MoodSchema = new mongoose.Schema({
      userId: { type: String, required: true },
      date: { type: String, required: true },
      score: { type: Number, min: 1, max: 5, required: true },
      updatedAt: { type: Date, default: Date.now }
    });
    const Mood = mongoose.models.Mood || mongoose.model('Mood', MoodSchema);
    await Mood.deleteMany({ userId: uid });

    // Delete all goals for this user
    const Goal = mongoose.models.Goal;
    if (Goal) {
      await Goal.deleteMany({ userId: uid });
    }
    
    // Delete all notifications for this user
    await Notification.deleteMany({ userId: uid });
    
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST send custom notification
router.post('/notify', async (req, res) => {
  const { userIds, title, message } = req.body;
  
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ message: 'No users selected' });
  }
  if (!title || !message) {
    return res.status(400).json({ message: 'Title and message are required' });
  }

  try {
    const users = await User.find({ 
      firebaseId: { $in: userIds }, 
      pushSubscription: { $exists: true, $ne: null } 
    });
    
    let sentCount = 0;
    let failedCount = 0;

    console.log(`Attempting to send push to ${users.length} users...`);
    for (const user of users) {
      if (!user.pushSubscription) continue;

      const userName = user.display_name || 'there';
      const formattedMessage = `Hi ${userName}! [From: Admin]\n${message}`;

      const payload = JSON.stringify({
        title: title,
        body: formattedMessage,
        tag: `admin-broadcast-${Date.now()}`,
        data: { url: '/' }
      });

      try {
        await webpush.sendNotification(user.pushSubscription, payload);
        sentCount++;
      } catch (err) {
        console.error(`Push failed for user ${user.email}:`, err.message);
        failedCount++;
        if (err.statusCode === 410 || err.statusCode === 404) {
          await User.updateOne({ _id: user._id }, { $unset: { pushSubscription: 1 } });
        }
      }
    }

    const notificationsToInsert = userIds.map(uid => ({
      userId: uid,
      title: title,
      message: message,
      sender: 'Admin'
    }));
    await Notification.insertMany(notificationsToInsert);

    console.log(`Broadcast finished: ${sentCount} sent, ${failedCount} failed.`);
    res.json({ message: `Sent to ${sentCount} devices. (${failedCount} failed/unavailable)` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
