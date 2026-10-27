export type Scope = 'family' | 'work' | 'knowledge' | 'mixed';
export interface Round {
  id: string; span: [string, string]; title: string; scope: Scope;
  p_codes?: string[]; c_codes?: string[]; entities?: string[]; focus?: string;
  participants?: string[]; scenes?: string[]; mixed?: boolean; short?: boolean;
  skipped?: boolean; reason?: string; tombstone?: boolean; superseded_by?: string;
}
export interface TranscriptTurn { id: string; role: 'user' | 'ai' | 'assistant'; text: string; time?: string; }
export interface Settlement {
  version: string; schema_version?: string; session_id: string; revision: number;
  settled_at: string; settled_by: string; in_context: boolean; micro: boolean;
  confidence: 'high' | 'low'; tombstone?: boolean; supersedes?: string; superseded_by?: string;
  start: string; end: string; rounds: Round[];
}
export interface CommitOptions {
  sessionId: string; transcript: TranscriptTurn[]; rounds: Round[];
  settledBy?: string; inContext?: boolean; micro?: boolean; confidence?: 'high' | 'low';
  autoIndex?: boolean; continuityKey?: string; idempotencyKey?: string;
  codebookVersion?: string; observedAt?: string; validFrom?: string; validUntil?: string;
  expiresAt?: string; tombstone?: boolean; supersedes?: string; supersededBy?: string;
}
export interface CommitResult { ok: boolean; path?: string; settlement?: Settlement; idempotent?: boolean; errors?: string[]; }
