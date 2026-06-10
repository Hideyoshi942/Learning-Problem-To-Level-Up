const makeTopic = (slug, order, title, emoji, desc, project, concepts) => ({
  slug, order, title, emoji, description: desc, project,
  problems: [{ icon: '🚧', title: 'Coming Soon', desc: 'Nội dung đang được chuẩn bị.' }],
  concepts,
  demos: [{ id: 'cs', label: '🚧 Coming Soon', language: 'javascript', code: `console.log('${title}');` }],
  interactive: null,
  callouts: [{ type: 'info', icon: '🚧', title: 'Đang phát triển', body: `Demos cho "${title}" đang được chuẩn bị!` }],
})

export default makeTopic(
  'leader-election', 19, 'Leader Election', '👑',
  'Raft, Paxos, ZooKeeper để bầu leader trong distributed systems.',
  'Distributed Scheduler.',
  [
    {
      name: 'Raft Consensus',
      icon: '🗳️',
      explain: 'Raft là consensus algorithm dễ hiểu hơn Paxos. Các nodes là Leader, Follower, hoặc Candidate. Leader nhận tất cả writes và replicates sang Followers. Election: Candidate gửi RequestVote → majority votes → becomes Leader. Mỗi leader có term number (epoch) tăng dần.',
      tip: 'Raft đảm bảo safety: chỉ 1 leader mỗi term, leader luôn có data mới nhất. Dùng trong: etcd (Kubernetes), CockroachDB, TiKV, Consul. Election timeout: 150-300ms.',
      example: '// Raft Election flow:\n// Initial: tất cả là Followers\n// Term 1: A election timeout → Candidate\n//   A sends RequestVote(term=1) to B, C\n//   B votes YES (hasn\'t voted in term 1)\n//   C votes YES\n//   A wins majority → becomes Leader\n\n// A (Leader) sends heartbeats every 50ms\n// If A crashes:\n//   B, C stop receiving heartbeats\n//   B election timeout first → Candidate (term=2)\n//   B sends RequestVote(term=2)\n//   C votes YES → B becomes new Leader (term=2)',
    },
    {
      name: 'Paxos',
      icon: '🏛️',
      explain: 'Paxos là consensus algorithm gốc (Leslie Lamport, 1989). Phức tạp hơn Raft nhưng foundational. Phases: Prepare (Proposer gửi proposal_id), Promise (Acceptors hứa không accept thấp hơn), Accept (Proposer gửi value), Accepted (majority accept → decided). Multi-Paxos cho continuous consensus.',
      tip: 'Paxos khó implement đúng. Raft được tạo ra để dễ implement và dễ hiểu hơn Paxos trong khi cùng safety guarantees. Trong practice: dùng etcd (Raft) thay vì implement Paxos.',
      example: '// Paxos Basic flow:\n// Phase 1a - Prepare:\n// Proposer: "Proposal #5: what is the decided value?"\n\n// Phase 1b - Promise:\n// Acceptor 1: "I promise not to accept < #5. Last: #3=X"\n// Acceptor 2: "I promise. Last: #4=Y" ← take highest!\n\n// Phase 2a - Accept:\n// Proposer: "Accept #5, value=Y" (Y vì #4 > #3)\n\n// Phase 2b - Accepted:\n// Majority acceptors accept → value Y DECIDED ✅',
    },
    {
      name: 'ZooKeeper',
      icon: '🦁',
      explain: 'ZooKeeper implement leader election qua ephemeral sequential znodes. Mỗi node tạo znode /election/node-XXXXXX (sequential). Node có số nhỏ nhất là Leader. Nếu Leader fail → znode ephemeral tự xóa → node tiếp theo nhỏ nhất trở thành Leader. Đây là pattern "herd avoidance".',
      tip: 'ZooKeeper Watches: node "watch" znode của predecessor thay vì leader. Khi predecessor fail, chỉ một node được notify → không có thundering herd. Kafka, HDFS, HBase dùng ZooKeeper cho leader election.',
      example: '// ZooKeeper Leader Election:\n// 1. Mỗi node tạo ephemeral sequential znode:\n//    /election/node-0000000001  ← Node A (Leader!)\n//    /election/node-0000000002  ← Node B\n//    /election/node-0000000003  ← Node C\n\n// 2. Node với số nhỏ nhất = Leader\n// 3. B watches node-0000000001 (A\'s znode)\n//    C watches node-0000000002 (B\'s znode)\n\n// 4. A crashes → node-0000000001 bị xóa\n// 5. B được notify → B kiểm tra → B là smallest\n// 6. B trở thành Leader (chỉ B được notify, không phải C)',
    },
    {
      name: 'Split Brain',
      icon: '🧠',
      explain: 'Split Brain: network partition chia cluster thành 2 groups, mỗi group bầu Leader riêng → 2 Leaders cùng tồn tại. Cả 2 nhận writes → data inconsistency. Prevention: chỉ group có majority (> N/2 nodes) mới được hoạt động. Minority group reject writes.',
      tip: 'Luôn dùng số lẻ nodes (3, 5, 7) để có clear majority. Dùng STONITH (Shoot The Other Node In The Head) để force terminate suspected node. Etcd minimum 3 nodes.',
      example: '// Split Brain prevention với quorum:\n// Cluster: 5 nodes (A, B, C, D, E)\n// Network partition: {A,B} vs {C,D,E}\n\n// Group {A,B}: 2 nodes < majority(3)\n//   → A,B cannot elect leader → reject writes ✅\n\n// Group {C,D,E}: 3 nodes = majority\n//   → C elected leader → accepts writes ✅\n\n// Fencing:\nif (nodes_in_partition <= totalNodes / 2) {\n  // DEMOTE self, refuse to serve writes\n  becomeFollower();\n  return { error: "Not enough quorum" };\n}',
    },
    {
      name: 'Term/Epoch',
      icon: '🔢',
      explain: 'Term (Raft) hoặc Epoch (Paxos/ZooKeeper) là số nguyên tăng dần, uniquely identifies mỗi leadership period. Mỗi lần election mới → term tăng. Messages với term cũ hơn bị ignore. Giúp phân biệt stale leader với new leader sau network partition.',
      tip: 'Term/Epoch cũng dùng làm fencing token: storage server reject requests có term thấp hơn current term → cũ leader (tưởng mình vẫn là leader) không thể ghi sai data.',
      example: '// Raft Term usage:\n// Term 1: A là leader\n// Network partition: A bị isolated\n// B,C elect new leader B (term=2)\n// Partition heals:\n// A gửi message với term=1\n// B nhận: "term 1 < current term 2"\n// B ignores A\'s message\n// A nhận response với term=2\n// A: "term 2 > mine" → step down, become follower\n// → Safety: không có 2 leaders cùng tồn tại! ✅\n\n// ZooKeeper epoch:\nzxid = (epoch << 32) | counter\n// zxid tăng monotonically → total ordering của events',
    },
  ]
)
