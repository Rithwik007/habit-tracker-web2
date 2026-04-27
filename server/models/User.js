import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  firebaseId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  display_name: { type: String },
  photoURL: { type: String },
  theme: { type: String, default: 'mastery' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', UserSchema);
