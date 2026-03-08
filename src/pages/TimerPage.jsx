import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TimerPage() {
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState('focus'); // focus, break

    useEffect(() => {
        let interval = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(time => time - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            if (mode === 'focus') {
                setMode('break');
                setTimeLeft(5 * 60);
                new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => { });
            } else {
                setMode('focus');
                setTimeLeft(25 * 60);
                new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => { });
            }
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft, mode]);

    const toggleTimer = () => setIsActive(!isActive);

    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
    };

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const progress = 100 - ((timeLeft / (mode === 'focus' ? 25 * 60 : 5 * 60)) * 100);

    return (
        <div className="fade-in timer-page">
            <h1 className="page-title">⏳ Focus Timer</h1>

            <div className="timer-container">
                <div className="timer-mode-selector">
                    <button
                        className={`timer-tab ${mode === 'focus' ? 'active' : ''}`}
                        onClick={() => { setMode('focus'); setIsActive(false); setTimeLeft(25 * 60); }}
                    >Focus</button>
                    <button
                        className={`timer-tab ${mode === 'break' ? 'active' : ''}`}
                        onClick={() => { setMode('break'); setIsActive(false); setTimeLeft(5 * 60); }}
                    >Short Break</button>
                </div>

                <div className="timer-circle-wrapper">
                    <svg className="timer-svg" viewBox="0 0 100 100">
                        <circle className="timer-bg" cx="50" cy="50" r="45" />
                        <motion.circle
                            className="timer-progress"
                            cx="50" cy="50" r="45"
                            strokeDasharray="283"
                            animate={{ strokeDashoffset: 283 - (283 * progress) / 100 }}
                            transition={{ duration: 1, ease: 'linear' }}
                            style={{ stroke: mode === 'focus' ? 'var(--primary)' : 'var(--success)' }}
                        />
                    </svg>
                    <div className="timer-display">
                        <AnimatePresence mode="popLayout">
                            <motion.span
                                key={minutes}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -20, opacity: 0, position: 'absolute' }}
                            >
                                {String(minutes).padStart(2, '0')}
                            </motion.span>
                        </AnimatePresence>
                        :
                        <AnimatePresence mode="popLayout">
                            <motion.span
                                key={seconds}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -20, opacity: 0, position: 'absolute' }}
                            >
                                {String(seconds).padStart(2, '0')}
                            </motion.span>
                        </AnimatePresence>
                    </div>
                </div>

                <div className="timer-controls">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="btn-main"
                        onClick={toggleTimer}
                    >
                        {isActive ? 'Pause' : 'Start'}
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="btn-secondary"
                        onClick={resetTimer}
                    >
                        Reset
                    </motion.button>
                </div>
            </div>
        </div>
    );
}
