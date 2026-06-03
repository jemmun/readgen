import client from './client';

export interface DailyChallenge {
  title: string;
  prompt: string;
  genre: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface DailyChallengeResponse {
  type: 'daily';
  date: string;
  challenges: DailyChallenge[];
}

export interface WeeklyChallenge {
  title: string;
  description: string;
  duration_days: number;
  requirements: string;
  examples: string[];
}

export interface WeeklyChallengeResponse {
  type: 'weekly';
  week_number: number;
  challenge: WeeklyChallenge;
  start_date: string;
}

export interface CustomChallenge {
  type: 'custom';
  genre: string;
  difficulty: string;
  word_count_target: number;
  suggested_prompts: DailyChallenge[];
}

export const creationChallengesApi = {
  // Get today's daily challenge
  getDailyChallenge: () =>
    client.get<DailyChallengeResponse>('/challenges/daily'),

  // Get current weekly challenge
  getWeeklyChallenge: () =>
    client.get<WeeklyChallengeResponse>('/challenges/weekly'),

  // Get random writing prompts
  getRandomPrompts: (category?: string, count?: number) =>
    client.get<{ prompts: string[] }>('/challenges/prompts', {
      params: {
        ...(category ? { category } : {}),
        ...(count ? { count } : {}),
      },
    }),

  // Get all prompt categories
  getPromptCategories: () =>
    client.get<{ categories: string[] }>('/challenges/prompts/categories'),

  // Generate custom challenge
  generateCustomChallenge: (data: {
    genre?: string;
    difficulty?: string;
    word_count_target?: number;
  }) =>
    client.post<CustomChallenge>('/challenges/custom', null, {
      params: {
        genre: data.genre || 'any',
        difficulty: data.difficulty || 'medium',
        word_count_target: data.word_count_target || 2000,
      },
    }),
};
