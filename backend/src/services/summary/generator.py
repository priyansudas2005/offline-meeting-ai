"""
Memo Generation Module
Automatically generates meeting summaries, action items, decisions, and key points offline.
"""
import re
from datetime import datetime
from typing import Dict, List, Any
import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

from src.utils.logger import get_logger
from src.utils.config import load_config

logger = get_logger(__name__)
config = load_config()

import json
import httpx

async def check_ollama_available(url="http://localhost:11434"):
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            r = await client.get(f"{url}/api/tags")
            return r.status_code == 200
    except Exception:
        return False

class MemoGenerator:
    """
    Offline Memo Generator using local NLP models.
    """
    
    def __init__(self):
        self.model_name = config.get("memo.model", "sshleifer/distilbart-cnn-12-6")
        self.summary_max_length = config.get("memo.summary_max_length", 150)
        self.summary_min_length = config.get("memo.summary_min_length", 50)
        self.max_action_items = config.get("memo.max_action_items", 5)
        self.max_key_points = config.get("memo.max_key_points", 5)
        
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.tokenizer = None
        self.model = None
        self.model_loaded = False
        logger.info(f"MemoGenerator initialized with model: {self.model_name} on {self.device}")
        
    def _load_model(self) -> bool:
        if not self.model_loaded:
            try:
                logger.info(f"Loading summarization tokenizer and model: {self.model_name}...")
                self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
                self.model = AutoModelForSeq2SeqLM.from_pretrained(self.model_name)
                if self.device == "cuda":
                    self.model = self.model.to("cuda")
                self.model_loaded = True
                logger.info("Summarization model and tokenizer loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load summarization model: {e}. Falling back to rule-based summarization.")
                self.model_loaded = False
        return self.model_loaded
        
    async def generate_memo(self, meeting_id: str, transcript: str) -> Dict[str, Any]:
        """
        Generate a meeting memo containing a summary, key points, action items, and decisions.
        """
        if not transcript or len(transcript.strip()) < 10:
            return {
                "meeting_id": meeting_id,
                "summary": "No sufficient meeting content to summarize.",
                "action_items": [],
                "decisions": [],
                "key_points": [],
                "generated_at": datetime.now().isoformat(),
                "confidence": 0.0
            }
            
        logger.info(f"Generating memo for meeting {meeting_id}...")
        
        # 1. Fetch settings for custom Ollama endpoint URL
        from src.services.database.db import SessionLocal, DBSetting
        db = SessionLocal()
        ollama_setting = db.query(DBSetting).filter(DBSetting.key == "ollama_url").first()
        ollama_url = ollama_setting.value if ollama_setting else "http://localhost:11434"
        db.close()
        
        # 2. Check if Ollama is running
        ollama_run = await check_ollama_available(ollama_url)
        if not ollama_run:
            logger.error(f"[{datetime.now().isoformat()}] [MemoGenerator.generate_memo] Ollama is not running at {ollama_url}. Summary generation unavailable.")
            return {
                "meeting_id": meeting_id,
                "summary": "Ollama service unavailable. Please start Ollama and retry.",
                "action_items": [],
                "decisions": [],
                "key_points": [],
                "generated_at": datetime.now().isoformat(),
                "confidence": 0.0
            }
            
        # 3. Call Ollama for meeting minutes
        prompt = f"""
        You are an AI meeting assistant. Analyze the following meeting transcript and extract:
        1. An executive summary (under 150 words)
        2. Action items/todos (list of strings)
        3. Decisions made (list of strings)
        4. Key discussion points (list of strings)

        Return the result strictly as a JSON object with the following schema:
        {{
          "summary": "string",
          "action_items": ["string"],
          "decisions": ["string"],
          "key_points": ["string"]
        }}

        Transcript:
        {transcript}
        """
        
        try:
            # Fetch available models
            async with httpx.AsyncClient(timeout=5.0) as client:
                models_res = await client.get(f"{ollama_url}/api/tags")
                models_data = models_res.json()
                models = [m["name"] for m in models_data.get("models", [])]
                model_name = models[0] if models else "llama3"
                
            logger.info(f"Querying Ollama model '{model_name}' for meeting summary...")
            
            async with httpx.AsyncClient(timeout=45.0) as client:
                ollama_res = await client.post(
                    f"{ollama_url}/api/generate",
                    json={
                        "model": model_name,
                        "prompt": prompt,
                        "stream": False,
                        "format": "json"
                    }
                )
                res_data = ollama_res.json()
                response_text = res_data.get("response", "")
                
                parsed = json.loads(response_text)
                return {
                    "meeting_id": meeting_id,
                    "summary": parsed.get("summary", "No summary generated."),
                    "action_items": parsed.get("action_items", []),
                    "decisions": parsed.get("decisions", []),
                    "key_points": parsed.get("key_points", []),
                    "generated_at": datetime.now().isoformat(),
                    "confidence": 0.95
                }
        except Exception as e:
            logger.error(f"[{datetime.now().isoformat()}] [MemoGenerator.generate_memo] Ollama query failed: {e}. Falling back to Hugging Face pipeline.")
            
        # 4. Fallback to Local Hugging Face pipeline
        summary = ""
        if self._load_model():
            try:
                # Truncate transcript to fit model's max length
                truncated_text = transcript[:4000]
                inputs = self.tokenizer(truncated_text, max_length=1024, truncation=True, return_tensors="pt")
                if self.device == "cuda":
                    inputs = {k: v.to("cuda") for k, v in inputs.items()}
                
                with torch.no_grad():
                    summary_ids = self.model.generate(
                        inputs["input_ids"],
                        max_length=self.summary_max_length,
                        min_length=self.summary_min_length,
                        length_penalty=2.0,
                        num_beams=4,
                        early_stopping=True
                    )
                summary = self.tokenizer.decode(summary_ids[0], skip_special_tokens=True)
            except Exception as e:
                logger.error(f"[{datetime.now().isoformat()}] [MemoGenerator.generate_memo] HF inference failed: {e}")
                summary = self._fallback_summary(transcript)
        else:
            summary = self._fallback_summary(transcript)
            
        # Extract Action Items, Decisions, Key Points using heuristics
        action_items = self._extract_action_items(transcript)
        decisions = self._extract_decisions(transcript)
        key_points = self._extract_key_points(transcript)
        
        # Ensure we don't return empty lists by supplying intelligent defaults if none found
        if not action_items:
            action_items = ["No specific action items identified during the meeting."]
        if not decisions:
            decisions = ["No explicit decisions were recorded in this discussion."]
        if not key_points:
            key_points = [
                "Discussed meeting topics and transcript metadata.",
                "Generated transcript segments for offline analysis."
            ]
            
        # Limit the lists to max settings
        action_items = action_items[:self.max_action_items]
        key_points = key_points[:self.max_key_points]
        decisions = decisions[:5] # Default max 5 decisions
        
        # Calculate a mock confidence score based on the length and content density
        confidence = min(0.95, 0.5 + (len(transcript.split()) / 500) * 0.1)
        
        return {
            "meeting_id": meeting_id,
            "summary": summary,
            "action_items": action_items,
            "decisions": decisions,
            "key_points": key_points,
            "generated_at": datetime.now().isoformat(),
            "confidence": confidence
        }
        
    def _fallback_summary(self, text: str) -> str:
        """Create a simple summary by taking the first few sentences."""
        sentences = re.split(r'(?<=[.!?])\s+', text.strip())
        summary_sentences = sentences[:3]
        return " ".join(summary_sentences)
        
    def _extract_action_items(self, text: str) -> List[str]:
        """Extract action items using keyword search on sentences."""
        sentences = re.split(r'(?<=[.!?])\s+', text)
        action_keywords = [
            r"\b(i|we|you|he|she|they|should|will|must|need to|ought to|scheduled to|plan to)\s+\w+",
            r"\b(todo|action item|task|assign|responsible|deadline)\b"
        ]
        action_items = []
        for s in sentences:
            s_clean = s.strip()
            if not s_clean:
                continue
            is_action = False
            for pattern in action_keywords:
                if re.search(pattern, s_clean, re.IGNORECASE):
                    if len(s_clean.split()) > 4 and not s_clean.endswith('?'):
                        clean_item = re.sub(r'^\[.*?\]\s*\w+:\s*', '', s_clean)
                        clean_item = re.sub(r'^[-\*\d\.\s]+', '', clean_item)
                        if clean_item and clean_item not in action_items:
                            action_items.append(clean_item)
                            is_action = True
                            break
            if len(action_items) >= self.max_action_items:
                break
        return action_items
        
    def _extract_decisions(self, text: str) -> List[str]:
        """Extract decisions using keyword search on sentences."""
        sentences = re.split(r'(?<=[.!?])\s+', text)
        decision_keywords = [
            r"\b(decided|agreed|approved|consensus|settled on|resolution|concluded|going to go with)\b",
            r"\b(decision is|we will use|we chose)\b"
        ]
        decisions = []
        for s in sentences:
            s_clean = s.strip()
            if not s_clean:
                continue
            for pattern in decision_keywords:
                if re.search(pattern, s_clean, re.IGNORECASE):
                    if len(s_clean.split()) > 4 and not s_clean.endswith('?'):
                        clean_dec = re.sub(r'^\[.*?\]\s*\w+:\s*', '', s_clean)
                        clean_dec = re.sub(r'^[-\*\d\.\s]+', '', clean_dec)
                        if clean_dec and clean_dec not in decisions:
                            decisions.append(clean_dec)
                            break
            if len(decisions) >= 5:
                break
        return decisions
        
    def _extract_key_points(self, text: str) -> List[str]:
        """Extract key discussion points."""
        sentences = re.split(r'(?<=[.!?])\s+', text)
        key_keywords = [
            r"\b(important|key|crucial|essential|focus|goal|target|takeaway)\b",
            r"\b(problem is|issue is|main point)\b"
        ]
        key_points = []
        for s in sentences:
            s_clean = s.strip()
            if not s_clean:
                continue
            for pattern in key_keywords:
                if re.search(pattern, s_clean, re.IGNORECASE):
                    if len(s_clean.split()) > 5 and not s_clean.endswith('?'):
                        clean_kp = re.sub(r'^\[.*?\]\s*\w+:\s*', '', s_clean)
                        clean_kp = re.sub(r'^[-\*\d\.\s]+', '', clean_kp)
                        if clean_kp and clean_kp not in key_points:
                            key_points.append(clean_kp)
                            break
            if len(key_points) >= self.max_key_points:
                break
        return key_points
        
    def format_memo_text(self, memo: Dict[str, Any]) -> str:
        """Format the memo dictionary into clean markdown text."""
        meeting_id = memo.get("meeting_id", "N/A")
        generated_at = memo.get("generated_at", "N/A")
        summary = memo.get("summary", "No summary available.")
        
        lines = [
            f"# MEETING MEMO",
            f"**Meeting ID:** {meeting_id}",
            f"**Generated At:** {generated_at}",
            f"**Confidence Score:** {memo.get('confidence', 1.0)*100:.1f}%",
            "",
            "## Summary",
            summary,
            "",
            "## Key Points Discussed",
        ]
        for kp in memo.get("key_points", []):
            lines.append(f"- {kp}")
            
        lines.append("")
        lines.append("## Action Items")
        for ai in memo.get("action_items", []):
            lines.append(f"- [ ] {ai}")
            
        lines.append("")
        lines.append("## Decisions Made")
        for dec in memo.get("decisions", []):
            lines.append(f"- {dec}")
            
        return "\n".join(lines)
