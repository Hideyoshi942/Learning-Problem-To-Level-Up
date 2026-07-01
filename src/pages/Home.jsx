import { Link } from 'react-router-dom'
import { LEVELS, TOTAL_TOPICS } from '../data/index'
import useProgressStore from '../store/useProgressStore'
import { useState } from 'react'
import styles from './Home.module.css'

export default function Home() {
  const { totalDone, countDoneInLevel, isDone } = useProgressStore()
  const done = totalDone()
  const pct  = Math.round((done / TOTAL_TOPICS) * 100)
  const [activeFilter, setActiveFilter] = useState('all')

  return (
    <div className={`${styles.page} animate-fade-in`}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroTag}>⚡ Backend Engineering Curriculum</div>
        <h1 className={styles.heroTitle}>
          Học {TOTAL_TOPICS} Bài Toán<br />
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
                  <Link
                    key={t.slug}
                    to={`/level/${level.id}/topic/${t.slug}`}
                    className={styles.topicChip}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t.emoji} {t.title}
                  </Link>
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

      {/* Knowledge Index */}
      <div className={styles.knowledgeIndex}>
        <div className={styles.indexHeader}>
          <div>
            <h2 className={styles.indexTitle}>📚 Knowledge Index</h2>
            <p className={styles.indexSubtitle}>Tất cả {TOTAL_TOPICS} bài học – click để học ngay</p>
          </div>
          <div className={styles.filterTabs}>
            <button
              className={`${styles.filterTab} ${activeFilter === 'all' ? styles.filterActive : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              Tất cả
            </button>
            {LEVELS.map((level) => (
              <button
                key={level.id}
                className={`${styles.filterTab} ${activeFilter === String(level.id) ? styles.filterActive : ''}`}
                style={{ '--level-color': level.color }}
                onClick={() => setActiveFilter(String(level.id))}
              >
                {level.emoji} Lv{level.id}
              </button>
            ))}
          </div>
        </div>

        {LEVELS.filter((level) => activeFilter === 'all' || String(level.id) === activeFilter).map((level) => (
          <div key={level.id} className={styles.indexLevelSection}>
            <div className={styles.indexLevelLabel} style={{ '--level-color': level.color }}>
              <span className={styles.indexLevelDot} />
              <span>{level.emoji} Level {level.id} · {level.title}</span>
              <span className={styles.indexLevelCount}>{level.topics.length} topics</span>
            </div>
            <div className={styles.indexTopicGrid}>
              {level.topics.map((topic, i) => {
                const topicDone = isDone(level.id, topic.slug)
                return (
                  <Link
                    key={topic.slug}
                    to={`/level/${level.id}/topic/${topic.slug}`}
                    className={`${styles.indexTopicCard} ${topicDone ? styles.indexTopicDone : ''}`}
                    style={{ '--level-color': level.color, animationDelay: `${i * 40}ms` }}
                  >
                    <div className={styles.indexTopicTop}>
                      <span className={styles.indexTopicEmoji}>{topic.emoji}</span>
                      <span className={styles.indexTopicOrder}>#{String(topic.order).padStart(2, '0')}</span>
                      {topicDone && <span className={styles.indexTopicCheck}>✓</span>}
                    </div>
                    <h3 className={styles.indexTopicTitle}>{topic.title}</h3>
                    <p className={styles.indexTopicDesc}>{topic.description?.slice(0, 80)}…</p>
                    <div className={styles.indexTopicMeta}>
                      <span>{topic.concepts?.length ?? 0} khái niệm</span>
                      <span className={styles.indexLearnBtn}>Học ngay →</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
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
