from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.services.database.db import get_db, DBSetting
from src.models.schemas import SystemSettingsSchema
from src.services.audio.recorder import SOUNDDEVICE_AVAILABLE

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("", response_model=SystemSettingsSchema)
def get_system_settings(db: Session = Depends(get_db)):
    # Read rows
    model_size = db.query(DBSetting).filter(DBSetting.key == "model_size").first()
    lang = db.query(DBSetting).filter(DBSetting.key == "default_language").first()
    vad = db.query(DBSetting).filter(DBSetting.key == "vad_enabled").first()
    ollama = db.query(DBSetting).filter(DBSetting.key == "ollama_url").first()
    db_path = db.query(DBSetting).filter(DBSetting.key == "db_path").first()

    return {
        "model_size": model_size.value if model_size else "base",
        "default_language": lang.value if lang else "auto",
        "vad_enabled": (vad.value.lower() == "true") if vad else True,
        "ollama_url": ollama.value if ollama else "http://localhost:11434",
        "db_path": db_path.value if db_path else "",
        "native_audio_available": SOUNDDEVICE_AVAILABLE
    }

@router.post("", response_model=SystemSettingsSchema)
def save_system_settings(payload: SystemSettingsSchema, db: Session = Depends(get_db)):
    try:
        # Create or update setting records
        settings_dict = {
            "model_size": payload.model_size,
            "default_language": payload.default_language,
            "vad_enabled": "true" if payload.vad_enabled else "false",
            "ollama_url": payload.ollama_url or "http://localhost:11434",
            "db_path": payload.db_path or ""
        }
        
        for k, v in settings_dict.items():
            record = db.query(DBSetting).filter(DBSetting.key == k).first()
            if record:
                record.value = v
            else:
                db.add(DBSetting(key=k, value=v))
                
        db.commit()
        return get_system_settings(db)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save configurations: {str(e)}")
