import { useState } from 'react'
import styles from './InteractiveBox.module.css'

export default function InteractiveBox({ config }) {
  const [value, setValue] = useState('')
  const [result, setResult] = useState(null)

  if (!config) return null

  const handleRun = () => {
    if (!value.trim()) { setResult('⚠️  Vui lòng nhập giá trị!'); return }
    try {
      setResult(config.run(value))
    } catch (e) {
      setResult('❌ Error: ' + e.message)
    }
  }

  return (
    <div className={styles.box}>
      <h3 className={styles.title}>{config.title}</h3>
      <div className={styles.inputRow}>
        <input
          className={styles.input}
          type={config.inputType}
          placeholder={config.inputPlaceholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleRun()}
          aria-label={config.inputLabel}
        />
        <button className={styles.btn} onClick={handleRun}>
          Thử ngay →
        </button>
      </div>
      <div className={`${styles.result} ${result === null ? styles.placeholder : ''}`}>
        {result ?? 'Nhập giá trị và nhấn "Thử ngay"...'}
      </div>
    </div>
  )
}
