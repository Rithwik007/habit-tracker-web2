import express from 'express';
import Habit from '../models/Habit.js';

import User from '../models/User.js';

const router = express.Router();

// Get all habits for a user across ALL profiles (for analytics)
router.get('/all/:userId', async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.params.userId });
    res.json(habits);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all habits for a user's ACTIVE profile
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ firebaseId: req.params.userId });
    if (!user || !user.activeProfileId) {
      return res.json([]);
    }
    
    const habits = await Habit.find({ userId: req.params.userId, profileId: user.activeProfileId });
    res.json(habits);
  } catch (err) {
    console.error('GET Habits Error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Create a habit (auto-assigns to active profile)
router.post('/', async (req, res) => {
  try {
    const user = await User.findOne({ firebaseId: req.body.userId });
    if (!user || !user.activeProfileId) {
      return res.status(400).json({ message: 'User has no active profile' });
    }
    
    const habitData = { ...req.body, profileId: user.activeProfileId };
    const habit = new Habit(habitData);
    const newHabit = await habit.save();
    res.status(201).json(newHabit);
  } catch (err) {
    console.error('POST Habit Error:', err);
    res.status(400).json({ message: err.message });
  }
});

// Update a habit — use $set to never replace the full document
router.put('/:id', async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id);
    if (!habit) return res.status(404).json({ message: 'Habit not found' });
    if (habit.userId !== req.user.uid) {
      return res.status(403).json({ message: 'Forbidden: You do not own this habit' });
    }

    const updatedHabit = await Habit.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    res.json(updatedHabit);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a habit
router.delete('/:id', async (req, res) => {
  try {
    const habit = await Habit.findById(req.params.id);
    if (!habit) return res.status(404).json({ message: 'Habit not found' });
    if (habit.userId !== req.user.uid) {
      return res.status(403).json({ message: 'Forbidden: You do not own this habit' });
    }

    await Habit.findByIdAndDelete(req.params.id);
    res.json({ message: 'Habit deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle completion
router.post('/:id/toggle', async (req, res) => {
  const { date, value, completed, status } = req.body;
  try {
    const habit = await Habit.findById(req.params.id);
    if (!habit) return res.status(404).json({ message: 'Habit not found' });
    if (habit.userId !== req.user.uid) {
      return res.status(403).json({ message: 'Forbidden: You do not own this habit' });
    }

    // Clean up any corrupted legacy completions that lack a date
    habit.completions = habit.completions.filter(c => c.date);

    const completionIndex = habit.completions.findIndex(c => c.date === date);
    const isExplicitUncheck = completed === false || (habit.tracksValue === false && value === 0);
    const isSkip = status === 'skipped';

    if (isExplicitUncheck) {
      // Remove entry — same as before
      if (completionIndex > -1) {
        habit.completions.splice(completionIndex, 1);
      }
    } else if (isSkip) {
      // Write/upsert a skip record — bypasses tracksValue validation entirely
      if (completionIndex > -1) {
        habit.completions[completionIndex].status = 'skipped';
        habit.completions[completionIndex].value = null;
      } else {
        habit.completions.push({ date, value: null, status: 'skipped' });
      }
    } else {
      // Normal completion — existing tracksValue validation unchanged
      let finalValue = value;
      if (habit.tracksValue) {
        if (value === undefined || value === null || isNaN(Number(value))) {
          return res.status(400).json({ message: 'Numeric value is required for this habit.' });
        }
        finalValue = Number(value);
      } else {
        if (value === undefined || value === null) {
          finalValue = 1;
        } else {
          finalValue = Number(value);
        }
      }

      // Determine completion status: partial if numeric value is below target
      let completionStatus = 'completed';
      if (habit.tracksValue && habit.valueTarget !== null && habit.valueTarget !== undefined) {
        const vt = Number(habit.valueTarget);
        if (!isNaN(vt)) {
          // Edge: target 0, value 0 → completed. Otherwise value >= target → completed, else partial
          if (vt === 0 && finalValue === 0) {
            completionStatus = 'completed';
          } else if (finalValue >= vt) {
            completionStatus = 'completed';
          } else {
            completionStatus = 'partial';
          }
        }
      }

      if (completionIndex > -1) {
        habit.completions[completionIndex].value = finalValue;
        habit.completions[completionIndex].status = completionStatus;
      } else {
        habit.completions.push({ date, value: finalValue, status: completionStatus });
      }
    }

    await habit.save();
    res.json(habit);
  } catch (err) {
    console.error('Toggle Error:', err);
    res.status(400).json({ message: err.message });
  }
});

export default router;
