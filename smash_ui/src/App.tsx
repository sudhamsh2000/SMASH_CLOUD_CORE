import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, MemoryStick, HardDrive, User, FolderOpen, Bot, Settings, Clock, Activity, Cloud, Thermometer, Send, LogIn, LogOut } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// Mock data functions
function generateRandomStats() {
  return {
    cpu: Math.floor(Math.random() * 20) + 15, // 15-35% (more realistic for idle system)
    ram: Math.floor(Math.random() * 15) + 45,  // 45-60% (stable RAM usage)
    disk: 12 // Fixed at 12% - realistic for fresh Nextcloud installation
  };
}

function getStorageData(diskUsed: number) {
  return [
    { name: 'Used', value: diskUsed, color: '#8b5cf6' },
    { name: 'Free', value: 100 - diskUsed, color: '#374151' }
  ];
}

function getWeatherData() {
  // Fixed location for SMASH Cloud server
  return { 
    city: 'San Francisco', 
    temp: 72, 
    condition: 'Partly Cloudy', 
    icon: '⛅' 
  };
}

function getAiResponse(userMessage: string) {
  const responses = [
    "Your SMASH Cloud is running optimally! All systems are green.",
    "Welcome to your fresh SMASH Cloud installation. Everything looks great!",
    "Your server uptime is excellent at 99.9%. Keep up the great maintenance!",
    "I notice your CPU usage is normal. Everything looks good from here.",
    "Your cloud security is up to date. No vulnerabilities detected.",
    "Your storage is at 12% usage - perfect for a fresh installation!",
    "I've optimized your cloud performance. You should see improved speeds.",
    "Your backup schedule is ready to run. Data will be safe and secure.",
    "System health check complete. All services are running smoothly.",
    "Your Nextcloud instance is properly configured and ready to use."
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

function getCurrentTime() {
  return new Date().toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function getCurrentDate() {
  return new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

// TopBar Component
function TopBar({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="glass glass-hover" style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      padding: '24px', 
      marginBottom: '24px' 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ fontSize: '24px' }}>☁️</div>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#00FFFF', margin: 0 }}>SMASH Cloud</h1>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ fontSize: '14px', color: '#9ca3af' }}>
          <div style={{ fontWeight: '500' }}>Admin User</div>
          <div style={{ fontSize: '12px' }}>smash@cloud.local</div>
        </div>
        <button
          onClick={onLogout}
          style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #00FFFF, #3b82f6)',
            borderRadius: '50%',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <LogOut style={{ width: '20px', height: '20px', color: 'white' }} />
        </button>
      </div>
    </div>
  );
}

// Sidebar Component
function Sidebar() {
  const menuItems = [
    { icon: Activity, label: "Dashboard", active: true },
    { icon: FolderOpen, label: "Files", active: false },
    { icon: Bot, label: "AI", active: false },
    { icon: Settings, label: "Settings", active: false },
  ];

  return (
    <div className="glass" style={{ 
      width: '72px', 
      height: '100%', 
      padding: '16px', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      gap: '24px' 
    }}>
      {menuItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <div
            key={index}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backgroundColor: item.active ? 'rgba(0, 255, 255, 0.2)' : 'transparent',
              color: item.active ? '#00FFFF' : '#9ca3af',
              boxShadow: item.active ? '0 0 20px rgba(0, 255, 255, 0.3)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (!item.active) {
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!item.active) {
                e.currentTarget.style.color = '#9ca3af';
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <Icon style={{ width: '24px', height: '24px' }} />
          </div>
        );
      })}
    </div>
  );
}

// SystemStatCard Component
function SystemStatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass card-hover"
      style={{ padding: '24px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '8px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: color
          }}>
            <Icon style={{ width: '20px', height: '20px', color: 'white' }} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#d1d5db', margin: 0 }}>{title}</h3>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '30px', fontWeight: 'bold', color: 'white', margin: 0 }}>{value}%</div>
          <div style={{ fontSize: '14px', color: '#9ca3af' }}>Usage</div>
        </div>
      </div>
      
      <div style={{ width: '100%', backgroundColor: '#374151', borderRadius: '4px', height: '8px', marginBottom: '8px' }}>
        <motion.div
          style={{ 
            height: '8px', 
            borderRadius: '4px',
            background: color,
            width: `${value}%`
          }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af' }}>
        <span>0%</span>
        <span>100%</span>
      </div>
    </motion.div>
  );
}

// AI Console Component
function AiConsole() {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm your SMASH Cloud AI assistant. How can I help you today?", isUser: false }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = { id: Date.now(), text: input, isUser: true };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    setTimeout(() => {
      const aiResponse = { id: Date.now() + 1, text: getAiResponse(input), isUser: false };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1000 + Math.random() * 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="glass card-hover"
      style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '384px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ 
          width: '32px', 
          height: '32px', 
          background: 'linear-gradient(135deg, #00FFFF, #3b82f6)', 
          borderRadius: '8px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <Bot style={{ width: '16px', height: '16px', color: 'white' }} />
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#d1d5db', margin: 0 }}>AI Console</h3>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, x: message.isUser ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              style={{ display: 'flex', justifyContent: message.isUser ? 'flex-end' : 'flex-start' }}
            >
              <div
                style={{
                  maxWidth: '288px',
                  padding: '16px',
                  borderRadius: '16px',
                  backgroundColor: message.isUser ? 'rgba(0, 255, 255, 0.2)' : 'rgba(55, 65, 81, 0.5)',
                  color: message.isUser ? 'white' : '#d1d5db'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  {message.isUser ? (
                    <User style={{ width: '12px', height: '12px' }} />
                  ) : (
                    <Bot style={{ width: '12px', height: '12px' }} />
                  )}
                  <span style={{ fontSize: '12px', opacity: 0.7 }}>
                    {message.isUser ? "You" : "AI"}
                  </span>
                </div>
                <p style={{ fontSize: '14px', margin: 0 }}>{message.text}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', justifyContent: 'flex-start' }}
          >
            <div style={{ backgroundColor: 'rgba(55, 65, 81, 0.5)', color: '#d1d5db', padding: '16px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bot style={{ width: '12px', height: '12px' }} />
                <span style={{ fontSize: '12px', opacity: 0.7 }}>AI</span>
              </div>
              <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                <div style={{ width: '8px', height: '8px', backgroundColor: '#9ca3af', borderRadius: '50%', animation: 'bounce 1s infinite' }} />
                <div style={{ width: '8px', height: '8px', backgroundColor: '#9ca3af', borderRadius: '50%', animation: 'bounce 1s infinite 0.1s' }} />
                <div style={{ width: '8px', height: '8px', backgroundColor: '#9ca3af', borderRadius: '50%', animation: 'bounce 1s infinite 0.2s' }} />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me anything about your cloud..."
          style={{
            flex: 1,
            backgroundColor: 'rgba(55, 65, 81, 0.5)',
            border: '1px solid #4b5563',
            borderRadius: '12px',
            padding: '8px 16px',
            color: 'white',
            fontSize: '14px'
          }}
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          style={{
            width: '40px',
            height: '40px',
            backgroundColor: 'rgba(0, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: !input.trim() || isLoading ? 'not-allowed' : 'pointer',
            opacity: !input.trim() || isLoading ? 0.5 : 1,
            transition: 'all 0.2s ease'
          }}
        >
          <Send style={{ width: '16px', height: '16px', color: '#00FFFF' }} />
        </button>
      </div>
    </motion.div>
  );
}

// Storage Pie Chart Component
function StoragePie({ diskUsed }: { diskUsed: number }) {
  const data = getStorageData(diskUsed);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass card-hover"
      style={{ padding: '24px' }}
    >
      <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#d1d5db', marginBottom: '24px', margin: 0 }}>Storage Usage</h3>
      
      <div style={{ height: '256px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`${value}%`, '']}
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: 'white'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px' }}>
        {data.map((item, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div 
              style={{ 
                width: '12px', 
                height: '12px', 
                borderRadius: '50%',
                backgroundColor: item.color
              }}
            />
            <span style={{ fontSize: '14px', color: '#d1d5db' }}>{item.name}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// UptimeWeather Component
function UptimeWeather() {
  const [time, setTime] = useState(getCurrentTime());
  const [date, setDate] = useState(getCurrentDate());
  const [uptime, setUptime] = useState("99.9%");
  const [weather, setWeather] = useState(getWeatherData());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(getCurrentTime());
      setDate(getCurrentDate());
      setUptime((99.8 + Math.random() * 0.2).toFixed(1) + "%");
    }, 1000);

    // Weather is now fixed, no need for timer
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
          <div style={{ fontSize: '16px', fontWeight: '600', color: 'white', marginBottom: '4px' }}>{weather.city}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>{weather.icon}</span>
            <Thermometer style={{ width: '14px', height: '14px', color: '#f59e0b' }} />
            <span style={{ fontSize: '14px', color: '#d1d5db' }}>{weather.temp}°F</span>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>{weather.condition}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Main App Component
// Login Page Component
function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("admin@smash.cloud");
  const [password, setPassword] = useState("password");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login attempt:', { email, password });
    
    if (!email.trim() || !password.trim()) {
      console.log('Missing email or password');
      return;
    }
    
    setIsLoading(true);
    
    // Simulate login process
    setTimeout(() => {
      console.log('Login successful');
      setIsLoading(false);
      onLogin();
    }, 1500);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0A0F1E 0%, #1a1f2e 100%)'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass"
        style={{ 
          padding: '48px', 
          width: '400px',
          maxWidth: '90vw'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            background: 'linear-gradient(135deg, #00FFFF, #3b82f6)', 
            borderRadius: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Cloud style={{ width: '32px', height: '32px', color: 'white' }} />
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: 'white', margin: '0 0 8px 0' }}>SMASH Cloud</h1>
          <p style={{ fontSize: '16px', color: '#9ca3af', margin: 0 }}>Your Personal Cloud Dashboard</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', color: '#d1d5db', marginBottom: '8px' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@smash.cloud"
              required
              style={{
                width: '100%',
                backgroundColor: 'rgba(55, 65, 81, 0.5)',
                border: '1px solid #4b5563',
                borderRadius: '12px',
                padding: '12px 16px',
                color: 'white',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontSize: '14px', color: '#d1d5db', marginBottom: '8px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={{
                width: '100%',
                backgroundColor: 'rgba(55, 65, 81, 0.5)',
                border: '1px solid #4b5563',
                borderRadius: '12px',
                padding: '12px 16px',
                color: 'white',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            onClick={handleLogin}
            disabled={isLoading || !email.trim() || !password.trim()}
            style={{
              width: '100%',
              backgroundColor: isLoading ? 'rgba(0, 255, 255, 0.3)' : 'rgba(0, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isLoading || !email.trim() || !password.trim() ? 'not-allowed' : 'pointer',
              opacity: isLoading || !email.trim() || !password.trim() ? 0.5 : 1,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isLoading ? (
              <>
                <div style={{ width: '16px', height: '16px', border: '2px solid transparent', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                Signing In...
              </>
            ) : (
              <>
                <LogIn style={{ width: '16px', height: '16px' }} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 16px 0' }}>
            Demo: Use any email and password to access
          </p>
          <button
            onClick={() => {
              console.log('Quick login clicked');
              setIsLoading(true);
              setTimeout(() => {
                setIsLoading(false);
                onLogin();
              }, 1000);
            }}
            disabled={isLoading}
            style={{
              backgroundColor: 'rgba(0, 255, 255, 0.1)',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              borderRadius: '8px',
              padding: '8px 16px',
              color: '#00FFFF',
              fontSize: '12px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1
            }}
          >
            Quick Login (Demo)
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [stats, setStats] = useState(generateRandomStats());

  useEffect(() => {
    if (isLoggedIn) {
      const interval = setInterval(() => {
        setStats(generateRandomStats());
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return <LoginPage onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ display: 'flex', height: '100vh' }}>
        {/* Sidebar */}
        <div style={{ width: '72px', flexShrink: 0 }}>
          <Sidebar />
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px' }}>
          <TopBar onLogout={() => setIsLoggedIn(false)} />
          
          <div style={{ 
            flex: 1, 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '24px' 
          }}>
            {/* System Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <SystemStatCard
                title="CPU Usage"
                value={stats.cpu}
                icon={Cpu}
                color="linear-gradient(135deg, #ef4444, #ec4899)"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <SystemStatCard
                title="Memory Usage"
                value={stats.ram}
                icon={MemoryStick}
                color="linear-gradient(135deg, #3b82f6, #06b6d4)"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <SystemStatCard
                title="Disk Usage"
                value={stats.disk}
                icon={HardDrive}
                color="linear-gradient(135deg, #8b5cf6, #6366f1)"
              />
            </motion.div>

            {/* Storage Pie Chart */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <StoragePie diskUsed={stats.disk} />
            </motion.div>

            {/* AI Console */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <AiConsole />
            </motion.div>

            {/* Uptime & Weather */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <UptimeWeather />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}