import client from './client';

export interface PlotConflict {
  type: 'timeline' | 'character' | 'logic' | 'setting' | 'continuity';
  chapters_involved: number[];
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface CharacterIssue {
  type: 'personality' | 'skill' | 'relationship' | 'motivation' | 'speech';
  description: string;
  chapters: number[];
  severity: 'low' | 'medium' | 'high';
}

export interface TimelineIssue {
  type: 'time_jump' | 'order' | 'contradiction' | 'seasonal' | 'age';
  description: string;
  chapters: number[];
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

export const plotConflictsApi = {
  // Detect plot conflicts in novel
  detectConflicts: (data: {
    novel_id: number;
    language?: string;
  }) =>
    client.post<{
      conflicts: PlotConflict[];
      total_conflicts: number;
      summary?: string;
    }>('/plot-conflicts/detect', data),

  // Check character consistency
  checkCharacterConsistency: (data: {
    novel_id: number;
    character_name: string;
    language?: string;
  }) =>
    client.post<{
      character: string;
      issues: CharacterIssue[];
      consistency_score?: number;
    }>('/plot-conflicts/character-consistency', data),

  // Validate timeline
  validateTimeline: (data: {
    novel_id: number;
    language?: string;
  }) =>
    client.post<{
      timeline_issues: TimelineIssue[];
      timeline_valid: boolean;
    }>('/plot-conflicts/validate-timeline', data),

  // Quick check (GET)
  getNovelConflicts: (novelId: number) =>
    client.get<{
      conflicts: PlotConflict[];
      total_conflicts: number;
    }>(`/plot-conflicts/novel/${novelId}`),
};
