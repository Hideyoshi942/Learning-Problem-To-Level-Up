import { NavLink, useNavigate } from 'react-router-dom'
import { LEVELS, TOTAL_TOPICS } from '../../data/index'
import useProgressStore from '../../store/useProgressStore'
import styles from './Sidebar.module.css'

export default function Sidebar({ isOpen }) {
  const { isDone, totalDone, countDoneInLevel } = useProgressStore()
  const done = totalDone()
  const navigate = useNavigate()

  return (
    <aside className={`${styles.sidebar} ${!isOpen ? styles.hidden : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.logoBtn} onClick={() => navigate('/')}>
          <span className={styles.logoIcon}>⚡</span>
          <span className={styles.logoText}>Backend Hub</span>
        </button>
        <span className={styles.badge}>{TOTAL_TOPICS} Topics</span>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        {LEVELS.map((level) => {
          const levelDone = countDoneInLevel(level.id)
          return (
            <div key={level.id} className={styles.levelGroup}>
              <NavLink
                to={`/level/${level.id}`}
                className={({ isActive }) =>
                  `${styles.levelHeader} ${isActive ? styles.levelActive : ''}`
                }
                style={{ '--level-color': level.color }}
              >
                <span className={styles.levelEmoji}>{level.emoji}</span>
                <span className={styles.levelTitle}>Level {level.id}</span>
                <span className={styles.levelCount}>
                  {levelDone}/{level.topics.length}
                </span>
              </NavLink>

              <div className={styles.topicList}>
                {level.topics.map((topic) => {
                  const done = isDone(level.id, topic.slug)
                  return (
                    <NavLink
                      key={topic.slug}
                      to={`/level/${level.id}/topic/${topic.slug}`}
                      className={({ isActive }) =>
                        `${styles.topicItem} ${isActive ? styles.topicActive : ''} ${done ? styles.topicDone : ''}`
                      }
                      style={{ '--level-color': level.color }}
                    >
                      <span className={styles.topicEmoji}>{topic.emoji}</span>
                      <span className={styles.topicTitle}>{topic.title}</span>
                      {done && <span className={styles.checkmark}>✓</span>}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          )
        })}

        <NavLink
          to="/roadmap"
          className={({ isActive }) =>
            `${styles.roadmapLink} ${isActive ? styles.roadmapActive : ''}`
          }
        >
          🗺️ Roadmap
        </NavLink>
      </nav>

      {/* Footer progress */}
      <div className={styles.footer}>
        <div className={styles.progressInfo}>
          <span>Tiến độ</span>
          <span className={styles.progressCount}>{done}/{TOTAL_TOPICS}</span>
        </div>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${(done / TOTAL_TOPICS) * 100}%` }}
          />
        </div>
      </div>
    </aside>
  )
}
