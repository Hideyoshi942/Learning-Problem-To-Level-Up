import { useParams, Link } from 'react-router-dom'
import useProgressStore from '../../store/useProgressStore'
import { getTopic } from '../../data/index'
import styles from './Topbar.module.css'

export default function Topbar({ onMenuClick }) {
  const { levelId, topicSlug } = useParams()
  const { markDone, isDone } = useProgressStore()

  const topic = levelId && topicSlug ? getTopic(Number(levelId), topicSlug) : null
  const done  = topic ? isDone(levelId, topicSlug) : false

  return (
    <header className={styles.topbar}>
      <button className={styles.menuBtn} onClick={onMenuClick} aria-label="Toggle sidebar">
        ☰
      </button>

      <nav className={styles.breadcrumb}>
        <Link to="/">Home</Link>
        {levelId && (
          <>
            <span className={styles.sep}>›</span>
            <Link to={`/level/${levelId}`}>Level {levelId}</Link>
          </>
        )}
        {topic && (
          <>
            <span className={styles.sep}>›</span>
            <span className={styles.current}>{topic.title}</span>
          </>
        )}
      </nav>

      <div className={styles.right}>
        {topic && (
          <button
            className={`${styles.markBtn} ${done ? styles.done : ''}`}
            onClick={() => markDone(levelId, topicSlug)}
          >
            {done ? '✓ Đã hoàn thành' : '✓ Đánh dấu hoàn thành'}
          </button>
        )}
      </div>
    </header>
  )
}
