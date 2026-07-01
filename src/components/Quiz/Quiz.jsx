import { useState } from 'react'
import styles from './Quiz.module.css'

// Quiz: chọn đáp án -> Nộp bài -> hiện đúng/sai + giải thích + điểm.
// Không tiết lộ đáp án trước khi nộp. Gọi onComplete(score, total) sau khi nộp.
export default function Quiz({ questions, levelColor, onComplete }) {
  const [answers, setAnswers] = useState(() => Array(questions.length).fill(null))
  const [submitted, setSubmitted] = useState(false)

  const answeredCount = answers.filter((a) => a !== null).length
  const allAnswered = answeredCount === questions.length
  const score = answers.reduce((s, a, i) => s + (a === questions[i].answer ? 1 : 0), 0)
  const pct = Math.round((score / questions.length) * 100)
  const passed = pct >= 70

  const select = (qi, oi) => {
    if (submitted) return
    setAnswers((prev) => {
      const next = [...prev]
      next[qi] = oi
      return next
    })
  }

  const submit = () => {
    if (!allAnswered) return
    setSubmitted(true)
    onComplete?.(score, questions.length)
  }

  const reset = () => {
    setAnswers(Array(questions.length).fill(null))
    setSubmitted(false)
  }

  return (
    <div className={styles.quiz} style={{ '--level-color': levelColor }}>
      {questions.map((q, qi) => {
        const picked = answers[qi]
        return (
          <div key={qi} className={styles.question}>
            <div className={styles.qHead}>
              <span className={styles.qNum}>Câu {qi + 1}</span>
              <span className={styles.qText}>{q.q}</span>
            </div>

            <div className={styles.options}>
              {q.options.map((opt, oi) => {
                const isPicked = picked === oi
                const isCorrect = oi === q.answer
                let cls = styles.option
                if (submitted) {
                  if (isCorrect) cls += ' ' + styles.correct
                  else if (isPicked) cls += ' ' + styles.wrong
                } else if (isPicked) {
                  cls += ' ' + styles.picked
                }
                const mark = submitted && isCorrect ? '✓'
                  : submitted && isPicked ? '✗'
                  : String.fromCharCode(65 + oi) // A, B, C, D
                return (
                  <button key={oi} className={cls} onClick={() => select(qi, oi)} disabled={submitted}>
                    <span className={styles.optMark}>{mark}</span>
                    <span>{opt}</span>
                  </button>
                )
              })}
            </div>

            {submitted && (
              <div className={styles.explain}>
                <strong>{picked === q.answer ? '✅ Chính xác. ' : '❌ Chưa đúng. '}</strong>
                {q.explain}
              </div>
            )}
          </div>
        )
      })}

      {!submitted ? (
        <button className={styles.submitBtn} onClick={submit} disabled={!allAnswered}>
          {allAnswered ? 'Nộp bài →' : `Chọn đáp án (${answeredCount}/${questions.length})`}
        </button>
      ) : (
        <div className={`${styles.scoreBar} ${passed ? styles.pass : styles.fail}`}>
          <span className={styles.scoreText}>
            {passed ? '🎉' : '📚'} Kết quả: {score}/{questions.length} ({pct}%){' — '}
            {passed ? 'Đạt! Bạn đã nắm vững phần này.' : 'Chưa đạt (cần ≥70%), xem lại giải thích rồi thử lại nhé.'}
          </span>
          <button className={styles.retryBtn} onClick={reset}>↻ Làm lại</button>
        </div>
      )}
    </div>
  )
}
