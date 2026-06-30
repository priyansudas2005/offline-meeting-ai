import re
import json
from collections import Counter
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from src.services.database.db import get_db, DBMeeting, DBTranscriptSegment, DBMemo
from src.models.schemas import AnalyticsSummarySchema, TimelineStat, KeywordStat, ModelStat

router = APIRouter(prefix="/analytics", tags=["analytics"])

STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
    "do", "does", "did", "is", "are", "was", "were", "we", "i", "you", "they", "he", "she",
    "it", "this", "that", "these", "those", "have", "has", "had", "what", "where", "when",
    "why", "how", "meeting", "discuss", "project", "task", "going", "would", "could", "should"
}

@router.get("", response_model=AnalyticsSummarySchema)
def get_analytics_summary(db: Session = Depends(get_db)):
    meetings = db.query(DBMeeting).all()
    
    meetings_count = len(meetings)
    duration_total = sum(m.duration or 0.0 for m in meetings)
    
    # Calculate word total and build timeline
    words_total = 0
    action_items_total = 0
    timeline = []
    model_counts = Counter()
    
    all_words = []
    
    # Sort meetings by date ascending for charts
    sorted_meetings = sorted(meetings, key=lambda x: x.date)
    
    for m in sorted_meetings:
        m_words_count = 0
        for seg in m.transcript:
            word_list = re.findall(r"\b\w+\b", seg.text.lower())
            m_words_count += len(word_list)
            all_words.extend(word_list)
            
        words_total += m_words_count
        
        # Action items count
        m_actions_count = 0
        if m.memo and m.memo.action_items_json:
            try:
                actions = json.loads(m.memo.action_items_json)
                m_actions_count = len(actions)
            except Exception:
                pass
        action_items_total += m_actions_count
        
        # Read model used from metadata
        model_name = "base"
        if m.metadata_json:
            try:
                meta = json.loads(m.metadata_json)
                model_name = meta.get("model_used", "base")
            except Exception:
                pass
        model_counts[model_name] += 1
        
        # Extract short date format (e.g. YYYY-MM-DD)
        short_date = m.date.split("T")[0] if "T" in m.date else m.date
        timeline.append(TimelineStat(
            date=short_date,
            duration=round((m.duration or 0.0) / 60, 1),
            words=m_words_count
        ))
        
    # Keyword extraction
    filtered_words = [w for w in all_words if w not in STOPWORDS and len(w) > 3]
    top_words = Counter(filtered_words).most_common(5)
    
    keywords = [KeywordStat(text=w[0], value=w[1]) for w in top_words]
    
    model_distribution = [
        ModelStat(name=name, value=count) 
        for name, count in model_counts.items()
    ]
    
    return {
        "meetings_count": meetings_count,
        "duration_total": duration_total,
        "words_total": words_total,
        "action_items_total": action_items_total,
        "timeline": timeline,
        "keywords": keywords,
        "model_distribution": model_distribution
    }
