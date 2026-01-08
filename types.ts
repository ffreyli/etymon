export interface TimelineStep {
  era: string;
  year_approx?: string;
  language: string;
  word: string;
  transliteration?: string;
  meaning: string;
  type: 'root' | 'ancestor' | 'derived' | 'cognate' | 'borrowing' | 'current';
  description?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  transliteration?: string;
  language: string;
  definition?: string;
  era?: string; // Approximate time period
  type: 'root' | 'ancestor' | 'current' | 'cognate' | 'derivative';
  val?: number; // for visual size
}

export interface GraphLink {
  source: string;
  target: string;
  type: 'derived' | 'borrowed' | 'cognate';
}

export interface EtymologyGraph {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface EtymologyData {
  word: string;
  language: string;
  summary: string;
  timeline: TimelineStep[];
  graph: EtymologyGraph;
}

export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}