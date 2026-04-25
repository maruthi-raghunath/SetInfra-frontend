import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import InsightCard from '../../components/InsightCard/InsightCard';
import ResultTable from '../../components/ResultTable/ResultTable';
import MetricsSubtext from '../../components/MetricsSubtext/MetricsSubtext';
import {
  ApiErrorResponse,
  Chat,
  ChatMetrics,
  MessagesResponse,
  PaginatedResponse,
  SSEDataReadyPayload,
  SSEEvent,
  SSEMetricsPayload,
  Study,
} from '../../types';

// ── Local message model (same as NewChatPage) ─────────────────────────────────

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

const RecentChatPage: React.FC = () => {
  const { chat_id } = useParams<{ chat_id: string }>();
  const navigate = useNavigate();

  // Study context for the chat (loaded from chat listing)
  const [studies, setStudies] = useState<Study[]>([]);
  const [selectedStudyId, setSelectedStudyId] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);

  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusIcon, setStatusIcon] = useState('💬');
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [auditLogData, setAuditLogData] = useState<ChatMetrics['audit_log'] | null>(null);

  const feedEndRef = useRef<HTMLDivElement>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const fetchStudies = useCallback(async () => {
    try {
      const res = await api.get<PaginatedResponse<Study>>('/studies');
      setStudies(res.data.data);
      return res.data.data;
    } catch {
      return [];
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

  // Convert persisted ChatMessage → LocalMessage (assistant messages have no
  // sql / dataRows stored — show only the explanation text + metrics)
  const hydrateHistory = useCallback((data: MessagesResponse) => {
    const local: LocalMessage[] = data.messages.map((m) => ({
      id: m.id,
      role: m.role,
      text: m.message_body,
      metrics: m.role === 'assistant' ? (m.metrics_json ?? null) : undefined,
      stage: m.role === 'assistant' ? 'done' : undefined,
    }));
    setMessages(local);
  }, []);

  // ── Load chat on mount ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!chat_id) return;

    const load = async () => {
      setLoading(true);
      setGlobalError('');
      try {
        // 1. Get message history
        const msgRes = await api.get<MessagesResponse>(`/chats/${chat_id}/messages`);
        hydrateHistory(msgRes.data);

        // 2. Discover which study this chat belongs to by scanning all studies
        const allStudies = await fetchStudies();
        for (const study of allStudies) {
          try {
            const chatRes = await api.get<PaginatedResponse<Chat>>(
              `/chats?study_id=${study.id}`
            );
            const found = chatRes.data.data.find((c) => c.id === chat_id);
            if (found) {
              setSelectedStudyId(study.id);
              setChats(chatRes.data.data);
              break;
            }
          } catch {
            // skip
          }
        }
      } catch (err) {
        const apiErr = err as AxiosError<ApiErrorResponse>;
        setGlobalError(apiErr.response?.data?.message ?? 'Failed to load chat history.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [chat_id, fetchStudies, hydrateHistory]);

  // Scroll to bottom when messages change
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Delete chat ────────────────────────────────────────────────────────────

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const yes = window.confirm('The Chat will be permanently deleted. Are you sure (Y/N)?');
    if (!yes) return;
    try {
      await api.delete(`/chats/${chatId}`);
      if (chatId === chat_id) {
        navigate('/chat/new');
      } else {
        setChats((prev) => prev.filter((c) => c.id !== chatId));
      }
    } catch (err) {
      const apiErr = err as AxiosError<ApiErrorResponse>;
      setGlobalError(apiErr.response?.data?.message ?? 'Failed to delete chat.');
    }
  };

  // ── Send reply ─────────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    const trimmed = prompt.trim();
    if (!trimmed || !selectedStudyId || isStreaming) return;

    setGlobalError('');
    setIsStreaming(true);
    setStatusIcon('🤔');
    setPrompt('');

    const assistantId = crypto.randomUUID();

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', text: trimmed },
      { id: assistantId, role: 'assistant', text: '', stage: 'thinking' },
    ]);

    const token = localStorage.getItem('token') || '';

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
      body: JSON.stringify({
        study_id: selectedStudyId,
        chat_id: chat_id ?? null,
        prompt: trimmed,
      }),
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
                  const p = evt.payload as { sql: string };
                  updateAssistant((m) => ({ ...m, sql: p.sql, stage: 'sql_ready' }));
                  setStatusIcon('⚙️');
                  break;
                }

                case 'data_ready': {
                  const p = evt.payload as SSEDataReadyPayload;
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

                case 'done':
                  updateAssistant((m) => ({ ...m, stage: 'done' }));
                  setStatusIcon('💬');
                  setIsStreaming(false);
                  if (selectedStudyId) fetchChats(selectedStudyId);
                  break;
              }
            } catch {
              // malformed chunk
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
  }, [prompt, selectedStudyId, isStreaming, chat_id, fetchChats]);

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

        {msg.sql && <div className="sql-block">{msg.sql}</div>}

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

  const promptDisabled = !selectedStudyId || isStreaming;

  // ── JSX ────────────────────────────────────────────────────────────────────

  return (
    <div className="chat-screen">
      {/* ── Left sidebar ────────────────────────────────────────── */}
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">
          <p className="chat-sidebar-title">Setinfra</p>
          <button className="btn btn-new-chat" onClick={() => navigate('/home')}>
            ⌂ Home
          </button>
          <button className="btn btn-new-chat" onClick={() => navigate('/chat/new')}>
            + New chat
          </button>
        </div>

        <div className="chat-list" role="list">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`chat-list-item${chat.id === chat_id ? ' active' : ''}`}
              role="listitem"
              onClick={() => navigate(`/chat/${chat.id}`)}
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

      {/* ── Main workspace ──────────────────────────────────────── */}
      <div className="chat-workspace">
        {/* Top bar */}
        <div className="chat-topbar">
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {loading
              ? 'Loading history…'
              : selectedStudyId
              ? studies.find((s) => s.id === selectedStudyId)?.study_name ?? 'Chat history'
              : 'Chat history'}
          </span>
          <span className="chat-status-icon" title="System status">{statusIcon}</span>
        </div>

        {/* Error banner */}
        {globalError && (
          <div className="chat-error" role="alert">⚠ {globalError}</div>
        )}

        {/* Message feed */}
        <div className="chat-feed" role="log" aria-live="polite">
          {loading ? (
            <div className="thinking-bar" style={{ margin: 'auto' }}>
              <span>Loading history</span>
              <span className="thinking-dots"><span>.</span><span>.</span><span>.</span></span>
            </div>
          ) : (
            messages.map((msg) =>
              msg.role === 'user' ? (
                <div key={msg.id} className="msg-block msg-user">
                  <div className="msg-bubble">{msg.text}</div>
                </div>
              ) : (
                renderAssistantMessage(msg)
              )
            )
          )}
          <div ref={feedEndRef} />
        </div>

        {/* Reply input bar */}
        <div className="chat-inputbar">
          <textarea
            id="reply-input"
            className="chat-prompt-input"
            rows={1}
            value={prompt}
            placeholder={
              !selectedStudyId
                ? 'History loading…'
                : 'Reply or ask a follow-up… (Enter to send)'
            }
            disabled={promptDisabled}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            id="btn-reply-send"
            className="btn chat-send-btn"
            disabled={promptDisabled || !prompt.trim()}
            onClick={handleSend}
            aria-label="Send reply"
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

export default RecentChatPage;
