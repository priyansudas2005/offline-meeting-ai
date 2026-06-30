import json
import csv
import io
from typing import List, Dict, Any

class ExportEngine:
    @staticmethod
    def to_txt(meeting_title: str, segments: List[Dict[str, Any]], memo: Dict[str, Any] = None) -> str:
        output = []
        output.append(f"=== MEETING TRANSCRIPT: {meeting_title} ===")
        output.append("\n")
        
        if memo:
            output.append("--- EXECUTIVE SUMMARY ---")
            output.append(memo.get("summary", "No summary generated."))
            output.append("\n")
            
            if memo.get("action_items"):
                output.append("--- ACTION ITEMS ---")
                for item in memo["action_items"]:
                    output.append(f"- [ ] {item}")
                output.append("\n")
                
            if memo.get("decisions"):
                output.append("--- KEY DECISIONS ---")
                for dec in memo["decisions"]:
                    output.append(f"• {dec}")
                output.append("\n")
        
        output.append("--- TRANSCRIPT DETAIL ---")
        for seg in segments:
            output.append(f"[{seg.get('start', '00:00')} - {seg.get('end', '00:00')}]")
            output.append(f"Speaker {seg.get('id', 1)}: {seg.get('text', '')}")
            output.append("")
            
        return "\n".join(output)

    @staticmethod
    def to_markdown(meeting_title: str, date_str: str, segments: List[Dict[str, Any]], memo: Dict[str, Any] = None) -> str:
        output = []
        output.append(f"# 🎙️ Meeting Memo: {meeting_title}")
        output.append(f"**Date:** {date_str}  ")
        output.append("\n---")
        
        if memo:
            output.append("## 📄 Executive Summary")
            output.append(memo.get("summary", "No summary generated."))
            output.append("\n")
            
            if memo.get("action_items"):
                output.append("## 🟩 Tasks & Action Items")
                for item in memo["action_items"]:
                    output.append(f"- [ ] {item}")
                output.append("\n")
                
            if memo.get("decisions"):
                output.append("## 🔮 Key Decisions")
                for dec in memo["decisions"]:
                    output.append(f"• {dec}")
                output.append("\n")
                
            if memo.get("key_points"):
                output.append("## 💡 Key Highlights")
                for pt in memo["key_points"]:
                    output.append(f"- {pt}")
                output.append("\n---")
        
        output.append("## 📝 Detailed Transcript")
        output.append("\n")
        for seg in segments:
            output.append(f"**[{seg.get('start', '00:00')} - {seg.get('end', '00:00')}]**  ")
            output.append(f"*Speaker {seg.get('id', 1)}:* {seg.get('text', '')}  ")
            output.append("")
            
        return "\n".join(output)

    @staticmethod
    def to_csv(segments: List[Dict[str, Any]]) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Start Seconds", "End Seconds", "Start Timestamp", "End Timestamp", "Speaker", "Text"])
        for seg in segments:
            writer.writerow([
                seg.get("start_seconds", 0.0),
                seg.get("end_seconds", 0.0),
                seg.get("start", "00:00"),
                seg.get("end", "00:00"),
                f"Speaker {seg.get('id', 1)}",
                seg.get("text", "")
            ])
        return output.getvalue()

    @staticmethod
    def to_srt(segments: List[Dict[str, Any]]) -> str:
        output = []
        for idx, seg in enumerate(segments, 1):
            start_sec = seg.get("start_seconds", 0.0)
            end_sec = seg.get("end_seconds", 0.0)
            
            # Format time as hh:mm:ss,ms
            def fmt_time(seconds):
                h = int(seconds // 3600)
                m = int((seconds % 3600) // 60)
                s = int(seconds % 60)
                ms = int((seconds % 1) * 1000)
                return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
            
            output.append(str(idx))
            output.append(f"{fmt_time(start_sec)} --> {fmt_time(end_sec)}")
            output.append(seg.get("text", ""))
            output.append("")
            
        return "\n".join(output)
