from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from app.models.novel import Novel
from app.models.chapter import Chapter
from app.models.user import User
import hashlib
import hmac
from datetime import datetime


class CopyrightProtectionService:
    """Content protection and copyright management."""

    @staticmethod
    def generate_content_fingerprint(content: str) -> str:
        """
        Generate a unique fingerprint for content.
        Uses SHA-256 hash of normalized content.
        """
        # Normalize content (remove whitespace variations)
        normalized = ' '.join(content.split())
        return hashlib.sha256(normalized.encode('utf-8')).hexdigest()

    @staticmethod
    def generate_chapter_fingerprint(chapter: Chapter) -> Dict:
        """Generate comprehensive fingerprint for a chapter."""
        if not chapter.content:
            return {"fingerprint": None, "word_count": 0}
        
        content_hash = hashlib.sha256(chapter.content.encode('utf-8')).hexdigest()
        title_hash = hashlib.md5(chapter.title.encode('utf-8')).hexdigest() if chapter.title else None
        
        word_count = len(chapter.content.split())
        
        return {
            "fingerprint": content_hash,
            "title_hash": title_hash,
            "word_count": word_count,
            "chapter_number": chapter.chapter_number,
            "created_at": chapter.created_at.isoformat() if chapter.created_at else None,
        }

    @staticmethod
    def generate_novel_fingerprint(novel: Novel) -> Dict:
        """Generate comprehensive fingerprint for an entire novel."""
        chapters = sorted(novel.chapters, key=lambda c: c.chapter_number)
        
        chapter_fingerprints = []
        total_word_count = 0
        
        for chapter in chapters:
            if chapter.content:
                fp = CopyrightProtectionService.generate_chapter_fingerprint(chapter)
                chapter_fingerprints.append(fp)
                total_word_count += fp["word_count"]
        
        # Create novel-level fingerprint from all chapter fingerprints
        combined = ''.join([fp["fingerprint"] for fp in chapter_fingerprints if fp["fingerprint"]])
        novel_fingerprint = hashlib.sha256(combined.encode('utf-8')).hexdigest() if combined else None
        
        return {
            "novel_id": novel.id,
            "novel_title": novel.title,
            "fingerprint": novel_fingerprint,
            "total_chapters": len(chapters),
            "total_word_count": total_word_count,
            "chapter_fingerprints": chapter_fingerprints,
            "generated_at": datetime.utcnow().isoformat(),
        }

    @staticmethod
    def register_copyright(
        db: Session,
        novel_id: int,
        user_id: int,
    ) -> Dict:
        """Register copyright for a novel by creating content fingerprints."""
        novel = db.query(Novel).filter(
            Novel.id == novel_id,
            Novel.user_id == user_id
        ).first()
        
        if not novel:
            return {"error": "Novel not found or not owned by user"}
        
        if not novel.chapters:
            return {"error": "Novel has no chapters to protect"}
        
        fingerprint = CopyrightProtectionService.generate_novel_fingerprint(novel)
        
        return {
            "novel_id": novel_id,
            "title": novel.title,
            "author_id": user_id,
            "copyright_fingerprint": fingerprint,
            "registered_at": datetime.utcnow().isoformat(),
            "message": "Copyright registered successfully",
        }

    @staticmethod
    def verify_content_ownership(
        db: Session,
        novel_id: int,
        content_to_check: str,
    ) -> Dict:
        """
        Verify if content matches a registered novel.
        Returns similarity score.
        """
        novel = db.query(Novel).filter(Novel.id == novel_id).first()
        if not novel:
            return {"error": "Novel not found"}
        
        # Generate fingerprint for submitted content
        submitted_fingerprint = hashlib.sha256(
            ' '.join(content_to_check.split()).encode('utf-8')
        ).hexdigest()
        
        # Check against all chapters
        matches = []
        for chapter in novel.chapters:
            if chapter.content:
                chapter_fp = hashlib.sha256(
                    ' '.join(chapter.content.split()).encode('utf-8')
                ).hexdigest()
                
                # Exact match
                if chapter_fp == submitted_fingerprint:
                    matches.append({
                        "chapter_number": chapter.chapter_number,
                        "chapter_title": chapter.title,
                        "match_type": "exact",
                        "confidence": 100.0,
                    })
                else:
                    # Check for partial match (content similarity)
                    similarity = CopyrightProtectionService._calculate_similarity(
                        content_to_check,
                        chapter.content
                    )
                    if similarity > 70:  # 70% threshold
                        matches.append({
                            "chapter_number": chapter.chapter_number,
                            "chapter_title": chapter.title,
                            "match_type": "partial",
                            "confidence": similarity,
                        })
        
        return {
            "novel_id": novel_id,
            "novel_title": novel.title,
            "submitted_fingerprint": submitted_fingerprint,
            "matches": matches,
            "total_matches": len(matches),
            "is_original": len(matches) == 0,
        }

    @staticmethod
    def _calculate_similarity(text1: str, text2: str) -> float:
        """
        Calculate text similarity percentage.
        Uses simple word overlap ratio.
        """
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        if not words1 or not words2:
            return 0.0
        
        # Jaccard similarity
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        similarity = (len(intersection) / len(union)) * 100
        return round(similarity, 2)

    @staticmethod
    def add_copyright_notice(content: str, author_name: str, year: int = None) -> str:
        """Add copyright notice to content."""
        if year is None:
            year = datetime.utcnow().year
        
        notice = f"\n\n© {year} {author_name}. All rights reserved."
        return content + notice

    @staticmethod
    def get_copyright_info(db: Session, novel_id: int) -> Dict:
        """Get copyright information for a novel."""
        novel = db.query(Novel).filter(Novel.id == novel_id).first()
        if not novel:
            return {"error": "Novel not found"}
        
        author = db.query(User).filter(User.id == novel.user_id).first()
        fingerprint = CopyrightProtectionService.generate_novel_fingerprint(novel)
        
        return {
            "novel_id": novel.id,
            "title": novel.title,
            "author": author.username if author else "Unknown",
            "created_at": novel.created_at.isoformat() if novel.created_at else None,
            "fingerprint": fingerprint,
            "copyright_notice": f"© {datetime.utcnow().year} {author.username if author else 'Unknown'}. All rights reserved.",
        }


copyright_protection_service = CopyrightProtectionService()
