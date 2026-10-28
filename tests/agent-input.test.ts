// @vitest-environment jsdom
import { createElement } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/data/prototype';
import type { WorkbenchState } from '../src/domain/models';
import { AgentWorkspace } from '../src/features/agent/AgentWorkspace';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function mountAgent() {
  vi.useFakeTimers();
  const state = createInitialState();
  state.messages = [];
  state.agentTasks = [];
  state.artifacts = [];
  let stored = structuredClone(state);
  const mutate = vi.fn(async (change: (draft: WorkbenchState) => void) => {
    const draft = structuredClone(stored);
    change(draft);
    stored = draft;
    return true;
  });
  render(
    createElement(AgentWorkspace, {
      state,
      mutate,
      open: vi.fn(),
      navigate: vi.fn(),
      toast: vi.fn(),
      onAgent: vi.fn(),
      isOpen: true,
      onClose: vi.fn(),
    }),
  );
  const input = screen.getByRole<HTMLTextAreaElement>('textbox', { name: '向 Agent 描述任务' });
  fireEvent.change(input, { target: { value: '用中文整理本周近况' } });
  return {
    input,
    mutate,
    get stored() {
      return stored;
    },
  };
}

describe('Agent 输入与任务提交', () => {
  it.each([
    { name: '候选字仍在组合', init: { key: 'Enter', isComposing: true } },
    { name: '组合结束边界仍由输入法处理', init: { key: 'Enter', keyCode: 229 } },
  ])('$name / 不提前发送中文草稿', async ({ init }) => {
    const agent = mountAgent();
    await act(async () => {
      fireEvent.keyDown(agent.input, init);
    });
    expect(agent.stored.messages).toHaveLength(0);
    expect(agent.stored.agentTasks).toHaveLength(0);
    expect(agent.input.value).toBe('用中文整理本周近况');
  });

  it('Shift+Enter 留给换行处理，不创建任务', async () => {
    const agent = mountAgent();
    await act(async () => {
      fireEvent.keyDown(agent.input, { key: 'Enter', shiftKey: true });
    });
    expect(agent.mutate).not.toHaveBeenCalled();
    expect(agent.input.value).toBe('用中文整理本周近况');
  });

  it('Enter 后立即提交表单也只启动一次任务，并完成一次产物保存', async () => {
    const agent = mountAgent();
    const form = agent.input.closest('form');
    if (!form) throw new Error('任务输入必须位于表单中');
    await act(async () => {
      fireEvent.keyDown(agent.input, { key: 'Enter' });
      fireEvent.submit(form);
    });
    expect(agent.stored.agentTasks).toHaveLength(1);
    expect(agent.stored.messages).toHaveLength(1);
    expect(agent.stored.messages[0]?.text).toBe('用中文整理本周近况');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });
    expect(agent.stored.agentTasks[0]?.status).toBe('completed');
    expect(agent.stored.artifacts).toHaveLength(1);
    expect(agent.stored.messages).toHaveLength(2);
  });

  it('保存失败保留输入，重试后可以正常发送', async () => {
    const agent = mountAgent();
    agent.mutate.mockResolvedValueOnce(false);
    await act(async () => {
      fireEvent.keyDown(agent.input, { key: 'Enter' });
    });
    expect(agent.input.value).toBe('用中文整理本周近况');
    expect(agent.stored.agentTasks).toHaveLength(0);
    await act(async () => {
      fireEvent.keyDown(agent.input, { key: 'Enter' });
    });
    expect(agent.stored.agentTasks).toHaveLength(1);
    expect(agent.input.value).toBe('');
  });
});
