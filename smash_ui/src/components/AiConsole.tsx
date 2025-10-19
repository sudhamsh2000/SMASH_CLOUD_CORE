import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Send, User as UserIcon, Volume2, VolumeX, BookOpen, Trash2 } from 'lucide-react';
import VoiceMicButton from './VoiceMicButton';
import { smashBeta1AI, type AITrainingData } from '../lib/aiService';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp?: Date;
}

interface AiConsoleProps {
  defaultView?: 'training' | 'chat';
}

export default function AiConsole(props: AiConsoleProps = {}) {
  const { defaultView = 'training' } = props;
  
  // Debug log to verify prop is received correctly
  console.log('AiConsole defaultView:', defaultView);
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 1, 
      text: "System online. Hello, SIR. SMASH Cloud is now active and ready to assist you.", 
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  // Initialize state based on prop
  const initialTrainingState = defaultView === 'training';
  const initialChatState = defaultView === 'chat';
  
  console.log('Setting initial state - training:', initialTrainingState, 'chat:', initialChatState);
  
  const [showTraining, setShowTraining] = useState(initialTrainingState);
  const [showChat, setShowChat] = useState(initialChatState);
  const [trainingData, setTrainingData] = useState<AITrainingData[]>([]);
  const [newTraining, setNewTraining] = useState({ question: '', answer: '', category: 'general' });

  // Load conversation history from AI service
  useEffect(() => {
    const aiMessages = smashBeta1AI.getMessages();
    if (aiMessages.length > 1) { // More than just system message
      const formattedMessages = aiMessages
        .filter(msg => msg.role !== 'system')
        .map((msg, index) => ({
          id: index + 1,
          text: msg.content,
          isUser: msg.role === 'user',
          timestamp: msg.timestamp
        }));
      setMessages(formattedMessages);
    }
  }, []);

  // Update view state when prop changes
  useEffect(() => {
    setShowTraining(defaultView === 'training');
    setShowChat(defaultView === 'chat');
  }, [defaultView]);

  // Initialize the best Jarvis voice when component mounts
  useEffect(() => {
    const initializeJarvisVoice = () => {
      if (!('speechSynthesis' in window)) return;
      
      const voices = speechSynthesis.getVoices();
      if (voices.length === 0) {
        // Voices not loaded yet, wait for them
        speechSynthesis.addEventListener('voiceschanged', initializeJarvisVoice, { once: true });
        return;
      }

      // Priority order for Jarvis-style male voices
      const jarvisVoiceNames = [
        'alex', 'daniel', 'tom', 'mark', 'david', 'john', 'mike', 'steve',
        'edward', 'richard', 'brian', 'chris', 'matt', 'james', 'paul',
        'thomas', 'michael', 'robert', 'william', 'harry'
      ];
      
      let jarvisVoice = null;
      
      // First, try to find specific male Jarvis voices
      for (const voiceName of jarvisVoiceNames) {
        jarvisVoice = voices.find(voice => 
          voice.name.toLowerCase().includes(voiceName) && 
          voice.lang.startsWith('en')
        );
        if (jarvisVoice) break;
      }
      
      // If no specific male voice found, try to find any male-sounding voice
      if (!jarvisVoice) {
        jarvisVoice = voices.find(voice => {
          const name = voice.name.toLowerCase();
          // Exclude female names
          const isNotFemale = !name.includes('samantha') && 
                            !name.includes('victoria') && 
                            !name.includes('sarah') && 
                            !name.includes('emma') && 
                            !name.includes('susan') && 
                            !name.includes('lisa') &&
                            !name.includes('mary') &&
                            !name.includes('jennifer') &&
                            !name.includes('karen') &&
                            !name.includes('amy') &&
                            !name.includes('anna');
          
          return voice.lang.startsWith('en') && isNotFemale;
        });
      }
      
      // Last resort: find any English voice
      if (!jarvisVoice) {
        jarvisVoice = voices.find(voice => 
          voice.lang.startsWith('en') && voice.name.toLowerCase().includes('google')
        ) || voices.find(voice => voice.lang.startsWith('en'));
      }
      
      if (jarvisVoice) {
        setSelectedVoice(jarvisVoice);
        console.log('Jarvis voice initialized:', jarvisVoice.name);
      } else {
        console.log('No suitable Jarvis voice found');
      }
    };

    initializeJarvisVoice();
  }, []);

  // Load training data
  useEffect(() => {
    setTrainingData(smashBeta1AI.getTrainingData());
  }, []);

  // Training functions
  const refreshTrainingData = () => {
    setTrainingData(smashBeta1AI.getTrainingData());
  };

  const addTrainingExample = () => {
    if (newTraining.question.trim() && newTraining.answer.trim()) {
      smashBeta1AI.addTrainingData(newTraining.question, newTraining.answer, newTraining.category);
      setNewTraining({ question: '', answer: '', category: 'general' });
      setShowAddTraining(false);
      refreshTrainingData();
    }
  };

  const deleteTrainingExample = (id: string) => {
    if (confirm('Delete this training example?')) {
      smashBeta1AI.deleteTrainingData(id);
      refreshTrainingData();
    }
  };

  const getTrainingStats = () => {
    return smashBeta1AI.getTrainingStats();
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setInput("");
    setIsProcessing(true);

    // Add user message immediately
    const userMsg: Message = { 
      id: Date.now(), 
      text: userMessage, 
      isUser: true,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      // Process with real AI service
      const response = await smashBeta1AI.processMessage(userMessage);
      
      // Add AI response
      const aiResponse: Message = {
        id: Date.now() + 1,
        text: response,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
      
      // Speak the AI response
      await speakResponse(response);
      
      // Refresh training data in case AI learned something new
      refreshTrainingData();

    } catch (error) {
      console.error('AI processing error:', error);
      const errorResponse: Message = {
        id: Date.now() + 1,
        text: "I apologize, SIR. There seems to be a technical difficulty. Please try again.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceTranscript = (text: string) => {
    setInput(text);
  };

  const handleVoiceResponse = async (response: string) => {
    const voiceResponse: Message = {
      id: Date.now(),
      text: response,
      isUser: false,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, voiceResponse]);
    
    // Also speak the voice response if voice is enabled
    await speakResponse(response);
  };

  const handleVoiceError = (error: string) => {
    console.error('Voice error:', error);
    // Could show a toast notification here
  };

  // Function to speak AI responses
  const speakResponse = async (text: string) => {
    if (!isVoiceEnabled || !text.trim()) return;
    
    setIsSpeaking(true);
    
    // Stop any current speech
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    
    try {
      // Use browser's built-in speech synthesis with better error handling
      if ('speechSynthesis' in window) {
        // Wait for voices to load
        const waitForVoices = () => {
          return new Promise<void>((resolve) => {
            const voices = speechSynthesis.getVoices();
            if (voices.length > 0) {
              resolve();
            } else {
              speechSynthesis.addEventListener('voiceschanged', () => resolve(), { once: true });
              // Fallback timeout
              setTimeout(() => resolve(), 100);
            }
          });
        };
        
        await waitForVoices();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Enhanced Jarvis-style voice settings for MALE voice
        utterance.rate = 0.7;  // Slower, more deliberate delivery like Jarvis
        utterance.pitch = 0.5; // Much lower pitch for deep masculine voice (0.0 to 2.0, where 1.0 is normal)
        utterance.volume = 0.9; // High volume for clear speech
        
        // Use the pre-selected Jarvis voice
        if (selectedVoice) {
          utterance.voice = selectedVoice;
          console.log('Using pre-selected Jarvis voice:', selectedVoice.name);
        } else {
          // Fallback: find a male voice on the fly
          const voices = speechSynthesis.getVoices();
          const jarvisVoiceNames = [
            'alex', 'daniel', 'tom', 'mark', 'david', 'john', 'mike', 'steve',
            'edward', 'richard', 'brian', 'chris', 'matt', 'james', 'paul'
          ];
          
          let fallbackVoice = voices.find(voice => {
            const name = voice.name.toLowerCase();
            return jarvisVoiceNames.some(jName => name.includes(jName)) && voice.lang.startsWith('en');
          });
          
          if (!fallbackVoice) {
            // Try to avoid female voices
            fallbackVoice = voices.find(voice => {
              const name = voice.name.toLowerCase();
              const isNotFemale = !name.includes('samantha') && 
                                !name.includes('victoria') && 
                                !name.includes('sarah') && 
                                !name.includes('emma') &&
                                !name.includes('lisa') &&
                                !name.includes('jennifer') &&
                                !name.includes('karen');
              return voice.lang.startsWith('en') && isNotFemale;
            });
          }
          
          if (fallbackVoice) {
            utterance.voice = fallbackVoice;
            console.log('Using fallback voice:', fallbackVoice.name);
          } else {
            console.log('No suitable voice found, using system default');
          }
        }
        
        // Enhanced event handling
        utterance.onstart = () => {
          console.log('SMASH is speaking with voice:', utterance.voice?.name || 'default', '- Text:', text);
        };
        
        utterance.onend = () => {
          setIsSpeaking(false);
          console.log('SMASH finished speaking');
        };
        
        utterance.onerror = (event) => {
          console.error('Speech error:', event.error);
          setIsSpeaking(false);
        };
        
        // Speak immediately
        speechSynthesis.speak(utterance);
        
      } else {
        // Fallback to API-based TTS if speechSynthesis not available
        console.log('Using API fallback for TTS');
        const response = await fetch('/api/voice/speak', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: text }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.audio_url) {
            const audio = new Audio(result.audio_url);
            audio.onended = () => setIsSpeaking(false);
            audio.onerror = () => setIsSpeaking(false);
            await audio.play();
          }
        } else {
          setIsSpeaking(false);
        }
      }
    } catch (error) {
      console.error('Speech synthesis error:', error);
      setIsSpeaking(false);
    }
  };

  // Test voice on component mount - after speakResponse is defined
  useEffect(() => {
    if (isVoiceEnabled && messages.length === 1 && messages[0].text.includes('System online')) {
      // Test voice synthesis after a short delay to ensure voices are loaded
      const timer = setTimeout(() => {
        speakResponse(messages[0].text);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isVoiceEnabled, messages.length]);

  return (
    <div className="glass" style={{ 
      padding: '24px', 
      height: '100%', 
      maxHeight: showTraining ? '800px' : '600px', // Larger max height for training mode
      minHeight: showTraining ? '600px' : '400px', // Larger minimum height for training mode
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden' // Prevent container from expanding
    }}>
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
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
            SMASH Beta 1
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            {showTraining ? 'AI Training Center' : 'AI Assistant'} • Voice Enabled • Advanced Learning
            {selectedVoice && (
              <span style={{ fontSize: '10px', color: 'var(--accent-primary)', marginLeft: '8px' }}>
                • {selectedVoice.name}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Mode Toggle Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '8px' }}>
            <button
              onClick={() => {
                setShowTraining(true);
                setShowChat(false);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: showTraining ? 'var(--accent-primary)' : 'var(--input-bg)',
                color: showTraining ? 'white' : 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              Training
            </button>
            <button
              onClick={() => {
                setShowTraining(false);
                setShowChat(true);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: showChat ? 'var(--accent-primary)' : 'var(--input-bg)',
                color: showChat ? 'white' : 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              Chat
            </button>
          </div>
          
          {/* Voice Controls */}
          <button
            onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: isVoiceEnabled ? 'var(--accent-bg)' : 'var(--input-bg)',
              color: isVoiceEnabled ? 'var(--accent-primary)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            title={isVoiceEnabled ? 'Voice enabled' : 'Voice disabled'}
          >
            {isVoiceEnabled && !isSpeaking ? (
              <Volume2 style={{ width: '18px', height: '18px' }} />
            ) : isSpeaking ? (
              <Volume2 style={{ width: '18px', height: '18px', animation: 'pulse 1s infinite' }} />
            ) : (
              <VolumeX style={{ width: '18px', height: '18px' }} />
            )}
          </button>
          
          <VoiceMicButton 
            onTranscript={handleVoiceTranscript}
            onResponse={handleVoiceResponse}
            onError={handleVoiceError}
            disabled={isProcessing}
          />
        </div>
      </div>

      {/* Chat Mode - Messages */}
      {showChat && (
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          overflowX: 'hidden',
          marginBottom: '16px', 
          paddingRight: '8px',
          maxHeight: '400px', // Fixed max height for messages
          minHeight: '200px'  // Minimum height
        }}>
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
              border: '1px solid var(--border-primary)',
              position: 'relative'
            }}>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                {message.text}
              </p>
              
              {/* Replay button for AI messages */}
              {!message.isUser && isVoiceEnabled && (
                <button
                  onClick={() => speakResponse(message.text)}
                  disabled={isSpeaking}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: 'var(--accent-bg)',
                    color: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isSpeaking ? 'not-allowed' : 'pointer',
                    opacity: isSpeaking ? 0.5 : 1,
                    transition: 'all 0.3s ease'
                  }}
                  title="Replay message"
                >
                  <Volume2 style={{ width: '12px', height: '12px' }} />
                </button>
              )}
            </div>
          </motion.div>
        ))}
        </div>
      )}

      {/* Chat Mode - Input Area */}
      {showChat && (
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          flexShrink: 0, // Prevent input area from shrinking
          marginTop: 'auto' // Push to bottom
        }}>
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
            fontSize: '14px',
            maxHeight: '48px', // Fixed height
            resize: 'none', // Prevent textarea-like behavior
            overflow: 'hidden'
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isProcessing}
          style={{
            backgroundColor: input.trim() && !isProcessing ? 'var(--accent-primary)' : 'var(--input-bg)',
            border: input.trim() && !isProcessing ? 'none' : '1px solid var(--input-border)',
            borderRadius: '12px',
            padding: '12px',
            color: input.trim() && !isProcessing ? 'white' : 'var(--text-muted)',
            cursor: input.trim() && !isProcessing ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease'
          }}
        >
          <Send style={{ width: '16px', height: '16px' }} />
        </button>
        </div>
      )}

      {/* Training Interface */}
      {showTraining && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          style={{
            flex: 1,
            marginTop: showChat ? '16px' : '0',
            padding: '24px',
            backgroundColor: 'var(--glass-bg)',
            borderRadius: '16px',
            border: '2px solid var(--accent-primary)',
            boxShadow: '0 8px 32px rgba(0, 255, 255, 0.1)',
            overflowY: 'auto',
            maxHeight: showChat ? '400px' : 'none',
            minHeight: showChat ? 'auto' : '600px'
          }}
        >
          <h4 style={{ 
            color: 'var(--accent-primary)', 
            marginBottom: '20px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            fontSize: '24px',
            fontWeight: '700',
            padding: '16px',
            backgroundColor: 'var(--accent-bg)',
            borderRadius: '12px',
            border: '1px solid var(--accent-primary)'
          }}>
            <BookOpen style={{ width: '28px', height: '28px', color: 'var(--accent-primary)' }} /> 
            🚀 AI Training & Learning Center
          </h4>

          {/* Training Stats */}
          <div style={{ 
            marginBottom: '20px', 
            padding: '15px', 
            backgroundColor: 'var(--input-bg)', 
            borderRadius: '12px', 
            border: '1px solid var(--input-border)' 
          }}>
            <h5 style={{ color: 'var(--text-primary)', margin: '0 0 10px 0' }}>Training Statistics</h5>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <span>Total Examples: <span style={{ color: 'var(--accent-primary)' }}>{getTrainingStats().totalTrainingItems}</span></span>
              <span>Categories: <span style={{ color: 'var(--accent-primary)' }}>{getTrainingStats().categories}</span></span>
              <span>Avg. Confidence: <span style={{ color: 'var(--accent-primary)' }}>{(getTrainingStats().averageConfidence * 100).toFixed(1)}%</span></span>
              <span>Total Usage: <span style={{ color: 'var(--accent-primary)' }}>{getTrainingStats().totalUsage}</span></span>
            </div>
          </div>

          {/* Training Form - Always Visible in Training Mode */}
          <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                marginBottom: '20px',
                padding: '20px',
                backgroundColor: 'var(--input-bg)',
                borderRadius: '12px',
                border: '1px solid var(--input-border)'
              }}
            >
              <h5 style={{ 
                color: 'var(--accent-primary)', 
                margin: '0 0 15px 0', 
                fontSize: '20px', 
                fontWeight: '700',
                textAlign: 'center',
                padding: '12px',
                backgroundColor: 'var(--accent-bg)',
                borderRadius: '12px',
                border: '2px solid var(--accent-primary)'
              }}>
                🎓 Feed Knowledge to SMASH Beta 1
              </h5>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 20px 0' }}>
                Teach the AI by providing question-answer pairs. The more you train, the smarter SMASH becomes!
              </p>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
                  💭 Question or Topic:
                </label>
                <textarea
                  value={newTraining.question}
                  onChange={(e) => setNewTraining({ ...newTraining, question: e.target.value })}
                  placeholder="What would you like to teach SMASH? (e.g., How do I upload files? What is cloud storage? How to backup data?)"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--input-border)',
                    backgroundColor: 'var(--background-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    minHeight: '60px',
                    resize: 'vertical'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
                  🤖 Answer or Information:
                </label>
                <textarea
                  value={newTraining.answer}
                  onChange={(e) => setNewTraining({ ...newTraining, answer: e.target.value })}
                  placeholder="Provide the complete answer or information that SMASH should learn. Be detailed and helpful so it can assist users effectively."
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--input-border)',
                    backgroundColor: 'var(--background-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    minHeight: '100px',
                    resize: 'vertical'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
                  📚 Category:
                </label>
                <select
                  value={newTraining.category}
                  onChange={(e) => setNewTraining({ ...newTraining, category: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--input-border)',
                    backgroundColor: 'var(--background-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                >
                  <option value="general">General</option>
                  <option value="file-management">File Management</option>
                  <option value="admin">Admin</option>
                  <option value="system-monitoring">System Monitoring</option>
                  <option value="ai-training">AI Training</option>
                  <option value="voice-control">Voice Control</option>
                </select>
              </div>
              
              <button
                onClick={addTrainingExample}
                disabled={!newTraining.question.trim() || !newTraining.answer.trim()}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: (!newTraining.question.trim() || !newTraining.answer.trim()) ? 'var(--input-bg)' : 'var(--accent-primary)',
                  color: (!newTraining.question.trim() || !newTraining.answer.trim()) ? 'var(--text-muted)' : 'white',
                  border: 'none',
                  cursor: (!newTraining.question.trim() || !newTraining.answer.trim()) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  fontSize: '16px',
                  fontWeight: '600',
                  boxShadow: (!newTraining.question.trim() || !newTraining.answer.trim()) ? 'none' : '0 4px 12px rgba(0, 255, 255, 0.3)'
                }}
              >
                🚀 Train SMASH Beta 1
              </button>
            </motion.div>

          {/* Training Data List */}
          <div>
            <h5 style={{ 
              color: 'var(--text-primary)', 
              marginBottom: '15px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px' 
            }}>
              <BookOpen style={{ width: '16px', height: '16px', color: 'var(--text-secondary)' }} /> 
              Existing Training Data ({trainingData.length})
            </h5>
            
            <div style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '8px' }}>
              {trainingData.length === 0 ? (
                <p style={{ 
                  color: 'var(--text-muted)', 
                  textAlign: 'center', 
                  fontStyle: 'italic',
                  padding: '20px'
                }}>
                  No training data yet. Add some examples to help SMASH Beta 1 learn!
                </p>
              ) : (
                trainingData.map((data) => (
                  <motion.div
                    key={data.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      marginBottom: '12px',
                      padding: '15px',
                      backgroundColor: 'var(--background-secondary)',
                      borderRadius: '12px',
                      border: '1px solid var(--input-border)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  >
                    <p style={{ 
                      color: 'var(--text-primary)', 
                      fontWeight: '600', 
                      margin: '0 0 8px 0',
                      fontSize: '14px'
                    }}>
                      Q: {data.question}
                    </p>
                    <p style={{ 
                      color: 'var(--text-secondary)', 
                      margin: '0 0 10px 0',
                      fontSize: '13px',
                      lineHeight: '1.4'
                    }}>
                      A: {data.answer}
                    </p>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      fontSize: '11px', 
                      color: 'var(--text-muted)' 
                    }}>
                      <span>
                        Category: {data.category} | 
                        Confidence: {(data.confidence * 100).toFixed(0)}% | 
                        Used: {data.usageCount} times
                      </span>
                      <button
                        onClick={() => deleteTrainingExample(data.id)}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: '#ef4444', 
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                          transition: 'all 0.2s ease'
                        }}
                        title="Delete this training example"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <Trash2 style={{ width: '14px', height: '14px' }} />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}