"""
Novel creation tag system for group chat.
Each tag represents a category of novel-creation-related discussion.
Tags are stored as lowercase strings in the Post model.
Extend by adding entries to the TAGS dict.
"""

from typing import Optional, Dict
from dataclasses import dataclass, field


@dataclass
class TagDef:
    """Definition of a single chat tag."""
    slug: str              # e.g. "plot", "character"
    prefix: str            # slash command, e.g. "/plot"
    label: str             # display label, e.g. "Plot"
    emoji: str             # visual icon
    description: str       # tooltip / hint text
    color: str             # hex color for badge


# ─────────────────────────────────────────────
# TAG REGISTRY — add new tags here to extend
# ─────────────────────────────────────────────
TAGS: Dict[str, TagDef] = {
    "plot": TagDef(
        slug="plot",
        prefix="/plot",
        label="Plot",
        emoji="📖",
        description="Storyline and plot development",
        color="#1d9bf0",
    ),
    "character": TagDef(
        slug="character",
        prefix="/character",
        label="Character",
        emoji="🎭",
        description="Character creation, arcs, and development",
        color="#e0245e",
    ),
    "chapter": TagDef(
        slug="chapter",
        prefix="/chapter",
        label="Chapter",
        emoji="📑",
        description="Chapter structure, scenes, and pacing",
        color="#17bf63",
    ),
    "setting": TagDef(
        slug="setting",
        prefix="/setting",
        label="Setting",
        emoji="🌍",
        description="World building, locations, and atmosphere",
        color="#794bc4",
    ),
    "dialogue": TagDef(
        slug="dialogue",
        prefix="/dialogue",
        label="Dialogue",
        emoji="💬",
        description="Character dialogue and conversations",
        color="#f7931a",
    ),
    "feedback": TagDef(
        slug="feedback",
        prefix="/feedback",
        label="Feedback",
        emoji="🔍",
        description="Reviews, critiques, and suggestions",
        color="#00ba7c",
    ),
    "idea": TagDef(
        slug="idea",
        prefix="/idea",
        label="Idea",
        emoji="💡",
        description="Brainstorming and creative ideas",
        color="#ffad1f",
    ),
    "outline": TagDef(
        slug="outline",
        prefix="/outline",
        label="Outline",
        emoji="🗂️",
        description="Story structure and outlines",
        color="#5b7083",
    ),
    "pov": TagDef(
        slug="pov",
        prefix="/pov",
        label="POV",
        emoji="👁️",
        description="Point of view and narrative voice",
        color="#c185ff",
    ),
    "tone": TagDef(
        slug="tone",
        prefix="/tone",
        label="Tone",
        emoji="🎵",
        description="Writing style, tone, and mood",
        color="#ff6b6b",
    ),
}


# ─────────────────────────────────────────────
# Utility helpers
# ─────────────────────────────────────────────

def get_all_tags() -> list[TagDef]:
    """Return all registered tags."""
    return list(TAGS.values())


def get_tag_by_slug(slug: str) -> Optional[TagDef]:
    """Get tag definition by its slug."""
    return TAGS.get(slug.lower())


def get_tag_by_prefix(text: str) -> Optional[TagDef]:
    """Parse a slash-prefix from the beginning of text.
    Returns (tag_def, remaining_text) or (None, original_text)."""
    if not text or not text.startswith("/"):
        return None
    # Split on first space
    parts = text.split(None, 1)
    prefix = parts[0].lower()
    for tag in TAGS.values():
        if prefix == tag.prefix:
            return tag
    return None


def parse_message(text: str) -> tuple[Optional[str], str]:
    """
    Parse a message for slash-tag prefix.
    Returns (tag_slug or None, cleaned_content).
    
    Example:
        "/plot The hero discovers the hidden cave" 
        → ("plot", "The hero discovers the hidden cave")
        
        "Just a regular chat message"
        → (None, "Just a regular chat message")
    """
    if not text:
        return None, text
    tag = get_tag_by_prefix(text)
    if tag is None:
        return None, text
    # Remove the prefix from content
    prefix = tag.prefix
    content = text[len(prefix):].strip()
    return tag.slug, content
