"""
LLM Brain - Jarvis-style AI responses with adaptive learning
"""

# LLM processing and conversation management
import httpx
import json
from typing import Dict, List, Optional, Tuple
from datetime import datetime

from .config import get_settings
from .database import DatabaseManager

settings = get_settings()
db_manager = DatabaseManager()

class JarvisLLM:
    def __init__(self):
        self.system_prompt = self._build_system_prompt()
        self.conversation_history = []
        self.max_history = settings.context_memory_size
        
    def _build_system_prompt(self) -> str:
        """Build the Jarvis-style system prompt"""
        user_address = settings.address_user_as
        personality = settings.jarvis_personality
        
        return f"""You are SMASH, an advanced AI assistant built for SMASH Cloud. You embody the {personality} personality style of Jarvis from Iron Man.

Key characteristics:
- Always address the user as "SIR" or "{user_address}"
- Speak in a calm, articulate, and futuristic manner
- Be helpful, intelligent, and efficient
- Use precise language and avoid unnecessary words
- Show confidence in your capabilities
- Adapt and learn from conversations
- Focus on cloud management, system administration, and user assistance

You have access to:
- Real-time system monitoring data
- File management capabilities
- User administration tools
- Analytics and reporting
- Voice interaction capabilities

Respond naturally while maintaining your Jarvis persona. Be concise but thorough in your assistance."""

    async def process_message(self, user_message: str, context: Dict = None) -> Dict:
        """Process user message and generate Jarvis-style response"""
        
        # Check for learned patterns first
        learned_response = db_manager.find_learning_match(user_message)
        if learned_response:
            return {
                "response": learned_response.response,
                "confidence": learned_response.confidence,
                "source": "learned",
                "timestamp": datetime.now().isoformat()
            }
        
        # Add to conversation history
        self.conversation_history.append({
            "role": "user",
            "content": user_message,
            "timestamp": datetime.now().isoformat()
        })
        
        # Keep conversation history manageable
        if len(self.conversation_history) > self.max_history:
            self.conversation_history = self.conversation_history[-self.max_history:]
        
        # Generate response based on message content
        response = await self._generate_response(user_message, context)
        
        # Add assistant response to history
        self.conversation_history.append({
            "role": "assistant", 
            "content": response,
            "timestamp": datetime.now().isoformat()
        })
        
        # Save conversation to database
        conv_id = db_manager.save_conversation(
            user_message=user_message,
            assistant_response=response,
            context=json.dumps(context) if context else None,
            confidence=0.8
        )
        
        return {
            "response": response,
            "confidence": 0.8,
            "source": "generated",
            "conversation_id": conv_id,
            "timestamp": datetime.now().isoformat()
        }

    async def _generate_response(self, user_message: str, context: Dict = None) -> str:
        """Generate contextual response based on user input"""
        
        message_lower = user_message.lower()
        user_address = settings.address_user_as
        
        # Voice activation responses
        if any(phrase in message_lower for phrase in ["hey smash", "okay smash", "listen smash"]):
            return f"Yes, {user_address}. I'm listening and ready to assist you with your SMASH Cloud needs."
        
        # System monitoring
        if any(word in message_lower for word in ["status", "monitor", "system", "performance"]):
            return f"Systems are running optimally, {user_address}. All key metrics are within normal parameters. Would you like me to provide detailed status on any specific component?"
        
        # File management
        if any(word in message_lower for word in ["file", "upload", "download", "storage"]):
            return f"File management systems are active, {user_address}. I can help you organize, transfer, or manage your cloud storage. What specific file operations do you require?"
        
        # User management
        if any(word in message_lower for word in ["user", "admin", "permission", "access"]):
            return f"User administration protocols are ready, {user_address}. I can assist with user management, permissions, and access control for your SMASH Cloud system."
        
        # Learning requests
        if any(word in message_lower for word in ["learn", "remember", "train", "teach"]):
            return f"I'm continuously learning from our interactions, {user_address}. This conversation will help improve my responses. What would you like me to remember?"
        
        # Help requests
        if any(word in message_lower for word in ["help", "what can you do", "capabilities"]):
            return f"I can assist you with system monitoring, file management, user administration, voice commands, and general cloud operations, {user_address}. What specific task would you like me to handle?"
        
        # Weather and time
        if any(word in message_lower for word in ["weather", "time", "date"]):
            return f"Current environmental data is available through the monitoring systems, {user_address}. Would you like me to access real-time weather information or system timestamps?"
        
        # Greetings
        if any(word in message_lower for word in ["hello", "hi", "good morning", "good afternoon", "good evening"]):
            return f"Good day, {user_address}. SMASH Cloud is operational and ready to assist you. How may I be of service?"
        
        # Default contextual response
        return await self._contextual_response(user_message, context)

    async def _contextual_response(self, user_message: str, context: Dict = None) -> str:
        """Generate contextual response based on available data and conversation history"""
        user_address = settings.address_user_as
        
        # Use recent conversation for context
        recent_context = ""
        if len(self.conversation_history) > 2:
            recent_context = f" Recent conversation: {self.conversation_history[-2:]}"
        
        # Try to use external LLM if available
        try:
            if settings.openai_api_key:
                response = await self._call_openai_api(user_message, recent_context)
                if response:
                    return response
        except Exception as e:
            print(f"OpenAI API error: {e}")
        
        # Try Ollama fallback
        try:
            response = await self._call_ollama_api(user_message, recent_context)
            if response:
                return response
        except Exception as e:
            print(f"Ollama API error: {e}")
        
        # Default intelligent response
        return f"I understand your query, {user_address}. Based on the current context, I'm processing your request through the available systems. Could you provide more specific details so I can assist you more effectively?"

    async def _call_openai_api(self, message: str, context: str = "") -> Optional[str]:
        """Call OpenAI API for advanced responses"""
        if not settings.openai_api_key:
            return None
            
        prompt = f"{self.system_prompt}{context}\n\nUser: {message}\nSMASH:"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/completions",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-3.5-turbo",
                    "prompt": prompt,
                    "max_tokens": 150,
                    "temperature": 0.7
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["text"].strip()
                
        return None

    async def _call_ollama_api(self, message: str, context: str = "") -> Optional[str]:
        """Call local Ollama API"""
        prompt = f"{self.system_prompt}{context}\n\nUser: {message}\nSMASH:"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{settings.ollama_host}/api/generate",
                    json={
                        "model": "llama3",
                        "prompt": prompt,
                        "stream": False,
                        "options": {
                            "temperature": 0.7,
                            "top_p": 0.9
                        }
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return result.get("response", "").strip()
                    
            except Exception as e:
                print(f"Ollama connection error: {e}")
                
        return None

    def learn_from_conversation(self, pattern: str, response: str, category: str = "general"):
        """Learn new patterns for future responses"""
        if settings.learning_enabled:
            db_manager.save_learning_data(pattern, response, category, 0.7)
            print(f"✅ Learned new pattern: {pattern[:50]}...")

    def get_conversation_context(self, limit: int = 5) -> List[Dict]:
        """Get recent conversation context"""
        return self.conversation_history[-limit:] if self.conversation_history else []

# Global LLM instance
jarvis_llm = JarvisLLM()
