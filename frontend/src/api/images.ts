import client from './client';

export interface ImageOptimization {
  original_url: string;
  optimized_url: string;
  image_type?: string;
}

export interface ResponsiveSizes {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface ImageMetadata {
  original_url: string;
  optimized_url: string;
  responsive_sizes: ResponsiveSizes;
  settings: {
    max_width: number;
    max_height: number;
    quality: number;
    format: string;
  };
  format: string;
  max_width: number;
  max_height: number;
  quality: number;
}

export interface CDNConfig {
  cdn_enabled: boolean;
  cdn_url: string;
  image_optimization: boolean;
  supported_formats: string[];
  default_settings: Record<string, any>;
}

export const imagesApi = {
  // Optimize image (POST)
  optimizeImage: (data: {
    image_url: string;
    image_type?: string;
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
  }) =>
    client.post<ImageOptimization>('/images/optimize', data),

  // Optimize image (GET)
  optimizeImageGet: (params: {
    url: string;
    type?: string;
    width?: number;
    height?: number;
  }) =>
    client.get<ImageOptimization>('/images/optimize', { params }),

  // Get responsive sizes
  getResponsiveSizes: (url: string, type?: string) =>
    client.get<{ original_url: string; sizes: ResponsiveSizes }>('/images/responsive', {
      params: {
        url,
        ...(type ? { type } : {}),
      },
    }),

  // Get image metadata
  getMetadata: (url: string, type?: string) =>
    client.get<ImageMetadata>('/images/metadata', {
      params: {
        url,
        ...(type ? { type } : {}),
      },
    }),

  // Get CDN configuration
  getCDNConfig: () =>
    client.get<CDNConfig>('/images/cdn-config'),
};
