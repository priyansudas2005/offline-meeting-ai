import sys
import subprocess
from pathlib import Path

def main():
    app_path = Path(__file__).parent / "src/ui/app.py"
    if not app_path.exists():
        print(f"Error: Could not find application entrypoint at {app_path}")
        sys.exit(1)
        
    # Determine the streamlit command path inside the venv if available
    # For Windows, check venv/Scripts/streamlit.exe
    venv_streamlit = Path(__file__).parent / "venv/Scripts/streamlit.exe"
    if venv_streamlit.exists():
        streamlit_cmd = str(venv_streamlit)
    else:
        streamlit_cmd = "streamlit"
        
    try:
        # Run streamlit application
        cmd = [streamlit_cmd, "run", str(app_path)]
        print(f"Launching SAMVAD Offline Meeting Assistant using {streamlit_cmd}...")
        subprocess.run(cmd)
    except KeyboardInterrupt:
        print("\nStopping SAMVAD Offline Meeting Assistant...")
        sys.exit(0)
    except Exception as e:
        print(f"Error running application: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
