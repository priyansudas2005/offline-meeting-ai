"""
Faster-Whisper Speech-to-Text Engine
Uses Faster-Whisper for high-performance, efficient transcription
"""
import os
import time
import numpy as np
import soundfile as sf
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path
from threading import Lock
from faster_whisper import WhisperModel
import torch

from src.utils.logger import get_logger
from src.utils.config import load_config

logger = get_logger(__name__)
config = load_config()

class FasterWhisperSTT:
    """
    Speech-to-text engine using Faster-Whisper for efficient transcription.
    Supports multiple model sizes and hardware acceleration.
    """
    
    def __init__(
        self,
        model_size: Optional[str] = None,
        device: Optional[str] = None,
        compute_type: Optional[str] = None,
        model_dir: Optional[str] = None
    ):
        """
        Initialize Faster-Whisper STT engine.
        
        Args:
            model_size: Size of Whisper model (tiny, base, small, medium, large)
            device: Device to use (auto, cuda, cpu)
            compute_type: Compute type (auto, float16, int8_float16, int8)
            model_dir: Directory to cache models
        """
        self.model_size = model_size or config.get("faster_whisper.model_size", "base")
        
        # Determine device
        if device is None:
            device = config.get("faster_whisper.device", "auto")
            
        if device == "auto":
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device
            
        # Determine compute type
        if compute_type is None:
            compute_type = config.get("faster_whisper.compute_type", "auto")
            
        if compute_type == "auto":
            if self.device == "cuda":
                self.compute_type = "float16"
            else:
                self.compute_type = "int8"
        else:
            self.compute_type = compute_type
            
        # Set model directory
        if model_dir is None:
            model_dir = config.get("paths.models_dir", "models")
        self.model_dir = str(Path(model_dir) / "faster_whisper")
        Path(self.model_dir).mkdir(parents=True, exist_ok=True)
        
        # Set VAD parameters
        self.vad_filter = config.get("faster_whisper.vad_filter", True)
        self.vad_parameters = config.get("faster_whisper.vad_parameters", {})
        
        # Load model
        logger.info(f"Loading Faster-Whisper model '{self.model_size}' on {self.device}")
        logger.info(f"Compute type: {self.compute_type}")
        
        start_time = time.time()
        self.model = WhisperModel(
            model_size_or_path=self.model_size,
            device=self.device,
            compute_type=self.compute_type,
            download_root=self.model_dir
        )
        load_time = time.time() - start_time
        
        logger.info(f"Faster-Whisper model loaded successfully in {load_time:.2f}s")
        print(f"Speech-to-text model loaded ({load_time:.1f}s)")
        
        # Cache for transcriptions
        self.transcription_cache = {}
        self.cache_lock = Lock()
        self.cache_max_size = 100
        
    def transcribe(
        self,
        audio_path: str,
        language: Optional[str] = None,
        task: str = "transcribe",
        beam_size: Optional[int] = None,
        best_of: Optional[int] = None,
        temperature: Optional[List[float]] = None,
        vad_filter: Optional[bool] = None,
        word_timestamps: bool = True,
        condition_on_previous_text: bool = None,
        initial_prompt: Optional[str] = None,
        prefix: Optional[str] = None
    ) -> Optional[Tuple[List[Dict], str, Any]]:
        """
        Transcribe audio file with timestamps using Faster-Whisper.
        
        Returns:
            Optional[Tuple[List[Dict], str, Any]]: (segments, full_text, info)
        """
        try:
            # Check cache
            cache_key = f"{audio_path}_{language}_{task}_{self.model_size}"
            with self.cache_lock:
                if cache_key in self.transcription_cache:
                    logger.info(f"Using cached transcription for: {audio_path}")
                    return self.transcription_cache[cache_key]
                    
            # Check if audio file exists
            if not Path(audio_path).exists():
                logger.error(f"Audio file not found: {audio_path}")
                return None
                
            # Set parameters
            if beam_size is None:
                # Optimize for CPU execution (beam size 2 instead of 5 gives 3x speedup)
                default_beam = 2 if self.device == "cpu" else 5
                beam_size = config.get("faster_whisper.beam_size", default_beam)
                
            if best_of is None:
                # Optimize for CPU execution (best_of 1 avoids multiple path evaluations)
                default_best = 1 if self.device == "cpu" else 5
                best_of = config.get("faster_whisper.best_of", default_best)
                
            if temperature is None:
                temperature = config.get("faster_whisper.temperature", [0.0, 0.2, 0.4, 0.6, 0.8, 1.0])
                
            if vad_filter is None:
                vad_filter = self.vad_filter
                
            if condition_on_previous_text is None:
                condition_on_previous_text = config.get("faster_whisper.condition_on_previous_text", True)
                
            # Transcribe with options
            logger.info(f"Starting transcription for: {audio_path}")
            start_time = time.time()
            
            segments, info = self.model.transcribe(
                audio_path,
                language=language,
                task=task,
                beam_size=beam_size,
                best_of=best_of,
                temperature=temperature,
                vad_filter=vad_filter,
                vad_parameters=self.vad_parameters,
                word_timestamps=word_timestamps,
                condition_on_previous_text=condition_on_previous_text,
                initial_prompt=initial_prompt,
                prefix=prefix
            )
            
            # Process segments
            segment_list = []
            full_text = []
            
            for segment in segments:
                segment_data = {
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text.strip()
                }
                
                if word_timestamps and hasattr(segment, "words") and segment.words:
                    segment_data["words"] = [
                        {
                            "word": word.word,
                            "start": word.start,
                            "end": word.end,
                            "probability": word.probability
                        }
                        for word in segment.words
                    ]
                
                segment_list.append(segment_data)
                full_text.append(segment.text.strip())
                
            full_text_str = " ".join(full_text)
            
            transcription_time = time.time() - start_time
            logger.info(f"Transcription complete in {transcription_time:.2f}s")
            logger.info(f"Segments: {len(segment_list)}, Duration: {info.duration:.2f}s")
            
            if info:
                logger.info(f"Language: {info.language}, Probability: {info.language_probability:.2f}")
                
            # Cache result
            result = (segment_list, full_text_str, info)
            with self.cache_lock:
                self.transcription_cache[cache_key] = result
                # Limit cache size
                if len(self.transcription_cache) > self.cache_max_size:
                    # Remove oldest entries
                    keys_to_remove = list(self.transcription_cache.keys())[:self.cache_max_size // 2]
                    for key in keys_to_remove:
                        del self.transcription_cache[key]
                        
            print(f"Transcription complete: {len(segment_list)} segments")
            return result
            
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            return None
            
    def _load_audio(self, audio_path: str) -> Optional[np.ndarray]:
        """
        Load and preprocess audio file for Faster-Whisper.
        """
        try:
            audio, sr = sf.read(audio_path)
            
            if len(audio.shape) > 1:
                audio = np.mean(audio, axis=1)
                logger.debug("Converted stereo to mono")
                
            if audio.dtype != np.float32:
                audio = audio.astype(np.float32)
                
            if np.max(np.abs(audio)) > 1.0:
                audio = audio / 32768.0
                
            if sr != 16000:
                import scipy.signal as signal
                target_length = int(len(audio) * 16000 / sr)
                audio = signal.resample(audio, target_length)
                audio = audio.astype(np.float32)
                logger.debug(f"Resampled from {sr}Hz to 16000Hz")
                
            return audio
            
        except Exception as e:
            logger.error(f"Failed to load audio: {e}")
            return None
            
    def transcribe_batch(
        self,
        audio_paths: List[str],
        language: Optional[str] = None,
        task: str = "transcribe"
    ) -> List[Tuple[List[Dict], str, Any]]:
        results = []
        for i, audio_path in enumerate(audio_paths):
            logger.info(f"Processing file {i+1}/{len(audio_paths)}: {audio_path}")
            result = self.transcribe(audio_path, language, task)
            if result:
                results.append(result)
            else:
                results.append(([], "", None))
        return results
        
    def get_model_info(self) -> Dict[str, Any]:
        return {
            "model_size": self.model_size,
            "device": self.device,
            "compute_type": self.compute_type,
            "model_dir": self.model_dir,
            "vad_filter": self.vad_filter,
            "vad_parameters": self.vad_parameters,
            "cache_size": len(self.transcription_cache)
        }
        
    def clear_cache(self):
        with self.cache_lock:
            self.transcription_cache.clear()
            logger.info("Transcription cache cleared")
            
    def set_model(self, model_size: str, device: Optional[str] = None):
        logger.info(f"Changing model from '{self.model_size}' to '{model_size}'...")
        self.clear_cache()
        self.model_size = model_size
        if device:
            self.device = device
            
        self.model = WhisperModel(
            model_size_or_path=self.model_size,
            device=self.device,
            compute_type=self.compute_type,
            download_root=self.model_dir
        )
        logger.info(f"Model changed to '{model_size}' on {self.device}")
        print(f"Model changed to: {model_size}")
