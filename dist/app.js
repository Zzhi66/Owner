'use strict';

(() => {
  const TODAY = '2026-10-14';
  const STORAGE_KEY = 'owner.workbench.prototype.v1';
  const DOMAINS = [
    { id: 'body', name: '身体状况', short: '身体', icon: 'heart', eyebrow: 'BODY & MIND', title: '身体的节奏' },
    { id: 'habits', name: '习惯', short: '习惯', icon: 'leaf', eyebrow: 'SMALL STEPS', title: '小习惯，慢慢积累' },
    { id: 'diet', name: '饮食', short: '饮食', icon: 'utensils', eyebrow: 'EVERYDAY NOURISHMENT', title: '把每一餐留下来' },
    { id: 'work', name: '学习 / 工作', short: '投入', icon: 'briefcase', eyebrow: 'FOCUS & PROGRESS', title: '投入与推进' },
    { id: 'assets', name: '资产', short: '资产', icon: 'wallet', eyebrow: 'A CLEARER PICTURE', title: '资产的全貌' }
  ];
  const HABITS = [ { id: 'read', name: '阅读 30 分钟' }, { id: 'move', name: '运动 30 分钟' }, { id: 'log', name: '记录饮食' } ];
  const PATHS = {
    home: '<path d="m3 10 9-7 9 7v10H6V10"/><path d="M9 20v-7h6v7"/>',
    heart: '<path d="M20.5 4.7a5.4 5.4 0 0 0-8.5 1.4 5.4 5.4 0 0 0-8.5-1.4C-1 9.1 5 15.4 12 21c7-5.6 13-11.9 8.5-16.3Z"/><path d="M4 11h4l2-4 4 8 2-4h4"/>',
    leaf: '<path d="M20 3c-7-1-15 2-15 9a6 6 0 0 0 6 6c7 0 10-8 9-15Z"/><path d="M3 21 15 9"/>',
    utensils: '<path d="M4 3v5a3 3 0 0 0 6 0V3M7 3v18M20 3c-5 1-6 8-1 10h1V3Zm0 10v8"/>',
    briefcase: '<rect x="3" y="7" width="18" height="14" rx="3"/><path d="M8 7V4h8v3M3 12c5 4 13 4 18 0M12 12v4"/>',
    wallet: '<path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0-3 3v13a2 2 0 0 0 2 2h16V7H5a1 1 0 0 1 0-2"/><path d="M20 11h-5v6h5"/><circle cx="16.8" cy="14" r=".6"/>',
    moon: '<path d="M20.4 14.7A9 9 0 0 1 9.3 3.6a9 9 0 1 0 11.1 11.1Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
    settings: '<path d="m9 3-1 3-3 1-2 4 2 2v3l3 2 1 3h5l1-3 3-2v-3l2-2-2-4-3-1-1-3Z"/><circle cx="11.5" cy="12" r="3"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 4 16 4 16 0V5M4 12v7c0 4 16 4 16 0v-7"/>',
    sparkles: '<path d="m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7L12 3ZM20 2v4M18 4h4"/>',
    message: '<path d="M21 15a4 4 0 0 1-4 4H9l-6 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M7 8h10M7 12h7"/>',
    'check-list': '<path d="m3 6 2 2 3-4M11 6h10M3 13l2 2 3-4M11 13h10M3 20l2 2 3-4M11 20h10"/>',
    file: '<path d="M14 2H5v20h14V7l-5-5ZM14 2v5h5M8 12h8M8 16h6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    link: '<path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m0 2 1-1a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0"/>',
    x: '<path d="m6 6 12 12M6 18 18 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    'arrow-up': '<path d="M12 19V5m-5 5 5-5 5 5"/>',
    'arrow-right': '<path d="M4 12h16m-5-5 5 5-5 5"/>',
    shield: '<path d="m12 2 8 3v7c0 5-8 10-8 10S4 17 4 12V5l8-3Z"/><path d="m8 11 3 3 5-5"/>',
    grip: '<circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    'eye-off': '<path d="m3 3 18 18M10 5c6-1 12 7 12 7l-3 4M6 6c-3 2-4 6-4 6s4 7 10 7c2 0 4-1 5-2M10 10l4 4"/>'
  };
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name] || PATHS.leaf}</svg>`;
  const decorate = () => $$('[data-icon]').forEach(element => { if (!element.querySelector('svg')) element.innerHTML = icon(element.dataset.icon); });
  const dateOffset = offset => { const date = new Date(TODAY + 'T00:00:00Z'); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0, 10); };
  const fmtMoney = value => '¥' + Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 0 });
  const domainById = id => DOMAINS.find(domain => domain.id === id) || DOMAINS[0];
  const uid = () => globalThis.crypto?.randomUUID?.() || 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  const numeric = value => value === '' || value == null ? null : Number(value);
  let storageAvailable = true;
  let busy = false;
  let agentOpen = false;
  let lastAddedTodo = null;
  const viewFromHash = () => DOMAINS.some(domain => '#' + domain.id === location.hash) ? location.hash.slice(1) : 'overview';
  let activeView = viewFromHash();
  let toastTimer;

  function initialState() {
    const lastSleep = [6.6, 7.3, 7.5, 6.9, 7.1, 7.7, 7.2];
    const lastFocus = [120, 210, 168, 42, 180, 240, 150];
    const daily = Array.from({ length: 30 }, (_, index) => ({ date: dateOffset(index - 29), sleep: index >= 23 ? lastSleep[index - 23] : +(6.7 + (index % 6) * .15).toFixed(1), weight: +(69.4 - index * .035).toFixed(1), steps: 5600 + (index % 7) * 620, note: '', source: '示例记录' }));
    const meals = [];
    for (let offset = -29; offset <= 0; offset++) {
      if (offset === -2 || offset === -5) continue;
      ['早餐', '午餐', '晚餐'].slice(0, offset === 0 ? 2 : 3).forEach((meal, index) => meals.push({ id: uid(), date: dateOffset(offset), meal, content: ['燕麦、牛奶、鸡蛋', '米饭、鸡肉、蔬菜', '面食、豆腐、青菜'][index], portion: ['一碗 / 一杯 / 一个', '一份', '一份'][index], calories: [430, 650, 560][index], source: '示例记录' }));
    }
    const sessions = daily.map((entry, index) => ({ id: uid(), date: entry.date, title: '项目整理与阅读', project: '个人工作台', minutes: index >= 23 ? lastFocus[index - 23] : 80 + index % 5 * 20, source: '示例记录' }));
    const habits = Object.fromEntries(daily.map((entry, index) => [entry.date, { read: index % 4 !== 0, move: index % 3 === 1, log: meals.some(meal => meal.date === entry.date) }]));
    const taskTitles = ['梳理工作台的信息结构', '确定首批数据来源', '完成阅读笔记', '整理项目资料', '记录本周运动', '确认资产分类', '复盘时间投入', '整理已有账单', '完善界面原型', '整理待处理资料', '规划下周的工作', '补充今日餐食'];
    return {
      schemaVersion: 1, theme: 'jarvis', range: 7, selected: 'body', bodyMetric: 'sleep', context: 'overview', agentTab: 'chat', hideMoney: false,
      order: ['assets', 'body', 'diet', 'work', 'habits'], daily, meals, sessions, habits,
      accounts: [ { id: uid(), name: '日常账户', type: 'cash', amount: 40000, date: TODAY }, { id: uid(), name: '投资账户', type: 'investment', amount: 68600, date: TODAY }, { id: uid(), name: '其他资产', type: 'other', amount: 30000, date: TODAY }, { id: uid(), name: '待还款项', type: 'liability', amount: 10000, date: TODAY } ],
      assetHistory: daily.map((entry, index) => ({ date: entry.date, value: 124000 + index * 145 + [120, -80, 170, -120][index % 4] })),
      tasks: taskTitles.map((title, index) => ({ id: uid(), title, project: '个人工作台', done: index < 8, date: dateOffset(-index % 7) })),
      wellbeing: {}, events: [], goals: [], notes: [], messages: [], agentTasks: [], artifacts: []
    };
  }

  function readState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return initialState();
      const saved = JSON.parse(raw);
      if (saved.schemaVersion !== 1 || !['daily', 'meals', 'sessions', 'accounts', 'tasks', 'notes', 'messages', 'agentTasks', 'artifacts', 'assetHistory', 'order'].every(key => Array.isArray(saved[key])) || !saved.habits || typeof saved.habits !== 'object') return initialState();
      saved.range = saved.range === 30 ? 30 : 7;
      saved.wellbeing = saved.wellbeing && typeof saved.wellbeing === 'object' && !Array.isArray(saved.wellbeing) ? saved.wellbeing : {};
      saved.events = Array.isArray(saved.events) ? saved.events : [];
      saved.goals = Array.isArray(saved.goals) ? saved.goals : [];
      saved.selected = domainById(saved.selected).id;
      saved.context = saved.context === 'overview' ? 'overview' : domainById(saved.context).id;
      saved.theme = saved.theme === 'midnight' ? 'midnight' : 'jarvis';
      saved.bodyMetric = ['sleep', 'weight', 'steps'].includes(saved.bodyMetric) ? saved.bodyMetric : 'sleep';
      saved.agentTab = ['chat', 'tasks', 'artifacts'].includes(saved.agentTab) ? saved.agentTab : 'chat';
      saved.order = [...new Set([...saved.order, ...DOMAINS.map(domain => domain.id)])].filter(id => DOMAINS.some(domain => domain.id === id));
      if (saved.order.filter(id => id !== 'assets').join(',') === 'body,habits,diet,work') saved.order = ['assets', 'body', 'diet', 'work', 'habits'];
      saved.agentTasks.forEach(task => { if (task.status === 'running') task.status = 'interrupted'; });
      return saved;
    } catch { return initialState(); }
  }
  let state = readState();
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch { storageAvailable = false; $('#capture-status').textContent = '当前环境无法持久保存，请在设置中导出记录。'; }
  }
  function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false; toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 2800); }
  function periodRecords(records) { const start = dateOffset(1 - state.range); return records.filter(record => record.date >= start && record.date <= TODAY); }
  function average(records, key) { const values = records.map(record => record[key]).filter(value => value != null && Number.isFinite(value)); return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null; }
  function assets() { const total = state.accounts.filter(account => account.type !== 'liability').reduce((sum, account) => sum + account.amount, 0); const debt = state.accounts.filter(account => account.type === 'liability').reduce((sum, account) => sum + account.amount, 0); return { total, debt, net: total - debt }; }
  function money(value) { return state.hideMoney ? '••••••' : fmtMoney(value); }
  function focusHours() { return periodRecords(state.sessions).reduce((sum, record) => sum + record.minutes, 0) / 60; }
  function habitCounts() { const dates = Array.from({ length: state.range }, (_, index) => dateOffset(index + 1 - state.range)); return dates.map(date => ({ date, count: HABITS.filter(habit => state.habits[date]?.[habit.id]).length })); }

  function sparkline(values, label) {
    const finite = values.filter(value => Number.isFinite(value));
    if (!finite.length) return '';
    const min = Math.min(...finite), max = Math.max(...finite), span = max - min || 1;
    const points = values.map((value, index) => [5 + index * 94 / Math.max(1, values.length - 1), 30 - (value - min) / span * 24]);
    return `<svg class="sparkline" viewBox="0 0 104 37" role="img" aria-label="${escape(label)}"><path d="${points.map((point, index) => `${index ? 'L' : 'M'}${point[0].toFixed(1)},${point[1].toFixed(1)}`).join(' ')}"/><circle cx="${points.at(-1)[0]}" cy="${points.at(-1)[1]}" r="2.5"/></svg>`;
  }

  function cardContent(id) {
    const daily = state.daily.filter(entry => entry.date >= dateOffset(-6) && entry.date <= TODAY).sort((a, b) => a.date.localeCompare(b.date));
    if (id === 'body') {
      const latest = [...daily].reverse().find(entry => entry.sleep != null);
      const weight = [...state.daily].filter(entry => entry.weight != null).sort((a, b) => b.date.localeCompare(a.date))[0];
      const feeling = state.wellbeing[TODAY];
      return `<div class="card-main"><div><div class="metric">${latest ? latest.sleep.toFixed(1) : '—'}<small>小时</small></div><div class="metric-label">${latest ? latest.date === TODAY ? '昨晚睡眠' : latest.date + ' 睡眠' : '近 7 天暂无睡眠记录'}</div></div><div class="mini-trend">${sparkline(daily.filter(entry => entry.sleep != null).map(entry => entry.sleep), '近 7 天已记录的睡眠时长趋势')}<span>睡眠 · 近 7 天</span></div></div><div class="summary-line"><span>最新体重</span><strong>${weight ? weight.weight.toFixed(1) + ' kg' : '未记录'}</strong><small>${weight ? weight.date.slice(5).replace('-', '/') : ''}</small></div><div class="personal-inline"><div><span class="metric-label">今日心情与精力</span><p>${feeling ? escape(feeling.mood) + ' · 精力 ' + feeling.energy + '/5' : '今天感觉怎么样？'}</p></div><button class="text-button" data-personal="wellbeing">${feeling ? '更新' : '记录一下'}</button></div>`;
    }
    if (id === 'habits') {
      const today = state.habits[TODAY] || {};
      const weekCount = Array.from({ length: 7 }, (_, index) => dateOffset(-index)).reduce((sum, date) => sum + HABITS.filter(habit => state.habits[date]?.[habit.id]).length, 0);
      return `<div class="habit-summary"><strong>已完成 ${HABITS.filter(habit => today[habit.id]).length}<span> / ${HABITS.length} 项</span></strong><span class="metric-label">近 7 天 ${weekCount} / ${7 * HABITS.length} 次</span></div><div class="habit-list">${HABITS.map(habit => `<label class="habit-row"><input type="checkbox" data-habit="${habit.id}" ${today[habit.id] ? 'checked' : ''}><span class="habit-name">${habit.name}</span><small>${today[habit.id] ? '已完成' : '待完成'}</small></label>`).join('')}</div>`;
    }
    if (id === 'diet') {
      const meals = state.meals.filter(meal => meal.date === TODAY);
      const mainMeals = ['早餐', '午餐', '晚餐'];
      const latest = meals.at(-1);
      return `<div class="card-main"><div><div class="metric">${mainMeals.filter(label => meals.some(meal => meal.meal === label)).length}<small>/ 3 餐</small></div><div class="metric-label">今日三餐记录</div></div><button class="text-button" data-add="diet">${icon('plus')}记一餐</button></div><div class="food-summary">${mainMeals.map(label => `<span class="food-pill ${meals.some(meal => meal.meal === label) ? '' : 'missing'}">${meals.some(meal => meal.meal === label) ? '✓' : '·'} ${label}</span>`).join('')}</div><div class="meal-preview">${latest ? escape(latest.meal) + ' · ' + escape(latest.content) : '留下一餐，开始今天的记录。'}</div>`;
    }
    if (id === 'work') {
      const sessions = state.sessions.filter(session => session.date === TODAY);
      const hours = sessions.reduce((sum, session) => sum + session.minutes, 0) / 60;
      const recentHours = state.sessions.filter(session => session.date >= dateOffset(-6) && session.date <= TODAY).reduce((sum, session) => sum + session.minutes, 0) / 60;
      const goal = state.goals.find(item => item.progress < 100) || state.goals[0];
      return `<div class="card-main"><div><div class="metric">${hours.toFixed(1)}<small>小时</small></div><div class="metric-label">今日专注投入</div></div><span class="metric-note">近 7 天 ${recentHours.toFixed(1)} 小时</span></div><div class="personal-inline"><div><span class="metric-label">阶段目标${state.goals.length > 1 ? ' · 共 ' + state.goals.length + ' 个' : ''}</span><p>${goal ? escape(goal.title) : '留一个真正想推进的目标'}</p></div><button class="text-button" data-action="show-goals">${goal ? '管理' : '设置目标'}</button></div>${goal ? `<div class="goal-progress"><progress max="100" value="${goal.progress}" aria-label="阶段目标进度"></progress><span>${goal.progress}%</span></div><div class="goal-next"><span>下一步</span><strong>${escape(goal.next || '还没有填写下一步')}</strong>${goal.next && goal.progress < 100 ? `<button class="text-button" data-goal-todo="${escape(goal.id)}">加入待办</button>` : ''}</div>` : ''}`;
    }
    const balance = assets();
    const updated = state.accounts.map(account => account.date).sort().at(-1);
    const previous = [...state.assetHistory].filter(entry => entry.date < updated).sort((a, b) => b.date.localeCompare(a.date))[0];
    const delta = previous ? balance.net - previous.value : null;
    return `<div class="asset-summary"><div class="asset-primary"><span class="metric-label">净资产</span><div class="metric">${money(balance.net)}</div></div><div class="asset-stat"><span class="metric-label">较上次记录${previous ? ' · ' + previous.date.slice(5).replace('-', '/') : ''}</span><strong>${delta == null ? '暂无对比' : state.hideMoney ? '••••••' : (delta > 0 ? '+' : delta < 0 ? '−' : '') + fmtMoney(Math.abs(delta))}</strong></div><div class="asset-stat"><span class="metric-label">总资产</span><strong>${money(balance.total)}</strong></div><div class="asset-stat"><span class="metric-label">负债</span><strong>${money(balance.debt)}</strong></div></div><div class="asset-updated">${updated ? '账户最近更新于 ' + escape(updated) : '尚未记录账户'} · 各账户估值日期见详情</div>`;
  }

  const recentCardOrder = () => state.order.filter(id => id !== 'assets');
  function cardMarkup(id) {
    const domain = domainById(id);
    const heading = id === 'assets' ? 'h2' : 'h3';
    const dragHandle = id === 'assets' ? '' : `<button class="drag-handle" draggable="true" data-drag="${id}" aria-label="拖动${domain.name}卡片，或按左右方向键调整顺序">${icon('grip')}</button>`;
    const detailLink = `<button class="card-link" data-detail="${id}" aria-label="查看${domain.name}详情">查看详情 ${icon('arrow-right')}</button>`;
    const tools = id === 'assets' ? `<div class="asset-tools"><button class="icon-button" data-action="hide-money" aria-label="${state.hideMoney ? '显示' : '隐藏'}资产金额">${icon(state.hideMoney ? 'eye-off' : 'eye')}</button>${detailLink}</div>` : `<span class="card-period">${id === 'body' ? '最近记录' : '今天'}</span>${dragHandle}`;
    return `<article class="dashboard-card" data-domain="${id}"><div class="card-heading"><span class="domain-symbol ${id}">${icon(domain.icon)}</span><${heading} class="card-title" id="${id}-card-title">${id === 'assets' ? '资产概览' : domain.name}</${heading}>${tools}</div><div class="card-content">${cardContent(id)}</div>${id === 'assets' ? '' : `<div class="card-bottom"><button class="text-button" data-add="${id}">${icon('plus')}${id === 'habits' ? '补记打卡' : '补充记录'}</button>${detailLink}</div>`}</article>`;
  }
  function renderCards() {
    $('#asset-overview').innerHTML = cardMarkup('assets');
    $('#dashboard-cards').innerHTML = recentCardOrder().map(cardMarkup).join('');
    decorate();
  }
  function todoRow(task) {
    return `<label class="today-todo-row habit-row ${task.done ? 'is-done' : ''}"><input type="checkbox" data-todo="${escape(task.id)}" aria-label="${escape(task.title)}" ${task.done ? 'checked' : ''}><span class="todo-title">${escape(task.title)}</span><small>${task.date < TODAY && !task.done ? '此前未完成' : escape(task.project || '个人待办')}</small></label>`;
  }
  function renderTodayTodos() {
    renderSchedule();
    const pending = state.tasks.filter(task => !task.done && task.date <= TODAY);
    const completed = state.tasks.filter(task => task.done && (task.completedAt === TODAY || (!task.completedAt && task.date === TODAY)));
    const expanded = $('#today-todo-completed details')?.open || false;
    $('#today-todo-count').textContent = pending.length ? `${pending.length} 项待处理` : '今天的清单已完成';
    $('#today-todo-list').innerHTML = pending.slice(0, 3).map(todoRow).join('') || '<p class="todo-empty">暂时没有待办，给今天留一点余地。</p>';
    if (pending.length > 3) $('#today-todo-list').innerHTML += `<button class="todo-more text-button" data-action="show-todos">还有 ${pending.length - 3} 项待处理，查看全部 ${icon('arrow-right')}</button>`;
    $('#today-todo-completed').innerHTML = completed.length ? `<details class="completed-todos" ${expanded ? 'open' : ''}><summary>已完成 ${completed.length} 项</summary><div class="today-todo-list">${completed.map(todoRow).join('')}</div></details>` : '';
  }
  function moveRecentCard(id, destination) {
    const order = recentCardOrder();
    const source = order.indexOf(id);
    if (source < 0 || destination < 0 || destination >= order.length || source === destination) return false;
    order.splice(source, 1);
    order.splice(destination, 0, id);
    state.order = ['assets', ...order];
    save();
    renderCards();
    return true;
  }

  function svgChart(host, records, key, unit, bars = false) {
    const width = Math.max(180, host.getBoundingClientRect().width), height = 154;
    const left = key === 'value' ? 58 : 35, right = 12, top = 17, bottom = 28;
    const values = records.map(record => record[key]).filter(value => value != null && Number.isFinite(value));
    if (!values.length) { host.innerHTML = '<div class="empty-line">这段时间还没有记录，补充后就能看见趋势。</div>'; return; }
    const actualMin = Math.min(...values), actualMax = Math.max(...values);
    const span = Math.max(actualMax - actualMin, key === 'weight' ? 1 : key === 'steps' ? 1000 : 1);
    const low = bars ? 0 : Math.max(0, actualMin - span * .3), high = actualMax + span * .35;
    const plotWidth = width - left - right;
    const x = index => left + 6 + index * (plotWidth - 12) / Math.max(1, records.length - 1);
    const y = value => top + (high - value) / (high - low || 1) * (height - top - bottom);
    const tickLabel = value => key === 'steps' || key === 'value' ? Math.round(value).toLocaleString('zh-CN') : value.toFixed(1);
    let markup = `<svg class="data-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(unit)}趋势，${records.length}天"><title>${escape(unit)}趋势</title>`;
    [low, (low + high) / 2, high].forEach(value => { markup += `<line class="grid-line" x1="${left}" x2="${width - right}" y1="${y(value)}" y2="${y(value)}"/><text x="${left - 7}" y="${y(value) + 3}" text-anchor="end">${tickLabel(value)}</text>`; });
    let path = '', connected = false;
    records.forEach((record, index) => {
      const value = record[key];
      if (value == null || !Number.isFinite(value)) { connected = false; return; }
      if (bars) {
        const barWidth = Math.max(3, Math.min(16, plotWidth / records.length * .55));
        markup += `<rect class="data-bar" x="${x(index) - barWidth / 2}" y="${y(value)}" width="${barWidth}" height="${y(0) - y(value)}" rx="2"><title>${record.date}：${value.toFixed(1)} ${unit}</title></rect>`;
      } else { path += `${connected ? 'L' : 'M'}${x(index).toFixed(1)},${y(value).toFixed(1)} `; connected = true; }
    });
    if (!bars) markup += `<path class="data-line" d="${path}"/>`;
    records.forEach((record, index) => {
      const value = record[key];
      if (!bars && value != null && Number.isFinite(value) && records.length <= 7) markup += `<circle class="data-dot" cx="${x(index)}" cy="${y(value)}" r="2.5"><title>${record.date}：${value} ${unit}</title></circle>`;
      const ticks = [...new Set([0, Math.round((records.length - 1) / 3), Math.round((records.length - 1) * 2 / 3), records.length - 1])];
      if (ticks.includes(index)) markup += `<text x="${x(index)}" y="${height - 7}" text-anchor="${index === 0 ? 'start' : index === records.length - 1 ? 'end' : 'middle'}">${record.date.slice(5).replace('-', '/')}</text>`;
    });
    markup += `<text x="${width - right}" y="11" text-anchor="end">${escape(unit)}</text></svg>`;
    host.innerHTML = markup;
  }

  function renderDetail() {
    if (activeView === 'overview') return;
    const domain = domainById(state.selected);
    $('#detail-eyebrow').textContent = domain.eyebrow;
    $('#detail-title').textContent = domain.title;
    const host = $('#detail-content');
    const daily = periodRecords(state.daily).sort((a, b) => a.date.localeCompare(b.date));
    if (state.selected === 'body') {
      const labels = { sleep: ['睡眠', '小时'], weight: ['体重', 'kg'], steps: ['活动量', '步'] };
      const [label, unit] = labels[state.bodyMetric];
      const mean = average(daily, state.bodyMetric);
      host.innerHTML = `<div class="area-heading" style="margin-bottom:8px"><div class="chart-meta"><strong>${mean == null ? '—' : state.bodyMetric === 'steps' ? Math.round(mean).toLocaleString() : mean.toFixed(1)}</strong><span>${unit} / ${label}均值</span></div><div class="period-picker" aria-label="身体指标">${Object.entries(labels).map(([key, value]) => `<button data-body-metric="${key}" aria-pressed="${state.bodyMetric === key}">${value[0]}</button>`).join('')}</div></div><div id="chart-host"></div>`;
      svgChart($('#chart-host'), daily, state.bodyMetric, unit);
      $('#detail-footer').innerHTML = `${icon('clock')} ${dateOffset(1 - state.range).slice(5).replace('-', '/')}—10/14 · 有效记录 ${daily.filter(entry => entry[state.bodyMetric] != null).length}/${state.range} 天 · 原始数值展示`;
    } else if (state.selected === 'habits') {
      const counts = habitCounts();
      const completed = counts.reduce((sum, entry) => sum + entry.count, 0);
      host.innerHTML = `<div class="chart-meta"><strong>${completed} / ${state.range * HABITS.length}</strong><span>已完成 / 自设计划次数</span></div><div class="heatmap-grid" aria-label="每日习惯完成情况">${counts.map(entry => `<div class="heatmap-cell ${entry.count ? 'done' : ''}"><span>${entry.date.slice(5).replace('-', '/')}</span><strong>${entry.count}/3</strong></div>`).join('')}</div>`;
      $('#detail-footer').innerHTML = `${icon('leaf')} 每天 3 项示例习惯 · 可在首页完成今日打卡`;
    } else if (state.selected === 'diet') {
      const records = periodRecords(state.meals).sort((a, b) => b.date.localeCompare(a.date));
      const recordedDays = new Set(records.map(record => record.date)).size;
      host.innerHTML = `<div class="chart-meta"><strong>${recordedDays} / ${state.range}</strong><span>有餐食记录的天数</span></div><div class="record-list">${records.slice(0, 4).map(record => `<div class="record-row"><div><span class="row-title">${escape(record.meal)} · ${escape(record.content)}</span><span class="row-meta">${record.date} · ${escape(record.portion || '份量待补充')}</span></div><span class="row-value">${record.calories == null ? '待补充' : escape(record.calories) + ' kcal'}<small class="metric-label" style="display:block;text-align:right">${record.calories == null ? '热量' : '估算'}</small></span></div>`).join('') || '<div class="empty-line">这段时间还没有餐食记录。</div>'}</div>`;
      $('#detail-footer').innerHTML = `${icon('info')} 展示最近 4 餐 · 营养数值为录入的估算值 · 未记录保留空缺`;
    } else if (state.selected === 'work') {
      const totals = new Map(periodRecords(state.sessions).reduce((list, session) => { list.push([session.date, session.minutes]); return list; }, []));
      daily.forEach(entry => totals.set(entry.date, state.sessions.filter(session => session.date === entry.date).reduce((sum, session) => sum + session.minutes, 0)));
      const records = daily.map(entry => ({ date: entry.date, hours: (totals.get(entry.date) || 0) / 60 }));
      host.innerHTML = `<div class="chart-meta"><strong>${focusHours().toFixed(1)}</strong><span>小时专注投入</span><button class="text-button" data-action="show-todos">查看待办 ${icon('arrow-right')}</button></div><div id="chart-host"></div>`;
      svgChart($('#chart-host'), records, 'hours', '小时', true);
      $('#detail-footer').innerHTML = `${icon('briefcase')} 任务完成 ${state.tasks.filter(task => task.done).length}/${state.tasks.length} 项 · 时间投入与成果分别记录`;
    } else {
      const balance = assets();
      const labels = { cash: '现金', investment: '投资', other: '其他资产', liability: '负债' };
      const portions = ['cash', 'investment', 'other'].map(type => state.accounts.filter(account => account.type === type).reduce((sum, account) => sum + account.amount, 0));
      host.innerHTML = `<div class="chart-meta"><strong>${money(balance.net)}</strong><span>净资产 / 人民币</span><button class="icon-button" data-action="hide-money" aria-label="${state.hideMoney ? '显示' : '隐藏'}资产金额">${icon(state.hideMoney ? 'eye-off' : 'eye')}</button></div><div class="asset-breakdown detail-allocation"><div class="allocation-bar" role="img" aria-label="现金、投资、其他资产的构成">${portions.map(amount => `<span style="width:${balance.total > 0 ? amount / balance.total * 100 : 0}%"></span>`).join('')}</div><div class="asset-legend">${['现金', '投资', '其他'].map((label, index) => `<span><i></i>${label} ${balance.total > 0 ? Math.round(portions[index] / balance.total * 100) : 0}%</span>`).join('')}</div></div><div class="record-list">${state.accounts.map(account => `<div class="record-row"><div><span class="row-title">${escape(account.name)}</span><span class="row-meta">${labels[account.type]} · 估值日期 ${account.date}</span></div><span class="row-value">${money(account.amount)}</span></div>`).join('')}</div><div class="asset-history"><p class="metric-label">净资产历史 · 近 30 天</p>${state.hideMoney ? '<div class="empty-line">金额已隐藏</div>' : '<div id="chart-host"></div>'}</div>`;
      if (!state.hideMoney) svgChart($('#chart-host'), [...state.assetHistory].filter(entry => entry.date >= dateOffset(-29) && entry.date <= TODAY).sort((a, b) => a.date.localeCompare(b.date)), 'value', '元');
      $('#detail-footer').innerHTML = `${icon('info')} 净资产 = 总资产 − 负债 · 可手动更新账户余额`;
    }
    if (state.selected === 'body') {
      const feelings = Object.entries(state.wellbeing).filter(([date]) => date >= dateOffset(1 - state.range) && date <= TODAY).sort(([a], [b]) => b.localeCompare(a));
      host.insertAdjacentHTML('beforeend', `<section class="wellbeing-history"><div class="manager-heading"><h4>心情与精力记录</h4><button class="text-button" data-personal="wellbeing">记录今天</button></div><div class="record-list">${feelings.map(([date, entry]) => `<div class="record-row"><div><span class="row-title">${escape(entry.mood)} · 精力 ${entry.energy}/5</span><span class="row-meta">${date}${entry.reason ? ' · ' + escape(entry.reason) : ''}</span></div><button class="text-button" data-personal="wellbeing" data-personal-id="${date}">编辑</button></div>`).join('') || '<p class="empty-line">这段时间还没有记录，感受也值得留下。</p>'}</div></section>`);
    }
    if (state.selected === 'work') host.insertAdjacentHTML('beforeend', `<div class="personal-inline"><span>阶段目标 · ${state.goals.length} 个</span><button class="text-button" data-action="show-goals">管理阶段目标</button></div>`);
  }

  function renderNav() {
    $('#domain-nav').innerHTML = `<button class="nav-item ${activeView === 'overview' ? 'active' : ''}" data-nav="overview" ${activeView === 'overview' ? 'aria-current="page"' : ''}>${icon('home')}<span>总览</span></button>${DOMAINS.map(domain => `<button class="nav-item ${activeView === domain.id ? 'active' : ''}" data-nav="${domain.id}" ${activeView === domain.id ? 'aria-current="page"' : ''}>${icon(domain.icon)}<span>${domain.short}</span></button>`).join('')}`;
    $('#nav-location').textContent = activeView === 'overview' ? '总览' : domainById(activeView).name;
  }

  function navigate(view) {
    if (location.hash !== '#' + view) location.hash = view;
    else applyView(true);
  }
  function applyView(focus = false) {
    activeView = viewFromHash();
    state.context = activeView;
    if (activeView !== 'overview') state.selected = activeView;
    save(); render();
    if (focus) { window.scrollTo({ top: 0 }); $('#page-title').focus({ preventScroll: true }); }
  }
  window.addEventListener('hashchange', () => applyView(true));

  function renderChat() {
    const welcome = `<div class="message"><div class="message-avatar">${icon('sparkles')}</div><div class="message-content"><div class="message-label">个人 Agent <small>演示模式</small></div><div class="message-bubble"><div class="welcome-message-title">你好，这里是你的工作空间。</div>把面板中的一组信息交给我，<br>我们可以从整理近况或推进一件事开始。<div class="welcome-message-sub">你选择信息，我整理成记录。<br>这版先体验流程，回复由本地规则生成。</div></div></div></div>`;
    $('#chat-feed').innerHTML = welcome + state.messages.map(message => `<div class="message ${message.role === 'user' ? 'user' : ''}"><div class="message-avatar">${message.role === 'user' ? '我' : icon('sparkles')}</div><div class="message-content"><div class="message-label">${message.role === 'user' ? '我' : '个人 Agent'}${message.role === 'user' ? '' : '<small>演示回复</small>'}</div><div class="message-bubble">${escape(message.text)}${message.artifactId ? `<div><button class="message-action" data-artifact="${message.artifactId}">${icon('file')}查看整理结果 ${icon('arrow-right')}</button></div>` : ''}</div></div></div>`).join('') + (busy ? `<div class="typing"><i></i>正在整理本地原型记录…</div>` : '');
    $('#chat-feed').scrollTop = state.messages.length ? $('#chat-feed').scrollHeight : 0;
  }
  function renderAgent() {
    $('#agent-window').hidden = !agentOpen;
    $('#agent-launcher').setAttribute('aria-expanded', String(agentOpen));
    $('#agent-launcher').setAttribute('aria-label', agentOpen ? '收起个人 Agent' : '打开个人 Agent');
    $('#agent-launcher .agent-launcher-icon').innerHTML = icon(agentOpen ? 'x' : 'sparkles');
    $('#agent-launcher .agent-launcher-label').textContent = agentOpen ? '收起 J.A.R.V.I.S.' : 'J.A.R.V.I.S. / Agent';
    $('#agent-context').textContent = `${state.context === 'overview' ? '个人总览' : domainById(state.context).name} · 近 ${state.range} 天`;
    $$('[data-agent-tab]').forEach(button => { button.setAttribute('aria-selected', String(button.dataset.agentTab === state.agentTab)); button.tabIndex = button.dataset.agentTab === state.agentTab ? 0 : -1; });
    ['chat', 'tasks', 'artifacts'].forEach(name => { $(`#panel-${name}`).hidden = state.agentTab !== name; });
    $('#task-count').textContent = state.agentTasks.length;
    $('#artifact-count').textContent = state.artifacts.length;
    $('#send-button').disabled = busy;
    renderChat();
    $('#agent-tasks').innerHTML = state.agentTasks.length ? [...state.agentTasks].reverse().map(task => `<article class="workspace-item"><div class="workspace-item-header">${icon('check-list')}<span>${escape(task.title)}</span><span class="task-state ${task.status === 'running' ? 'running' : ''}">${({ running: '整理中', completed: '已完成', interrupted: '已中断' })[task.status] || '待处理'}</span></div><p>上下文：${escape(task.context)} · 本地演示流程</p><div class="task-step">${icon('check')}读取选中的原型记录</div><div class="task-step">${icon(task.status === 'completed' ? 'check' : 'clock')}整理信息与记录空缺</div><div class="task-step">${icon(task.status === 'completed' ? 'check' : 'clock')}保存整理结果${task.artifactId ? `<button class="text-button" data-artifact="${task.artifactId}">查看</button>` : ''}</div></article>`).join('') : `<div class="workspace-empty">${icon('check-list')}<strong>留一件事给 Agent</strong>从对话发送任务后，在这里查看演示进度。</div>`;
    $('#agent-artifacts').innerHTML = state.artifacts.length ? [...state.artifacts].reverse().map(artifact => `<article class="workspace-item"><div class="workspace-item-header">${icon('file')}<span>${escape(artifact.title)}</span></div><p>${escape(artifact.context)} · ${artifact.date} · Markdown 记录</p><div class="settings-actions"><button class="secondary-button" data-artifact="${artifact.id}">${icon('eye')}打开</button><button class="text-button" data-download-artifact="${artifact.id}">${icon('download')}导出</button></div></article>`).join('') : `<div class="workspace-empty">${icon('file')}<strong>每一次整理，留下一个结果</strong>完成的演示任务会在这里生成可导出的记录。</div>`;
  }
  function setAgentOpen(open) {
    const focusInside = $('#agent-window').contains(document.activeElement);
    agentOpen = open;
    renderAgent();
    if (open) {
      const focusTarget = state.agentTab === 'chat' ? $('#agent-input') : $(`[data-agent-tab="${state.agentTab}"]`);
      focusTarget.focus({ preventScroll: true });
      $('#chat-feed').scrollTop = state.messages.length ? $('#chat-feed').scrollHeight : 0;
    } else if (focusInside) {
      $('#agent-launcher').focus({ preventScroll: true });
    }
  }
  function render() {
    const overview = activeView === 'overview';
    if (!overview) state.selected = activeView;
    $('#overview-content').hidden = !overview;
    $('#domain-content').hidden = overview;
    $('#page-title').textContent = overview ? '个人控制中心' : domainById(activeView).name;
    $('#page-description').textContent = overview ? '感知当下，掌握自己的节奏。' : '追踪每一次变化，让记录成为下一步的依据。';
    $('.detail-toolbar .period-picker').hidden = activeView === 'assets';
    document.documentElement.dataset.theme = state.theme;
    const themeButton = $('[data-action="theme"]');
    themeButton.querySelector('[data-icon]').innerHTML = icon(state.theme === 'jarvis' ? 'moon' : 'sun');
    $$('[data-range]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.range) === state.range)));
    renderNav(); renderCards(); renderTodayTodos(); renderDetail(); renderAgent(); decorate();
  }

  function field(label, name, type = 'text', value = '', attributes = '', hint = '') {
    return `<label class="field">${label}<input name="${name}" type="${type}" value="${escape(value)}" ${attributes}>${hint ? `<span class="field-hint">${hint}</span>` : ''}</label>`;
  }
  const MOODS = ['愉快', '平静', '一般', '低落', '焦虑'];
  const EVENT_TYPES = ['日程', '预约', '会议', '截止日期', '生日 / 纪念日'];
  function choice(label, name, values, selected) {
    return `<label class="field">${label}<select name="${name}">${values.map(value => `<option value="${escape(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${escape(value)}</option>`).join('')}</select></label>`;
  }
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  const sortedEvents = () => [...state.events].sort((a, b) => (a.date + (a.time || '00:00')).localeCompare(b.date + (b.time || '00:00')));
  function eventWhen(item) {
    return `${item.date === TODAY ? '今天' : item.date.slice(5).replace('-', '/')} · ${item.time || '全天'}${item.date < TODAY && !item.done ? ' · 已过日期' : ''}`;
  }
  function renderSchedule() {
    const upcoming = sortedEvents().filter(item => !item.done && item.date <= dateOffset(7));
    $('#schedule-summary').innerHTML = `<div class="schedule-heading"><span>${icon('clock')}日程与重要日期</span><div><button class="text-button" data-action="show-events" aria-label="查看全部日程">查看全部${state.events.length ? ' · ' + state.events.length : ''}</button><button class="text-button" data-personal="event" aria-label="添加日程">${icon('plus')}添加</button></div></div>${upcoming.length ? `<div class="schedule-items">${upcoming.slice(0, 3).map(item => `<div class="schedule-item"><span class="schedule-time ${item.date === TODAY ? 'is-today' : ''}">${eventWhen(item)}</span><button class="schedule-title" data-personal="event" data-personal-id="${escape(item.id)}">${escape(item.title)}</button><span class="metric-label">${escape(item.kind)}</span><button class="text-button" data-event-done="${escape(item.id)}" aria-label="完成日程：${escape(item.title)}">完成</button></div>`).join('')}</div>${upcoming.length > 3 ? `<button class="text-button" data-action="show-events">还有 ${upcoming.length - 3} 项，查看全部</button>` : ''}` : '<p class="schedule-empty">未来 7 天暂无安排，可以记下预约、截止日期或纪念日。</p>'}`;
  }
  function showEvents() {
    contentDialog('日程与重要日期', 'CALENDAR', `<div class="manager-heading"><p class="metric-label">按日期排列 · 当前为单次日期记录</p><button class="text-button" data-personal="event">${icon('plus')}添加日程</button></div><div class="record-list">${sortedEvents().map(item => `<div class="record-row"><div><strong class="row-title">${escape(item.title)}</strong><span class="row-meta">${escape(item.date)} · ${item.time || '全天'} · ${escape(item.kind)} · ${item.done ? '已完成' : '待处理'}</span></div><div class="inline-actions"><button class="text-button" data-personal="event" data-personal-id="${escape(item.id)}">编辑</button><button class="text-button" data-event-done="${escape(item.id)}">${item.done ? '恢复' : '完成'}</button></div></div>`).join('') || '<p class="empty-line">还没有日程，先记下一件重要的事。</p>'}</div>`);
    $('#content-dialog').dataset.manager = 'events';
  }
  function showGoals() {
    contentDialog('阶段目标', 'GOALS', `<div class="manager-heading"><p class="metric-label">保留 1～3 个目标 · 进度由你手动更新</p><button class="text-button" data-personal="goal" ${state.goals.length >= 3 ? 'disabled' : ''}>${icon('plus')}添加目标</button></div><div class="goal-list">${state.goals.map(goal => `<article class="goal-item"><div class="manager-heading"><strong>${escape(goal.title)}</strong><button class="text-button" data-personal="goal" data-personal-id="${escape(goal.id)}">编辑</button></div><div class="goal-progress"><progress max="100" value="${goal.progress}" aria-label="${escape(goal.title)}进度"></progress><span>${goal.progress}%</span></div><p class="metric-label">${goal.due ? '目标日期 ' + escape(goal.due) + (goal.due < TODAY && goal.progress < 100 ? ' · 已过日期' : '') : '未设置截止日期'}${goal.progress === 100 ? ' · 已完成' : ''}</p><div class="goal-next"><span>下一步</span><strong>${escape(goal.next || '还没有填写下一步')}</strong>${goal.next && goal.progress < 100 ? `<button class="text-button" data-goal-todo="${escape(goal.id)}">加入待办</button>` : ''}</div></article>`).join('') || '<p class="empty-line">想想这个阶段最重要的一件事。</p>'}</div>`);
  }
  function editPersonal(kind, id = '') {
    if (kind === 'goal' && !id && state.goals.length >= 3) { toast('最多保留 3 个阶段目标，可先编辑或删除已有目标'); return; }
    const form = $('#personal-form'); form.dataset.kind = kind; form.dataset.id = id;
    let fields = '';
    if (kind === 'wellbeing') {
      const date = id || TODAY, entry = state.wellbeing[date];
      $('#personal-record-title').textContent = '心情与精力';
      fields = field('记录日期', 'date', 'date', date, `required max="${TODAY}"`) + choice('今天的心情', 'mood', MOODS, entry?.mood || '一般') + choice('精力（1 疲惫 — 5 充足）', 'energy', [1, 2, 3, 4, 5], entry?.energy || 3) + field('一句原因（可选）', 'reason', 'text', entry?.reason || '', 'maxlength="200" placeholder="例如：休息得不错，今天很有精神"');
      if (entry) fields += `<button type="button" class="text-button" data-remove-personal="wellbeing" data-remove-id="${date}">删除这天的记录</button>`;
    } else if (kind === 'event') {
      const item = state.events.find(entry => entry.id === id);
      $('#personal-record-title').textContent = item ? '编辑日程' : '添加日程与重要日期';
      fields = field('事项名称', 'title', 'text', item?.title || '', 'required maxlength="100" placeholder="例如：项目讨论、预约体检"') + choice('类型', 'kind', EVENT_TYPES, item?.kind || '日程') + `<div class="field-pair">${field('日期', 'date', 'date', item?.date || TODAY, 'required')}${field('时间（可选，留空为全天）', 'time', 'time', item?.time || '')}</div>` + field('备注（可选）', 'note', 'text', item?.note || '', 'maxlength="200"');
      if (item) fields += `<button type="button" class="text-button" data-remove-personal="event" data-remove-id="${escape(id)}">删除日程</button>`;
    } else {
      const goal = state.goals.find(entry => entry.id === id);
      $('#personal-record-title').textContent = goal ? '编辑阶段目标' : '添加阶段目标';
      fields = field('目标名称', 'title', 'text', goal?.title || '', 'required maxlength="100" placeholder="例如：完成个人工作台第一版"') + field('下一步行动', 'next', 'text', goal?.next || '', 'maxlength="160" placeholder="写下一个可以开始的小步骤"') + `<div class="field-pair">${field('当前进度（%）', 'progress', 'number', goal?.progress ?? 0, 'required min="0" max="100" step="1"')}${field('目标日期（可选）', 'due', 'date', goal?.due || '')}</div>`;
      if (goal) fields += `<button type="button" class="text-button" data-remove-personal="goal" data-remove-id="${escape(id)}">删除目标</button>`;
    }
    $('#personal-fields').innerHTML = fields;
    if ($('#content-dialog').open) $('#content-dialog').close();
    if ($('#capture-dialog').open) $('#capture-dialog').close();
    $('#personal-dialog').showModal();
  }
  $('#personal-fields').addEventListener('change', event => {
    if ($('#personal-form').dataset.kind === 'wellbeing' && event.target.name === 'date' && validDate(event.target.value) && event.target.value <= TODAY) {
      const date = event.target.value;
      $('#personal-dialog').close(); editPersonal('wellbeing', date);
    }
  });
  $('#personal-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form)), kind = form.dataset.kind, id = form.dataset.id;
    if (kind !== 'goal' && !validDate(data.date)) { toast('请选择有效日期'); return; }
    if (kind === 'wellbeing') {
      if (data.date > TODAY || !MOODS.includes(data.mood) || ![1, 2, 3, 4, 5].includes(Number(data.energy))) return;
      state.wellbeing[data.date] = { mood: data.mood, energy: Number(data.energy), reason: data.reason.trim() };
    } else {
      if (!data.title.trim()) { toast('请填写名称'); return; }
      if (kind === 'goal' && (data.due && !validDate(data.due) || !Number.isInteger(Number(data.progress)) || Number(data.progress) < 0 || Number(data.progress) > 100)) return;
      if (kind === 'event' && (!EVENT_TYPES.includes(data.kind) || data.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.time))) return;
      const list = kind === 'event' ? state.events : state.goals;
      const index = list.findIndex(item => item.id === id);
      if (kind === 'goal' && index < 0 && list.length >= 3) { toast('最多保留 3 个阶段目标'); return; }
      const item = kind === 'event' ? { id: id || uid(), title: data.title.trim(), kind: data.kind, date: data.date, time: data.time, note: data.note.trim(), done: index >= 0 ? list[index].done : false } : { id: id || uid(), title: data.title.trim(), next: data.next.trim(), progress: Number(data.progress), due: data.due };
      if (index >= 0) list[index] = item; else list.push(item);
    }
    save(); render(); $('#personal-dialog').close(); toast('已保存');
  });
  function showRecord(domainId) {
    if ($('#capture-dialog').open) $('#capture-dialog').close();
    const domain = domainById(domainId);
    $('#record-form').dataset.domain = domain.id;
    $('#record-title').textContent = domain.id === 'assets' ? '更新资产记录' : '补充' + domain.name + '记录';
    let fields = field('记录日期', 'date', 'date', TODAY, 'required max="' + TODAY + '"');
    if (domain.id === 'body') {
      const current = state.daily.find(entry => entry.date === TODAY) || {};
      fields += `<div class="field-pair">${field('睡眠时长（小时）', 'sleep', 'number', current.sleep ?? '', 'min="0" max="24" step="0.1"')}${field('体重（kg）', 'weight', 'number', current.weight ?? '', 'min="1" max="1000" step="0.1"')}</div>${field('活动步数', 'steps', 'number', current.steps ?? '', 'min="0" max="200000" step="1"')}${field('主观感受 / 备注', 'note', 'text', current.note || '', 'maxlength="200"', '例如：精神不错、今天有些疲惫')}`;
    } else if (domain.id === 'habits') {
      fields += `<label class="field">习惯<select name="habit">${HABITS.map(habit => `<option value="${habit.id}">${habit.name}</option>`).join('')}</select></label><label class="field">完成情况<select name="done"><option value="yes">已完成</option><option value="no">未完成</option></select></label>`;
    } else if (domain.id === 'diet') {
      fields += `<label class="field">餐次<select name="meal"><option>早餐</option><option>午餐</option><option selected>晚餐</option><option>加餐</option></select></label>${field('吃了什么', 'content', 'text', '', 'required maxlength="160" placeholder="例如：米饭、鱼、青菜"')}${field('份量（可选）', 'portion', 'text', '', 'maxlength="100" placeholder="例如：一碗、半份"')}${field('估算热量（kcal，可选）', 'calories', 'number', '', 'min="0" max="20000" step="1"', '留空表示未知，展示时会标注为估算')}`;
    } else if (domain.id === 'work') {
      fields += field('项目 / 学习主题', 'project', 'text', '个人工作台', 'required maxlength="100"') + field('做了什么', 'title', 'text', '', 'required maxlength="160"') + field('专注分钟数', 'minutes', 'number', 30, 'required min="1" max="1440" step="1"') + '<label class="field">关联待办<select name="done"><option value="yes">记录一项已完成任务</option><option value="no">记录一项待处理任务</option><option value="none">仅记录时间投入</option></select></label>';
    } else {
      fields += field('账户 / 资产名称', 'name', 'text', '', 'required maxlength="100" placeholder="同名同类账户会更新当前余额"') + '<label class="field">类型<select name="type"><option value="cash">现金 / 存款</option><option value="investment">投资</option><option value="other">其他资产</option><option value="liability">负债</option></select></label>' + field('当前金额（人民币）', 'amount', 'number', '', 'required min="0" max="1000000000000" step="0.01"', '资产和负债分别记录正数金额');
    }
    $('#record-fields').innerHTML = fields; decorate(); $('#record-dialog').showModal();
  }
  $('#record-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const domain = event.currentTarget.dataset.domain;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) || data.date > TODAY) { toast('请选择有效的记录日期'); return; }
    if (domain === 'body') {
      const entry = { date: data.date, sleep: numeric(data.sleep), weight: numeric(data.weight), steps: numeric(data.steps), note: data.note.trim(), source: '手动记录' };
      const index = state.daily.findIndex(record => record.date === data.date);
      if (index >= 0) state.daily[index] = entry; else state.daily.push(entry);
    } else if (domain === 'habits') {
      state.habits[data.date] = { ...(state.habits[data.date] || {}), [data.habit]: data.done === 'yes' };
    } else if (domain === 'diet') {
      state.meals.push({ id: uid(), date: data.date, meal: data.meal, content: data.content.trim(), portion: data.portion.trim(), calories: numeric(data.calories), source: '手动记录' });
    } else if (domain === 'work') {
      state.sessions.push({ id: uid(), date: data.date, title: data.title.trim(), project: data.project.trim(), minutes: Number(data.minutes), source: '手动记录' });
      if (data.done !== 'none') state.tasks.push({ id: uid(), title: data.title.trim(), project: data.project.trim(), done: data.done === 'yes', date: data.date });
    } else {
      const index = state.accounts.findIndex(account => account.name === data.name.trim() && account.type === data.type);
      const account = { id: index >= 0 ? state.accounts[index].id : uid(), name: data.name.trim(), type: data.type, amount: Number(data.amount), date: data.date };
      if (index >= 0) state.accounts[index] = account; else state.accounts.push(account);
      state.assetHistory = state.assetHistory.filter(entry => entry.date !== data.date);
      state.assetHistory.push({ date: data.date, value: assets().net });
    }
    state.selected = domain; save(); render(); $('#record-dialog').close(); toast('记录已保存，面板已更新');
  });

  function contentDialog(title, eyebrow, body) { $('#content-dialog').dataset.manager = ''; $('#content-title').textContent = title; $('#content-eyebrow').textContent = eyebrow; $('#content-body').innerHTML = body; decorate(); $('#content-dialog').showModal(); }
  function showSources() {
    contentDialog('每条信息，都有来处', 'DATA SOURCES', `<div class="source-row"><span>${icon('check-list')}</span><div><strong>手动记录</strong><p>身体、习惯、餐食、时间投入与账户余额</p></div><span class="source-state">原型可用</span></div><div class="source-row"><span>${icon('download')}</span><div><strong>文件导入</strong><p>后续接入表格、账单和健康数据文件</p></div><span class="source-state">待开发</span></div><div class="source-row"><span>${icon('database')}</span><div><strong>自动同步</strong><p>后续按你使用的设备与服务选择连接方式</p></div><span class="source-state">未连接</span></div><p class="content-prose" style="margin-top:15px">当前初始内容全部为示例数据。手动新增的记录保存在当前浏览器；原型没有访问外部账户或健康设备。</p>`);
  }
  function showSettings() {
    contentDialog('控制台设置', 'SYSTEM PREFERENCES', `<div class="settings-section"><h3>外观</h3><p>贾维斯风格 HUD：深色控制台、青色数据线与环形核心。</p><div class="settings-actions"><button class="secondary-button" data-set-theme="jarvis">贾维斯 · 青蓝</button><button class="secondary-button" data-set-theme="midnight">深空 · 冰蓝</button></div></div><div class="settings-section"><h3>记录与产物</h3><p>数据保存在当前浏览器。导出可保留原型记录与演示产物。</p><div class="settings-actions"><button class="secondary-button" data-action="export-data">${icon('download')}导出全部记录</button><button class="secondary-button" data-action="show-notes">${icon('file')}查看随手记（${state.notes.length}）</button></div></div><div class="settings-section"><h3>卡片顺序</h3><p>拖动卡片右上角的六点按钮，或聚焦按钮后按左右方向键调整顺序。</p></div><div class="settings-section"><h3>恢复示例</h3><p>恢复初始示例会替换当前浏览器中的记录。</p><button class="text-button" data-action="reset-demo">恢复初始示例数据</button></div>`);
  }
  function showTodos() {
    const tasks = [...state.tasks].sort((a, b) => Number(a.done) - Number(b.done));
    contentDialog('全部待办', 'TASKS & PROGRESS', `<p class="metric-label todo-dialog-hint">今日待办包含今天及此前未完成的事项；习惯打卡单独记录。</p><div class="record-list">${tasks.map(task => `<label class="record-row"><span class="habit-row"><input type="checkbox" data-todo="${escape(task.id)}" aria-label="${escape(task.title)}" ${task.done ? 'checked' : ''}><span><span class="row-title">${escape(task.title)}</span><span class="row-meta">${escape(task.project)} · ${task.date}</span></span></span><span class="row-meta">${task.done ? '已完成' : '待处理'}</span></label>`).join('') || '<p class="empty-line">还没有待办，从总览添加第一项吧。</p>'}</div>`);
  }
  function download(content, filename, type) { const url = URL.createObjectURL(new Blob([content], { type })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  function openArtifact(id) {
    const artifact = state.artifacts.find(item => item.id === id); if (!artifact) return;
    contentDialog(artifact.title, 'LOCAL ARTIFACT · 演示产物', `<div class="artifact-body">${escape(artifact.body)}</div><div class="modal-footer"><span>${escape(artifact.context)} · ${artifact.date}</span><div class="settings-actions"><button class="secondary-button" data-copy-artifact="${artifact.id}">${icon('copy')}复制</button><button class="primary-button" data-download-artifact="${artifact.id}">${icon('download')}导出</button></div></div>`);
  }

  function summaryFor(context, prompt) {
    const daily = periodRecords(state.daily);
    const mean = average(daily, 'sleep');
    const balance = assets();
    const habits = habitCounts().reduce((sum, record) => sum + record.count, 0);
    const mealDays = new Set(periodRecords(state.meals).map(meal => meal.date)).size;
    const pending = state.tasks.filter(task => !task.done);
    const title = /待办|任务/.test(prompt) ? '待办整理' : /缺|空/.test(prompt) ? '记录完整度检查' : '个人近况复盘';
    const sections = [];
    if (/待办|任务/.test(prompt)) {
      sections.push('待处理事项\n' + (pending.length ? pending.map((task, index) => `${index + 1}. ${task.title}（${task.project}）`).join('\n') : '当前待办全部完成。'));
    } else if (/缺|空/.test(prompt)) {
      const missingSleep = Array.from({ length: state.range }, (_, index) => dateOffset(index + 1 - state.range)).filter(date => !daily.some(record => record.date === date && record.sleep != null));
      sections.push(`记录覆盖\n睡眠：${state.range - missingSleep.length}/${state.range} 天有记录。\n饮食：${mealDays}/${state.range} 天有餐食记录。\n今日餐食：${state.meals.filter(meal => meal.date === TODAY).length} 条。\n缺失日期或餐食继续保留为空缺。`);
      if (missingSleep.length) sections.push('睡眠待补充日期\n' + missingSleep.join('、'));
    } else {
      if (context === 'overview' || context === 'body') sections.push(`身体记录\n近 ${state.range} 天平均睡眠：${mean == null ? '未记录' : mean.toFixed(1) + ' 小时'}。\n有效睡眠记录：${daily.filter(record => record.sleep != null).length} 天。\n以上仅为原始记录的汇总。`);
      if (context === 'overview' || context === 'habits') sections.push(`习惯\n已完成 ${habits}/${state.range * HABITS.length} 次自设计划。\n今天完成 ${HABITS.filter(habit => state.habits[TODAY]?.[habit.id]).length}/3 项。`);
      if (context === 'overview' || context === 'diet') sections.push(`饮食\n近 ${state.range} 天中，${mealDays} 天有餐食记录。\n营养数值保留为录入的估算值，份量未知时继续标记待补充。`);
      if (context === 'overview' || context === 'work') sections.push(`学习 / 工作\n记录专注投入 ${focusHours().toFixed(1)} 小时。\n完成任务 ${state.tasks.filter(task => task.done).length}/${state.tasks.length} 项，还有 ${pending.length} 项待处理。`);
      if (context === 'overview' || context === 'assets') sections.push(state.hideMoney ? '资产\n当前已隐藏金额。可在左侧资产卡片恢复显示。' : `资产\n总资产 ${fmtMoney(balance.total)}，负债 ${fmtMoney(balance.debt)}。\n当前净资产 ${fmtMoney(balance.net)}，估值时间见各账户记录。`);
    }
    const contextName = context === 'overview' ? '个人总览' : domainById(context).name;
    const body = `# ${title}\n\n日期：${TODAY}\n上下文：${contextName} · 近 ${state.range} 天\n来源：本地原型中的示例与手动记录\n生成方式：本地演示规则，未连接 AI 模型\n\n` + sections.join('\n\n');
    return { title, body, contextName, reply: `已基于「${contextName}」整理了近 ${state.range} 天的记录。\n\n${sections.join('\n\n')}\n\n整理结果已保存到「产物」，可以查看和导出。` };
  }
  function sendPrompt(prompt) {
    if (busy || !prompt.trim()) return;
    state.agentTab = 'chat'; busy = true;
    const context = state.context;
    const result = summaryFor(context, prompt);
    const task = { id: uid(), title: result.title, context: `${result.contextName} · 近 ${state.range} 天`, status: 'running', date: TODAY };
    state.agentTasks.push(task);
    state.messages.push({ id: uid(), role: 'user', text: prompt.trim() });
    $('#agent-input').value = ''; save(); renderAgent();
    setTimeout(() => {
      const artifact = { id: uid(), title: result.title, context: task.context, date: TODAY, body: result.body };
      state.artifacts.push(artifact); task.status = 'completed'; task.artifactId = artifact.id;
      state.messages.push({ id: uid(), role: 'assistant', text: result.reply, artifactId: artifact.id });
      busy = false; save(); renderAgent();
    }, 900);
  }

  const actions = {
    'show-goals': showGoals,
    'show-events': showEvents,
    'undo-add-todo': () => {
      if (!lastAddedTodo) return;
      state.tasks = state.tasks.filter(task => task.id !== lastAddedTodo);
      lastAddedTodo = null; save(); renderTodayTodos();
      $('#todo-add-status').hidden = true;
      $('#today-todo-input').focus();
      toast('已撤销添加');
    },
    'quick-record': () => {
      $('#record-shortcuts').innerHTML = DOMAINS.map(domain => `<button class="record-shortcut" data-add="${domain.id}"><span class="domain-symbol ${domain.id}">${icon(domain.icon)}</span>${domain.name}${icon('arrow-right')}</button>`).join('');
      $('#record-shortcuts').innerHTML += [['wellbeing', '心情与精力', 'heart'], ['event', '日程与重要日期', 'clock'], ['goal', '阶段目标', 'check-list']].map(([kind, label, symbol]) => `<button class="record-shortcut" data-personal="${kind}"><span class="domain-symbol">${icon(symbol)}</span>${label}${icon('arrow-right')}</button>`).join('');
      $('#capture-dialog').showModal();
    },
    'agent-toggle': () => setAgentOpen(!agentOpen),
    'agent-close': () => setAgentOpen(false),
    theme: () => { state.theme = state.theme === 'jarvis' ? 'midnight' : 'jarvis'; save(); render(); },
    settings: showSettings, sources: showSources,
    'agent-info': () => contentDialog('先体验协作，再接入模型', 'AGENT PROTOTYPE', '<p class="content-prose">这版展示上下文选择、发送任务、任务进度和产物保存的完整交互。\n\n演示回复由本地规则生成，没有接入 AI 模型，也没有执行外部操作。后续可以替换为真实 Agent 服务。</p>'),
    'add-selected': () => showRecord(state.selected),
    'send-context': () => { state.context = state.selected; state.agentTab = 'chat'; save(); renderNav(); setAgentOpen(true); toast(`已把${domainById(state.selected).name}交给 Agent`); },
    'clear-context': () => { state.context = 'overview'; save(); renderNav(); renderAgent(); },
    'hide-money': () => { state.hideMoney = !state.hideMoney; save(); renderCards(); if (state.selected === 'assets') renderDetail(); },
    'show-todos': showTodos,
    'export-data': () => download(JSON.stringify(state, null, 2), 'owner-records-' + TODAY + '.json', 'application/json'),
    'show-notes': () => contentDialog('随手留下的想法', 'QUICK NOTES', `<div class="record-list">${[...state.notes].reverse().map(note => `<div class="record-row"><div><span class="row-title">${escape(note.text)}</span><span class="row-meta">${note.date} · 手动记录</span></div></div>`).join('') || '<div class="empty-line">还没有随手记，从顶部「快速记录」留下一条想法吧。</div>'}</div>`),
    'reset-demo': () => { if (busy) { toast('请等待演示任务完成后再恢复'); return; } if (!confirm('恢复初始示例会替换当前浏览器中的记录。建议先导出。确定恢复吗？')) return; const theme = state.theme; state = initialState(); state.theme = theme; save(); render(); $('#content-dialog').close(); toast('已恢复初始示例'); }
  };
  $('.skip-link').addEventListener('click', event => { event.preventDefault(); $('#page-title').focus(); });
  document.addEventListener('click', event => {
    const target = event.target.closest('button'); if (!target) return;
    if (target.hasAttribute('data-close-dialog')) { target.closest('dialog').close(); return; }
    if (target.dataset.personal) { editPersonal(target.dataset.personal, target.dataset.personalId || ''); return; }
    if (target.dataset.eventDone) {
      const item = state.events.find(entry => entry.id === target.dataset.eventDone);
      if (item) { item.done = !item.done; save(); renderSchedule(); if ($('#content-dialog').open && $('#content-dialog').dataset.manager === 'events') showEvents(); }
      return;
    }
    if (target.dataset.removePersonal) {
      if (target.dataset.confirmDelete !== 'yes') { target.dataset.confirmDelete = 'yes'; target.textContent = '确认删除（再点一次）'; return; }
      const kind = target.dataset.removePersonal, id = target.dataset.removeId;
      if (kind === 'wellbeing') delete state.wellbeing[id];
      else if (kind === 'event') state.events = state.events.filter(item => item.id !== id);
      else state.goals = state.goals.filter(item => item.id !== id);
      save(); render(); $('#personal-dialog').close(); toast('已删除记录'); return;
    }
    if (target.dataset.goalTodo) {
      const goal = state.goals.find(item => item.id === target.dataset.goalTodo);
      if (!goal?.next || goal.progress === 100) return;
      if (state.tasks.some(task => task.goalId === goal.id && task.title === goal.next && !task.done)) { toast('这一步已在待办中'); return; }
      const task = { id: uid(), title: goal.next, project: goal.title, date: TODAY, done: false, goalId: goal.id };
      state.tasks.unshift(task); lastAddedTodo = task.id; save(); renderTodayTodos();
      $('#todo-add-status').innerHTML = `<span>已添加：${escape(task.title)}</span><button class="text-button" data-action="undo-add-todo">撤销添加</button>`;
      $('#todo-add-status').hidden = false; toast('下一步已加入今日待办'); return;
    }
    if (target.dataset.action && actions[target.dataset.action]) { actions[target.dataset.action](); return; }
    if (target.dataset.detail) { navigate(target.dataset.detail); return; }
    if (target.dataset.add) { showRecord(target.dataset.add); return; }
    if (target.dataset.range) { state.range = Number(target.dataset.range); save(); render(); return; }
    if (target.dataset.bodyMetric) { state.bodyMetric = target.dataset.bodyMetric; save(); renderDetail(); return; }
    if (target.dataset.nav) {
      navigate(target.dataset.nav);
      return;
    }
    if (target.dataset.agentTab) { state.agentTab = target.dataset.agentTab; save(); renderAgent(); return; }
    if (target.dataset.prompt) { sendPrompt(target.dataset.prompt); return; }
    if (target.dataset.artifact) { openArtifact(target.dataset.artifact); return; }
    if (target.dataset.downloadArtifact) { const artifact = state.artifacts.find(item => item.id === target.dataset.downloadArtifact); if (artifact) download(artifact.body, 'owner-' + artifact.title + '-' + TODAY + '.md', 'text/markdown'); return; }
    if (target.dataset.copyArtifact) { const artifact = state.artifacts.find(item => item.id === target.dataset.copyArtifact); if (artifact) { if (navigator.clipboard?.writeText) navigator.clipboard.writeText(artifact.body).then(() => toast('已复制整理结果')).catch(() => toast('复制不可用，可以导出为文件')); else toast('复制不可用，可以导出为文件'); } return; }
    if (target.dataset.setTheme) { state.theme = target.dataset.setTheme; save(); render(); toast('外观已切换'); }
  });
  document.addEventListener('change', event => {
    if (event.target.dataset.habit) { state.habits[TODAY] = { ...(state.habits[TODAY] || {}), [event.target.dataset.habit]: event.target.checked }; save(); renderCards(); if (state.selected === 'habits') renderDetail(); toast(event.target.checked ? '今天的小习惯，完成一项' : '已更新打卡记录'); }
    if (event.target.dataset.todo) {
      const task = state.tasks.find(item => item.id === event.target.dataset.todo);
      if (task) {
        const fromOverview = !!event.target.closest('.today-todos');
        task.done = event.target.checked;
        if (task.done) task.completedAt = TODAY; else delete task.completedAt;
        save(); renderTodayTodos();
        if (state.selected === 'work') renderDetail();
        showTodosAfterChange();
        if (fromOverview) ($('#today-todo-list input') || $('#today-todo-input')).focus({ preventScroll: true });
      }
    }
  });
  function showTodosAfterChange() {
    const body = $('#content-body');
    body.querySelectorAll('[data-todo]').forEach(input => { const task = state.tasks.find(item => item.id === input.dataset.todo); if (task) input.closest('.record-row').querySelector(':scope > .row-meta').textContent = task.done ? '已完成' : '待处理'; });
  }
  $('#today-todo-form').addEventListener('submit', event => {
    event.preventDefault();
    const input = $('#today-todo-input');
    const title = input.value.trim();
    if (!title) { input.setCustomValidity('请填写待办内容'); input.reportValidity(); return; }
    const task = { id: uid(), title, project: '个人待办', date: TODAY, done: false };
    state.tasks.unshift(task); lastAddedTodo = task.id; input.value = '';
    save(); renderTodayTodos();
    $('#todo-add-status').innerHTML = `<span>已添加：${escape(title)}</span><button class="text-button" data-action="undo-add-todo">撤销添加</button>`;
    $('#todo-add-status').hidden = false;
    input.focus();
  });
  $('#today-todo-input').addEventListener('input', event => event.target.setCustomValidity(''));
  $('#quick-capture').addEventListener('submit', event => { event.preventDefault(); const input = $('#quick-note'); const text = input.value.trim(); if (!text) return; state.notes.push({ id: uid(), date: TODAY, text }); input.value = ''; save(); $('#capture-status').textContent = '最近收集：' + text; toast('这条想法已留下'); });
  $('#agent-form').addEventListener('submit', event => { event.preventDefault(); sendPrompt($('#agent-input').value); });
  $('#agent-input').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); sendPrompt(event.target.value); } });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && agentOpen && !$('dialog[open]')) { event.preventDefault(); setAgentOpen(false); } });
  $('.agent-tabs').addEventListener('keydown', event => { const tabs = $$('[data-agent-tab]'); const index = tabs.indexOf(event.target); if (index < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length; state.agentTab = tabs[next].dataset.agentTab; save(); renderAgent(); tabs[next].focus(); });
  let dragging = null;
  $('#dashboard-cards').addEventListener('dragstart', event => { const handle = event.target.closest('[data-drag]'); if (!handle) { event.preventDefault(); return; } dragging = handle.dataset.drag; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', dragging); });
  $('#dashboard-cards').addEventListener('dragover', event => { const card = event.target.closest('[data-domain]'); if (dragging && card) { event.preventDefault(); card.classList.add('drag-over'); } });
  $('#dashboard-cards').addEventListener('dragleave', event => { const card = event.target.closest('[data-domain]'); if (card && !card.contains(event.relatedTarget)) card.classList.remove('drag-over'); });
  $('#dashboard-cards').addEventListener('drop', event => { event.preventDefault(); const card = event.target.closest('[data-domain]'); if (dragging && card) moveRecentCard(dragging, recentCardOrder().indexOf(card.dataset.domain)); dragging = null; $$('[data-domain]').forEach(card => card.classList.remove('drag-over')); });
  $('#dashboard-cards').addEventListener('dragend', () => { dragging = null; $$('[data-domain]').forEach(card => card.classList.remove('drag-over')); });
  $('#dashboard-cards').addEventListener('keydown', event => { const handle = event.target.closest('[data-drag]'); if (!handle || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return; event.preventDefault(); const id = handle.dataset.drag; const next = recentCardOrder().indexOf(id) + (event.key === 'ArrowRight' ? 1 : -1); if (moveRecentCard(id, next)) { $(`[data-drag="${id}"]`).focus(); toast('卡片顺序已调整'); } });
  $$('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } }));
  state.context = activeView;
  render();
  const detailObserver = new ResizeObserver(() => { if ($('#chart-host')) renderDetail(); });
  detailObserver.observe($('.detail-panel'));
  if (state.notes.length) $('#capture-status').textContent = '最近收集：' + state.notes.at(-1).text;
  // Probe storage once so file-based previews can communicate any browser restriction.
  try { localStorage.setItem(STORAGE_KEY + '.probe', '1'); localStorage.removeItem(STORAGE_KEY + '.probe'); }
  catch { storageAvailable = false; $('#capture-status').textContent = '当前环境无法持久保存，请在设置中导出记录。'; }
})();
