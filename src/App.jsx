import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const INITIAL_HABITS = [
  "Wake up at 8:00 AM", "Oat Meal", "Gym", "Dsa", "web development",
  "no wasting money", "Apply Sunscreen", "No Junk Food",
  "less Screen time (5 hrs)", "Parents", "Bathing",
  "Bread Peanut Butter", "Eggs or chicken", "College Work",
  "sleep at 11 PM", "8 hours sleep"
];

function App() {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch habits from Supabase or Local Storage on mount
  useEffect(() => {
    fetchHabits();
  }, []);

  async function fetchHabits() {
    try {
      setLoading(true);

      // Try to load from Supabase if client exists
      if (supabase) {
        const { data, error } = await supabase
          .from('habits')
          .select('*')
          .order('id', { ascending: true });

        if (!error && data && data.length > 0) {
          setHabits(data);
          localStorage.setItem('habits_backup', JSON.stringify(data));
          return;
        }
      }

      // Fallback: Check local storage
      const localData = localStorage.getItem('habits_backup');
      if (localData) {
        setHabits(JSON.parse(localData));
      } else {
        // Ultimate Fallback: Initial habits
        const initialData = INITIAL_HABITS.map((name, index) => ({
          name,
          completed: false,
          streak: 0
        }));
        setHabits(initialData);
      }
    } catch (error) {
      console.error('Error fetching habits:', error.message);
    } finally {
      setLoading(false);
    }
  }

  const toggleHabit = async (index) => {
    const updatedHabits = [...habits];
    const habit = updatedHabits[index];

    const newCompleted = !habit.completed;
    const newStreak = newCompleted ? habit.streak + 1 : Math.max(0, habit.streak - 1);

    // Optimistic Update
    habit.completed = newCompleted;
    habit.streak = newStreak;
    setHabits(updatedHabits);
    localStorage.setItem('habits_backup', JSON.stringify(updatedHabits));

    // Sync to Supabase if available
    if (supabase) {
      try {
        const { error } = await supabase
          .from('habits')
          .upsert({
            name: habit.name,
            completed: newCompleted,
            streak: newStreak,
            last_updated: new Date().toISOString()
          }, { onConflict: 'name' });

        if (error) throw error;
      } catch (error) {
        console.error('Error updating habit in cloud:', error.message);
      }
    }
  };

  if (loading) return <div className="loading">Loading Dashboard...</div>;

  const completionRate = habits.length > 0
    ? Math.round((habits.filter(h => h.completed).length / habits.length) * 100)
    : 0;
  const currentStreak = habits.length > 0
    ? Math.max(...habits.map(h => h.streak))
    : 0;

  return (
    <div className="app-container">
      <header className="dashboard-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="dashboard-title">Habit Mastery Pro</h1>
            <p style={{ color: 'var(--text-dim)', marginBottom: '20px' }}>Real-time database synchronization enabled</p>
          </div>
          <div className="status-badge">Live Sync</div>
        </div>
      </header>

      <div className="kpi-grid">
        <div className="glass-card kpi-card">
          <span className="kpi-label">Today's Progress</span>
          <span className="kpi-value">{completionRate}%</span>
        </div>
        <div className="glass-card kpi-card">
          <span className="kpi-label">Current Streak</span>
          <span className="kpi-value">{currentStreak}</span>
        </div>
        <div className="glass-card kpi-card">
          <span className="kpi-label">Total Habits</span>
          <span className="kpi-value">{habits.length}</span>
        </div>
      </div>

      <div className="glass-card">
        <h2 style={{ marginBottom: '20px', fontSize: '1.25rem' }}>Daily Disciplines</h2>
        <div className="habit-list">
          {habits.map((habit, index) => (
            <div
              key={habit.name}
              className={`habit-item ${habit.completed ? 'completed' : ''}`}
              onClick={() => toggleHabit(index)}
            >
              <div className="habit-info">
                <span className="habit-name">{habit.name}</span>
                <span className="habit-streak">Streak: {habit.streak} days</span>
              </div>
              <div className="check-btn">
                {habit.completed && (
                  <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
