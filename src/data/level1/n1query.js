export default {
  slug: 'n1query',
  order: 5,
  title: 'N+1 Query Problem',
  emoji: '⚠️',
  description: 'N+1 Query là "silent killer" trong ORM. Một tính năng đơn giản sinh ra hàng trăm query không cần thiết, giết chết performance khi scale.',
  project: 'Blog và hệ thống comment.',
  problems: [
    { icon: '💥', title: 'ORM sinh quá nhiều query', desc: 'Load 100 posts → ORM chạy thêm 100 query lấy author từng post. Tổng: 101 queries cho dữ liệu lẽ ra cần 1 query!' },
  ],
  concepts: ['JOIN', 'Eager Loading', 'Fetch Join', 'Entity Graph', 'DataLoader', 'Batch Loading', 'select_related'],
  demos: [
    {
      id: 'problem',
      label: '❌ N+1 Problem',
      language: 'javascript',
      code: `// N+1 QUERY – xảy ra khi ORM lazy load relationship

const DB = {
  users: [
    { id: 1, name: 'Alice', avatar: '👩' },
    { id: 2, name: 'Bob',   avatar: '👨' },
    { id: 3, name: 'Charlie', avatar: '🧑' },
  ],
  posts: Array.from({ length: 9 }, (_, i) => ({
    id: i + 1, title: \`Post \${i+1}\`, userId: (i%3)+1,
  })),
};
let queryCount = 0;

function queryUser(userId) {
  queryCount++;
  return DB.users.find(u => u.id === userId);
}
function queryAllPosts() {
  queryCount++;
  return DB.posts;
}

// ❌ BAD: N+1 Pattern
function getBlogN1() {
  queryCount = 0;
  const posts = queryAllPosts();       // Query 1
  return posts.map(post => ({
    ...post,
    author: queryUser(post.userId),    // N queries!
  }));
}

const result = getBlogN1();
console.log(\`=== N+1 Problem Demo ===\\n\`);
console.log(\`Posts loaded: \${result.length}\`);
console.log(\`💥 TOTAL QUERIES: \${queryCount} (1 + \${result.length} = N+1)\`);
console.log(\`\\n❌ With 1,000 posts → 1,001 queries!\`);
console.log(\`❌ With 10,000 posts → 10,001 queries!\`);
console.log(\`\\nSample:\`);
result.slice(0, 3).forEach(r =>
  console.log(\`  "\${r.title}" by \${r.author.avatar} \${r.author.name}\`)
);`,
    },
    {
      id: 'solution-join',
      label: '✅ Solution: JOIN & Batch',
      language: 'javascript',
      code: `const DB = {
  users: [
    { id: 1, name: 'Alice', avatar: '👩' },
    { id: 2, name: 'Bob',   avatar: '👨' },
    { id: 3, name: 'Charlie', avatar: '🧑' },
  ],
  posts: Array.from({ length: 9 }, (_, i) => ({
    id: i+1, title: \`Post \${i+1}\`, userId: (i%3)+1,
  })),
};
let qc = 0;
const q = (sql) => { qc++; return sql; };

// ✅ SOLUTION 1: JOIN – 1 query duy nhất
function getBlogJoin() {
  qc = 0;
  q('SELECT posts.*, users.name, users.avatar FROM posts JOIN users ON posts.userId = users.id');
  const result = DB.posts.map(p => ({
    ...p, ...DB.users.find(u => u.id === p.userId),
  }));
  console.log(\`✅ JOIN: \${qc} query cho \${result.length} posts\`);
  result.slice(0,3).forEach(r => console.log(\`   "\${r.title}" by \${r.avatar} \${r.name}\`));
  return result;
}

// ✅ SOLUTION 2: Batch Loading (DataLoader pattern)
function getBlogBatch() {
  qc = 0;
  const posts = DB.posts; qc++;  // Query 1: all posts
  const ids = [...new Set(posts.map(p => p.userId))];
  const users = DB.users.filter(u => ids.includes(u.id)); qc++; // Query 2: batch
  const userMap = new Map(users.map(u => [u.id, u]));
  const result = posts.map(p => ({ ...p, author: userMap.get(p.userId) }));
  console.log(\`\\n✅ Batch: \${qc} queries cho \${result.length} posts (always 2, not N+1!)\`);
  return result;
}

console.log('=== Solutions: N+1 Fix ===\\n');
getBlogJoin();
getBlogBatch();

console.log('\\n💡 ORM equivalents:');
console.log('  JPA:       @ManyToOne + JOIN FETCH / EntityGraph');
console.log('  Sequelize: Post.findAll({ include: [User] })');
console.log('  Django:    Post.objects.select_related("author")');
console.log('  Rails:     Post.includes(:author)');
console.log('  GraphQL:   DataLoader for batching');`,
    },
    {
      id: 'detection',
      label: '🔎 Detection',
      language: 'javascript',
      code: `// Phát hiện N+1 trong code thực tế

class QueryLogger {
  constructor(threshold = 5) {
    this.queries = [];
    this.threshold = threshold;
  }

  log(sql) {
    this.queries.push({ sql, time: Date.now() });
    this._detect();
  }

  _detect() {
    const recent = this.queries.slice(-20);
    const templates = recent.map(q => q.sql.replace(/\\d+/g, '?'));
    const freq = {};
    for (const t of templates) freq[t] = (freq[t]||0) + 1;
    for (const [t, count] of Object.entries(freq)) {
      if (count >= this.threshold) {
        console.warn(\`⚠️  N+1 DETECTED!\`);
        console.warn(\`   Pattern: "\${t}"\`);
        console.warn(\`   Fired \${count}x → use JOIN or batch loading!\`);
      }
    }
  }

  summary() {
    const total = this.queries.length;
    const uniq = new Set(this.queries.map(q => q.sql.replace(/\\d+/g, '?'))).size;
    console.log(\`\\n📊 Query Summary: \${total} total, \${uniq} unique patterns\`);
    if (total/uniq > 3)
      console.log(\`   🚨 Ratio \${(total/uniq).toFixed(1)}x – likely N+1!\`);
    else
      console.log(\`   ✅ Ratio OK\`);
  }
}

// Simulate N+1
const logger = new QueryLogger(5);
console.log('=== Query Logger – Detecting N+1 ===\\n');

logger.log('SELECT * FROM posts');
for (let uid of [1,2,3,1,2,3,1,2]) {
  logger.log(\`SELECT * FROM users WHERE id = \${uid}\`);
}
logger.summary();

console.log('\\n💡 Real tools:');
console.log('  Java/Hibernate: @EnableStatistics + SessionFactory.stats');
console.log('  Django:         django-debug-toolbar');
console.log('  Rails:          bullet gem');
console.log('  Node:           Prisma query events');`,
    },
  ],
  interactive: {
    title: '💥 Simulate: N+1 vs JOIN cost',
    inputLabel: 'Số posts cần load',
    inputPlaceholder: '100',
    inputType: 'number',
    run(value) {
      const n = Math.min(Math.max(parseInt(value) || 10, 1), 10000)
      const uniqueAuthors = Math.min(n, 50)
      return [
        `📦 Load ${n.toLocaleString()} posts + author info:`,
        ``,
        `❌ N+1 Query:`,
        `   Query 1: SELECT * FROM posts → ${n} rows`,
        `   Queries 2..${n+1}: SELECT user FOR EACH post`,
        `   TOTAL: ${(n+1).toLocaleString()} queries 💥`,
        `   Est. time: ~${(n * 2 + 10).toLocaleString()}ms`,
        ``,
        `✅ JOIN (1 query):`,
        `   TOTAL: 1 query`,
        `   Est. time: ~15ms`,
        ``,
        `✅ Batch Loading (2 queries):`,
        `   Query 1: posts | Query 2: users IN (${uniqueAuthors} IDs)`,
        `   TOTAL: 2 queries`,
        `   Est. time: ~20ms`,
        ``,
        `⚡ JOIN saves ${n} queries = ${Math.round((n*2)/15)}x faster!`,
      ].join('\n')
    },
  },
  callouts: [
    { type: 'danger', icon: '💥', title: 'Khi nào bị N+1?', body: 'ORM lazy loading mặc định, lặp qua collection rồi access relationship, nested GraphQL resolvers không có DataLoader.' },
    { type: 'success', icon: '✅', title: 'Fix N+1', body: 'JOIN (SQL), Eager Loading (JPA fetch join), DataLoader (GraphQL), select_related/prefetch_related (Django).' },
    { type: 'info', icon: '🔍', title: 'Phát hiện N+1', body: 'Đếm số query/request trong dev environment. Mọi số query thay đổi tuyến tính theo n rows đều là dấu hiệu N+1.' },
  ],
}
