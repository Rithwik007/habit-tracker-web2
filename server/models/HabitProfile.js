import mongoose from 'mongoose';

const HabitProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true },         // Firebase UID
  name: { type: String, required: true },           // "Home", "Trip", "Default"
  isDefault: { type: Boolean, default: false },     // true for exactly one per user
  startDate: { type: String, default: null },       // YYYY-MM-DD, optional
  endDate: { type: String, default: null },         // YYYY-MM-DD, optional
  autoRevertToDefault: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Indexes for fast cron lookups
HabitProfileSchema.index({ userId: 1 });                          // list profiles per user
HabitProfileSchema.index({ userId: 1, startDate: 1 });            // auto-switch: find scheduled profile for today
HabitProfileSchema.index({ userId: 1, endDate: 1 });              // expiry-revert: find profiles whose endDate has passed
HabitProfileSchema.index({ isDefault: 1, userId: 1 });            // fast default-profile lookup

export default mongoose.model('HabitProfile', HabitProfileSchema);
