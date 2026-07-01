import { useState } from 'react'
import styles from './DesignChallenge.module.css'

// Design Challenge (Bloom 4-5): đề thiết kế mở + gợi ý từng bước + rubric tự chấm.
export default function DesignChallenge({ challenge, levelColor }) {
  const [openStep, setOpenStep] = useState(null)
  const [revealed, setRevealed] = useState({}) // stepIndex -> bool (đã xem gợi ý)
  const [checked, setChecked] = useState(() => new Set())

  if (!challenge) return null
  const { brief, scale = [], requirements = [], steps = [], rubric = [] } = challenge

  const toggleCheck = (i) => {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const score = checked.size
  const pct = rubric.length ? Math.round((score / rubric.length) * 100) : 0

  return (
    <div className={styles.box} style={{ '--level-color': levelColor }}>
      <p className={styles.brief}>{brief}</p>

      {scale.length > 0 && (
        <div className={styles.scaleRow}>
          {scale.map((s, i) => <span key={i} className={styles.scaleChip}>📊 {s}</span>)}
        </div>
      )}

      {requirements.length > 0 && (
        <div className={styles.block}>
          <h4 className={styles.blockTitle}>✅ Yêu cầu</h4>
          <ul className={styles.reqList}>
            {requirements.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      {steps.length > 0 && (
        <div className={styles.block}>
          <h4 className={styles.blockTitle}>🧭 Các bước thiết kế (tự làm, bấm để xem gợi ý)</h4>
          <div className={styles.steps}>
            {steps.map((step, i) => {
              const open = openStep === i
              return (
                <div key={i} className={styles.step}>
                  <button className={styles.stepHead} onClick={() => setOpenStep(open ? null : i)}>
                    <span className={styles.stepNum}>{i + 1}</span>
                    <span className={styles.stepTitle}>{step.title}</span>
                    <span className={styles.chevron}>{open ? '▲' : '▼'}</span>
                  </button>
                  {open && (
                    <div className={styles.stepBody}>
                      <p className={styles.stepPrompt}>{step.prompt}</p>
                      {step.hint && (
                        revealed[i] ? (
                          <div className={styles.hint}><span>💡</span><span>{step.hint}</span></div>
                        ) : (
                          <button
                            className={styles.hintBtn}
                            onClick={() => setRevealed((r) => ({ ...r, [i]: true }))}
                          >
                            💡 Xem gợi ý
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {rubric.length > 0 && (
        <div className={styles.block}>
          <h4 className={styles.blockTitle}>📋 Rubric tự chấm — {score}/{rubric.length} tiêu chí ({pct}%)</h4>
          <div className={styles.rubric}>
            {rubric.map((r, i) => (
              <label key={i} className={`${styles.rubricItem} ${checked.has(i) ? styles.rubricDone : ''}`}>
                <input type="checkbox" checked={checked.has(i)} onChange={() => toggleCheck(i)} />
                <span>{r}</span>
              </label>
            ))}
          </div>
          {rubric.length > 0 && (
            <div className={styles.rubricTrack}>
              <div className={styles.rubricFill} style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
