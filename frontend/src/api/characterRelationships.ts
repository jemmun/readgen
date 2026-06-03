import client from './client';

export interface Character {
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'mentor';
  description: string;
  importance: 'main' | 'supporting' | 'minor';
}

export interface Relationship {
  character1: string;
  character2: string;
  type: 'family' | 'friend' | 'enemy' | 'romantic' | 'mentor' | 'rival' | 'ally' | 'colleague';
  strength: 'strong' | 'moderate' | 'weak';
  evolution: string;
  description: string;
  key_moments: string[];
}

export interface RelationshipEvolution {
  chapter: number;
  relationship_state: string;
  key_interaction: string;
  emotional_tone: 'positive' | 'negative' | 'neutral' | 'conflicted';
  change: string;
}

export interface NetworkConnection {
  character: string;
  relationship_type: string;
  importance_to_focus: 'high' | 'medium' | 'low';
  interaction_frequency: 'frequent' | 'occasional' | 'rare';
  relationship_quality: 'positive' | 'negative' | 'complex' | 'neutral';
  description: string;
}

export const characterRelationshipsApi = {
  // Analyze all character relationships
  analyzeRelationships: (data: {
    novel_id: number;
    language?: string;
  }) =>
    client.post<{
      characters: Character[];
      relationships: Relationship[];
      relationship_summary: string;
    }>('/character-relationships/analyze', data),

  // Track relationship evolution between two characters
  trackEvolution: (data: {
    novel_id: number;
    character1: string;
    character2: string;
    language?: string;
  }) =>
    client.post<{
      character1: string;
      character2: string;
      evolution: RelationshipEvolution[];
      overall_arc: string;
      final_state: string;
    }>('/character-relationships/evolution', data),

  // Get character network
  getCharacterNetwork: (data: {
    novel_id: number;
    focus_character: string;
    language?: string;
  }) =>
    client.post<{
      focus_character: string;
      network: NetworkConnection[];
      network_summary: string;
    }>('/character-relationships/network', data),

  // Quick analysis (GET)
  getNovelRelationships: (novelId: number) =>
    client.get<{
      characters: Character[];
      relationships: Relationship[];
      relationship_summary: string;
    }>(`/character-relationships/novel/${novelId}`),
};
