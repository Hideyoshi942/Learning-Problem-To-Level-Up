import { Link } from 'react-router-dom'
import styles from './RoadmapPage.module.css'

const PHASES = [
  { phase: 1, title: 'Foundation', color: '#6378ff', projects: ['Blog System', 'E-commerce CRUD', 'User Management'], topics: ['SQL', 'N+1 Query', 'Pagination'] },
  { phase: 2, title: 'Performance', color: '#f59e0b', projects: ['E-commerce + Redis', 'Full Text Search', 'Payment Mock'], topics: ['Caching', 'Search', 'Idempotency'] },
  { phase: 3, title: 'Distributed', color: '#10b981', projects: ['Microservices', 'Kafka Integration', 'Saga Pattern'], topics: ['Message Queue', 'Distributed Transaction', 'Event-Driven'] },
  { phase: 4, title: 'Scale', color: '#ef4444', projects: ['Ticket Booking', 'Distributed Lock', 'CQRS System'], topics: ['Distributed Lock', 'CQRS', 'Event Sourcing'] },
  { phase: 5, title: 'Social Scale', color: '#8b5cf6', projects: ['Social Network', 'Feed System', 'Notification System'], topics: ['DB Replication', 'Sharding', 'Message Queue'] },
  { phase: 6, title: 'Systems', color: '#06b6d4', projects: ['URL Shortener', 'Search Engine', 'Distributed Scheduler'], topics: ['Consistent Hashing', 'Leader Election', 'Distributed Cache'] },
  { phase: 7, title: 'Advanced', color: '#f43f5e', projects: ['Ride Hailing', 'Payment Gateway', 'Video Streaming Platform'], topics: ['Geo Search', 'Saga Pattern', 'CDN + Streaming'] },
]

export default function RoadmapPage() {
  return (
    <div className={`${styles.page} animate-fade-in`}>
      <div className={styles.header}>
        <h1>🗺️ Roadmap Dự Án</h1>
        <p>7 giai đoạn từ Junior đến Senior Backend Engineer với dự án thực hành cụ thể.</p>
      </div>

      <div className={styles.timeline}>
        {PHASES.map((phase, i) => (
          <div key={phase.phase} className={styles.phaseRow}>
            {/* Connector line */}
            {i < PHASES.length - 1 && <div className={styles.connector} style={{ background: phase.color }} />}

            {/* Phase badge */}
            <div className={styles.phaseBadge} style={{ background: phase.color }}>
              {phase.phase}
            </div>

            {/* Card */}
            <div className={styles.phaseCard} style={{ '--phase-color': phase.color }}>
              <div className={styles.phaseHeader}>
                <span className={styles.phaseLabel} style={{ color: phase.color }}>
                  Giai đoạn {phase.phase}
                </span>
                <h3 className={styles.phaseTitle}>{phase.title}</h3>
              </div>

              <div className={styles.phaseBody}>
                <div className={styles.projects}>
                  <div className={styles.subsection}>🏗️ Dự án</div>
                  {phase.projects.map((p) => (
                    <div key={p} className={styles.projectItem}>
                      <span className={styles.projectDot} style={{ background: phase.color }} />
                      {p}
                    </div>
                  ))}
                </div>

                <div className={styles.relTopics}>
                  <div className={styles.subsection}>📚 Topics liên quan</div>
                  <div className={styles.topicChips}>
                    {phase.topics.map((t) => (
                      <span key={t} className={styles.chip} style={{ borderColor: phase.color, color: phase.color }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.goal}>
        <h2>🎯 Mục Tiêu Senior Backend</h2>
        <p>
          Hoàn thành toàn bộ các dự án trên và hiểu rõ các bài toán tương ứng,
          bạn sẽ tiếp cận được phần lớn các chủ đề xuất hiện trong phỏng vấn
          Backend Mid/Senior và System Design.
        </p>
        <Link to="/" className={styles.startBtn}>⚡ Bắt đầu học ngay</Link>
      </div>
    </div>
  )
}
