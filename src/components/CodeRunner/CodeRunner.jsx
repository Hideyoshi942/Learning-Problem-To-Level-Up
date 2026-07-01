import { useState, useCallback } from 'react'
import { runInSandbox } from './sandbox'
import styles from './CodeRunner.module.css'

export default function CodeRunner({ demos }) {
  const [activeTab, setActiveTab] = useState(demos[0]?.id)
  const [outputs, setOutputs] = useState({})
  const [running, setRunning] = useState({})
  const [editing, setEditing] = useState({})   // id -> bool (đang ở chế độ sửa)
  const [edited, setEdited] = useState({})      // id -> code đã sửa

  const activeDemo = demos.find((d) => d.id === activeTab)
  const canRun = activeDemo?.language === 'javascript'
  const currentCode = edited[activeTab] ?? activeDemo?.code ?? ''
  const isEditing = !!editing[activeTab]

  const handleRun = useCallback(async (demo, codeOverride) => {
    setRunning((r) => ({ ...r, [demo.id]: true }))
    setOutputs((o) => ({ ...o, [demo.id]: null }))
    const logs = await runInSandbox(codeOverride ?? demo.code)
    setOutputs((o) => ({ ...o, [demo.id]: logs.join('\n') }))
    setRunning((r) => ({ ...r, [demo.id]: false }))
  }, [])

  const output = outputs[activeTab]
  const isRunning = running[activeTab]

  return (
    <div className={styles.wrapper}>
      {/* Tabs */}
      <div className={styles.tabs}>
        {demos.map((d) => (
          <button
            key={d.id}
            className={`${styles.tab} ${activeTab === d.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(d.id)}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Code panel */}
      <div className={styles.panel}>
        <div className={styles.toolbar}>
          <div className={styles.dots}>
            <span className={`${styles.dot} ${styles.red}`} />
            <span className={`${styles.dot} ${styles.yellow}`} />
            <span className={`${styles.dot} ${styles.green}`} />
          </div>
          <span className={styles.lang}>{activeDemo?.language?.toUpperCase() ?? 'CODE'}</span>

          {canRun && (
            <div className={styles.actions}>
              {!isEditing ? (
                <button
                  className={styles.editBtn}
                  onClick={() => setEditing((e) => ({ ...e, [activeTab]: true }))}
                >
                  ✎ Sửa
                </button>
              ) : (
                <button
                  className={styles.editBtn}
                  onClick={() => {
                    setEdited((e) => ({ ...e, [activeTab]: activeDemo.code }))
                  }}
                >
                  ↺ Khôi phục
                </button>
              )}
              <button
                className={styles.runBtn}
                onClick={() => handleRun(activeDemo, currentCode)}
                disabled={isRunning}
              >
                {isRunning ? (<><span className="spinning">⟳</span> Running…</>) : (<>▶ Chạy Code</>)}
              </button>
            </div>
          )}
        </div>

        {/* Code: editable textarea khi đang sửa, ngược lại hiển thị highlight */}
        {isEditing ? (
          <textarea
            className={styles.editor}
            spellCheck={false}
            value={currentCode}
            onChange={(e) => setEdited((prev) => ({ ...prev, [activeTab]: e.target.value }))}
          />
        ) : (
          <pre
            className={styles.code}
            dangerouslySetInnerHTML={{ __html: highlight(currentCode) }}
          />
        )}

        {/* Output */}
        {canRun && (
          <div className={`${styles.output} ${output == null ? styles.outputEmpty : ''}`}>
            {output == null
              ? '▶ Nhấn "Chạy Code" để xem kết quả…'
              : output || '(No output)'}
          </div>
        )}
      </div>
    </div>
  )
}

// Simple syntax highlighter
function highlight(code) {
  let s = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  s = s.replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g, '<span class="sh-cmt">$1</span>')
  s = s.replace(/(<span class="sh-cmt">[\s\S]*?<\/span>)|(`[^`]*`|'[^']*'|"[^"]*")/g,
    (m, cmt, str) => cmt || `<span class="sh-str">${str}</span>`)

  const kws = ['const','let','var','function','class','return','if','else','for',
    'while','new','this','true','false','null','undefined','of','in',
    'try','catch','throw','async','await','static','extends','switch','case','break']
  kws.forEach(kw => {
    s = s.replace(new RegExp(`\\b(${kw})\\b(?![^<]*>)`, 'g'), '<span class="sh-kw">$1</span>')
  })

  s = s.replace(/\b(\d[\d_]*(?:\.\d+)?n?)\b(?![^<]*>)/g, '<span class="sh-num">$1</span>')

  const builtins = ['console','Math','Array','Object','Map','Set','JSON','Date',
    'Promise','parseInt','parseFloat','String','Number','Boolean','performance','btoa','atob']
  builtins.forEach(b => {
    s = s.replace(new RegExp(`\\b(${b})\\b(?![^<]*>)`, 'g'), '<span class="sh-cls">$1</span>')
  })

  return s
}
