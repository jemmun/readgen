from typing import Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from app.services.image_optimization_service import image_optimization_service

router = APIRouter(prefix="/images", tags=["images"])


class ImageOptimizationRequest(BaseModel):
    image_url: str
    image_type: str = "cover_image"
    width: Optional[int] = None
    height: Optional[int] = None
    quality: Optional[int] = None
    format: Optional[str] = None


@router.post("/optimize")
def optimize_image(data: ImageOptimizationRequest):
    """Get optimized image URL."""
    optimized_url = image_optimization_service.generate_optimized_url(
        original_url=data.image_url,
        image_type=data.image_type,
        width=data.width,
        height=data.height,
        quality=data.quality,
        format=data.format,
    )
    return {
        "original_url": data.image_url,
        "optimized_url": optimized_url,
        "image_type": data.image_type,
    }


@router.get("/optimize")
def optimize_image_get(
    url: str,
    type: str = Query(default="cover_image", alias="image_type"),
    width: Optional[int] = None,
    height: Optional[int] = None,
):
    """Get optimized image URL (GET)."""
    optimized_url = image_optimization_service.generate_optimized_url(
        original_url=url,
        image_type=type,
        width=width,
        height=height,
    )
    return {
        "original_url": url,
        "optimized_url": optimized_url,
    }


@router.get("/responsive")
def get_responsive_sizes(
    url: str,
    type: str = Query(default="cover_image", alias="image_type"),
):
    """Get responsive image sizes for different screens."""
    sizes = image_optimization_service.get_responsive_sizes(
        original_url=url,
        image_type=type,
    )
    return {
        "original_url": url,
        "sizes": sizes,
    }


@router.get("/metadata")
def get_image_metadata(
    url: str,
    type: str = Query(default="cover_image", alias="image_type"),
):
    """Get image metadata and optimization info."""
    metadata = image_optimization_service.get_image_metadata(
        image_url=url,
        image_type=type,
    )
    return metadata


@router.get("/cdn-config")
def get_cdn_config():
    """Get CDN configuration."""
    return image_optimization_service.get_cdn_config()
