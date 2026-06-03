from typing import Dict, List, Optional
from datetime import datetime, timedelta
import random


class CreationChallengeService:
    """Writing challenges and prompts to inspire creators."""

    # Daily writing prompts database
    DAILY_PROMPTS = {
        "monday": [
            {"title": "New Beginnings", "prompt": "Write about a character starting something completely new in their life", "genre": "any", "difficulty": "easy"},
            {"title": "The Letter", "prompt": "A character receives a mysterious letter that changes everything", "genre": "any", "difficulty": "medium"},
            {"title": "Monday Morning", "prompt": "Describe an ordinary Monday morning that becomes extraordinary", "genre": "any", "difficulty": "easy"},
        ],
        "tuesday": [
            {"title": "Unexpected Ally", "prompt": "Two enemies must work together to survive", "genre": "any", "difficulty": "medium"},
            {"title": "The Discovery", "prompt": "A character discovers something hidden that shouldn't exist", "genre": "mystery", "difficulty": "medium"},
            {"title": "Second Chance", "prompt": "Write about someone getting a second chance at something they failed at before", "genre": "any", "difficulty": "easy"},
        ],
        "wednesday": [
            {"title": "Midpoint Twist", "prompt": "Halfway through their journey, the hero realizes they've been wrong about everything", "genre": "any", "difficulty": "hard"},
            {"title": "The Choice", "prompt": "A character must choose between two equally important things", "genre": "any", "difficulty": "medium"},
            {"title": "Revelation", "prompt": "The truth about a character's past is finally revealed", "genre": "drama", "difficulty": "hard"},
        ],
        "thursday": [
            {"title": "Rising Action", "prompt": "Things are getting worse for your protagonist. Write the escalation", "genre": "any", "difficulty": "medium"},
            {"title": "The Confrontation", "prompt": "Two characters finally face each other about their conflict", "genre": "any", "difficulty": "medium"},
            {"title": "Building Tension", "prompt": "Create suspense through what characters DON'T say", "genre": "thriller", "difficulty": "hard"},
        ],
        "friday": [
            {"title": "Climax", "prompt": "Write the most intense moment of your story", "genre": "any", "difficulty": "hard"},
            {"title": "Victory or Defeat", "prompt": "The protagonist faces their greatest challenge", "genre": "any", "difficulty": "hard"},
            {"title": "Friday Night", "prompt": "Something unexpected happens on a Friday night", "genre": "any", "difficulty": "easy"},
        ],
        "saturday": [
            {"title": "Aftermath", "prompt": "Show the consequences of a major event", "genre": "any", "difficulty": "medium"},
            {"title": "Quiet Moments", "prompt": "Write a peaceful scene that reveals character depth", "genre": "any", "difficulty": "easy"},
            {"title": "Reflection", "prompt": "A character looks back on their journey", "genre": "any", "difficulty": "medium"},
        ],
        "sunday": [
            {"title": "Resolution", "prompt": "Bring your story to a satisfying conclusion", "genre": "any", "difficulty": "medium"},
            {"title": "New Normal", "prompt": "Show how characters have changed after their journey", "genre": "any", "difficulty": "medium"},
            {"title": "Sunday Peace", "prompt": "Write about finding peace after turmoil", "genre": "any", "difficulty": "easy"},
        ],
    }

    # Weekly themed challenges
    WEEKLY_CHALLENGES = [
        {
            "title": "Genre Mashup Week",
            "description": "Combine two unlikely genres in one story",
            "duration_days": 7,
            "requirements": "Write a story that blends two different genres",
            "examples": ["Sci-Fi + Romance", "Horror + Comedy", "Fantasy + Mystery"],
        },
        {
            "title": "Flash Fiction Week",
            "description": "Tell a complete story in under 1000 words",
            "duration_days": 7,
            "requirements": "Complete story with beginning, middle, and end in <1000 words",
            "examples": ["Slice of life", "Plot twist story", "Emotional moment"],
        },
        {
            "title": "Character Deep Dive",
            "description": "Focus on character development and backstory",
            "duration_days": 7,
            "requirements": "Write a character-driven story with rich backstory",
            "examples": ["Origin story", "Character study", "Internal conflict"],
        },
        {
            "title": "Dialogue Only",
            "description": "Tell a story using only dialogue",
            "duration_days": 7,
            "requirements": "No narration or description, only character dialogue",
            "examples": ["Conversation reveals plot", "Argument scene", "Confession"],
        },
        {
            "title": "Unreliable Narrator",
            "description": "Write from the perspective of an unreliable narrator",
            "duration_days": 7,
            "requirements": "Reader should question the narrator's truthfulness",
            "examples": ["Lying protagonist", "Misunderstanding narrator", "Biased perspective"],
        },
    ]

    # Writing prompt categories
    PROMPT_CATEGORIES = {
        "opening_lines": [
            "The phone rang at midnight, and she knew it was bad news.",
            "He had exactly three minutes to make a decision that would change everything.",
            "The letter had been waiting for her for twenty years.",
            "It started with a small lie, as these things often do.",
            "The last time she saw him, he was smiling.",
        ],
        "plot_twists": [
            "The mentor is actually the villain",
            "The quest was based on a misunderstanding",
            "Two characters who hate each other are actually siblings",
            "The magic system has a fatal flaw",
            "The protagonist has been dead the whole time",
        ],
        "character_scenarios": [
            "A character finds something they lost years ago",
            "Someone must apologize for something they didn't do",
            "A character discovers their best friend's secret",
            "Two strangers are trapped in an elevator",
            "A character must teach someone what they just learned themselves",
        ],
        "world_building": [
            "A world where music is currency",
            "A city that exists only at night",
            "A society where memories can be traded",
            "A planet with two suns and no darkness",
            "A world where lies become visible",
        ],
    }

    @classmethod
    def get_daily_challenge(cls) -> Dict:
        """Get today's writing challenge."""
        today = datetime.utcnow().strftime("%A").lower()
        challenges = cls.DAILY_PROMPTS.get(today, cls.DAILY_PROMPTS["monday"])
        return {
            "type": "daily",
            "date": datetime.utcnow().strftime("%Y-%m-%d"),
            "challenges": challenges,
        }

    @classmethod
    def get_weekly_challenge(cls) -> Dict:
        """Get the current weekly challenge."""
        # Rotate weekly based on week number
        week_number = datetime.utcnow().isocalendar()[1]
        challenge_index = week_number % len(cls.WEEKLY_CHALLENGES)
        
        challenge = cls.WEEKLY_CHALLENGES[challenge_index]
        return {
            "type": "weekly",
            "week_number": week_number,
            "challenge": challenge,
            "start_date": (datetime.utcnow() - timedelta(days=datetime.utcnow().weekday())).strftime("%Y-%m-%d"),
        }

    @classmethod
    def get_random_prompts(cls, category: Optional[str] = None, count: int = 5) -> List[str]:
        """Get random writing prompts from a category or all categories."""
        if category and category in cls.PROMPT_CATEGORIES:
            prompts = cls.PROMPT_CATEGORIES[category]
        else:
            # Combine all prompts
            prompts = []
            for category_prompts in cls.PROMPT_CATEGORIES.values():
                prompts.extend(category_prompts)
        
        return random.sample(prompts, min(count, len(prompts)))

    @classmethod
    def get_all_categories(cls) -> List[str]:
        """List all prompt categories."""
        return list(cls.PROMPT_CATEGORIES.keys())

    @classmethod
    def generate_custom_challenge(
        cls,
        genre: str = "any",
        difficulty: str = "medium",
        word_count_target: int = 2000,
    ) -> Dict:
        """Generate a custom writing challenge based on preferences."""
        daily = cls.get_daily_challenge()
        
        return {
            "type": "custom",
            "genre": genre,
            "difficulty": difficulty,
            "word_count_target": word_count_target,
            "suggested_prompts": [
                prompt for prompt in daily["challenges"]
                if prompt["genre"] == genre or prompt["genre"] == "any"
            ][:3],
        }


creation_challenge_service = CreationChallengeService()
