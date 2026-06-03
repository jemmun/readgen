from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from app.core.ai_provider import get_ai_provider
from app.models.novel import Novel
from app.models.chapter import Chapter
import asyncio
import json
import re


class WritingAssistantService:
    """AI Writing Assistant - provides real-time suggestions during writing."""

    def _parse_json_response(self, response: str) -> Dict:
        """Parse JSON from AI response."""
        try:
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                return json.loads(json_match.group())
            return {}
        except:
            return {}

    async def get_continuation_suggestions(
        self,
        db: Session,
        novel_id: int,
        chapter_id: int,
        current_text: str,
        language: str = "en",
    ) -> Dict:
        """Get AI suggestions for continuing the current text."""
        # Get novel and chapter context
        novel = db.query(Novel).filter(Novel.id == novel_id).first()
        chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
        
        if not novel or not chapter:
            return {"suggestions": [], "error": "Novel or chapter not found"}

        prompt = f"""You are a creative writing assistant. The author is currently writing Chapter {chapter.chapter_number}: "{chapter.title}"

NOVEL CONTEXT:
- Genre: {novel.genre or 'Not specified'}
- Style: {novel.style or 'Not specified'}
- Theme: {novel.theme_description[:200] if novel.theme_description else 'Not specified'}

CURRENT TEXT (last 500 characters):
{current_text[-500:] if len(current_text) > 500 else current_text}

Please provide 3 different continuation suggestions (each 2-4 sentences) that would naturally follow this text. Consider:
1. Plot development options
2. Character development opportunities
3. Scene transitions

Return JSON format:
{{
  "suggestions": [
    {{
      "text": "continuation text",
      "type": "plot/character/scene",
      "description": "brief explanation of direction"
    }}
  ]
}}"""

        try:
            provider = get_ai_provider()
            response = await provider.generate(
                prompt=prompt,
                context={"system_message": "You are an expert creative writing assistant. Provide helpful, creative suggestions."},
                config={"temperature": 0.8, "max_tokens": 500},
            )
            return self._parse_json_response(response)
        except Exception as e:
            return {"suggestions": [], "error": str(e)}

    async def get_plot_development_ideas(
        self,
        db: Session,
        novel_id: int,
        current_chapter_num: int,
        language: str = "en",
    ) -> Dict:
        """Get plot development ideas for the novel."""
        novel = db.query(Novel).filter(Novel.id == novel_id).first()
        if not novel:
            return {"ideas": [], "error": "Novel not found"}

        # Get all chapters for context
        chapters = (
            db.query(Chapter)
            .filter(Chapter.novel_id == novel_id)
            .order_by(Chapter.chapter_number)
            .all()
        )

        recent_chapters = chapters[-3:] if len(chapters) >= 3 else chapters
        chapter_summaries = "\n".join([
            f"Chapter {c.chapter_number}: {c.title}" for c in recent_chapters
        ])

        prompt = f"""You are a plot development consultant for a {novel.genre or 'fiction'} novel.

NOVEL INFO:
- Title: {novel.title}
- Genre: {novel.genre or 'Not specified'}
- Theme: {novel.theme_description[:200] if novel.theme_description else 'Not specified'}
- Current Progress: Chapter {current_chapter_num} of ~{novel.max_chapters} chapters

RECENT CHAPTERS:
{chapter_summaries}

Suggest 5 plot development ideas for the next chapters. Each idea should:
1. Advance the main plot
2. Create interesting conflicts or challenges
3. Develop characters
4. Maintain reader engagement

Return JSON format:
{{
  "ideas": [
    {{
      "title": "idea title",
      "description": "2-3 sentence description",
      "chapter_suggestion": "which chapter(s) this could span",
      "impact": "plot/character/world-building"
    }}
  ]
}}"""

        try:
            provider = get_ai_provider()
            response = await provider.generate(
                prompt=prompt,
                context={"system_message": "You are an expert plot consultant. Provide creative, actionable plot development ideas."},
                config={"temperature": 0.9, "max_tokens": 800},
            )
            return self._parse_json_response(response)
        except Exception as e:
            return {"ideas": [], "error": str(e)}

    async def get_writing_improvement_suggestions(
        self,
        db: Session,
        text: str,
        language: str = "en",
    ) -> Dict:
        """Get suggestions to improve writing quality."""
        if len(text) < 100:
            return {"suggestions": [], "message": "Text too short for analysis"}

        prompt = f"""You are a professional writing editor. Analyze the following text and provide constructive feedback.

TEXT TO ANALYZE:
{text[:1000] if len(text) > 1000 else text}

Please provide:
1. Overall quality assessment
2. Specific improvement suggestions (style, pacing, description, dialogue)
3. Strengths to maintain
4. One rewrite example showing an improvement

Return JSON format:
{{
  "overall_rating": "1-5 stars",
  "strengths": ["strength 1", "strength 2"],
  "improvements": [
    {{
      "type": "style/pacing/description/dialogue",
      "suggestion": "specific suggestion",
      "example": "optional example"
    }}
  ],
  "rewrite_example": {{
    "original": "snippet from original",
    "improved": "improved version",
    "explanation": "why this is better"
  }}
}}"""

        try:
            provider = get_ai_provider()
            response = await provider.generate(
                prompt=prompt,
                context={"system_message": "You are a professional writing editor. Provide constructive, specific feedback."},
                config={"temperature": 0.3, "max_tokens": 600},
            )
            return self._parse_json_response(response)
        except Exception as e:
            return {"suggestions": [], "error": str(e)}

    async def generate_scene_prompts(
        self,
        db: Session,
        novel_id: int,
        scene_type: str = "any",
        language: str = "en",
    ) -> Dict:
        """Generate creative scene prompts to inspire writing."""
        novel = db.query(Novel).filter(Novel.id == novel_id).first()
        if not novel:
            return {"prompts": [], "error": "Novel not found"}

        scene_types = {
            "conflict": "Create a tense conflict scene",
            "romance": "Create a romantic or emotional scene",
            "action": "Create an action-packed scene",
            "mystery": "Create a mysterious or suspenseful scene",
            "character": "Create a character development scene",
            "world": "Create a world-building or setting scene",
            "any": "Create any type of engaging scene",
        }

        scene_instruction = scene_types.get(scene_type, scene_types["any"])

        prompt = f"""You are a creative scene generator for a {novel.genre or 'fiction'} novel.

NOVEL CONTEXT:
- Title: {novel.title}
- Genre: {novel.genre or 'Not specified'}
- Style: {novel.style or 'Not specified'}
- Theme: {novel.theme_description[:200] if novel.theme_description else 'Not specified'}

{scene_instruction} that fits this novel's context.

Generate 5 creative scene prompts. Each should be:
1. Specific and actionable
2. 2-3 sentences describing the scene
3. Include emotional hooks
4. Suggest possible conflicts or developments

Return JSON format:
{{
  "prompts": [
    {{
      "title": "scene title",
      "description": "detailed scene description",
      "emotional_hook": "what makes this emotionally engaging",
      "conflict_potential": "possible conflict or tension"
    }}
  ]
}}"""

        try:
            provider = get_ai_provider()
            response = await provider.generate(
                prompt=prompt,
                context={"system_message": "You are an expert creative writing prompt generator. Inspire writers with vivid, specific scene ideas."},
                config={"temperature": 0.9, "max_tokens": 700},
            )
            return self._parse_json_response(response)
        except Exception as e:
            return {"prompts": [], "error": str(e)}


writing_assistant_service = WritingAssistantService()
