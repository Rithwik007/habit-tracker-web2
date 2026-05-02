import express from 'express';
import Habit from '../models/Habit.js';

const router = express.Router();

// Get all habits for a user
router.get('/:userId', async (req, res) => {
  try {
    console.log(`Fetching habits for user: ${req.params.userId}`);
    const habits = await Habit.find({ userId: req.params.userId });
    res.json(habits);
  } catch (err) {
    console.error('GET Habits Error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Create a habit
router.post('/', async (req, res) => {
  const habit = new Habit(req.body);
  try {
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
    const updatedHabit = await Habit.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!updatedHabit) return res.status(404).json({ message: 'Habit not found' });
    res.json(updatedHabit);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a habit
router.delete('/:id', async (req, res) => {
  try {
    await Habit.findByIdAndDelete(req.params.id);
    res.json({ message: 'Habit deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle completion
router.post('/:id/toggle', async (req, res) => {
  const { date, value } = req.body;
  try {
    const habit = await Habit.findById(req.params.id);
    if (!habit) return res.status(404).json({ message: 'Habit not found' });

    // Clean up any corrupted legacy completions that lack a date
    habit.completions = habit.completions.filter(c => c.date);

    const completionIndex = habit.completions.findIndex(c => c.date === date);
    if (completionIndex > -1) {
      habit.completions[completionIndex].value = value;
      if (value === 0) {
        habit.completions.splice(completionIndex, 1);
      }
    } else if (value > 0) {
      habit.completions.push({ date, value });
    }

    await habit.save();
    res.json(habit);
  } catch (err) {
    console.error('Toggle Error:', err);
    res.status(400).json({ message: err.message });
  }
});

export default router;
