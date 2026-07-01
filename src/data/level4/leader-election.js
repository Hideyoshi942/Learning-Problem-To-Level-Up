export default {
  slug: 'leader-election',
  order: 19,
  title: 'Leader Election',
  emoji: '👑',
  description: 'Raft, Paxos, ZooKeeper để bầu leader trong distributed systems.',
  project: 'Distributed Scheduler.',
  problems: [
    { icon: '🧠', title: 'Hai Leader đồng thời (Split-Brain)', desc: 'Xảy ra khi chia cắt mạng, hai nhóm nhỏ tự bầu leader của riêng mình và đồng thời nhận ghi dữ liệu, gây mâu thuẫn dữ liệu nghiêm trọng.' },
    { icon: '🌪️', title: 'Bão bầu cử (Election Storm)', desc: 'Khi nhiều node đồng thời hết hạn timeout và tranh giành quyền Leader, chúng gửi hàng loạt yêu cầu bỏ phiếu gây tắc nghẽn đường truyền mạng.' },
    { icon: '📉', title: 'Mất mát dữ liệu khi chuyển giao', desc: 'Node được chọn làm Leader mới có thể chưa nhận đủ toàn bộ log từ Leader cũ, dẫn đến việc mất mát các giao dịch chưa kịp đồng bộ hoàn toàn.' }
  ],
  concepts: [
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
  ],
  demos: [
    {
      id: 'raft-election',
      label: '🗳️ Raft Election Simulator',
      language: 'javascript',
      code: `// Giả lập thuật toán bầu chọn Leader theo phong cách Raft
class RaftNode {
  constructor(id, totalNodes) {
    this.id = id;
    this.totalNodes = totalNodes;
    this.term = 0;
    this.state = 'FOLLOWER'; // FOLLOWER, CANDIDATE, LEADER
    this.votedFor = null;
  }

  // Nhận heartbeat từ leader để duy trì trạng thái follower
  receiveHeartbeat(leaderId, term) {
    if (term >= this.term) {
      this.term = term;
      this.state = 'FOLLOWER';
      this.votedFor = null;
      console.log(\`Node \${this.id} [FOLLOWER]: Nhận heartbeat từ Leader \${leaderId} ở Term \${term}\`);
    }
  }

  // Bắt đầu quá trình tự ứng cử (Election Timeout xảy ra)
  startElection() {
    this.term += 1;
    this.state = 'CANDIDATE';
    this.votedFor = this.id; // Tự bầu cho mình
    let votesCount = 1;
    console.log(\`\\n📣 Node \${this.id} [CANDIDATE]: Bắt đầu bầu cử ở Term \${this.term}\`);

    // Gửi yêu cầu bỏ phiếu đến các node khác
    return votesCount;
  }

  // Node khác nhận được yêu cầu bỏ phiếu
  handleVoteRequest(candidateId, candidateTerm) {
    if (candidateTerm > this.term) {
      this.term = candidateTerm;
      this.state = 'FOLLOWER';
      this.votedFor = candidateId;
      console.log(\`   Node \${this.id}: Đồng ý bầu cho Node \${candidateId} (Term: \${candidateTerm})\`);
      return true;
    }
    console.log(\`   Node \${this.id}: Từ chối bầu cho Node \${candidateId} (Term cũ: \${candidateTerm} <= \${this.term})\`);
    return false;
  }
}

const totalNodes = 3;
const cluster = [
  new RaftNode('Node-1', totalNodes),
  new RaftNode('Node-2', totalNodes),
  new RaftNode('Node-3', totalNodes)
];

// Giả định Node-1 bị mất kết nối mạng và kích hoạt bầu cử
let votes = cluster[0].startElection();

cluster.forEach(node => {
  if (node.id !== 'Node-1') {
    const approved = node.handleVoteRequest('Node-1', cluster[0].term);
    if (approved) votes++;
  }
});

const majority = Math.floor(totalNodes / 2) + 1;
console.log(\`\\n📊 Tổng phiếu bầu nhận được: \${votes}/\${totalNodes} (Cần tối thiểu \${majority})\`);

if (votes >= majority) {
  cluster[0].state = 'LEADER';
  console.log(\`👑 Node-1 đã trở thành LEADER mới ở Term \${cluster[0].term}!\`);
}`
    },
    {
      id: 'zookeeper-election',
      label: '🦁 ZooKeeper Ephemeral Sequential Election',
      language: 'javascript',
      code: `// Giả lập Leader Election qua Ephemeral Sequential Node (Tránh Thundering Herd)
class ZooKeeperMock {
  constructor() {
    this.zNodes = []; // Mảng chứa các ephemeral sequential path [{ path, nodeId }]
    this.sequence = 0;
  }

  // Đăng ký tham gia bầu chọn
  joinElection(nodeId) {
    this.sequence++;
    const path = \`/election/node-\${String(this.sequence).padStart(6, '0')}\`;
    const znode = { path, nodeId };
    this.zNodes.push(znode);
    this.zNodes.sort((a, b) => a.path.localeCompare(b.path));
    console.log(\`➕ \${nodeId} tham gia, tạo znode sequential: \${path}\`);
    return path;
  }

  // Kiểm tra vai trò của Node
  checkLeader(nodePath, nodeId) {
    const index = this.zNodes.findIndex(z => z.path === nodePath);
    if (index === 0) {
      console.log(\`👑 \${nodeId} là node nhỏ nhất trên path (\${nodePath}) -> Trở thành LEADER!\`);
      return 'LEADER';
    } else {
      const predecessor = this.zNodes[index - 1];
      console.log(\`🔍 \${nodeId} ở vị trí \${index}. Không là leader. Đang thiết lập WATCH znode liền trước: \${predecessor.path}\`);
      return \`WATCHING \${predecessor.nodeId}\`;
    }
  }

  // Giả lập node sập
  simulateCrash(nodeId) {
    console.log(\`\\n💥 [Sự cố] Node \${nodeId} sập! Ephemeral znode của nó tự động bị xóa...\`);
    this.zNodes = this.zNodes.filter(z => z.nodeId !== nodeId);
  }
}

const zk = new ZooKeeperMock();
const pathA = zk.joinElection('Node-A');
const pathB = zk.joinElection('Node-B');
const pathC = zk.joinElection('Node-C');

console.log('\\n=== Kiểm tra vai trò ban đầu ===');
zk.checkLeader(pathA, 'Node-A');
zk.checkLeader(pathB, 'Node-B'); // Sẽ watch Node-A
zk.checkLeader(pathC, 'Node-C'); // Sẽ watch Node-B

// Node-A crash
zk.simulateCrash('Node-A');

// Kích hoạt Watcher của Node-B
console.log('=== Kích hoạt sự kiện Watcher trên Node-B ===');
zk.checkLeader(pathB, 'Node-B'); // Trở thành Leader mới`
    }
  ],
  interactive: null,
  callouts: [
    { type: 'warning', icon: '⚠️', title: 'Luôn dùng số lượng node lẻ', body: 'Hãy luôn thiết lập số lượng node là lẻ (3, 5, 7) cho các cluster quản lý consensus. Số lượng node chẵn (như 4) không tăng khả năng chịu lỗi so với số lẻ nhỏ hơn gần nhất (3) mà chỉ tốn tài nguyên và dễ sinh tranh chấp.' },
    { type: 'success', icon: '📦', title: 'Không tự viết thuật toán Consensus', body: 'Thuật toán consensus rất khó triển khai đúng 100% trong thực tế do biên dạng lỗi mạng đa dạng. Hãy sử dụng các thư viện chuẩn hóa như etcd, Consul hoặc ZooKeeper.' },
    { type: 'info', icon: '🎯', title: 'Phân biệt Raft và Paxos', body: 'Raft sử dụng một Leader mạnh và tập trung quản lý dòng chảy dữ liệu, giúp dễ hiểu và triển khai hơn Paxos vốn mang tính phi tập trung và cấu trúc phức tạp hơn.' },
    { type: 'tip', icon: '🔑', title: 'Sử dụng Fencing Token chống Stale Leader', body: 'Khi một Leader bị ngắt kết nối mạng tạm thời (GC Pause/Network Lag), nó có thể nghĩ mình vẫn là Leader. Hãy sinh Token tăng dần (Term/Epoch) trong các lệnh Write để storage server từ chối các request từ Leader hết hạn.' }
  ],
  quiz: [
    {
      q: 'Trong Raft, một Candidate trở thành Leader khi nào?',
      options: ['Khi nó có term number nhỏ nhất cluster', 'Khi node đầu tiên trong danh sách đồng ý', 'Khi nó tự bầu phiếu cho chính mình', 'Khi nó nhận được đa số phiếu bầu (majority)'],
      answer: 3,
      explain: 'Candidate gửi RequestVote tới các node khác và chỉ trở thành Leader khi thu được majority votes trong term đó.',
    },
    {
      q: 'Tại sao Raft thường được ưa dùng hơn Paxos trong thực tế?',
      options: ['Vì Raft luôn nhanh hơn Paxos gấp 10 lần', 'Vì Raft dễ hiểu và dễ implement hơn nhưng cùng safety guarantees', 'Vì Raft không cần có leader', 'Vì Raft không sử dụng khái niệm term'],
      answer: 1,
      explain: 'Raft được thiết kế để dễ hiểu và dễ triển khai đúng hơn Paxos trong khi vẫn cung cấp cùng các safety guarantees.',
    },
    {
      q: 'ZooKeeper bầu leader theo cách nào để tránh thundering herd?',
      options: ['Tất cả node cùng watch trực tiếp znode của leader', 'Node có số sequential lớn nhất làm leader', 'Dùng ephemeral sequential znode, node nhỏ nhất làm leader và mỗi node chỉ watch node liền trước', 'Bầu lại một leader ngẫu nhiên sau mỗi 100ms'],
      answer: 2,
      explain: 'Mỗi node tạo ephemeral sequential znode; node có số nhỏ nhất là Leader, và mỗi node chỉ watch predecessor nên khi leader fail chỉ một node được notify.',
    },
    {
      q: 'Cách phổ biến để ngăn Split Brain khi có network partition là gì?',
      options: ['Chỉ nhóm có đa số node (majority > N/2) mới được hoạt động, nhóm thiểu số từ chối ghi', 'Cho phép cả hai nhóm cùng nhận writes', 'Tăng số lượng node lên số chẵn', 'Tắt hoàn toàn cơ chế term/epoch'],
      answer: 0,
      explain: 'Chỉ nhóm đạt majority (lớn hơn N/2 node) mới được bầu leader và nhận writes; nhóm thiểu số reject writes để tránh hai leader ghi mâu thuẫn.',
    },
  ],
}
