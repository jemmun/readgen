import client from './client';

export interface Character {
  name: string;
  role: string;
  personality?: string;
}

export interface CharacterProfile {
  name: string;
  personality?: string;
  speech_style?: string;
}

export interface DialogueSceneResponse {
  scene: string;
  characters_involved: string[];
  context: string;
}

export interface DialogueConsistencyResponse {
  consistent: boolean;
  issues: Array<{
    character: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
    suggestion: string;
  }>;
  overall_score: number;
}

export interface CharacterVoiceProfile {
  character: string;
  speech_style: string;
  vocabulary: string;
  emotional_tone: string;
  common_patterns: string[];
  personality_traits: string[];
  writing_guidelines: string;
}

export const multiCharacterDialogueApi = {
  // Generate multi-character dialogue scene
  generateDialogueScene: (data: {
    novel_id: number;
    characters: Character[];
    scene_context: string;
    language?: string;
  }) =>
    client.post<DialogueSceneResponse>('/multi-character-dialogue/generate-scene', data),

  // Check dialogue consistency
  checkConsistency: (data: {
    dialogue_text: string;
    character_profiles: CharacterProfile[];
    language?: string;
  }) =>
    client.post<DialogueConsistencyResponse>('/multi-character-dialogue/check-consistency', data),

  // Learn character voice from existing chapters
  learnVoice: (data: {
    novel_id: number;
    character_name: string;
    language?: string;
  }) =>
    client.post<CharacterVoiceProfile>('/multi-character-dialogue/learn-voice', null, {
      params: {
        novel_id: data.novel_id,
        character_name: data.character_name,
        ...(data.language ? { language: data.language } : {}),
      },
    }),
};
