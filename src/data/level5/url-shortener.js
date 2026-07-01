export default {
  slug: 'url-shortener',
  order: 21,
  title: 'URL Shortener',
  emoji: '🔗',
  description: 'System design: ID generation, caching, database cho URL shortener scale lớn.',
  project: 'URL Shortener Service.',
  problems: [
    { icon: '💥', title: 'Xung đột mã rút gọn (Collision)', desc: 'Khi sinh mã rút gọn ngẫu nhiên hoặc băm MD5 rồi cắt chuỗi, nguy cơ trùng lặp mã giữa hai URL khác nhau là rất cao khi lượng bản ghi lớn.' },
    { icon: '📊', title: 'Lộ số liệu kinh doanh (Incremental Leak)', desc: 'Nếu dùng ID tự tăng (1, 2, 3...) mã hóa Base62, đối thủ có thể dễ dàng đoán được tổng số lượng link và tốc độ tăng trưởng của hệ thống.' },
    { icon: '🐌', title: 'Độ trễ chuyển hướng (Redirection Latency)', desc: 'Mỗi lượt click link rút gọn yêu cầu độ trễ cực thấp. Nếu DB query chậm hoặc cache miss liên tục, người dùng sẽ cảm thấy bị nghẽn mạng.' }
  ],
  concepts: [
    {
      name: 'ID Generation',
      icon: '🆔',
      explain: 'URL Shortener cần tạo short ID unique cho mỗi URL. Approaches: (1) Auto-increment + Base62 encode, (2) Random Base62 (6-7 chars), (3) MD5/SHA256 hash + take first 7 chars, (4) Snowflake ID. Random có collision risk; hash có predictability; auto-increment lộ business metrics.',
      tip: 'Dùng auto-increment + Base62 encode cho đơn giản. Với scale lớn, dùng distributed ID generator (Snowflake). Check collision trong DB trước khi respond.',
      example: '// Base62 encode auto-increment ID:\nconst BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";\n\nfunction encode(num) {\n  let result = "";\n  while (num > 0) {\n    result = BASE62[num % 62] + result;\n    num = Math.floor(num / 62);\n  }\n  return result || "0";\n}\n\nencode(1000)    // → "G8"\nencode(100000)  // → "q0U"\nencode(1000000) // → "4c92"\n// 6 chars Base62 = 62^6 = 56.8 billion unique IDs',
    },
    {
      name: 'Base62',
      icon: '🔢',
      explain: 'Base62 encoding dùng 62 ký tự (0-9, A-Z, a-z) để biểu diễn số. 6 ký tự Base62 = 62^6 ≈ 56 tỷ URLs. 7 ký tự = 3.5 nghìn tỷ. Compact hơn Base64 (không có +, / hay =). Human-readable và URL-safe. tinyurl.com/abc123 – "abc123" là Base62.',
      tip: '6 ký tự đủ cho hầu hết use cases (56 tỷ URLs). Tránh dùng các ký tự dễ nhầm: O vs 0, l vs 1, I vs l. Có thể exclude chúng để dùng custom Base58 (như Bitcoin).',
      example: '// 62 chars: 0-9, A-Z, a-z\nconst chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";\n\n// Capacity:\n// 6 chars: 62^6  = 56,800,235,584 (56.8 billion)\n// 7 chars: 62^7  = 3,521,614,606,208 (3.5 trillion)\n\n// Decode:\nfunction decode(str) {\n  return [...str].reduce((acc, ch) =>\n    acc * 62 + chars.indexOf(ch), 0);\n}\ndecode("G8")   // → 1000\ndecode("4c92") // → 1000000',
    },
    {
      name: 'Cache',
      icon: '⚡',
      explain: 'URL Shortener là read-heavy workload (99% reads, 1% writes). Cache short_url → long_url trong Redis. Cache hit rate cực cao vì 80% traffic thường đến 20% URLs (Pareto principle). TTL vô thời hạn cho permanent links, có TTL cho temporary links.',
      tip: 'Cache warm-up: pre-cache top 1000 URLs khi startup. LRU eviction phù hợp. Monitor cache hit rate – nếu thấp hơn 95% cần tăng cache size.',
      example: 'async function redirect(shortCode) {\n  // 1. Check cache (fast path ~0.1ms):\n  const cached = await redis.get(`url:${shortCode}`);\n  if (cached) {\n    await incrementClickCount(shortCode); // async\n    return cached;\n  }\n\n  // 2. Cache miss → query DB (~5-10ms):\n  const url = await db.query(\n    "SELECT original_url FROM urls WHERE short_code=?",\n    [shortCode]\n  );\n  if (!url) return null; // 404\n\n  // 3. Cache for next time:\n  await redis.set(`url:${shortCode}`, url.original_url);\n  return url.original_url;\n}',
    },
    {
      name: 'Database Design',
      icon: '🗄️',
      explain: 'URL Shortener DB schema đơn giản: id (auto-increment), short_code (6 chars, unique index), original_url (TEXT), user_id, created_at, expires_at, click_count. Index trên short_code cho O(log n) lookup. Analytics có thể tách sang separate table.',
      tip: 'Dùng NoSQL (Cassandra, DynamoDB) nếu cần scale hàng tỷ records. SQL đủ tốt đến ~500M records với proper indexing. Partition by short_code hash để phân tải.',
      example: '-- URL Shortener Schema:\nCREATE TABLE urls (\n  id         BIGSERIAL PRIMARY KEY,\n  short_code VARCHAR(8) UNIQUE NOT NULL,  -- Indexed!\n  long_url   TEXT NOT NULL,\n  user_id    BIGINT REFERENCES users(id),\n  created_at TIMESTAMPTZ DEFAULT NOW(),\n  expires_at TIMESTAMPTZ,\n  is_active  BOOLEAN DEFAULT TRUE\n);\nCREATE INDEX idx_short_code ON urls(short_code);\n\n-- Analytics (separate table):\nCREATE TABLE url_clicks (\n  id         BIGSERIAL,\n  short_code VARCHAR(8),\n  clicked_at TIMESTAMPTZ DEFAULT NOW(),\n  ip_hash    VARCHAR(64),\n  user_agent TEXT\n) PARTITION BY RANGE (clicked_at);',
    },
    {
      name: 'Rate Limiting',
      icon: '🚦',
      explain: 'URL Shortener cần rate limiting cho create API (tránh spam) và redirect API (tránh abuse). Create: 10-100 URLs/hour/user. Redirect: không limit (bots có thể crawl hợp lệ) nhưng limit theo IP để chống DDoS. Cần phân biệt authenticated user (higher limit) vs anonymous.',
      tip: 'Dùng Redis Token Bucket cho create API. Đừng rate limit redirects quá chặt – traffic spike là bình thường khi URL viral. Focus rate limit vào create endpoint.',
      example: '// Rate limit for URL creation:\nconst rateLimiter = new RateLimiterRedis({\n  storeClient: redis,\n  keyPrefix: "rl:create",\n  points: 50,       // 50 creates\n  duration: 3600,   // per hour\n});\n\napp.post("/shorten", async (req, res) => {\n  try {\n    await rateLimiter.consume(req.user?.id || req.ip);\n    const shortUrl = await createShortUrl(req.body.url);\n    res.json({ shortUrl });\n  } catch (err) {\n    if (err instanceof RateLimiterRes) {\n      res.status(429).json({ error: "Rate limit exceeded",\n        retryAfter: Math.ceil(err.msBeforeNext / 1000) });\n    }\n  }\n});',
    },
  ],
  demos: [
    {
      id: 'base62-conversion',
      label: '🔢 Base62 Converter',
      language: 'javascript',
      code: `// Giả lập cơ chế mã hóa Base62 từ ID số tự tăng
const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function encodeBase62(id) {
  if (id === 0) return BASE62_CHARS[0];
  let num = id;
  let code = '';
  while (num > 0) {
    const remainder = num % 62;
    code = BASE62_CHARS[remainder] + code;
    num = Math.floor(num / 62);
  }
  return code;
}

function decodeBase62(code) {
  let id = 0;
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const val = BASE62_CHARS.indexOf(char);
    id = id * 62 + val;
  }
  return id;
}

console.log('=== Base62 Encoding Demo ===');
const sampleId = 200928302; // Một ID ngẫu nhiên sinh ra từ Database
const shortCode = encodeBase62(sampleId);
console.log(\`Database ID: \${sampleId} -> Mã rút gọn (shortCode): "\${shortCode}"\`);

console.log('\\n=== Base62 Decoding Demo ===');
const decodedId = decodeBase62(shortCode);
console.log(\`Mã rút gọn: "\${shortCode}" -> Giải mã thành Database ID: \${decodedId}\`);`
    },
    {
      id: 'bloom-filter',
      label: '🛡️ Bloom Filter Protector',
      language: 'javascript',
      code: `// Thiết lập Bloom Filter chống Cache Penetration cho URL Shortener
class BloomFilter {
  constructor(size = 1000) {
    this.size = size;
    this.bitArray = Array(size).fill(0);
  }

  // Tạo ra các hàm băm đơn giản khác nhau
  hash1(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31) + str.charCodeAt(i);
    }
    return Math.abs(hash) % this.size;
  }

  hash2(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 137) + str.charCodeAt(i);
    }
    return Math.abs(hash) % this.size;
  }

  // Thêm shortCode đã tồn tại vào Bloom Filter
  add(shortCode) {
    const idx1 = this.hash1(shortCode);
    const idx2 = this.hash2(shortCode);
    this.bitArray[idx1] = 1;
    this.bitArray[idx2] = 1;
  }

  // Kiểm tra nhanh sự tồn tại của shortCode
  contains(shortCode) {
    const idx1 = this.hash1(shortCode);
    const idx2 = this.hash2(shortCode);
    
    // Nếu có bất kì bit nào bằng 0 -> Chắc chắn 100% không tồn tại!
    if (this.bitArray[idx1] === 0 || this.bitArray[idx2] === 0) {
      return false;
    }
    // Có thể tồn tại (xác suất trùng hash nhỏ)
    return true;
  }
}

const filter = new BloomFilter(100);
// Thêm một số code hợp lệ vào hệ thống
filter.add('xyz123');
filter.add('abc789');

console.log('=== Test với Key Hợp Lệ ===');
console.log('Query "xyz123":', filter.contains('xyz123') ? 'Có thể tồn tại -> Chọc vào Cache/DB' : 'Không tồn tại -> Chặn luôn!');

console.log('\\n=== Test với Key Tấn Công (Không Tồn Tại) ===');
console.log('Query "fake404":', filter.contains('fake404') ? 'Có thể tồn tại' : 'Không tồn tại -> Trả về 404 ngay lập tức (Chống sập DB! 🛡️)');`
    }
  ],
  interactive: null,
  callouts: [
    { type: 'warning', icon: '⚠️', title: 'Tránh dùng ID tự tăng thuần túy', body: 'Dùng ID tự tăng (1, 2, 3...) mã hóa Base62 trực tiếp làm lộ lượng giao dịch và thông tin kinh doanh. Hãy mã hóa xáo trộn (feistel cipher, XOR) trước khi encode Base62 để che giấu giá trị thực tế.' },
    { type: 'success', icon: '⚡', title: 'Lựa chọn HTTP 301 vs 302 Redirection', body: 'Hãy dùng HTTP 301 (Permanent Redirect) nếu bạn muốn giảm tải tối đa cho server (browser tự lưu cache). Hãy dùng HTTP 302 (Temporary Redirect) nếu bạn cần thu thập analytics trên mọi click chuột của người dùng.' },
    { type: 'info', icon: '🔢', title: 'Tại sao lại là Base62 thay vì Base64?', body: 'Base64 chứa các ký tự đặc biệt như "+" và "/" có ý nghĩa riêng trên URL và có thể gây lỗi định tuyến. Base62 (0-9, a-z, A-Z) hoàn toàn URL-safe mà vẫn đảm bảo độ nén dữ liệu cực tốt.' },
    { type: 'tip', icon: '📈', title: 'Đồng bộ Click Analytics qua MQ', body: 'Không cập nhật trực tiếp cột click_count trong Database SQL trên mỗi lượt truy cập (gây write bottleneck). Hãy đẩy click event vào Kafka/RabbitMQ và gom batch xử lý bất đồng bộ.' }
  ],
  quiz: [
    {
      q: 'Vì sao không nên dùng ID tự tăng thuần túy rồi mã hóa Base62 trực tiếp làm mã rút gọn?',
      options: ['Vì Base62 không thể mã hóa được các số lớn', 'Vì nó làm lộ tổng số lượng link và tốc độ tăng trưởng của hệ thống', 'Vì nó tạo ra mã dài hơn hẳn so với Base64', 'Vì nó gây xung đột mã rút gọn thường xuyên hơn'],
      answer: 1,
      explain: 'ID tự tăng (1, 2, 3...) encode trực tiếp làm đối thủ dễ đoán được số lượng giao dịch và tốc độ tăng trưởng. Nên xáo trộn giá trị trước khi encode.',
    },
    {
      q: 'Với 6 ký tự Base62, hệ thống có thể tạo ra khoảng bao nhiêu mã unique?',
      options: ['Khoảng 3.5 nghìn tỷ', 'Khoảng 1 triệu', 'Khoảng 56 tỷ', 'Khoảng 62 nghìn'],
      answer: 2,
      explain: '62^6 xấp xỉ 56.8 tỷ mã. Cần 7 ký tự mới đạt khoảng 3.5 nghìn tỷ.',
    },
    {
      q: 'Vì sao URL Shortener thường đạt cache hit rate cực cao?',
      options: ['Vì khoảng 80% traffic thường tập trung vào 20% URLs theo nguyên lý Pareto', 'Vì mọi URL bắt buộc phải được cache vô thời hạn', 'Vì đây là workload thiên về ghi (write-heavy)', 'Vì Redis tự động nhân bản toàn bộ database vào RAM'],
      answer: 0,
      explain: 'Đây là read-heavy workload và 80% traffic đến 20% URLs (Pareto), nên phần lớn request đều trúng cache.',
    },
    {
      q: 'Bloom Filter mang lại lợi ích gì cho URL Shortener?',
      options: ['Tăng độ chính xác của việc mã hóa Base62', 'Nén dữ liệu URL để tiết kiệm bộ nhớ lưu trữ', 'Cân bằng tải giữa các server redirect', 'Chặn nhanh các truy vấn mã không tồn tại để chống sập DB'],
      answer: 3,
      explain: 'Nếu Bloom Filter báo một mã chắc chắn không tồn tại, hệ thống trả 404 ngay mà không cần chọc vào Cache/DB, chống cache penetration.',
    },
  ],
  challenge: {
    brief: 'Thiết kế một URL Shortener như bit.ly/tinyurl: chịu tải đọc-nhiều và độ trễ redirect thấp.',
    scale: ['100 triệu URL mới/ngày', 'Đọc:Ghi = 100:1', 'Lưu tối thiểu 5 năm', 'p99 redirect < 50ms'],
    requirements: [
      'Rút gọn URL dài thành mã ngắn unique',
      'Redirect mã ngắn về URL gốc với độ trễ thấp',
      'Chống đoán mã và không lộ tốc độ tăng trưởng',
      '(Tuỳ chọn) đếm số click phục vụ analytics',
    ],
    steps: [
      { title: 'Capacity Estimation', prompt: 'Ước lượng QPS ghi/đọc, dung lượng lưu 5 năm, và không gian mã cần thiết.', hint: '100M/ngày ≈ 1.160 ghi/s; đọc x100 ≈ 116.000/s. 5 năm ≈ 1.8 tỷ record, mỗi record ~500B → ~1TB. Base62 7 ký tự = 3.5 nghìn tỷ mã, dư sức.' },
      { title: 'API Design', prompt: 'Định nghĩa endpoint tạo và redirect. Chọn mã trạng thái HTTP phù hợp.', hint: 'POST /api/shorten {longUrl} → 201 {shortUrl}. GET /{code} → 301 (browser cache, giảm tải) hoặc 302 (giữ được analytics mọi click).' },
      { title: 'Data Model', prompt: 'Thiết kế schema lưu mapping code ↔ url. SQL hay NoSQL?', hint: 'urls(short_code unique-index, long_url, user_id, created_at, expires_at). Read-heavy + tra cứu theo key → KV store (DynamoDB/Cassandra) scale tốt; SQL đủ đến ~500M record.' },
      { title: 'Code Generation', prompt: 'Sinh mã ngắn sao cho unique, không collision, không lộ metrics?', hint: 'Counter phân tán (Snowflake) + Base62; XOR/Feistel để xáo trộn trước khi encode (che tăng trưởng). Random + check-collision là phương án khác nhưng tốn round-trip.' },
      { title: 'Scale & Trade-offs', prompt: 'Cache, chống cache penetration, sharding, analytics.', hint: 'Cache Redis cho read-heavy (Pareto 80/20) + TTL cho link tạm. Bloom filter chặn mã không tồn tại. Shard theo hash(short_code). Đếm click qua MQ (batch) để tránh write bottleneck.' },
    ],
    rubric: [
      'Có ước lượng cụ thể QPS đọc/ghi và dung lượng lưu trữ',
      'API rõ ràng và giải thích lựa chọn 301 vs 302',
      'Chọn cách sinh mã kèm cơ chế đảm bảo unique và không lộ metrics',
      'Có chiến lược cache cho read-heavy và chống cache penetration',
      'Nêu được ít nhất 2 trade-offs (301/302, SQL/NoSQL, batch analytics)',
    ],
  },
}
