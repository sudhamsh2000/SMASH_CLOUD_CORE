import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, Loader } from 'lucide-react';

interface VoiceMicButtonProps {
  onTranscript?: (text: string) => void;
  onResponse?: (response: string) => void;
  onError?: (error: string) => void;
  isActive?: boolean;
  disabled?: boolean;
}

export default function VoiceMicButton({ 
  onTranscript, 
  onResponse, 
  onError,
  isActive = false,
  disabled = false 
}: VoiceMicButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onTranscript?.(transcript);
        handleVoiceCommand(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        onError?.(`Speech recognition error: ${event.error}`);
        setIsListening(false);
        setIsProcessing(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [onTranscript, onError]);

  const startListening = async () => {
    if (disabled || isConnecting) return;

    setIsConnecting(true);
    
    try {
      if (recognitionRef.current) {
        // Use browser speech recognition
        recognitionRef.current.start();
        setIsListening(true);
        setIsConnecting(false);
      } else {
        // Fallback to custom audio recording
        await startCustomRecording();
        setIsConnecting(false);
      }
    } catch (error) {
      onError?.('Failed to start voice recognition');
      setIsConnecting(false);
      setIsListening(false);
    }
  };

  const startCustomRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await processAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsListening(true);
    } catch (error) {
      onError?.('Microphone access denied');
    }
  };

  const stopListening = () => {
    setIsListening(false);
    setIsProcessing(true);
    
    if (recognitionRef.current && recognitionRef.current.state === 'started') {
      recognitionRef.current.stop();
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const processAudioBlob = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.wav');

      const response = await fetch('/api/voice/listen', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          onTranscript?.(result.transcript || 'Voice command processed');
          onResponse?.(result.response);
          
          // Play audio response if available
          if (result.audio_url) {
            playAudioResponse(result.audio_url);
          }
        } else {
          onError?.('Could not process voice input');
        }
      } else {
        onError?.('Voice processing failed');
      }
    } catch (error) {
      onError?.('Network error during voice processing');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceCommand = async (transcript: string) => {
    setIsProcessing(true);
    
    try {
      // Check for voice activation phrase
      const lowerTranscript = transcript.toLowerCase();
      if (!lowerTranscript.includes('hey smash') && !lowerTranscript.includes('jarvis')) {
        // Not a voice activation, ignore
        setIsProcessing(false);
        return;
      }

      // Send to chat API for processing
      const response = await fetch('/api/chat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: transcript,
          user_id: 'sudhamsh'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        onResponse?.(result.response);
        
        // Generate and play speech response
        try {
          const ttsResponse = await fetch('/api/voice/speak', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: result.response }),
          });

          if (ttsResponse.ok) {
            const ttsResult = await ttsResponse.json();
            if (ttsResult.success && ttsResult.audio_url) {
              playAudioResponse(ttsResult.audio_url);
            }
          }
        } catch (ttsError) {
          console.warn('TTS error:', ttsError);
        }
      } else {
        onError?.('Failed to process voice command');
      }
    } catch (error) {
      onError?.('Error processing voice command');
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudioResponse = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.play().catch(error => {
      console.warn('Audio playback failed:', error);
    });
  };

  const getButtonState = () => {
    if (isConnecting) return 'connecting';
    if (isProcessing) return 'processing';
    if (isListening) return 'listening';
    return 'idle';
  };

  const buttonState = getButtonState();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <motion.button
        onClick={isListening ? stopListening : startListening}
        disabled={disabled || isConnecting || isProcessing}
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          position: 'relative',
          transition: 'all 0.3s ease'
        }}
        animate={{
          scale: isListening ? [1, 1.1, 1] : 1,
          backgroundColor: buttonState === 'listening' ? 'var(--accent-primary)' : 
                          buttonState === 'processing' ? '#f59e0b' :
                          buttonState === 'connecting' ? '#6b7280' : 'var(--accent-bg)',
          boxShadow: isListening ? '0 0 20px var(--accent-glow)' : '0 4px 12px rgba(0,0,0,0.15)'
        }}
        transition={{
          scale: { duration: 0.5, repeat: isListening ? Infinity : 0 },
          backgroundColor: { duration: 0.3 },
          boxShadow: { duration: 0.3 }
        }}
      >
        <AnimatePresence mode="wait">
          {buttonState === 'connecting' && (
            <motion.div
              key="connecting"
              initial={{ opacity: 0, rotate: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader style={{ width: '24px', height: '24px', color: 'white' }} />
            </motion.div>
          )}
          
          {buttonState === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Volume2 style={{ width: '24px', height: '24px', color: 'white' }} />
            </motion.div>
          )}
          
          {(buttonState === 'listening' || buttonState === 'idle') && (
            <motion.div
              key="mic"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {isListening ? (
                <MicOff style={{ width: '24px', height: '24px', color: 'white' }} />
              ) : (
                <Mic style={{ width: '24px', height: '24px', color: 'white' }} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          minHeight: '16px'
        }}
      >
        {buttonState === 'idle' && 'Say "Hey SMASH"'}
        {buttonState === 'connecting' && 'Connecting...'}
        {buttonState === 'listening' && 'Listening...'}
        {buttonState === 'processing' && 'Processing...'}
      </motion.div>

      {isListening && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.7, 0.3, 0.7]
          }}
          exit={{ scale: 0, opacity: 0 }}
          style={{
            position: 'absolute',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            border: '2px solid var(--accent-primary)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none'
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
    </div>
  );
}
