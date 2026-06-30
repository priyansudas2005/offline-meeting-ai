"""
CLI Entrypoint for SAMVAD
Allows running the entire offline meeting assistant pipeline directly in the terminal without Streamlit.
"""
import os
import sys
import time
from datetime import datetime

# Add root directory to path to resolve imports
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from src.services.audio.recorder import AudioRecorder
from src.services.audio.processor import AudioProcessor
from src.services.transcription.faster_whisper import FasterWhisperSTT
from src.services.transcript.timestamp import TimestampGenerator
from src.services.database.sqlite import TranscriptDatabase
from src.services.summary.generator import MemoGenerator
from src.services.qa.system import QuestionAnswering

def run_cli():
    print("="*60)
    print("       SAMVAD - SECURE OFFLINE MEETING ASSISTANT CLI       ")
    print("="*60)
    
    # 1. Initialize all modules
    print("\n[1/4] Initializing offline modules...")
    db = TranscriptDatabase()
    processor = AudioProcessor()
    
    print("Loading Speech-to-Text model (Faster-Whisper)...")
    stt = FasterWhisperSTT()
    
    print("Loading NLP Summarizer & Q&A models...")
    memo_gen = MemoGenerator()
    qa_system = QuestionAnswering()
    
    timestamp_gen = TimestampGenerator()
    print("Modules initialized successfully.")
    
    # 2. Get Audio Input
    print("\n" + "="*40)
    print("Audio Input Selection:")
    print("1. Record live audio from microphone (using sounddevice)")
    print("2. Provide path to an existing audio file (WAV/MP3/M4A/FLAC/OGG)")
    choice = input("Select an option (1 or 2): ").strip()
    
    audio_file = None
    
    if choice == "1":
        recorder = AudioRecorder()
        input("\nPress Enter to START recording...")
        if recorder.start_recording():
            duration_input = input("Record for how many seconds? (or press Enter to record, then press Ctrl+C to stop): ").strip()
            try:
                if duration_input:
                    sleep_time = float(duration_input)
                    print(f"Recording for {sleep_time} seconds...")
                    time.sleep(sleep_time)
                else:
                    print("Recording... press Ctrl+C when finished.")
                    while True:
                        time.sleep(0.5)
            except KeyboardInterrupt:
                print("\nStopping recording...")
            
            result = recorder.stop_recording()
            if result:
                audio_file, duration = result
            else:
                print("Error: Recording failed.")
                sys.exit(1)
    elif choice == "2":
        path_input = input("\nEnter the absolute or relative path to your audio file: ").strip()
        # Remove quotes if user dragged and dropped file
        path_input = path_input.strip("\"'")
        if os.path.exists(path_input):
            audio_file = path_input
        else:
            print(f"Error: File not found at {path_input}")
            sys.exit(1)
    else:
        print("Invalid choice. Exiting.")
        sys.exit(1)
        
    if not audio_file:
        print("No audio input obtained. Exiting.")
        sys.exit(1)
        
    # 3. Process and Transcribe
    print("\n" + "="*40)
    print("[2/4] Preprocessing audio...")
    processed_audio = processor.preprocess_audio(audio_file)
    audio_to_process = processed_audio if processed_audio else audio_file
    
    print("\n[3/4] Transcribing speech to text...")
    result = stt.transcribe(audio_to_process)
    if not result:
        print("Error: Transcription failed.")
        sys.exit(1)
        
    segments, full_text, info = result
    timestamped_segments = timestamp_gen.add_timestamps(segments)
    
    # Save to SQLite Database
    meeting_id = f"MEET_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    meeting_data = {
        'meeting_id': meeting_id,
        'title': f"CLI Meeting {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        'date': datetime.now().isoformat(),
        'duration': info.duration if info else 0,
        'audio_path': audio_file,
        'metadata': {
            'model': stt.model_size,
            'language': info.language if info else 'unknown',
            'device': stt.device
        }
    }
    db.save_meeting(meeting_data)
    db.save_transcript(meeting_id, timestamped_segments)
    
    print("\n" + "="*40)
    print("TRANSCRIPT:")
    print("-" * 40)
    print(timestamp_gen.create_transcript(timestamped_segments))
    print("-" * 40)
    
    # 4. Generate Meeting Memo
    print("\n[4/4] Generating meeting minutes/memo...")
    memo = memo_gen.generate_memo(meeting_id, full_text)
    db.save_memo(meeting_id, memo)
    
    print("\n" + "="*40)
    print("MEETING MEMO:")
    print("-" * 40)
    print(memo_gen.format_memo_text(memo))
    print("-" * 40)
    
    # 5. Q&A Loop
    print("\n" + "="*40)
    print("QUESTION ANSWERING SYSTEM (Type 'exit' to quit):")
    print("You can ask questions about the meeting content.")
    print("-" * 40)
    
    while True:
        question = input("\nAsk a question: ").strip()
        if not question or question.lower() == "exit":
            break
            
        print("Finding answer...")
        answer = qa_system.answer_question(question, full_text)
        db.save_qa(meeting_id, question, answer)
        print(f"Answer: {answer}")
        
    print("\nThank you for using SAMVAD CLI! Everything has been saved locally.")

if __name__ == "__main__":
    try:
        run_cli()
    except KeyboardInterrupt:
        print("\nExiting CLI...")
