export interface Draft {
  title: string;
  metaDescription: string;
  html: string;
}
export type Rule = 'title' | 'meta' | 'h1' | 'alt' | 'link';
export interface Finding {
  rule: Rule;
  message: string;
  context: string;
  suggestion: string;
}
export interface Report extends Draft {
  id: number;
  createdAt: string;
  findings: Finding[];
}
export interface ReportSummary {
  id: number;
  title: string;
  createdAt: string;
  findingCount: number;
}
