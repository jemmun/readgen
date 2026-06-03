/**
 * Novel creation tag system for group chat.
 * Mirrors backend app/core/tags.py.
 * Extend by adding entries to the TAGS record.
 */

export interface TagDef {
  slug: string;        // e.g. "plot", "character"
  prefix: string;      // slash command, e.g. "/plot"
  label: string;       // display label, e.g. "Plot"
  emoji: string;       // visual icon
  description: string; // tooltip / hint text
  color: string;       // hex color for badge
}

// ─────────────────────────────────────────────
// TAG REGISTRY — add new tags here to extend
// ─────────────────────────────────────────────
export const TAGS: Record<string, TagDef> = {
  plot: {
    slug: 'plot',
    prefix: '/plot',
    label: 'Plot',
    emoji: '📖',
    description: 'Storyline and plot development',
    color: '#1d9bf0',
  },
  character: {
    slug: 'character',
    prefix: '/character',
    label: 'Character',
    emoji: '🎭',
    description: 'Character creation, arcs, and development',
    color: '#e0245e',
  },
  chapter: {
    slug: 'chapter',
    prefix: '/chapter',
    label: 'Chapter',
    emoji: '📑',
    description: 'Chapter structure, scenes, and pacing',
    color: '#17bf63',
  },
  setting: {
    slug: 'setting',
    prefix: '/setting',
    label: 'Setting',
    emoji: '🌍',
    description: 'World building, locations, and atmosphere',
    color: '#794bc4',
  },
  dialogue: {
    slug: 'dialogue',
    prefix: '/dialogue',
    label: 'Dialogue',
    emoji: '💬',
    description: 'Character dialogue and conversations',
    color: '#f7931a',
  },
  feedback: {
    slug: 'feedback',
    prefix: '/feedback',
    label: 'Feedback',
    emoji: '🔍',
    description: 'Reviews, critiques, and suggestions',
    color: '#00ba7c',
  },
  idea: {
    slug: 'idea',
    prefix: '/idea',
    label: 'Idea',
    emoji: '💡',
    description: 'Brainstorming and creative ideas',
    color: '#ffad1f',
  },
  outline: {
    slug: 'outline',
    prefix: '/outline',
    label: 'Outline',
    emoji: '🗂️',
    description: 'Story structure and outlines',
    color: '#5b7083',
  },
  pov: {
    slug: 'pov',
    prefix: '/pov',
    label: 'POV',
    emoji: '👁️',
    description: 'Point of view and narrative voice',
    color: '#c185ff',
  },
  tone: {
    slug: 'tone',
    prefix: '/tone',
    label: 'Tone',
    emoji: '🎵',
    description: 'Writing style, tone, and mood',
    color: '#ff6b6b',
  },
} as const;

// ─────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────

/** Return all registered tags as array. */
export const getAllTags = (): TagDef[] => Object.values(TAGS);

/** Get tag by its slug. */
export const getTagBySlug = (slug: string): TagDef | undefined => TAGS[slug];

/** Match a slash-prefix from input text. Returns the first matching tag or undefined. */
export const matchTagPrefix = (text: string): TagDef | undefined => {
  if (!text || !text.startsWith('/')) return undefined;
  const parts = text.split(/\s+/, 1);
  const prefix = parts[0].toLowerCase();
  for (const tag of Object.values(TAGS)) {
    if (prefix === tag.prefix) return tag;
  }
  return undefined;
};

/** Extract tag from message content. Returns { tag, cleanContent }. */
export const extractTag = (content: string): { tag: string | null; cleanContent: string } => {
  const tag = matchTagPrefix(content);
  if (!tag) return { tag: null, cleanContent: content };
  return {
    tag: tag.slug,
    cleanContent: content.slice(tag.prefix.length).trim(),
  };
};

/** Get suggestions for autocomplete based on current input. */
export const getSuggestions = (input: string): TagDef[] => {
  if (!input.startsWith('/')) return [];
  const lower = input.toLowerCase();
  return getAllTags().filter((tag) => tag.prefix.startsWith(lower) || tag.slug.startsWith(lower.slice(1)));
};
