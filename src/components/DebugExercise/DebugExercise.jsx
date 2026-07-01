import { useState } from 'react'
import { runInSandbox } from '../CodeRunner/sandbox'
import styles from './DebugExercise.module.css'

// So khớp output "mềm": bỏ khoảng trắng thừa mỗi dòng, bỏ dòng trống, so bằng.
function normalize(s) {
  return String(s)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join('\n')
    .trim()
}

export default function DebugExercise({ exercises, levelColor }) {
  if (!exercises?.length) return null
  return (
    <div style={{ '--level-color': levelColor }}>
      {exercises.map((ex) => <ExerciseCard key={ex.id} ex={ex} />)}
    </div>
  )
}

function ExerciseCard({ ex }) {
  const [code, setCode] = useState(ex.buggyCode)
  const [output, setOutput] = useState(null)
  const [running, setRunning] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [showSolution, setShowSolution] = useState(false)

  const run = async () => {
    setRunning(true)
    setOutput(null)
    const logs = await runInSandbox(code)
    setOutput(logs.join('\n'))
    setRunning(false)
  }

  const passed = output != null && normalize(output) === normalize(ex.expectedOutput)

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span className={styles.tag}>🐞 Bài tập</span>
        <h4 className={styles.title}>{ex.title}</h4>
      </div>
      <p className={styles.task}>{ex.task}</p>

      <div className={styles.expected}>
        <span className={styles.expectedLabel}>🎯 Output kỳ vọng:</span>
        <pre className={styles.expectedPre}>{ex.expectedOutput}</pre>
      </div>

      <textarea
        className={styles.editor}
        spellCheck={false}
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />

      <div className={styles.toolbar}>
        <button className={styles.runBtn} onClick={run} disabled={running}>
          {running ? (<><span className="spinning">⟳</span> Running…</>) : (<>▶ Chạy & Kiểm tra</>)}
        </button>
        <button className={styles.resetBtn} onClick={() => { setCode(ex.buggyCode); setOutput(null) }}>
          ↺ Code gốc
        </button>
        {ex.hint && (
          <button className={styles.linkBtn} onClick={() => setShowHint((v) => !v)}>
            💡 {showHint ? 'Ẩn gợi ý' : 'Gợi ý'}
          </button>
        )}
        {ex.solution && (
          <button className={styles.linkBtn} onClick={() => setShowSolution((v) => !v)}>
            🔑 {showSolution ? 'Ẩn lời giải' : 'Lời giải'}
          </button>
        )}
      </div>

      {showHint && ex.hint && (
        <div className={styles.hint}><span>💡</span><span>{ex.hint}</span></div>
      )}

      {output != null && (
        <div className={`${styles.result} ${passed ? styles.pass : styles.fail}`}>
          <div className={styles.resultHead}>
            {passed ? '✅ Chính xác! Output khớp với kỳ vọng.' : '❌ Chưa khớp. Xem output thực tế bên dưới rồi sửa tiếp.'}
          </div>
          <pre className={styles.outputPre}>{output || '(No output)'}</pre>
        </div>
      )}

      {showSolution && ex.solution && (
        <div className={styles.solution}>
          <span className={styles.solutionLabel}>🔑 Lời giải tham khảo:</span>
          <pre className={styles.solutionPre}>{ex.solution}</pre>
        </div>
      )}
    </div>
  )
}
