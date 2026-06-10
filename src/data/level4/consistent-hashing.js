export default {
  slug: 'consistent-hashing',
  order: 18,
  title: 'Consistent Hashing',
  emoji: '⭕',
  description: 'Hash ring giúp distribute data đều và minimize rebalancing khi thêm/xoá node.',
  project: 'Distributed Cache.',
  problems: [
    { icon: '⚖️', title: 'Phân phối tải không đều (Hotspots)', desc: 'Nếu số lượng node ít và không sử dụng Virtual Nodes, các node có thể nhận lượng dữ liệu chênh lệch nhau rất nhiều trên vòng tròn Hash.' },
    { icon: '🚚', title: 'Dịch chuyển dữ liệu (Data Migration)', desc: 'Mặc dù Consistent Hashing giảm thiểu số key phải di chuyển, việc thêm/bớt node vẫn kích hoạt quá trình chuyển giao terabytes dữ liệu giữa các node kế cận.' },
    { icon: '💥', title: 'Cascading Failure khi sập node', desc: 'Khi một node đột ngột sập, toàn bộ tải của nó sẽ chuyển sang node kế tiếp trên vòng tròn, có thể gây ra hiện tượng quá tải dây chuyền.' }
  ],
  concepts: [
    {
      name: 'Hash Ring',
      icon: '⭕',
      explain: 'Consistent Hashing dùng một vòng tròn (ring) từ 0 đến 2^32-1. Mỗi node được hash và đặt trên ring. Mỗi key được hash → tìm node đầu tiên theo chiều kim đồng hồ (successor node). Khi thêm/xóa node, chỉ một phần nhỏ keys cần remapped (không phải toàn bộ như simple modulo).',
      tip: 'Simple modulo hash: thêm 1 node → rehash N/(N+1) keys = ~100% keys! Consistent hashing: chỉ K/N keys cần remapped. Dùng trong: Cassandra, DynamoDB, Redis Cluster, CDN.',
      example: '// Hash Ring:\n// Ring: 0 ──── Node A (hash=100) ──── Node B (hash=200)\n//        ──── Node C (hash=300) ──── 2^32\n\n// Key X (hash=150) → successor = Node B\n// Key Y (hash=250) → successor = Node C\n// Key Z (hash=350) → wrap around → Node A\n\n// Add Node D (hash=175):\n// Key X (hash=150) stays → B (not between 100-175)\n// Only keys in range (150-175] → move from B to D\n// ✅ Only ~1/N keys affected!',
    },
    {
      name: 'Virtual Node',
      icon: '👥',
      explain: 'Virtual Node (vNode) giải quyết vấn đề non-uniform distribution trong Consistent Hashing. Mỗi physical node được map thành nhiều virtual nodes trên ring (ví dụ 150 vnodes/node). Tăng đều distribution, cho phép nodes có capacity khác nhau (node mạnh → nhiều vnodes hơn).',
      tip: 'Cassandra dùng 256 vnodes/node mặc định. Nhiều vnodes hơn = distribution đều hơn nhưng tăng overhead khi node join/leave. Tune vnode count dựa trên cluster size.',
      example: '// Without vnodes: non-uniform\n// Ring: A(10%)──B(40%)──C(50%) → B,C overloaded!\n\n// With vnodes (3 vnodes each):\n// A: positions [100, 350, 700]\n// B: positions [200, 450, 800]\n// C: positions [300, 600, 900]\n// → Mỗi node xử lý ~1/3 data ✅\n\n// Node với hardware mạnh hơn → more vnodes:\n// Node A (8 cores): 150 vnodes\n// Node B (4 cores): 75 vnodes\n// → A xử lý 2x data của B (proportional)',
    },
    {
      name: 'Replica Factor',
      icon: '📑',
      explain: 'Replica Factor: số copies của mỗi data item. RF=3 → data được lưu trên 3 nodes. Tăng availability (một node down vẫn đọc được từ 2 nodes còn lại). Kết hợp với Consistent Hashing: key → primary node + (RF-1) successor nodes trên ring đều nhận copy.',
      tip: 'RF=3 là tiêu chuẩn production. Kết hợp với Quorum: W+R > RF. Ví dụ RF=3: W=2 (write đến 2 nodes), R=2 (read từ 2 nodes) → luôn có ít nhất 1 node có data mới nhất.',
      example: '// Cassandra với RF=3:\n// Key K → node A (primary), B (replica 1), C (replica 2)\n\n// Quorum write (W=2):\n// Write to A, B → success (2/3 ✅)\n// C sẽ sync dần (hinted handoff nếu đang down)\n\n// Quorum read (R=2):\n// Read from A, B → compare timestamps → latest wins\n// W=2, R=2, RF=3: 2+2 > 3 → strong consistency ✅\n\n// Eventual consistency (W=1, R=1):\n// Faster but may read stale data',
    },
    {
      name: 'Node Failure',
      icon: '💥',
      explain: 'Khi một node fail trong Consistent Hashing, các keys của nó sẽ được served bởi successor node (nếu có replicas). Hinted Handoff: nodes khác tạm thời lưu data thay cho node fail, rồi forward khi node recover. Anti-entropy (Merkle Tree) sync data differences sau khi recover.',
      tip: 'Cassandra Hinted Handoff: hints được lưu tối đa 3 giờ. Nếu node down lâu hơn → cần repair (nodetool repair) để sync full data.',
      example: '// Node failure handling:\n// Ring: A──B──C──D, RF=2\n// A goes down!\n\n// Reads: keys of A → served by B (replica) ✅\n// Writes: "hinted handoff"\n//   B writes data cho A với hint "forward to A"\n//   Khi A recover → B forwards pending writes\n\n// Anti-entropy repair:\n// Periodically sync data giữa replicas:\nnodetool repair --full user_keyspace\n// → Merkle tree comparison → only transfer diff\n// → Ensures all replicas eventually consistent',
    },
    {
      name: 'Load Balancing',
      icon: '⚖️',
      explain: 'Consistent Hashing cũng dùng trong load balancing cho stateless services (API servers, cache servers). Sticky routing: cùng client/session luôn đến cùng server (vì hash(client_ip) stable). Tốt cho cache hit rate. Khi server down → chỉ clients của server đó bị re-routed.',
      tip: 'Nginx Consistent Hash module: proxy_cache_path + hash $request_uri consistent. Haproxy: balance uri. Envoy: ring_hash load balancer policy.',
      example: '// Nginx consistent hashing:\nupstream backend {\n  hash $request_uri consistent;  # Hash by URI\n  server backend-1:8080;\n  server backend-2:8080;\n  server backend-3:8080;\n}\n\n// Kết quả:\n// /api/product/123 → luôn → backend-2 (cache warm!)\n// /api/product/456 → luôn → backend-1\n// Nếu backend-2 down → /api/product/123 → backend-3\n// Chỉ ~33% requests bị re-routed (không phải 100%)\n// → Cache hit rate cao hơn simple round-robin',
    },
  ],
  demos: [
    {
      id: 'consistent-hash-ring',
      label: '⭕ Hash Ring với vNodes',
      language: 'javascript',
      code: `// Giả lập vòng tròn Hash Ring với Virtual Nodes
class ConsistentHashRing {
  constructor(vNodesPerNode = 3) {
    this.vNodesPerNode = vNodesPerNode;
    this.ring = []; // Danh sách vNodes đã sort [{ hash, physicalNode }]
    this.nodes = new Set();
  }

  // Thuật toán băm đơn giản (Fowler-Noll-Vo hoặc tương đương)
  hash(str) {
    let hash = 8191;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return Math.abs(hash) % 1000000; // Giới hạn dải hash để dễ debug
  }

  addNode(nodeName) {
    this.nodes.add(nodeName);
    for (let i = 0; i < this.vNodesPerNode; i++) {
      const vNodeKey = \`\${nodeName}-vnode-\${i}\`;
      const hashVal = this.hash(vNodeKey);
      this.ring.push({ hash: hashVal, physicalNode: nodeName });
      console.log(\`➕ Đặt vNode [\${vNodeKey}] tại tọa độ: \${hashVal}\`);
    }
    // Sắp xếp lại ring theo tọa độ tăng dần
    this.ring.sort((a, b) => a.hash - b.hash);
  }

  getNode(key) {
    if (this.ring.length === 0) return null;
    const keyHash = this.hash(key);
    
    // Tìm node đầu tiên có hash >= keyHash (successor)
    for (const node of this.ring) {
      if (node.hash >= keyHash) {
        return { node: node.physicalNode, keyHash, nodeHash: node.hash };
      }
    }
    
    // Nếu đi hết vòng tròn, wrap-around về node đầu tiên
    return { node: this.ring[0].physicalNode, keyHash, nodeHash: this.ring[0].hash };
  }
}

const ring = new ConsistentHashRing(3);
ring.addNode('Server-A');
ring.addNode('Server-B');

console.log('\\n=== Đọc/Ghi dữ liệu và Routing ===');
const keys = ['user:alice', 'user:bob', 'user:charlie', 'user:david'];
keys.forEach(k => {
  const res = ring.getNode(k);
  console.log(\`🔑 Key: "\${k}" (hash: \${res.keyHash}) -> Gặp node đầu tiên \${res.node} (hash: \${res.nodeHash})\`);
});`
    },
    {
      id: 'rebalancing-simulation',
      label: '🔄 Rebalancing Simulator',
      language: 'javascript',
      code: `// So sánh số key cần chuyển dịch giữa Modulo Hashing vs Consistent Hashing
const numKeys = 1000;

// Giả lập Modulo Hashing
function moduloHashDistribution(nodesCount) {
  const dist = [];
  for (let i = 0; i < numKeys; i++) {
    dist.push(i % nodesCount);
  }
  return dist;
}

// 1. Chạy Modulo Hashing với 3 nodes sau đó lên 4 nodes
const dist3 = moduloHashDistribution(3);
const dist4 = moduloHashDistribution(4);

let migratedModulo = 0;
for (let i = 0; i < numKeys; i++) {
  if (dist3[i] !== dist4[i]) migratedModulo++;
}

console.log('=== Modulo Hashing Rebalancing ===');
console.log(\`Số node tăng: 3 -> 4\`);
console.log(\`Tổng số key: \${numKeys}\`);
console.log(\`Số key bị đổi vị trí: \${migratedModulo} (\${(migratedModulo/numKeys * 100).toFixed(1)}%)\`);
console.log('❌ Hầu như toàn bộ cache bị mất sạch!');

// 2. Consistent Hashing giả lập rebalancing
// (Chỉ ~1/N tổng số key cần di chuyển sang node mới)
console.log('\\n=== Consistent Hashing Rebalancing ===');
const theoreticalMigration = 1 / 4; // Node mới chiếm 25% vòng tròn
console.log(\`Số key cần di chuyển lý thuyết: ~\${(theoreticalMigration * 100).toFixed(0)}% (chỉ di chuyển các key nằm trong dải hash của node mới)\`);
console.log('✅ Hiệu năng cache được duy trì ổn định!');`
    }
  ],
  interactive: null,
  callouts: [
    { type: 'warning', icon: '⚠️', title: 'Modulo Hash gây rụng cache hàng loạt', body: 'Tuyệt đối không dùng công thức key % N trong các hệ thống phân tán có tính co giãn (Auto-scaling). Việc thêm hoặc bớt 1 server sẽ khiến 80-100% cache bị sai vị trí và gây quá tải DB.' },
    { type: 'success', icon: '👑', title: 'Sự lựa chọn của các Big Tech', body: 'Cassandra, DynamoDB, Memcached Client, và các CDN lớn đều sử dụng Consistent Hashing làm xương sống để quản lý lưu trữ phân tán.' },
    { type: 'info', icon: '👥', title: 'Vai trò cốt lõi của Virtual Nodes', body: 'Virtual Nodes (vNodes) giúp chia nhỏ lát cắt trên vòng tròn Hash. Số lượng vNode càng nhiều thì phân phối dữ liệu giữa các server vật lý càng cân bằng.' },
    { type: 'tip', icon: '⚡', title: 'Tối ưu hóa Stateless Load Balancing', body: 'Sử dụng Consistent Hashing ở tầng Proxy (Nginx, Envoy) giúp định tuyến client IP cố định đến cùng một API server, giữ ấm local session cache hiệu quả.' }
  ]
}
