"""
SAMVAD - Offline Meeting Assistant
A comprehensive meeting assistant with speech-to-text, memo generation, and Q&A
"""
__version__ = "1.0.0"
__author__ = "Priyansu Das"

from src.services.audio.recorder import AudioRecorder
from src.services.transcription.faster_whisper import FasterWhisperSTT
from src.services.transcript.timestamp import TimestampGenerator
from src.services.database.sqlite import TranscriptDatabase
from src.services.summary.generator import MemoGenerator
from src.services.qa.system import QuestionAnswering

__all__ = [
    "AudioRecorder",
    "FasterWhisperSTT",
    "TimestampGenerator",
    "TranscriptDatabase",
    "MemoGenerator",
    "QuestionAnswering"
]
