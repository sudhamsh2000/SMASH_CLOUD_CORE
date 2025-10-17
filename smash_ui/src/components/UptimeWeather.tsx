import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Cloud, Thermometer, Activity } from "lucide-react";
import { getCurrentTime, getCurrentDate } from "../lib/mock";

export default function UptimeWeather() {
  const [time, setTime] = useState(getCurrentTime());
  const [date, setDate] = useState(getCurrentDate());
  const [uptime, setUptime] = useState("99.9%");

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(getCurrentTime());
      setDate(getCurrentDate());
      // Simulate slight uptime variation
      setUptime((99.8 + Math.random() * 0.2).toFixed(1) + "%");
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="glass card-hover"
      style={{ padding: '24px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ 
          width: '32px', 
          height: '32px', 
          background: 'linear-gradient(135deg, #f59e0b, #f97316)', 
          borderRadius: '8px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <Clock style={{ width: '16px', height: '16px', color: 'white' }} />
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#d1d5db', margin: 0 }}>System Status</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Current Time */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            <Clock style={{ width: '16px', height: '16px', color: '#00FFFF' }} />
            <span style={{ fontSize: '14px', color: '#9ca3af' }}>Current Time</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '4px', fontFamily: 'monospace' }}>
            {time}
          </div>
          <div style={{ fontSize: '14px', color: '#9ca3af' }}>{date}</div>
        </div>

        {/* Uptime */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            <Activity style={{ width: '16px', height: '16px', color: '#10b981' }} />
            <span style={{ fontSize: '14px', color: '#9ca3af' }}>Uptime</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>{uptime}</div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Last 30 days</div>
        </div>

        {/* Weather */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            <Cloud style={{ width: '16px', height: '16px', color: '#3b82f6' }} />
            <span style={{ fontSize: '14px', color: '#9ca3af' }}>Location</span>
          </div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: 'white', marginBottom: '4px' }}>San Francisco</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Thermometer style={{ width: '14px', height: '14px', color: '#f59e0b' }} />
            <span style={{ fontSize: '14px', color: '#d1d5db' }}>72°F</span>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>Partly Cloudy</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
