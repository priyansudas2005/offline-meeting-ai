import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.services.database.db import get_db, DBMeeting, DBQAHistory, DBSetting
from src.models.schemas import QAHistorySchema, QAHistoryCreate, QAFeedbackSchema
from src.services.qa.system import QuestionAnswering
from src.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/meetings", tags=["qa"])

@router.post("/{meeting_id}/qa", response_model=QAHistorySchema)
def ask_meeting_question(meeting_id: str, payload: QAHistoryCreate, db: Session = Depends(get_db)):
    m = db.query(DBMeeting).filter(DBMeeting.meeting_id == meeting_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    # Concatenate all transcript text
    text_list = [seg.text for seg in m.transcript]
    full_transcript = " ".join(text_list)
    
    if not full_transcript.strip():
        raise HTTPException(status_code=400, detail="Meeting transcript is empty")
        
    try:
        # Initialize QA system
        qa_system = QuestionAnswering()
        
        # Perform QA (returns dict now!)
        qa_result = qa_system.answer_question(meeting_id, payload.question, full_transcript)
        
        # Save history entry
        db_qa = DBQAHistory(
            meeting_id=meeting_id,
            question=payload.question,
            answer=qa_result.get("answer", ""),
            timestamp=datetime.now().isoformat(),
            confidence=qa_result.get("confidence", 0.0)
        )
        db.add(db_qa)
        db.commit()
        db.refresh(db_qa)
        
        return db_qa
        
    except Exception as e:
        logger.error(f"QA System failure: {e}")
        raise HTTPException(status_code=500, detail=f"QA query failed: {str(e)}")

@router.post("/{meeting_id}/qa/{qa_id}/feedback", response_model=QAHistorySchema)
def save_qa_feedback(meeting_id: str, qa_id: int, payload: QAFeedbackSchema, db: Session = Depends(get_db)):
    db_qa = db.query(DBQAHistory).filter(DBQAHistory.id == qa_id, DBQAHistory.meeting_id == meeting_id).first()
    if not db_qa:
        raise HTTPException(status_code=404, detail="Q&A entry not found")
    
    if payload.was_helpful is None:
        db_qa.was_helpful = None
    elif payload.was_helpful:
        db_qa.was_helpful = 1
    else:
        db_qa.was_helpful = 0
        
    db.commit()
    db.refresh(db_qa)
    return db_qa
