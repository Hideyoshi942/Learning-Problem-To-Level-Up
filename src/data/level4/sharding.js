export default {
  slug: 'sharding',
  order: 17,
  title: 'Sharding',
  emoji: '🔪',
  description: 'Phân chia data ngang (horizontal) để scale vượt giới hạn 1 server.',
  project: 'Hệ thống 100 triệu users.',
  problems: [
    { icon: '🧩', title: 'Giao dịch liên shard (Cross-shard Transactions)', desc: 'Khi cần cập nhật dữ liệu ở 2 bảng nằm ở 2 shard khác nhau, việc đảm bảo tính ACID cực kỳ khó khăn và tốn kém hiệu năng.' },
    { icon: '🐌', title: 'Truy vấn chéo (Cross-shard Queries)', desc: 'Các câu lệnh tìm kiếm không chứa Shard Key bắt buộc phải quét qua tất cả các Shard song song rồi gộp kết quả, gây nghẽn băng thông hệ thống.' },
    { icon: '🔄', title: 'Độ phức tạp khi Resharding', desc: 'Khi các shard hiện tại bị đầy, việc tăng số lượng shard yêu cầu phải chia lại dải hash và dịch chuyển terabytes dữ liệu trực tiếp mà không gây downtime.' }
  ],
  concepts: [
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
  ],
  demos: [
    {
      id: 'hash-sharding',
      label: '#️⃣ Hash Sharding Router',
      language: 'javascript',
      code: `// Giả lập cơ chế định tuyến Hash-based Sharding và vấn đề Cross-shard Query
class HashShardedCluster {
  constructor(numShards = 3) {
    this.numShards = numShards;
    // Khởi tạo các shard vật lý độc lập
    this.shards = Array.from({ length: numShards }, (_, i) => ({
      name: \`Shard-\${i}\`,
      users: new Map()
    }));
  }

  // Thuật toán băm xác định vị trí shard từ Shard Key (userId)
  getShardIndex(userId) {
    let hash = 0;
    const str = String(userId);
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % this.numShards;
  }

  // Thêm User: Chỉ ghi vào Shard chỉ định (Single shard write - Cực nhanh)
  insertUser(user) {
    const shardIdx = this.getShardIndex(user.id);
    const target = this.shards[shardIdx];
    target.users.set(user.id, user);
    console.log(\`✅ [Write] Đã thêm \${user.name} (ID: \${user.id}) vào \${target.name}\`);
  }

  // Tìm kiếm theo Shard Key (Single shard read - Cực nhanh)
  findUserById(userId) {
    const shardIdx = this.getShardIndex(userId);
    const target = this.shards[shardIdx];
    const user = target.users.get(userId);
    console.log(\`🎯 [Read-Key] Tìm ID \${userId} ở duy nhất \${target.name} -> \`, user ? 'Tìm thấy' : 'Không thấy');
    return user;
  }

  // Tìm kiếm KHÔNG theo Shard Key (Cross-shard query - Tốn kém)
  findUsersByName(name) {
    console.log(\`⚠️ [Read-Cross-Shard] Tìm theo tên "\${name}" không có shard key. Quét toàn bộ shards!\`);
    const results = [];
    this.shards.forEach(shard => {
      console.log(\`   🔍 Quét dữ liệu trên \${shard.name}...\`);
      for (const user of shard.users.values()) {
        if (user.name.includes(name)) {
          results.push({ shard: shard.name, user });
        }
      }
    });
    return results;
  }
}

const cluster = new HashShardedCluster(3);
cluster.insertUser({ id: 'user_101', name: 'Alice Smith' });
cluster.insertUser({ id: 'user_102', name: 'Bob Johnson' });
cluster.insertUser({ id: 'user_103', name: 'Charlie Smith' });

console.log('\\n=== Đọc có Shard Key ===');
cluster.findUserById('user_101');

console.log('\\n=== Đọc không có Shard Key ===');
const searchResults = cluster.findUsersByName('Smith');
console.log('Kết quả tìm kiếm:', searchResults);`
    },
    {
      id: 'directory-sharding',
      label: '📂 Directory Sharding',
      language: 'javascript',
      code: `// Giả lập Directory-based Sharding với Lookup Table và Caching
class DirectoryService {
  constructor() {
    // Lookup table: Map trực tiếp key -> target shard
    this.lookupTable = new Map();
  }

  register(key, shardName) {
    this.lookupTable.set(key, shardName);
  }

  getShard(key) {
    // Giả lập thời gian tìm kiếm ở Directory Server (Network hop)
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(this.lookupTable.get(key));
      }, 50); // delay 50ms
    });
  }
}

class ClientWithCache {
  constructor(directoryService) {
    this.directory = directoryService;
    this.localCache = new Map();
  }

  async fetchShardLocation(key) {
    // 1. Kiểm tra cache cục bộ
    if (this.localCache.has(key)) {
      const cachedShard = this.localCache.get(key);
      console.log(\`⚡ [Cache Hit] Key "\${key}" nằm ở \${cachedShard} (0ms)\`);
      return cachedShard;
    }

    // 2. Query Directory Service nếu cache miss
    console.log(\`📡 [Cache Miss] Đang gửi query lên Directory Service cho key "\${key}"...\`);
    const shard = await this.directory.getShard(key);
    
    if (shard) {
      this.localCache.set(key, shard);
    }
    return shard;
  }
}

// Chạy thử demo
const dir = new DirectoryService();
dir.register('item:apple', 'shard-us-east');
dir.register('item:banana', 'shard-eu-west');

const client = new ClientWithCache(dir);

(async () => {
  console.log('=== Lần truy cập đầu tiên (Cache Miss) ===');
  await client.fetchShardLocation('item:apple');
  
  console.log('\\n=== Lần truy cập thứ hai (Cache Hit) ===');
  await client.fetchShardLocation('item:apple');
})();`
    }
  ],
  interactive: null,
  callouts: [
    { type: 'warning', icon: '⚠️', title: 'Chọn Shard Key cực kỳ quan trọng', body: 'Nếu chọn một Shard Key không đồng đều (non-uniform), bạn sẽ gặp vấn đề "Hotspot Shard" khiến tải không được chia đều, thậm chí làm hệ thống chậm hơn.' },
    { type: 'success', icon: '🏢', title: 'Tận dụng Tenant ID trong mô hình SaaS', body: 'Trong các dự án SaaS (Multi-tenant), việc sử dụng Tenant ID làm Shard Key là mô hình hoàn hảo giúp gom toàn bộ dữ liệu của khách hàng vào cùng 1 shard vật lý.' },
    { type: 'info', icon: '🛑', title: 'Không nên sharding quá sớm', body: 'Sharding làm tăng độ phức tạp hệ thống lên gấp nhiều lần. Hãy cố gắng tối ưu hóa bằng indexes, read-replicas, caching, partitioning trước khi quyết định sharding.' },
    { type: 'tip', icon: '🔍', title: 'Tách biệt nhu cầu tìm kiếm chéo shard', body: 'Khi cần thực hiện các tìm kiếm phức tạp (cross-shard query), đừng dùng DB SQL thuần. Hãy đồng bộ dữ liệu sang Elasticsearch để thực hiện tìm kiếm full-text và lọc đa tiêu chí.' }
  ]
}
