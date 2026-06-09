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
  concepts: ['Offset Pagination', 'Keyset Pagination', 'Cursor Pagination', 'Seek Method', 'Stable Sort', 'Base64 Cursor'],
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
