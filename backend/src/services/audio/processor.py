"""
Audio Processor Module
Processes audio files for optimal transcription
"""
import os
import subprocess
import numpy as np
import soundfile as sf
from pathlib import Path
from typing import Optional, Tuple

from src.utils.logger import get_logger
logger = get_logger(__name__)

class AudioProcessor:
    """
    Processes audio files for optimal transcription.
    Handles format conversion, resampling, and normalization.
    """
    
    def __init__(self, target_sample_rate: int = 16000):
        """
        Initialize the audio processor.
        
        Args:
            target_sample_rate: Target sample rate for transcription
        """
        self.target_sample_rate = target_sample_rate
        logger.info(f"AudioProcessor initialized with target rate: {target_sample_rate}")
        
    def preprocess_audio(self, audio_path: str) -> Optional[str]:
        """
        Preprocess audio file for transcription.
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Optional[str]: Path to preprocessed audio file
        """
        try:
            # Check if file exists
            if not Path(audio_path).exists():
                logger.error(f"Audio file not found: {audio_path}")
                return None
                
            # Load audio
            try:
                audio, sr = sf.read(audio_path)
                
                # Convert to mono if stereo
                if len(audio.shape) > 1:
                    audio = np.mean(audio, axis=1)
                    logger.info("Converted stereo to mono")
                    
                # Resample if needed
                if sr != self.target_sample_rate:
                    audio = self._resample_audio(audio, sr, self.target_sample_rate)
                    logger.info(f"Resampled from {sr}Hz to {self.target_sample_rate}Hz")
            except Exception as sf_err:
                logger.info(f"soundfile failed to read ({sf_err}), trying av...")
                try:
                    import av
                    with av.open(audio_path) as container:
                        stream = container.streams.audio[0]
                        resampler = av.AudioResampler(
                            format='flt',
                            layout='mono',
                            rate=self.target_sample_rate
                        )
                        audio_frames = []
                        for frame in container.decode(stream):
                            resampled_frames = resampler.resample(frame)
                            for rf in resampled_frames:
                                audio_frames.append(rf.to_ndarray().flatten())
                        if not audio_frames:
                            raise ValueError("No audio frames decoded by av")
                        audio = np.concatenate(audio_frames)
                        sr = self.target_sample_rate
                except Exception as av_err:
                    logger.error(f"Both soundfile and av failed to read audio: {av_err}")
                    raise av_err
                
            # Normalize
            audio = self._normalize_audio(audio)
            
            # Save preprocessed audio
            output_path = str(Path(audio_path).parent / f"{Path(audio_path).stem}_processed.wav")
            sf.write(output_path, audio, self.target_sample_rate)
            
            logger.info(f"Audio preprocessed and saved to: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Failed to preprocess audio: {e}")
            return None
            
    def _resample_audio(self, audio: np.ndarray, original_sr: int, target_sr: int) -> np.ndarray:
        """
        Resample audio to target sample rate.
        
        Args:
            audio: Audio data
            original_sr: Original sample rate
            target_sr: Target sample rate
            
        Returns:
            np.ndarray: Resampled audio
        """
        try:
            import scipy.signal as signal
            number_of_samples = int(len(audio) * target_sr / original_sr)
            resampled = signal.resample(audio, number_of_samples)
            return resampled.astype(np.float32)
        except ImportError:
            # Fallback using librosa
            try:
                import librosa
                resampled = librosa.resample(
                    audio.astype(np.float32),
                    orig_sr=original_sr,
                    target_sr=target_sr
                )
                return resampled
            except ImportError:
                logger.error("Neither scipy nor librosa available for resampling")
                raise
                
    def _normalize_audio(self, audio: np.ndarray) -> np.ndarray:
        """
        Normalize audio to prevent clipping.
        
        Args:
            audio: Audio data
            
        Returns:
            np.ndarray: Normalized audio
        """
        max_val = np.max(np.abs(audio))
        if max_val > 0:
            audio = audio / max_val * 0.95
        return audio
        
    def extract_audio_from_video(self, video_path: str) -> Optional[str]:
        """
        Extract audio from video file using ffmpeg.
        
        Args:
            video_path: Path to video file
            
        Returns:
            Optional[str]: Path to extracted audio
        """
        try:
            output_path = str(Path(video_path).with_suffix('.wav'))
            
            # Check if ffmpeg is available
            try:
                subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
            except FileNotFoundError:
                logger.error("ffmpeg not found. Please install ffmpeg.")
                return None
                
            # Use ffmpeg to extract audio
            cmd = [
                'ffmpeg',
                '-i', video_path,
                '-ac', '1', # mono
                '-ar', str(self.target_sample_rate),
                '-vn', # no video
                '-y', # overwrite output
                output_path
            ]
            
            subprocess.run(cmd, check=True, capture_output=True)
            logger.info(f"Audio extracted from video: {output_path}")
            return output_path
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to extract audio: {e.stderr.decode()}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return None
            
    def get_audio_info(self, audio_path: str) -> dict:
        """
        Get information about an audio file.
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            dict: Audio information
        """
        try:
            audio, sr = sf.read(audio_path)
            return {
                "duration": len(audio) / sr,
                "sample_rate": sr,
                "channels": 1 if len(audio.shape) == 1 else audio.shape[1],
                "samples": len(audio),
                "path": audio_path
            }
        except Exception as e:
            logger.error(f"Error getting audio info: {e}")
            return {}
