import os
import uuid
import json
from datetime import datetime
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List

from src.services.database.db import get_db, DBMeeting, DBTranscriptSegment, DBMemo, DBQAHistory
from src.models.schemas import MeetingResponse, ProcessRequest, MeetingTitleUpdate
from src.services.audio.processor import AudioProcessor
from src.services.transcription.faster_whisper import FasterWhisperSTT
from src.services.summary.generator import MemoGenerator
from src.services.export.engine import ExportEngine
from src.services.transcript.timestamp import TimestampGenerator
from src.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/meetings", tags=["meetings"])

RECORDINGS_DIR = "backend/data/recordings"
os.makedirs(RECORDINGS_DIR, exist_ok=True)

# Helper function to convert DB model to schema response
def serialize_meeting(m: DBMeeting) -> dict:
    segments = []
    for s in m.transcript:
        segments.append({
            "id": s.id,
            "meeting_id": s.meeting_id,
            "start": s.start,
            "end": s.end,
            "start_seconds": s.start_seconds,
            "end_seconds": s.end_seconds,
            "text": s.text,
            "words": json.loads(s.words_json) if s.words_json else []
        })
        
    memo_data = None
    if m.memo:
        memo_data = {
            "meeting_id": m.memo.meeting_id,
            "summary": m.memo.summary,
            "action_items": json.loads(m.memo.action_items_json) if m.memo.action_items_json else [],
            "decisions": json.loads(m.memo.decisions_json) if m.memo.decisions_json else [],
            "key_points": json.loads(m.memo.key_points_json) if m.memo.key_points_json else [],
            "generated_at": m.memo.generated_at,
            "confidence": m.memo.confidence
        }
        
    qa_history = []
    for q in m.qa_history:
        qa_history.append({
            "id": q.id,
            "meeting_id": q.meeting_id,
            "question": q.question,
            "answer": q.answer,
            "timestamp": q.timestamp,
            "confidence": getattr(q, 'confidence', 0.0),
            "was_helpful": getattr(q, 'was_helpful', None)
        })

    return {
        "meeting_id": m.meeting_id,
        "title": m.title,
        "date": m.date,
        "duration": m.duration,
        "audio_path": m.audio_path,
        "metadata": json.loads(m.metadata_json) if m.metadata_json else {},
        "transcript": segments,
        "memo": memo_data,
        "qa_history": qa_history
    }

@router.get("", response_model=List[MeetingResponse])
def get_meetings(db: Session = Depends(get_db)):
    meetings = db.query(DBMeeting).all()
    return [serialize_meeting(m) for m in meetings]

@router.get("/{meeting_id}", response_model=MeetingResponse)
def get_meeting(meeting_id: str, db: Session = Depends(get_db)):
    m = db.query(DBMeeting).filter(DBMeeting.meeting_id == meeting_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return serialize_meeting(m)

@router.delete("/{meeting_id}")
def delete_meeting(meeting_id: str, db: Session = Depends(get_db)):
    m = db.query(DBMeeting).filter(DBMeeting.meeting_id == meeting_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    # Try deleting audio file
    if m.audio_path and os.path.exists(m.audio_path):
        try:
            os.remove(m.audio_path)
            processed_wav = m.audio_path.replace(".wav", "_processed.wav")
            if os.path.exists(processed_wav):
                os.remove(processed_wav)
        except Exception as e:
            logger.error(f"Failed to delete audio file: {e}")
            
    db.delete(m)
    db.commit()
    return {"status": "success"}

@router.patch("/{meeting_id}", response_model=MeetingResponse)
def update_meeting_title(meeting_id: str, payload: MeetingTitleUpdate, db: Session = Depends(get_db)):
    m = db.query(DBMeeting).filter(DBMeeting.meeting_id == meeting_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    m.title = payload.title
    db.commit()
    db.refresh(m)
    return serialize_meeting(m)

@router.post("/upload", response_model=MeetingResponse)
def upload_meeting_audio(
    file: UploadFile = File(...),
    title: str = Form(None),
    db: Session = Depends(get_db)
):
    meeting_id = str(uuid.uuid4())
    final_title = title or file.filename.rsplit(".", 1)[0]
    
    # Save file
    file_ext = file.filename.rsplit(".", 1)[-1]
    audio_filename = f"{meeting_id}.{file_ext}"
    audio_path = os.path.join(RECORDINGS_DIR, audio_filename)
    
    with open(audio_path, "wb") as buffer:
        buffer.write(file.file.read())
        
    # Calculate duration
    duration = 0.0
    try:
        import soundfile as sf
        info = sf.info(audio_path)
        duration = info.duration
    except Exception as e:
        logger.error(f"Failed to calculate audio duration with soundfile: {e}, trying av...")
        try:
            import av
            with av.open(audio_path) as container:
                stream = container.streams.audio[0]
                # Convert time duration to float seconds
                if stream.duration and stream.time_base:
                    duration = float(stream.duration * stream.time_base)
                else:
                    # fallback if duration not in header
                    duration = float(container.duration / 1000000.0)
        except Exception as av_err:
            logger.error(f"Failed to calculate duration with av: {av_err}")
        
    meeting_data = DBMeeting(
        meeting_id=meeting_id,
        title=final_title,
        date=datetime.now().isoformat(),
        duration=duration,
        audio_path=audio_path,
        metadata_json="{}"
    )
    
    db.add(meeting_data)
    db.commit()
    db.refresh(meeting_data)
    return serialize_meeting(meeting_data)

@router.post("/{meeting_id}/process", response_model=MeetingResponse)
async def process_meeting(meeting_id: str, request: ProcessRequest, db: Session = Depends(get_db)):
    m = db.query(DBMeeting).filter(DBMeeting.meeting_id == meeting_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    if not m.audio_path or not os.path.exists(m.audio_path):
        raise HTTPException(status_code=400, detail="Meeting audio file not found on disk")
        
    try:
        # 1. Preprocess audio
        processor = AudioProcessor()
        processed_path = processor.preprocess_audio(m.audio_path)
        active_audio_path = processed_path if processed_path else m.audio_path
        
        # 2. Transcribe speech-to-text
        whisper_model_size = request.modelSize or "base"
        vad_filter = request.vadEnabled if request.vadEnabled is not None else True
        stt_lang = request.language
        
        stt_engine = FasterWhisperSTT(model_size=whisper_model_size)
        transcribe_result = stt_engine.transcribe(
            audio_path=active_audio_path,
            language=stt_lang,
            vad_filter=vad_filter
        )
        
        raw_segments = transcribe_result[0] if transcribe_result else []
        segments = TimestampGenerator.add_timestamps(raw_segments)
        
        # 3. Store transcript segments
        # Clear existing
        db.query(DBTranscriptSegment).filter(DBTranscriptSegment.meeting_id == meeting_id).delete()
        
        full_text_list = []
        for seg in segments:
            full_text_list.append(seg.get("text", ""))
            db_seg = DBTranscriptSegment(
                meeting_id=meeting_id,
                start=seg.get("start"),
                end=seg.get("end"),
                start_seconds=seg.get("start_seconds"),
                end_seconds=seg.get("end_seconds"),
                text=seg.get("text", ""),
                words_json=json.dumps(seg.get("words", []))
            )
            db.add(db_seg)
            
        full_transcript = " ".join(full_text_list)
        
        # 4. Generate structured summary / minutes
        memo_generator = MemoGenerator()
        memo_result = await memo_generator.generate_memo(meeting_id, full_transcript)
        
        # Store memo
        db.query(DBMemo).filter(DBMemo.meeting_id == meeting_id).delete()
        db_memo = DBMemo(
            meeting_id=meeting_id,
            summary=memo_result.get("summary"),
            action_items_json=json.dumps(memo_result.get("action_items", [])),
            decisions_json=json.dumps(memo_result.get("decisions", [])),
            key_points_json=json.dumps(memo_result.get("key_points", [])),
            generated_at=memo_result.get("generated_at"),
            confidence=memo_result.get("confidence", 1.0)
        )
        db.add(db_memo)
        
        # Index transcript for QA semantic search (Fix 7)
        try:
            from src.services.qa.system import index_meeting_transcript
            index_meeting_transcript(meeting_id, full_transcript, db)
        except Exception as idx_err:
            logger.error(f"Failed to index transcript for QA: {idx_err}")
        
        # Update meeting metadata (which model was used)
        meta = json.loads(m.metadata_json or "{}")
        meta["model_used"] = whisper_model_size
        m.metadata_json = json.dumps(meta)
        
        db.commit()
        db.refresh(m)
        return serialize_meeting(m)
        
    except Exception as e:
        logger.error(f"Process meeting error: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Audio processing failure: {str(e)}")

@router.get("/{meeting_id}/export/{format_type}")
def export_meeting(meeting_id: str, format_type: str, db: Session = Depends(get_db)):
    m = db.query(DBMeeting).filter(DBMeeting.meeting_id == meeting_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    data = serialize_meeting(m)
    
    if format_type == "txt":
        content = ExportEngine.to_txt(data["title"], data["transcript"], data["memo"])
        return Response(content=content, media_type="text/plain", headers={"Content-Disposition": f"attachment; filename={meeting_id}.txt"})
    elif format_type == "md":
        content = ExportEngine.to_markdown(data["title"], data["date"], data["transcript"], data["memo"])
        return Response(content=content, media_type="text/markdown", headers={"Content-Disposition": f"attachment; filename={meeting_id}.md"})
    elif format_type == "csv":
        content = ExportEngine.to_csv(data["transcript"])
        return Response(content=content, media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={meeting_id}.csv"})
    elif format_type == "srt":
        content = ExportEngine.to_srt(data["transcript"])
        return Response(content=content, media_type="text/plain", headers={"Content-Disposition": f"attachment; filename={meeting_id}.srt"})
    else:
        raise HTTPException(status_code=400, detail="Invalid export format")
