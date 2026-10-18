import { todayOf, completedNow } from '../../domain/selectors';
import { useRef, useState } from 'react';
import type { FormEvent, InputHTMLAttributes } from 'react';
import { assets, uid } from '../../domain/selectors';
import { DOMAINS, HABITS } from '../../domain/models';
import type { Account, DialogRequest, ModuleProps } from '../../domain/models';
import { Modal } from '../../components/Modal';
import {
  assertRecordEditBaseline,
  captureRecordEditBaseline,
  matchesRecordEditBaseline,
  RECORD_EDIT_CONFLICT,
} from '../../domain/record-edit-baseline';
import type { RecordEditTarget } from '../../domain/record-edit-baseline';

function Field({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="field">
      {label}
      <input {...props} />
    </label>
  );
}
function Select({
  label,
  name,
  values,
  value,
}: {
  label: string;
  name: string;
  values: readonly string[];
  value?: string;
}) {
  return (
    <label className="field">
      {label}
      <select name={name} defaultValue={value}>
        {values.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
    </label>
  );
}
function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
const moods = ['愉快', '平静', '一般', '低落', '焦虑'];
const eventKinds = ['日程', '预约', '会议', '截止日期', '生日 / 纪念日'];

export function RecordEditor({
  state,
  mutate,
  toast,
  request,
  onClose,
}: ModuleProps & { request: Extract<DialogRequest, { kind: 'record' }>; onClose: () => void }) {
  const TODAY = todayOf(state);
  const { record: kind, id } = request;
  const eventItem = state.events.find((item) => item.id === id);
  const goal = state.goals.find((item) => item.id === id);
  const [date, setDate] = useState(
    kind === 'wellbeing' ? id || TODAY : kind === 'event' ? eventItem?.date || TODAY : TODAY,
  );
  const [error, setError] = useState('');
  const saving = useRef(false);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [baseline, setBaseline] = useState(() => captureRecordEditBaseline(state));
  const body = state.daily.find((item) => item.date === date);
  const feeling = state.wellbeing[date];
  const domain = DOMAINS.find((item) => item.id === kind);
  const title =
    kind === 'wellbeing'
      ? '心情与精力'
      : kind === 'event'
        ? eventItem
          ? '编辑日程'
          : '添加日程与重要日期'
        : kind === 'goal'
          ? goal
            ? '编辑阶段目标'
            : '添加阶段目标'
          : kind === 'assets'
            ? '更新资产记录'
            : `补充${domain?.name || ''}记录`;
  const closeSuccess = () => {
    toast('已保存，面板已更新');
    onClose();
  };
  function changeDate(nextDate: string) {
    if (nextDate === date) return;
    setDate(nextDate);
    setConfirmDelete(false);
    setError('');
    // These forms load a different daily record when the date changes. ID-based forms
    // retain their original baseline even if their date field is edited.
    if (kind === 'body' || kind === 'wellbeing' || kind === 'habits') {
      setBaseline(captureRecordEditBaseline(state));
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const str = (name: string) => String(data.get(name) || '').trim();
    const num = (name: string) => (str(name) === '' ? null : Number(str(name)));
    const date = str('date');
    if (kind !== 'goal' && (!validDate(date) || (kind !== 'event' && date > TODAY))) {
      setError('请选择有效的记录日期');
      return;
    }
    const requiredText =
      kind === 'diet'
        ? ['content']
        : kind === 'work'
          ? ['title', 'project']
          : kind === 'assets'
            ? ['name']
            : kind === 'event' || kind === 'goal'
              ? ['title']
              : [];
    if (requiredText.some((name) => !str(name))) {
      setError('必填内容不能只包含空格');
      return;
    }
    if (
      kind === 'goal' &&
      ((str('due') && !validDate(str('due'))) ||
        !Number.isInteger(Number(str('progress'))) ||
        Number(str('progress')) < 0 ||
        Number(str('progress')) > 100)
    ) {
      setError('请检查目标日期与进度');
      return;
    }
    const target: RecordEditTarget =
      kind === 'body' || kind === 'wellbeing'
        ? { kind, date }
        : kind === 'event' || kind === 'goal'
          ? { kind, id }
          : kind === 'assets'
            ? { kind, name: str('name'), type: str('type') }
            : kind === 'habits'
              ? { kind, date, habit: str('habit') }
              : { kind };
    if (!matchesRecordEditBaseline(baseline, state, target)) {
      setError(RECORD_EDIT_CONFLICT);
      return;
    }
    if (kind === 'goal' && !id && state.goals.length >= 3) {
      setError('最多保留 3 个阶段目标，请先编辑已有目标');
      return;
    }
    let mutationError = '';
    if (saving.current) return;
    saving.current = true;
    setPending(true);
    const ok = await mutate((draft) => {
      // Check the newest snapshot held by the storage hook as well as rendered props.
      try {
        assertRecordEditBaseline(baseline, draft, target);
      } catch (error) {
        mutationError = RECORD_EDIT_CONFLICT;
        throw error;
      }
      if (kind === 'goal' && !id && draft.goals.length >= 3) {
        mutationError = '最多保留 3 个阶段目标，请先编辑已有目标';
        throw new Error(mutationError);
      }
      if (kind === 'body') {
        const value = {
          date,
          sleep: num('sleep'),
          weight: num('weight'),
          steps: num('steps'),
          note: str('note'),
          source: '手动记录',
        };
        const index = draft.daily.findIndex((item) => item.date === date);
        if (index >= 0) draft.daily[index] = { ...draft.daily[index], ...value };
        else draft.daily.push(value);
      } else if (kind === 'habits') {
        draft.habits[date] = { ...draft.habits[date], [str('habit')]: str('done') === 'yes' };
      } else if (kind === 'diet') {
        draft.meals.push({
          id: uid(),
          date,
          meal: str('meal'),
          content: str('content'),
          portion: str('portion'),
          calories: num('calories'),
          source: '手动记录',
        });
      } else if (kind === 'work') {
        draft.sessions.push({
          id: uid(),
          date,
          title: str('title'),
          project: str('project'),
          minutes: Number(str('minutes')),
          source: '手动记录',
        });
        if (str('done') !== 'none')
          draft.tasks.push({
            id: uid(),
            date,
            title: str('title'),
            project: str('project'),
            done: str('done') === 'yes',
            ...(str('done') === 'yes'
              ? { completedAt: date === TODAY ? completedNow(state) : date }
              : {}),
          });
      } else if (kind === 'assets') {
        const index = draft.accounts.findIndex(
          (item) => item.name === str('name') && item.type === str('type'),
        );
        const account: Account = {
          id: draft.accounts[index]?.id || uid(),
          name: str('name'),
          type: str('type') as Account['type'],
          amount: Number(str('amount')),
          date,
        };
        if (index >= 0) draft.accounts[index] = { ...draft.accounts[index], ...account };
        else draft.accounts.push(account);
        const history = draft.assetHistory.find((item) => item.date === date);
        if (history) history.value = assets(draft).net;
        else draft.assetHistory.push({ date, value: assets(draft).net });
      } else if (kind === 'wellbeing') {
        draft.wellbeing[date] = {
          ...draft.wellbeing[date],
          mood: str('mood'),
          energy: Number(str('energy')),
          reason: str('reason'),
        };
      } else if (kind === 'event') {
        const value = {
          id: id || uid(),
          title: str('title'),
          kind: str('kind'),
          date,
          time: str('time'),
          timezone: str('time')
            ? eventItem && eventItem.time === str('time')
              ? (eventItem.timezone ?? null)
              : state.runtime?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
            : null,
          note: str('note'),
          done: eventItem?.done || false,
        };
        const index = draft.events.findIndex((item) => item.id === id);
        if (index >= 0) draft.events[index] = { ...draft.events[index], ...value };
        else draft.events.push(value);
      } else {
        const value = {
          id: id || uid(),
          title: str('title'),
          next: str('next'),
          progress: Number(str('progress')),
          due: str('due'),
        };
        const index = draft.goals.findIndex((item) => item.id === id);
        if (index >= 0) draft.goals[index] = { ...draft.goals[index], ...value };
        else draft.goals.push(value);
      }
    });
    saving.current = false;
    setPending(false);
    if (ok) closeSuccess();
    else setError(mutationError || '记录尚未保存。请查看页面提示，草稿已保留。');
  }
  async function remove() {
    const target: RecordEditTarget =
      kind === 'wellbeing' ? { kind, date } : { kind: kind === 'event' ? 'event' : 'goal', id };
    if (!matchesRecordEditBaseline(baseline, state, target)) {
      setError(RECORD_EDIT_CONFLICT);
      return;
    }
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    let mutationError = '';
    if (saving.current) return;
    saving.current = true;
    setPending(true);
    const ok = await mutate((draft) => {
      try {
        assertRecordEditBaseline(baseline, draft, target);
      } catch (error) {
        mutationError = RECORD_EDIT_CONFLICT;
        throw error;
      }
      if (kind === 'wellbeing') delete draft.wellbeing[date];
      if (kind === 'event') draft.events = draft.events.filter((item) => item.id !== id);
      if (kind === 'goal') {
        draft.goals = draft.goals.filter((item) => item.id !== id);
        draft.tasks.forEach((task) => {
          if (task.goalId === id) delete task.goalId;
        });
      }
    });
    saving.current = false;
    setPending(false);
    if (ok) {
      toast('已删除记录');
      onClose();
    } else setError(mutationError || '记录尚未删除。请查看页面提示，草稿已保留。');
  }
  const canDelete =
    kind === 'wellbeing'
      ? !!feeling
      : kind === 'event'
        ? !!eventItem
        : kind === 'goal'
          ? !!goal
          : false;
  return (
    <Modal
      title={title}
      eyebrow="A LITTLE UPDATE"
      onClose={() => {
        if (!saving.current) onClose();
      }}
    >
      <form onSubmit={submit}>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="record-fields">
          {kind !== 'goal' && (
            <Field
              label="记录日期"
              name="date"
              type="date"
              required
              max={kind === 'event' ? undefined : TODAY}
              value={date}
              onInput={(event) => changeDate(event.currentTarget.value)}
              onChange={(event) => changeDate(event.target.value)}
            />
          )}
          <div
            className="record-fields"
            key={kind === 'body' || kind === 'wellbeing' ? date : kind}
          >
            {kind === 'body' && (
              <>
                <div className="field-pair">
                  <Field
                    label="睡眠时长（小时，按起床日期）"
                    name="sleep"
                    type="number"
                    min="0"
                    max="24"
                    step="0.1"
                    defaultValue={body?.sleep ?? ''}
                  />
                  <Field
                    label="体重（kg）"
                    name="weight"
                    type="number"
                    min="1"
                    max="1000"
                    step="0.1"
                    defaultValue={body?.weight ?? ''}
                  />
                </div>
                <Field
                  label="活动步数"
                  name="steps"
                  type="number"
                  min="0"
                  max="200000"
                  step="1"
                  defaultValue={body?.steps ?? ''}
                />
                <Field
                  label="主观感受 / 备注"
                  name="note"
                  maxLength={200}
                  defaultValue={body?.note || ''}
                />
              </>
            )}
            {kind === 'habits' && (
              <>
                <label className="field">
                  习惯
                  <select name="habit">
                    {HABITS.map((habit) => (
                      <option key={habit.id} value={habit.id}>
                        {habit.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  完成情况
                  <select name="done">
                    <option value="yes">已完成</option>
                    <option value="no">未完成</option>
                  </select>
                </label>
              </>
            )}
            {kind === 'diet' && (
              <>
                <Select
                  label="餐次"
                  name="meal"
                  values={['早餐', '午餐', '晚餐', '加餐']}
                  value="晚餐"
                />
                <Field
                  label="吃了什么"
                  name="content"
                  required
                  maxLength={160}
                  placeholder="例如：米饭、鱼、青菜"
                />
                <Field label="份量（可选）" name="portion" maxLength={100} />
                <Field
                  label="估算热量（kcal，可选）"
                  name="calories"
                  type="number"
                  min="0"
                  max="20000"
                  step="1"
                />
                <p className="field-hint">热量留空表示未知，填写后按估算展示。</p>
              </>
            )}
            {kind === 'work' && (
              <>
                <Field
                  label="项目 / 学习主题"
                  name="project"
                  required
                  maxLength={100}
                  defaultValue="个人工作台"
                />
                <Field label="做了什么" name="title" required maxLength={160} />
                <Field
                  label="专注分钟数"
                  name="minutes"
                  type="number"
                  required
                  min="1"
                  max="1440"
                  step="1"
                  defaultValue={30}
                />
                <label className="field">
                  关联待办
                  <select name="done">
                    <option value="yes">记录一项已完成任务</option>
                    <option value="no">记录一项待处理任务</option>
                    <option value="none">仅记录时间投入</option>
                  </select>
                </label>
              </>
            )}
            {kind === 'assets' && (
              <>
                <Field
                  label="账户 / 资产名称"
                  name="name"
                  required
                  maxLength={100}
                  placeholder="同名同类账户会更新当前余额"
                />
                <label className="field">
                  类型
                  <select name="type">
                    <option value="cash">现金 / 存款</option>
                    <option value="investment">投资</option>
                    <option value="other">其他资产</option>
                    <option value="liability">负债</option>
                  </select>
                </label>
                <Field
                  label="当前金额（人民币）"
                  name="amount"
                  type="number"
                  required
                  min="0"
                  max="1000000000000"
                  step="0.01"
                />
                <p className="field-hint">资产和负债分别录入正数金额。</p>
              </>
            )}
            {kind === 'wellbeing' && (
              <>
                <Select
                  label="今天的心情"
                  name="mood"
                  values={moods}
                  value={feeling?.mood || '一般'}
                />
                <Select
                  label="精力（1 疲惫 — 5 充足）"
                  name="energy"
                  values={['1', '2', '3', '4', '5']}
                  value={String(feeling?.energy || 3)}
                />
                <Field
                  label="一句原因（可选）"
                  name="reason"
                  maxLength={200}
                  defaultValue={feeling?.reason || ''}
                />
              </>
            )}
            {kind === 'event' && (
              <>
                <Field
                  label="事项名称"
                  name="title"
                  required
                  maxLength={100}
                  defaultValue={eventItem?.title || ''}
                />
                <Select
                  label="类型"
                  name="kind"
                  values={eventKinds}
                  value={eventItem?.kind || '日程'}
                />
                <Field
                  label="时间（可选，留空为全天）"
                  name="time"
                  type="time"
                  defaultValue={eventItem?.time || ''}
                />
                <p className="field-hint">
                  新日程按 {state.runtime?.timezone || '设备本地时区'}{' '}
                  记录本地时间。旧日程未记录时区时继续保留为未知。
                </p>
                <Field
                  label="备注（可选）"
                  name="note"
                  maxLength={200}
                  defaultValue={eventItem?.note || ''}
                />
              </>
            )}
            {kind === 'goal' && (
              <>
                <Field
                  label="目标名称"
                  name="title"
                  required
                  maxLength={100}
                  defaultValue={goal?.title || ''}
                />
                <Field
                  label="下一步行动"
                  name="next"
                  maxLength={160}
                  defaultValue={goal?.next || ''}
                />
                <div className="field-pair">
                  <Field
                    label="当前进度（%）"
                    name="progress"
                    type="number"
                    required
                    min="0"
                    max="100"
                    step="1"
                    defaultValue={goal?.progress ?? 0}
                  />
                  <Field
                    label="目标日期（可选）"
                    name="due"
                    type="date"
                    defaultValue={goal?.due || ''}
                  />
                </div>
              </>
            )}
          </div>
          {canDelete && (
            <button
              type="button"
              className="text-button form-delete"
              onClick={remove}
              disabled={pending}
            >
              {confirmDelete ? '确认删除（再点一次）' : '删除这条记录'}
            </button>
          )}
        </div>
        <div className="modal-footer">
          <span>手动记录 · 保存在当前浏览器</span>
          <button className="primary-button" type="submit" disabled={pending}>
            保存记录
          </button>
        </div>
      </form>
    </Modal>
  );
}
