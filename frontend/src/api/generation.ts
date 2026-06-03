import client from './client';

export const generationApi = {
  start: (novelId: number) =>
    client.post<{ session_id: number; novel_id: number; status: string; message: string; outline: string }>(
      `/generation/novels/${novelId}/generate`
    ),

  getOutline: (novelId: number) =>
    client.get<{ outline: string }>(`/generation/novels/${novelId}/outline`),

  updateOutline: (sessionId: number, outline: string) =>
    client.put(`/generation/${sessionId}/outline`, outline, {
      headers: { 'Content-Type': 'text/plain' },
    }),

  continue: (sessionId: number, userDirection?: string) =>
    client.post<{
      chapter_id: number;
      chapter_number: number;
      title: string;
      word_count: number;
      content: string;
      novel_status: string;
      total_word_count: number;
    }>(`/generation/${sessionId}/continue`, { user_direction: userDirection }),

  cancel: (sessionId: number) =>
    client.post(`/generation/${sessionId}/cancel`),

  updateNovelOutline: (novelId: number, outline: string) =>
    client.put<{ message: string; outline: string }>(`/generation/novels/${novelId}/outline`, outline, {
      headers: { 'Content-Type': 'text/plain' },
    }),

  regenerateOutline: (novelId: number) =>
    client.post<{ outline: string; session_id: number }>(`/generation/novels/${novelId}/regenerate-outline`),

  getOutlineChapters: (novelId: number) =>
    client.get<{ chapters: Array<{ chapter_number: number; title: string; summary: string; key_points: string; continuity: string }>; total: number }>(`/generation/novels/${novelId}/outline/chapters`),

  streamSingleChapter: async (
    novelId: number,
    chapterIndex: number,
    onChunk: (chunk: string) => void,
    onDone: () => void,
    onError: (err: string) => void
  ) => {
    const { authApi } = require('./auth');
    const token = await authApi.getToken();
    const url = `${client.defaults.baseURL}/generation/novels/${novelId}/generate/chapter/${chapterIndex}/stream${token ? `?token=${token}` : ''}`;
    console.log('[SSE-Single] Connecting to:', url.substring(0, 100));
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      console.log('[SSE-Single] Connection opened for chapter', chapterIndex);
    };

    eventSource.onmessage = (event) => {
      console.log('[SSE-Single] Chunk:', event.data.substring(0, 80));
      if (event.data === '[DONE]') {
        console.log('[SSE-Single] Stream complete for chapter', chapterIndex);
        onDone();
        eventSource.close();
      } else if (event.data === '[CANCELLED]') {
        console.log('[SSE-Single] Stream cancelled');
        onDone();
        eventSource.close();
      } else if (event.data.startsWith('[ERROR]')) {
        console.error('[SSE-Single] Server error:', event.data);
        onError(event.data);
        eventSource.close();
      } else {
        onChunk(event.data);
      }
    };

    eventSource.onerror = (e) => {
      console.error('[SSE-Single] Error:', e, 'readyState:', eventSource.readyState);
      if (eventSource.readyState === EventSource.CLOSED) {
        onError('Connection closed unexpectedly');
      }
    };

    return eventSource;
  },

  interact: (sessionId: number, type: string, content: string) =>
    client.post(`/generation/${sessionId}/interact`, {
      session_id: sessionId,
      interaction_type: type,
      content,
    }),

  streamInitial: async (
    novelId: number,
    onChunk: (chunk: string) => void,
    onDone: () => void,
    onError: (err: string) => void
  ) => {
    const { authApi } = require('./auth');
    const token = await authApi.getToken();
    const baseUrl = `${client.defaults.baseURL}/generation/novels/${novelId}/generate/stream`;
    const url = token ? `${baseUrl}?token=${token}` : baseUrl;
    console.log('[SSE] Connecting to:', url.substring(0, 100));
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      console.log('[SSE] Connection opened');
    };

    eventSource.onmessage = (event) => {
      console.log('[SSE] Received chunk:', event.data.substring(0, 80));
      if (event.data === '[DONE]') {
        console.log('[SSE] Stream complete');
        onDone();
        eventSource.close();
      } else if (event.data === '[CANCELLED]') {
        console.log('[SSE] Stream cancelled by user');
        onDone();
        eventSource.close();
      } else if (event.data.startsWith('[ERROR]')) {
        console.error('[SSE] Server error:', event.data);
        onError(event.data);
        eventSource.close();
      } else {
        onChunk(event.data);
      }
    };

    eventSource.onerror = (err) => {
      console.error('[SSE] Connection error:', err);
      // Only report as error if the connection is actually closed (readyState === 2)
      // EventSource auto-reconnects on transient errors (readyState === 0)
      if (eventSource.readyState === EventSource.CLOSED) {
        onError('Stream connection closed unexpectedly. Please try again.');
      }
    };

    return eventSource;
  },

  streamContinue: async (sessionId: number, userDirection: string | undefined, onChunk: (chunk: string) => void, onDone: () => void, onError: (err: string) => void) => {
    const { authApi } = require('./auth');
    const token = await authApi.getToken();
    const baseStreamUrl = userDirection
      ? `${client.defaults.baseURL}/generation/${sessionId}/continue/stream?user_direction=${encodeURIComponent(userDirection)}`
      : `${client.defaults.baseURL}/generation/${sessionId}/continue/stream`;
    const url = token ? `${baseStreamUrl}${userDirection ? '&' : '?'}token=${token}` : baseStreamUrl;
    console.log('[SSE] Connecting to:', url.substring(0, 100));
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      console.log('[SSE] Connection opened');
    };

    eventSource.onmessage = (event) => {
      console.log('[SSE] Received chunk:', event.data.substring(0, 80));
      if (event.data === '[DONE]') {
        console.log('[SSE] Stream complete');
        onDone();
        eventSource.close();
      } else if (event.data === '[CANCELLED]') {
        console.log('[SSE] Stream cancelled by user');
        onDone();
        eventSource.close();
      } else if (event.data.startsWith('[ERROR]')) {
        console.error('[SSE] Server error:', event.data);
        onError(event.data);
        eventSource.close();
      } else {
        onChunk(event.data);
      }
    };

    eventSource.onerror = (err) => {
      console.error('[SSE] Connection error:', err);
      if (eventSource.readyState === EventSource.CLOSED) {
        onError('Stream connection closed unexpectedly. Please try again.');
      }
    };

    return eventSource;
  },
};
