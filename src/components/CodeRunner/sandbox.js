// Sandboxed iframe runner – safe, synchronous execution of demo/exercise code.
// Dùng base64 encoding để tránh conflict với template literals, quotes, HTML special chars.
// LƯU Ý: logs được thu ĐỒNG BỘ rồi postMessage ngay -> code phải đồng bộ (không async).
export function runInSandbox(code) {
  return new Promise((resolve) => {
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
        const code = decodeURIComponent(escape(atob('${b64}')));
        eval(code);
      } catch(e) {
        _logs.push('❌ ' + e.name + ': ' + e.message);
      }
      parent.postMessage({ type: 'done', logs: _logs }, '*');
    </script></body></html>`

    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.sandbox = 'allow-scripts'
    document.body.appendChild(iframe)

    const handler = (e) => {
      if (e.data?.type === 'done') {
        window.removeEventListener('message', handler)
        if (iframe.parentNode) document.body.removeChild(iframe)
        resolve(e.data.logs)
      }
    }
    window.addEventListener('message', handler)
    iframe.srcdoc = html

    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe)
      window.removeEventListener('message', handler)
      resolve(['⏱️  Timeout sau 5 giây – có thể có infinite loop?'])
    }, 5000)
  })
}
