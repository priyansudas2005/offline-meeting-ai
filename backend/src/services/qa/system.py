"""
Question Answering Module
Retrieves answers to user queries based on the meeting transcript offline.
"""
import re
import json
import sqlite3
from typing import Optional, Dict, Any, List
from datetime import datetime
import torch
from transformers import AutoTokenizer, AutoModelForQuestionAnswering, pipeline

from src.utils.logger import get_logger
from src.utils.config import load_config

logger = get_logger(__name__)
config = load_config()

class QuestionAnswering:
    """
    Question Answering Module for retrieving answers from the meeting transcript offline.
    Supports advanced sentence expansion and semantic routing to pre-generated meeting minutes.
    """
    
    def __init__(self):
        self.model_name = "deepset/roberta-base-squad2"
        self.max_context_length = config.get("qa.max_context_length", 512)
        self.confidence_threshold = config.get("qa.confidence_threshold", 0.1)
        
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.tokenizer = None
        self.qa_pipeline = None
        self.model_loaded = False
        
        logger.info(f"QuestionAnswering initialized with fallback priority chain on {self.device}")
        
    def _load_model(self) -> bool:
        if not self.model_loaded:
            qa_models = [
                "deepset/roberta-base-squad2",
                "deepset/minilm-uncased-squad2",
                "distilbert-base-cased-distilled-squad"
            ]
            device_idx = 0 if torch.cuda.is_available() else -1
            for model_name in qa_models:
                try:
                    logger.info(f"[{datetime.now().isoformat()}] [QuestionAnswering._load_model] Attempting to load QA model: {model_name}...")
                    self.qa_pipeline = pipeline("question-answering", model=model_name, device=device_idx)
                    self.model_name = model_name
                    self.tokenizer = self.qa_pipeline.tokenizer
                    self.model_loaded = True
                    logger.info(f"[{datetime.now().isoformat()}] [QuestionAnswering._load_model] QA model loaded successfully: {model_name}")
                    return True
                except Exception as e:
                    logger.warning(f"[{datetime.now().isoformat()}] [QuestionAnswering._load_model] Could not load {model_name}: {e}")
            
            logger.error(f"[{datetime.now().isoformat()}] [QuestionAnswering._load_model] No QA model could be loaded.")
            self.model_loaded = False
        return self.model_loaded
        
    def _fetch_memo_from_db(self, meeting_id: str) -> Optional[Dict[str, Any]]:
        """Fetch the latest generated meeting memo from SQLite."""
        try:
            from src.services.database.db import SessionLocal, DBMemo
            db = SessionLocal()
            memo = db.query(DBMemo).filter(DBMemo.meeting_id == meeting_id).first()
            db.close()
            if memo:
                return {
                    'summary': memo.summary,
                    'action_items': json.loads(memo.action_items_json) if memo.action_items_json else [],
                    'decisions': json.loads(memo.decisions_json) if memo.decisions_json else [],
                    'key_points': json.loads(memo.key_points_json) if memo.key_points_json else []
                }
        except Exception as e:
            logger.error(f"Failed to fetch memo for QA routing: {e}")
        return None

    def _expand_answer_to_sentence(self, answer: str, transcript: str) -> str:
        """Find the exact sentence containing the extracted answer span and return it."""
        if not answer or answer.strip() in ["[CLS]", "[SEP]", ""]:
            return ""
            
        clean_ans = answer.strip().lower()
        if len(clean_ans) < 3:
            return answer
            
        # Split transcript into sentences
        sentences = re.split(r'(?<=[.!?])\s+', transcript)
        for s in sentences:
            s_clean = s.strip()
            if clean_ans in s_clean.lower():
                return s_clean
                
        return answer
        
    def truncate_context(self, text, tokenizer, max_tokens=450):
        tokens = tokenizer.encode(text, truncation=True, max_length=max_tokens)
        return tokenizer.decode(tokens, skip_special_tokens=True)

    def answer_question(self, meeting_id: str, question: str, transcript: str) -> dict:
        """
        Answer a question based on the provided meeting transcript.
        Includes semantic routing for summaries/actions and sentence expansion for extractive answers.
        """
        if not transcript or len(transcript.strip()) < 10:
            return no_answer_response(question)
            
        if not question or len(question.strip()) < 3:
            return no_answer_response(question)
            
        # 1. Advanced Routing: Route to memo database for high-level semantic summaries
        q_type = detect_question_type(question)
        if q_type != "general":
            memo = self._fetch_memo_from_db(meeting_id)
            if memo:
                if q_type == "action_items" and memo['action_items']:
                    return {
                        "answer": "Based on the meeting minutes, the assigned action items are:\n" + "\n".join([f"• {item}" for item in memo['action_items']]),
                        "confidence": 1.0,
                        "confidence_label": "Very High",
                        "source_snippet": "Directly fetched from meeting minutes summary.",
                        "chunk_index": -1,
                        "found": True
                    }
                elif q_type == "decisions" and memo['decisions']:
                    return {
                        "answer": "The following decisions were made during the meeting:\n" + "\n".join([f"• {item}" for item in memo['decisions']]),
                        "confidence": 1.0,
                        "confidence_label": "Very High",
                        "source_snippet": "Directly fetched from meeting minutes summary.",
                        "chunk_index": -1,
                        "found": True
                    }
                elif q_type == "summary" and memo['summary']:
                    ans = f"**Meeting Summary:**\n{memo['summary']}"
                    if memo['key_points']:
                        ans += "\n\n**Key Points Discussed:**\n" + "\n".join([f"• {item}" for item in memo['key_points']])
                    return {
                        "answer": ans,
                        "confidence": 1.0,
                        "confidence_label": "Very High",
                        "source_snippet": "Directly fetched from meeting minutes summary.",
                        "chunk_index": -1,
                        "found": True
                    }

        # 2. Retrieve top chunks using SentenceTransformers
        from src.services.database.db import SessionLocal, DBTranscriptEmbedding
        db = SessionLocal()
        cached = db.query(DBTranscriptEmbedding).filter(DBTranscriptEmbedding.meeting_id == meeting_id).all()
        db.close()
        
        retriever = SemanticRetriever()
        if cached:
            logger.info(f"Loading cached QA index from SQLite for meeting {meeting_id}...")
            chunks = [{"text": c.chunk_text} for c in cached]
            embeddings = [json.loads(c.embedding_json) for c in cached]
            retriever.load_cached_index(chunks, embeddings)
        else:
            logger.info(f"No cached index found. Computing index for meeting {meeting_id}...")
            self._load_model()
            chunks = chunk_transcript(transcript, self.tokenizer)
            retriever.index_transcript(chunks)
            # Store in DB
            db = SessionLocal()
            try:
                for chunk, emb in zip(chunks, retriever.chunk_embeddings):
                    db_emb = DBTranscriptEmbedding(
                        meeting_id=meeting_id,
                        chunk_text=chunk["text"],
                        embedding_json=json.dumps(emb.tolist())
                    )
                    db.add(db_emb)
                db.commit()
            except Exception as save_err:
                logger.error(f"Failed to cache generated embeddings: {save_err}")
            finally:
                db.close()

        candidates = retriever.retrieve(question, top_k=3)
        if not candidates:
            return no_answer_response(question)

        # 3. Candidate Scoring via QA Pipeline
        self._load_model()
        if not self.model_loaded:
            return self._fallback_qa_dict(question, transcript)

        answers = []
        for candidate in candidates:
            if candidate["score"] < 0.25:
                continue
                
            try:
                guarded_chunk = self.truncate_context(candidate["text"], self.tokenizer, max_tokens=450)
                inputs = self.tokenizer(question, guarded_chunk, return_tensors="pt", truncation=True, max_length=self.max_context_length)
                if self.device == "cuda":
                    inputs = {k: v.to("cuda") for k, v in inputs.items()}
                    
                with torch.no_grad():
                    outputs = self.qa_pipeline.model(**inputs)
                    
                start_logits = outputs.start_logits[0]
                end_logits = outputs.end_logits[0]
                
                start_probs = torch.softmax(start_logits, dim=-1)
                end_probs = torch.softmax(end_logits, dim=-1)
                
                start_idx = torch.argmax(start_probs).item()
                end_idx = torch.argmax(end_probs).item()
                
                confidence_score = (start_probs[start_idx] * end_probs[end_idx]).item()
                
                if end_idx >= start_idx:
                    tokens = self.tokenizer.convert_ids_to_tokens(inputs["input_ids"][0])
                    answer_tokens = tokens[start_idx : end_idx + 1]
                    answer = self.tokenizer.convert_tokens_to_string(answer_tokens).strip()
                    answer = answer.replace("[CLS]", "").replace("[SEP]", "").replace("<s>", "").replace("</s>", "").strip()
                    
                    if answer and not answer.startswith("..."):
                        answers.append({
                            "answer": answer,
                            "confidence": confidence_score,
                            "retrieval_score": candidate["score"],
                            "source_chunk": guarded_chunk,
                            "chunk_index": candidate["chunk_index"]
                        })
            except Exception as e:
                logger.error(f"QA Inference failed on chunk: {e}")

        if not answers:
            return no_answer_response(question)

        # 4. Pick best answer above threshold
        best = max(answers, key=lambda x: x["confidence"])
        
        CONFIDENCE_THRESHOLD = 0.30
        if best["confidence"] < CONFIDENCE_THRESHOLD:
            return no_answer_response(question)

        expanded = self._expand_answer_to_sentence(best["answer"], transcript)
        final_ans = expanded if expanded else best["answer"]

        return {
            "answer": final_ans,
            "confidence": round(best["confidence"], 3),
            "confidence_label": get_confidence_label(best["confidence"]),
            "source_snippet": best["source_chunk"][:300],
            "chunk_index": best["chunk_index"],
            "found": True
        }

    def _fallback_qa_dict(self, question: str, transcript: str) -> dict:
        """Fallback keyword-based sentence search returns dict."""
        sentences = re.split(r'(?<=[.!?])\s+', transcript)
        question_words = set(re.findall(r'\b\w+\b', question.lower()))
        stop_words = {
            'what', 'when', 'where', 'who', 'whom', 'which', 'why', 'how',
            'is', 'are', 'was', 'were', 'the', 'a', 'an', 'and', 'or', 'but',
            'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'do', 'does', 'did'
        }
        query_words = question_words - stop_words
        
        best_sentence = "Could not find an answer matching your question keywords."
        max_overlap = 0
        
        for s in sentences:
            s_clean = s.strip()
            if not s_clean:
                continue
            s_words = set(re.findall(r'\b\w+\b', s_clean.lower()))
            overlap = len(query_words & s_words)
            if overlap > max_overlap:
                max_overlap = overlap
                best_sentence = s_clean
                
        if max_overlap > 0:
            return {
                "answer": best_sentence,
                "confidence": 0.35,
                "confidence_label": "Low",
                "source_snippet": best_sentence[:300],
                "chunk_index": -1,
                "found": True
            }
        return no_answer_response(question)

# Sliding Window Chunking helper (Fix 2)
def split_into_sentences(text: str) -> List[str]:
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]

def chunk_transcript(transcript: str, tokenizer=None) -> List[Dict[str, Any]]:
    sentences = split_into_sentences(transcript)
    chunks = []
    current_chunk = []
    current_length = 0
    
    for sentence in sentences:
        if tokenizer:
            token_count = len(tokenizer.encode(sentence, add_special_tokens=False))
        else:
            token_count = len(sentence.split())
            
        if current_length + token_count > 400:
            if current_chunk:
                chunks.append({
                    "text": " ".join(current_chunk),
                })
            current_chunk = current_chunk[-2:]
            if tokenizer:
                current_length = sum(len(tokenizer.encode(s, add_special_tokens=False)) for s in current_chunk)
            else:
                current_length = sum(len(s.split()) for s in current_chunk)
        
        current_chunk.append(sentence)
        current_length += token_count
        
    if current_chunk:
        chunks.append({
            "text": " ".join(current_chunk),
        })
    return chunks

# Semantic Retriever (Fix 3)
from sentence_transformers import SentenceTransformer, util
import torch

class SemanticRetriever:
    def __init__(self):
        self.model = SentenceTransformer("all-MiniLM-L6-v2")
        self.chunk_embeddings = None
        self.chunks = []
        
    def index_transcript(self, chunks: list[dict]):
        self.chunks = chunks
        texts = [c["text"] for c in chunks]
        self.chunk_embeddings = self.model.encode(
            texts,
            convert_to_tensor=True,
            show_progress_bar=False
        )
        
    def load_cached_index(self, cached_chunks: list[dict], cached_embeddings: list[list[float]]):
        self.chunks = cached_chunks
        self.chunk_embeddings = torch.tensor(cached_embeddings, dtype=torch.float32)
        if torch.cuda.is_available():
            self.chunk_embeddings = self.chunk_embeddings.to("cuda")
            
    def retrieve(self, query: str, top_k: int = 3) -> list[dict]:
        query_embedding = self.model.encode(
            query, convert_to_tensor=True
        )
        scores = util.cos_sim(query_embedding, self.chunk_embeddings)[0]
        top_k = min(top_k, len(self.chunks))
        if top_k == 0:
            return []
        top_indices = scores.topk(top_k).indices
        
        results = []
        for idx in top_indices:
            i = int(idx)
            results.append({
                "text": self.chunks[i]["text"],
                "score": float(scores[i]),
                "chunk_index": i
            })
        return results

# Pre-processing patterns & Helpers (Fix 4 / 5)
QUESTION_PATTERNS = {
    "action_items": [
        "what are the action items",
        "what tasks were assigned",
        "who owns",
        "what needs to be done",
        "todo",
        "task"
    ],
    "decisions": [
        "what was decided",
        "what decisions were made",
        "what was agreed",
        "decision"
    ],
    "timeline": [
        "when",
        "what time",
        "deadline",
        "by when"
    ],
    "summary": [
        "what was discussed",
        "summarize",
        "overview",
        "main points",
        "highlights"
    ]
}

def detect_question_type(query: str) -> str:
    query_lower = query.lower()
    for q_type, patterns in QUESTION_PATTERNS.items():
        if any(p in query_lower for p in patterns):
            return q_type
    return "general"

def get_confidence_label(score: float) -> str:
    if score >= 0.80: return "Very High"
    if score >= 0.60: return "High"
    if score >= 0.40: return "Medium"
    if score >= 0.30: return "Low"
    return "Not Found"

def no_answer_response(query: str) -> dict:
    return {
        "answer": "I couldn't find evidence for that in this meeting transcript.",
        "confidence": 0.0,
        "confidence_label": "Not Found",
        "source_snippet": None,
        "chunk_index": -1,
        "found": False
    }

# Helper to automatically index and cache transcripts (Fix 7)
def index_meeting_transcript(meeting_id: str, transcript: str, db):
    try:
        from transformers import AutoTokenizer
        try:
            tokenizer = AutoTokenizer.from_pretrained("distilbert-base-cased-distilled-squad")
        except Exception:
            tokenizer = None
            
        chunks = chunk_transcript(transcript, tokenizer)
        
        retriever_model = SentenceTransformer("all-MiniLM-L6-v2")
        texts = [c["text"] for c in chunks]
        embeddings = retriever_model.encode(texts, show_progress_bar=False)
        
        from src.services.database.db import DBTranscriptEmbedding
        db.query(DBTranscriptEmbedding).filter(DBTranscriptEmbedding.meeting_id == meeting_id).delete()
        for chunk, emb in zip(chunks, embeddings):
            db_emb = DBTranscriptEmbedding(
                meeting_id=meeting_id,
                chunk_text=chunk["text"],
                embedding_json=json.dumps(emb.tolist())
            )
            db.add(db_emb)
        db.commit()
        logger.info(f"Transcript indexed: {len(chunks)} chunks, {len(embeddings)} embeddings generated for meeting {meeting_id}")
    except Exception as e:
        logger.error(f"Failed to automatically index meeting transcript: {e}")
