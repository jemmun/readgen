import json
import re
from typing import AsyncGenerator, Dict, List, Optional
from sqlalchemy.orm import Session
from app.core.ai_provider import get_ai_provider
from app.core.config import get_settings
from app.models.chapter import Chapter
from app.models.generation_session import GenerationSession
from app.models.novel import Novel
from app.models.user_interaction import UserInteraction
from app.schemas.chapter import ChapterCreate
from app.services.chapter_service import create_chapter, get_next_chapter_number
from app.services.novel_service import update_novel_word_count

settings = get_settings()


# Genre-specific agent prompts for specialized content generation
GENRE_AGENT_PROMPTS = {
    "historical": (
        "You are writing HISTORICAL FICTION. Focus on historical accuracy, period-appropriate language, "
        "and authentic historical context. Blend fictional characters with actual historical events. "
        "Research and incorporate real historical details, customs, and social norms of the era. "
        "Use language and dialogue that reflects the time period while remaining accessible."
    ),
    "wuxia": (
        "You are writing MARTIAL ARTS (WUXIA) fiction. Emphasize martial arts techniques, jianghu (martial world) culture, "
        "honor codes, and chivalrous heroes. Include detailed fight choreography with named techniques. "
        "Focus on themes of righteousness, loyalty, revenge, and the martial code of honor. "
        "Incorporate traditional Chinese martial arts philosophy and sect rivalries."
    ),
    "romance": (
        "You are writing ROMANCE fiction. Develop deep emotional connections between characters. "
        "Focus on relationship dynamics, romantic tension, emotional vulnerability, and personal growth. "
        "Create compelling chemistry through dialogue, internal monologue, and meaningful interactions. "
        "Build emotional stakes and obstacles that test the relationship."
    ),
    "scifi": (
        "You are writing SCIENCE FICTION. Incorporate scientific principles, futuristic technology, "
        "and speculative concepts. Maintain internal logic and scientific plausibility. "
        "Explore the implications of technology on society and human nature. "
        "Create innovative world-building with consistent rules and believable scientific concepts."
    ),
    "fantasy": (
        "You are writing FANTASY fiction. Build rich magical systems, mythical creatures, and fantastical worlds. "
        "Establish clear magic rules and limitations. Create detailed world-building with unique cultures, "
        "histories, and power structures. Balance wonder with coherent internal logic."
    ),
    "xuanhuan": (
        "You are writing EASTERN FANTASY (XUANHUAN). Incorporate Chinese mythology, cultivation elements, "
        "Eastern philosophy, and mystical powers. Use xianxia and wuxia tropes. "
        "Feature cultivation realms, martial arts, spiritual energy, and immortal beings. "
        "Blend traditional Chinese cultural elements with fantastical world-building."
    ),
    "urban": (
        "You are writing URBAN FICTION. Focus on contemporary urban settings, modern relationships, "
        "career struggles, and city culture. Keep scenarios realistic and relatable. "
        "Explore themes of ambition, identity, social pressure, and modern life challenges. "
        "Use authentic dialogue and settings that reflect contemporary society."
    ),
    "xianxia": (
        "You are writing IMMORTAL HEROES (XIANXIA) fiction. Emphasize cultivation progression, immortal realms, "
        "Taoist concepts, martial cultivation, and the journey to immortality. "
        "Feature spiritual roots, cultivation stages, magical artifacts, and heavenly tribulations. "
        "Incorporate themes of defying heaven, pursuing the Dao, and transcending mortality."
    ),
    "apocalyptic": (
        "You are writing POST-APOCALYPTIC fiction. Create survival scenarios, post-disaster worldbuilding, "
        "human nature under extreme conditions, and rebuilding society. "
        "Explore themes of survival, hope, morality in crisis, and human resilience. "
        "Depict the struggle for resources, faction conflicts, and the fight to preserve humanity."
    ),
    "military": (
        "You are writing MILITARY FICTION. Focus on military strategy, combat scenarios, soldier camaraderie, "
        "tactical operations, and war experiences. Use accurate military terminology and procedures. "
        "Explore themes of duty, sacrifice, brotherhood, and the psychological impact of war. "
        "Depict realistic chain of command, training, and battlefield dynamics."
    ),
    "detective": (
        "You are writing DETECTIVE/CRIME fiction. Develop mystery plots, logical deduction, crime investigation, "
        "and justice themes. Include clues, red herrings, and satisfying resolutions. "
        "Create intricate puzzles that challenge both detective and reader. "
        "Build suspense through careful pacing and strategic revelation of information."
    ),
    "supernatural": (
        "You are writing SUPERNATURAL/LEGEND fiction. Incorporate folklore, supernatural beings, ancient legends, "
        "mythical creatures, and traditional storytelling elements. Blend the mundane with the mysterious. "
        "Draw from classical tales and mythology while creating original narratives. "
        "Explore themes of fate, destiny, and the boundary between human and supernatural realms."
    ),
}


def build_system_message(language: str = "en", genre: Optional[str] = None) -> str:
    base = (
        "You are an award-winning professional novelist and creative writer with decades of experience. "
        "You write deeply engaging, well-structured fiction with vivid sensory descriptions, compelling multi-dimensional characters, natural dialogue, and masterful pacing. "
        "You understand narrative arcs, character development, world-building, and thematic depth. "
        "You always respond with properly formatted JSON containing 'title' and 'content' fields."
    )
    
    # Add genre-specific instructions if provided
    if genre and genre in GENRE_AGENT_PROMPTS:
        base += "\n\n" + GENRE_AGENT_PROMPTS[genre]
    
    if language == "zh":
        base += " You must write the novel in Chinese (Simplified Chinese). All titles and content must be in Chinese."
    elif language != "en":
        base += f" You must write the novel in the '{language}' language. All titles and content must be in this language."
    return base


def build_novel_context(novel: Novel) -> str:
    context = "=== NOVEL DESIGN DOCUMENT ===\n\n"
    context += f"Title: {novel.title}\n"
    context += f"Core Theme / Concept: {novel.theme_description}\n"
    if novel.genre:
        context += f"Genre: {novel.genre}\n"
    if novel.style:
        context += f"Writing Style: {novel.style}\n"
    if novel.target_audience:
        context += f"Target Audience: {novel.target_audience}\n"
    if novel.tone:
        context += f"Overall Tone: {novel.tone}\n"
    if novel.setting:
        context += f"Setting / World: {novel.setting}\n"
    if novel.protagonist_info:
        context += f"Protagonist: {novel.protagonist_info}\n"
    context += f"Planned Total Chapters: {novel.max_chapters}\n"
    context += "\n============================\n"
    return context


def summarize_chapters(chapters: List[Chapter], max_chars: int = 2000) -> str:
    if not chapters:
        return ""
    
    summaries = []
    total_chars = 0
    
    # Prioritize the MOST RECENT chapters for continuity, especially the last chapter
    for ch in reversed(chapters):
        summary = f"Chapter {ch.chapter_number}: {ch.title}\n"
        content_preview = ch.content[:300] + "..." if len(ch.content) > 300 else ch.content
        summary += f"Summary: {content_preview}\n\n"
        
        if total_chars + len(summary) > max_chars:
            break
        summaries.insert(0, summary)  # Insert at beginning to maintain chronological order
        total_chars += len(summary)
    
    return "".join(summaries)


def _parse_markdown_outline(text: str) -> List[Dict]:
    """Parse markdown-formatted outline text with '### Chapter N: Title' or 'Chapter N: Title' headers."""
    chapters = []
    # Match both '### Chapter N: Title' and plain 'Chapter N: Title'
    chapter_regex = re.compile(r"(?:###\s*)?Chapter\s+(\d+)\s*:\s*(.+)", re.IGNORECASE)
    matches = list(chapter_regex.finditer(text))
    
    if not matches:
        return [{"chapter_number": 1, "title": "Chapter 1", "summary": text.strip()[:500], "key_points": "", "continuity": ""}]
    
    for i, m in enumerate(matches):
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[start:end].strip()
        header = body.split('\n')[0]
        content_body = body[len(header):].strip()
        
        ch_num = int(m.group(1))
        # Clean title - remove markdown bold markers
        ch_title = m.group(2).strip().replace('**', '')
        
        summary = ""
        key_points = ""
        continuity = ""
        
        # Match patterns like: - **Summary:** text  or  Summary: text
        sm = re.search(r'-?\s*\*{0,2}Summary\*{0,2}:\*{0,2}\s*([\s\S]*?)(?=-?\s*\*{0,2}(?:Key\s*Points?|Continuity)\*{0,2}:\*{0,2}\s*)', content_body, re.IGNORECASE)
        if not sm:
            sm = re.search(r'-?\s*Summary\s*:\s*([\s\S]*?)(?=-?\s*(?:Key\s*Points?|Continuity)\s*:|$)', content_body, re.IGNORECASE)
        km = re.search(r'-?\s*\*{0,2}Key\s*Points?\*{0,2}:\*{0,2}\s*([\s\S]*?)(?=-?\s*\*{0,2}Continuity\*{0,2}:\*{0,2}\s*)', content_body, re.IGNORECASE)
        if not km:
            km = re.search(r'-?\s*Key\s*Points?\s*:\s*([\s\S]*?)(?=-?\s*Continuity\s*:|$)', content_body, re.IGNORECASE)
        cm = re.search(r'-?\s*\*{0,2}Continuity\*{0,2}:\*{0,2}\s*([\s\S]*?)$', content_body, re.IGNORECASE)
        if not cm:
            cm = re.search(r'-?\s*Continuity\s*:\s*([\s\S]*?)$', content_body, re.IGNORECASE)
        
        if sm: summary = sm.group(1).strip()
        if km: key_points = km.group(1).strip()
        if cm: continuity = cm.group(1).strip()
        if not summary and not key_points and not continuity and content_body:
            summary = content_body[:500]
        
        chapters.append({
            "chapter_number": ch_num,
            "title": ch_title,
            "summary": summary,
            "key_points": key_points,
            "continuity": continuity,
        })
    
    return chapters


def parse_outline_chapters(outline_text: str) -> List[Dict]:
    """Parse outline text into a list of chapter plans."""
    if not outline_text:
        return []
    
    chapters = []
    # Try JSON format first
    cleaned = outline_text.strip()
    if cleaned.startswith('```json'):
        cleaned = cleaned[7:]
    elif cleaned.startswith('```'):
        cleaned = cleaned[3:]
    if cleaned.endswith('```'):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    
    try:
        data = json.loads(cleaned)
        if isinstance(data, list):
            # Check if it's a list of chapter objects or a list with a single wrapper
            if len(data) == 1 and isinstance(data[0], dict) and ('content' in data[0]) and not any('summary' in item or 'key_points' in item for item in data):
                # Single wrapper object with markdown content - extract and parse as text
                content = data[0].get('content', '')
                if content:
                    return _parse_markdown_outline(content)
            for idx, item in enumerate(data):
                chapters.append({
                    "chapter_number": item.get("chapter_number", item.get("chapter", idx + 1)),
                    "title": item.get("title", f"Chapter {idx + 1}"),
                    "summary": item.get("summary", item.get("description", "")),
                    "key_points": item.get("key_points", item.get("keyPoints", "")),
                    "continuity": item.get("continuity", item.get("continuity_notes", "")),
                })
            return chapters
        elif isinstance(data, dict):
            arr = data.get("chapters", data.get("outline", None))
            if isinstance(arr, list):
                for idx, item in enumerate(arr):
                    chapters.append({
                        "chapter_number": item.get("chapter_number", item.get("chapter", idx + 1)),
                        "title": item.get("title", f"Chapter {idx + 1}"),
                        "summary": item.get("summary", item.get("description", "")),
                        "key_points": item.get("key_points", item.get("keyPoints", "")),
                        "continuity": item.get("continuity", item.get("continuity_notes", "")),
                    })
                return chapters
            # Handle {"title": "...", "content": "markdown text with ### Chapter N: headers"}
            content = data.get("content", "")
            if content and isinstance(content, str):
                return _parse_markdown_outline(content)
    except (json.JSONDecodeError, AttributeError):
        pass
    
    # Fallback: parse as markdown/text with chapter headers
    return _parse_markdown_outline(outline_text)


def build_single_chapter_prompt(novel: Novel, chapter_plan: Dict, previous_chapters_summary: str = "") -> str:
    """Build prompt for generating a single chapter from the outline."""
    context = build_novel_context(novel)
    lang_instruction = _build_language_instruction(novel.language)
    ch_num = chapter_plan.get("chapter_number", 1)
    ch_title = chapter_plan.get("title", "")
    ch_summary = chapter_plan.get("summary", "")
    ch_key_points = chapter_plan.get("key_points", "")
    ch_continuity = chapter_plan.get("continuity", "")
    
    prompt = (
        f"{context}\n\n"
        f"{lang_instruction}\n\n"
    )
    
    if previous_chapters_summary:
        prompt += (
            f"=== PREVIOUS CHAPTERS SUMMARY ===\n"
            f"{previous_chapters_summary}\n"
            f"================================\n\n"
        )
    
    prompt += (
        f"Your task: Write Chapter {ch_num} of this novel.\n\n"
        f"=== CHAPTER {ch_num} PLAN ===\n"
    )
    if ch_title:
        prompt += f"Title: {ch_title}\n"
    if ch_summary:
        prompt += f"Summary: {ch_summary}\n"
    if ch_key_points:
        prompt += f"Key Points: {ch_key_points}\n"
    if ch_continuity:
        prompt += f"Continuity Notes: {ch_continuity}\n"
    prompt += f"============================\n\n"
    
    prompt += (
        f"CRITICAL REQUIREMENTS:\n"
        f"- Write approximately 2,000 words of complete, polished prose.\n"
        f"- Follow the chapter plan above EXACTLY.\n"
        f"- Maintain consistent character voices, world details, and plot threads.\n"
        f"- End with a narrative hook that naturally leads into the next chapter.\n"
        f"- Use vivid sensory details and show-don't-tell techniques.\n"
        f"- Dialogue should feel natural and reveal character.\n"
        f"- Do NOT summarize or list plot points - write fully realized prose.\n\n"
        f"Return ONLY a JSON object with two fields:\n"
        f'- "title": The chapter title (e.g., "Chapter {ch_num}: The Awakening")\n'
        f'- "content": The full chapter text as a single string\n'
    )
    
    return prompt


def build_initial_generation_prompt(novel: Novel, outline: str) -> str:
    context = build_novel_context(novel)
    lang_instruction = _build_language_instruction(novel.language)
    
    prompt = (
        f"{context}\n\n"
        f"{lang_instruction}\n\n"
        f"=== OPENING ARC OUTLINE ===\n"
        f"{outline}\n"
        f"===========================\n\n"
        f"Your task: Write the OPENING CHAPTERS (Chapters 1 through 3 to 5) of this novel, "
        f"following the outline above EXACTLY.\n\n"
        f"CRITICAL WORD COUNT: Each chapter MUST be approximately 2,000 words. "
        f"Do NOT write shorter chapters. Develop scenes, dialogue, and descriptions fully to reach this length.\n\n"
        f"CRITICAL CONTINUITY REQUIREMENTS:\n"
        f"- Each chapter MUST follow the outline's plan for that chapter.\n"
        f"- Each chapter MUST end with a narrative hook that naturally leads into the NEXT chapter.\n"
        f"- Maintain consistent character voices, world details, and plot threads across ALL chapters.\n"
        f"- Reference events, decisions, and revelations from previous chapters as the story progresses.\n\n"
        f"CHAPTER-BY-CHAPTER GUIDE:\n"
        f"- Chapter 1: Hook the reader immediately. Introduce the protagonist in their ordinary world. "
        f"  Establish the setting vividly. End with a compelling question or tension. (~2,000 words)\n"
        f"- Chapter 2: Deepen character relationships and world-building. Introduce supporting characters. "
        f"  Hint at the central conflict. Raise stakes subtly. Continue threads from Chapter 1. (~2,000 words)\n"
        f"- Chapter 3: The Inciting Incident or a major turning point. Build on Chapters 1-2. "
        f"  The protagonist must make a choice or face an unavoidable challenge. (~2,000 words)\n"
        f"- Chapters 4-5 (if needed): Escalate tension. Show consequences of the inciting incident. "
        f"  Deepen the mystery or conflict. Leave the reader desperate for more. (~2,000 words each)\n\n"
        f"WRITING REQUIREMENTS:\n"
        f"- Match the specified genre, style, and tone exactly.\n"
        f"- Use vivid sensory details and show-don't-tell techniques.\n"
        f"- Dialogue should feel natural and reveal character.\n"
        f"- Each chapter must have a clear arc: setup, development, mini-climax/hook.\n"
        f"- Maintain consistent voice and perspective throughout.\n"
        f"- Do NOT summarize or list plot points - write fully realized prose.\n\n"
        f"Format your response as a JSON array where each element has 'title' (chapter title) and 'content' (full chapter text) fields. "
        f"Example: [{{'title': 'Chapter 1: The Last Quiet Day', 'content': 'The morning fog...'}}]\n"
        f"Write each chapter as complete, polished prose suitable for publication."
    )
    return prompt


def build_continuation_prompt(novel: Novel, chapters: List[Chapter], user_direction: Optional[str] = None) -> str:
    context = build_novel_context(novel)
    chapter_summary = summarize_chapters(chapters)
    next_number = len(chapters) + 1
    total_chapters = novel.max_chapters
    
    # Get the LAST chapter for direct continuity
    last_chapter = chapters[-1] if chapters else None
    last_chapter_context = ""
    if last_chapter:
        last_content = last_chapter.content[-800:] if len(last_chapter.content) > 800 else last_chapter.content
        last_chapter_context = (
            f"\n=== IMMEDIATE CONTINUITY: LAST CHAPTER ENDING ===\n"
            f"Chapter {last_chapter.chapter_number}: {last_chapter.title}\n"
            f"Last ~800 characters:\n{last_content}\n"
            f"===================================================\n"
        )
    
    prompt = (
        f"{context}\n\n"
        f"STORY SO FAR:\n{chapter_summary}\n"
        f"{last_chapter_context}\n\n"
        f"Your task: Write Chapter {next_number} (out of approximately {total_chapters} total chapters). "
        f"This chapter should be approximately 2,000 to 3,000 words of fully realized prose.\n\n"
        f"CRITICAL CONTINUITY RULE: This chapter MUST directly continue from where Chapter {next_number - 1} ended. "
        f"Reference the ending of the previous chapter explicitly. Maintain character consistency, plot threads, and world details.\n\n"
    )
    
    if next_number <= 3:
        prompt += (
            f"GUIDANCE FOR EARLY CHAPTERS:\n"
            f"- Continue establishing the world and characters.\n"
            f"- Build on the inciting incident from the opening chapters.\n"
            f"- Raise stakes and deepen reader investment.\n\n"
        )
    elif next_number <= total_chapters * 0.6:
        prompt += (
            f"GUIDANCE FOR MIDDLE CHAPTERS:\n"
            f"- Escalate the central conflict.\n"
            f"- Develop subplots and character relationships.\n"
            f"- Introduce complications and obstacles.\n"
            f"- Balance action, dialogue, and introspection.\n\n"
        )
    else:
        prompt += (
            f"GUIDANCE FOR LATE CHAPTERS:\n"
            f"- Move toward climax and resolution.\n"
            f"- Tighten pacing, reduce subplots.\n"
            f"- Deepen emotional stakes and character arcs.\n"
            f"- Set up the final confrontation or revelation.\n\n"
        )
    
    prompt += (
        f"WRITING REQUIREMENTS:\n"
        f"- Match exactly the established style, tone, and character voices.\n"
        f"- Reference previous events and character decisions for continuity.\n"
        f"- Each chapter should have internal arc: setup, development, mini-climax/hook.\n"
        f"- Use vivid sensory details and natural dialogue.\n"
        f"- Do NOT summarize - write complete polished prose.\n"
    )
    
    if user_direction:
        prompt += f"\nREADER'S DIRECTION FOR THIS CHAPTER: {user_direction}\n"
        prompt += f"Incorporate this direction organically into the narrative while maintaining story integrity.\n"
    
    prompt += (
        f"\nFormat your response as JSON with 'title' (chapter title) and 'content' (full chapter text) fields. "
        f"Example: {{'title': 'Chapter {next_number}: The Turning Point', 'content': 'The rain had not stopped...'}}"
    )
    return prompt


def _build_language_instruction(language: str = "en") -> str:
    if language == "zh":
        return (
            "LANGUAGE REQUIREMENT: You MUST write this novel entirely in Chinese (Simplified Chinese). "
            "All chapter titles, narrative text, and dialogue must be in Chinese. "
            "Use natural, fluent Chinese prose with appropriate literary expressions."
        )
    elif language != "en":
        return (
            f"LANGUAGE REQUIREMENT: You MUST write this novel entirely in the '{language}' language. "
            f"All chapter titles, narrative text, and dialogue must be in this language."
        )
    return (
        "LANGUAGE REQUIREMENT: Write this novel in English. "
        "All chapter titles, narrative text, and dialogue must be in English."
    )


def parse_chapters_from_response(response: str) -> List[Dict[str, str]]:
    try:
        cleaned = response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        
        data = json.loads(cleaned)
        
        if isinstance(data, list):
            return data
        elif isinstance(data, dict) and "title" in data and "content" in data:
            return [data]
        else:
            return [{"title": "Generated Chapter", "content": cleaned}]
    except json.JSONDecodeError:
        # Better regex that handles escaped quotes and newlines in content
        # Match from "content": " to the last " before the closing }
        content_match = re.search(r'"content"\s*:\s*"((?:[^"\\]|\\.)*)"\s*}', response, re.DOTALL)
        title_match = re.search(r'"title"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"', response)
        
        if content_match:
            # Unescape JSON string content
            content = content_match.group(1)
            content = content.replace('\\n', '\n')
            content = content.replace('\\t', '\t')
            content = content.replace('\\"', '"')
            content = content.replace('\\\\', '\\')
            
            title = title_match.group(1) if title_match else "Generated Chapter"
            title = title.replace('\\n', '\n').replace('\\t', '\t').replace('\\"', '"').replace('\\\\', '\\')
            
            return [{"title": title, "content": content}]
        
        paragraphs = response.split('\n\n')
        if len(paragraphs) > 1:
            return [{"title": paragraphs[0][:100], "content": '\n\n'.join(paragraphs[1:])}]
        
        return [{"title": "Generated Chapter", "content": response}]


def build_outline_prompt(novel: Novel) -> str:
    context = build_novel_context(novel)
    lang_instruction = _build_language_instruction(novel.language)
    
    prompt = (
        f"{context}\n\n"
        f"{lang_instruction}\n\n"
        f"Your task: Plan the OPENING ARC of this novel. "
        f"Create a detailed outline for the first 3 to 5 chapters (the opening arc).\n\n"
        f"For EACH chapter in the opening arc, provide:\n"
        f"1. A compelling chapter title\n"
        f"2. A 2-3 sentence summary of what happens in that chapter\n"
        f"3. Key plot points, character moments, or revelations\n"
        f"4. How this chapter connects to the next (continuity notes)\n\n"
        f"GUIDELINES:\n"
        f"- The opening arc should total approximately 8,000-10,000 words across all chapters.\n"
        f"- Chapter 1: Hook, ordinary world, introduce protagonist.\n"
        f"- Chapter 2: Deepen relationships, hint at conflict.\n"
        f"- Chapter 3: Inciting incident or major turning point.\n"
        f"- Chapters 4-5 (if needed): Escalate tension, deepen mystery.\n"
        f"- Each chapter must logically lead into the next.\n"
        f"- Ensure character arcs progress naturally across chapters.\n\n"
        f"Format your response as a clear, structured outline. Use the format:\n"
        f"Chapter N: [Title]\n"
        f"- Summary: ...\n"
        f"- Key Points: ...\n"
        f"- Continuity: ...\n\n"
        f"Be specific and detailed. This outline will be used to write the actual chapters."
    )
    return prompt


async def generate_outline(novel: Novel) -> str:
    provider = get_ai_provider()
    prompt = build_outline_prompt(novel)
    
    config = {
        "temperature": 0.8,
        "max_tokens": 2000,
    }
    
    context = {"system_message": build_system_message(novel.language, novel.genre)}
    response = await provider.generate(prompt, context, config)
    return response.strip()


async def generate_initial_chapters(db: Session, novel: Novel, outline: Optional[str] = None) -> List[Chapter]:
    provider = get_ai_provider()
    if outline is None:
        outline = await generate_outline(novel)
    prompt = build_initial_generation_prompt(novel, outline)
    
    config = {
        "temperature": 0.8,
        "max_tokens": 8000,
    }
    
    context = {"system_message": build_system_message(novel.language, novel.genre)}
    response = await provider.generate(prompt, context, config)
    
    chapters_data = parse_chapters_from_response(response)
    created_chapters = []
    
    for idx, ch_data in enumerate(chapters_data):
        chapter_number = get_next_chapter_number(db, novel.id)
        chapter_create = ChapterCreate(
            novel_id=novel.id,
            chapter_number=chapter_number,
            title=ch_data.get("title", f"Chapter {chapter_number}"),
            content=ch_data.get("content", ""),
        )
        db_chapter = create_chapter(db, chapter_create)
        created_chapters.append(db_chapter)
    
    update_novel_word_count(db, novel.id)
    return created_chapters


async def generate_next_chapter(db: Session, novel: Novel, user_direction: Optional[str] = None) -> Chapter:
    provider = get_ai_provider()
    chapters = db.query(Chapter).filter(Chapter.novel_id == novel.id).order_by(Chapter.chapter_number).all()
    
    prompt = build_continuation_prompt(novel, chapters, user_direction)
    config = {
        "temperature": 0.8,
        "max_tokens": 4000,
    }
    
    context = {"system_message": build_system_message(novel.language, novel.genre)}
    response = await provider.generate(prompt, context, config)
    
    chapters_data = parse_chapters_from_response(response)
    ch_data = chapters_data[0] if chapters_data else {"title": "New Chapter", "content": response}
    
    chapter_number = get_next_chapter_number(db, novel.id)
    chapter_create = ChapterCreate(
        novel_id=novel.id,
        chapter_number=chapter_number,
        title=ch_data.get("title", f"Chapter {chapter_number}"),
        content=ch_data.get("content", ""),
    )
    db_chapter = create_chapter(db, chapter_create)
    update_novel_word_count(db, novel.id)
    
    return db_chapter


async def generate_initial_chapters_stream(
    db: Session, novel: Novel, outline: Optional[str] = None
) -> AsyncGenerator[str, None]:
    provider = get_ai_provider()
    
    # The outline should already be generated and reviewed by the user.
    # Generate chapters based on the confirmed outline.
    prompt = build_initial_generation_prompt(novel, outline)
    
    config = {
        "temperature": 0.8,
        "max_tokens": 8000,
    }
    
    context = {"system_message": build_system_message(novel.language, novel.genre)}
    buffer = ""
    
    async for chunk in provider.generate_stream(prompt, context, config):
        buffer += chunk
        yield chunk
    
    chapters_data = parse_chapters_from_response(buffer)
    for idx, ch_data in enumerate(chapters_data):
        chapter_number = get_next_chapter_number(db, novel.id)
        chapter_create = ChapterCreate(
            novel_id=novel.id,
            chapter_number=chapter_number,
            title=ch_data.get("title", f"Chapter {chapter_number}"),
            content=ch_data.get("content", ""),
        )
        create_chapter(db, chapter_create)
    
    update_novel_word_count(db, novel.id)


async def generate_next_chapter_stream(db: Session, novel: Novel, user_direction: Optional[str] = None) -> AsyncGenerator[str, None]:
    provider = get_ai_provider()
    chapters = db.query(Chapter).filter(Chapter.novel_id == novel.id).order_by(Chapter.chapter_number).all()
    
    prompt = build_continuation_prompt(novel, chapters, user_direction)
    config = {
        "temperature": 0.8,
        "max_tokens": 4000,
    }
    
    context = {"system_message": build_system_message(novel.language, novel.genre)}
    buffer = ""
    
    async for chunk in provider.generate_stream(prompt, context, config):
        buffer += chunk
        yield chunk
    
    chapters_data = parse_chapters_from_response(buffer)
    ch_data = chapters_data[0] if chapters_data else {"title": "New Chapter", "content": buffer}
    
    chapter_number = get_next_chapter_number(db, novel.id)
    chapter_create = ChapterCreate(
        novel_id=novel.id,
        chapter_number=chapter_number,
        title=ch_data.get("title", f"Chapter {chapter_number}"),
        content=ch_data.get("content", ""),
    )
    create_chapter(db, chapter_create)
    update_novel_word_count(db, novel.id)


async def generate_single_chapter_stream(
    db: Session, novel: Novel, chapter_plan: Dict, previous_chapters_summary: str = ""
) -> AsyncGenerator[str, None]:
    """Stream-generate a single chapter from the outline plan."""
    provider = get_ai_provider()
    prompt = build_single_chapter_prompt(novel, chapter_plan, previous_chapters_summary)
    
    config = {
        "temperature": 0.8,
        "max_tokens": 4000,
    }
    
    context = {"system_message": build_system_message(novel.language, novel.genre)}
    buffer = ""
    
    async for chunk in provider.generate_stream(prompt, context, config):
        buffer += chunk
        yield chunk
    
    # Parse and save the chapter
    chapters_data = parse_chapters_from_response(buffer)
    ch_data = chapters_data[0] if chapters_data else {"title": f'Chapter {chapter_plan.get("chapter_number", 1)}', "content": buffer}
    
    chapter_number = get_next_chapter_number(db, novel.id)
    chapter_create = ChapterCreate(
        novel_id=novel.id,
        chapter_number=chapter_number,
        title=ch_data.get("title", f"Chapter {chapter_number}"),
        content=ch_data.get("content", ""),
    )
    create_chapter(db, chapter_create)
    update_novel_word_count(db, novel.id)


async def extract_novel_design_from_post(post_content: str) -> Dict[str, str]:
    provider = get_ai_provider()
    prompt = (
        f"Analyze the following creative post and extract novel design elements from it.\n\n"
        f"POST CONTENT:\n{post_content}\n\n"
        f"Extract and return ONLY a JSON object with these fields:\n"
        f"- title: A compelling novel title based on the post\n"
        f"- theme_description: The core theme/concept (use the post content as the main inspiration)\n"
        f"- genre: Best-fit genre (e.g., sci-fi, fantasy, romance, thriller, mystery)\n"
        f"- style: Writing style (e.g., literary, fast-paced, poetic, gritty)\n"
        f"- tone: Overall tone (e.g., dark, hopeful, humorous, suspenseful)\n"
        f"- setting: Brief setting description\n"
        f"- protagonist_info: Brief protagonist description\n"
        f"- target_audience: Target readers\n"
        f"- language: Language code (e.g., 'en', 'zh')\n"
        f"\nReturn valid JSON only."
    )
    config = {"temperature": 0.7, "max_tokens": 1500}
    context = {"system_message": "You are a literary analyst who extracts structured novel metadata from creative writing."}
    response = await provider.generate(prompt, context, config)
    
    try:
        cleaned = response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        data = json.loads(cleaned)
        return data
    except json.JSONDecodeError:
        return {
            "title": "Untitled Novel",
            "theme_description": post_content,
            "genre": "fiction",
            "style": "literary",
            "tone": "neutral",
            "setting": "",
            "protagonist_info": "",
            "target_audience": "general",
            "language": "en",
        }


async def synthesize_novel_design_from_posts(posts: List[dict]) -> Dict[str, str]:
    """
    Synthesize a novel design from a collection of tagged group posts.
    Each post dict should have: content, tag, tag_label, tag_emoji.
    """
    provider = get_ai_provider()
    
    # Organize posts by tag for better context
    lines = []
    for p in posts:
        tag_info = f"[{p.get('tag_emoji', '')} {p.get('tag_label', p.get('tag', ''))}]"
        lines.append(f"{tag_info} {p['content']}")
    
    combined = "\n\n".join(lines)
    
    prompt = (
        f"You are a literary agent who specializes in organizing creative ideas into structured novel designs.\n\n"
        f"Below is a collection of creative ideas and contributions from a writers' group, each tagged by category.\n\n"
        f"GROUP CONTRIBUTIONS:\n{combined}\n\n"
        f"Your task: Synthesize all these contributions into a coherent, unified novel design document. "
        f"Merge overlapping ideas, resolve contradictions, and create a compelling single vision.\n\n"
        f"Return ONLY a JSON object with these fields:\n"
        f"- title: A compelling novel title that captures the unified vision\n"
        f"- theme_description: The core theme/concept synthesizing all contributions (2-4 sentences)\n"
        f"- genre: Best-fit genre (e.g., sci-fi, fantasy, romance, thriller, mystery)\n"
        f"- style: Writing style (e.g., literary, fast-paced, poetic, gritty)\n"
        f"- tone: Overall tone (e.g., dark, hopeful, humorous, suspenseful)\n"
        f"- setting: Brief setting description synthesized from all world-building inputs\n"
        f"- protagonist_info: Brief protagonist description based on character contributions\n"
        f"- target_audience: Target readers\n"
        f"- language: Primary language of the contributions ('en' or 'zh')\n"
        f"- max_chapters: Suggested number of chapters (integer, 10-50)\n"
        f"\nReturn valid JSON only."
    )
    config = {"temperature": 0.75, "max_tokens": 2000}
    context = {"system_message": "You are a professional literary agent who synthesizes multiple creative inputs into cohesive novel designs."}
    response = await provider.generate(prompt, context, config)
    
    try:
        cleaned = response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        data = json.loads(cleaned)
        # Ensure max_chapters is an int
        if "max_chapters" in data:
            try:
                data["max_chapters"] = int(data["max_chapters"])
            except (ValueError, TypeError):
                data["max_chapters"] = 20
        else:
            data["max_chapters"] = 20
        return data
    except json.JSONDecodeError:
        # Fallback: use first post's content as theme, derive basic info
        return {
            "title": "Untitled Group Novel",
            "theme_description": combined[:500] if combined else "A novel based on group collaboration.",
            "genre": "fiction",
            "style": "literary",
            "tone": "neutral",
            "setting": "",
            "protagonist_info": "",
            "target_audience": "general",
            "language": "en",
            "max_chapters": 20,
        }


async def generate_chapter_from_comment(
    db: Session, novel: Novel, comment_content: str, contributor_id: int
) -> Chapter:
    provider = get_ai_provider()
    chapters = db.query(Chapter).filter(Chapter.novel_id == novel.id).order_by(Chapter.chapter_number).all()
    
    prompt = build_continuation_prompt(novel, chapters, comment_content)
    config = {
        "temperature": 0.8,
        "max_tokens": 4000,
    }
    
    context = {"system_message": build_system_message(novel.language, novel.genre)}
    response = await provider.generate(prompt, context, config)
    
    chapters_data = parse_chapters_from_response(response)
    ch_data = chapters_data[0] if chapters_data else {"title": "New Chapter", "content": response}
    
    chapter_number = get_next_chapter_number(db, novel.id)
    db_chapter = Chapter(
        novel_id=novel.id,
        contributor_id=contributor_id,
        chapter_number=chapter_number,
        title=ch_data.get("title", f"Chapter {chapter_number}"),
        content=ch_data.get("content", ""),
        word_count=len(ch_data.get("content", "")),
    )
    db.add(db_chapter)
    db.commit()
    db.refresh(db_chapter)
    update_novel_word_count(db, novel.id)
    
    return db_chapter
