// AI console component for chat and training
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Send, User as UserIcon, Volume2, VolumeX, BookOpen, Trash2, Settings } from 'lucide-react';
import VoiceMicButton from './VoiceMicButton';
import { smashBeta1AI, type AITrainingData } from '../lib/aiService';
import { realAI } from '../lib/realAI';
import { elevenLabsService } from '../lib/elevenLabsService';
import { getVoiceConfig, isElevenLabsConfigured } from '../lib/voiceConfig';

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
      text: "System online. Hello, SIR. I am SMASH Beta 1, your advanced AI assistant with real intelligence. I have access to web information, system analysis, and adaptive reasoning. How may I assist you today?", 
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [hasSpokenInitialGreeting, setHasSpokenInitialGreeting] = useState(() => {
    // Check if we've already spoken the initial greeting in this browser session
    // We'll use sessionStorage instead of localStorage so it resets when browser is closed
    return sessionStorage.getItem('smash_initial_greeting_spoken') === 'true';
  });
  
  // ElevenLabs integration state
  const [voiceConfig, setVoiceConfig] = useState(() => getVoiceConfig());
  const [useElevenLabs, setUseElevenLabs] = useState(() => isElevenLabsConfigured());
  const [isElevenLabsLoading, setIsElevenLabsLoading] = useState(false);
  // Initialize state based on prop
  const initialTrainingState = defaultView === 'training';
  const initialChatState = defaultView === 'chat';
  
  console.log('Setting initial state - training:', initialTrainingState, 'chat:', initialChatState);
  
  const [showTraining, setShowTraining] = useState(initialTrainingState);
  const [showChat, setShowChat] = useState(initialChatState);
  const [trainingData, setTrainingData] = useState<AITrainingData[]>([]);
  const [newTraining, setNewTraining] = useState({ question: '', answer: '', category: 'general' });

  // Load conversation history from REAL AI service
  useEffect(() => {
    const aiMessages = realAI.getMessages();
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

      // Enhanced priority for authentic Jarvis-style voices
      const jarvisVoiceNames = [
        'alex', 'daniel', 'tom', 'mark', 'david', 'john', 'mike', 'steve',
        'edward', 'richard', 'brian', 'chris', 'matt', 'james', 'paul',
        'thomas', 'michael', 'robert', 'william', 'harry', 'peter', 'benjamin',
        'nicholas', 'charles', 'anthony', 'patrick', 'george', 'kevin'
      ];
      
      console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
      
      let jarvisVoice = null;
      
      // First priority: find voices that sound like Jarvis (deeper, more sophisticated)
      jarvisVoice = voices.find(voice => {
        const name = voice.name.toLowerCase();
        return jarvisVoiceNames.some(jName => name.includes(jName)) && 
               voice.lang.startsWith('en') &&
               (name.includes('premium') || name.includes('enhanced') || name.includes('pro'));
      });
      
      // Second priority: specific jarvis names without premium but still good
      if (!jarvisVoice) {
        for (const voiceName of jarvisVoiceNames) {
          jarvisVoice = voices.find(voice => 
            voice.name.toLowerCase().includes(voiceName) && 
            voice.lang.startsWith('en') &&
            !voice.name.toLowerCase().includes('female') &&
            !voice.name.toLowerCase().includes('woman')
          );
          if (jarvisVoice) break;
        }
      }
      
      // Third priority: any male voice excluding obvious female names
      if (!jarvisVoice) {
        jarvisVoice = voices.find(voice => {
          const name = voice.name.toLowerCase();
          return voice.lang.startsWith('en') && 
                 !name.includes('samantha') && 
                 !name.includes('victoria') && 
                 !name.includes('sarah') && 
                 !name.includes('emma') && 
                 !name.includes('susan') && 
                 !name.includes('lisa') &&
                 !name.includes('mary') &&
                 !name.includes('jennifer') &&
                 !name.includes('karen') &&
                 !name.includes('amy') &&
                 !name.includes('anna') &&
                 !name.includes('female') &&
                 !name.includes('woman');
        });
      }
      
      // Fourth priority: Google voices (often better quality)
      if (!jarvisVoice) {
        jarvisVoice = voices.find(voice => 
          voice.lang.startsWith('en') && 
          voice.name.toLowerCase().includes('google') &&
          !voice.name.toLowerCase().includes('female')
        );
      }
      
      // Last resort: any English voice that's not explicitly female
      if (!jarvisVoice) {
        jarvisVoice = voices.find(voice => 
          voice.lang.startsWith('en') && 
          !voice.name.toLowerCase().includes('female') &&
          !voice.name.toLowerCase().includes('woman')
        );
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
      // Process with REAL AI service for intelligent responses
      const response = await realAI.processMessage(userMessage);
      
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

  // Enhanced function to speak AI responses using ElevenLabs (Jarvis voice) with fallback
  const speakResponse = async (text: string) => {
    if (!isVoiceEnabled || !text.trim()) return;
    
    setIsSpeaking(true);
    
    // Stop any current speech
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    
    try {
      // Try ElevenLabs first for authentic Jarvis voice
      if (useElevenLabs && elevenLabsService.isConfigured()) {
        console.log('🦾 Using ElevenLabs for authentic Jarvis voice...');
        setIsElevenLabsLoading(true);
        
        try {
          // Use Jarvis-optimized settings
          const jarvisSettings = voiceConfig.jarvisSettings;
          await elevenLabsService.speak(text, jarvisSettings);
          console.log('✅ ElevenLabs Jarvis voice completed successfully');
        } catch (elevenLabsError) {
          console.warn('⚠️ ElevenLabs failed, falling back to browser TTS:', elevenLabsError);
          
          // Fall back to browser TTS if ElevenLabs fails
          if (voiceConfig.fallbackTts) {
            await speakWithBrowserTTS(text);
          } else {
            throw elevenLabsError;
          }
        } finally {
          setIsElevenLabsLoading(false);
          setIsSpeaking(false);
        }
      } else {
        // Use browser TTS if ElevenLabs is not configured
        console.log('🔄 Using browser TTS (ElevenLabs not configured)');
        await speakWithBrowserTTS(text);
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error('❌ Speech synthesis error:', error);
      setIsSpeaking(false);
      setIsElevenLabsLoading(false);
    }
  };

  // Browser TTS fallback function with Jarvis-style settings
  const speakWithBrowserTTS = async (text: string): Promise<void> => {
    if (!('speechSynthesis' in window)) {
      throw new Error('Speech synthesis not supported');
    }

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
    
    // Authentic Jarvis-style voice settings for deep, sophisticated male voice
    utterance.rate = 0.65;  // Slower, more deliberate delivery
    utterance.pitch = 0.3;  // Much deeper pitch for authentic Jarvis sound
    utterance.volume = 0.95; // High volume for clear, authoritative speech
    
    // Use the pre-selected Jarvis voice or find a suitable male voice
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log('🎤 Using pre-selected voice:', selectedVoice.name);
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
        console.log('🎤 Using fallback voice:', fallbackVoice.name);
      } else {
        console.log('🎤 No suitable voice found, using system default');
      }
    }
    
    // Enhanced event handling
    utterance.onstart = () => {
      console.log('🗣️ SMASH is speaking:', utterance.voice?.name || 'default');
    };
    
    utterance.onend = () => {
      console.log('✅ SMASH finished speaking (browser TTS)');
      setIsSpeaking(false);
    };
    
    utterance.onerror = (event) => {
      console.error('❌ Browser TTS error:', event.error);
      setIsSpeaking(false);
    };
    
    return new Promise((resolve, reject) => {
      utterance.onend = () => {
        console.log('✅ Browser TTS completed');
        setIsSpeaking(false);
        resolve();
      };
      
      utterance.onerror = (event) => {
        console.error('❌ Browser TTS error:', event.error);
        setIsSpeaking(false);
        reject(event.error);
      };
      
      // Speak immediately
      speechSynthesis.speak(utterance);
    });
  };

  // Speak initial greeting only once when first opening the webpage
  useEffect(() => {
    // Only speak if:
    // 1. Voice is enabled
    // 2. We haven't spoken the greeting yet
    // 3. We have exactly one message (the initial greeting)
    // 4. That message contains the system online text
    if (isVoiceEnabled && 
        !hasSpokenInitialGreeting && 
        messages.length === 1 && 
        messages[0]?.text.includes('System online')) {
      
      console.log('Speaking initial greeting for the first time');
      // Test voice synthesis after a delay to ensure voices are loaded
      const timer = setTimeout(() => {
        speakResponse(messages[0].text);
        setHasSpokenInitialGreeting(true);
        sessionStorage.setItem('smash_initial_greeting_spoken', 'true');
      }, 3000); // Increased delay to ensure everything is ready
      
      return () => clearTimeout(timer);
    }
  }, [isVoiceEnabled, hasSpokenInitialGreeting, messages.length]); // Simplified dependencies

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
            {useElevenLabs && elevenLabsService.isConfigured() ? (
              <span style={{ fontSize: '10px', color: '#00ff00', marginLeft: '8px' }}>
                • 🦾 ElevenLabs Jarvis Voice
              </span>
            ) : selectedVoice ? (
              <span style={{ fontSize: '10px', color: 'var(--accent-primary)', marginLeft: '8px' }}>
                • {selectedVoice.name}
              </span>
            ) : (
              <span style={{ fontSize: '10px', color: '#ff8800', marginLeft: '8px' }}>
                • Browser TTS
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* ElevenLabs Status Indicator */}
            {useElevenLabs && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
                backgroundColor: elevenLabsService.isConfigured() ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 165, 0, 0.1)',
                border: `1px solid ${elevenLabsService.isConfigured() ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 165, 0, 0.3)'}`,
                fontSize: '10px',
                color: elevenLabsService.isConfigured() ? '#00aa00' : '#ff8800'
              }}>
                {elevenLabsService.isConfigured() ? '🦾 ElevenLabs' : '⚠️ Config'}
              </div>
            )}
            
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
              title={
                useElevenLabs && elevenLabsService.isConfigured() 
                  ? 'Voice enabled - Using ElevenLabs Jarvis voice' 
                  : isVoiceEnabled 
                    ? 'Voice enabled - Using browser TTS' 
                    : 'Voice disabled'
              }
            >
              {isVoiceEnabled && !isSpeaking && !isElevenLabsLoading ? (
                <Volume2 style={{ width: '18px', height: '18px' }} />
              ) : isSpeaking || isElevenLabsLoading ? (
                <Volume2 style={{ width: '18px', height: '18px', animation: 'pulse 1s infinite' }} />
              ) : (
                <VolumeX style={{ width: '18px', height: '18px' }} />
              )}
            </button>
          </div>
          
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