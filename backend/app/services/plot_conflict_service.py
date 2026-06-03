from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from app.core.ai_provider import get_ai_provider
from app.models.novel import Novel
from app.models.chapter import Chapter
import re
import json


class PlotConflictDetector:
    """AI-powered plot conflict detection service."""

    async def detect_plot_conflicts(
        self,
        db: Session,
        novel_id: int,
        language: str = "en",
    ) -> Dict:
        """Detect plot conflicts in a novel using AI analysis."""
        novel = db.query(Novel).filter(Novel.id == novel_id).first()
        if not novel:
            return {"conflicts": [], "error": "Novel not found"}

        # Get all chapters
        chapters = (
            db.query(Chapter)
            .filter(Chapter.novel_id == novel_id)
            .order_by(Chapter.chapter_number)
            .all()
        )

        if len(chapters) < 2:
            return {"conflicts": [], "message": "Need at least 2 chapters for conflict detection"}

        # Build chapter summaries for analysis
        chapter_data = []
        for chapter in chapters:
            # Get first 500 chars as summary
            summary = chapter.content[:500] if chapter.content else ""
            chapter_data.append({
                "chapter_number": chapter.chapter_number,
                "title": chapter.title,
                "summary": summary,
            })

        # Prepare prompt for AI analysis
        chapters_text = "\n\n".join([
            f"Chapter {c['chapter_number']}: {c['title']}\n{c['summary']}"
            for c in chapter_data
        ])

        prompt = f"""You are an expert fiction editor and plot analyst. Analyze the following novel chapters for plot conflicts and inconsistencies.

NOVEL INFO:
- Title: {novel.title}
- Genre: {novel.genre or 'Not specified'}
- Theme: {novel.theme_description[:200] if novel.theme_description else 'Not specified'}

CHAPTERS:
{chapters_text}

Check for the following types of conflicts:

1. **Timeline Errors**: Events happening in impossible order, time contradictions
2. **Character Inconsistencies**: Characters acting against established traits, sudden unexplained changes
3. **Logic Gaps**: Plot holes, unexplained events, missing cause-and-effect
4. **Setting Contradictions**: Location/rule changes without explanation
5. **Plot Continuity**: Forgotten plot threads, unresolved storylines

For each conflict found, provide:
- Type of conflict
- Which chapters are involved
- Detailed description
- Severity (low/medium/high)
- Suggested fix

Return JSON format:
{{
  "conflicts": [
    {{
      "type": "timeline/character/logic/setting/continuity",
      "chapters_involved": [1, 2],
      "description": "detailed description of the conflict",
      "severity": "low/medium/high",
      "suggestion": "how to fix it"
    }}
  ],
  "total_conflicts": 0,
  "summary": "overall assessment"
}}"""

        try:
            provider = get_ai_provider()
            response = await provider.generate(
                prompt=prompt,
                context={"system_message": "You are an expert fiction editor. Provide specific, actionable conflict analysis."},
                config={"temperature": 0.3, "max_tokens": 1500},
            )
            
            # Parse JSON response
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                return json.loads(json_match.group())
            else:
                return {"conflicts": [], "message": "Could not parse analysis results"}
        except Exception as e:
            return {"conflicts": [], "error": str(e)}

    async def check_character_consistency(
        self,
        db: Session,
        novel_id: int,
        character_name: str,
        language: str = "en",
    ) -> Dict:
        """Check if a specific character is consistent throughout the novel."""
        novel = db.query(Novel).filter(Novel.id == novel_id).first()
        if not novel:
            return {"issues": [], "error": "Novel not found"}

        chapters = (
            db.query(Chapter)
            .filter(Chapter.novel_id == novel_id)
            .order_by(Chapter.chapter_number)
            .all()
        )

        # Find mentions of the character
        character_mentions = []
        for chapter in chapters:
            if chapter.content and character_name.lower() in chapter.content.lower():
                # Get context around mentions
                content_lower = chapter.content.lower()
                idx = content_lower.find(character_name.lower())
                context_start = max(0, idx - 200)
                context_end = min(len(chapter.content), idx + 300)
                context = chapter.content[context_start:context_end]
                
                character_mentions.append({
                    "chapter": chapter.chapter_number,
                    "context": context,
                })

        if len(character_mentions) < 2:
            return {
                "issues": [],
                "message": f"Not enough mentions of '{character_name}' for analysis",
                "mention_count": len(character_mentions),
            }

        mentions_text = "\n\n".join([
            f"Chapter {m['chapter']}:\n{m['context']}"
            for m in character_mentions
        ])

        prompt = f"""Analyze the character '{character_name}' for consistency across these chapter excerpts.

Character mentions in novel "{novel.title}":
{mentions_text}

Check for:
1. Personality changes without explanation
2. Skill/ability inconsistencies
3. Relationship changes
4. Motivation contradictions
5. Speech pattern consistency

Return JSON format:
{{
  "character": "{character_name}",
  "issues": [
    {{
      "type": "personality/skill/relationship/motivation/speech",
      "description": "detailed issue",
      "chapters": [1, 3],
      "severity": "low/medium/high"
    }}
  ],
  "consistency_score": 85
}}"""

        try:
            provider = get_ai_provider()
            response = await provider.generate(
                prompt=prompt,
                context={"system_message": "You are a character development analyst. Identify inconsistencies in character portrayal."},
                config={"temperature": 0.3, "max_tokens": 1000},
            )
            
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                return json.loads(json_match.group())
            else:
                return {"issues": [], "message": "Could not parse analysis"}
        except Exception as e:
            return {"issues": [], "error": str(e)}

    async def validate_timeline(
        self,
        db: Session,
        novel_id: int,
        language: str = "en",
    ) -> Dict:
        """Validate the timeline of events in the novel."""
        novel = db.query(Novel).filter(Novel.id == novel_id).first()
        if not novel:
            return {"issues": [], "error": "Novel not found"}

        chapters = (
            db.query(Chapter)
            .filter(Chapter.novel_id == novel_id)
            .order_by(Chapter.chapter_number)
            .all()
        )

        chapters_text = "\n\n".join([
            f"Chapter {c.chapter_number}: {c.title}\n{c.content[:500] if c.content else ''}"
            for c in chapters
        ])

        prompt = f"""Analyze the timeline and chronology of events in this novel for inconsistencies.

NOVEL: {novel.title}
{chapters_text}

Look for:
1. Impossible time jumps
2. Events happening out of order
3. Contradictory time references
4. Seasonal/weather inconsistencies
5. Age/progression issues

Return JSON format:
{{
  "timeline_issues": [
    {{
      "type": "time_jump/order/contradiction/seasonal/age",
      "description": "detailed issue",
      "chapters": [1, 2],
      "severity": "low/medium/high",
      "suggestion": "how to fix"
    }}
  ],
  "timeline_valid": true
}}"""

        try:
            provider = get_ai_provider()
            response = await provider.generate(
                prompt=prompt,
                context={"system_message": "You are a timeline continuity expert. Identify chronological inconsistencies."},
                config={"temperature": 0.3, "max_tokens": 1200},
            )
            
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                return json.loads(json_match.group())
            else:
                return {"timeline_issues": [], "message": "Could not parse analysis"}
        except Exception as e:
            return {"timeline_issues": [], "error": str(e)}


plot_conflict_detector = PlotConflictDetector()
