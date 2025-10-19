"""
Chat API routes for SMASH Cloud Voice AI
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict
import json

from core.llm import jarvis_llm
from core.database import db_manager

router = APIRouter()

class ChatMessage(BaseModel):
    message: str
    context: Optional[Dict] = None
    user_id: str = "sudhamsh"

class ChatResponse(BaseModel):
    response: str
    confidence: float
    source: str
    timestamp: str
    conversation_id: Optional[int] = None

@router.post("/", response_model=ChatResponse)
async def chat(message: ChatMessage):
    """Handle chat messages and return Jarvis-style responses"""
    try:
        result = await jarvis_llm.process_message(
            user_message=message.message,
            context=message.context
        )
        
        return ChatResponse(
            response=result["response"],
            confidence=result["confidence"],
            source=result["source"],
            timestamp=result["timestamp"],
            conversation_id=result.get("conversation_id")
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat processing error: {str(e)}")

@router.get("/history")
async def get_chat_history(limit: int = 20):
    """Get recent chat history"""
    try:
        conversations = db_manager.get_recent_conversations(limit)
        return {
            "conversations": [
                {
                    "id": conv.id,
                    "user_message": conv.user_message,
                    "assistant_response": conv.assistant_response,
                    "timestamp": conv.timestamp.isoformat(),
                    "confidence": conv.confidence_score
                }
                for conv in conversations
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving chat history: {str(e)}")

@router.post("/learn")
async def learn_pattern(question: str, answer: str, category: str = "general"):
    """Teach the AI a new pattern"""
    try:
        jarvis_llm.learn_from_conversation(question, answer, category)
        return {"message": "Pattern learned successfully", "pattern": question[:50]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Learning error: {str(e)}")
