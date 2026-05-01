import express from 'express';
import Goal from '../models/Goal.js';

const router = express.Router();

// Get goals for a user on a specific date
router.get('/:userId/:date', async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.params.userId, date: req.params.date });
    res.json(goals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all goals history for a user
router.get('/history/:userId', async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.params.userId }).sort({ date: -1 });
    res.json(goals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a goal
router.post('/', async (req, res) => {
  const goal = new Goal(req.body);
  try {
    const newGoal = await goal.save();
    res.status(201).json(newGoal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Toggle goal completion
router.put('/:id/toggle', async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    
    goal.completed = !goal.completed;
    await goal.save();
    res.json(goal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a goal
router.delete('/:id', async (req, res) => {
  try {
    await Goal.findByIdAndDelete(req.params.id);
    res.json({ message: 'Goal deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
