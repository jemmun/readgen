import client from './client';

export interface ContinuationSuggestion {
  text: string;
  type: 'plot' | 'character' | 'scene';
  description: string;
}

export interface PlotDevelopmentIdea {
  title: string;
  description: string;
  chapter_suggestion: string;
  impact: 'plot' | 'character' | 'world-building';
}

export interface WritingImprovement {
  type: 'style' | 'pacing' | 'description' | 'dialogue';
  suggestion: string;
  example?: string;
}

export interface ScenePrompt {
  title: string;
  description: string;
  emotional_hook: string;
  conflict_potential: string;
}

export const writingAssistantApi = {
  // Get continuation suggestions for current text
  getContinuationSuggestions: (data: {
    novel_id: number;
    chapter_id: number;
    current_text: string;
    language?: string;
  }) =>
    client.post<{ suggestions: ContinuationSuggestion[] }>('/writing-assistant/continuation', data),

  // Get plot development ideas
  getPlotDevelopmentIdeas: (data: {
    novel_id: number;
    current_chapter_num: number;
    language?: string;
  }) =>
    client.post<{ ideas: PlotDevelopmentIdea[] }>('/writing-assistant/plot-development', data),

  // Get writing improvement suggestions
  getWritingImprovements: (data: {
    text: string;
    language?: string;
  }) =>
    client.post<{
      overall_rating: string;
      strengths: string[];
      improvements: WritingImprovement[];
      rewrite_example?: {
        original: string;
        improved: string;
        explanation: string;
      };
    }>('/writing-assistant/improve-writing', data),

  // Generate scene prompts
  generateScenePrompts: (data: {
    novel_id: number;
    scene_type?: string;
    language?: string;
  }) =>
    client.post<{ prompts: ScenePrompt[] }>('/writing-assistant/scene-prompts', data),

  // Get scene prompts for novel (GET)
  getScenePromptsForNovel: (novelId: number, sceneType?: string) =>
    client.get<{ prompts: ScenePrompt[] }>(
      `/writing-assistant/scene-prompts/${novelId}`,
      { params: sceneType ? { scene_type: sceneType } : undefined }
    ),
};
