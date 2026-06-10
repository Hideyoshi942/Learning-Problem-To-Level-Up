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
  concepts: [
    {
      name: 'JOIN',
      icon: '🔗',
      explain: 'SQL JOIN kết hợp nhiều bảng thành một query duy nhất thay vì nhiều queries riêng lẻ. Là cách fix N+1 đơn giản nhất và hiệu quả nhất. Database optimizer có thể chọn join algorithm tốt nhất (Hash Join, Nested Loop, Merge Join).',
      tip: 'JOIN không phải lúc nào cũng tốt hơn – với large datasets và 1-to-many relationship, JOIN có thể sinh ra nhiều duplicate rows. Cân nhắc Batch Loading trong trường hợp đó.',
      example: '-- ❌ N+1: 1 query posts + N queries users\nconst posts = await Post.findAll();\nfor (const post of posts) {\n  post.author = await User.findById(post.userId); // N queries!\n}\n\n-- ✅ JOIN: 1 query duy nhất\nSELECT posts.*, users.name, users.avatar\nFROM posts\nJOIN users ON posts.user_id = users.id;',
    },
    {
      name: 'Eager Loading',
      icon: '⚡',
      explain: 'Eager Loading load các relationship ngay khi query object chính, thay vì chờ access (lazy loading). ORM cung cấp syntax để declare: JPA @ManyToOne(fetch=EAGER), Sequelize include:[], Django select_related(), Rails includes().',
      tip: 'Cẩn thận với "Eager Loading Trap": eager load quá nhiều relations không cần thiết sẽ tốn bandwidth và memory. Chỉ eager load những gì sẽ dùng.',
      example: '// Sequelize Eager Loading:\nconst posts = await Post.findAll({\n  include: [{\n    model: User,\n    attributes: ["name", "avatar"]\n  }]\n});\n// → 1 query với JOIN\n\n// Django:\nPost.objects.select_related("author")  # 1 query JOIN\nPost.objects.prefetch_related("tags")  # 2 queries + Python join',
    },
    {
      name: 'Fetch Join',
      icon: '🎯',
      explain: 'Fetch Join là cú pháp trong JPQL (JPA/Hibernate) để eager load relationship: "JOIN FETCH post.author". Sinh ra SQL JOIN thay vì N queries riêng lẻ. Cần phân biệt với regular JOIN (không load entity vào memory).',
      tip: 'Tránh Fetch Join với Collection (OneToMany, ManyToMany) khi dùng pagination – sẽ gây MultipleBagFetchException hoặc pagination sai. Dùng @EntityGraph hoặc BatchSize thay thế.',
      example: '// JPQL Fetch Join:\n@Query("SELECT p FROM Post p JOIN FETCH p.author"\n       + " WHERE p.published = true")\nList<Post> findPublishedWithAuthor();\n\n// → Generates:\n// SELECT p.*, u.* FROM posts p\n// JOIN users u ON p.user_id = u.id\n// WHERE p.published = true',
    },
    {
      name: 'Entity Graph',
      icon: '🗂️',
      explain: 'Entity Graph (JPA 2.1+) cho phép định nghĩa graph của entities cần load một cách linh hoạt, không cần sửa query. Có thể định nghĩa qua annotation (@NamedEntityGraph) hoặc dynamic (EntityGraph API). Giải pháp tốt hơn @ManyToOne(fetch=EAGER).',
      tip: 'Entity Graph cho phép load khác nhau cho từng use case: ví dụ ListPage load lightweight, DetailPage load đầy đủ relations. Tránh global EAGER fetch.',
      example: '@NamedEntityGraph(\n  name = "post.withAuthorAndTags",\n  attributeNodes = {\n    @NamedAttributeNode("author"),\n    @NamedAttributeNode("tags")\n  }\n)\n@Entity\npublic class Post { ... }\n\n// Use:\nEntityGraph graph = em.getEntityGraph("post.withAuthorAndTags");\nMap hints = Map.of("jakarta.persistence.loadgraph", graph);\nem.find(Post.class, id, hints);',
    },
    {
      name: 'DataLoader',
      icon: '📦',
      explain: 'DataLoader là pattern/library (phổ biến trong GraphQL) giải quyết N+1 bằng cách batch các loads riêng lẻ thành một request duy nhất. Tất cả các load được trigger trong cùng một tick sẽ được gom lại và gọi batch function một lần.',
      tip: 'DataLoader không chỉ dùng cho GraphQL – có thể dùng bất cứ đâu có N+1. Facebook tạo ra nó cho Relay GraphQL.',
      example: '// GraphQL DataLoader pattern:\nconst userLoader = new DataLoader(async (userIds) => {\n  // Chỉ gọi 1 lần với tất cả userIds!\n  const users = await User.findAll({ where: { id: userIds } });\n  return userIds.map(id => users.find(u => u.id === id));\n});\n\n// Resolver:\nPost.author = (post) => userLoader.load(post.userId);\n// 100 posts → 100 calls → batched thành 1 DB query!',
    },
    {
      name: 'Batch Loading',
      icon: '🎁',
      explain: 'Batch Loading: thay vì load từng item một, collect tất cả IDs cần load, sau đó query WHERE id IN (...) một lần. Giảm N+1 queries xuống còn 2 queries (query chính + query batch). Hibernate @BatchSize implement pattern này.',
      tip: 'IN clause hiệu quả với < 1000 IDs. Với số lượng lớn hơn, chia thành chunks. PostgreSQL và MySQL đều optimize IN clause tốt khi dùng với index.',
      example: '// Batch Loading pattern:\nconst posts = await getAllPosts(); // Query 1\n\n// Collect unique author IDs\nconst authorIds = [...new Set(posts.map(p => p.authorId))];\n\n// Batch load - 1 query thay vì N queries!\nconst authors = await User.findAll({\n  where: { id: { [Op.in]: authorIds } }\n}); // Query 2\n\nconst authorMap = new Map(authors.map(a => [a.id, a]));\nposts.forEach(p => p.author = authorMap.get(p.authorId));',
    },
    {
      name: 'select_related',
      icon: '🐍',
      explain: 'select_related() là Django ORM method thực hiện SQL JOIN để load ForeignKey và OneToOne relationships trong 1 query. prefetch_related() dùng cho ManyToMany và reverse ForeignKey với 2 queries riêng biệt rồi join ở Python.',
      tip: 'Dùng select_related cho ForeignKey (JOIN). Dùng prefetch_related cho ManyToMany và reverse FK. Kết hợp cả hai khi cần.',
      example: '# ❌ N+1\nposts = Post.objects.all()\nfor post in posts:\n    print(post.author.name)  # N queries!\n\n# ✅ select_related (JOIN)\nposts = Post.objects.select_related("author").all()\n# 1 query với JOIN\n\n# ✅ prefetch_related (M2M)\nposts = Post.objects.prefetch_related("tags").all()\n# 2 queries + Python join',
    },
  ],
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
