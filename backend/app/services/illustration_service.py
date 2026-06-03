import os
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.core.ai_provider import get_ai_provider
from app.models.illustration import Illustration

UPLOAD_DIR = "uploads/illustrations"
os.makedirs(UPLOAD_DIR, exist_ok=True)


async def generate_illustration(
    db: Session,
    user_id: int,
    prompt: str,
    style: str = "realistic",
    size: str = "1024x1024",
) -> Illustration:
    # Create illustration record
    illustration = Illustration(
        user_id=user_id,
        prompt=prompt,
        style=style,
        size=size,
        status="pending",
    )
    db.add(illustration)
    db.commit()
    db.refresh(illustration)
    
    try:
        # Generate image using AI provider
        provider = get_ai_provider()
        image_bytes = await provider.generate_image(prompt, style, size)
        
        # Save image
        filename = f"{illustration.id}_{uuid.uuid4().hex}.png"
        filepath = os.path.join(UPLOAD_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(image_bytes)
        
        # Update illustration
        illustration.image_url = f"/uploads/illustrations/{filename}"
        illustration.status = "completed"
        db.commit()
        db.refresh(illustration)
        
    except Exception as e:
        illustration.status = "failed"
        db.commit()
        raise e
    
    return illustration
