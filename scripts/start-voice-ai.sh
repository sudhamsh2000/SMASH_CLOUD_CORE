#!/bin/bash

# SMASH Cloud Voice AI Startup Script
echo "🚀 Starting SMASH Cloud Voice AI with Jarvis-style assistant..."

# Set environment variables
export OPENAI_API_KEY=${OPENAI_API_KEY:-""}
export ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY:-""}
export VOICE_ID=${VOICE_ID:-"en_GB-sarah-high"}
export JARVIS_STARTUP_LINE="System online. Hello Sudhamsh, SMASH Cloud is now active."

# Copy environment file if it doesn't exist
if [ ! -f smash_core/.env ]; then
    cp smash_core/env.example smash_core/.env
    echo "📝 Created .env file from template"
fi

# Start Docker services
echo "🐳 Starting Docker services..."
cd infra
docker-compose -f docker-compose-voice.yml up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to initialize..."
sleep 10

# Pull Ollama model if needed
echo "🧠 Setting up Ollama model..."
docker exec $(docker ps -qf "name=ollama") ollama pull llama3

# Test voice AI endpoint
echo "🔊 Testing voice AI endpoint..."
curl -f http://localhost:8000/ && echo "✅ Voice AI backend is running"

echo ""
echo "🎉 SMASH Cloud Voice AI is now running!"
echo "📱 UI Dashboard: http://localhost:5173"
echo "🤖 Voice AI API: http://localhost:8000"
echo ""
echo "🎤 Say 'Hey SMASH' to activate voice commands"
echo "💬 Or use the chat interface to interact with your Jarvis-style assistant"
echo ""
echo "📊 API Documentation: http://localhost:8000/docs"
