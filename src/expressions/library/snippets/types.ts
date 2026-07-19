export type SnippetCategory = 'motion' | 'values' | 'random' | 'linking' | 'time' | 'text';

export interface SnippetEntry {
  id: string;
  name: string;
  category: SnippetCategory;
  description: string;
  code: string;
}
