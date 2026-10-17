import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from '../../components/Icon';
import { TODAY } from '../../data/prototype';
import type { ModuleProps, WorkbenchState } from '../../domain/models';
import { uid } from '../../domain/selectors';
import { contextName, createSummary } from './summary';

type AgentTab = WorkbenchState['agentTab'];
const tabs: { id: AgentTab; name: string; icon: string }[] = [
  { id: 'chat', name: '对话', icon: 'message' },
  { id: 'tasks', name: '任务', icon: 'check-list' },
  { id: 'artifacts', name: '产物', icon: 'file' },
];
const suggestions = [
  { icon: 'leaf', label: '本周复盘', prompt: '帮我整理一份本周个人复盘' },
  { icon: 'check-list', label: '整理待办', prompt: '整理我还没完成的任务' },
  { icon: 'search', label: '查看缺失记录', prompt: '查看这些记录还缺少什么' },
];

function downloadArtifact(title: string, body: string): void {
  const url = URL.createObjectURL(new Blob([body], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `owner-${title.replace(/[\\/:*?"<>|]/g, '-')}-${TODAY}.md`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function AgentWorkspace({
  state,
  mutate,
  open,
  toast,
  isOpen,
  onClose,
}: ModuleProps & { isOpen: boolean; onClose: () => void }) {
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const busyRef = useRef(false);
  const timer = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const activeTask = useRef<string | null>(null);
  const mutateRef = useRef(mutate);
  const input = useRef<HTMLTextAreaElement>(null);
  const chatFeed = useRef<HTMLDivElement>(null);
  const tabButtons = useRef<Partial<Record<AgentTab, HTMLButtonElement | null>>>({});
  const wasOpen = useRef(false);

  useEffect(() => {
    mutateRef.current = mutate;
  }, [mutate]);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      const taskId = activeTask.current;
      if (taskId) {
        mutateRef.current((draft) => {
          const task = draft.agentTasks.find((entry) => entry.id === taskId);
          if (task?.status === 'running') task.status = 'interrupted';
        });
      }
    },
    [],
  );

  useEffect(() => {
    const justOpened = isOpen && !wasOpen.current;
    wasOpen.current = isOpen;
    // Arrow navigation keeps focus on the selected tab, including the chat tab.
    if (!justOpened) return;
    const target = state.agentTab === 'chat' ? input.current : tabButtons.current[state.agentTab];
    target?.focus({ preventScroll: true });
  }, [isOpen, state.agentTab]);

  useEffect(() => {
    if (isOpen && state.agentTab === 'chat' && chatFeed.current) {
      chatFeed.current.scrollTop = state.messages.length ? chatFeed.current.scrollHeight : 0;
    }
  }, [isOpen, state.agentTab, state.messages.length, busy]);

  useEffect(() => {
    if (!isOpen) return;
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape' && !document.querySelector('dialog[open]')) {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  function sendPrompt(value: string): void {
    const trimmed = value.trim();
    if (busyRef.current || !trimmed) return;
    // Lock before persisting or rendering so Enter and a pointer event cannot start two runs.
    busyRef.current = true;
    const result = createSummary(state, state.context, trimmed);
    const taskId = uid();
    const taskContext = `${result.contextName} · 近 ${state.range} 天`;
    const saved = mutate((draft) => {
      draft.agentTab = 'chat';
      draft.agentTasks.push({
        id: taskId,
        title: result.title,
        context: taskContext,
        status: 'running',
        date: TODAY,
      });
      draft.messages.push({ id: uid(), role: 'user', text: trimmed });
    });
    if (!saved) {
      busyRef.current = false;
      return;
    }
    activeTask.current = taskId;
    setPrompt('');
    setBusy(true);
    timer.current = window.setTimeout(() => {
      const artifactId = uid();
      let completed = false;
      const persisted = mutateRef.current((draft) => {
        const task = draft.agentTasks.find((entry) => entry.id === taskId);
        // A reset, reload or cancellation must not produce an orphaned result.
        if (task?.status !== 'running') return;
        draft.artifacts.push({
          id: artifactId,
          title: result.title,
          context: taskContext,
          date: TODAY,
          body: result.body,
        });
        task.status = 'completed';
        task.artifactId = artifactId;
        draft.messages.push({
          id: uid(),
          role: 'assistant',
          text: result.reply,
          artifactId,
        });
        completed = true;
      });
      if (!persisted) toast('整理结果保存失败，请检查本地存储后重试。');
      else if (!completed) toast('这次演示任务已中断。');
      activeTask.current = null;
      timer.current = null;
      busyRef.current = false;
      setBusy(false);
    }, 900);
  }

  function switchTab(tab: AgentTab): void {
    mutate((draft) => {
      draft.agentTab = tab;
    });
  }

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, tab: AgentTab): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = tabs.findIndex((entry) => entry.id === tab);
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    const next = tabs[nextIndex];
    if (next) {
      switchTab(next.id);
      tabButtons.current[next.id]?.focus();
    }
  }

  return (
    <aside
      id="agent-window"
      className="agent-area glass-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="agent-title"
      hidden={!isOpen}
    >
      <div className="agent-header">
        <div className="agent-emblem">
          <Icon name="sparkles" />
        </div>
        <div>
          <h2 id="agent-title">
            J.A.R.V.I.S. <span className="agent-subtitle">个人 Agent</span>
          </h2>
          <p>
            <span className="status-dot" />
            工作区已就绪 <span className="demo-label">演示模式</span>
          </p>
        </div>
        <div className="agent-header-actions">
          <button
            className="icon-button"
            aria-label="查看 Agent 演示说明"
            aria-expanded={showInfo}
            aria-controls="agent-info"
            onClick={() => setShowInfo(!showInfo)}
          >
            <Icon name="info" />
          </button>
          <button className="icon-button" aria-label="收起 Agent 工作窗" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
      </div>
      {showInfo && (
        <p
          id="agent-info"
          className="content-prose"
          style={{ padding: '0 18px 12px', fontSize: 11 }}
        >
          这里演示上下文选择、任务进度和产物保存。回复由本地规则生成，未连接 AI
          模型，也没有执行外部操作。
        </p>
      )}
      <div className="agent-tabs" role="tablist" aria-label="Agent 工作区">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={(node) => {
              tabButtons.current[tab.id] = node;
            }}
            id={`agent-tab-${tab.id}`}
            role="tab"
            aria-controls={`agent-panel-${tab.id}`}
            aria-selected={state.agentTab === tab.id}
            tabIndex={state.agentTab === tab.id ? 0 : -1}
            onClick={() => switchTab(tab.id)}
            onKeyDown={(event) => handleTabKey(event, tab.id)}
          >
            <Icon name={tab.icon} />
            {tab.name}
            {tab.id !== 'chat' && (
              <span>{tab.id === 'tasks' ? state.agentTasks.length : state.artifacts.length}</span>
            )}
          </button>
        ))}
      </div>
      <div className="context-strip">
        <span>
          <Icon name="link" />
        </span>
        <div>
          <span>当前上下文</span>
          <strong>
            {contextName(state.context)} · 近 {state.range} 天
          </strong>
        </div>
        <button
          className="icon-button"
          aria-label="切换到个人总览上下文"
          onClick={() =>
            mutate((draft) => {
              draft.context = 'overview';
            })
          }
        >
          <Icon name="x" />
        </button>
      </div>
      <section
        id="agent-panel-chat"
        className="agent-panel"
        role="tabpanel"
        aria-labelledby="agent-tab-chat"
        hidden={state.agentTab !== 'chat'}
      >
        <div
          ref={chatFeed}
          className="chat-feed"
          role="log"
          aria-label="Agent 对话记录"
          aria-live="polite"
          aria-busy={busy}
        >
          <div className="message">
            <div className="message-avatar">
              <Icon name="sparkles" />
            </div>
            <div className="message-content">
              <div className="message-label">
                个人 Agent <small>演示模式</small>
              </div>
              <div className="message-bubble">
                <div className="welcome-message-title">你好，这里是你的工作空间。</div>
                把面板中的一组信息交给我，
                <br />
                我们可以从整理近况或推进一件事开始。
                <div className="welcome-message-sub">
                  你选择信息，我整理成记录。
                  <br />
                  这版先体验流程，回复由本地规则生成。
                </div>
              </div>
            </div>
          </div>
          {state.messages.map((message) => (
            <div key={message.id} className={`message${message.role === 'user' ? ' user' : ''}`}>
              <div className="message-avatar">
                {message.role === 'user' ? '我' : <Icon name="sparkles" />}
              </div>
              <div className="message-content">
                <div className="message-label">
                  {message.role === 'user' ? (
                    '我'
                  ) : (
                    <>
                      个人 Agent <small>演示回复</small>
                    </>
                  )}
                </div>
                <div className="message-bubble">
                  {message.text}
                  {message.artifactId && (
                    <div>
                      <button
                        className="message-action"
                        onClick={() => open({ kind: 'artifact', id: message.artifactId! })}
                      >
                        <Icon name="file" />
                        查看整理结果 <Icon name="arrow-right" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {busy && (
            <div className="typing">
              <i />
              正在整理本地原型记录…
            </div>
          )}
        </div>
        <div className="suggestion-area">
          <span>从一件小事开始</span>
          <div className="suggestion-list">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.prompt}
                disabled={busy}
                onClick={() => sendPrompt(suggestion.prompt)}
              >
                <Icon name={suggestion.icon} />
                {suggestion.label}
              </button>
            ))}
          </div>
        </div>
        <form
          className="agent-composer"
          onSubmit={(event) => {
            event.preventDefault();
            sendPrompt(prompt);
          }}
        >
          <label className="sr-only" htmlFor="agent-input">
            向 Agent 描述任务
          </label>
          <textarea
            id="agent-input"
            ref={input}
            rows={2}
            maxLength={1000}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="想了解什么，或想推进哪件事？"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                sendPrompt(prompt);
              }
            }}
          />
          <div className="composer-footer">
            <span>
              <Icon name="shield" />
              基于本地原型记录
            </span>
            <button
              className="send-button"
              type="submit"
              aria-label="发送任务"
              disabled={busy || !prompt.trim()}
            >
              <Icon name="arrow-up" />
            </button>
          </div>
        </form>
        <p className="agent-disclaimer">演示回复由本地规则生成，尚未连接 AI 模型。</p>
      </section>
      <section
        id="agent-panel-tasks"
        className="agent-panel list-panel"
        role="tabpanel"
        aria-labelledby="agent-tab-tasks"
        hidden={state.agentTab !== 'tasks'}
      >
        {state.agentTasks.length ? (
          [...state.agentTasks].reverse().map((task) => (
            <article key={task.id} className="workspace-item">
              <div className="workspace-item-header">
                <Icon name="check-list" />
                <span>{task.title}</span>
                <span className={`task-state${task.status === 'running' ? ' running' : ''}`}>
                  {{ running: '整理中', completed: '已完成', interrupted: '已中断' }[task.status]}
                </span>
              </div>
              <p>上下文：{task.context} · 本地演示流程</p>
              <div className="task-step">
                <Icon name="check" />
                读取选中的原型记录
              </div>
              <div className="task-step">
                <Icon name={task.status === 'completed' ? 'check' : 'clock'} />
                整理信息与记录空缺
              </div>
              <div className="task-step">
                <Icon name={task.status === 'completed' ? 'check' : 'clock'} />
                保存整理结果
                {task.artifactId && (
                  <button
                    className="text-button"
                    onClick={() => open({ kind: 'artifact', id: task.artifactId! })}
                  >
                    查看
                  </button>
                )}
              </div>
              {task.status === 'interrupted' && (
                <p>上次整理未完成。记录已保留，可从对话重新发起。</p>
              )}
            </article>
          ))
        ) : (
          <div className="workspace-empty">
            <Icon name="check-list" />
            <strong>留一件事给 Agent</strong>从对话发送任务后，在这里查看演示进度。
          </div>
        )}
      </section>
      <section
        id="agent-panel-artifacts"
        className="agent-panel list-panel"
        role="tabpanel"
        aria-labelledby="agent-tab-artifacts"
        hidden={state.agentTab !== 'artifacts'}
      >
        {state.artifacts.length ? (
          [...state.artifacts].reverse().map((artifact) => (
            <article key={artifact.id} className="workspace-item">
              <div className="workspace-item-header">
                <Icon name="file" />
                <span>{artifact.title}</span>
              </div>
              <p>
                {artifact.context} · {artifact.date} · Markdown 记录
              </p>
              <div className="settings-actions">
                <button
                  className="secondary-button"
                  onClick={() => open({ kind: 'artifact', id: artifact.id })}
                >
                  <Icon name="eye" />
                  打开
                </button>
                <button
                  className="text-button"
                  onClick={() => downloadArtifact(artifact.title, artifact.body)}
                >
                  <Icon name="download" />
                  导出
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="workspace-empty">
            <Icon name="file" />
            <strong>每一次整理，留下一个结果</strong>完成的演示任务会在这里生成可导出的记录。
          </div>
        )}
      </section>
    </aside>
  );
}
