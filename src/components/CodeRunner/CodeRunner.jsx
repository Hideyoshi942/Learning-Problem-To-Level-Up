import { useState, useRef, useCallback } from 'react'
import styles from './CodeRunner.module.css'

// Sandboxed iframe runner – safe execution
// Dùng base64 encoding để tránh conflict với template literals, quotes, HTML special chars
function runInSandbox(code) {
  return new Promise((resolve) => {
    // Encode toàn bộ code thành base64
    // → srcdoc chỉ chứa ký tự an toàn, không bao giờ bị SyntaxError do inject
    let b64
    try {
      b64 = btoa(unescape(encodeURIComponent(code)))
    } catch {
      resolve(['❌ Encode error: code chứa ký tự không hỗ trợ'])
      return
    }

    const html = `<!DOCTYPE html><html><body><script>
      const _logs = [];
      const _timers = {};
      console.log = (...a) => _logs.push(
        a.map(x => typeof x === 'object' && x !== null ? JSON.stringify(x, null, 2) : String(x)).join(' ')
      );
      console.warn  = (...a) => _logs.push('⚠️  ' + a.map(String).join(' '));
      console.error = (...a) => _logs.push('❌ ' + a.map(String).join(' '));
      console.time  = (l) => { _timers[l] = performance.now(); };
      console.timeEnd = (l) => {
        const ms = _timers[l] != null ? (performance.now() - _timers[l]).toFixed(2) : '?';
        _logs.push(l + ': ' + ms + 'ms');
        delete _timers[l];
      };
      try {
        // Decode base64 → original code string → eval an toàn trong sandbox
        const code = decodeURIComponent(escape(atob('${b64}')));
        eval(code);
      } catch(e) {
        _logs.push('❌ ' + e.name + ': ' + e.message);
      }
      parent.postMessage({ type: 'done', logs: _logs }, '*');
    <\/script></body></html>`

    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.sandbox = 'allow-scripts'
    document.body.appendChild(iframe)

    const handler = (e) => {
      if (e.data?.type === 'done') {
        window.removeEventListener('message', handler)
        try { document.body.removeChild(iframe) } catch {}
        resolve(e.data.logs)
      }
    }
    window.addEventListener('message', handler)

    iframe.srcdoc = html

    // Safety timeout – tránh infinite loop treo browser
    setTimeout(() => {
      try { document.body.removeChild(iframe) } catch {}
      window.removeEventListener('message', handler)
      resolve(['⏱️  Timeout sau 5 giây – có thể có infinite loop?'])
    }, 5000)
  })
}

export default function CodeRunner({ demos }) {
  const [activeTab, setActiveTab] = useState(demos[0]?.id)
  const [outputs, setOutputs] = useState({})
  const [running, setRunning] = useState({})

  const activeDemo = demos.find((d) => d.id === activeTab)

  const handleRun = useCallback(async (demo) => {
    setRunning((r) => ({ ...r, [demo.id]: true }))
    setOutputs((o) => ({ ...o, [demo.id]: null }))

    const logs = await runInSandbox(demo.code)

    setOutputs((o) => ({ ...o, [demo.id]: logs.join('\n') }))
    setRunning((r) => ({ ...r, [demo.id]: false }))
  }, [])

  const output = outputs[activeTab]
  const isRunning = running[activeTab]
  const canRun = activeDemo?.language === 'javascript'

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
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.dots}>
            <span className={`${styles.dot} ${styles.red}`} />
            <span className={`${styles.dot} ${styles.yellow}`} />
            <span className={`${styles.dot} ${styles.green}`} />
          </div>
          <span className={styles.lang}>
            {activeDemo?.language?.toUpperCase() ?? 'CODE'}
          </span>
          {canRun && (
            <button
              className={styles.runBtn}
              onClick={() => handleRun(activeDemo)}
              disabled={isRunning}
            >
              {isRunning ? (
                <><span className="spinning">⟳</span> Running…</>
              ) : (
                <>▶ Chạy Code</>
              )}
            </button>
          )}
        </div>

        {/* Code */}
        <pre
          className={styles.code}
          dangerouslySetInnerHTML={{ __html: highlight(activeDemo?.code ?? '') }}
        />

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

  // Comments first
  s = s.replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g, '<span class="sh-cmt">$1</span>')

  // Template & regular strings (skip inside comments)
  s = s.replace(/(<span class="sh-cmt">[\s\S]*?<\/span>)|(`[^`]*`|'[^']*'|"[^"]*")/g,
    (m, cmt, str) => cmt || `<span class="sh-str">${str}</span>`)

  // Keywords
  const kws = ['const','let','var','function','class','return','if','else','for',
    'while','new','this','true','false','null','undefined','of','in',
    'try','catch','throw','async','await','static','extends','switch','case','break']
  kws.forEach(kw => {
    s = s.replace(new RegExp(`\\b(${kw})\\b(?![^<]*>)`, 'g'), '<span class="sh-kw">$1</span>')
  })

  // Numbers
  s = s.replace(/\b(\d[\d_]*(?:\.\d+)?n?)\b(?![^<]*>)/g, '<span class="sh-num">$1</span>')

  // Built-ins
  const builtins = ['console','Math','Array','Object','Map','Set','JSON','Date',
    'Promise','parseInt','parseFloat','String','Number','Boolean','performance','btoa','atob']
  builtins.forEach(b => {
    s = s.replace(new RegExp(`\\b(${b})\\b(?![^<]*>)`, 'g'), '<span class="sh-cls">$1</span>')
  })

  return s
}
