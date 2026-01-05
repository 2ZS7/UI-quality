export enum Severity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface AnalysisIssue {
  id: string;
  line?: number;
  message: string;
  severity: Severity;
  suggestion: string;
  category: 'ACCESSIBILITY' | 'PERFORMANCE' | 'BEST_PRACTICE' | 'LOGIC';
}

export interface StaticAnalysisResult {
  score: number;
  summary: string;
  issues: AnalysisIssue[];
  optimizedCode?: string;
}

export interface VisualDiffResult {
  diffPercentage: number;
  diffImageUrl: string;
  aiAnalysis: string;
  isPassed: boolean;
}

export enum Tab {
  DASHBOARD = 'DASHBOARD',
  STATIC_ANALYSIS = 'STATIC_ANALYSIS',
  VISUAL_REGRESSION = 'VISUAL_REGRESSION'
}