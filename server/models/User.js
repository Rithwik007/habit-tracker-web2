import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  firebaseId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  display_name: { type: String },
  photoURL: { type: String },
  theme: { type: String, default: 'mastery' },
  notifPrefs: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  pushSubscription: { type: mongoose.Schema.Types.Mixed },
  systemReminders: {
    water: {
      enabled: { type: Boolean, default: false },
      interval: { type: Number, default: 60 }, // in minutes
      lastFired: { type: Date, default: null }
    }
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', UserSchema);
