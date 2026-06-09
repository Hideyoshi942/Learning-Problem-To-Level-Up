import { useParams, Navigate, Link } from 'react-router-dom'
import { getTopic, getLevel } from '../data/index'
import CodeRunner from '../components/CodeRunner/CodeRunner'
import InteractiveBox from '../components/TopicContent/InteractiveBox'
import styles from './TopicPage.module.css'

export default function TopicPage() {
  const { levelId, topicSlug } = useParams()
  const level = getLevel(Number(levelId))
  const topic = getTopic(Number(levelId), topicSlug)

  if (!topic || !level) return <Navigate to="/" replace />

  // Find prev/next topic for navigation
  const topics = level.topics
  const idx    = topics.findIndex((t) => t.slug === topicSlug)
  const prev   = idx > 0 ? topics[idx - 1] : null
  const next   = idx < topics.length - 1 ? topics[idx + 1] : null

  return (
    <div className={`${styles.page} animate-fade-in`}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.tag} style={{ '--level-color': level.color }}>
          {topic.emoji} Level {levelId} · Bài {String(topic.order).padStart(2, '0')}
        </div>
        <h1 className={styles.title}>{topic.title}</h1>
        <p className={styles.desc}>{topic.description}</p>
        {topic.project && (
          <div className={styles.project}>
            <span className={styles.projectIcon}>🏗️</span>
            <span><strong>Dự án thực hành:</strong> {topic.project}</span>
          </div>
        )}
      </div>

      {/* Problems */}
      {topic.problems?.length > 0 && (
        <section>
          <SectionTitle>❌ Các vấn đề cần giải quyết</SectionTitle>
          <div className={styles.problemGrid}>
            {topic.problems.map((p, i) => (
              <div key={i} className={styles.problemCard}>
                <div className={styles.problemIcon}>{p.icon}</div>
                <h4>{p.title}</h4>
                <p>{p.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Concepts */}
      {topic.concepts?.length > 0 && (
        <section>
          <SectionTitle>📖 Kiến thức cần học</SectionTitle>
          <div className={styles.conceptList}>
            {topic.concepts.map((c, i) => (
              <span key={i} className={styles.conceptTag}>📚 {c}</span>
            ))}
          </div>
        </section>
      )}

      {/* Code Demos */}
      {topic.demos?.length > 0 && (
        <section>
          <SectionTitle>💻 Code Minh Họa</SectionTitle>
          <CodeRunner demos={topic.demos} />
        </section>
      )}

      {/* Interactive */}
      {topic.interactive && (
        <section>
          <SectionTitle>🎮 Thử Nghiệm Tương Tác</SectionTitle>
          <InteractiveBox config={topic.interactive} />
        </section>
      )}

      {/* Callouts */}
      {topic.callouts?.length > 0 && (
        <section>
          <SectionTitle>📌 Tổng Kết & Best Practices</SectionTitle>
          {topic.callouts.map((c, i) => (
            <div key={i} className={`callout ${c.type}`}>
              <span className="callout-icon">{c.icon}</span>
              <div className="callout-body">
                <strong>{c.title}</strong>
                {' — '}
                {c.body}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Prev / Next */}
      <nav className={styles.topicNav}>
        {prev ? (
          <Link to={`/level/${levelId}/topic/${prev.slug}`} className={styles.navBtn}>
            ← {prev.emoji} {prev.title}
          </Link>
        ) : <span />}
        {next && (
          <Link to={`/level/${levelId}/topic/${next.slug}`} className={`${styles.navBtn} ${styles.navBtnNext}`}>
            {next.emoji} {next.title} →
          </Link>
        )}
      </nav>
    </div>
  )
}

function SectionTitle({ children }) {
  return <h2 className={styles.sectionTitle}>{children}</h2>
}
