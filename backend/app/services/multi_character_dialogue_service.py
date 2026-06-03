from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from app.core.ai_provider import get_ai_provider
from app.models.user import User
from app.models.chapter import Chapter
from app.models.novel import Novel
import re
import json


class MultiCharacterDialogueService:
    """AI-powered multi-character dialogue collaboration."""

    async def generate_dialogue_scene(
        self,
        db: Session,
        novel_id: int,
        characters: List[Dict],
        scene_context: str,
        language: str = "en",
    ) -> Dict:
        """
        Generate a multi-character dialogue scene.
        
        characters format:
        [
            {"name": "Alice", "role": "protagonist", "personality": "brave, curious"},
            {"name": "Bob", "role": "mentor", "personality": "wise, cautious"}
        ]
        """
        novel = db.query(Novel).filter(Novel.id == novel_id).first()
        if not novel:
            return {"error": "Novel not found"}

        # Build character descriptions
        character_descriptions = "\n".join([
            f"- {c['name']} ({c['role']}): {c.get('personality', 'No description')}"
            for c in characters
        ])

        prompt = f"""Write a dialogue scene with multiple characters based on the following context.

NOVEL: {novel.title}
Genre: {novel.genre or 'Not specified'}

CHARACTERS:
{character_descriptions}

SCENE CONTEXT:
{scene_context}

Requirements:
1. Write natural dialogue that reflects each character's personality
2. Include action tags and descriptions between dialogue
3. Each character should have a distinct voice
4. Include at least 3 exchanges per character
5. Advance the plot or reveal character development

Format as:
CHARACTER_NAME: dialogue text
[action or description]
CHARACTER_NAME: dialogue text

Make it engaging and true to each character's personality."""

        try:
            provider = get_ai_provider()
            response = await provider.generate(
                prompt=prompt,
                context={"system_message": "You are an expert dialogue writer. Create authentic, character-driven conversations."},
                config={"temperature": 0.7, "max_tokens": 2000},
            )
            
            return {
                "scene": response,
                "characters_involved": [c["name"] for c in characters],
                "context": scene_context,
            }
        except Exception as e:
            return {"error": str(e)}

    async def check_dialogue_consistency(
        self,
        db: Session,
        dialogue_text: str,
        character_profiles: List[Dict],
        language: str = "en",
    ) -> Dict:
        """
        Check if dialogue is consistent with character profiles.
        
        character_profiles format:
        [
            {"name": "Alice", "personality": "brave", "speech_style": "direct, uses short sentences"},
            {"name": "Bob", "personality": "cautious", "speech_style": "formal, uses complex sentences"}
        ]
        """
        profiles_text = "\n".join([
            f"- {p['name']}: Personality: {p.get('personality', 'N/A')}, Speech: {p.get('speech_style', 'N/A')}"
            for p in character_profiles
        ])

        prompt = f"""Analyze this dialogue scene for character consistency.

CHARACTER PROFILES:
{profiles_text}

DIALOGUE:
{dialogue_text}

Check for:
1. Does each character's dialogue match their personality?
2. Is the speech style consistent for each character?
3. Are there any out-of-character moments?
4. Do characters maintain their established voices?
5. Are the relationships between characters consistent?

Return JSON format:
{{
  "consistent": true/false,
  "issues": [
    {{
      "character": "Name",
      "issue": "description of inconsistency",
      "severity": "low/medium/high",
      "suggestion": "how to fix"
    }}
  ],
  "overall_score": 85
}}"""

        try:
            provider = get_ai_provider()
            response = await provider.generate(
                prompt=prompt,
                context={"system_message": "You are a dialogue consistency analyst. Identify character voice issues."},
                config={"temperature": 0.3, "max_tokens": 1500},
            )
            
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                return json.loads(json_match.group())
            else:
                return {"consistent": True, "issues": [], "message": "Could not parse analysis"}
        except Exception as e:
            return {"error": str(e)}

    async def learn_character_voice(
        self,
        db: Session,
        novel_id: int,
        character_name: str,
        language: str = "en",
    ) -> Dict:
        """
        Analyze a character's dialogue patterns from existing chapters.
        """
        novel = db.query(Novel).filter(Novel.id == novel_id).first()
        if not novel:
            return {"error": "Novel not found"}

        # Extract dialogue for the character
        character_dialogue = []
        for chapter in novel.chapters:
            if chapter.content:
                # Simple dialogue extraction (lines starting with character name)
                lines = chapter.content.split('\n')
                for line in lines:
                    if line.strip().startswith(f"{character_name}:") or line.strip().startswith(f"{character_name} "):
                        character_dialogue.append(line.strip())

        if len(character_dialogue) < 3:
            return {
                "character": character_name,
                "message": "Not enough dialogue samples to analyze",
                "samples_found": len(character_dialogue),
            }

        dialogue_samples = "\n".join(character_dialogue[:20])  # Use up to 20 samples

        prompt = f"""Analyze the dialogue patterns and speech style of the character '{character_name}'.

DIALOGUE SAMPLES:
{dialogue_samples}

Analyze:
1. Speech patterns (sentence length, complexity)
2. Vocabulary choices (formal/informal, technical/simple)
3. Emotional tone (optimistic, pessimistic, neutral)
4. Common phrases or expressions
5. Dialogue habits (interrupts, pauses, questions)

Return JSON format:
{{
  "character": "{character_name}",
  "speech_style": "description",
  "vocabulary": "formal/informal/etc",
  "emotional_tone": "description",
  "common_patterns": ["pattern 1", "pattern 2"],
  "personality_traits": ["trait 1", "trait 2"],
  "writing_guidelines": "how to write dialogue for this character"
}}"""

        try:
            provider = get_ai_provider()
            response = await provider.generate(
                prompt=prompt,
                context={"system_message": "You are a character voice analyst. Identify speech patterns and style."},
                config={"temperature": 0.3, "max_tokens": 1500},
            )
            
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                return json.loads(json_match.group())
            else:
                return {"character": character_name, "message": "Could not parse analysis"}
        except Exception as e:
            return {"error": str(e)}


multi_character_dialogue_service = MultiCharacterDialogueService()
