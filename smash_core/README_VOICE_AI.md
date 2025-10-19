# 🎤 SMASH Cloud Voice AI - Jarvis Style Assistant

A real-time voice-interactive AI assistant with Jarvis personality, adaptive learning, and full voice command capabilities for SMASH Cloud.

## ✨ Features

### 🎭 Jarvis Personality
- **Calm & Articulate**: Speaks like Jarvis from Iron Man
- **Addresses as "SIR"**: Always respects and addresses you properly
- **Futuristic Tone**: Maintains that distinct AI assistant personality
- **Adaptive Learning**: Learns from every conversation to improve responses

### 🎙️ Voice Capabilities
- **Real-time Speech-to-Text**: Listen and transcribe your voice commands
- **Text-to-Speech**: Responds with natural voice synthesis
- **Voice Activation**: Responds to "Hey SMASH" or "Jarvis" commands
- **Multiple TTS Options**: Local Piper or premium ElevenLabs voices

### 🧠 Adaptive Intelligence
- **Persistent Learning**: Database stores conversation patterns
- **Context Memory**: Remembers recent conversations (configurable size)
- **Pattern Recognition**: Learns from user interactions and preferences
- **Real-time Updates**: Improves responses based on usage patterns

### 🔧 Technical Features
- **FastAPI Backend**: High-performance async API
- **SQLite Database**: Stores conversations, learning data, and preferences
- **WebSocket Support**: Real-time voice streaming (future enhancement)
- **Docker Ready**: Full containerized deployment

## 🚀 Quick Start

### 1. Start the Voice AI System
```bash
# Run the startup script
./scripts/start-voice-ai.sh
```

### 2. Access the Interface
- **Dashboard**: http://localhost:5173
- **Voice AI API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### 3. Interact with Jarvis
- **Text Chat**: Use the AI Console in the dashboard
- **Voice Commands**: Say "Hey SMASH" or "Jarvis" to activate
- **Voice Button**: Click the microphone button in the AI Console

## 🎯 Voice Commands Examples

Try saying these to test the voice AI:

```
"Hey SMASH, what's the system status?"
"Jarvis, help me with file management"
"Hey SMASH, show me the server uptime"
"Jarvis, what can you do for me?"
```

## ⚙️ Configuration

### Environment Variables
```env
# API Keys (Optional)
OPENAI_API_KEY=your_openai_key
ELEVENLABS_API_KEY=your_elevenlabs_key

# Voice Settings
VOICE_MODE=jarvis
VOICE_ID=en_GB-sarah-high
JARVIS_STARTUP_LINE="System online. Hello Sudhamsh, SMASH Cloud is now active."

# Personality
ADDRESS_USER_AS=SIR
LEARNING_ENABLED=true
CONTEXT_MEMORY_SIZE=50
```

### Service URLs
- **Whisper (STT)**: http://localhost:9000
- **Piper (TTS)**: http://localhost:5002  
- **Ollama (LLM)**: http://localhost:11434

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React UI      │    │   FastAPI       │    │   AI Services   │
│                 │    │   Backend       │    │                 │
│ • VoiceMicBtn   │◄──►│ • Chat Routes   │◄──►│ • Whisper STT   │
│ • AiConsole     │    │ • Voice Routes  │    │ • Piper TTS     │
│ • Socket Conn   │    │ • WebSocket     │    │ • Ollama LLM    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       ▼
         │              ┌─────────────────┐
         └─────────────►│   Database      │
                        │                 │
                        │ • Conversations │
                        │ • Learning Data │
                        │ • User Prefs    │
                        └─────────────────┘
```

## 📁 Project Structure

```
smash_core/
├── app.py                 # FastAPI main application
├── core/
│   ├── config.py         # Configuration management
│   ├── database.py       # Database models & operations
│   ├── llm.py           # Jarvis LLM brain
│   ├── voice_processor.py # Voice processing core
│   └── greeting.py      # Startup greeting system
├── routes/
│   ├── chat.py          # Chat API endpoints
│   ├── voice.py         # Voice interaction endpoints
│   ├── audio.py         # STT/TTS processing
│   └── system.py        # System management
└── static/              # Generated audio files

smash_ui/src/components/
├── VoiceMicButton.tsx   # Voice interaction component
└── AiConsole.tsx       # Updated with voice integration
```

## 🎤 Voice Interaction Flow

1. **Voice Activation**: User says "Hey SMASH" or "Jarvis"
2. **Speech Recognition**: Audio → Whisper → Text transcript
3. **AI Processing**: Text → LLM (with Jarvis personality) → Response
4. **Speech Synthesis**: Response → TTS (Piper/ElevenLabs) → Audio
5. **Learning**: Conversation stored in database for future improvement

## 🔮 Advanced Features

### Adaptive Learning System
- **Pattern Recognition**: Identifies common user requests
- **Response Optimization**: Improves based on user feedback patterns
- **Context Awareness**: Remembers conversation history and preferences
- **Usage Analytics**: Tracks interaction patterns for system improvement

### Voice Commands
- **System Monitoring**: "Check system status", "Show CPU usage"
- **File Management**: "Help with files", "Upload assistance"
- **User Administration**: "User management", "Admin functions"
- **General Assistance**: "What can you do?", "Help me"

## 🛠️ Development

### Running in Development
```bash
# Backend
cd smash_core
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8000

# Frontend  
cd smash_ui
npm run dev
```

### Testing Voice Features
```bash
# Test API endpoints
curl -X POST http://localhost:8000/api/voice/activate
curl -X GET http://localhost:8000/api/system/status
```

## 🎯 Future Enhancements

- **WebSocket Streaming**: Real-time voice streaming
- **Custom Voice Models**: Train on your voice patterns
- **Advanced NLP**: Better context understanding
- **Multi-language Support**: Support for multiple languages
- **Voice Profiles**: Different personalities for different users

## 🔧 Troubleshooting

### Common Issues
1. **Microphone Access**: Ensure browser permissions for microphone
2. **Audio Services**: Check Docker containers are running
3. **API Keys**: Optional but improve TTS quality if configured
4. **Voice Activation**: Speak clearly and use activation phrases

### Logs
```bash
# Check service logs
docker logs $(docker ps -qf "name=smash-voice-api")
docker logs $(docker ps -qf "name=whisper")
docker logs $(docker ps -qf "name=piper")
```

---

**Ready to experience Jarvis-style AI assistance for your SMASH Cloud?** 

Just say **"Hey SMASH"** and your intelligent assistant will respond! 🎤✨
