export default {
  slug: 'sql',
  order: 1,
  title: 'SQL Query Optimization',
  emoji: '🗄️',
  description:
    'SQL là nền tảng của mọi Backend Engineer. Hiểu sâu về Index, Execution Plan và cách tối ưu Query giúp hệ thống xử lý hàng triệu records một cách hiệu quả.',
  project: 'Xây dựng hệ thống quản lý đơn hàng 10 triệu bản ghi và tối ưu các API tìm kiếm.',
  problems: [
    { icon: '🐢', title: 'Full Table Scan', desc: 'Database đọc toàn bộ bảng để tìm kết quả. Nguy hiểm khi bảng có hàng triệu bản ghi.' },
    { icon: '📉', title: 'Index không hiệu quả', desc: 'Index tồn tại nhưng query không dùng được, hoặc bị function wrap vô hiệu hoá.' },
    { icon: '🔗', title: 'JOIN chậm', desc: 'JOIN nhiều bảng lớn mà không có index phù hợp gây query timeout.' },
    { icon: '🔄', title: 'Subquery chậm', desc: 'Subquery correlated chạy lại cho từng row của outer query.' },
  ],
  concepts: [
    {
      name: 'B-Tree Index',
      icon: '🌳',
      explain: 'B-Tree (Balanced Tree) là cấu trúc dữ liệu phổ biến nhất cho index trong PostgreSQL/MySQL. Dữ liệu được lưu dạng cây cân bằng, cho phép tìm kiếm, range query và sort với độ phức tạp O(log n).',
      tip: 'Phù hợp với =, <, >, BETWEEN, LIKE "prefix%". Không hiệu quả với LIKE "%suffix".',
      example: 'CREATE INDEX idx_email ON users(email);\n-- B-Tree cho phép:\n-- WHERE email = \'a@b.com\'      ✅ O(log n)\n-- WHERE email LIKE \'admin%\'     ✅ O(log n)\n-- WHERE email LIKE \'%@gmail\'    ❌ Full scan',
    },
    {
      name: 'Composite Index',
      icon: '📋',
      explain: 'Index trên nhiều cột cùng lúc. Thứ tự cột rất quan trọng – index (A, B) chỉ hỗ trợ query trên A đơn, hoặc (A + B) kết hợp. Query chỉ trên B sẽ không dùng được index này (Left-prefix rule).',
      tip: 'Đặt cột có selectivity cao (nhiều giá trị khác nhau) và hay dùng trong WHERE lên trước.',
      example: 'CREATE INDEX idx_status_date ON orders(status, created_at);\n\n-- ✅ Dùng được index:\nWHERE status = \'pending\'\nWHERE status = \'pending\' AND created_at > \'2024-01-01\'\n\n-- ❌ Không dùng được (bỏ qua leading column):\nWHERE created_at > \'2024-01-01\'',
    },
    {
      name: 'Covering Index',
      icon: '🛡️',
      explain: 'Covering Index chứa đủ tất cả cột mà query cần (cả WHERE lẫn SELECT), giúp database không cần quay lại đọc table gốc (Index Only Scan). Đây là kỹ thuật tối ưu mạnh nhất cho read-heavy queries.',
      tip: 'Dùng INCLUDE trong PostgreSQL để thêm cột vào index mà không ảnh hưởng thứ tự sắp xếp.',
      example: '-- Query cần: status, created_at, amount\nCREATE INDEX idx_covering\n  ON orders(status, created_at)\n  INCLUDE (amount);   -- ← cột extra, không sort\n\n-- EXPLAIN sẽ hiện "Index Only Scan" → ⚡ nhanh nhất!',
    },
    {
      name: 'Execution Plan',
      icon: '🗺️',
      explain: 'Execution Plan là kế hoạch mà Query Planner tạo ra để thực thi SQL. Nó cho biết database sẽ dùng cách nào: Seq Scan, Index Scan, Hash Join, Nested Loop... Đọc được execution plan giúp bạn biết bottleneck ở đâu.',
      tip: 'Đọc từ trong ra ngoài (inner node thực thi trước). Chú ý "cost" và "actual time".',
      example: 'EXPLAIN ANALYZE SELECT * FROM orders WHERE status = \'pending\';\n\n-- Output:\n-- Seq Scan on orders  (cost=0..15420 rows=125000)\n--   Filter: (status = \'pending\')\n--   Rows Removed by Filter: 375000  ← BAD!\n--   Actual time: 245ms',
    },
    {
      name: 'EXPLAIN ANALYZE',
      icon: '🔬',
      explain: 'EXPLAIN cho thấy kế hoạch dự kiến; EXPLAIN ANALYZE thực sự chạy query và so sánh ước tính vs thực tế. Dùng để phát hiện cases database đánh giá sai số rows (misestimate) dẫn đến chọn sai plan.',
      tip: 'Thêm BUFFERS để thấy cache hit/miss. Dùng EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) để xuất JSON đẹp hơn.',
      example: 'EXPLAIN (ANALYZE, BUFFERS)\nSELECT * FROM orders\nJOIN users ON orders.user_id = users.id\nWHERE orders.status = \'pending\';\n\n-- Chú ý:\n-- "Seq Scan"    → cần index\n-- "Hash Join"   → có thể chậm với dataset lớn\n-- "Index Scan"  → tốt\n-- "Index Only"  → tốt nhất ⚡',
    },
    {
      name: 'Index Selectivity',
      icon: '🎯',
      explain: 'Selectivity = số giá trị unique / tổng số rows. Giá trị gần 1.0 = high selectivity = index rất hiệu quả. Cột boolean (true/false) có selectivity ~0.5 → index thường không có ích (database sẽ chọn Seq Scan).',
      tip: 'Rule of thumb: index chỉ được dùng khi query trả về < 5-15% rows. Cột gender, status ít giá trị → low selectivity.',
      example: '-- Kiểm tra selectivity:\nSELECT\n  COUNT(DISTINCT email) * 1.0 / COUNT(*) AS email_sel,   -- ~1.0 ✅\n  COUNT(DISTINCT status) * 1.0 / COUNT(*) AS status_sel  -- ~0.004 ❌\nFROM orders;\n\n-- email: 0.99 → index rất hiệu quả\n-- status: 0.004 → index ít có giá trị',
    },
    {
      name: 'Query Planner',
      icon: '🤖',
      explain: 'Query Planner (hay Query Optimizer) là bộ não của database – nó phân tích nhiều cách thực thi query và chọn cách rẻ nhất dựa trên statistics (số rows, distribution của data). Statistics được update bởi ANALYZE.',
      tip: 'Nếu planner chọn sai plan, chạy ANALYZE để cập nhật statistics. Có thể dùng pg_hint_plan để gợi ý planner.',
      example: '-- Cập nhật statistics thủ công:\nANALYZE orders;\n\n-- Xem statistics của cột:\nSELECT * FROM pg_stats\nWHERE tablename = \'orders\'\n  AND attname = \'status\';\n\n-- Planner dùng n_distinct, correlation\n-- để ước tính rows và chọn join method',
    },
  ],
  demos: [
    {
      id: 'full-scan-vs-index',
      label: '🔍 Full Scan vs Index',
      language: 'javascript',
      code: `// Simulate: 100,000 rows – tìm user theo email

// ❌ KHÔNG có Index – Full Table Scan O(n)
function findUserNoIndex(users, email) {
  let checked = 0;
  for (const user of users) {
    checked++;
    if (user.email === email) return { user, rowsChecked: checked };
  }
  return { user: null, rowsChecked: checked };
}

// ✅ CÓ Index (Hash Map mô phỏng B-Tree) – O(1)~O(log n)
function buildIndex(users, field) {
  const index = new Map();
  for (const user of users) index.set(user[field], user);
  return index;
}
function findUserWithIndex(index, email) {
  const user = index.get(email);
  return { user, rowsChecked: user ? 1 : 0 };
}

// --- RUN ---
const N = 10_000;
const users = Array.from({ length: N }, (_, i) => ({
  id: i + 1,
  email: \`user\${i + 1}@example.com\`,
  name: \`User \${i + 1}\`,
}));
const target = 'user99999@example.com';

console.time('Full Scan');
const r1 = findUserNoIndex(users, target);
console.timeEnd('Full Scan');
console.log(\`❌ Full Scan: checked \${r1.rowsChecked.toLocaleString()} rows\`);

const emailIndex = buildIndex(users, 'email');
console.time('Index Lookup');
const r2 = findUserWithIndex(emailIndex, target);
console.timeEnd('Index Lookup');
console.log(\`✅ Index:     checked \${r2.rowsChecked} row\`);
console.log(\`\\n⚡ Index is ~\${r1.rowsChecked}x fewer rows checked!\`);`,
    },
    {
      id: 'composite-index',
      label: '📋 Composite Index',
      language: 'javascript',
      code: `// Composite Index (status, created_at)
// SQL: SELECT * FROM orders WHERE status='pending' AND created_at > ?

function buildCompositeIndex(orders) {
  return [...orders].sort((a, b) => {
    if (a.status !== b.status) return a.status.localeCompare(b.status);
    return a.created_at - b.created_at;
  });
}

function queryWithIndex(idx, status, minDate) {
  // Binary search cho điểm bắt đầu
  let lo = 0, hi = idx.length - 1, start = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (idx[mid].status === status && idx[mid].created_at >= minDate) {
      start = mid; hi = mid - 1;
    } else if (idx[mid].status < status ||
              (idx[mid].status === status && idx[mid].created_at < minDate)) {
      lo = mid + 1;
    } else hi = mid - 1;
  }
  if (start === -1) return { results: [], scanned: 0 };
  const results = [];
  let scanned = 0;
  for (let i = start; i < idx.length && idx[i].status === status; i++) {
    scanned++;
    if (idx[i].created_at >= minDate) results.push(idx[i]);
  }
  return { results, scanned };
}

const statuses = ['pending','shipped','delivered','cancelled'];
const orders = Array.from({ length: 50000 }, (_, i) => ({
  id: i + 1,
  status: statuses[i % 4],
  created_at: Date.now() - Math.random() * 365 * 86400000,
  amount: Math.floor(Math.random() * 1000000),
}));
const minDate = Date.now() - 30 * 86400000;

console.time('Full Scan');
const fullScan = orders.filter(o => o.status === 'pending' && o.created_at > minDate);
console.timeEnd('Full Scan');
console.log(\`❌ Full Scan: scanned 50,000 → found \${fullScan.length}\`);

const idx = buildCompositeIndex(orders);
console.time('Composite Index');
const { results, scanned } = queryWithIndex(idx, 'pending', minDate);
console.timeEnd('Composite Index');
console.log(\`✅ Composite: scanned \${scanned} → found \${results.length}\`);
console.log(\`   Hiệu quả: \${((1 - scanned/50000)*100).toFixed(1)}% ít rows hơn!\`);`,
    },
    {
      id: 'explain-plan',
      label: '📝 EXPLAIN ANALYZE',
      language: 'sql',
      code: `-- =============================================
-- EXPLAIN ANALYZE – Công cụ quan trọng nhất
-- khi debug query performance trong PostgreSQL
-- =============================================

-- 1. Query chậm (Full Seq Scan):
EXPLAIN ANALYZE
SELECT * FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'pending'
ORDER BY o.created_at DESC;

/*
Output (BAD):
  Seq Scan on orders  (cost=0..15420.00 rows=125000)
    Filter: (status = 'pending')
    Rows Removed by Filter: 375000   ← ĐỌC 500K ROWS, BỎ 375K!
    Actual time: 245.123ms           ← RẤT CHẬM
*/

-- 2. Thêm Composite Index:
CREATE INDEX idx_orders_status_created
  ON orders(status, created_at DESC);

-- 3. Query lại:
EXPLAIN ANALYZE
SELECT * FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'pending'
ORDER BY o.created_at DESC;

/*
Output (GOOD):
  Index Scan using idx_orders_status_created on orders
    Index Cond: (status = 'pending')
    Actual time: 2.456ms             ← 100x NHANH HƠN!
*/

-- =============================================
-- CÁC TỪ KHOÁ CẦN CHÚ Ý TRONG EXPLAIN:
-- =============================================
-- ⚠️  "Seq Scan"        → Full table scan, cần index!
-- ✅  "Index Scan"       → Dùng index, tốt
-- 🚀  "Index Only Scan"  → Covering index, không đọc table
-- ⚠️  "Sort"            → Tốn memory, nên có index
-- 💀  "Hash Join" lớn   → Có thể chậm với dataset lớn
-- ✅  "Nested Loop"      → Tốt khi inner set nhỏ`,
    },
  ],
  interactive: {
    title: '⚡ So sánh: Full Scan vs Index với N records',
    inputLabel: 'Số records (1,000 – 1,000,000)',
    inputPlaceholder: '100000',
    inputType: 'number',
    run(value) {
      const n = Math.min(Math.max(parseInt(value) || 1000, 1000), 1_000_000)
      const logN = Math.ceil(Math.log2(n))
      return [
        `📊 Bảng có ${n.toLocaleString()} records:`,
        ``,
        `❌ Full Table Scan:`,
        `   Rows phải đọc: ${n.toLocaleString()} (worst case)`,
        `   Complexity: O(n)`,
        ``,
        `✅ B-Tree Index Lookup:`,
        `   Rows phải đọc: ~${logN} (chiều cao cây = log₂n)`,
        `   Complexity: O(log n)`,
        ``,
        `⚡ Index nhanh hơn: ~${Math.round(n / logN).toLocaleString()}x!`,
      ].join('\n')
    },
  },
  callouts: [
    { type: 'success', icon: '🚀', title: 'Khi nào nên dùng Index?', body: 'Cột thường xuyên xuất hiện trong WHERE, JOIN ON, ORDER BY. Ưu tiên cột có high selectivity (nhiều giá trị unique).' },
    { type: 'warning', icon: '⚠️', title: 'Index cũng có hại!', body: 'INSERT/UPDATE/DELETE chậm hơn vì phải cập nhật index. Tốn storage. Đừng index mọi cột.' },
    { type: 'info', icon: '💡', title: 'Workflow chuẩn', body: '1) EXPLAIN ANALYZE → 2) Tìm Seq Scan → 3) Thêm index → 4) EXPLAIN ANALYZE lại để xác nhận.' },
  ],
  quiz: [
    {
      q: 'Với index B-Tree trên cột email, truy vấn nào KHÔNG tận dụng được index?',
      options: [
        'WHERE email = a@b.com',
        'WHERE email LIKE admin%',
        'WHERE email BETWEEN hai giá trị',
        'WHERE email LIKE %@gmail',
      ],
      answer: 3,
      explain: 'B-Tree chỉ hỗ trợ =, range và prefix (LIKE admin%). LIKE bắt đầu bằng ký tự wildcard như %@gmail buộc database phải full scan.',
    },
    {
      q: 'Có composite index (status, created_at). Theo Left-prefix rule, truy vấn nào KHÔNG dùng được index này?',
      options: [
        'WHERE created_at > một ngày (chỉ lọc theo cột đứng sau)',
        'WHERE status = pending',
        'WHERE status = pending AND created_at > một ngày',
        'WHERE status = shipped',
      ],
      answer: 0,
      explain: 'Composite index (A, B) chỉ hỗ trợ query bắt đầu bằng cột leading A. Query chỉ lọc theo B (created_at) mà bỏ qua status nên không dùng được index.',
    },
    {
      q: 'Cột nào có selectivity cao nhất, khiến index hiệu quả nhất?',
      options: [
        'Cột gender chỉ có nam hoặc nữ',
        'Cột status chỉ có 4 giá trị',
        'Cột email gần như unique cho mỗi user',
        'Cột boolean is_active',
      ],
      answer: 2,
      explain: 'Selectivity = số giá trị unique / tổng rows. Email gần như unique nên selectivity gần 1.0, index rất hiệu quả. Các cột ít giá trị (gender, status, boolean) có selectivity thấp.',
    },
    {
      q: 'Kỹ thuật nào giúp database không cần quay lại đọc table gốc, tạo ra Index Only Scan?',
      options: [
        'Query Planner',
        'Covering Index',
        'Execution Plan',
        'EXPLAIN ANALYZE',
      ],
      answer: 1,
      explain: 'Covering Index chứa đủ mọi cột mà query cần (cả WHERE lẫn SELECT), nên database đọc thẳng từ index mà không cần truy cập table gốc, tạo ra Index Only Scan.',
    },
  ],
  exercises: [
    {
      id: 'index-map-lookup',
      title: 'Sửa tra cứu O(n) thành index-map O(1)',
      task: 'Hàm findById đang full scan toàn bộ mảng (O(n)) để tìm bản ghi theo id, nên biến đếm số dòng phải quét lên rất cao. Hãy dùng Map index đã build sẵn để tra cứu O(1). Output kỳ vọng: Rows checked = 1.',
      buggyCode: `// BUG: đã có index Map nhưng findById vẫn full scan O(n)
var users = [];
for (var i = 1; i <= 1000; i++) users.push({ id: i, email: 'user' + i + '@ex.com' });

// index: id -> user (đã build sẵn, tra cứu O(1))
var index = new Map();
for (var i = 0; i < users.length; i++) index.set(users[i].id, users[i]);

var checked = 0;
function findById(id) {
  // BUG: quét tuyến tính thay vì dùng index.get(id)
  for (var i = 0; i < users.length; i++) {
    checked++;
    if (users[i].id === id) return users[i];
  }
  return null;
}

var u = findById(1000);
console.log('Found: ' + u.email);
console.log('Rows checked: ' + checked);`,
      expectedOutput: 'Found: user1000@ex.com\nRows checked: 1',
      hint: 'Đã có sẵn Map index. Thay vòng for tuyến tính bằng một lần index.get(id); biến checked chỉ tăng 1 lần.',
      solution: `var users = [];
for (var i = 1; i <= 1000; i++) users.push({ id: i, email: 'user' + i + '@ex.com' });

var index = new Map();
for (var i = 0; i < users.length; i++) index.set(users[i].id, users[i]);

var checked = 0;
function findById(id) {
  checked++;                 // O(1): chỉ 1 lần tra cứu
  return index.get(id) || null;
}

var u = findById(1000);
console.log('Found: ' + u.email);
console.log('Rows checked: ' + checked);`,
    },
  ],
}
