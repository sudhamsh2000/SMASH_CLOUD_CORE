import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User } from "lucide-react";
import { ChatMessage, getRandomResponse } from "../lib/mock";

export default function AiConsole() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      text: "Hello! I'm your SMASH Cloud AI assistant. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: input,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response delay
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: getRandomResponse(),
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1000 + Math.random() * 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
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
