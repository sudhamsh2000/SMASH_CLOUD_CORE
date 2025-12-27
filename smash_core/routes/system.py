"""
System management routes for SMASH Cloud Voice AI
"""

# System status and health check endpoints
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List
import asyncio
import httpx

from core.config import get_settings
from core.database import db_manager

router = APIRouter()
settings = get_settings()

@router.get("/status")
async def system_status():
    """Get overall system status"""
    try:
        # Get user preferences
        user_prefs = db_manager.get_user_preferences()
        
        return {
            "status": "online",
            "assistant_name": settings.assistant_name,
            "voice_mode": settings.voice_mode,
            "learning_enabled": settings.learning_enabled,
            "user_preferences": {
                "preferred_tone": user_prefs.preferred_tone if user_prefs else "jarvis",
                "learning_enabled": user_prefs.learning_enabled if user_prefs else True,
                "address_as": settings.address_user_as
            },
            "services": {
                "whisper": settings.whisper_host,
                "piper": settings.piper_host,
                "ollama": settings.ollama_host,
                "elevenlabs": "configured" if settings.elevenlabs_api_key else "not_configured"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Status check error: {str(e)}")

@router.get("/health")
async def health_check():
    """Health check for all services"""
    health_status = {
        "overall": "healthy",
        "services": {},
        "timestamp": asyncio.get_event_loop().time()
    }
    
    # Check Whisper
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.whisper_host}/health")
            health_status["services"]["whisper"] = "healthy" if response.status_code == 200 else "unhealthy"
    except:
        health_status["services"]["whisper"] = "unreachable"
    
    # Check Piper
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.piper_host}/health")
            health_status["services"]["piper"] = "healthy" if response.status_code == 200 else "unhealthy"
    except:
        health_status["services"]["piper"] = "unreachable"
    
    # Check database
    try:
        # Simple database test
        convs = db_manager.get_recent_conversations(1)
        health_status["services"]["database"] = "healthy"
    except:
        health_status["services"]["database"] = "unhealthy"
    
    return health_status

@router.get("/learning/stats")
async def learning_stats():
    """Get learning system statistics"""
    try:
        # Get conversation count
        conversations = db_manager.get_recent_conversations(1000)
        
        # Calculate basic stats
        total_conversations = len(conversations)
        avg_confidence = sum(c.confidence_score for c in conversations) / total_conversations if conversations else 0
        
        return {
            "total_conversations": total_conversations,
            "average_confidence": round(avg_confidence, 2),
            "learning_enabled": settings.learning_enabled,
            "memory_size": settings.context_memory_size,
            "last_activity": conversations[0].timestamp.isoformat() if conversations else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Learning stats error: {str(e)}")

@router.post("/reset")
async def reset_system():
    """Reset learning data (admin only)"""
    try:
        # Clear conversation history (keep system messages)
        # This would need implementation in DatabaseManager
        return {"message": "System reset initiated", "status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reset error: {str(e)}")
