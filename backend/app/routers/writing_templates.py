from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.writing_template_service import writing_template_library
from app.models.user import User
from app.core.security import get_current_user_required

router = APIRouter(prefix="/writing-templates", tags=["writing-templates"])


@router.get("/genres")
def list_genre_templates():
    """List all available genre templates."""
    genres = writing_template_library.get_all_genres()
    templates = []
    for genre in genres:
        template = writing_template_library.get_genre_template(genre)
        templates.append({
            "genre": genre,
            "name": template["name"],
            "description": template["description"],
            "chapter_count": len(template["structure"]),
        })
    return {"templates": templates}


@router.get("/genres/{genre}")
def get_genre_template(genre: str):
    """Get detailed template for a specific genre."""
    template = writing_template_library.get_genre_template(genre)
    if not template:
        return {"error": f"Template not found for genre: {genre}"}
    return template


@router.get("/structures")
def list_story_structures():
    """List all available story structures."""
    structures = writing_template_library.get_all_structures()
    result = []
    for structure in structures:
        template = writing_template_library.get_structure_template(structure)
        result.append({
            "structure": structure,
            "name": template["name"],
            "description": template["description"],
        })
    return {"structures": result}


@router.get("/structures/{structure}")
def get_story_structure(structure: str):
    """Get detailed story structure template."""
    template = writing_template_library.get_structure_template(structure)
    if not template:
        return {"error": f"Structure not found: {structure}"}
    return template


@router.post("/generate-outline")
def generate_outline_from_template(
    genre: str,
    custom_title: Optional[str] = None,
    num_chapters: Optional[int] = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
):
    """Generate a chapter outline from a genre template."""
    result = writing_template_library.generate_outline_from_template(
        genre=genre,
        custom_title=custom_title,
        num_chapters=num_chapters,
    )
    return result
