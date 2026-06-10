const makeTopic = (slug, order, title, emoji, desc, project, concepts) => ({
  slug, order, title, emoji, description: desc, project,
  problems: [{ icon: '🚧', title: 'Coming Soon', desc: 'Nội dung đang được chuẩn bị.' }],
  concepts,
  demos: [{ id: 'cs', label: '🚧 Coming Soon', language: 'javascript', code: `console.log('${title}');` }],
  interactive: null,
  callouts: [{ type: 'info', icon: '🚧', title: 'Đang phát triển', body: `Demos cho "${title}" đang được chuẩn bị!` }],
})

export default makeTopic(
  'db-replication', 16, 'Database Replication', '📋',
  'Master-Replica replication để scale reads và high availability.',
  'Social Network.',
  [
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
  ]
)
