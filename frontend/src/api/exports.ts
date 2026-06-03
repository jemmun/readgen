import { authApi } from './auth';

const API_BASE_URL = 'http://localhost:8000';

export interface ExportOptions {
  includeMetadata?: boolean;
  chapterFrom?: number;
  chapterTo?: number;
}

/**
 * Build a full download URL with the auth token appended as a query parameter.
 * The backend SSE/export endpoints accept ?token= for authentication because
 * the system's share sheet / file download APIs cannot set custom headers.
 */
async function buildExportUrl(
  novelId: number,
  format: 'epub' | 'pdf',
  options?: ExportOptions
): Promise<string> {
  const token = await authApi.getToken();
  const base = `${API_BASE_URL}/novels/${novelId}/export/${format}`;
  
  const params = new URLSearchParams();
  if (token) {
    params.set('token', token);
  }
  if (options?.includeMetadata !== undefined) {
    params.set('include_metadata', String(options.includeMetadata));
  }
  if (options?.chapterFrom) {
    params.set('chapter_from', String(options.chapterFrom));
  }
  if (options?.chapterTo) {
    params.set('chapter_to', String(options.chapterTo));
  }
  
  const queryString = params.toString();
  return queryString ? `${base}?${queryString}` : base;
}

export const exportsApi = {
  getEpubUrl: (novelId: number, options?: ExportOptions) => buildExportUrl(novelId, 'epub', options),
  getPdfUrl: (novelId: number, options?: ExportOptions) => buildExportUrl(novelId, 'pdf', options),
};
