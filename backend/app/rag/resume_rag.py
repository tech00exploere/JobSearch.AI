"""
Resume RAG Engine  Search & Retrieve Master Resume Evidence
================================================================
Chunks master resume experience, projects, skills, and education,
and provides fast vector / TF-IDF similarity retrieval to ground
JD analysis and tailoring without hallucination.
"""

import json
import os
import re
from typing import Dict, Any, List, Tuple


class ResumeRAGEngine:
    def __init__(self, resume_path: str = None):
        if resume_path is None:
            resume_path = os.path.join(os.path.dirname(__file__), "../data/master_resume.json")
        self.resume_path = resume_path
        self.master_data = self._load_resume()
        self.chunks = self._build_chunks()

    def _load_resume(self) -> Dict[str, Any]:
        """Loads master resume JSON profile"""
        if not os.path.exists(self.resume_path):
            raise FileNotFoundError(f"Master resume not found at {self.resume_path}")
        with open(self.resume_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _build_chunks(self) -> List[Dict[str, Any]]:
        """Chunks projects, experience, skills, and summary into searchable units"""
        chunks = []
        
        # Summary chunk
        chunks.append({
            "section": "summary",
            "title": "Professional Summary",
            "content": self.master_data.get("summary", ""),
            "tags": ["summary", "profile", "overview"]
        })

        # Skills chunks
        skills = self.master_data.get("skills", {})
        for category, item_list in skills.items():
            chunks.append({
                "section": "skills",
                "title": f"Skills: {category}",
                "content": f"Skills in {category}: {', '.join(item_list)}",
                "tags": [category] + item_list
            })

        # Project chunks
        for proj in self.master_data.get("projects", []):
            content_text = f"{proj['name']} - {proj['tagline']}. Tech Stack: {', '.join(proj['technologies'])}. " + " ".join(proj['highlights'])
            chunks.append({
                "section": "project",
                "title": f"Project: {proj['name']}",
                "content": content_text,
                "project_data": proj,
                "tags": proj["technologies"] + [proj["name"]]
            })

        # Experience chunks
        for exp in self.master_data.get("experience", []):
            content_text = f"Role: {exp['role']} at {exp['company']} ({exp['period']}). " + " ".join(exp['highlights'])
            chunks.append({
                "section": "experience",
                "title": f"Experience: {exp['role']} at {exp['company']}",
                "content": content_text,
                "experience_data": exp,
                "tags": [exp['role'], exp['company']]
            })

        return chunks

    def get_full_resume(self) -> Dict[str, Any]:
        """Returns full master resume data"""
        return self.master_data

    def search_resume_context(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Retrieves top-K relevant resume chunks using TF-IDF / term frequency matching.
        Ensures evidence retrieval for JD requirements without hallucination.
        """
        query_words = set(re.findall(r"\w+", query.lower()))
        if not query_words:
            return self.chunks[:top_k]

        scored_chunks: List[Tuple[float, Dict[str, Any]]] = []

        for chunk in self.chunks:
            chunk_text = (chunk["title"] + " " + chunk["content"] + " " + " ".join(chunk.get("tags", []))).lower()
            chunk_words = re.findall(r"\w+", chunk_text)
            
            # Simple term frequency overlap score
            score = 0.0
            for qw in query_words:
                if len(qw) < 2:
                    continue
                count = chunk_words.count(qw)
                if count > 0:
                    score += 1.0 + (count * 0.5)

            # Boost project/skill matches if exact tech matches
            for tag in chunk.get("tags", []):
                if tag.lower() in query.lower():
                    score += 3.0

            scored_chunks.append((score, chunk))

        # Sort descending by score
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        return [chunk for score, chunk in scored_chunks[:top_k]]

    def update_resume(self, new_data: Dict[str, Any]) -> None:
        """Saves new resume data to file and re-builds RAG index"""
        with open(self.resume_path, "w", encoding="utf-8") as f:
            json.dump(new_data, f, indent=2, ensure_ascii=False)
        self.master_data = new_data
        self.chunks = self._build_chunks()


# Global Singleton Instance
resume_rag_engine = ResumeRAGEngine()
