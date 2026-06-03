from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from app.core.ai_provider import get_ai_provider
from app.models.novel import Novel
from app.models.chapter import Chapter
import re
import json


class CharacterRelationshipAnalyzer:
    """AI-powered character relationship analysis and graph generation."""

    async def analyze_relationships(
        self,
        db: Session,
        novel_id: int,
        language: str = "en",
    ) -> Dict:
        """Analyze character relationships throughout the novel."""
        novel = db.query(Novel).filter(Novel.id == novel_id).first()
        if not novel:
            return {"characters": [], "relationships": [], "error": "Novel not found"}

        chapters = (
            db.query(Chapter)
            .filter(Chapter.novel_id == novel_id)
            .order_by(Chapter.chapter_number)
            .all()
        )

        if not chapters:
            return {"characters": [], "relationships": [], "message": "No chapters to analyze"}

        # Build text from chapters
        chapters_text = "\n\n".join([
            f"Chapter {c.chapter_number}: {c.title}\n{c.content[:1000] if c.content else ''}"
            for c in chapters
        ])

        prompt = f"""Analyze the character relationships in this novel and create a relationship graph.

NOVEL: {novel.title}
Genre: {novel.genre or 'Not specified'}

CHAPTERS:
{chapters_text}

Identify:
1. **All main characters** with brief descriptions
2. **Relationships between characters** with:
   - Relationship type (family, friend, enemy, romantic, mentor, rival, ally, etc.)
   - Strength of relationship (strong, moderate, weak)
   - Evolution (how it changes throughout the story)
   - Key moments that define the relationship

Return JSON format:
{{
  "characters": [
    {{
      "name": "Character Name",
      "role": "protagonist/antagonist/supporting/mentor",
      "description": "Brief character description",
      "importance": "main/supporting/minor"
    }}
  ],
  "relationships": [
    {{
      "character1": "Name",
      "character2": "Name",
      "type": "family/friend/enemy/romantic/mentor/rival/ally/colleague",
      "strength": "strong/moderate/weak",
      "evolution": "how the relationship changes",
      "description": "brief description of relationship",
      "key_moments": ["moment 1", "moment 2"]
    }}
  ],
  "relationship_summary": "overall summary of character dynamics"
}}"""

        try:
            provider = get_ai_provider()
            response = await provider.generate(
                prompt=prompt,
                context={"system_message": "You are a character relationship analyst. Create a comprehensive relationship map."},
                config={"temperature": 0.3, "max_tokens": 2000},
            )
            
            # Parse JSON response
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                return json.loads(json_match.group())
            else:
                return {"characters": [], "relationships": [], "message": "Could not parse analysis"}
        except Exception as e:
            return {"characters": [], "relationships": [], "error": str(e)}

    async def track_relationship_evolution(
        self,
        db: Session,
        novel_id: int,
        character1: str,
        character2: str,
        language: str = "en",
    ) -> Dict:
        """Track how a specific relationship evolves through the chapters."""
        novel = db.query(Novel).filter(Novel.id == novel_id).first()
        if not novel:
            return {"evolution": [], "error": "Novel not found"}

        chapters = (
            db.query(Chapter)
            .filter(Chapter.novel_id == novel_id)
            .order_by(Chapter.chapter_number)
            .all()
        )

        # Find chapters where both characters appear
        relationship_chapters = []
        for chapter in chapters:
            if chapter.content:
                content_lower = chapter.content.lower()
                if character1.lower() in content_lower and character2.lower() in content_lower:
                    relationship_chapters.append({
                        "chapter_number": chapter.chapter_number,
                        "title": chapter.title,
                        "excerpt": chapter.content[:500],
                    })

        if len(relationship_chapters) < 2:
            return {
                "evolution": [],
                "message": f"Not enough interactions between '{character1}' and '{character2}'",
                "chapter_count": len(relationship_chapters),
            }

        chapters_text = "\n\n".join([
            f"Chapter {c['chapter_number']}: {c['title']}\n{c['excerpt']}"
            for c in relationship_chapters
        ])

        prompt = f"""Track the evolution of the relationship between {character1} and {character2} through these chapters.

CHAPTERS WITH BOTH CHARACTERS:
{chapters_text}

For each chapter, identify:
1. The state of their relationship
2. Key interactions or events
3. Emotional tone (positive, negative, neutral, conflicted)
4. How the relationship changes from previous chapter

Return JSON format:
{{
  "character1": "{character1}",
  "character2": "{character2}",
  "evolution": [
    {{
      "chapter": 1,
      "relationship_state": "description",
      "key_interaction": "what happens between them",
      "emotional_tone": "positive/negative/neutral/conflicted",
      "change": "how it evolved"
    }}
  ],
  "overall_arc": "summary of the relationship journey",
  "final_state": "where they end up"
}}"""

        try:
            provider = get_ai_provider()
            response = await provider.generate(
                prompt=prompt,
                context={"system_message": "You are tracking relationship evolution. Identify how connections change over time."},
                config={"temperature": 0.3, "max_tokens": 1500},
            )
            
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                return json.loads(json_match.group())
            else:
                return {"evolution": [], "message": "Could not parse analysis"}
        except Exception as e:
            return {"evolution": [], "error": str(e)}

    async def get_character_network(
        self,
        db: Session,
        novel_id: int,
        focus_character: str,
        language: str = "en",
    ) -> Dict:
        """Get relationship network centered on a specific character."""
        novel = db.query(Novel).filter(Novel.id == novel_id).first()
        if not novel:
            return {"network": [], "error": "Novel not found"}

        chapters = (
            db.query(Chapter)
            .filter(Chapter.novel_id == novel_id)
            .order_by(Chapter.chapter_number)
            .all()
        )

        chapters_text = "\n\n".join([
            f"Chapter {c.chapter_number}: {c.title}\n{c.content[:800] if c.content else ''}"
            for c in chapters
        ])

        prompt = f"""Create a relationship network for the character '{focus_character}' in this novel.

NOVEL: {novel.title}
{chapters_text}

Identify all characters that '{focus_character}' interacts with and describe:
1. Who they are
2. Nature of their relationship
3. How they interact
4. Importance to the story

Return JSON format:
{{
  "focus_character": "{focus_character}",
  "network": [
    {{
      "character": "Name",
      "relationship_type": "type",
      "importance_to_focus": "high/medium/low",
      "interaction_frequency": "frequent/occasional/rare",
      "relationship_quality": "positive/negative/complex/neutral",
      "description": "detailed description"
    }}
  ],
  "network_summary": "overview of character's social connections"
}}"""

        try:
            provider = get_ai_provider()
            response = await provider.generate(
                prompt=prompt,
                context={"system_message": "You are mapping a character's social network. Identify all connections."},
                config={"temperature": 0.3, "max_tokens": 1500},
            )
            
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                return json.loads(json_match.group())
            else:
                return {"network": [], "message": "Could not parse analysis"}
        except Exception as e:
            return {"network": [], "error": str(e)}


character_relationship_analyzer = CharacterRelationshipAnalyzer()
