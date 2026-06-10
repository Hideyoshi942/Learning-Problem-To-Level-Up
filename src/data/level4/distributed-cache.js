export default {
  slug: 'distributed-cache',
  order: 20,
  title: 'Distributed Cache',
  emoji: '🗄️',
  description: 'Redis Cluster và Cache Consistency cho hệ thống cache phân tán.',
  project: 'Product Catalog.',
  problems: [
    { icon: '🌪️', title: 'Cache Stampede (Thundering Herd)', desc: 'Khi một key hot hết hạn TTL, hàng vạn request đồng thời chọc thẳng xuống DB để lấy dữ liệu mới, gây sập cơ sở dữ liệu.' },
    { icon: '🕳️', title: 'Cache Penetration (Thủng cache)', desc: 'Client liên tục truy vấn các key không tồn tại trong hệ thống. Vì không có trong cache, tất cả query đều đi xuống DB, làm cạn kiệt tài nguyên.' },
    { icon: '🔥', title: 'Nghẽn mạng do Hot Key', desc: 'Một vài key nhận lượng truy cập khổng lồ (ví dụ sản phẩm hot sale), khiến băng thông và CPU của node chứa key đó bị quá tải hoàn toàn.' }
  ],
  concepts: [
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
  ],
  demos: [
    {
      id: 'cluster-routing',
      label: '🔴 Redis Cluster Slot Routing',
      language: 'javascript',
      code: `// Giả lập cơ chế tính Slot và định tuyến Client-side của Redis Cluster
class RedisClusterClient {
  constructor() {
    // Định nghĩa 3 node tương ứng với 3 dải slot
    this.nodes = [
      { name: 'Node-7001', minSlot: 0, maxSlot: 5460, data: new Map() },
      { name: 'Node-7002', minSlot: 5461, maxSlot: 10922, data: new Map() },
      { name: 'Node-7003', minSlot: 10923, maxSlot: 16383, data: new Map() }
    ];
  }

  // Thuật toán băm CRC16 đơn giản
  calculateSlot(key) {
    // Nếu key có cấu trúc hash tag {abc}, chỉ băm phần bên trong
    const match = key.match(/\\{(.+?)\\}/);
    const targetKey = match ? match[1] : key;

    let hash = 0;
    for (let i = 0; i < targetKey.length; i++) {
      hash = (hash * 33) ^ targetKey.charCodeAt(i);
    }
    return Math.abs(hash) % 16384;
  }

  set(key, value) {
    const slot = this.calculateSlot(key);
    const targetNode = this.nodes.find(n => slot >= n.minSlot && slot <= n.maxSlot);
    targetNode.data.set(key, value);
    console.log(\`🎯 Key "\${key}" (Slot: \${slot}) -> Định tuyến tới \${targetNode.name}\`);
  }
}

const client = new RedisClusterClient();
console.log('=== Ghi dữ liệu thông thường ===');
client.set('user:alice', 'data_1');
client.set('product:102', 'data_2');

console.log('\\n=== Ép buộc ghi chung Slot bằng Hash Tag ===');
client.set('{user:alice}.profile', 'profile_details');
client.set('{user:alice}.settings', 'settings_details');
// Cả 3 key của user:alice đều rơi vào cùng 1 slot và 1 node!`
    },
    {
      id: 'double-delete',
      label: '🔄 Cache Double-Delete Pattern',
      language: 'javascript',
      code: `// Giả lập Race Condition khi xóa cache và giải pháp Double-Delete
class DatabaseAndCache {
  constructor() {
    this.db = { profile: 'Old Value' };
    this.cache = new Map();
    this.cache.set('profile', 'Old Value');
  }

  async read() {
    if (this.cache.has('profile')) {
      return { source: 'Cache', value: this.cache.get('profile') };
    }
    // Cache miss -> đọc DB và nạp cache
    const val = this.db.profile;
    // Giả lập mạng chậm khi nạp cache
    await new Promise(r => setTimeout(r, 50));
    this.cache.set('profile', val);
    return { source: 'Database', value: val };
  }

  async badUpdate(newValue) {
    console.log('\\n📝 [Update-Thường] Cập nhật profile và xóa cache...');
    this.db.profile = newValue;
    this.cache.delete('profile'); // Xóa cache lần 1
  }

  async smartUpdate(newValue) {
    console.log('\\n🛡️ [Update-Double-Delete] Bắt đầu sửa đổi an toàn...');
    
    // Bước 1: Xóa cache trước
    this.cache.delete('profile');
    
    // Bước 2: Sửa DB
    this.db.profile = newValue;
    
    // Bước 3: Đợi một chút rồi xóa tiếp lần 2
    setTimeout(() => {
      this.cache.delete('profile');
      console.log('🧹 [Double-Delete] Đã thực hiện xóa cache lần 2 để dọn dẹp các ghi đè lỗi!');
    }, 150);
  }
}

(async () => {
  const system = new DatabaseAndCache();

  // GIẢ LẬP LỖI RACE CONDITION
  await system.badUpdate('New Value');
  
  // Có một Client khác đọc ngay lúc này (đang nạp giá trị cũ do trễ mạng)
  system.read(); 

  setTimeout(async () => {
    const res = await system.read();
    console.log(\`❌ Lỗi: Dữ liệu bị lệch! DB là 'New Value' nhưng Cache lại là: '\${res.value}'\`);
    
    // GIẢI PHÁP AN TOÀN
    await system.smartUpdate('Consistent Value');
    
    // Client đọc xen ngang
    system.read(); 

    setTimeout(async () => {
      const res2 = await system.read();
      console.log(\`✅ Thành công: Cache nhất quán sau double delete. Cache value: '\${res2.value}'\`);
    }, 200);
  }, 100);
})();`
    }
  ],
  interactive: null,
  callouts: [
    { type: 'warning', icon: '⚠️', title: 'Phòng tránh Tuyết Lở Cache (Cache Avalanche)', body: 'Nếu hàng loạt key hết hạn cùng một thời điểm, toàn bộ tải sẽ đổ xuống DB cùng lúc. Hãy thêm một khoảng thời gian ngẫu nhiên (random jitter, e.g. 1-5 phút) vào TTL của từng key để rải đều thời gian hết hạn.' },
    { type: 'success', icon: '⚡', title: 'Multi-key với Hash Tags', body: 'Hãy tận dụng Hash Tags dạng {key_chinh}:sub_key trong Redis Cluster để gom các dữ liệu liên quan về cùng một shard, cho phép sử dụng các giao dịch MULTI/EXEC hiệu quả.' },
    { type: 'info', icon: '⏱️', title: 'Cache Aside là Eventual Consistency', body: 'Với Cache Aside, bạn chấp nhận việc dữ liệu có thể không đồng bộ tuyệt đối trong tích tắc. Đây là sự đánh đổi (Trade-off) để đạt hiệu năng chịu tải tối đa.' },
    { type: 'tip', icon: '🛡️', title: 'Sử dụng Bloom Filter giải quyết thủng cache', body: 'Để chống lại các đợt tấn công Cache Penetration, hãy đặt một Bloom Filter trước cache để lọc nhanh và từ chối các key chắc chắn không tồn tại.' }
  ]
}
