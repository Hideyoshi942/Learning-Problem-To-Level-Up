export default {
  slug: 'rate-limiting',
  order: 7,
  title: 'Rate Limiting',
  emoji: '🚦',
  description: 'Rate Limiting bảo vệ API khỏi bị lạm dụng và DDoS. Token Bucket, Leaky Bucket, Sliding Window là 3 thuật toán phổ biến nhất.',
  project: 'API Gateway.',
  problems: [
    { icon: '🔥', title: 'API bị abuse', desc: 'Bot gọi API hàng nghìn lần/giây, làm hệ thống quá tải.' },
    { icon: '💸', title: 'Cost overrun', desc: 'Unlimited API calls tăng chi phí cloud không kiểm soát.' },
  ],
  concepts: [
    {
      name: 'Token Bucket',
      icon: '🪣',
      explain: 'Token Bucket: bucket chứa tối đa capacity tokens, được refill với tốc độ rate tokens/giây. Mỗi request tiêu thụ 1 token. Nếu bucket rỗng → reject request. Cho phép burst traffic ngắn hạn (tiêu hết tokens trong bucket).',
      tip: 'Token Bucket là thuật toán phổ biến nhất cho API rate limiting. AWS API Gateway, Nginx, và hầu hết API gateways đều dùng Token Bucket. Cho phép burst tự nhiên.',
      example: '// Token Bucket với Redis:\nconst CAPACITY = 10;  // tối đa 10 tokens\nconst RATE = 1;       // refill 1 token/giây\n\nasync function isAllowed(userId) {\n  const key = `bucket:${userId}`;\n  const now = Date.now() / 1000;\n  const bucket = await redis.hgetall(key);\n\n  const tokens = bucket ? parseFloat(bucket.tokens) : CAPACITY;\n  const lastRefill = bucket ? parseFloat(bucket.lastRefill) : now;\n\n  // Refill tokens\n  const elapsed = now - lastRefill;\n  const newTokens = Math.min(CAPACITY, tokens + elapsed * RATE);\n\n  if (newTokens < 1) return false; // Rate limited!\n  await redis.hset(key, "tokens", newTokens - 1, "lastRefill", now);\n  return true;\n}',
    },
    {
      name: 'Leaky Bucket',
      icon: '💧',
      explain: 'Leaky Bucket: requests vào queue (bucket), được xử lý với tốc độ cố định (rate). Bucket đầy → reject request. Khác Token Bucket ở chỗ không cho phép burst – output luôn đều đặn. Giống như bộ đệm (queue) có rate-controlled consumer.',
      tip: 'Leaky Bucket đảm bảo smooth traffic, không có burst. Phù hợp khi downstream service nhạy cảm với spike traffic. Khó implement distributed hơn Token Bucket.',
      example: '// Leaky Bucket concept:\n// Requests → [Queue: max_size=10] → Process at rate=5 req/s\n\nclass LeakyBucket {\n  constructor(capacity, rate) {\n    this.queue = [];\n    this.capacity = capacity;  // Max queue size\n    this.rate = rate;          // Process rate (req/s)\n    this.processQueue();\n  }\n\n  add(request) {\n    if (this.queue.length >= this.capacity) {\n      return false; // Drop! Bucket full\n    }\n    this.queue.push(request);\n    return true;\n  }\n\n  processQueue() {\n    setInterval(() => {\n      if (this.queue.length > 0) {\n        const req = this.queue.shift();\n        this.handle(req); // Process at fixed rate\n      }\n    }, 1000 / this.rate);\n  }\n}',
    },
    {
      name: 'Sliding Window Log',
      icon: '📜',
      explain: 'Sliding Window Log: lưu timestamp của mỗi request trong window. Khi có request mới, xóa timestamps cũ ngoài window và đếm số requests còn lại. Chính xác nhất nhưng tốn memory O(n) vì phải lưu từng request timestamp.',
      tip: 'Sliding Window Log chính xác 100% nhưng memory usage tỉ lệ với request count. Với high traffic (10,000 req/s/user), đây là vấn đề. Dùng Sliding Window Counter thay thế.',
      example: '// Sliding Window Log với Redis Sorted Set:\nasync function isAllowed(userId, windowMs, limit) {\n  const now = Date.now();\n  const key = `swlog:${userId}`;\n\n  // Xóa timestamps cũ\n  await redis.zremrangebyscore(key, 0, now - windowMs);\n\n  // Đếm requests trong window\n  const count = await redis.zcard(key);\n  if (count >= limit) return false;\n\n  // Thêm request hiện tại\n  await redis.zadd(key, now, `${now}-${Math.random()}`);\n  await redis.pexpire(key, windowMs);\n  return true;\n}',
    },
    {
      name: 'Sliding Window Counter',
      icon: '🔢',
      explain: 'Sliding Window Counter là cách xấp xỉ Sliding Window Log nhưng dùng ít memory hơn: kết hợp 2 Fixed Window counter (window hiện tại và window trước), nội suy theo vị trí trong window hiện tại. Cloudflare dùng approach này.',
      tip: 'Sliding Window Counter sai số tối đa ~(1/window_count) %, rất chấp nhận được. Memory usage chỉ O(1) thay vì O(n). Best choice cho production.',
      example: '// Sliding Window Counter:\nasync function isAllowed(userId, windowSec, limit) {\n  const now = Math.floor(Date.now() / 1000);\n  const currentWindow = Math.floor(now / windowSec);\n  const prevWindow = currentWindow - 1;\n\n  const [prevCount, currCount] = await redis.mget(\n    `rl:${userId}:${prevWindow}`,\n    `rl:${userId}:${currentWindow}`\n  );\n\n  // Vị trí trong window hiện tại (0.0 → 1.0)\n  const elapsed = (now % windowSec) / windowSec;\n\n  // Nội suy: prev_weight × prev + curr\n  const count = (1 - elapsed) * (prevCount || 0) + (currCount || 0);\n  if (count >= limit) return false;\n\n  await redis.incr(`rl:${userId}:${currentWindow}`);\n  await redis.expire(`rl:${userId}:${currentWindow}`, windowSec * 2);\n  return true;\n}',
    },
    {
      name: 'Fixed Window',
      icon: '🪟',
      explain: 'Fixed Window: đếm requests trong window cố định (ví dụ: mỗi phút từ 00 đến 59 giây). Đơn giản nhất nhưng có biên giới window exploit: 100 req cuối window cũ + 100 req đầu window mới = 200 req trong 1 giây.',
      tip: 'Fixed Window đủ tốt cho nhiều use cases đơn giản. Dùng khi burst attack ngắn không phải vấn đề (ví dụ: limit 1000 req/day thay vì 10 req/s).',
      example: '// Fixed Window với Redis:\nasync function isAllowed(userId, limit) {\n  // Window = phút hiện tại\n  const window = Math.floor(Date.now() / 60000);\n  const key = `fw:${userId}:${window}`;\n\n  const count = await redis.incr(key);\n  if (count === 1) await redis.expire(key, 60); // Set TTL\n\n  return count <= limit;\n}\n// ⚠️ Boundary issue:\n// Window 1 (T=59s): 100 requests → OK\n// Window 2 (T=60s): 100 requests → OK\n// Trong 1s: 200 requests vượt limit thực tế!',
    },
    {
      name: 'Redis Rate Limiter',
      icon: '🔴',
      explain: 'Redis là backend phổ biến nhất cho distributed rate limiting. Dùng Redis Lua script để đảm bảo atomic check-and-increment. Redis cũng có module redis-cell với thuật toán GCRA (Generic Cell Rate Algorithm) rất hiệu quả.',
      tip: 'Lua script trong Redis chạy atomically – không cần lock. Dùng redis-cell module hoặc library như rate-limiter-flexible (Node.js) để tiết kiệm thời gian.',
      example: '-- Redis Lua script (atomic):\nlocal key = KEYS[1]\nlocal limit = tonumber(ARGV[1])\nlocal window = tonumber(ARGV[2])\n\nlocal current = redis.call("INCR", key)\nif current == 1 then\n  redis.call("EXPIRE", key, window)\nend\n\nif current > limit then\n  return 0  -- Rate limited\nend\nreturn 1  -- Allowed\n\n-- Node.js:\nconst allowed = await redis.eval(script, 1, key, 100, 60);',
    },
  ],
  demos: [
    {
      id: 'token-bucket',
      label: '🪣 Token Bucket',
      language: 'javascript',
      code: `// Token Bucket: bucket chứa tối đa CAPACITY token, refill RATE token/giây.
// Mỗi request tiêu 1 token; hết token -> chặn. Cho phép "burst" ngắn.
const CAPACITY = 5;
const RATE = 1;   // 1 token / giây

class TokenBucket {
  constructor() { this.tokens = CAPACITY; this.last = 0; }
  allow(now) {
    // refill theo thời gian trôi qua kể từ lần gọi trước
    this.tokens = Math.min(CAPACITY, this.tokens + (now - this.last) * RATE);
    this.last = now;
    if (this.tokens >= 1) { this.tokens -= 1; return true; }
    return false;
  }
}

const bucket = new TokenBucket();
// thời điểm (giây) các request tới: 7 cái dồn ở t=0, rồi 4 cái ở t=3
const arrivals = [0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 3];
let ok = 0, blocked = 0;
for (const t of arrivals) {
  const allowed = bucket.allow(t);
  console.log('t=' + t + 's  ' + (allowed ? '✅ allow' : '❌ block') + '  (còn ' + bucket.tokens.toFixed(1) + ' token)');
  if (allowed) ok++; else blocked++;
}
console.log('');
console.log('Cho qua: ' + ok + ' | Chặn: ' + blocked);
console.log('→ Burst 5 lúc đầu, sau 3s refill thêm 3 token nên cho thêm 3.');`,
    },
    {
      id: 'fixed-window-bug',
      label: '🪟 Fixed Window (lỗ hổng)',
      language: 'javascript',
      code: `// Fixed Window: đếm request theo cửa sổ cố định 60s. LIMIT = 5.
// Nhược điểm KINH ĐIỂN: lỗ hổng ở RANH GIỚI hai cửa sổ.
const LIMIT = 5;
const counters = {};
function windowOf(sec) { return Math.floor(sec / 60); }
function allow(sec) {
  const w = windowOf(sec);
  counters[w] = (counters[w] || 0) + 1;
  return counters[w] <= LIMIT;
}

// 5 request CUỐI cửa sổ 1 (giây 55-59) + 5 request ĐẦU cửa sổ 2 (giây 60-64)
const times = [55, 56, 57, 58, 59, 60, 61, 62, 63, 64];
let passed = 0;
for (const t of times) if (allow(t)) passed++;

console.log('LIMIT = ' + LIMIT + ' request / 60 giây');
console.log('Cửa sổ 1 (giây 0-59) cho qua : ' + counters[0]);
console.log('Cửa sổ 2 (giây 60-119) cho qua: ' + counters[1]);
console.log('Tổng cho qua: ' + passed);
console.log('');
console.log('⚠️  Từ giây 55 -> 64 (chỉ 10s) đã có ' + passed + ' request lọt = 2x LIMIT!');`,
    },
    {
      id: 'sliding-window-log',
      label: '📜 Sliding Window Log',
      language: 'javascript',
      code: `// Sliding Window Log: lưu timestamp từng request, đếm số request trong
// cửa sổ TRƯỢT [now-WINDOW, now]. Chính xác 100% (đổi lại tốn bộ nhớ O(n)).
const LIMIT = 5;
const WINDOW = 60;   // giây
const log = [];
function allow(now) {
  // loại bỏ timestamp đã ra khỏi cửa sổ trượt
  while (log.length && log[0] <= now - WINDOW) log.shift();
  if (log.length >= LIMIT) return false;
  log.push(now);
  return true;
}

// CÙNG kịch bản "ranh giới" như Fixed Window ở tab trước
const times = [55, 56, 57, 58, 59, 60, 61, 62, 63, 64];
let passed = 0, blocked = 0;
for (const t of times) { if (allow(t)) passed++; else blocked++; }

console.log('LIMIT = ' + LIMIT + ' / ' + WINDOW + 's (sliding)');
console.log('Cho qua: ' + passed + ' | Chặn: ' + blocked);
console.log('');
console.log('✅ Không có lỗ hổng ranh giới: tối đa ' + LIMIT + ' request trong BẤT KỲ 60s nào.');`,
    },
  ],
  interactive: {
    title: '🚦 Token Bucket: gửi N request cùng lúc',
    inputLabel: 'Số request gửi trong 1 giây (burst)',
    inputPlaceholder: '25',
    inputType: 'number',
    run(value) {
      const n = Math.max(parseInt(value) || 0, 0)
      const CAP = 10 // bucket đầy 10 token, refill 1 token/giây
      const allowed = Math.min(n, CAP)
      const blocked = Math.max(n - CAP, 0)
      return [
        `Token Bucket: capacity=${CAP}, refill 1 token/giây`,
        `Gửi ${n} request cùng lúc (chưa kịp refill):`,
        ``,
        `✅ Cho qua : ${allowed}  (dùng hết token trong bucket)`,
        `❌ Bị chặn : ${blocked}`,
        ``,
        blocked === 0
          ? '👍 Vẫn trong giới hạn burst.'
          : `⚠️  ${blocked} request vượt burst → nhận HTTP 429 Too Many Requests, phải đợi ~${blocked}s để refill.`,
      ].join('\n')
    },
  },
  callouts: [
    { type: 'success', icon: '🪣', title: 'Token Bucket là default', body: 'Cho phép burst traffic tự nhiên. Dùng cho hầu hết API rate limiting use cases.' },
    { type: 'info', icon: '🔢', title: 'Sliding Window Counter', body: 'Balance tốt giữa accuracy và memory efficiency. Cloudflare dùng approach này.' },
    { type: 'warning', icon: '🪟', title: 'Fixed Window Boundary', body: 'Fixed Window có thể bị exploit tại ranh giới window. Dùng Sliding Window cho sensitive APIs.' },
  ],
  quiz: [
    {
      q: 'Token Bucket cho phép điều gì mà Leaky Bucket thì không?',
      options: [
        'Giới hạn tuyệt đối không cho vượt',
        'Xử lý output luôn đều đặn',
        'Cho phép BURST ngắn (tiêu dồn token đang có sẵn)',
        'Không cần dùng Redis',
      ],
      answer: 2,
      explain: 'Token Bucket tích luỹ token tới CAPACITY nên cho phép một đợt burst; Leaky Bucket xử lý ở tốc độ cố định nên output luôn đều, không burst.',
    },
    {
      q: 'Nhược điểm kinh điển của thuật toán Fixed Window là gì?',
      options: [
        'Lỗ hổng ở RANH GIỚI hai cửa sổ (có thể lọt ~2x limit trong thời gian ngắn)',
        'Tốn quá nhiều bộ nhớ',
        'Không thể triển khai với Redis',
        'Luôn chặn nhầm mọi request',
      ],
      answer: 0,
      explain: '5 request cuối cửa sổ này + 5 request đầu cửa sổ kế, chỉ cách nhau vài giây → 10 request lọt, gấp đôi limit thực tế.',
    },
    {
      q: 'Sliding Window Log chính xác 100% nhưng đánh đổi điều gì?',
      options: [
        'Sai số rất lớn',
        'Kết quả không ổn định',
        'Tốn CPU khủng khiếp',
        'Tốn bộ nhớ O(n) vì phải lưu timestamp của TỪNG request',
      ],
      answer: 3,
      explain: 'Phải lưu timestamp mỗi request trong cửa sổ → bộ nhớ tỉ lệ số request; với traffic lớn rất tốn kém, nên thực tế hay dùng Sliding Window Counter (O(1)).',
    },
    {
      q: 'Vì sao nên dùng Redis Lua script cho distributed rate limiting?',
      options: [
        'Vì Lua nhanh hơn mọi ngôn ngữ khác',
        'Vì Lua script chạy ATOMIC trong Redis → check-and-increment không bị race',
        'Vì Lua không cần tới Redis',
        'Vì nó tự sinh token miễn phí',
      ],
      answer: 1,
      explain: 'Redis chạy Lua script một cách nguyên tử (không lệnh nào chen giữa), nên đọc counter + tăng + so limit diễn ra an toàn dù nhiều client cùng gọi.',
    },
  ],
  exercises: [
    {
      id: 'fix-rate-limit-offbyone',
      title: 'Sửa off-by-one khiến rate limiter cho qua dư request',
      task: 'Rate limiter cần cho phép tối đa LIMIT = 5 request, số còn lại bị chặn. Nhưng điều kiện so sánh bị off-by-one (count <= LIMIT + 1) khiến nó cho qua tới 6 request. Hãy sửa điều kiện so với limit cho đúng. Output kỳ vọng: Cho qua = 5, Bi chan = 3 (tổng 8 request).',
      buggyCode: `// BUG: off-by-one o dieu kien so sanh -> cho qua du 1 request.
// Muc tieu: cho phep toi da LIMIT = 5 request, cac request sau bi chan.
var LIMIT = 5;
var count = 0;
function allow() {
  count++;
  return count <= LIMIT + 1;   // BUG: du + 1 nen cho qua toi 6 request
}

var passed = 0, blocked = 0;
for (var i = 1; i <= 8; i++) {
  if (allow()) passed++; else blocked++;
}
console.log('Cho qua: ' + passed);
console.log('Bi chan: ' + blocked);`,
      expectedOutput: 'Cho qua: 5\nBi chan: 3',
      hint: 'Bỏ phần + 1 thừa trong điều kiện: chỉ cho qua khi count <= LIMIT (tức đúng 5 request đầu tiên), request thứ 6 trở đi phải bị chặn.',
      solution: `// FIX: bo + 1 thua, so dung voi LIMIT.
var LIMIT = 5;
var count = 0;
function allow() {
  count++;
  return count <= LIMIT;       // dung 5 request dau, tu request 6 bi chan
}

var passed = 0, blocked = 0;
for (var i = 1; i <= 8; i++) {
  if (allow()) passed++; else blocked++;
}
console.log('Cho qua: ' + passed);
console.log('Bi chan: ' + blocked);`,
    },
  ],
}
