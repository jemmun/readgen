from typing import Dict, Optional
import os
import hashlib
from datetime import datetime


class ImageOptimizationService:
    """Image compression, optimization, and CDN integration."""

    # Supported image formats
    SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'gif']
    
    # Default optimization settings
    DEFAULT_SETTINGS = {
        'cover_image': {
            'max_width': 800,
            'max_height': 1200,
            'quality': 85,
            'format': 'webp',
        },
        'chapter_illustration': {
            'max_width': 1200,
            'max_height': 800,
            'quality': 80,
            'format': 'webp',
        },
        'avatar': {
            'max_width': 400,
            'max_height': 400,
            'quality': 90,
            'format': 'webp',
        },
        'thumbnail': {
            'max_width': 300,
            'max_height': 300,
            'quality': 75,
            'format': 'webp',
        },
    }

    @staticmethod
    def generate_optimized_url(
        original_url: str,
        image_type: str = 'cover_image',
        width: Optional[int] = None,
        height: Optional[int] = None,
        quality: Optional[int] = None,
        format: Optional[str] = None,
        use_cdn: bool = True,
    ) -> str:
        """
        Generate optimized image URL with CDN support.
        
        In production, this would integrate with:
        - Cloudflare Images
        - AWS CloudFront + Lambda@Edge
        - Imgix
        - Cloudinary
        - Custom CDN with image processing
        """
        settings = ImageOptimizationService.DEFAULT_SETTINGS.get(
            image_type, 
            ImageOptimizationService.DEFAULT_SETTINGS['cover_image']
        )
        
        # Use provided values or defaults
        final_width = width or settings['max_width']
        final_height = height or settings['max_height']
        final_quality = quality or settings['quality']
        final_format = format or settings['format']
        
        # Generate cache key
        cache_key = ImageOptimizationService._generate_cache_key(
            original_url, final_width, final_height, final_quality, final_format
        )
        
        # CDN URL pattern (example with CDN)
        if use_cdn:
            cdn_base = os.getenv('CDN_URL', 'https://cdn.readgen.com')
            optimized_url = f"{cdn_base}/images/{cache_key}.{final_format}"
            optimized_url += f"?w={final_width}&h={final_height}&q={final_quality}"
        else:
            # Local fallback
            optimized_url = original_url
        
        return optimized_url

    @staticmethod
    def _generate_cache_key(
        url: str,
        width: int,
        height: int,
        quality: int,
        format: str,
    ) -> str:
        """Generate unique cache key for optimized image."""
        # Extract filename from URL
        filename = url.split('/')[-1].split('?')[0]
        base_name = filename.rsplit('.', 1)[0] if '.' in filename else filename
        
        # Create hash from optimization parameters
        params_str = f"{base_name}_{width}x{height}_q{quality}_{format}"
        cache_hash = hashlib.md5(params_str.encode()).hexdigest()[:12]
        
        return f"{cache_hash}"

    @staticmethod
    def get_responsive_sizes(
        original_url: str,
        image_type: str = 'cover_image',
    ) -> Dict:
        """
        Generate multiple size variants for responsive images.
        Returns URLs for different screen sizes.
        """
        settings = ImageOptimizationService.DEFAULT_SETTINGS.get(
            image_type,
            ImageOptimizationService.DEFAULT_SETTINGS['cover_image']
        )
        
        base_width = settings['max_width']
        base_height = settings['max_height']
        
        # Generate responsive sizes
        sizes = {
            'xs': ImageOptimizationService.generate_optimized_url(
                original_url, image_type,
                width=int(base_width * 0.25),
                height=int(base_height * 0.25)
            ),
            'sm': ImageOptimizationService.generate_optimized_url(
                original_url, image_type,
                width=int(base_width * 0.5),
                height=int(base_height * 0.5)
            ),
            'md': ImageOptimizationService.generate_optimized_url(
                original_url, image_type,
                width=int(base_width * 0.75),
                height=int(base_height * 0.75)
            ),
            'lg': ImageOptimizationService.generate_optimized_url(
                original_url, image_type,
                width=base_width,
                height=base_height
            ),
            'xl': ImageOptimizationService.generate_optimized_url(
                original_url, image_type,
                width=int(base_width * 1.5),
                height=int(base_height * 1.5)
            ),
        }
        
        return sizes

    @staticmethod
    def get_image_metadata(
        image_url: str,
        image_type: str = 'cover_image',
    ) -> Dict:
        """Get metadata and optimization info for an image."""
        settings = ImageOptimizationService.DEFAULT_SETTINGS.get(
            image_type,
            ImageOptimizationService.DEFAULT_SETTINGS['cover_image']
        )
        
        optimized_url = ImageOptimizationService.generate_optimized_url(
            image_url, image_type
        )
        
        responsive_sizes = ImageOptimizationService.get_responsive_sizes(
            image_url, image_type
        )
        
        return {
            'original_url': image_url,
            'optimized_url': optimized_url,
            'responsive_sizes': responsive_sizes,
            'settings': settings,
            'format': settings['format'],
            'max_width': settings['max_width'],
            'max_height': settings['max_height'],
            'quality': settings['quality'],
        }

    @staticmethod
    def get_cdn_config() -> Dict:
        """Get CDN configuration."""
        return {
            'cdn_enabled': os.getenv('CDN_ENABLED', 'false').lower() == 'true',
            'cdn_url': os.getenv('CDN_URL', 'https://cdn.readgen.com'),
            'image_optimization': True,
            'supported_formats': ImageOptimizationService.SUPPORTED_FORMATS,
            'default_settings': ImageOptimizationService.DEFAULT_SETTINGS,
        }


image_optimization_service = ImageOptimizationService()
