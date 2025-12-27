"""
Database models and initialization for SMASH Cloud Voice AI
Adaptive learning and conversation history storage
"""

# Database models and ORM setup
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Float, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.sql import func
import asyncio
from typing import List, Optional
from datetime import datetime

from .config import get_settings

# Database setup
settings = get_settings()
engine = create_engine(settings.database_url, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Conversation(Base):
    """Store conversation history with context"""
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_message = Column(Text, nullable=False)
    assistant_response = Column(Text, nullable=False)
    user_id = Column(String(100), default="sudhamsh")
    timestamp = Column(DateTime, default=func.now())
    context = Column(Text)  # JSON string of conversation context
    confidence_score = Column(Float, default=0.0)
    learning_tags = Column(Text)  # Categories for learning

class LearningData(Base):
    """Adaptive learning data storage"""
    __tablename__ = "learning_data"
    
    id = Column(Integer, primary_key=True, index=True)
    pattern = Column(String(500), nullable=False)  # Input pattern
    response = Column(Text, nullable=False)  # Learned response
    category = Column(String(100), default="general")
    confidence = Column(Float, default=0.5)
    usage_count = Column(Integer, default=1)
    last_used = Column(DateTime, default=func.now())
    created_at = Column(DateTime, default=func.now())
    is_verified = Column(Boolean, default=False)

class UserPreferences(Base):
    """Store user preferences and personality customization"""
    __tablename__ = "user_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), unique=True, nullable=False)
    preferred_tone = Column(String(50), default="jarvis")
    learning_enabled = Column(Boolean, default=True)
    context_memory_size = Column(Integer, default=50)
    custom_greeting = Column(Text)
    voice_settings = Column(Text)  # JSON string
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class SystemState(Base):
    """Track system state and metrics"""
    __tablename__ = "system_state"
    
    id = Column(Integer, primary_key=True, index=True)
    component = Column(String(100), nullable=False)
    status = Column(String(50), default="active")
    last_activity = Column(DateTime, default=func.now())
    metrics = Column(Text)  # JSON string of metrics
    notes = Column(Text)

async def init_database():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)
    
    # Initialize default user preferences
    db = SessionLocal()
    try:
        existing_user = db.query(UserPreferences).filter(
            UserPreferences.user_id == "sudhamsh"
        ).first()
        
        if not existing_user:
            default_prefs = UserPreferences(
                user_id="sudhamsh",
                preferred_tone="jarvis",
                learning_enabled=True,
                context_memory_size=50,
                custom_greeting="System online. Hello Sudhamsh, SMASH Cloud is now active.",
                voice_settings='{"speed": 1.0, "pitch": 1.0, "volume": 0.8}'
            )
            db.add(default_prefs)
            db.commit()
            print("✅ Default user preferences initialized")
    except Exception as e:
        print(f"❌ Error initializing user preferences: {e}")
    finally:
        db.close()

def get_db() -> Session:
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Database utility functions
class DatabaseManager:
    def __init__(self):
        self.session = SessionLocal()
    
    def save_conversation(self, user_message: str, assistant_response: str, 
                         context: str = None, confidence: float = 0.0) -> int:
        """Save conversation to database"""
        conv = Conversation(
            user_message=user_message,
            assistant_response=assistant_response,
            context=context,
            confidence_score=confidence
        )
        self.session.add(conv)
        self.session.commit()
        return conv.id
    
    def get_recent_conversations(self, limit: int = 10) -> List[Conversation]:
        """Get recent conversation history"""
        return self.session.query(Conversation).order_by(
            Conversation.timestamp.desc()
        ).limit(limit).all()
    
    def save_learning_data(self, pattern: str, response: str, 
                           category: str = "general", confidence: float = 0.5) -> int:
        """Save learned pattern and response"""
        learning = LearningData(
            pattern=pattern,
            response=response,
            category=category,
            confidence=confidence
        )
        self.session.add(learning)
        self.session.commit()
        return learning.id
    
    def find_learning_match(self, pattern: str) -> Optional[LearningData]:
        """Find best matching learned response"""
        # Simple pattern matching - can be enhanced with ML
        learnings = self.session.query(LearningData).all()
        
        best_match = None
        best_similarity = 0.0
        
        for learning in learnings:
            similarity = self._calculate_similarity(pattern, learning.pattern)
            if similarity > best_similarity and similarity > 0.7:
                best_similarity = similarity
                best_match = learning
        
        if best_match:
            # Update usage count and last used
            best_match.usage_count += 1
            best_match.last_used = datetime.now()
            self.session.commit()
        
        return best_match
    
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity between two text strings"""
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union) if union else 0.0
    
    def get_user_preferences(self, user_id: str = "sudhamsh") -> Optional[UserPreferences]:
        """Get user preferences"""
        return self.session.query(UserPreferences).filter(
            UserPreferences.user_id == user_id
        ).first()
    
    def update_user_preferences(self, user_id: str, **kwargs) -> bool:
        """Update user preferences"""
        prefs = self.get_user_preferences(user_id)
        if prefs:
            for key, value in kwargs.items():
                if hasattr(prefs, key):
                    setattr(prefs, key, value)
            prefs.updated_at = datetime.now()
            self.session.commit()
            return True
        return False
    
    def cleanup(self):
        """Close database session"""
        self.session.close()

# Global database manager
db_manager = DatabaseManager()
