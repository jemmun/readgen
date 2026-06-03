from typing import Dict, List, Optional


class WritingTemplateLibrary:
    """Pre-built writing templates for different genres and story structures."""

    # Genre-specific templates
    GENRE_TEMPLATES = {
        "fantasy": {
            "name": "Fantasy Adventure",
            "description": "Epic fantasy with magic, mythical creatures, and heroic quests",
            "structure": [
                {"chapter": 1, "title": "The Ordinary World", "description": "Introduce protagonist in their normal life"},
                {"chapter": 2, "title": "The Call to Adventure", "description": "A mysterious event disrupts the status quo"},
                {"chapter": 3, "title": "Refusal of the Call", "description": "Protagonist hesitates to accept the quest"},
                {"chapter": 4, "title": "Meeting the Mentor", "description": "A wise guide appears with knowledge and tools"},
                {"chapter": 5, "title": "Crossing the Threshold", "description": "Entering the magical/unknown world"},
                {"chapter": 6, "title": "Tests and Allies", "description": "Making friends and facing initial challenges"},
                {"chapter": 7, "title": "The Approach", "description": "Preparing for the main ordeal"},
                {"chapter": 8, "title": "The Ordeal", "description": "Facing the greatest challenge yet"},
                {"chapter": 9, "title": "The Reward", "description": "Gaining power, knowledge, or treasure"},
                {"chapter": 10, "title": "The Road Back", "description": "Beginning the journey home"},
            ],
            "themes": ["good vs evil", "coming of age", "power and responsibility", "sacrifice"],
            "tropes": ["chosen one", "magical mentor", "ancient prophecy", "dark lord"],
        },
        "romance": {
            "name": "Romance Novel",
            "description": "Love story with emotional depth and relationship development",
            "structure": [
                {"chapter": 1, "title": "The Meet Cute", "description": "Protagonists first encounter"},
                {"chapter": 2, "title": "Initial Attraction", "description": "Sparks fly but obstacles appear"},
                {"chapter": 3, "title": "Growing Closer", "description": "Shared moments and deepening connection"},
                {"chapter": 4, "title": "First Kiss", "description": "Romantic milestone"},
                {"chapter": 5, "title": "The Conflict Emerges", "description": "Internal or external obstacles to love"},
                {"chapter": 6, "title": "Pulling Away", "description": "Fear or misunderstanding creates distance"},
                {"chapter": 7, "title": "The Dark Moment", "description": "All seems lost"},
                {"chapter": 8, "title": "The Grand Gesture", "description": "One proves their love"},
                {"chapter": 9, "title": "Reconciliation", "description": "Overcoming the final obstacle"},
                {"chapter": 10, "title": "Happily Ever After", "description": "Love triumphs"},
            ],
            "themes": ["love conquers all", "self-discovery", "trust and vulnerability", "second chances"],
            "tropes": ["enemies to lovers", "fake dating", "forbidden love", "soulmates"],
        },
        "scifi": {
            "name": "Science Fiction",
            "description": "Futuristic technology, space exploration, and scientific concepts",
            "structure": [
                {"chapter": 1, "title": "The Status Quo", "description": "Establish the world and technology"},
                {"chapter": 2, "title": "The Discovery", "description": "Scientific breakthrough or anomaly"},
                {"chapter": 3, "title": "The Implications", "description": "Understanding the consequences"},
                {"chapter": 4, "title": "The Mission Begins", "description": "Setting out to explore or solve"},
                {"chapter": 5, "title": "First Contact", "description": "Encountering the unknown"},
                {"chapter": 6, "title": "Complications", "description": "Technology fails or alien motives unclear"},
                {"chapter": 7, "title": "The Revelation", "description": "Shocking truth discovered"},
                {"chapter": 8, "title": "The Crisis", "description": "Everything goes wrong"},
                {"chapter": 9, "title": "The Solution", "description": "Using science/ingenuity to survive"},
                {"chapter": 10, "title": "New World Order", "description": "Changed forever"},
            ],
            "themes": ["humanity vs technology", "exploration", "ethics of science", "survival"],
            "tropes": ["first contact", "AI consciousness", "time travel", "dystopian future"],
        },
        "mystery": {
            "name": "Mystery/Detective",
            "description": "Crime investigation with clues and suspenseful revelation",
            "structure": [
                {"chapter": 1, "title": "The Crime", "description": "Murder or mystery discovered"},
                {"chapter": 2, "title": "The Detective Arrives", "description": "Investigator takes the case"},
                {"chapter": 3, "title": "Initial Clues", "description": "First evidence and suspects"},
                {"chapter": 4, "title": "Red Herrings", "description": "Misleading evidence appears"},
                {"chapter": 5, "title": "Deepening Mystery", "description": "More questions than answers"},
                {"chapter": 6, "title": "The Breakthrough", "description": "Key clue discovered"},
                {"chapter": 7, "title": "Confronting Suspects", "description": "Interrogations and revelations"},
                {"chapter": 8, "title": "The Twist", "description": "Unexpected revelation changes everything"},
                {"chapter": 9, "title": "The Confrontation", "description": "Face the culprit"},
                {"chapter": 10, "title": "Case Closed", "description": "Mystery solved, justice served"},
            ],
            "themes": ["truth and justice", "deception", "moral ambiguity", "obsession"],
            "tropes": ["unreliable narrator", "locked room", "detective duo", "final twist"],
        },
        "horror": {
            "name": "Horror/Thriller",
            "description": "Suspenseful terror building to climactic confrontation",
            "structure": [
                {"chapter": 1, "title": "Normal Life", "description": "Peaceful beginning"},
                {"chapter": 2, "title": "First Signs", "description": "Something is wrong"},
                {"chapter": 3, "title": "Escalation", "description": "Events grow more disturbing"},
                {"chapter": 4, "title": "The Threat Revealed", "description": "Horror becomes clear"},
                {"chapter": 5, "title": "Denial", "description": "Characters refuse to believe"},
                {"chapter": 6, "title": "No Escape", "description": "Trapped with the horror"},
                {"chapter": 7, "title": "Survival Mode", "description": "Desperate fight to live"},
                {"chapter": 8, "title": "The Darkest Hour", "description": "All hope lost"},
                {"chapter": 9, "title": "Final Confrontation", "description": "Face the horror"},
                {"chapter": 10, "title": "Aftermath", "description": "Survivors changed forever"},
            ],
            "themes": ["fear of unknown", "survival", "isolation", "madness"],
            "tropes": ["haunted house", "ancient evil", "isolation", "final girl"],
        },
    }

    # Story structure templates
    STORY_STRUCTURES = {
        "three_act": {
            "name": "Three-Act Structure",
            "description": "Classic setup, confrontation, resolution",
            "acts": [
                {
                    "act": 1,
                    "name": "Setup",
                    "chapters": "1-3",
                    "description": "Introduce characters, world, and inciting incident",
                },
                {
                    "act": 2,
                    "name": "Confrontation",
                    "chapters": "4-7",
                    "description": "Rising action, complications, midpoint reversal",
                },
                {
                    "act": 3,
                    "name": "Resolution",
                    "chapters": "8-10",
                    "description": "Climax, falling action, and denouement",
                },
            ],
        },
        "heros_journey": {
            "name": "Hero's Journey",
            "description": "Mythic structure of departure, initiation, and return",
            "stages": [
                "Ordinary World",
                "Call to Adventure",
                "Refusal of the Call",
                "Meeting the Mentor",
                "Crossing the Threshold",
                "Tests, Allies, Enemies",
                "Approach to the Inmost Cave",
                "The Ordeal",
                "Reward",
                "The Road Back",
                "Resurrection",
                "Return with the Elixir",
            ],
        },
        "freytag_pyramid": {
            "name": "Freytag's Pyramid",
            "description": "Five-part dramatic structure",
            "stages": [
                {"stage": "Exposition", "description": "Background and setting"},
                {"stage": "Rising Action", "description": "Complications build"},
                {"stage": "Climax", "description": "Turning point"},
                {"stage": "Falling Action", "description": "Aftermath of climax"},
                {"stage": "Denouement", "description": "Resolution"},
            ],
        },
    }

    @classmethod
    def get_genre_template(cls, genre: str) -> Optional[Dict]:
        """Get template for a specific genre."""
        return cls.GENRE_TEMPLATES.get(genre.lower())

    @classmethod
    def get_structure_template(cls, structure: str) -> Optional[Dict]:
        """Get a story structure template."""
        return cls.STORY_STRUCTURES.get(structure.lower())

    @classmethod
    def get_all_genres(cls) -> List[str]:
        """List all available genre templates."""
        return list(cls.GENRE_TEMPLATES.keys())

    @classmethod
    def get_all_structures(cls) -> List[str]:
        """List all available story structures."""
        return list(cls.STORY_STRUCTURES.keys())

    @classmethod
    def generate_outline_from_template(
        cls,
        genre: str,
        custom_title: str = None,
        num_chapters: int = 10,
    ) -> Dict:
        """Generate a chapter outline from a genre template."""
        template = cls.get_genre_template(genre)
        if not template:
            return {"error": f"No template found for genre: {genre}"}

        structure = template["structure"]
        # Adjust to requested chapter count
        if len(structure) > num_chapters:
            structure = structure[:num_chapters]
        
        chapters = []
        for i, chapter_info in enumerate(structure):
            chapters.append({
                "chapter_number": i + 1,
                "title": chapter_info["title"],
                "description": chapter_info["description"],
            })

        return {
            "genre": genre,
            "template_name": template["name"],
            "chapters": chapters,
            "themes": template["themes"],
            "tropes": template["tropes"],
        }


writing_template_library = WritingTemplateLibrary()
