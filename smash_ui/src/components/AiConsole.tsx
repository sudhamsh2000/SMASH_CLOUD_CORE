import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Send, User as UserIcon } from 'lucide-react';

export default function AiConsole() {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm SMASH Beta 1, your AI assistant. How can I help you today?", isUser: false }
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
        "I'm SMASH Beta 1, your advanced AI assistant! I can help you with cloud management, file operations, and system monitoring.",
        "Your SMASH Cloud is running optimally! All systems are green and ready for use.",
        "I'm constantly learning from our conversations to better assist you with your cloud needs.",
        "Welcome to your fresh SMASH Cloud installation. Everything looks great!",
        "I can help you manage files, monitor system performance, and configure your cloud settings.",
        "Your server uptime is excellent at 99.9%. Keep up the great maintenance!",
        "I notice your CPU usage is normal. Everything looks good from here.",
        "Your cloud security is up to date. No vulnerabilities detected.",
        "Your storage is at 12% usage - perfect for a fresh installation!",
        "I've optimized your cloud performance. You should see improved speeds."
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
    <div className="glass" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          backgroundColor: 'var(--accent-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Bot style={{ width: '20px', height: '20px', color: 'var(--accent-primary)' }} />
        </div>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
            SMASH Beta 1
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            AI Assistant • Advanced Training Enabled
          </p>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px', paddingRight: '8px' }}>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              marginBottom: '16px',
              flexDirection: message.isUser ? 'row-reverse' : 'row'
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: message.isUser ? 'rgba(59, 130, 246, 0.2)' : 'var(--accent-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {message.isUser ? (
                <UserIcon style={{ width: '16px', height: '16px', color: '#3b82f6' }} />
              ) : (
                <Bot style={{ width: '16px', height: '16px', color: 'var(--accent-primary)' }} />
              )}
            </div>
            
            <div style={{
              backgroundColor: message.isUser ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-glass-hover)',
              borderRadius: '12px',
              padding: '12px 16px',
              maxWidth: '80%',
              wordWrap: 'break-word',
              border: '1px solid var(--border-primary)'
            }}>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                {message.text}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Input Area */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask SMASH Beta 1 anything..."
          style={{
            flex: 1,
            backgroundColor: 'var(--input-bg)',
            border: '1px solid var(--input-border)',
            borderRadius: '12px',
            padding: '12px 16px',
            color: 'var(--text-primary)',
            fontSize: '14px'
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          style={{
            backgroundColor: input.trim() ? 'var(--accent-primary)' : 'var(--input-bg)',
            border: input.trim() ? 'none' : '1px solid var(--input-border)',
            borderRadius: '12px',
            padding: '12px',
            color: input.trim() ? 'white' : 'var(--text-muted)',
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease'
          }}
        >
          <Send style={{ width: '16px', height: '16px' }} />
        </button>
      </div>
    </div>
  );
}