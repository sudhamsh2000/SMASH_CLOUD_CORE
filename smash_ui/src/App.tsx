import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Cpu, MemoryStick, HardDrive, User as UserIcon, FolderOpen, Bot, Settings, Clock, Activity, Cloud, Thermometer, Send, Shield } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// Mock data functions
function generateRandomStats() {
  return {
    cpu: Math.floor(Math.random() * 20) + 15,
    ram: Math.floor(Math.random() * 15) + 45,
    disk: 12
  };
}

function getStorageData(diskUsed: number) {
  return [
    { name: 'Used', value: diskUsed, color: '#8b5cf6' },
    { name: 'Free', value: 100 - diskUsed, color: '#374151' }
  ];
}

function getWeatherData() {
  return { 
    city: 'Chicago', 
    temp: 68, 
    condition: 'Partly Cloudy', 
    icon: '⛅' 
  };
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
    month: 'long', 
    day: 'numeric' 
  });
}

// TopBar Component
function TopBar({ onShowAdmin }: { onShowAdmin: () => void }) {
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
        <button
          onClick={onShowAdmin}
          style={{
            backgroundColor: 'rgba(0, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          <Shield style={{ width: '16px', height: '16px' }} />
          Admin Panel
        </button>
        <div style={{ fontSize: '14px', color: '#9ca3af' }}>
          <div style={{ fontWeight: '500' }}>Admin User</div>
          <div style={{ fontSize: '12px' }}>admin@smash.cloud</div>
        </div>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          background: 'linear-gradient(135deg, #ef4444, #ec4899)', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center'
        }}>
          <Shield style={{ width: '20px', height: '20px', color: 'white' }} />
        </div>
      </div>
    </div>
  );
}

// Sidebar Component
function Sidebar({ currentView, onViewChange }: { currentView: string; onViewChange: (view: string) => void }) {
  const menuItems = [
    { icon: Activity, label: "Dashboard", view: "dashboard" },
    { icon: FolderOpen, label: "Files", view: "files" },
    { icon: Bot, label: "AI", view: "ai" },
    { icon: Settings, label: "Settings", view: "settings" }
  ];

  return (
    <div className="glass" style={{ 
      height: '100vh', 
      padding: '24px 12px', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      gap: '24px'
    }}>
      {menuItems.map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="glass-hover"
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backgroundColor: currentView === item.view ? 'rgba(0, 255, 255, 0.2)' : 'transparent',
            border: currentView === item.view ? '1px solid #00FFFF' : '1px solid transparent'
          }}
          onClick={() => onViewChange(item.view)}
        >
          <item.icon style={{ 
            width: '20px', 
            height: '20px', 
            color: currentView === item.view ? '#00FFFF' : '#9ca3af' 
          }} />
        </motion.div>
      ))}
    </div>
  );
}

// SystemStatCard Component
function SystemStatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) {
  return (
    <div className="glass card-hover" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'white', margin: 0 }}>{title}</h3>
        <div style={{ 
          width: '32px', 
          height: '32px', 
          background: color, 
          borderRadius: '8px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <Icon style={{ width: '16px', height: '16px', color: 'white' }} />
        </div>
      </div>
      
      <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
        {value}%
      </div>
      
      <div style={{ 
        width: '100%', 
        height: '8px', 
        backgroundColor: 'rgba(55, 65, 81, 0.5)', 
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ 
            height: '100%', 
            background: color,
            borderRadius: '4px'
          }}
        />
      </div>
    </div>
  );
}

// StoragePie Component
function StoragePie({ diskUsed }: { diskUsed: number }) {
  const data = getStorageData(diskUsed);

  return (
    <div className="glass card-hover" style={{ padding: '24px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'white', marginBottom: '24px' }}>Storage Usage</h3>
      
      <div style={{ height: '200px', marginBottom: '16px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value}%`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {data.map((item, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              backgroundColor: item.color, 
              borderRadius: '50%' 
            }} />
            <span style={{ fontSize: '14px', color: '#d1d5db' }}>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// AI Console Component
function AiConsole() {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm your SMASH Cloud AI assistant. How can I help you today?", isUser: false }
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessage = { id: messages.length + 1, text: input, isUser: true };
    setMessages([...messages, newMessage]);
    setInput("");

    // Simulate AI response
    setTimeout(() => {
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
      const aiResponse = { 
        id: messages.length + 2, 
        text: responses[Math.floor(Math.random() * responses.length)], 
        isUser: false 
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <div className="glass card-hover" style={{ padding: '24px', height: '400px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ 
          width: '32px', 
          height: '32px', 
          background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', 
          borderRadius: '8px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <Bot style={{ width: '16px', height: '16px', color: 'white' }} />
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'white', margin: 0 }}>SMASH Cloud AI</h3>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
        {messages.map(message => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              marginBottom: '12px',
              justifyContent: message.isUser ? 'flex-end' : 'flex-start'
            }}
          >
            {!message.isUser && (
              <div style={{ 
                width: '24px', 
                height: '24px', 
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Bot style={{ width: '12px', height: '12px', color: 'white' }} />
              </div>
            )}
            <div style={{
              backgroundColor: message.isUser ? 'rgba(0, 255, 255, 0.2)' : 'rgba(55, 65, 81, 0.5)',
              padding: '8px 12px',
              borderRadius: '12px',
              maxWidth: '80%',
              fontSize: '14px',
              color: 'white'
            }}>
              {message.text}
            </div>
            {message.isUser && (
              <div style={{ 
                width: '24px', 
                height: '24px', 
                background: 'linear-gradient(135deg, #00FFFF, #3b82f6)', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <UserIcon style={{ width: '12px', height: '12px', color: 'white' }} />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask me anything about your cloud..."
          style={{
            flex: 1,
            backgroundColor: 'rgba(55, 65, 81, 0.5)',
            border: '1px solid #4b5563',
            borderRadius: '12px',
            padding: '12px 16px',
            color: 'white',
            fontSize: '14px'
          }}
        />
        <button
          onClick={handleSend}
          style={{
            backgroundColor: 'rgba(0, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '12px',
            padding: '12px',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Send style={{ width: '16px', height: '16px' }} />
        </button>
      </div>
    </div>
  );
}

// Functional Admin Panel Component
function AdminPanel({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState([
    { id: 1, name: 'Admin User', email: 'admin@smash.cloud', role: 'admin', status: 'active' },
    { id: 2, name: 'John Doe', email: 'john@smash.cloud', role: 'user', status: 'active' },
    { id: 3, name: 'Jane Smith', email: 'jane@smash.cloud', role: 'user', status: 'inactive' },
    { id: 4, name: 'Guest User', email: 'guest@smash.cloud', role: 'guest', status: 'active' }
  ]);
  
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'user' });
  const [selectedUser, setSelectedUser] = useState(null);

  const handleAddUser = () => {
    if (newUser.name && newUser.email) {
      const user = {
        id: users.length + 1,
        ...newUser,
        status: 'active'
      };
      setUsers([...users, user]);
      setNewUser({ name: '', email: '', role: 'user' });
    }
  };

  const handleDeleteUser = (id) => {
    setUsers(users.filter(user => user.id !== id));
  };

  const toggleUserStatus = (id) => {
    setUsers(users.map(user => 
      user.id === id 
        ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' }
        : user
    ));
  };

  return (
    <div className="glass" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'white', margin: 0 }}>Admin Panel</h2>
        <button
          onClick={onClose}
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            color: '#ef4444',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Close
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flex: 1 }}>
        {/* User Management */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'white', marginBottom: '16px' }}>User Management</h3>
          
          {/* Add New User */}
          <div className="glass-hover" style={{ padding: '16px', marginBottom: '16px', borderRadius: '12px' }}>
            <h4 style={{ fontSize: '14px', color: '#d1d5db', marginBottom: '12px' }}>Add New User</h4>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                placeholder="Name"
                value={newUser.name}
                onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(55, 65, 81, 0.5)',
                  border: '1px solid #4b5563',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: 'white',
                  fontSize: '14px'
                }}
              />
              <input
                type="email"
                placeholder="Email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(55, 65, 81, 0.5)',
                  border: '1px solid #4b5563',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: 'white',
                  fontSize: '14px'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                style={{
                  backgroundColor: 'rgba(55, 65, 81, 0.5)',
                  border: '1px solid #4b5563',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: 'white',
                  fontSize: '14px'
                }}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="guest">Guest</option>
              </select>
              <button
                onClick={handleAddUser}
                style={{
                  backgroundColor: 'rgba(0, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Add User
              </button>
            </div>
          </div>

          {/* User List */}
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {users.map(user => (
              <div key={user.id} className="glass-hover" style={{ 
                padding: '12px', 
                marginBottom: '8px', 
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: 'white' }}>{user.name}</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>{user.email}</div>
                  <div style={{ fontSize: '11px', color: user.role === 'admin' ? '#ef4444' : user.role === 'user' ? '#3b82f6' : '#6b7280' }}>
                    {user.role.toUpperCase()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => toggleUserStatus(user.id)}
                    style={{
                      backgroundColor: user.status === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      color: user.status === 'active' ? '#22c55e' : '#ef4444',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    {user.status}
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Controls */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'white', marginBottom: '16px' }}>System Controls</h3>
          
          <div className="glass-hover" style={{ padding: '16px', marginBottom: '16px', borderRadius: '12px' }}>
            <h4 style={{ fontSize: '14px', color: '#d1d5db', marginBottom: '12px' }}>Server Management</h4>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button style={{
                backgroundColor: 'rgba(34, 197, 94, 0.2)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                color: '#22c55e',
                cursor: 'pointer',
                fontSize: '14px'
              }}>
                Restart Services
              </button>
              <button style={{
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                color: '#3b82f6',
                cursor: 'pointer',
                fontSize: '14px'
              }}>
                Run Backup
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{
                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                color: '#f59e0b',
                cursor: 'pointer',
                fontSize: '14px'
              }}>
                Update System
              </button>
              <button style={{
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                color: '#8b5cf6',
                cursor: 'pointer',
                fontSize: '14px'
              }}>
                Security Scan
              </button>
            </div>
          </div>

          <div className="glass-hover" style={{ padding: '16px', borderRadius: '12px' }}>
            <h4 style={{ fontSize: '14px', color: '#d1d5db', marginBottom: '12px' }}>System Status</h4>
            <div style={{ display: 'grid', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>Nextcloud</span>
                <span style={{ fontSize: '12px', color: '#22c55e' }}>● Online</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>Database</span>
                <span style={{ fontSize: '12px', color: '#22c55e' }}>● Online</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>Nginx</span>
                <span style={{ fontSize: '12px', color: '#22c55e' }}>● Online</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>SSL Certificate</span>
                <span style={{ fontSize: '12px', color: '#22c55e' }}>● Valid</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// File Manager Component
function FileManager() {
  const [files, setFiles] = useState([
    { id: 1, name: 'Documents', type: 'folder', size: '2.3 GB', modified: '2024-01-15' },
    { id: 2, name: 'Photos', type: 'folder', size: '5.7 GB', modified: '2024-01-14' },
    { id: 3, name: 'Videos', type: 'folder', size: '12.1 GB', modified: '2024-01-13' },
    { id: 4, name: 'project.pdf', type: 'file', size: '2.4 MB', modified: '2024-01-12' },
    { id: 5, name: 'presentation.pptx', type: 'file', size: '15.8 MB', modified: '2024-01-11' }
  ]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const newFile = {
        id: files.length + 1,
        name: file.name,
        type: 'file',
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        modified: new Date().toISOString().split('T')[0]
      };
      setFiles([...files, newFile]);
    }
  };

  return (
    <div className="glass" style={{ padding: '24px', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'white', margin: 0 }}>File Manager</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="file"
            id="file-upload"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <label
            htmlFor="file-upload"
            style={{
              backgroundColor: 'rgba(0, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Cloud style={{ width: '16px', height: '16px' }} />
            Upload File
          </label>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {files.map(file => (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-hover"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: 'rgba(0, 0, 0, 0.3)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '8px', 
                backgroundColor: file.type === 'folder' ? 'rgba(0, 255, 255, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {file.type === 'folder' ? (
                  <FolderOpen style={{ width: '16px', height: '16px', color: '#00FFFF' }} />
                ) : (
                  <HardDrive style={{ width: '16px', height: '16px', color: '#3b82f6' }} />
                )}
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '500', color: 'white' }}>{file.name}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>Modified: {file.modified}</div>
              </div>
            </div>
            <div style={{ fontSize: '14px', color: '#d1d5db' }}>{file.size}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [stats, setStats] = useState(generateRandomStats());
  const [currentView, setCurrentView] = useState('dashboard');
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(generateRandomStats());
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ display: 'flex', height: '100vh' }}>
        {/* Sidebar */}
        <div style={{ width: '72px', flexShrink: 0 }}>
          <Sidebar currentView={currentView} onViewChange={setCurrentView} />
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px' }}>
          <TopBar onShowAdmin={() => setShowAdminPanel(true)} />
          
          {showAdminPanel ? (
            <AdminPanel onClose={() => setShowAdminPanel(false)} />
          ) : currentView === 'files' ? (
            <FileManager />
          ) : (
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

            {/* System Status */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="glass card-hover"
              style={{ padding: '24px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  background: 'linear-gradient(135deg, #f59e0b, #ef4444)', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <Clock style={{ width: '16px', height: '16px', color: 'white' }} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'white', margin: 0 }}>System Status</h3>
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: '#9ca3af' }}>Current Time</span>
                  <span style={{ fontSize: '16px', fontWeight: '500', color: 'white' }}>{getCurrentTime()}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: '#9ca3af' }}>Date</span>
                  <span style={{ fontSize: '16px', fontWeight: '500', color: 'white' }}>{getCurrentDate()}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: '#9ca3af' }}>Uptime</span>
                  <span style={{ fontSize: '16px', fontWeight: '500', color: '#00FFFF' }}>99.9%</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: '#9ca3af' }}>Location</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{getWeatherData().icon}</span>
                    <span style={{ fontSize: '16px', fontWeight: '500', color: 'white' }}>{getWeatherData().city}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: '#9ca3af' }}>Weather</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Thermometer style={{ width: '16px', height: '16px', color: '#f59e0b' }} />
                    <span style={{ fontSize: '16px', fontWeight: '500', color: 'white' }}>{getWeatherData().temp}°F</span>
                    <span style={{ fontSize: '14px', color: '#9ca3af' }}>{getWeatherData().condition}</span>
                  </div>
                </div>
              </div>
            </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}