<div align="center">

# 🎙️ SAMVAD

### Secure Offline AI Meeting Assistant

An intelligent offline meeting assistant that records meetings, transcribes speech, generates meeting minutes, and answers questions from discussions — **without requiring an internet connection**.

![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)
![Platform](https://img.shields.io/badge/Platform-Windows-lightgrey)
![Offline](https://img.shields.io/badge/Mode-Offline-success)
![SQLite](https://img.shields.io/badge/Database-SQLite-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

**Developed for secure and privacy-sensitive meeting environments**

</div>

---

# 📖 Overview

**SAMVAD** (Secure Offline AI Meeting Assistant) is an AI-powered desktop application designed to assist organizations where meeting confidentiality is essential.

Unlike cloud-based meeting assistants, SAMVAD performs all processing locally, ensuring that sensitive meeting data never leaves the user's system.

The project is being developed as part of a technical internship with a focus on secure, offline AI-powered meeting intelligence.

---

# 🎯 Project Objectives

The primary objectives of SAMVAD are to:

- 🎤 Record meeting audio
- 📝 Convert speech into text
- ⏱ Generate timestamped transcripts
- 📄 Automatically generate meeting minutes
- ❓ Answer questions based on meeting discussions
- 💾 Store transcripts locally using SQLite
- 🔒 Operate completely offline

---

# ✨ Planned Features

### 🎤 Audio Capture
- Record meeting audio
- Import existing audio files

### 📝 Speech Recognition
- Offline speech-to-text using Faster-Whisper
- Timestamp generation

### 📄 Meeting Intelligence
- Automatic meeting summary
- Meeting minutes generation
- Key discussion extraction
- Action item generation

### ❓ Question Answering
- Ask questions from previous meetings
- Retrieve important decisions
- Search meeting transcripts

### 💾 Local Storage
- SQLite database
- Local transcript history
- Secure offline storage

### 🔒 Security
- Fully offline processing
- No cloud dependency
- No external API required

---

# 🏗️ System Architecture

```text
                  Meeting Audio
                        │
                        ▼
             Audio Capture Module
                        │
                        ▼
        Offline Speech Recognition
                        │
                        ▼
          Timestamped Transcript
                        │
                        ▼
              SQLite Database
                        │
                        ▼
         Meeting Memo Generator
                        │
                        ▼
         Question Answering Module
```

---

# 📂 Project Structure

```text
SAMVAD/
│
├── src/
│   ├── api/
│   ├── auth/
│   ├── config/
│   ├── models/
│   ├── services/
│   ├── tasks/
│   ├── utils/
│   ├── app.py
│   ├── database.py
│   └── audio_chunking.py
│
├── static/
├── templates/
├── requirements.txt
├── README.md
└── LICENSE
```

---

# 🛠️ Technology Stack

| Category | Technology |
|-----------|------------|
| Programming Language | Python |
| Speech Recognition | Faster-Whisper *(planned)* |
| NLP | Transformers *(planned)* |
| Database | SQLite |
| User Interface | Streamlit / Tkinter *(planned)* |
| Audio Processing | FFmpeg, PyAudio *(planned)* |

---

# ⚙️ Installation

Clone the repository:

```bash
git clone https://github.com/priyansudas2005/SAMVAD.git
```

Navigate to the project directory:

```bash
cd SAMVAD
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the application:

```bash
python src/app.py
```

---

# 🚀 Development Roadmap

- [x] Repository setup
- [x] Initial project structure
- [ ] Offline speech recognition
- [ ] Timestamp generation
- [ ] SQLite transcript storage
- [ ] Meeting memo generator
- [ ] Question answering module
- [ ] Desktop interface improvements
- [ ] Export transcript & memo
- [ ] Documentation and screenshots

---

# 📸 Screenshots

Screenshots will be added as development progresses.

---

# 🤝 Contributing

Contributions, suggestions, and feedback are welcome.

Please open an issue or submit a pull request if you would like to contribute.

---

# 📄 License

This repository includes work derived from an existing open-source project and is being extended into **SAMVAD**, an offline AI meeting assistant for secure meeting environments.

Please refer to the **LICENSE** file for licensing information.

---

<div align="center">

### ⭐ If you find this project interesting, consider giving it a star!

**Made with ❤️ using Python**

</div>
