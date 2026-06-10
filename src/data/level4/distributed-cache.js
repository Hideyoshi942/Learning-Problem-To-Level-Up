const makeTopic = (slug, order, title, emoji, desc, project, concepts) => ({
  slug, order, title, emoji, description: desc, project,
  problems: [{ icon: '🚧', title: 'Coming Soon', desc: 'Nội dung đang được chuẩn bị.' }],
  concepts,
  demos: [{ id: 'cs', label: '🚧 Coming Soon', language: 'javascript', code: `console.log('${title}');` }],
  interactive: null,
  callouts: [{ type: 'info', icon: '🚧', title: 'Đang phát triển', body: `Demos cho "${title}" đang được chuẩn bị!` }],
})

export default makeTopic(
  'distributed-cache', 20, 'Distributed Cache', '🗄️',
  'Redis Cluster và Cache Consistency cho hệ thống cache phân tán.',
  'Product Catalog.',
  [
    {
      name: 'Redis Cluster',
      icon: '🔴',
      explain: 'Redis Cluster là Redis distributed mode, tự động chia data thành 16,384 hash slots trên nhiều nodes. Mỗi node phụ trách một range slots. Client-side routing: client tính slot = CRC16(key) % 16384, connect trực tiếp đến node phụ trách slot đó. Hỗ trợ horizontal scaling và HA.',
      tip: 'Redis Cluster cần ít nhất 3 master nodes. Mỗi master nên có 1 replica (6 nodes total minimum). Multi-key operations chỉ work khi tất cả keys trong cùng slot (dùng hash tags: {user}.field).',
      example: '// Redis Cluster: 16384 slots, 3 masters\n// Master 1: slots 0-5460\n// Master 2: slots 5461-10922\n// Master 3: slots 10923-16383\n\n// Key routing:\nCRC16("user:123") % 16384 = 7638 → Master 2\nCRC16("product:456") % 16384 = 3210 → Master 1\n\n// Hash tags: force same slot\nCRC16("{user:123}.name") % 16384 → same as\nCRC16("{user:123}.email") % 16384\n// → cùng node → multi-key operations work!\n\n// Scale out: add node → resharding (slots migrate)\nredis-cli --cluster add-node new-node:6379 existing:6379',
    },
    {
      name: 'Cache Consistency',
      icon: '🔄',
      explain: 'Cache Consistency đảm bảo cache và DB luôn sync. Strategies: (1) Cache Aside + TTL, (2) Write-Through (ghi cả cache lẫn DB), (3) Invalidation on Write (xóa cache khi DB update). Race condition: update DB rồi delete cache, nhưng old value được re-cached trước khi delete → stale data.',
      tip: '"Cache Aside + invalidate on write" là pattern phổ biến nhất. Dùng versioning hoặc event-driven invalidation cho critical data. TTL là last resort safety net.',
      example: '// Double-delete pattern để tránh race condition:\nasync function updateProduct(id, data) {\n  // 1. Delete cache BEFORE update:\n  await redis.del(`product:${id}`);\n\n  // 2. Update DB:\n  await db.update("products", data, { id });\n\n  // 3. Delete cache AFTER (double delete):\n  // Handles race: nếu ai đó đọc giữa 1 và 2\n  await sleep(100);\n  await redis.del(`product:${id}`);\n}\n\n// Hoặc dùng version:\nawait redis.set(`product:${id}`, { ...data, version: newVersion });',
    },
    {
      name: 'Hot Key',
      icon: '🔥',
      explain: 'Hot Key: một key được truy cập cực nhiều (celebrity post, trending product), một Redis node phải xử lý toàn bộ traffic đó → CPU bottleneck. Redis single-threaded nên 1 hot key có thể block node. Khác với Hotspot trong DB sharding nhưng vấn đề tương tự.',
      tip: 'Phát hiện hot keys: redis-cli --hotkeys hoặc monitor với CLIENT INFO. Fix: local cache (in-process), read replicas, key splitting (thêm suffix random).',
      example: '// Hot Key Detection:\n$ redis-cli --hotkeys\n# hot key found with counter: 10523941\n# keyname: product:iphone15\n\n// Fix 1: Local in-process cache:\nconst localCache = new LRUCache({ max: 1000, ttl: 30_000 });\nasync function getProduct(id) {\n  if (localCache.has(`product:${id}`)) return localCache.get(`product:${id}`);\n  const data = await redis.get(`product:${id}`);\n  localCache.set(`product:${id}`, data);\n  return data;\n}\n\n// Fix 2: Key splitting:\nconst suffix = Math.floor(Math.random() * 10); // 0-9\nconst data = await redis.get(`product:iphone15:${suffix}`);\n// → Traffic spread đều 10 keys',
    },
    {
      name: 'Slot',
      icon: '🎰',
      explain: 'Redis Cluster dùng 16,384 hash slots để phân chia data. Mỗi key được assign vào 1 slot: slot = CRC16(keyname) % 16384. Mỗi node phụ trách một range of slots. Resharding = migrate slots (và data trong chúng) giữa các nodes. Slots cho phép rebalance mà không cần rehash keys.',
      tip: 'Cluster resharding online không block traffic (live migration). Nhưng migrate nhiều slots/data cùng lúc có thể tăng latency. Plan reshard vào giờ thấp traffic.',
      example: '// Hash Slot calculation:\nfunction getSlot(key) {\n  // Nếu có hash tag {}, chỉ hash phần trong {}\n  const match = key.match(/{(.+)}/);\n  const hashKey = match ? match[1] : key;\n  return crc16(hashKey) % 16384;\n}\n\ngetSlot("user:123")       // = 7638, Master 2\ngetSlot("{user:123}.name") // = 7638, Master 2 (same!)\ngetSlot("{user:123}.age")  // = 7638, Master 2 (same!)\n\n// MGET works when all keys in same slot:\nawait redis.mget("{user:123}.name", "{user:123}.age"); // ✅',
    },
    {
      name: 'Gossip Protocol',
      icon: '🗣️',
      explain: 'Gossip Protocol (Epidemic Protocol) là cách nodes trong cluster trao đổi thông tin về cluster state (ai còn sống, ai phụ trách slot nào). Mỗi node định kỳ ping vài nodes khác và trao đổi cluster info. Thông tin lan ra toàn cluster như virus. Decentralized, fault-tolerant, eventual consistency.',
      tip: 'Redis Cluster dùng gossip để maintain cluster topology. Mỗi 100ms, node ping một vài nodes khác. Nếu node không respond trong 15s (cluster-node-timeout) → suspicious, sau thêm thời gian → fail.',
      example: '// Gossip trong Redis Cluster:\n// Mỗi 100ms, Node A chọn ngẫu nhiên vài nodes:\nNodeA.gossip([\n  { to: NodeB, send: clusterState },\n  { to: NodeC, send: clusterState },\n]);\n// NodeB, C update knowledge và gossip tiếp\n// → Sau vài rounds, tất cả nodes biết cluster state\n\n// CLUSTER INFO:\ncluster_state: ok\ncluster_slots_assigned: 16384\ncluster_known_nodes: 6\ncluster_size: 3\n\n// CLUSTER NODES: xem routing table\n127.0.0.1:7001 master - slots:0-5460\n127.0.0.1:7002 master - slots:5461-10922',
    },
  ]
)
