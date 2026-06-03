// Novel genre types for agent-specific content generation

export interface NovelGenre {
  key: string;
  emoji: string;
  labelEn: string;
  labelZh: string;
  descriptionEn: string;
  descriptionZh: string;
  agentPrompt: string; // Special instructions for AI agent
}

export const NOVEL_GENRES: NovelGenre[] = [
  {
    key: 'historical',
    emoji: '🏛️',
    labelEn: 'Historical Fiction',
    labelZh: '历史小说',
    descriptionEn: 'Set against historical events or figures',
    descriptionZh: '以历史事件或人物为背景',
    agentPrompt: 'Focus on historical accuracy, period-appropriate language, and real historical context. Blend fictional characters with actual historical events.',
  },
  {
    key: 'wuxia',
    emoji: '⚔️',
    labelEn: 'Martial Arts (Wuxia)',
    labelZh: '武侠小说',
    descriptionEn: 'Centered on martial arts, jianghu, and chivalry',
    descriptionZh: '以武术、江湖、侠义为主题',
    agentPrompt: 'Emphasize martial arts techniques, jianghu (martial world) culture, honor codes, and chivalrous heroes. Include detailed fight choreography.',
  },
  {
    key: 'romance',
    emoji: '💕',
    labelEn: 'Romance',
    labelZh: '言情小说',
    descriptionEn: 'Focuses on love stories and relationships',
    descriptionZh: '聚焦爱情故事',
    agentPrompt: 'Develop deep emotional connections between characters. Focus on relationship dynamics, romantic tension, and emotional growth.',
  },
  {
    key: 'scifi',
    emoji: '🚀',
    labelEn: 'Science Fiction',
    labelZh: '科幻小说',
    descriptionEn: 'Based on scientific concepts and speculation',
    descriptionZh: '基于科学幻想展开',
    agentPrompt: 'Incorporate scientific principles, futuristic technology, and speculative concepts. Maintain internal logic and scientific plausibility.',
  },
  {
    key: 'fantasy',
    emoji: '🧙',
    labelEn: 'Fantasy',
    labelZh: '奇幻小说',
    descriptionEn: 'Contains magic, otherworldly elements',
    descriptionZh: '包含魔法、异世界等元素',
    agentPrompt: 'Build rich magical systems, mythical creatures, and fantastical worlds. Establish clear magic rules and worldbuilding.',
  },
  {
    key: 'xuanhuan',
    emoji: '✨',
    labelEn: 'Eastern Fantasy (Xuanhuan)',
    labelZh: '玄幻小说',
    descriptionEn: 'Blends Eastern mysticism with fictional settings',
    descriptionZh: '融合东方玄学与虚构设定',
    agentPrompt: 'Incorporate Chinese mythology, cultivation elements, Eastern philosophy, and mystical powers. Use xianxia and wuxia tropes.',
  },
  {
    key: 'urban',
    emoji: '🏙️',
    labelEn: 'Urban Fiction',
    labelZh: '都市小说',
    descriptionEn: 'Reflects city life and modern society',
    descriptionZh: '反映城市生活',
    agentPrompt: 'Focus on contemporary urban settings, modern relationships, career struggles, and city culture. Keep scenarios realistic and relatable.',
  },
  {
    key: 'xianxia',
    emoji: '🌸',
    labelEn: 'Immortal Heroes (Xianxia)',
    labelZh: '仙侠小说',
    descriptionEn: 'Combines cultivation and immortal elements',
    descriptionZh: '结合修真与仙侠元素',
    agentPrompt: 'Emphasize cultivation progression, immortal realms, Taoist concepts, martial cultivation, and the journey to immortality.',
  },
  {
    key: 'apocalyptic',
    emoji: '☢️',
    labelEn: 'Post-Apocalyptic',
    labelZh: '末世小说',
    descriptionEn: 'Depicts world after catastrophic disaster',
    descriptionZh: '描写灾难后世界',
    agentPrompt: 'Create survival scenarios, post-disaster worldbuilding, human nature under extreme conditions, and rebuilding society.',
  },
  {
    key: 'military',
    emoji: '🎖️',
    labelEn: 'Military Fiction',
    labelZh: '军事小说',
    descriptionEn: 'Centered on warfare or military life',
    descriptionZh: '以战争或军旅生活为主题',
    agentPrompt: 'Focus on military strategy, combat scenarios, soldier camaraderie, tactical operations, and war experiences.',
  },
  {
    key: 'detective',
    emoji: '🔍',
    labelEn: 'Detective/Crime',
    labelZh: '公案小说',
    descriptionEn: 'Core focus on investigation and justice',
    descriptionZh: '以断案、司法为核心',
    agentPrompt: 'Develop mystery plots, logical deduction, crime investigation, and justice themes. Include clues, red herrings, and satisfying resolutions.',
  },
  {
    key: 'supernatural',
    emoji: '👻',
    labelEn: 'Supernatural/Legend',
    labelZh: '志怪/传奇小说',
    descriptionEn: 'Ancient tales of spirits and legends',
    descriptionZh: '古代常见',
    agentPrompt: 'Incorporate folklore, supernatural beings, ancient legends, mythical creatures, and traditional storytelling elements.',
  },
];

export const GENRE_KEYS = NOVEL_GENRES.map(g => g.key);

export function getGenreByKey(key: string): NovelGenre | undefined {
  return NOVEL_GENRES.find(g => g.key === key);
}
