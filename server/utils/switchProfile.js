import User from '../models/User.js';

/**
 * Safely switches a user's active profile and appends to the profileHistory log.
 * This should be the ONLY place profile switching state is mutated.
 * 
 * @param {String} userId - Firebase UID of the user
 * @param {String} newProfileId - The ObjectId of the new HabitProfile
 * @param {String} dateStr - YYYY-MM-DD date string for activation/deactivation bounds
 */
export async function switchProfile(userId, newProfileId, dateStr) {
  const user = await User.findOne({ firebaseId: userId });
  if (!user) return null;
  
  // No-op if switching to the already active profile
  if (user.activeProfileId?.toString() === newProfileId.toString()) {
    return user;
  }

  // Find the currently active window and close it
  const activeIndex = user.profileHistory.findIndex(h => h.deactivatedAt === null);
  if (activeIndex !== -1) {
    user.profileHistory[activeIndex].deactivatedAt = dateStr;
  }
  
  // Open new window
  user.activeProfileId = newProfileId;
  user.profileHistory.push({
    profileId: newProfileId,
    activatedAt: dateStr,
    deactivatedAt: null
  });

  return await user.save();
}
