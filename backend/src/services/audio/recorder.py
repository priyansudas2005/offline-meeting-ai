"""
Audio Recorder Module
Records meeting audio from microphone with configurable settings using sounddevice.
"""
import time
import numpy as np
import soundfile as sf
from pathlib import Path
from datetime import datetime
from typing import Optional, Tuple

from src.utils.logger import get_logger
from src.utils.config import load_config

logger = get_logger(__name__)
config = load_config()

try:
    import sounddevice as sd
    NATIVE_AUDIO_AVAILABLE = True
except Exception as e:
    NATIVE_AUDIO_AVAILABLE = False
    logger.warning(f"[{datetime.now().isoformat()}] [AudioRecorder] Native audio unavailable: {e}. Browser recording will be used.")

# Backward compatibility aliases
SOUNDDEVICE_AVAILABLE = NATIVE_AUDIO_AVAILABLE
PYAUDIO_AVAILABLE = NATIVE_AUDIO_AVAILABLE

class AudioRecorder:
    """
    Handles real-time audio recording for meetings using sounddevice.
    """
    
    def __init__(
        self,
        sample_rate: Optional[int] = None,
        channels: Optional[int] = None,
        chunk_size: Optional[int] = None
    ):
        self.sample_rate = sample_rate or config.get("audio.sample_rate", 16000)
        self.channels = channels or config.get("audio.channels", 1)
        
        self.is_recording = False
        self.frames = []
        self.stream = None
        self.start_time = None
        
        self.output_dir = Path(config.get("paths.recordings_dir", "data/recordings"))
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        if SOUNDDEVICE_AVAILABLE:
            logger.info(f"AudioRecorder initialized with rate={self.sample_rate}, channels={self.channels} (using sounddevice)")
        else:
            logger.warning("AudioRecorder initialized WITHOUT sounddevice. Microphone recording will be disabled.")
        
    def start_recording(self) -> bool:
        """
        Start recording audio from the microphone.
        """
        if not SOUNDDEVICE_AVAILABLE:
            logger.error("sounddevice is not installed. Cannot start recording.")
            return False
            
        if self.is_recording:
            logger.warning("Recording already in progress")
            return False
            
        try:
            self.is_recording = True
            self.frames = []
            self.start_time = time.time()
            
            # Callback to append audio frames
            def callback(indata, frames, time_info, status):
                if status:
                    logger.warning(f"Recording stream status: {status}")
                self.frames.append(indata.copy())
                
            self.stream = sd.InputStream(
                samplerate=self.sample_rate,
                channels=self.channels,
                dtype='int16',
                callback=callback
            )
            self.stream.start()
            
            logger.info("Recording started successfully")
            print("Recording started... Speak into your microphone.")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start recording: {e}")
            self.is_recording = False
            return False
            
    def stop_recording(self) -> Optional[Tuple[str, float]]:
        """
        Stop recording and save the audio file.
        """
        if not SOUNDDEVICE_AVAILABLE or not self.is_recording:
            return None
            
        self.is_recording = False
        
        try:
            self.stream.stop()
            self.stream.close()
        except Exception as e:
            logger.error(f"Error closing audio stream: {e}")
            
        duration = time.time() - self.start_time if self.start_time else 0
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"meeting_{timestamp}.wav"
        filepath = self.output_dir / filename
        
        try:
            if not self.frames:
                logger.warning("No audio frames recorded.")
                return None
                
            # Concatenate all recorded frames into a single numpy array
            audio_data = np.concatenate(self.frames, axis=0)
            
            # Save using soundfile
            sf.write(str(filepath), audio_data, self.sample_rate)
            
            logger.info(f"Recording saved to: {filepath} (duration: {duration:.2f}s)")
            print(f"Recording saved: {filepath}")
            print(f"Duration: {duration:.1f} seconds")
            return str(filepath), duration
            
        except Exception as e:
            logger.error(f"Failed to save recording: {e}")
            return None
            
    def get_recording_status(self) -> dict:
        return {
            "is_recording": self.is_recording,
            "duration": time.time() - self.start_time if self.start_time else 0,
            "frames_count": len(self.frames),
            "sample_rate": self.sample_rate,
            "channels": self.channels
        }
        
    def get_audio_data(self) -> Optional[np.ndarray]:
        if not self.frames:
            return None
        return np.concatenate(self.frames, axis=0)
        
    def play_recording(self, filepath: str):
        try:
            data, fs = sf.read(filepath)
            sd.play(data, fs)
            sd.wait()
        except Exception as e:
            logger.error(f"Error playing audio: {e}")
