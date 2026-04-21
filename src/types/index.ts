export interface Study {
  id: string;
  study_name: string;
  status: string;
  created_at: string;
}

export interface CreateStudyResponse {
  study_id: string;
  status: string;
}

export interface FileRecord {
  id: string;
  study_id: string;
  file_name: string;
  file_type: string;
  is_processed: boolean;
  created_at: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface UploadFileResponse {
  file_id: string;
  status: string;
}

export interface ProcessFilesResponse {
  status: string;
  tables_created: string[];
}

export interface DeleteStatusResponse {
  status: string;
}

export interface ApiErrorResponse {
  error_code: string;
  message: string;
  details?: string;
}

// ── Chat types ──────────────────────────────────────────────────────────────

export interface Chat {
  id: string;
  chat_title: string;
  created_at: string;
}

export interface ChatMetrics {
  trace_id?: string;
  /** Masked GEMINI_API_KEY (auth only; not sent inside the model prompt). */
  gemini_api_key_preview?: string;
  llm_model?: string;
  total_latency_ms?: number;
  row_count?: number;
  rag_ms?: number;
  duckdb_exec_ms?: number;
  planner_llm_ms?: number;
  first_byte_ms?: number;
  stats_skipped?: boolean;
  chart_type?: string;
  audit_log?: {
    prompt_id: string;
    timestamp: string;
    llm_prompt: string;
    sql_query: string;
    rag_context: string;
    user_id: string;
    username: string;
    model_name: string;
    prompt_name: string;
  };
  [key: string]: unknown;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  message_body: string;
  metrics_json: ChatMetrics | null;
  created_at: string;
}

export interface MessagesResponse {
  messages: ChatMessage[];
}

// ── SSE event shapes ─────────────────────────────────────────────────────────

export type SSEEventType =
  | 'thinking'
  | 'sql_ready'
  | 'data_ready'
  | 'explanation'
  | 'metrics'
  | 'done'
  | 'error';

export interface SSEThinkingPayload { stage: string; chat_id: string; }
export interface SSESqlReadyPayload { sql: string; chat_id: string; }
export interface SSEDataReadyPayload {
  rows: Record<string, unknown>[];
  chart_type: string;
  chat_id: string;
}
export interface SSEExplanationPayload { chunk: string; chat_id: string; }
export interface SSEMetricsPayload extends ChatMetrics { chat_id?: string; }
export interface SSEDonePayload { chat_id: string; }
export interface SSEErrorPayload { message: string; chat_id: string; }

export interface SSEEvent {
  event: SSEEventType;
  payload:
    | SSEThinkingPayload
    | SSESqlReadyPayload
    | SSEDataReadyPayload
    | SSEExplanationPayload
    | SSEMetricsPayload
    | SSEDonePayload
    | SSEErrorPayload;
}

