import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { DOMAINS } from '../domain/models';
import type { DialogRequest, ModuleProps, View } from '../domain/models';
import { Overview } from '../features/overview/Overview';
import { useWorkbench } from './useWorkbench';
import { SpaceControls } from '../features/settings/SpaceControls';
import { todayOf } from '../domain/selectors';
import { usePageNavigation, viewFromHash } from './usePageNavigation';
import { loadDomainDetails } from './detailModule';
import { NavigationIndicator } from '../components/NavigationIndicator';

const AgentWorkspace = lazy(() =>
  import('../features/agent/AgentWorkspace').then((module) => ({ default: module.AgentWorkspace })),
);
const RecordEditor = lazy(() =>
  import('../features/records/RecordEditor').then((module) => ({ default: module.RecordEditor })),
);
const Managers = lazy(() =>
  import('../features/records/Managers').then((module) => ({ default: module.Managers })),
);
const DataManager = lazy(() =>
  import('../features/records/DataManager').then((module) => ({ default: module.DataManager })),
);
const BackupManager = lazy(() =>
  import('../features/settings/BackupManager').then((module) => ({
    default: module.BackupManager,
  })),
);

export function App() {
  const [toastText, setToastText] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useCallback((message: string) => {
    setToastText(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastText(''), 4000);
  }, []);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );
  const workbench = useWorkbench(toast);
  const { state: storedState, warning, mutate } = workbench;
  const [agentContext, setAgentContext] = useState<View>(viewFromHash);
  const state = { ...storedState, context: agentContext };
  const navigation = useRef<HTMLElement>(null);
  const [details, setDetails] = useState<{
    Component: typeof import('../features/details/DomainDetails').DomainDetails;
  } | null>(null);
  const [detailsError, setDetailsError] = useState(false);
  const prepare = useCallback(async (next: View) => {
    if (next === 'overview') return;
    try {
      const module = await loadDomainDetails();
      setDetails((current) => current ?? { Component: module.DomainDetails });
      setDetailsError(false);
    } catch (error) {
      setDetailsError(true);
      throw error;
    }
  }, []);
  const { view, activeView, navigate, pending } = usePageNavigation({
    spaceId: workbench.active,
    ready: workbench.ready,
    prepare,
    onChange: setAgentContext,
    notify: toast,
  });
  const DomainDetails = details?.Component;
  useEffect(() => {
    if (!workbench.ready || view === 'overview') return;
    let active = true;
    void loadDomainDetails()
      .then((module) => {
        if (active) {
          setDetails((current) => current ?? { Component: module.DomainDetails });
          setDetailsError(false);
        }
      })
      .catch(() => {
        if (active) setDetailsError(true);
      });
    return () => {
      active = false;
    };
  }, [view, workbench.ready]);
  const preloadDetails = () => {
    void loadDomainDetails().catch(() => {});
  };
  const [dialog, setDialog] = useState<DialogRequest | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentLoaded, setAgentLoaded] = useState(false);
  const closeDialog = useCallback(() => setDialog(null), []);
  const open = useCallback(
    (request: DialogRequest) => {
      if (
        request.kind === 'record' &&
        request.record === 'goal' &&
        !request.id &&
        state.goals.length >= 3
      ) {
        toast('最多保留 3 个阶段目标，可先编辑或删除已有目标');
        return;
      }
      setDialog(request);
    },
    [state.goals.length, toast],
  );
  const closeAgent = useCallback(() => {
    setAgentOpen(false);
    queueMicrotask(() => document.getElementById('agent-launcher')?.focus({ preventScroll: true }));
  }, []);
  const onAgent = useCallback(
    (context: View) => {
      setAgentContext(context);
      if (state.agentTab !== 'chat')
        mutate((draft) => {
          draft.agentTab = 'chat';
        });
      setAgentLoaded(true);
      setAgentOpen(true);
    },
    [mutate, state.agentTab],
  );
  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    document.title = `Owner · ${view === 'overview' ? '我的工作台' : DOMAINS.find((domain) => domain.id === view)?.name || '总览'}`;
  }, [state.theme, view]);
  const domain = DOMAINS.find((item) => item.id === view);
  const moduleProps: ModuleProps = { state, mutate, open, navigate, toast, onAgent };
  const dialogKey = dialog
    ? dialog.kind +
      ('id' in dialog ? dialog.id || '' : '') +
      (dialog.kind === 'record' ? dialog.record : '')
    : '';
  if (!workbench.ready) {
    return (
      <div className="app-shell">
        <p className="empty-line" role="status">
          正在打开本地记录…
        </p>
        {warning && (
          <p className="storage-warning" role="alert">
            {warning}
          </p>
        )}
        <SpaceControls {...workbench} disabled={false} />
      </div>
    );
  }
  return (
    <>
      <a
        className="skip-link"
        href="#overview"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('page-title')?.focus();
        }}
      >
        跳到页面内容
      </a>
      <div className="landscape" aria-hidden="true" />
      <aside className="navigation" aria-label="主导航">
        <a
          className="brand-mark"
          href="#overview"
          aria-label="Owner 首页"
          onClick={(event) => {
            if (
              event.button === 0 &&
              !event.metaKey &&
              !event.ctrlKey &&
              !event.shiftKey &&
              !event.altKey
            ) {
              event.preventDefault();
              navigate('overview');
            }
          }}
        >
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="24" r="21" />
            <circle cx="24" cy="24" r="15" />
            <path d="m24 13 11 19H13Z" />
          </svg>
        </a>
        <nav ref={navigation}>
          <NavigationIndicator active={activeView} navigation={navigation} />
          {([{ id: 'overview', short: '总览', icon: 'home' }, ...DOMAINS] as const).map((item) => (
            <button
              className={`nav-item ${activeView === item.id ? 'active' : ''}`}
              key={item.id}
              aria-current={activeView === item.id ? 'page' : undefined}
              onClick={() => navigate(item.id)}
              onPointerEnter={item.id === 'overview' ? undefined : preloadDetails}
              onFocus={item.id === 'overview' ? undefined : preloadDetails}
            >
              <Icon name={item.icon} />
              <span>{item.short}</span>
            </button>
          ))}
        </nav>
        <div className="nav-bottom">
          <button
            className="nav-item"
            aria-label="切换外观"
            onClick={() =>
              mutate((draft) => {
                draft.theme = draft.theme === 'jarvis' ? 'midnight' : 'jarvis';
              })
            }
          >
            <Icon name={state.theme === 'jarvis' ? 'moon' : 'sun'} />
            <span>外观</span>
          </button>
          <button className="nav-item" onClick={() => open({ kind: 'settings' })}>
            <Icon name="settings" />
            <span>设置</span>
          </button>
        </div>
      </aside>
      <div className="app-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <strong>
              OWNER<span className="brand-sub"> / PERSONAL OS</span>
            </strong>
            <span className="breadcrumb-divider">/</span>
            <span id="nav-location">{domain?.name || '总览'}</span>
            {pending && (
              <span className="route-loading" role="status">
                正在打开{DOMAINS.find((item) => item.id === activeView)?.name || '总览'}…
              </span>
            )}
          </div>
          <div className="topbar-actions">
            <span className="prototype-badge">
              <i />
              {state.runtime?.kind === 'personal'
                ? '正式记录 · 本地存储'
                : state.runtime?.kind === 'demo'
                  ? '示例体验 · 独立空间'
                  : '原型记录 · 固定日期'}
            </span>
            <button
              className="icon-button"
              onClick={() => open({ kind: 'sources' })}
              aria-label="查看数据来源"
            >
              <Icon name="database" />
            </button>
            <button
              className="avatar"
              onClick={() => open({ kind: 'settings' })}
              aria-label="个人设置"
            >
              我
            </button>
          </div>
        </header>
        <SpaceControls
          {...workbench}
          disabled={!!dialog || state.agentTasks.some((task) => task.status === 'running')}
        />
        {warning && (
          <div className="storage-warning" role="alert">
            <p>{warning}</p>
            <button className="text-button" onClick={() => open({ kind: 'settings' })}>
              查看设置与导出原始内容
            </button>
          </div>
        )}
        <section className="page-intro" aria-label="页面概览">
          <div className="intro-copy">
            <span className="console-label">
              PERSONAL COMMAND CENTER <i />
            </span>
            <h1 id="page-title" tabIndex={-1}>
              <span className="route-title">{domain?.name || '个人控制中心'}</span>
            </h1>
            <p>
              {view === 'overview'
                ? '感知当下，掌握自己的节奏。'
                : '追踪每一次变化，让记录成为下一步的依据。'}
            </p>
            <div className="intro-actions">
              <button className="primary-button" onClick={() => open({ kind: 'quick' })}>
                <Icon name="plus" />
                快速记录
              </button>
              <div className="eyebrow">
                {state.runtime?.kind === 'personal' ? '本地日期' : '固定参考日期'} ·{' '}
                {todayOf(state)} · {state.runtime?.timezone}
              </div>
            </div>
          </div>
          <div className="core-display" aria-hidden="true">
            <div className="core-orbit" />
            <svg className="core-rings" viewBox="0 0 220 220">
              <circle className="core-track" cx="110" cy="110" r="104" />
              <circle className="core-ticks" cx="110" cy="110" r="95" />
              <circle className="core-arc" cx="110" cy="110" r="82" />
              <circle className="core-inner" cx="110" cy="110" r="68" />
              <path className="core-triangle" d="m110 72 36 63H74Z" />
            </svg>
            <span className="core-caption">
              J.A.R.V.I.S.<small>LOCAL INTERFACE</small>
            </span>
          </div>
          <div className="intro-rail">
            <span>
              <i /> 本地工作台
            </span>
            <span>
              {state.runtime?.kind === 'personal'
                ? '个人手动记录'
                : state.runtime?.kind === 'demo'
                  ? '独立示例数据'
                  : '保留旧日期与来源'}
            </span>
            <span>OWNER / HUD v1.0</span>
          </div>
        </section>
        <main className="workbench" id="page-main" aria-busy={pending}>
          <div className="personal-area route-content" data-view={view}>
            {view === 'overview' ? (
              <Overview key={state.runtime?.spaceId} {...moduleProps} />
            ) : DomainDetails ? (
              <DomainDetails {...moduleProps} view={view} />
            ) : (
              <section
                className="route-placeholder glass-panel"
                role="status"
                aria-label="正在打开详情"
              >
                <p>{detailsError ? '模块暂时无法打开。' : '正在打开详情…'}</p>
                {detailsError ? (
                  <button
                    className="text-button"
                    onClick={() => {
                      void prepare(view).catch(() => {});
                    }}
                  >
                    重试打开模块
                  </button>
                ) : (
                  <>
                    <div className="placeholder-heading" />
                    <div className="placeholder-line" />
                    <div className="placeholder-chart" />
                  </>
                )}
              </section>
            )}
          </div>
        </main>
        <footer className="app-footer">
          <span>记录保存在当前浏览器</span>
          <button className="text-button" onClick={() => open({ kind: 'sources' })}>
            <Icon name="database" />
            数据来源
          </button>
        </footer>
      </div>
      {agentLoaded && (
        <Suspense
          fallback={
            <p className="toast" role="status">
              正在打开工作窗…
            </p>
          }
        >
          <AgentWorkspace
            key={state.runtime?.spaceId}
            {...moduleProps}
            isOpen={agentOpen}
            onClose={closeAgent}
            onContextChange={setAgentContext}
          />
        </Suspense>
      )}
      <button
        id="agent-launcher"
        className="agent-launcher"
        onClick={() => {
          if (agentOpen) closeAgent();
          else {
            if (!agentLoaded) {
              setAgentContext(view);
            }
            setAgentLoaded(true);
            setAgentOpen(true);
          }
        }}
        aria-label={agentOpen ? '收起个人 Agent' : '打开个人 Agent'}
        aria-expanded={agentOpen}
        aria-controls="agent-window"
        aria-haspopup="dialog"
      >
        <span className="agent-launcher-icon">
          <Icon name={agentOpen ? 'x' : 'sparkles'} />
        </span>
        <span className="agent-launcher-label">
          {agentOpen ? '收起 J.A.R.V.I.S.' : 'J.A.R.V.I.S. / Agent'}
        </span>
      </button>
      <Suspense
        fallback={
          <p className="toast" role="status">
            正在打开记录窗口…
          </p>
        }
      >
        {dialog &&
          (dialog.kind === 'record' ? (
            <RecordEditor key={dialogKey} {...moduleProps} request={dialog} onClose={closeDialog} />
          ) : dialog.kind === 'backup' ? (
            <BackupManager
              {...moduleProps}
              onClose={closeDialog}
              onSelectSpace={workbench.selectSpace}
            />
          ) : dialog.kind === 'history' ||
            dialog.kind === 'trash' ||
            dialog.kind === 'habit-settings' ||
            dialog.kind === 'snapshots' ? (
            <DataManager {...moduleProps} request={dialog} onClose={closeDialog} />
          ) : (
            <Managers key={dialogKey} {...moduleProps} request={dialog} onClose={closeDialog} />
          ))}
      </Suspense>
      {toastText && (
        <div className="toast" role="status">
          {toastText}
        </div>
      )}
    </>
  );
}
