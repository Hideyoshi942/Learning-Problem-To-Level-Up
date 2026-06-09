// Level 2 stubs – sẽ thêm nội dung đầy đủ sau
const stub = (slug, order, title, emoji, description, project, problems, concepts) => ({
  slug, order, title, emoji, description, project, problems, concepts,
  demos: [{
    id: 'coming-soon',
    label: '🚧 Coming Soon',
    language: 'javascript',
    code: `// Nội dung đang được chuẩn bị...\nconsole.log('${title} – demos coming soon!');`,
  }],
  interactive: null,
  callouts: [
    { type: 'info', icon: '🚧', title: 'Đang phát triển', body: `Nội dung chi tiết cho "${title}" đang được chuẩn bị. Stay tuned!` },
  ],
})

export default stub(
  'caching', 6, 'Caching', '⚡',
  'Caching là kỹ thuật lưu data vào bộ nhớ nhanh để giảm load cho database. Hiểu Cache Aside, Read/Write Through, Write Back giúp tăng throughput hàng chục lần.',
  'API đọc dữ liệu sản phẩm.',
  [
    { icon: '🐢', title: 'DB quá tải', desc: 'Mọi request đều hit DB dù data hiếm khi thay đổi.' },
    { icon: '💸', title: 'Cache stampede', desc: 'Cache expire → hàng nghìn request cùng hit DB một lúc.' },
    { icon: '🔄', title: 'Cache invalidation', desc: 'Data update trong DB nhưng cache vẫn trả về data cũ.' },
  ],
  ['Cache Aside', 'Read Through', 'Write Through', 'Write Back', 'TTL', 'LRU Eviction', 'Cache Stampede', 'Redis'],
)
