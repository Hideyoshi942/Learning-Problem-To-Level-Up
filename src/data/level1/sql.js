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
  concepts: ['B-Tree Index', 'Composite Index', 'Covering Index', 'Execution Plan', 'EXPLAIN ANALYZE', 'Index Selectivity', 'Query Planner'],
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
}
