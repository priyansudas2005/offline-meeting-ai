"""
Timestamp Generator Module
Creates formatted timestamps for transcript segments
"""
from datetime import timedelta
from typing import List, Dict

from src.utils.logger import get_logger
logger = get_logger(__name__)

class TimestampGenerator:
    """
    Generates formatted timestamps for transcript segments.
    """
    
    @staticmethod
    def format_time(seconds: float) -> str:
        """
        Convert seconds to HH:MM:SS format.
        
        Args:
            seconds: Time in seconds
            
        Returns:
            str: Formatted time string
        """
        return str(timedelta(seconds=int(seconds)))
        
    @staticmethod
    def format_time_ms(seconds: float) -> str:
        """
        Convert seconds to HH:MM:SS.mmm format.
        
        Args:
            seconds: Time in seconds
            
        Returns:
            str: Formatted time string with milliseconds
        """
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        seconds_remainder = seconds % 60
        return f"{hours:02d}:{minutes:02d}:{seconds_remainder:06.3f}"
        
    @staticmethod
    def add_timestamps(segments: List[Dict]) -> List[Dict]:
        """
        Add formatted timestamps to transcript segments.
        
        Args:
            segments: List of transcript segments
            
        Returns:
            List[Dict]: Segments with formatted timestamps
        """
        timestamped = []
        for segment in segments:
            start = TimestampGenerator.format_time(segment.get("start", 0))
            end = TimestampGenerator.format_time(segment.get("end", 0))
            
            timestamped.append({
                "start": start,
                "end": end,
                "start_seconds": segment.get("start", 0),
                "end_seconds": segment.get("end", 0),
                "text": segment.get("text", "").strip(),
                "words": segment.get("words", [])
            })
            
        logger.debug(f"Added timestamps to {len(timestamped)} segments")
        return timestamped
        
    @staticmethod
    def create_transcript(segments: List[Dict]) -> str:
        """
        Generate full transcript with timestamps in text format.
        
        Args:
            segments: List of transcript segments
            
        Returns:
            str: Formatted transcript with timestamps
        """
        if not segments:
            return "No transcript available"
            
        lines = []
        for segment in segments:
            start = segment.get("start", "0:00")
            end = segment.get("end", "0:00")
            text = segment.get("text", "")
            lines.append(f"[{start} - {end}] {text}")
        return "\n".join(lines)
        
    @staticmethod
    def create_compact_transcript(segments: List[Dict]) -> str:
        """
        Generate compact transcript with timestamps.
        
        Args:
            segments: List of transcript segments
            
        Returns:
            str: Compact transcript with timestamps
        """
        if not segments:
            return "No transcript available"
            
        lines = []
        for segment in segments:
            start = segment.get("start", "0:00")
            text = segment.get("text", "")
            lines.append(f"[{start}] {text}")
        return "\n".join(lines)
        
    @staticmethod
    def generate_srt(segments: List[Dict]) -> str:
        """
        Generate SRT subtitle format.
        
        Args:
            segments: List of transcript segments
            
        Returns:
            str: SRT formatted subtitles
        """
        if not segments:
            return ""
            
        srt_lines = []
        for i, segment in enumerate(segments, 1):
            start = TimestampGenerator.format_time_ms(segment.get("start_seconds", 0)).replace('.', ',')
            end = TimestampGenerator.format_time_ms(segment.get("end_seconds", 0)).replace('.', ',')
            text = segment.get("text", "")
            
            srt_lines.append(str(i))
            srt_lines.append(f"{start} --> {end}")
            srt_lines.append(text)
            srt_lines.append("")
            
        return "\n".join(srt_lines)
        
    @staticmethod
    def generate_vtt(segments: List[Dict]) -> str:
        """
        Generate WebVTT subtitle format.
        
        Args:
            segments: List of transcript segments
            
        Returns:
            str: WebVTT formatted subtitles
        """
        if not segments:
            return "WEBVTT\n\n"
            
        vtt_lines = ["WEBVTT", ""]
        for segment in segments:
            start = TimestampGenerator.format_time_ms(segment.get("start_seconds", 0))
            end = TimestampGenerator.format_time_ms(segment.get("end_seconds", 0))
            text = segment.get("text", "")
            
            vtt_lines.append(f"{start} --> {end}")
            vtt_lines.append(text)
            vtt_lines.append("")
            
        return "\n".join(vtt_lines)

    @staticmethod
    def generate_transcript_with_timestamps(segments: List[Dict]) -> str:
        """
        Generate full transcript with timestamps (called during export).
        """
        return TimestampGenerator.create_transcript(segments)
