export default {
  slug: 'pagination',
  order: 3,
  title: 'Pagination',
  emoji: '📄',
  description: 'Phân trang dữ liệu ẩn chứa nhiều vấn đề hiệu năng. OFFSET-based pagination càng về sau càng chậm. Keyset/Cursor pagination là giải pháp cho hệ thống lớn.',
  project: 'Feed mạng xã hội.',
  problems: [
    { icon: '🐢', title: 'OFFSET chậm khi trang lớn', desc: 'OFFSET 1,000,000 buộc DB scan qua 1M rows rồi bỏ đi, chỉ lấy 10. Cực kỳ tốn kém!' },
    { icon: '👻', title: 'Dữ liệu thay đổi khi phân trang', desc: 'User xem trang 2 nhưng có item mới insert vào trang 1, gây trùng lặp hoặc bỏ sót data.' },
  ],
  concepts: [
    {
      name: 'Offset Pagination',
      icon: '📄',
      explain: 'Cách phân trang truyền thống: LIMIT n OFFSET m. Dễ implement, hỗ trợ nhảy đến bất kỳ trang nào. Nhưng DB phải scan và bỏ qua m rows đầu tiên → càng trang sau càng chậm, không dùng được index hiệu quả.',
      tip: 'Không dùng OFFSET > 10,000 trong production. Có thể dùng deferred join trick để tối ưu phần nào nhưng vẫn có giới hạn.',
      example: '-- Page 1:    LIMIT 10 OFFSET 0      → scan 10 rows ✅\n-- Page 100:  LIMIT 10 OFFSET 990     → scan 1,000 rows ⚠️\n-- Page 1000: LIMIT 10 OFFSET 9,990   → scan 10,000 rows ❌\n-- Page 10000: LIMIT 10 OFFSET 99,990 → scan 100,000 rows 💀\n\n-- Deferred join (tối ưu nhưng vẫn có giới hạn):\nSELECT * FROM posts\nJOIN (SELECT id FROM posts LIMIT 10 OFFSET 99990) ids\n  USING (id);',
    },
    {
      name: 'Keyset Pagination',
      icon: '🔑',
      explain: 'Thay vì OFFSET, dùng WHERE id > last_seen_id để bắt đầu từ điểm đã biết. DB chỉ scan đúng pageSize rows bất kể page nào. Phù hợp với REST API pagination có cursor. Không thể nhảy đến page tuỳ ý.',
      tip: 'Cần index trên cột dùng làm keyset (thường là id hoặc created_at). Với sort phức tạp, cần composite keyset.',
      example: '-- ✅ Page 1: (no cursor)\nSELECT * FROM posts\nORDER BY id DESC LIMIT 10;\n\n-- ✅ Page 2: (last_id = 991)\nSELECT * FROM posts\nWHERE id < 991\nORDER BY id DESC LIMIT 10;\n\n-- Luôn scan đúng 10 rows → O(log n) với index!',
    },
    {
      name: 'Cursor Pagination',
      icon: '📱',
      explain: 'Cursor Pagination là Keyset Pagination nhưng encode cursor thành opaque token (thường Base64 JSON). Client không biết cursor chứa gì, chỉ gửi lại cho request tiếp theo. Best practice cho Social Feed, Infinite Scroll.',
      tip: 'Cursor phải chứa đủ thông tin để tái tạo WHERE clause. Khi data thay đổi (insert/delete), cursor vẫn hoạt động đúng.',
      example: '// Encode cursor:\nconst cursor = btoa(JSON.stringify({ id: 991, ts: 1704067200 }))\n// → "eyJpZCI6OTkxLCJ0cyI6MTcwNDA2NzIwMH0="\n\n// Response:\n{\n  data: [...],\n  nextCursor: "eyJpZCI6OTkxLCJ0cyI6MTcwNDA2NzIwMH0=",\n  hasNextPage: true\n}\n\n// Client gửi lại: GET /posts?cursor=eyJ...',
    },
    {
      name: 'Seek Method',
      icon: '🔎',
      explain: 'Seek Method là tên khác của Keyset Pagination. "Seek" nghĩa là database "tìm đến vị trí" dựa trên giá trị key thay vì skip. Hiệu quả vì sử dụng được index B-Tree. Đặc biệt tốt với PostgreSQL và MySQL InnoDB.',
      tip: 'Với multi-column sort (e.g., ORDER BY score DESC, id ASC), WHERE clause cần row value comparison: WHERE (score, id) < (last_score, last_id).',
      example: '-- Multi-column seek:\nSELECT * FROM posts\nWHERE (score, id) < (85, 1234)  -- row comparison!\nORDER BY score DESC, id DESC\nLIMIT 10;\n\n-- Index: CREATE INDEX ON posts(score DESC, id DESC)\n-- → Efficient seek, không full scan',
    },
    {
      name: 'Stable Sort',
      icon: '⚖️',
      explain: 'Stable Sort đảm bảo thứ tự nhất quán giữa các page. Nếu sort chỉ theo một cột không unique (e.g., score), các row cùng score có thể bị xáo trộn → data bị lặp hoặc bỏ sót. Luôn thêm tiebreaker column (id) vào ORDER BY.',
      tip: 'Best practice: ORDER BY primary_column DESC, id DESC. Id là tiebreaker đảm bảo ordering stable và unique.',
      example: '-- ❌ Unstable: cùng score = undefined order\nORDER BY score DESC\n\n-- ✅ Stable: thêm id làm tiebreaker\nORDER BY score DESC, id DESC\n\n-- Keyset với stable sort:\nWHERE (score < :last_score)\n   OR (score = :last_score AND id < :last_id)',
    },
    {
      name: 'Base64 Cursor',
      icon: '🔐',
      explain: 'Encode cursor thành Base64 string để che giấu implementation details khỏi client. Client chỉ thấy opaque string, không biết cursor chứa id hay timestamp. Cho phép thay đổi cursor format mà không breaking API.',
      tip: 'Base64 không phải encryption – đừng put sensitive data vào cursor. Dùng HMAC signature nếu cần verify cursor không bị tamper.',
      example: '// Cursor chứa: { id: 991, createdAt: "2024-01-01" }\nconst raw = JSON.stringify({ id: 991, createdAt: "2024-01-01" })\nconst cursor = btoa(raw)\n// → "eyJpZCI6OTkxLCJjcmVhdGVkQXQiOiIyMDI0LTAxLTAxIn0="\n\n// Decode:\nconst data = JSON.parse(atob(cursor))\n// → { id: 991, createdAt: "2024-01-01" }',
    },
  ],
  demos: [
    {
      id: 'offset-problem',
      label: '❌ Offset – Vấn đề',
      language: 'javascript',
      code: `// OFFSET PAGINATION – cách truyền thống
// SQL: SELECT * FROM posts ORDER BY id LIMIT 10 OFFSET :offset

function offsetPaginate(data, page, size) {
  const offset = (page - 1) * size;
  // ❌ DB phải đọc QUA offset rows rồi bỏ đi
  return { items: data.slice(offset, offset + size), rowsScanned: offset + size };
}

// Cost tăng tuyến tính theo số trang
const size = 10;
const pages = [1, 100, 1000, 10000, 100000];

console.log('=== Offset Pagination Cost (1M rows, pageSize=10) ===\\n');
console.log('Page      | OFFSET    | Rows Scanned | Cost');
console.log('-'.repeat(50));
for (const p of pages) {
  const offset = (p - 1) * size;
  const scanned = offset + size;
  console.log(
    \`Page \${String(p).padEnd(6)} | \${String(offset).padEnd(9)} | \${String(scanned).padEnd(12)} | \${(scanned/size).toFixed(0)}x\`
  );
}
console.log('\\n❌ Page 100,000 → scan gần TOÀN BỘ bảng!');
console.log('❌ Không thể dùng index hiệu quả với OFFSET lớn');`,
    },
    {
      id: 'keyset',
      label: '✅ Keyset – Giải pháp',
      language: 'javascript',
      code: `// KEYSET PAGINATION (Seek Method)
// SQL: SELECT * FROM posts WHERE id > :last_id ORDER BY id LIMIT 10
// ✅ Luôn chỉ scan đúng pageSize rows, bất kể page nào!

function keysetPaginate(data, lastId, size) {
  const start = lastId === null ? 0 : data.findIndex(d => d.id === lastId) + 1;
  const items = data.slice(start, start + size);
  return {
    items,
    nextCursor: items.at(-1)?.id ?? null,
    hasMore: start + size < data.length,
    rowsScanned: size,  // ✅ Constant!
  };
}

// So sánh
function offsetCost(page, size) { return (page - 1) * size + size; }
const keysetCost = (size) => size; // luôn cố định

const size = 10;
console.log('=== Offset vs Keyset – Cost Comparison ===\\n');
console.log('Page     | Offset Cost  | Keyset Cost | Savings');
console.log('-'.repeat(52));
for (const p of [1, 100, 1000, 10000, 100000]) {
  const oc = offsetCost(p, size);
  const kc = keysetCost(size);
  console.log(
    \`Page \${String(p).padEnd(6)} | \${String(oc).padEnd(12)} | \${String(kc).padEnd(11)} | \${(oc/kc).toFixed(0)}x faster\`
  );
}

// Demo thực tế
const posts = Array.from({ length: 30 }, (_, i) => ({ id: i+1, title: \`Post #\${i+1}\` }));
console.log('\\n=== Paginate through posts ===');
let cursor = null;
for (let i = 0; i < 3; i++) {
  const p = keysetPaginate(posts, cursor, 5);
  console.log(\`Page \${i+1}: [\${p.items.map(x=>x.id).join(', ')}] nextCursor=\${p.nextCursor}\`);
  cursor = p.nextCursor;
}`,
    },
    {
      id: 'cursor',
      label: '🔄 Cursor – Social Feed',
      language: 'javascript',
      code: `// CURSOR PAGINATION – dùng cho Social Media Infinite Scroll
// Cursor = base64(JSON({id, timestamp})) – opaque, an toàn

class CursorPaginator {
  static encode(data) { return btoa(JSON.stringify(data)); }
  static decode(cur) {
    try { return JSON.parse(atob(cur)); } catch { return null; }
  }

  static paginate(items, cursor, limit = 5) {
    let startIdx = 0;
    if (cursor) {
      const d = this.decode(cursor);
      if (d) {
        const idx = items.findIndex(i => i.id === d.id);
        startIdx = idx >= 0 ? idx + 1 : 0;
      }
    }
    const slice = items.slice(startIdx, startIdx + limit);
    return {
      data: slice,
      nextCursor: slice.length === limit
        ? this.encode({ id: slice.at(-1).id })
        : null,
      hasPrev: startIdx > 0,
      hasNext: startIdx + limit < items.length,
    };
  }
}

// Feed giả lập (newest first)
const feed = Array.from({ length: 25 }, (_, i) => ({
  id: 25 - i,
  text: \`Post content #\${25 - i}\`,
  ts: Date.now() - i * 60000,
}));

console.log('=== Cursor Pagination – Infinite Scroll ===\\n');
let nextCursor = null;
for (let page = 1; page <= 4; page++) {
  const r = CursorPaginator.paginate(feed, nextCursor, 5);
  console.log(\`Page \${page}: ids=[\${r.data.map(d=>d.id).join(',')}]\`);
  if (page === 2 && r.nextCursor) {
    const dec = CursorPaginator.decode(r.nextCursor);
    console.log(\`  cursor decoded: {id:\${dec?.id}}\`);
  }
  nextCursor = r.nextCursor;
  if (!r.hasNext) { console.log('  → End of feed'); break; }
}`,
    },
  ],
  interactive: {
    title: '📊 So sánh cost Offset vs Keyset theo page number',
    inputLabel: 'Số trang muốn đến',
    inputPlaceholder: '1000',
    inputType: 'number',
    run(value) {
      const page = Math.max(parseInt(value) || 1, 1)
      const size = 10
      const oc = (page - 1) * size + size
      const kc = size
      return [
        `📄 Đến Page ${page.toLocaleString()} (pageSize=${size}):`,
        ``,
        `❌ OFFSET Pagination:`,
        `   SQL: LIMIT ${size} OFFSET ${((page-1)*size).toLocaleString()}`,
        `   Rows scanned: ${oc.toLocaleString()} (bỏ ${((page-1)*size).toLocaleString()} rows đầu)`,
        ``,
        `✅ Keyset Pagination:`,
        `   SQL: WHERE id > :last_id LIMIT ${size}`,
        `   Rows scanned: ${kc} (luôn cố định!)`,
        ``,
        `⚡ Keyset nhanh hơn: ${Math.round(oc/kc).toLocaleString()}x ít rows hơn!`,
        page > 1000 ? `\n🚨 Page ${page.toLocaleString()} với OFFSET là thảm họa!` : '',
      ].join('\n')
    },
  },
  callouts: [
    { type: 'danger', icon: '🐢', title: 'Tránh OFFSET lớn!', body: 'OFFSET 1,000,000 = DB phải scan qua 1M rows rồi bỏ đi. Production systems không dùng OFFSET-based pagination.' },
    { type: 'success', icon: '🚀', title: 'Keyset Pagination', body: 'O(log n) với index. Phù hợp API REST pagination. Nhược điểm: không nhảy đến page tuỳ ý.' },
    { type: 'info', icon: '📱', title: 'Cursor Pagination', body: 'Best practice cho Infinite Scroll, Social Feed. Dùng khi data thay đổi liên tục (insert/delete).' },
  ],
}
