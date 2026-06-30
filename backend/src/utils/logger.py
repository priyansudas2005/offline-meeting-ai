import sys
from pathlib import Path
from loguru import logger
from src.utils.config import load_config

# Load config to configure loguru
config = load_config()
log_level = config.get("logging.level", "INFO")
log_format = config.get("logging.format", "{time:YYYY-MM-DD HH:mm:ss} | {level} | {message}")
log_dir = Path(config.get("paths.logs_dir", "logs"))
log_dir.mkdir(parents=True, exist_ok=True)

# Remove default logger and configure custom logger
logger.remove()
# Use backslashreplace errors handler on Windows standard stdout to prevent UnicodeEncodeError
logger.add(sys.stdout, format=log_format, level=log_level, backtrace=True, diagnose=True)
logger.add(
    str(log_dir / "app.log"),
    format=log_format,
    level=log_level,
    encoding="utf-8",
    rotation=config.get("logging.rotation", "10 MB"),
    retention=config.get("logging.retention", "10 days")
)

def get_logger(name: str):
    return logger.bind(name=name)
