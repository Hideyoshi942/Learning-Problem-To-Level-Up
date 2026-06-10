const makeTopic = (slug, order, title, emoji, desc, project, concepts) => ({
  slug, order, title, emoji, description: desc, project,
  problems: [{ icon: '🚧', title: 'Coming Soon', desc: 'Nội dung đang được chuẩn bị.' }],
  concepts,
  demos: [{ id: 'cs', label: '🚧 Coming Soon', language: 'javascript', code: `console.log('${title}');` }],
  interactive: null,
  callouts: [{ type: 'info', icon: '🚧', title: 'Đang phát triển', body: `Demos cho "${title}" đang được chuẩn bị!` }],
})

export default makeTopic(
  'sharding', 17, 'Sharding', '🔪',
  'Phân chia data ngang (horizontal) để scale vượt giới hạn 1 server.',
  'Hệ thống 100 triệu users.',
  [
    {
      name: 'Range Sharding',
      icon: '📏',
      explain: 'Range Sharding: chia data theo range của shard key. Shard 1: id 1–1M, Shard 2: id 1M–2M… Đơn giản, hỗ trợ range queries tốt. Nhưng dễ bị hotspot: nếu data mới nhất luôn vào shard cuối → shard đó overloaded (hot shard problem).',
      tip: 'Range Sharding tốt cho: time-series data (theo date range), geographic data (theo region). Tránh dùng auto-increment ID làm shard key vì sinh hotspot.',
      example: '// Range Sharding by user_id:\nfunction getShard(userId) {\n  if (userId < 1_000_000) return "shard-1";\n  if (userId < 2_000_000) return "shard-2";\n  if (userId < 3_000_000) return "shard-3";\n  return "shard-4";\n}\n\n// Range query (efficient):\n// "Get all users id 500K–800K" → chỉ query shard-1\n\n// ⚠️ Hotspot problem với date-based sharding:\n// Shard Jan: 0 writes (old month)\n// Shard Feb: 0 writes (old month)\n// Shard Mar: ALL writes (current month) 🔥',
    },
    {
      name: 'Hash Sharding',
      icon: '#️⃣',
      explain: 'Hash Sharding: shard_number = hash(shard_key) % num_shards. Phân phối data đều hơn Range Sharding, tránh hotspot. Nhưng không hỗ trợ range queries (data của cùng range nằm rải rác các shards). Thêm/bớt shard → cần rehash và migrate nhiều data.',
      tip: 'Hash Sharding tốt cho write-heavy workloads cần phân phối đều. Dùng Consistent Hashing để giảm data migration khi reshard.',
      example: '// Hash Sharding:\nconst NUM_SHARDS = 4;\n\nfunction getShard(userId) {\n  // Simple hash: % num_shards\n  return `shard-${userId % NUM_SHARDS}`;\n  // user 1 → shard-1, user 2 → shard-2\n  // user 5 → shard-1, user 6 → shard-2 ...\n}\n\n// ✅ Even distribution:\n// Shard-0: users 0,4,8,12...\n// Shard-1: users 1,5,9,13...\n// Shard-2: users 2,6,10,14...\n// Shard-3: users 3,7,11,15...\n\n// ❌ Range query khó:\n// "Get users id 1000–2000" → phải query ALL 4 shards',
    },
    {
      name: 'Directory Sharding',
      icon: '📂',
      explain: 'Directory Sharding (Lookup Table): dùng một lookup table để map shard key → shard location. Flexible nhất – có thể assign bất kỳ entity nào đến bất kỳ shard nào, dễ rebalance. Nhưng lookup table là single point of failure và thêm một hop cho mỗi query.',
      tip: 'Cache lookup table để tránh round-trip đến directory service mỗi request. Directory service cần highly available (replicated). Pinterest dùng approach này.',
      example: '// Directory Service:\nconst shardDirectory = {\n  "user:1234": "shard-us-east-1",\n  "user:5678": "shard-us-west-2",\n  "user:9012": "shard-eu-central-1",\n  // ...\n};\n\nasync function getShardForUser(userId) {\n  // 1. Check local cache:\n  const cached = localCache.get(`shard:user:${userId}`);\n  if (cached) return cached;\n\n  // 2. Query directory service:\n  const shard = await directoryService.lookup(`user:${userId}`);\n  localCache.set(`shard:user:${userId}`, shard, { ttl: 3600 });\n  return shard;\n}',
    },
    {
      name: 'Hotspot',
      icon: '🔥',
      explain: 'Hotspot là khi một shard nhận quá nhiều traffic hơn các shards khác, trở thành bottleneck. Nguyên nhân: shard key không uniform (celebrity problem – một user nổi tiếng có nhiều followers), time-based sharding, sequential IDs. Hotspot làm mất đi lợi ích của sharding.',
      tip: 'Phát hiện hotspot: monitor CPU/IO của từng shard. Fix: chia hotspot shard thành nhiều shards, thêm sub-key vào shard key (user_id + random suffix), cache heavily truy cập.',
      example: '// Celebrity Problem:\n// Post của Taylor Swift có 100M followers\n// → Shard chứa Taylor\'s data nhận 100M fan-out writes!\n\n// Solutions:\n// 1. Sub-key sharding:\nfunction getShard(userId, subKey = 0) {\n  // Chia "hot" users thành nhiều virtual shards\n  const hotUsers = new Set([taylorSwiftId, elonMuskId]);\n  const multiplier = hotUsers.has(userId) ? 10 : 1;\n  return `shard-${(hash(userId) + subKey) % (NUM_SHARDS * multiplier)}`;\n}\n\n// 2. Celebrity handling: lưu riêng data hot users\n// 3. Fan-out on Read thay vì Write cho hot accounts',
    },
    {
      name: 'Cross-shard Query',
      icon: '🌐',
      explain: 'Cross-shard Query là query cần data từ nhiều shards. Ví dụ: "Top 10 users by score" khi users nằm ở nhiều shards. Rất tốn kém – phải query tất cả shards song song rồi merge kết quả. Giải pháp: denormalize data, dùng global secondary index, hoặc Elasticsearch cho cross-shard queries.',
      tip: 'Thiết kế shard key để minimize cross-shard queries. Chọn entity quan trọng nhất (user_id cho social network, tenant_id cho SaaS) làm shard key. Related data cùng shard key → cùng shard.',
      example: '// Cross-shard query: Top 10 users globally:\nasync function getGlobalTop10() {\n  // Query TẤT CẢ shards song song:\n  const results = await Promise.all(\n    SHARDS.map(shard =>\n      shard.query("SELECT id, score FROM users ORDER BY score DESC LIMIT 10")\n    )\n  );\n\n  // Merge và sort:\n  return results\n    .flat()\n    .sort((a, b) => b.score - a.score)\n    .slice(0, 10); // Final top 10\n}\n// Nếu 100 shards → 100 queries/request 💀\n// Fix: maintain global leaderboard trong Redis Sorted Set',
    },
  ]
)
