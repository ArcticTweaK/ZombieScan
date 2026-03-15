export interface ZombieResult {
  filePath: string;
  lineStart: number;
  lineEnd: number;
  zombieType: ZombieType;
  confidence: number; // 1-10
  codeSnippet: string;
  cure: string;
  functionName?: string;
}

export type ZombieType =
  | "Manual Polyfill"
  | "Legacy Debugger"
  | "Orphaned Logic"
  | "Dead Feature Flag"
  | "Redundant Abstraction"
  | "Obsolete Workaround"
  | "Vestigial Import"
  | "Zombie Comment Block";

export interface CodeChunk {
  filePath: string;
  code: string;
  lineStart: number;
  lineEnd: number;
  functionName?: string;
}

export interface ScanOptions {
  dryRun: boolean;
  prune: boolean;
  minConfidence: number;
  verbose: boolean;
  path: string;
}

export interface ScanReport {
  scannedFiles: number;
  totalChunks: number;
  zombiesFound: number;
  results: ZombieResult[];
  durationMs: number;
}