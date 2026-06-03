import client from './client';

export interface NovelTag {
  id: number;
  novel_id: number;
  tag: string;
}

export const novelTagsApi = {
  add: (novelId: number, tag: string) => client.post<NovelTag>('/novel-tags', { novel_id: novelId, tag }),
  remove: (tagId: number) => client.delete(`/novel-tags/${tagId}`),
  getByNovel: (novelId: number) => client.get<NovelTag[]>(`/novel-tags/novel/${novelId}`),
  getPopular: () => client.get<string[]>('/novel-tags/popular'),
};
