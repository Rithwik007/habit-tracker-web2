import { useState, useEffect } from 'react';

function getGreetingText() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
}

function getEmoji() {
    const hour = new Date().getHours();
    if (hour < 12) return '🌅';
    if (hour < 17) return '☀️';
    return '🌙';
}

function formatDateTime() {
    const now = new Date();
    const date = now.toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const time = now.toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit'
    });
    return { date, time };
}

export default function Greeting() {
    const [weather, setWeather] = useState(null);
    const [dateTime, setDateTime] = useState(formatDateTime());

    useEffect(() => {
        // Update time every minute; also catches day change
        const interval = setInterval(() => {
            setDateTime(formatDateTime());
        }, 60000);

        // Fetch weather via geolocation
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (pos) => {
                try {
                    const { latitude, longitude } = pos.coords;
                    // Using Open-Meteo API (completely free, no API key needed!)
                    const res = await fetch(
                        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode&temperature_unit=celsius`
                    );
                    const data = await res.json();
                    if (data.current) {
                        const temp = Math.round(data.current.temperature_2m);
                        const code = data.current.weathercode;
                        const desc = getWeatherDesc(code);
                        setWeather({ temp, desc });
                    }
                } catch (e) {
                    // Weather failed silently
                }
            }, () => { });
        }

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="greeting-banner">
            <div className="greeting-time">{getEmoji()} {getGreetingText()}</div>
            <div className="greeting-name">Hi, Rithwik Racharla</div>
            <div className="greeting-meta">
                <span>📅 {dateTime.date}</span>
                <span>🕐 {dateTime.time}</span>
                {weather && <span>🌡️ {weather.temp}°C · {weather.desc}</span>}
            </div>
        </div>
    );
}

function getWeatherDesc(code) {
    if (code === 0) return 'Clear sky';
    if (code <= 3) return 'Partly cloudy';
    if (code <= 48) return 'Foggy';
    if (code <= 67) return 'Rainy';
    if (code <= 77) return 'Snowy';
    if (code <= 82) return 'Showers';
    return 'Thunderstorm';
}
