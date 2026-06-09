import { useParams, Navigate, Link } from 'react-router-dom'
import { getLevel } from '../data/index'
import useProgressStore from '../store/useProgressStore'
import styles from './LevelPage.module.css'

export default function LevelPage() {
  const { levelId } = useParams()
  const level = getLevel(Number(levelId))
  const { isDone, countDoneInLevel } = useProgressStore()

  if (!level) return <Navigate to="/" replace />

  const done = countDoneInLevel(level.id)
  const pct  = Math.round((done / level.topics.length) * 100)

  return (
    <div className={`${styles.page} animate-fade-in`}>
      {/* Header */}
      <div className={styles.header} style={{ '--level-color': level.color }}>
        <div className={styles.headerLeft}>
          <div className={styles.levelBadge}>Level {level.id}</div>
          <h1 className={styles.title}>
            {level.emoji} {level.title}
          </h1>
          <p className={styles.desc}>{level.description}</p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.circleProgress}>
            <svg viewBox="0 0 60 60">
              <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
              <circle
                cx="30" cy="30" r="24" fill="none"
                stroke={level.color}
                strokeWidth="4"
                strokeDasharray={`${pct * 1.508} 150.8`}
                strokeLinecap="round"
                transform="rotate(-90 30 30)"
              />
            </svg>
            <span className={styles.circleText}>{pct}%</span>
          </div>
          <span className={styles.doneText}>{done}/{level.topics.length}</span>
        </div>
      </div>

      {/* Topic cards */}
      <div className={styles.topicsGrid}>
        {level.topics.map((topic, i) => {
          const done = isDone(level.id, topic.slug)
          return (
            <Link
              key={topic.slug}
              to={`/level/${levelId}/topic/${topic.slug}`}
              className={`${styles.topicCard} ${done ? styles.done : ''}`}
              style={{ '--level-color': level.color, animationDelay: `${i * 60}ms` }}
            >
              <div className={styles.topicHeader}>
                <span className={styles.orderBadge} style={{ color: level.color }}>
                  {String(topic.order).padStart(2, '0')}
                </span>
                <span className={styles.topicEmoji}>{topic.emoji}</span>
                {done && <span className={styles.doneCheck}>✓</span>}
              </div>
              <h3 className={styles.topicTitle}>{topic.title}</h3>
              <p className={styles.topicDesc}>{topic.description?.slice(0, 100)}…</p>
              <div className={styles.topicMeta}>
                <span className={styles.conceptCount}>{topic.concepts?.length ?? 0} khái niệm</span>
                <span className={styles.demoCount}>{topic.demos?.length ?? 0} demo</span>
                <span className={styles.goLink}>Học ngay →</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
