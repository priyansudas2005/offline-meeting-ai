import yaml
from pathlib import Path

class ConfigDict(dict):
    def get(self, key, default=None):
        if "." in key:
            parts = key.split(".")
            val = self
            for part in parts:
                if isinstance(val, dict) and part in val:
                    val = val[part]
                else:
                    return default
            return val
        return super().get(key, default)

def load_config():
    # Look for config.yaml in standard locations
    # Base directory is determined relative to this file or cwd
    possible_paths = [
        Path("config/config.yaml"),
        Path("../config/config.yaml"),
        Path("src/config/config.yaml"),
        Path(__file__).parent.parent.parent / "config/config.yaml",
        Path(__file__).parent.parent / "config/config.yaml"
    ]
    for path in possible_paths:
        if path.exists():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f)
                    return ConfigDict(data or {})
            except Exception:
                pass
    # Fallback default config if file not found
    return ConfigDict({
        "project": {"name": "SAMVAD", "version": "1.0.0", "author": "Priyansu Das"},
        "paths": {
            "base_dir": ".",
            "recordings_dir": "data/recordings",
            "database_dir": "data/database",
            "models_dir": "models",
            "logs_dir": "logs"
        },
        "audio": {
            "sample_rate": 16000,
            "channels": 1,
            "chunk_size": 1024
        },
        "faster_whisper": {
            "model_size": "base",
            "device": "auto",
            "compute_type": "auto",
            "vad_filter": True
        },
        "database": {
            "name": "transcripts.db"
        },
        "memo": {
            "summary_max_length": 150,
            "summary_min_length": 50,
            "max_action_items": 5,
            "max_key_points": 5
        },
        "qa": {
            "model": "distilbert-base-cased-distilled-squad",
            "max_context_length": 512,
            "confidence_threshold": 0.1
        }
    })
