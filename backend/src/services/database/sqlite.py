"""
Database Module
SQLite database operations for storing meeting data
"""
import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Optional, Any
from pathlib import Path

from src.utils.logger import get_logger
from src.utils.config import load_config

logger = get_logger(__name__)
config = load_config()

class TranscriptDatabase:
    """
    SQLite database handler for meeting transcripts and metadata.
    """
    
    def __init__(self, db_path: Optional[str] = None):
        """
        Initialize database connection.
        
        Args:
            db_path: Path to database file
        """
        if db_path is None:
            db_dir = Path(config.get("paths.database_dir", "data/database"))
            db_dir.mkdir(parents=True, exist_ok=True)
            db_path = str(db_dir / config.get("database.name", "transcripts.db"))
            
        self.db_path = db_path
        logger.info(f"Initializing database at: {self.db_path}")
        self._init_db()
        
    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
        
    def _init_db(self):
        """Create tables if they don't exist."""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # Meetings table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS meetings (
                        meeting_id TEXT PRIMARY KEY,
                        title TEXT NOT NULL,
                        date TEXT NOT NULL,
                        duration REAL,
                        audio_path TEXT,
                        metadata TEXT
                    )
                """)
                
                # Transcripts table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS transcripts (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        meeting_id TEXT NOT NULL,
                        start TEXT,
                        end TEXT,
                        start_seconds REAL,
                        end_seconds REAL,
                        text TEXT,
                        words TEXT,
                        FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id) ON DELETE CASCADE
                    )
                """)
                
                # Memos table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS memos (
                        meeting_id TEXT PRIMARY KEY,
                        summary TEXT,
                        action_items TEXT,
                        decisions TEXT,
                        key_points TEXT,
                        generated_at TEXT,
                        confidence REAL,
                        FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id) ON DELETE CASCADE
                    )
                """)
                
                # Q&A History table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS qa_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        meeting_id TEXT NOT NULL,
                        question TEXT NOT NULL,
                        answer TEXT NOT NULL,
                        timestamp TEXT NOT NULL,
                        FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id) ON DELETE CASCADE
                    )
                """)
                conn.commit()
            logger.info("Database initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            raise
            
    def save_meeting(self, meeting_data: Dict[str, Any]):
        """Save meeting metadata."""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO meetings (meeting_id, title, date, duration, audio_path, metadata)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    meeting_data.get('meeting_id'),
                    meeting_data.get('title'),
                    meeting_data.get('date'),
                    meeting_data.get('duration'),
                    meeting_data.get('audio_path'),
                    json.dumps(meeting_data.get('metadata', {}))
                ))
                conn.commit()
            logger.info(f"Saved meeting {meeting_data.get('meeting_id')} to DB")
        except Exception as e:
            logger.error(f"Failed to save meeting: {e}")
            
    def save_transcript(self, meeting_id: str, timestamped_segments: List[Dict[str, Any]]):
        """Save transcript segments."""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                
                # Clear existing segments for this meeting
                cursor.execute("DELETE FROM transcripts WHERE meeting_id = ?", (meeting_id,))
                
                # Insert new segments
                for segment in timestamped_segments:
                    cursor.execute("""
                        INSERT INTO transcripts (meeting_id, start, end, start_seconds, end_seconds, text, words)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        meeting_id,
                        segment.get('start'),
                        segment.get('end'),
                        segment.get('start_seconds'),
                        segment.get('end_seconds'),
                        segment.get('text'),
                        json.dumps(segment.get('words', []))
                    ))
                conn.commit()
            logger.info(f"Saved {len(timestamped_segments)} transcript segments for meeting {meeting_id}")
        except Exception as e:
            logger.error(f"Failed to save transcript segments: {e}")
            
    def save_memo(self, meeting_id: str, memo: Dict[str, Any]):
        """Save generated memo."""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO memos (meeting_id, summary, action_items, decisions, key_points, generated_at, confidence)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    meeting_id,
                    memo.get('summary'),
                    json.dumps(memo.get('action_items', [])),
                    json.dumps(memo.get('decisions', [])),
                    json.dumps(memo.get('key_points', [])),
                    memo.get('generated_at'),
                    memo.get('confidence', 1.0)
                ))
                conn.commit()
            logger.info(f"Saved memo for meeting {meeting_id}")
        except Exception as e:
            logger.error(f"Failed to save memo: {e}")
            
    def save_qa(self, meeting_id: str, question: str, answer: str):
        """Save Q&A entry."""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO qa_history (meeting_id, question, answer, timestamp)
                    VALUES (?, ?, ?, ?)
                """, (
                    meeting_id,
                    question,
                    answer,
                    datetime.now().isoformat()
                ))
                conn.commit()
            logger.info(f"Saved QA for meeting {meeting_id}")
        except Exception as e:
            logger.error(f"Failed to save QA: {e}")
