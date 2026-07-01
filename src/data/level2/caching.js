export default {
  slug: 'caching',
  order: 6,
  title: 'Caching',
  emoji: '⚡',
  description: 'Caching là kỹ thuật lưu data vào bộ nhớ nhanh để giảm load cho database. Hiểu Cache Aside, Read/Write Through, Write Back giúp tăng throughput hàng chục lần.',
  project: 'API đọc dữ liệu sản phẩm.',
  problems: [
    { icon: '🐢', title: 'DB quá tải', desc: 'Mọi request đều hit DB dù data hiếm khi thay đổi.' },
    { icon: '💸', title: 'Cache stampede', desc: 'Cache expire → hàng nghìn request cùng hit DB một lúc.' },
    { icon: '🔄', title: 'Cache invalidation', desc: 'Data update trong DB nhưng cache vẫn trả về data cũ.' },
  ],
  concepts: [
    {
      name: 'Cache Aside',
      icon: '🔀',
      explain: 'Cache Aside (Lazy Loading) là pattern phổ biến nhất. Application tự quản lý cache: Read → check cache → nếu miss thì đọc DB → write vào cache. Write → update DB → invalidate cache. Application code phải handle cache logic.',
      tip: 'Cache Aside là default choice cho hầu hết use cases. Nhược điểm: cache miss đầu tiên (cold start) sẽ chậm. Có thể warm up cache khi deploy.',
      example: '// Cache Aside pattern:\nasync function getProduct(id) {\n  // 1. Check cache\n  const cached = await redis.get(`product:${id}`);\n  if (cached) return JSON.parse(cached); // Cache hit ✅\n\n  // 2. Cache miss → query DB\n  const product = await db.query("SELECT * FROM products WHERE id=?", [id]);\n\n  // 3. Write to cache (TTL 5 phút)\n  await redis.setex(`product:${id}`, 300, JSON.stringify(product));\n  return product;\n}',
    },
    {
      name: 'Read Through',
      icon: '📖',
      explain: 'Read Through: Application chỉ đọc từ cache. Cache tự động đọc từ DB khi miss và populate cache. Application không biết về DB. Pattern này được support bởi các caching library như Ehcache, Caffeine, Redis với read-through config.',
      tip: 'Read Through đơn giản hóa application code nhưng tăng coupling giữa cache và DB. Phù hợp khi dùng caching framework có sẵn.',
      example: '// Read Through với Caffeine (Java):\nLoadingCache<Long, Product> cache = Caffeine.newBuilder()\n  .maximumSize(10_000)\n  .expireAfterWrite(5, MINUTES)\n  .build(id -> db.findProductById(id)); // Auto-load on miss\n\n// Application chỉ cần:\nProduct p = cache.get(productId); // Cache tự lo load từ DB',
    },
    {
      name: 'Write Through',
      icon: '✍️',
      explain: 'Write Through: Mỗi khi write, application ghi vào cả cache VÀ DB đồng thời (synchronous). Cache luôn có data mới nhất → không bao giờ stale. Nhược điểm: write latency cao hơn (ghi 2 nơi), tốn cache space cho data ít read.',
      tip: 'Write Through tốt khi read sau write ngay lập tức (read-your-writes consistency). Kết hợp với TTL để tránh cache đầy.',
      example: '// Write Through:\nasync function updateProduct(id, data) {\n  // Ghi đồng thời cả 2\n  await Promise.all([\n    db.update("UPDATE products SET ... WHERE id=?", [id]),\n    redis.setex(`product:${id}`, 300, JSON.stringify(data))\n  ]);\n  return data;\n}\n// Nhược điểm: nếu DB fail, cache có data mới nhưng DB không',
    },
    {
      name: 'Write Back',
      icon: '💾',
      explain: 'Write Back (Write Behind): Ghi vào cache trước, async flush xuống DB sau (có delay). Write latency cực thấp. Nhưng rủi ro mất data nếu cache server crash trước khi flush. Dùng khi write-heavy và có thể chấp nhận eventual consistency.',
      tip: 'Write Back phức tạp để implement đúng. Chỉ dùng khi write performance là priority #1 và có thể chịu mất một lượng nhỏ data (ví dụ: view counter, analytics).',
      example: '// Write Back: ghi cache trước, flush DB sau\nasync function incrementViewCount(postId) {\n  // Write to cache immediately (fast!)\n  await redis.incr(`views:${postId}`);\n  // Async batch flush mỗi 10 giây\n  // (nếu server crash trong 10s → mất count)\n}\n// Background job mỗi 10s:\nconst views = await redis.get(`views:${postId}`);\nawait db.update(`UPDATE posts SET views=${views} WHERE id=?`, [postId]);',
    },
    {
      name: 'TTL',
      icon: '⏰',
      explain: 'TTL (Time To Live) là thời gian sống của cache entry. Sau TTL, cache tự động expire và xóa entry. TTL là cách đơn giản nhất để đảm bảo cache không stale quá lâu. Trade-off: TTL ngắn → cache miss nhiều; TTL dài → data stale.',
      tip: 'Chọn TTL dựa vào tần suất thay đổi của data. Product catalog: 5-15 phút. User profile: 1-5 phút. Session: 30 phút. Real-time price: không nên cache hoặc TTL rất ngắn.',
      example: '// Redis TTL:\nawait redis.setex("product:123", 300, data); // 300 giây = 5 phút\nawait redis.set("session:abc", data, "EX", 1800); // 30 phút\n\n// Kiểm tra TTL còn lại:\nconst ttl = await redis.ttl("product:123"); // 295 (giây còn lại)\n\n// Sliding TTL (reset khi access):\nawait redis.getex("product:123", "EX", 300); // Reset TTL khi đọc',
    },
    {
      name: 'LRU Eviction',
      icon: '🗑️',
      explain: 'LRU (Least Recently Used) Eviction: khi cache đầy, xóa những entry ít được dùng gần đây nhất. Redis hỗ trợ nhiều policy: allkeys-lru, volatile-lru, allkeys-lfu (Least Frequently Used), allkeys-random. LRU phù hợp cho most workloads.',
      tip: 'Redis config: maxmemory 2gb, maxmemory-policy allkeys-lru. Nếu hot data thường xuyên bị evict → tăng memory hoặc dùng LFU policy.',
      example: '// Redis eviction policies:\n// allkeys-lru    → evict LRU từ toàn bộ keys (recommended)\n// volatile-lru   → evict LRU chỉ keys có TTL\n// allkeys-lfu    → evict LFU (tốt hơn LRU cho skewed access)\n// allkeys-random → random eviction\n// noeviction     → throw error khi đầy (không khuyến khích)\n\n// redis.conf:\n// maxmemory 2gb\n// maxmemory-policy allkeys-lru',
    },
    {
      name: 'Cache Stampede',
      icon: '🐂',
      explain: 'Cache Stampede (Thundering Herd): khi một popular cache key expire, hàng trăm/nghìn requests đồng thời miss cache và cùng hit DB → DB bị overload. Thường xảy ra với high-traffic items và đồng bộ TTL.',
      tip: 'Giải pháp: (1) Probabilistic early recompute – refresh trước khi expire, (2) Mutex/Lock – chỉ 1 request fill cache, (3) Stale while revalidate – serve stale trong khi recompute.',
      example: '// Fix: Mutex Lock pattern\nasync function getWithLock(key, fetchFn, ttl) {\n  const cached = await redis.get(key);\n  if (cached) return JSON.parse(cached);\n\n  // Chỉ 1 request được lock để fill cache\n  const lockKey = `lock:${key}`;\n  const locked = await redis.set(lockKey, 1, "NX", "EX", 10);\n  if (!locked) {\n    await sleep(100); // Đợi lock release\n    return getWithLock(key, fetchFn, ttl); // Retry\n  }\n\n  const data = await fetchFn();\n  await redis.setex(key, ttl, JSON.stringify(data));\n  await redis.del(lockKey);\n  return data;\n}',
    },
    {
      name: 'Redis',
      icon: '🔴',
      explain: 'Redis (Remote Dictionary Server) là in-memory data store phổ biến nhất cho caching. Hỗ trợ String, Hash, List, Set, Sorted Set, Stream. Single-threaded nên không có race condition khi dùng atomic commands. Persistence qua RDB snapshots và AOF logging.',
      tip: 'Redis Cluster cho horizontal scaling. Redis Sentinel cho high availability. Dùng Redis Pub/Sub hoặc Streams cho real-time messaging. Tránh KEYS * lệnh trong production (blocking).',
      example: '// Redis data types:\nawait redis.set("str", "hello");           // String\nawait redis.hset("user:1", "name", "Alice"); // Hash\nawait redis.lpush("queue", "job1");          // List\nawait redis.sadd("tags", "nodejs");          // Set\nawait redis.zadd("leaderboard", 100, "Alice"); // Sorted Set\n\n// Atomic increment (thread-safe):\nawait redis.incr("view_count"); // không cần lock!\n\n// Pipeline (batch commands):\nconst pipe = redis.pipeline();\npipe.get("a"); pipe.get("b"); pipe.get("c");\nconst results = await pipe.exec(); // 1 round trip',
    },
  ],
  demos: [
    {
      id: 'cache-aside',
      label: '🔀 Cache Aside (Hit/Miss)',
      language: 'javascript',
      code: `// Cache Aside (Lazy Loading): app tự quản lý cache
// Đọc: check cache -> nếu MISS thì query DB -> ghi lại cache

// Giả lập DB (chậm) + Redis cache (nhanh)
let dbQueries = 0;
const database = new Map([
  [1, { id: 1, name: 'iPhone 15' }],
  [2, { id: 2, name: 'Galaxy S24' }],
]);
function queryDB(id) {
  dbQueries++;                 // đếm số lần "đánh" DB
  return database.get(id) || null;
}

const cache = new Map();
let hits = 0, misses = 0;

function getProduct(id) {
  // 1. Check cache
  if (cache.has(id)) { hits++; return cache.get(id); }
  // 2. MISS -> query DB
  misses++;
  const product = queryDB(id);
  // 3. Ghi cache (chỉ khi có data)
  if (product) cache.set(id, product);
  return product;
}

// 8 request, nhiều id trùng nhau
const reqs = [1, 1, 2, 1, 2, 1, 2, 2];
for (const id of reqs) getProduct(id);

console.log('Tổng request :', reqs.length);
console.log('Cache HIT    :', hits);
console.log('Cache MISS   :', misses);
console.log('DB queries   :', dbQueries, '(= số lần MISS)');
console.log('');
const saved = Math.round((1 - dbQueries / reqs.length) * 100);
console.log('⚡ Cache đỡ cho DB ' + saved + '% số lần đọc!');`,
    },
    {
      id: 'stampede',
      label: '🐂 Cache Stampede',
      language: 'javascript',
      code: `// Cache Stampede: rất nhiều request ập tới NGAY khi cache vừa hết hạn
const N = 1000;

// ❌ KHÔNG khoá: mọi request cùng thấy MISS -> cùng đánh DB
function withoutLock() {
  let cache = null;      // vừa expire, chưa ai ghi lại
  let dbCalls = 0;
  for (let i = 0; i < N; i++) {
    if (cache === null) dbCalls++;   // đồng thời -> ai cũng miss -> ai cũng query
  }
  return dbCalls;
}

// ✅ CÓ mutex (single-flight): chỉ request ĐẦU fill cache, còn lại dùng lại
function withLock() {
  let cache = null;
  let locked = false;
  let dbCalls = 0;
  for (let i = 0; i < N; i++) {
    if (cache !== null) continue;    // đã có kết quả -> dùng lại, không query
    if (!locked) {                   // chỉ 1 request giành được lock
      locked = true;
      dbCalls++;                     // đúng 1 lần đánh DB
      cache = 'product-data';        // fill cache cho tất cả
    }
  }
  return dbCalls;
}

console.log('Request đồng thời :', N);
console.log('❌ Không khoá -> DB bị đánh :', withoutLock(), 'lần  (stampede!)');
console.log('✅ Có mutex    -> DB bị đánh :', withLock(), 'lần');
console.log('');
console.log('⚡ Single-flight lock giảm tải DB tới ' + N + 'x!');`,
    },
    {
      id: 'lru',
      label: '🗑️ LRU Eviction',
      language: 'javascript',
      code: `// LRU Cache (capacity = 3): khi ĐẦY -> xoá phần tử ÍT dùng gần đây nhất
// Mẹo: Map trong JS giữ THỨ TỰ chèn -> key đầu tiên = "cũ" nhất
class LRUCache {
  constructor(capacity) { this.cap = capacity; this.map = new Map(); }
  get(key) {
    if (!this.map.has(key)) return null;
    const val = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, val);          // đưa lên vị trí "mới nhất"
    return val;
  }
  put(key, val) {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.cap) {
      const oldest = this.map.keys().next().value;   // phần tử cũ nhất
      this.map.delete(oldest);
      console.log('  🗑️ evict "' + oldest + '" (ít dùng nhất)');
    }
    this.map.set(key, val);
  }
  keys() { return [...this.map.keys()].join(', '); }
}

const lru = new LRUCache(3);
console.log('put A, B, C');
lru.put('A', 1); lru.put('B', 2); lru.put('C', 3);
console.log('  cache: ' + lru.keys());        // A, B, C

console.log('get A   (A trở thành mới nhất)');
lru.get('A');
console.log('  cache: ' + lru.keys());        // B, C, A

console.log('put D   (đầy -> evict phần tử ít dùng nhất)');
lru.put('D', 4);
console.log('  cache: ' + lru.keys());        // C, A, D`,
    },
  ],
  interactive: {
    title: '⚡ Cache Hit Ratio → độ trễ & tải DB',
    inputLabel: 'Tỉ lệ cache hit (%) từ 0 đến 100',
    inputPlaceholder: '90',
    inputType: 'number',
    run(value) {
      const hit = Math.min(Math.max(parseFloat(value) || 0, 0), 100)
      const miss = 100 - hit
      const CACHE_MS = 1, DB_MS = 50
      const avg = (hit / 100) * CACHE_MS + (miss / 100) * DB_MS
      const total = 10000
      const dbHits = Math.round((total * miss) / 100)
      return [
        `Giả định: cache ${CACHE_MS}ms, DB ${DB_MS}ms`,
        ``,
        `⏱️  Độ trễ trung bình: ${avg.toFixed(2)}ms/request`,
        `    → nhanh gấp ${(DB_MS / avg).toFixed(1)}x so với luôn đọc DB (${DB_MS}ms)`,
        ``,
        `📉 Trên ${total.toLocaleString()} request:`,
        `    DB nhận    : ${dbHits.toLocaleString()} query (${miss}%)`,
        `    Cache xử lý : ${(total - dbHits).toLocaleString()} (${hit}%)`,
        ``,
        hit >= 95 ? '✅ Hit ratio tuyệt vời!'
          : hit >= 80 ? '👍 Hit ratio tốt.'
          : '⚠️  Hit ratio thấp → tăng TTL hoặc cache thêm dữ liệu nóng.',
      ].join('\n')
    },
  },
  callouts: [
    { type: 'success', icon: '⚡', title: 'Cache Aside là default', body: 'Dùng Cache Aside cho hầu hết use cases. Simple, flexible, và dễ debug khi có vấn đề.' },
    { type: 'warning', icon: '🐂', title: 'Cache Stampede', body: 'Dùng Mutex Lock hoặc Probabilistic Early Expiration để tránh stampede khi cache expire.' },
    { type: 'danger', icon: '🔄', title: 'Cache Invalidation', body: 'Invalidate cache ngay khi DB update. Stale data là nguồn gốc của nhiều bugs khó tìm.' },
  ],
  quiz: [
    {
      q: 'Trong pattern Cache Aside, khi cache MISS thì AI đọc DB và ghi lại cache?',
      options: [
        'Bản thân cache tự động load từ DB',
        'Application code tự làm',
        'Database tự đẩy dữ liệu vào cache',
        'Không cần ghi lại, lần sau vẫn cứ miss',
      ],
      answer: 1,
      explain: 'Cache Aside (Lazy Loading): application kiểm tra cache, nếu miss thì TỰ query DB rồi TỰ ghi vào cache. Việc cache tự load hộ chính là pattern Read Through.',
    },
    {
      q: 'Cache Stampede (thundering herd) là hiện tượng gì?',
      options: [
        'Cache dùng quá nhiều RAM',
        'Dữ liệu trong cache bị sai lệch',
        'Một key nóng hết hạn khiến hàng loạt request đồng thời cùng miss và cùng đánh DB',
        'Cache bị hacker tấn công',
      ],
      answer: 2,
      explain: 'Khi một key phổ biến expire, mọi request đến trong "khoảng trống" đều miss cùng lúc và cùng query DB → DB quá tải đột ngột.',
    },
    {
      q: 'Cách chống Cache Stampede dùng trong demo là gì?',
      options: [
        'Dùng mutex/single-flight: chỉ 1 request nạp cache, số còn lại dùng lại kết quả',
        'Tăng TTL lên vô hạn',
        'Xoá toàn bộ cache mỗi giây',
        'Bỏ cache, luôn đọc thẳng DB',
      ],
      answer: 0,
      explain: 'Single-flight lock đảm bảo chỉ 1 request đi xuống DB để nạp lại cache; các request khác chờ rồi đọc từ cache đã nạp → DB chỉ bị đánh 1 lần thay vì N lần.',
    },
    {
      q: 'Khi cache đầy, LRU eviction chọn xoá phần tử nào?',
      options: [
        'Phần tử mới được thêm gần đây nhất',
        'Phần tử ngẫu nhiên',
        'Phần tử có giá trị lớn nhất',
        'Phần tử ÍT được dùng gần đây nhất',
      ],
      answer: 3,
      explain: 'LRU = Least Recently Used. Trong demo, Map giữ thứ tự chèn nên key ở đầu là "cũ" nhất; mỗi lần get() ta đẩy key xuống cuối để đánh dấu vừa được dùng.',
    },
    {
      q: 'Write Back (write-behind) đánh đổi điều gì để có write latency thấp?',
      options: [
        'Đọc dữ liệu chậm hơn hẳn',
        'Rủi ro MẤT dữ liệu nếu cache crash trước khi flush xuống DB',
        'Không thể dùng TTL',
        'Luôn trả về dữ liệu cũ',
      ],
      answer: 1,
      explain: 'Write Back ghi vào cache trước rồi flush xuống DB sau (async). Nếu cache server chết trong khoảng chờ flush, phần dữ liệu chưa flush sẽ mất → chỉ dùng cho data chấp nhận mất (view count, analytics).',
    },
  ],
  exercises: [
    {
      id: 'fix-cache-aside',
      title: 'Sửa lỗi Cache Aside quên ghi cache',
      task: 'Hàm getProduct bị lỗi: khi cache MISS nó query DB nhưng QUÊN ghi kết quả vào cache, nên lần sau vẫn miss và DB bị đánh mỗi request. Hãy sửa để DB chỉ bị đánh đúng theo số id duy nhất. Output kỳ vọng: DB queries = 2.',
      buggyCode: `// BUG: quên ghi cache sau khi query DB lúc miss
let dbQueries = 0;
const database = new Map([[1, 'A'], [2, 'B']]);
const cache = new Map();

function getProduct(id) {
  if (cache.has(id)) return cache.get(id);
  dbQueries++;
  const v = database.get(id) || null;
  // TODO: ghi cache ở đây trước khi return
  return v;
}

const reqs = [1, 1, 2, 1, 2, 2];
for (const id of reqs) getProduct(id);
console.log('DB queries = ' + dbQueries);`,
      expectedOutput: 'DB queries = 2',
      hint: 'Cache-Aside: sau khi query DB lúc miss, phải ghi kết quả vào cache (cache.set(id, v)) TRƯỚC khi return để lần sau hit.',
      solution: `let dbQueries = 0;
const database = new Map([[1, 'A'], [2, 'B']]);
const cache = new Map();

function getProduct(id) {
  if (cache.has(id)) return cache.get(id);
  dbQueries++;
  const v = database.get(id) || null;
  if (v) cache.set(id, v);   // ghi cache để lần sau hit
  return v;
}

const reqs = [1, 1, 2, 1, 2, 2];
for (const id of reqs) getProduct(id);
console.log('DB queries = ' + dbQueries);`,
    },
  ],
}
