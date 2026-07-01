export default {
  slug: 'db-replication',
  order: 16,
  title: 'Database Replication',
  emoji: '📋',
  description: 'Master-Replica replication để scale reads và high availability.',
  project: 'Social Network.',
  problems: [
    { icon: '🛑', title: 'Single Point of Failure (SPOF)', desc: 'Nếu chỉ có một database duy nhất, khi database crash, toàn bộ hệ thống sẽ ngừng hoạt động và có nguy cơ mất mát dữ liệu.' },
    { icon: '⏱️', title: 'Replication Lag (Trễ đồng bộ)', desc: 'Sau khi ghi vào Master, dữ liệu mất một khoảng thời gian để đồng bộ sang Replica. Đọc từ Replica ngay lập tức có thể nhận dữ liệu cũ.' },
    { icon: '🧠', title: 'Split-Brain (Hai Master song song)', desc: 'Khi network partition xảy ra, một Replica tự bầu lên làm Master mới trong khi Master cũ vẫn chạy, dẫn đến việc ghi đè chéo và xung đột dữ liệu.' }
  ],
  concepts: [
    {
      name: 'Master Replica',
      icon: '👑',
      explain: 'Master-Replica (Primary-Secondary) replication: Master nhận tất cả writes, Replicas copy data từ Master và phục vụ reads. Tăng read throughput bằng cách add thêm Replicas. Master là single point of failure cho writes → cần Failover plan.',
      tip: 'Typical ratio: 1 Master + 2-3 Replicas. Replicas ở cùng region cho low latency, khác region cho disaster recovery. Multi-master phức tạp hơn nhưng cho phép write ở nhiều nơi.',
      example: '// Config read/write splitting:\nconst masterDb = new Pool({ host: "master.db.internal" });\nconst replicaDb = new Pool({ host: "replica.db.internal" });\n\n// Writes → Master:\nasync function createUser(userData) {\n  return masterDb.query("INSERT INTO users ...", userData);\n}\n\n// Reads → Replica:\nasync function getUserById(id) {\n  return replicaDb.query("SELECT * FROM users WHERE id=$1", [id]);\n}\n\n// Nhưng đọc sau write phải đọc từ Master:\nasync function getUserAfterCreate(id) {\n  return masterDb.query("SELECT * FROM users WHERE id=$1", [id]);\n}',
    },
    {
      name: 'Read/Write Split',
      icon: '✂️',
      explain: 'Read/Write Split (hay Read/Write Splitting): route write queries đến Master, read queries đến Replicas. Tăng throughput đáng kể vì reads thường chiếm 80-95% traffic. Cần application-level hoặc proxy-level (ProxySQL, PgBouncer) để route tự động.',
      tip: '"Read-your-writes" consistency vấn đề: user vừa write rồi read ngay có thể không thấy data mình vừa write (Replica chưa sync). Fix: đọc từ Master trong cùng session, hoặc add delay.',
      example: '// ProxySQL read/write split config:\n// WRITE: route to group 1 (Master)\n// READ: route to group 2 (Replicas)\n\n// Hoặc application-level:\nfunction getDbConnection(queryType) {\n  if (queryType === "write") return masterPool;\n  return replicaPool; // Round-robin giữa replicas\n}\n\n// "Read your writes" fix:\nasync function updateProfile(userId, data) {\n  await masterDb.query("UPDATE users SET ... WHERE id=?", [userId]);\n  // Đọc lại từ MASTER để đảm bảo thấy data mới nhất:\n  return masterDb.query("SELECT * FROM users WHERE id=?", [userId]);\n}',
    },
    {
      name: 'Replication Lag',
      icon: '⏱️',
      explain: 'Replication Lag là độ trễ giữa lúc Master commit và Replica apply change đó. Thường vài milliseconds trong cùng datacenter, có thể hàng giây hoặc hơn khi network chậm hoặc Replica bị overloaded. Nguyên nhân: network latency, large transactions, replica CPU/IO đang bận.',
      tip: 'Monitor replication lag với Seconds_Behind_Master (MySQL) hoặc pg_stat_replication (PostgreSQL). Alert khi lag > 10s. Replica lag cao → đọc stale data → bugs khó tìm.',
      example: '-- MySQL: kiểm tra replication lag:\nSHOW SLAVE STATUS\\G\n-- Seconds_Behind_Master: 0  → OK\n-- Seconds_Behind_Master: 120 → Lag 2 phút! ⚠️\n\n-- PostgreSQL:\nSELECT\n  client_addr,\n  state,\n  sent_lsn,\n  write_lsn,\n  pg_wal_lsn_diff(sent_lsn, write_lsn) AS lag_bytes\nFROM pg_stat_replication;\n\n-- Monitoring query:\nSELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) AS lag_seconds;',
    },
    {
      name: 'Failover',
      icon: '🔄',
      explain: 'Failover là quá trình promote Replica thành Master mới khi Master fail. Manual failover: DBA thực hiện thủ công (downtime dài). Automatic failover: MHA (MySQL), Patroni (PostgreSQL), AWS RDS Multi-AZ. Cần đảm bảo không có data loss và không có split-brain.',
      tip: 'Dùng floating IP hoặc DNS update để applications không cần biết địa chỉ Master mới. Patroni + HAProxy là combo phổ biến cho PostgreSQL HA.',
      example: '# Patroni (PostgreSQL auto-failover):\n# Cluster: 1 Leader + 2 Replicas\n# Patroni dùng etcd/Consul để leader election\n\n# Khi Master fail:\n# 1. Patroni detect master down (timeout ~30s)\n# 2. Remaining nodes vote (Raft-like)\n# 3. Replica có lag nhỏ nhất được promote\n# 4. HAProxy update: route traffic đến new Master\n# 5. Old master (nếu recover) tự động join như Replica\n\n# Kiểm tra cluster status:\npatronictl -c patroni.yml list\n# Member        Host          Role    State\n# postgresql-1  10.0.0.1:5432 Leader  running\n# postgresql-2  10.0.0.2:5432 Replica streaming',
    },
    {
      name: 'Binlog',
      icon: '📜',
      explain: 'Binary Log (Binlog) trong MySQL là log ghi lại tất cả changes (INSERT/UPDATE/DELETE) theo thứ tự. Replica đọc Binlog từ Master và apply. Binlog cũng dùng cho: Point-in-Time Recovery, CDC (Change Data Capture), data pipeline (Debezium đọc Binlog → Kafka).',
      tip: 'Binlog format: ROW (ghi from/to values, verbose), STATEMENT (ghi SQL), MIXED (kết hợp). ROW mode an toàn nhất cho replication vì không bị ảnh hưởng bởi non-deterministic functions.',
      example: '-- Enable binary log:\n# my.cnf:\nlog-bin = mysql-bin\nbinlog-format = ROW\nbinlog-row-image = FULL\nserver-id = 1\n\n-- Xem binlog:\nSHOW BINARY LOGS;\n-- mysql-bin.000001  1073741824\n-- mysql-bin.000002  524288000\n\n-- Đọc binlog:\nmysqlbinlog mysql-bin.000001\n-- Hoặc dùng Debezium để stream binlog → Kafka\n-- → CDC pipeline cho real-time data sync',
    },
  ],
  demos: [
    {
      id: 'read-write-split',
      label: '✂️ Read/Write Split',
      language: 'javascript',
      code: `// Giả lập hệ thống Routing và Read/Write Split
class DatabaseCluster {
  constructor() {
    this.master = { name: 'Master-DB', data: {} };
    this.replicas = [
      { name: 'Replica-1', data: {} },
      { name: 'Replica-2', data: {} }
    ];
  }

  // Tác vụ ghi: Bắt buộc đi vào Master
  write(query, key, value) {
    console.log(\`📝 [Ghi] Routing query "\${query}" tới \${this.master.name}\`);
    this.master.data[key] = value;
    
    // Đồng bộ bất đồng bộ sang Replicas
    this.syncToReplicas(key, value);
  }

  // Tác vụ đọc: Round-robin phân phối tải giữa các Replicas
  read(key) {
    const replicaIndex = Math.floor(Math.random() * this.replicas.length);
    const target = this.replicas[replicaIndex];
    console.log(\`🔍 [Đọc] Routing query "GET \${key}" tới \${target.name}\`);
    return target.data[key];
  }

  syncToReplicas(key, value) {
    this.replicas.forEach((rep, idx) => {
      setTimeout(() => {
        rep.data[key] = value;
        console.log(\`⏱️  [Sync] Đã sync "\${key}" từ Master sang \${rep.name}\`);
      }, (idx + 1) * 100); // Giả lập replication lag khác nhau
    });
  }
}

const db = new DatabaseCluster();
console.log('=== Thực hiện Ghi ===');
db.write('INSERT INTO users VALUES ("john")', 'user:1', { name: 'John Doe' });

console.log('\\n=== Thực hiện Đọc ngay lập tức (Lag có thể xảy ra) ===');
console.log('User value:', db.read('user:1')); // Có thể undefined vì replica chưa sync kịp

setTimeout(() => {
  console.log('\\n=== Thực hiện Đọc sau khi đã sync xong ===');
  console.log('User value:', db.read('user:1'));
}, 350);`
    },
    {
      id: 'read-your-writes',
      label: '⏱️ Read-Your-Writes Consistent',
      language: 'javascript',
      code: `// Khắc phục Replication Lag bằng cơ chế Read-Your-Writes
class SmartDbRouter {
  constructor() {
    this.master = { data: {} };
    this.replica = { data: {} };
    this.lagMs = 300;
  }

  write(userId, profile) {
    console.log(\`📝 [Write] Cập nhật thông tin \${userId} vào Master\`);
    this.master.data[userId] = profile;

    // Giả lập sync lag
    setTimeout(() => {
      this.replica.data[userId] = profile;
      console.log(\`⏱️  [Sync] Hoàn tất sync data của \${userId} sang Replica\`);
    }, this.lagMs);

    // Trả về thời điểm vừa ghi để client biết
    return Date.now();
  }

  // Cơ chế routing thông minh dựa trên thời gian ghi
  read(userId, lastWriteTime) {
    const isRecentlyWritten = lastWriteTime && (Date.now() - lastWriteTime < this.lagMs + 100);

    if (isRecentlyWritten) {
      console.log(\`⚡ [Read-Master] Phát hiện vừa write gần đây (\${Date.now() - lastWriteTime}ms). Bắt buộc route tới Master!\`);
      return this.master.data[userId];
    } else {
      console.log(\`🔍 [Read-Replica] Dữ liệu đã ổn định. Route tới Replica để giảm tải cho Master\`);
      return this.replica.data[userId];
    }
  }
}

const db = new SmartDbRouter();
console.log('=== User cập nhật profile ===');
const writeTime = db.write('user:99', { name: 'Alice', age: 25 });

console.log('\\n=== User refresh trang và xem profile ngay lập tức ===');
const profile1 = db.read('user:99', writeTime); // Phải hiển thị đúng Alice
console.log('Profile:', profile1);

setTimeout(() => {
  console.log('\\n=== Đọc lại sau 500ms khi data đã sync ổn định ===');
  const profile2 = db.read('user:99', writeTime); // Đọc từ replica
  console.log('Profile:', profile2);
}, 500);`
    }
  ],
  interactive: null,
  callouts: [
    { type: 'warning', icon: '🚫', title: 'Không lạm dụng replication để scale writes', body: 'Master-Replica replication chỉ giúp phân phối tải đọc (Scale Reads). Để scale ghi (Writes), bạn cần áp dụng Sharding hoặc Multi-master.' },
    { type: 'success', icon: '🔄', title: 'Automated Failover đáng tin cậy', body: 'Sử dụng các công cụ trưởng thành như Patroni (PostgreSQL) hoặc Redis Sentinel để tự động phát hiện Master crash, bầu chọn leader mới và update IP nổi mà không cần can thiệp thủ công.' },
    { type: 'info', icon: '⏱️', title: 'Chấp nhận Eventual Consistency', body: 'Do độ trễ mạng và tải xử lý, replication lag luôn tồn tại. Hệ thống microservices cần chấp nhận sự nhất quán cuối cùng thay vì nhất quán tuyệt đối.' },
    { type: 'tip', icon: '💡', title: 'Sử dụng DB Proxy', body: 'Nên đặt các DB Proxy như ProxySQL hoặc PgBouncer ở trước cluster để ứng dụng không cần tự quản lý logic chia luồng đọc/ghi.' }
  ],
  quiz: [
    {
      q: 'Trong mô hình Master-Replica, thành phần nào chịu trách nhiệm nhận tất cả các lệnh ghi (writes)?',
      options: ['Replica gần nhất', 'Master', 'DB Proxy', 'Bất kỳ node nào rảnh rỗi'],
      answer: 1,
      explain: 'Master nhận tất cả writes, còn Replicas chỉ copy data từ Master và phục vụ reads. Vì vậy Master là single point of failure cho writes.',
    },
    {
      q: 'Replication Lag mô tả điều gì?',
      options: ['Độ trễ giữa lúc Master commit và lúc Replica apply thay đổi đó', 'Thời gian Master khởi động lại sau sự cố', 'Thời gian client kết nối tới database', 'Dung lượng tối đa của binary log'],
      answer: 0,
      explain: 'Replication Lag là độ trễ giữa lúc Master commit và Replica apply change đó, gây ra bởi network latency, large transactions hoặc replica đang bận CPU/IO.',
    },
    {
      q: 'Khi user vừa ghi xong rồi đọc lại ngay, cách xử lý đúng để đảm bảo read-your-writes là gì?',
      options: ['Đọc từ một Replica ngẫu nhiên để giảm tải', 'Xóa toàn bộ cache của hệ thống', 'Chuyển sang dùng database NoSQL', 'Đọc lại từ Master trong cùng session'],
      answer: 3,
      explain: 'Do Replica chưa kịp sync, đọc ngay sau khi write có thể không thấy dữ liệu mới. Fix phổ biến là route read đó về Master trong cùng session.',
    },
    {
      q: 'Failover trong Master-Replica là gì?',
      options: ['Quá trình sao lưu dữ liệu định kỳ ra ổ đĩa ngoài', 'Quá trình chia nhỏ bảng thành nhiều shard', 'Quá trình promote một Replica thành Master mới khi Master fail', 'Quá trình nén binary log để tiết kiệm dung lượng'],
      answer: 2,
      explain: 'Failover là quá trình promote Replica thành Master mới khi Master fail, có thể thực hiện thủ công hoặc tự động (Patroni, MHA, RDS Multi-AZ).',
    },
  ],
}
