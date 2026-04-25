import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import InsightCard from '../../components/InsightCard/InsightCard';
import ResultTable from '../../components/ResultTable/ResultTable';
import MetricsSubtext from '../../components/MetricsSubtext/MetricsSubtext';
import {
  ApiErrorResponse,
  Chat,
  ChatMetrics,
  PaginatedResponse,
  SSEDataReadyPayload,
  SSEEvent,
  SSEMetricsPayload,
  Study,
} from '../../types';

// ── Local message model ───────────────────────────────────────────────────────

type Stage = 'thinking' | 'sql_ready' | 'data_ready' | 'streaming' | 'done' | 'error';

interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sql?: string;
  dataRows?: Record<string, unknown>[];
  chartType?: string;
  metrics?: ChatMetrics | null;
  stage?: Stage;
  error?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

const NewChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Studies + study selection
  const [studies, setStudies] = useState<Study[]>([]);
  const [selectedStudyId, setSelectedStudyId] = useState('');

  // Chats in left sidebar
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Messages rendered in centre pane
  const [messages, setMessages] = useState<LocalMessage[]>([]);

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusIcon, setStatusIcon] = useState('💬');
  const [globalError, setGlobalError] = useState('');

  // Prompt textarea
  const [prompt, setPrompt] = useState('');

  // Audit Log Modal state
  const [auditLogData, setAuditLogData] = useState<ChatMetrics['audit_log'] | null>(null);

  // Scroll anchor
  const feedEndRef = useRef<HTMLDivElement>(null);
  /** Apply `?study_id=` from URL once (e.g. from Upload Files) without fighting manual study changes. */
  const appliedStudyFromQuery = useRef(false);

  // ── Fetch helpers ──────────────────────────────────────────────────────────

  const fetchStudies = useCallback(async () => {
    try {
      const res = await api.get<PaginatedResponse<Study>>('/studies');
      setStudies(res.data.data);
    } catch {
      // swallow — studies may not load on first mount
    }
  }, []);

  const fetchChats = useCallback(async (studyId: string) => {
    if (!studyId) return;
    try {
      const res = await api.get<PaginatedResponse<Chat>>(`/chats?study_id=${studyId}`);
      setChats(res.data.data);
    } catch {
      setChats([]);
    }
  }, []);

  // ── On mount ───────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchStudies();
  }, [fetchStudies]);

  // Deep-link from Upload Files (and similar): /chat/new?study_id=…
  useEffect(() => {
    if (appliedStudyFromQuery.current) return;
    const fromUrl = searchParams.get('study_id');
    if (!fromUrl || studies.length === 0) return;
    if (!studies.some((s) => s.id === fromUrl)) return;
    appliedStudyFromQuery.current = true;
    setSelectedStudyId(fromUrl);
    setMessages([]);
    setActiveChatId(null);
    setGlobalError('');
    fetchChats(fromUrl);
  }, [searchParams, studies, fetchChats]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Study selection ────────────────────────────────────────────────────────

  const handleStudyChange = (studyId: string) => {
    setSelectedStudyId(studyId);
    setMessages([]);
    setActiveChatId(null);
    setGlobalError('');
    if (studyId) fetchChats(studyId);
    else setChats([]);
  };

  // ── Delete chat ────────────────────────────────────────────────────────────

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const yes = window.confirm('The Chat will be permanently deleted. Are you sure (Y/N)?');
    if (!yes) return;
    try {
      await api.delete(`/chats/${chatId}`);
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (activeChatId === chatId) {
        setActiveChatId(null);
        setMessages([]);
      }
    } catch (err) {
      const apiErr = err as AxiosError<ApiErrorResponse>;
      setGlobalError(apiErr.response?.data?.message ?? 'Failed to delete chat.');
    }
  };

  // ── New chat ───────────────────────────────────────────────────────────────

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setGlobalError('');
    setPrompt('');
  };

  // ── Sidebar chat click ─────────────────────────────────────────────────────

  const handleChatClick = (chatId: string) => {
    navigate(`/chat/${chatId}`);
  };

  // ── Send prompt ────────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    const trimmed = prompt.trim();
    if (!trimmed || !selectedStudyId || isStreaming) return;

    setGlobalError('');
    setIsStreaming(true);
    setStatusIcon('🤔');

    const msgId = crypto.randomUUID();

    // Add user message immediately
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', text: trimmed },
    ]);
    setPrompt('');

    // Add placeholder assistant message
    const assistantId = msgId;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', text: '', stage: 'thinking' },
    ]);

    // Build SSE via fetch + ReadableStream (POST body needed, EventSource doesn't support POST)
    const token = localStorage.getItem('token') || '';
    const body = JSON.stringify({
      study_id: selectedStudyId,
      chat_id: activeChatId ?? null,
      prompt: trimmed,
    });

    const updateAssistant = (updater: (msg: LocalMessage) => LocalMessage) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? updater(m) : m))
      );
    };

    fetch('/api/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
      },
      body,
    })
      .then(async (resp) => {
        if (!resp.body) throw new Error('No response body.');
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Each SSE chunk is "data: {...}\n\n"
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith('data:')) continue;
            try {
              const evt: SSEEvent = JSON.parse(line.slice(5).trim());

              switch (evt.event) {
                case 'thinking':
                  updateAssistant((m) => ({ ...m, stage: 'thinking' }));
                  setStatusIcon('🤔');
                  break;

                case 'sql_ready': {
                  const p = evt.payload as { sql: string; chat_id: string };
                  updateAssistant((m) => ({ ...m, sql: p.sql, stage: 'sql_ready' }));
                  setStatusIcon('⚙️');
                  break;
                }

                case 'data_ready': {
                  const p = evt.payload as SSEDataReadyPayload;
                  // Capture chat_id from first data_ready if we don't have one yet
                  if (!activeChatId && p.chat_id) setActiveChatId(p.chat_id);
                  updateAssistant((m) => ({
                    ...m,
                    dataRows: p.rows,
                    chartType: p.chart_type,
                    stage: 'data_ready',
                  }));
                  setStatusIcon('📊');
                  break;
                }

                case 'explanation': {
                  const p = evt.payload as { chunk: string };
                  updateAssistant((m) => ({
                    ...m,
                    text: m.text + p.chunk,
                    stage: 'streaming',
                  }));
                  setStatusIcon('✍️');
                  break;
                }

                case 'metrics': {
                  const p = evt.payload as SSEMetricsPayload;
                  updateAssistant((m) => ({ ...m, metrics: p, stage: 'done' }));
                  break;
                }

                case 'error': {
                  const p = evt.payload as { message: string };
                  updateAssistant((m) => ({ ...m, error: p.message, stage: 'error' }));
                  setGlobalError(p.message);
                  break;
                }

                case 'done': {
                  const p = evt.payload as { chat_id: string };
                  if (p.chat_id && !activeChatId) setActiveChatId(p.chat_id);
                  updateAssistant((m) => ({ ...m, stage: 'done' }));
                  setStatusIcon('💬');
                  setIsStreaming(false);
                  fetchChats(selectedStudyId);
                  break;
                }
              }
            } catch {
              // malformed SSE chunk — skip
            }
          }
        }
      })
      .catch((err: Error) => {
        updateAssistant((m) => ({ ...m, error: err.message, stage: 'error' }));
        setGlobalError(err.message);
        setStatusIcon('⚠️');
        setIsStreaming(false);
      });
  }, [prompt, selectedStudyId, isStreaming, activeChatId, fetchChats]);

  // Enter key sends (Shift+Enter = new line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderAssistantMessage = (msg: LocalMessage) => {
    const isCurrentlyStreaming = isStreaming && msg.stage === 'streaming';
    return (
      <div key={msg.id} className="msg-block msg-assistant">
        {msg.stage === 'thinking' && (
          <div className="thinking-bar">
            <span>Thinking</span>
            <span className="thinking-dots">
              <span>.</span><span>.</span><span>.</span>
            </span>
          </div>
        )}

        {msg.sql && (
          <div className="sql-block">{msg.sql}</div>
        )}

        {msg.dataRows && (
          <ResultTable rows={msg.dataRows} chartType={msg.chartType} />
        )}

        {(msg.text || isCurrentlyStreaming) && (
          <InsightCard text={msg.text} streaming={isCurrentlyStreaming} />
        )}

        {msg.error && (
          <div className="msg-bubble" style={{ color: '#7a2020', background: 'var(--danger-color)' }}>
            ⚠ {msg.error}
          </div>
        )}

        {msg.stage === 'done' && (
          <>
            <MetricsSubtext metrics={msg.metrics ?? null} />
            {msg.metrics?.audit_log && (
              <button
                className="btn"
                style={{ marginTop: '8px', fontSize: '11px', padding: '4px 8px' }}
                onClick={() => setAuditLogData(msg.metrics!.audit_log!)}
              >
                Prompt Audit Log
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  // ── JSX ────────────────────────────────────────────────────────────────────

  const promptDisabled = !selectedStudyId || isStreaming;

  return (
    <div className="chat-screen">
      {/* ── Left sidebar ────────────────────────────────────────────── */}
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">
          <p className="chat-sidebar-title">Setinfra</p>
          <button
            id="btn-home"
            className="btn btn-new-chat"
            onClick={() => navigate('/home')}
          >
            ⌂ Home
          </button>
          <button
            id="btn-new-chat"
            className="btn btn-new-chat"
            onClick={handleNewChat}
          >
            + New chat
          </button>
        </div>

        <div className="chat-list" role="list">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`chat-list-item${activeChatId === chat.id ? ' active' : ''}`}
              role="listitem"
              onClick={() => handleChatClick(chat.id)}
              title={chat.chat_title}
            >
              <span className="chat-list-item-title">{chat.chat_title}</span>
              <button
                className="chat-delete-btn"
                aria-label={`Delete chat ${chat.chat_title}`}
                onClick={(e) => handleDeleteChat(chat.id, e)}
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main workspace ──────────────────────────────────────────── */}
      <div className="chat-workspace">
        {/* Top bar */}
        <div className="chat-topbar">
          <select
            id="study-select"
            className="chat-study-select"
            value={selectedStudyId}
            onChange={(e) => handleStudyChange(e.target.value)}
            onClick={fetchStudies}
          >
            <option value="">-- Select Study --</option>
            {studies.map((s) => (
              <option key={s.id} value={s.id}>{s.study_name}</option>
            ))}
          </select>
          <span className="chat-status-icon" title="System status">{statusIcon}</span>
        </div>

        {/* Error banner */}
        {globalError && (
          <div className="chat-error" role="alert">⚠ {globalError}</div>
        )}

        {/* Message feed */}
        <div className="chat-feed" role="log" aria-live="polite">
          {messages.map((msg) =>
            msg.role === 'user' ? (
              <div key={msg.id} className="msg-block msg-user">
                <div className="msg-bubble">{msg.text}</div>
              </div>
            ) : (
              renderAssistantMessage(msg)
            )
          )}
          <div ref={feedEndRef} />
        </div>

        {/* Input bar */}
        <div className="chat-inputbar">
          <textarea
            id="prompt-input"
            className="chat-prompt-input"
            rows={1}
            value={prompt}
            placeholder={
              !selectedStudyId
                ? 'Please select a study to begin.'
                : 'Ask a clinical question… (Enter to send)'
            }
            disabled={promptDisabled}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            id="btn-send"
            className="btn chat-send-btn"
            disabled={promptDisabled || !prompt.trim()}
            onClick={handleSend}
            aria-label="Send prompt"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Audit Log Modal */}
      {auditLogData && (
        <div className="modal-overlay" onClick={() => setAuditLogData(null)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>Prompt Audit Log</span>
            </div>
            <div className="modal-body">
              <div className="modal-field">
                <label>User:</label>
                <input type="text" readOnly value={`${auditLogData.user_id} : ${auditLogData.username}`} />
              </div>
              <div className="modal-field">
                <label>Prompt ID:</label>
                <input type="text" readOnly value={`${auditLogData.prompt_id}: ${auditLogData.prompt_name}`} />
              </div>
              <div className="modal-field">
                <label>Time:</label>
                <input type="text" readOnly value={auditLogData.timestamp} />
              </div>
              <div className="modal-field">
                <label>Model Name:</label>
                <input type="text" readOnly value={auditLogData.model_name} />
              </div>
              <div className="modal-field">
                <label>LLM Prompt:</label>
                <textarea readOnly value={auditLogData.llm_prompt} style={{ height: '160px' }} />
              </div>
              <div className="modal-field">
                <label>SQL:</label>
                <textarea readOnly value={auditLogData.sql_query} style={{ height: '60px' }} />
              </div>
              <div className="modal-field">
                <label>RAG data:</label>
                <textarea readOnly value={auditLogData.rag_context} style={{ height: '120px' }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setAuditLogData(null)}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewChatPage;
