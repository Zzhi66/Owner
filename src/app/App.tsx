import styles from './App.module.css';

const nextModules = [
  { code: '01', name: '资产概览', description: '账户、净资产与金额隐藏' },
  { code: '02', name: '今日行动', description: '待办、日程与重要日期' },
  { code: '03', name: '个人近况', description: '身体、饮食、投入与习惯' },
  { code: '04', name: 'Agent 工作区', description: '右侧浮窗、任务与产物' },
] as const;

export function App() {
  return (
    <div className={styles.shell}>
      <a className="skip-link" href="#main-content">
        跳到页面内容
      </a>
      <header className={styles.header}>
        <a className={styles.brand} href="#main-content" aria-label="Owner 开发工作台首页">
          OWNER <span>/ PERSONAL OS</span>
        </a>
        <span className={styles.badge}>P0 · 工程入口</span>
      </header>
      <main id="main-content" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="page-title">
          <div>
            <p className={styles.eyebrow}>FOUNDATION / REACT WORKSPACE</p>
            <h1 id="page-title">个人工作台，正式起步。</h1>
            <p className={styles.description}>
              从已经确认的贾维斯界面出发，逐步建立可长期使用的个人工作台。
            </p>
            <a className={styles.primaryLink} href="http://127.0.0.1:4173/#overview">
              查看现有界面原型 <span aria-hidden="true">↗</span>
            </a>
          </div>
          <svg className={styles.core} viewBox="0 0 180 180" aria-hidden="true">
            <circle cx="90" cy="90" r="84" />
            <circle cx="90" cy="90" r="72" strokeDasharray="4 8" />
            <circle cx="90" cy="90" r="59" />
            <path d="m90 53 33 58H57Z" />
          </svg>
          <p className={styles.heroFooter}>REACT + TYPESCRIPT + VITE</p>
        </section>

        <section className={styles.notice} aria-labelledby="current-stage">
          <h2 id="current-stage">当前阶段：工程骨架</h2>
          <p>此入口用于后续组件迁移，尚未接入个人记录。完整交互仍在原型入口中体验。</p>
        </section>

        <section aria-labelledby="migration-title">
          <div className={styles.sectionHeading}>
            <h2 id="migration-title">接下来的迁移模块</h2>
            <span>P1 / COMPONENTS</span>
          </div>
          <div className={styles.moduleGrid}>
            {nextModules.map((module) => (
              <article key={module.code} className={styles.module}>
                <span className={styles.moduleCode}>{module.code} /</span>
                <h3>{module.name}</h3>
                <p>{module.description}</p>
                <span className={styles.pending}>待迁移</span>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <span>OWNER / DEVELOPMENT FOUNDATION</span>
        <span>保留原型，逐步迁移</span>
      </footer>
    </div>
  );
}
