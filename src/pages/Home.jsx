import { Link } from 'react-router-dom'
import { LEVELS, TOTAL_TOPICS } from '../data/index'
import useProgressStore from '../store/useProgressStore'
import styles from './Home.module.css'

export default function Home() {
  const { totalDone, countDoneInLevel } = useProgressStore()
  const done = totalDone()
  const pct  = Math.round((done / TOTAL_TOPICS) * 100)

  return (
    <div className={`${styles.page} animate-fade-in`}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroTag}>⚡ Backend Engineering Curriculum</div>
        <h1 className={styles.heroTitle}>
          Học 30 Bài Toán<br />
          <span className="gradient-text">Kinh Điển Backend</span>
        </h1>
        <p className={styles.heroDesc}>
          Từ SQL Optimization đến Distributed Systems – tất cả trong một nơi,
          với code demo tương tác, phân tích thuật toán và best practices thực tế.
        </p>

        {/* Overall progress */}
        <div className={styles.progressCard}>
          <div className={styles.progressTop}>
            <span>Tiến độ tổng thể</span>
            <span className={styles.progressPct}>{done}/{TOTAL_TOPICS} ({pct}%)</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Level cards */}
      <div className={styles.levelsGrid}>
        {LEVELS.map((level) => {
          const levelDone = countDoneInLevel(level.id)
          const levelPct  = Math.round((levelDone / level.topics.length) * 100)

          return (
            <Link
              key={level.id}
              to={`/level/${level.id}`}
              className={styles.levelCard}
              style={{ '--level-color': level.color }}
            >
              <div className={styles.levelCardHeader}>
                <span className={styles.levelEmoji}>{level.emoji}</span>
                <div className={styles.levelMeta}>
                  <span className={styles.levelNum}>Level {level.id}</span>
                  <span className={styles.levelBadge}>{level.topics.length} topics</span>
                </div>
                <span className={styles.levelPct}>{levelPct}%</span>
              </div>

              <h2 className={styles.levelTitle}>{level.title}</h2>
              <p className={styles.levelDesc}>{level.description}</p>

              <div className={styles.levelTopics}>
                {level.topics.map((t) => (
                  <span key={t.slug} className={styles.topicChip}>
                    {t.emoji} {t.title}
                  </span>
                ))}
              </div>

              <div className={styles.levelProgress}>
                <div
                  className={styles.levelProgressFill}
                  style={{ width: `${levelPct}%`, background: level.color }}
                />
              </div>

              <div className={styles.cardFooter}>
                <span className={styles.progressLabel}>{levelDone}/{level.topics.length} hoàn thành</span>
                <span className={styles.goBtn}>Vào học →</span>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Roadmap CTA */}
      <div className={styles.roadmapCta}>
        <div>
          <h3>🗺️ Roadmap 7 Giai Đoạn</h3>
          <p>Lộ trình học từ Junior đến Senior Backend Engineer với dự án thực hành.</p>
        </div>
        <Link to="/roadmap" className={styles.roadmapBtn}>Xem Roadmap →</Link>
      </div>
    </div>
  )
}
