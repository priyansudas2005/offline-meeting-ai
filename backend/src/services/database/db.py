import os
import json
from datetime import datetime
from typing import Generator
from sqlalchemy import create_engine, Column, String, Float, Integer, ForeignKey, Text
from sqlalchemy.orm import sessionmaker, declarative_base, relationship

# Determine SQLite path
DB_DIR = "backend/data/database"
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, "transcripts.db")

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class DBSetting(Base):
    __tablename__ = "settings"
    key = Column(String, primary_key=True)
    value = Column(Text, nullable=False)

class DBMeeting(Base):
    __tablename__ = "meetings"
    meeting_id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    date = Column(String, nullable=False)
    duration = Column(Float, nullable=True)
    audio_path = Column(String, nullable=True)
    metadata_json = Column("metadata", Text, nullable=True, default="{}")

    # Relationships
    transcript = relationship("DBTranscriptSegment", back_populates="meeting", cascade="all, delete-orphan")
    memo = relationship("DBMemo", uselist=False, back_populates="meeting", cascade="all, delete-orphan")
    qa_history = relationship("DBQAHistory", back_populates="meeting", cascade="all, delete-orphan")

class DBTranscriptSegment(Base):
    __tablename__ = "transcripts"
    id = Column(Integer, primary_key=True, autoincrement=True)
    meeting_id = Column(String, ForeignKey("meetings.meeting_id", ondelete="CASCADE"), nullable=False)
    start = Column(String, nullable=True)
    end = Column(String, nullable=True)
    start_seconds = Column(Float, nullable=True)
    end_seconds = Column(Float, nullable=True)
    text = Column(Text, nullable=False)
    words_json = Column("words", Text, nullable=True, default="[]")

    meeting = relationship("DBMeeting", back_populates="transcript")

class DBMemo(Base):
    __tablename__ = "memos"
    meeting_id = Column(String, ForeignKey("meetings.meeting_id", ondelete="CASCADE"), primary_key=True)
    summary = Column(Text, nullable=True)
    action_items_json = Column("action_items", Text, nullable=True, default="[]")
    decisions_json = Column("decisions", Text, nullable=True, default="[]")
    key_points_json = Column("key_points", Text, nullable=True, default="[]")
    generated_at = Column(String, nullable=True)
    confidence = Column(Float, nullable=True, default=1.0)

    meeting = relationship("DBMeeting", back_populates="memo")

class DBQAHistory(Base):
    __tablename__ = "qa_history"
    id = Column(Integer, primary_key=True, autoincrement=True)
    meeting_id = Column(String, ForeignKey("meetings.meeting_id", ondelete="CASCADE"), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    timestamp = Column(String, nullable=False)
    confidence = Column(Float, nullable=True, default=0.0)
    was_helpful = Column(Integer, nullable=True) # 1: Up, 0: Down, null: none

    meeting = relationship("DBMeeting", back_populates="qa_history")

class DBTranscriptEmbedding(Base):
    __tablename__ = "transcript_embeddings"
    id = Column(Integer, primary_key=True, autoincrement=True)
    meeting_id = Column(String, ForeignKey("meetings.meeting_id", ondelete="CASCADE"), nullable=False)
    chunk_text = Column(Text, nullable=False)
    embedding_json = Column(Text, nullable=False) # JSON list of floats

# Initialize database
def init_db():
    Base.metadata.create_all(bind=engine)
    
    # SQLite migrations for older installations
    db = SessionLocal()
    try:
        db.execute("ALTER TABLE qa_history ADD COLUMN confidence FLOAT")
        db.commit()
    except Exception:
        pass
    try:
        db.execute("ALTER TABLE qa_history ADD COLUMN was_helpful INTEGER")
        db.commit()
    except Exception:
        pass
    
    # Set default settings if not exists
    try:
        default_settings = {
            "model_size": "base",
            "default_language": "auto",
            "vad_enabled": "true",
            "ollama_url": "http://localhost:11434"
        }
        for k, v in default_settings.items():
            exists = db.query(DBSetting).filter(DBSetting.key == k).first()
            if not exists:
                db.add(DBSetting(key=k, value=v))
        db.commit()
    except Exception as e:
        print("Error seeding default settings:", e)
    finally:
        db.close()

# Dependency injector session generator
def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
