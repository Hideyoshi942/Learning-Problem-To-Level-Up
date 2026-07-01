export default {
  slug: 'consensus',
  order: 37,
  title: 'Consensus (Raft/Paxos)',
  emoji: '🧭',
  description: 'Consensus (đồng thuận) giúp nhiều node cùng thống nhất MỘT giá trị/leader dù có node chết hay mạng chập chờn. Nắm Quorum, Raft (leader election + log replication) và Split-brain là chìa khoá để xây hệ phân tán đáng tin cậy như etcd, Kafka, Zookeeper.',
  project: 'Cụm 5 node lưu cấu hình dùng chung (kiểu etcd): phải bầu ra 1 leader và nhân bản log sao cho mọi node đọc ra cùng một dữ liệu, kể cả khi vài node chết.',
  problems: [
    { icon: '🧟', title: 'Node chết bất chợt', desc: 'Một node crash hoặc mất mạng nhưng hệ thống vẫn phải tiếp tục và giữ dữ liệu nhất quán.' },
    { icon: '🧠', title: 'Split-brain', desc: 'Mạng bị chia đôi, hai phe cùng tưởng mình là leader rồi ghi dữ liệu mâu thuẫn nhau.' },
    { icon: '🤷', title: 'Ai là người quyết định?', desc: 'Nhiều node ngang hàng cần một cách để cả cụm đồng thuận về một giá trị/leader duy nhất.' },
  ],
  concepts: [
    {
      name: 'Vì sao cần Consensus',
      icon: '🧭',
      explain: 'Consensus là bài toán làm cho nhiều node cùng đồng ý về MỘT giá trị (hoặc thứ tự các lệnh) ngay cả khi có node chết, mạng chậm hoặc gói tin mất. Không có consensus, mỗi node tự quyết -> dữ liệu phân kỳ (diverge) và không ai biết đâu là sự thật. Consensus cho phép hệ thống vẫn CHÍNH XÁC dù một phần cụm gặp sự cố (fault tolerance).',
      tip: 'Consensus KHÔNG chống được lỗi Byzantine (node nói dối) — Raft/Paxos chỉ giả định node có thể CHẾT (crash-stop), không phản bội. Muốn chống node độc hại cần BFT như PBFT.',
      example: '// Không có consensus: mỗi node tự quyết -> phân kỳ\n// Node A: balance = 100 ; Node B: balance = 90  (bất đồng!)\n\n// Có consensus: mọi node ĐỒNG THUẬN cùng một giá trị đã commit\n// -> tất cả node thấy balance = 100, kể cả khi 1 node vừa chết',
    },
    {
      name: 'Quorum / Majority',
      icon: '🔢',
      explain: 'Quorum là số node tối thiểu phải đồng ý để một quyết định có hiệu lực. Với consensus, quorum = majority = floor(N/2) + 1 (quá bán). Ý tưởng cốt lõi: hai quorum bất kỳ LUÔN giao nhau ít nhất 1 node, nên không thể có hai quyết định mâu thuẫn cùng được duyệt. Số node được phép chết = N - majority.',
      tip: 'Luôn chọn N LẺ. N=4 majority=3 (chịu 1 chết) nhưng N=3 majority=2 cũng chịu 1 chết — thêm 1 node mà KHÔNG tăng khả năng chịu lỗi, chỉ tốn tài nguyên và làm mọi write phải chờ nhiều ACK hơn.',
      example: '// majority = floor(N/2) + 1\n// N=3 -> majority=2  (chịu 1 node chết)\n// N=5 -> majority=3  (chịu 2 node chết)\n// N=7 -> majority=4  (chịu 3 node chết)\n// Hai quorum bất kỳ luôn giao nhau -> không có 2 quyết định trái nhau',
    },
    {
      name: 'Raft — Leader Election',
      icon: '👑',
      explain: 'Raft chia bài toán consensus thành hai phần dễ hiểu, phần đầu là bầu leader. Mỗi node ở một trong ba trạng thái: Follower, Candidate, Leader. Khi follower không nhận heartbeat trong một khoảng (election timeout), nó tăng term (nhiệm kỳ, số nguyên tăng dần) rồi chuyển thành Candidate và gửi RequestVote. Mỗi node chỉ vote 1 lần trong mỗi term. Candidate nào thu >= majority phiếu sẽ thành Leader và gửi heartbeat định kỳ.',
      tip: 'Election timeout được random hoá (ví dụ 150-300ms) để giảm khả năng nhiều candidate cùng khởi động một lúc gây chia phiếu (split vote). Term đóng vai trò đồng hồ logic: term lớn hơn luôn thắng term nhỏ hơn.',
      example: '// Vòng đời một node trong Raft:\n// FOLLOWER --(hết timeout)--> CANDIDATE --(đủ majority phiếu)--> LEADER\n// term = nhiệm kỳ, tăng dần; mỗi node vote 1 lần/term\n// Leader gửi heartbeat (AppendEntries rỗng) để giữ ghế',
    },
    {
      name: 'Raft — Log Replication',
      icon: '📜',
      explain: 'Phần thứ hai của Raft là nhân bản log. Client gửi lệnh tới Leader, Leader append vào log của mình (CHƯA commit) rồi gửi AppendEntries tới các follower. Khi >= majority node đã ghi entry đó, Leader mới COMMIT (áp dụng vào state machine) và trả lời client, sau đó báo follower commit theo. Nhờ vậy log của mọi node giống hệt nhau theo đúng thứ tự.',
      tip: 'Chỉ cần majority ACK là commit được — KHÔNG chờ tất cả. Đó là lý do cụm vẫn ghi được dù vài node chết. Entry chưa đạt majority thì chưa commit và có thể bị ghi đè nếu leader đổi.',
      example: '// Client -> Leader: append entry vào log (chưa commit)\n// Leader -> followers: AppendEntries(entry)\n// >= majority đã ghi -> Leader COMMIT + áp dụng state machine\n// Leader -> followers: báo commit\n// -> mọi node có cùng log, cùng thứ tự',
    },
    {
      name: 'Split-brain',
      icon: '🧠',
      explain: 'Split-brain xảy ra khi mạng bị chia (network partition) thành nhiều phe, mỗi phe tưởng các phe kia đã chết và tự bầu leader riêng -> hai leader cùng ghi dữ liệu mâu thuẫn. Consensus chặn điều này bằng quy tắc majority: chỉ phe có đủ majority node mới được bầu leader và commit; phe thiểu số không đủ quorum nên phải dừng ghi.',
      tip: 'Vì mọi write cần majority ACK, phe thiểu số không thể commit gì cả -> an toàn. Đây chính là lý do cụm N=5 chịu được chia thành 3 vs 2: chỉ phe 3 node hoạt động, phe 2 node đứng im.',
      example: '// Partition cụm N=5 (majority=3) thành 2 phe:\n// Phe A: 2 node -> 2 < 3 -> KHÔNG bầu được leader, không ghi\n// Phe B: 3 node -> 3 >= 3 -> có leader, tiếp tục commit\n// -> chỉ MỘT phe hoạt động -> không có 2 leader ghi trái nhau',
    },
    {
      name: 'Paxos, ZAB & ứng dụng',
      icon: '🏛️',
      explain: 'Paxos (Leslie Lamport) là thuật toán consensus kinh điển nhưng nổi tiếng khó hiểu và khó cài đúng, thường dùng biến thể Multi-Paxos cho chuỗi quyết định. ZAB (Zookeeper Atomic Broadcast) là giao thức riêng của Zookeeper, gần với Raft (có leader, broadcast theo thứ tự). Raft ra đời sau, ưu tiên dễ hiểu nên được chọn nhiều nhất hiện nay.',
      tip: 'Ghi nhớ ai dùng gì: etcd/Consul/Kafka (KRaft) dùng Raft; Zookeeper dùng ZAB; Google Chubby/Spanner dùng Paxos. Kafka trước đây dựa vào Zookeeper để bầu controller, nay chuyển sang KRaft (Raft nội bộ).',
      example: '// Consensus trong thực tế:\n// etcd (Kubernetes) -> Raft\n// Consul                -> Raft\n// Kafka KRaft mode      -> Raft (bầu controller)\n// Zookeeper             -> ZAB\n// Google Chubby/Spanner -> Paxos / Multi-Paxos',
    },
  ],
  demos: [
    {
      id: 'majority-quorum',
      label: '🔢 Majority Quorum (N lẻ vs chẵn)',
      language: 'javascript',
      code: `// Quorum / Majority: cluster vẫn chạy nếu còn >= majority node sống
// majority = floor(N/2) + 1  (quá bán)
// So node toi da duoc phep CHET = N - majority
function majority(n) { return Math.floor(n / 2) + 1; }

const sizes = [3, 4, 5, 6, 7];
console.log("N | majority | chết tối đa | ghi chú");
console.log("--+----------+-------------+----------------");
for (let i = 0; i < sizes.length; i++) {
  const n = sizes[i];
  const m = majority(n);
  const canDie = n - m;
  const note = (n % 2 === 0) ? "N chẵn -> lãng phí" : "N lẻ  -> tối ưu";
  console.log(" " + n + " |    " + m + "     |      " + canDie + "      | " + note);
}

console.log("");
console.log("N=4 majority=3 chịu 1 chết; N=3 majority=2 CŨNG chịu 1 chết.");
console.log("=> Thêm node chẵn KHÔNG tăng chịu lỗi. Luôn chọn N LẺ (3, 5, 7).");`,
    },
    {
      id: 'leader-election',
      label: '👑 Raft Leader Election',
      language: 'javascript',
      code: `// Raft: 1 node thành CANDIDATE, tăng term, xin phiếu từ các node khác
// Node vote YES nếu chưa vote trong term này. Đủ majority phiếu -> LEADER.
const N = 5;
const majority = Math.floor(N / 2) + 1;   // = 3
const term = 2;

// candidate = node 0. Mảng phiếu của node 1..4 (1 = vote YES, 0 = im lặng)
// Giả sử node 3 bị phân vùng mạng -> không trả lời
const peerVotes = [1, 1, 0, 1];

let votes = 1; // candidate tự vote cho chính mình
console.log("Node 0 thành CANDIDATE (term " + term + "), tự vote cho mình.");
for (let i = 0; i < peerVotes.length; i++) {
  const peer = i + 1;
  if (peerVotes[i] === 1) {
    votes++;
    console.log("  Node " + peer + " -> vote YES   (tổng " + votes + ")");
  } else {
    console.log("  Node " + peer + " -> KHÔNG trả lời");
  }
}

console.log("");
console.log("Phiếu thu được: " + votes + " / cần majority = " + majority);
if (votes >= majority) {
  console.log("=> Node 0 TRỞ THÀNH LEADER của term " + term + " ✅");
} else {
  console.log("=> Không đủ phiếu -> chờ timeout rồi bầu lại (term mới) ❌");
}`,
    },
    {
      id: 'log-replication',
      label: '📜 Log Replication Commit',
      language: 'javascript',
      code: `// LEADER nhận lệnh ghi, gửi entry tới followers, đợi ACK.
// Chỉ COMMIT khi số ACK >= majority. Không đủ -> KHÔNG commit.
const N = 5;
const majority = Math.floor(N / 2) + 1; // = 3 (tính cả leader)

function replicate(entry, followerAcks) {
  let acks = 1; // leader luôn tự ghi log của mình -> tính 1
  console.log("Leader ghi [" + entry + "], gửi tới " + followerAcks.length + " follower...");
  for (let i = 0; i < followerAcks.length; i++) {
    if (followerAcks[i] === 1) {
      acks++;
      console.log("  Follower " + (i + 1) + " ghi xong -> ACK  (tổng " + acks + ")");
    } else {
      console.log("  Follower " + (i + 1) + " chưa phản hồi");
    }
  }
  if (acks >= majority) {
    console.log("  ACK " + acks + " >= majority " + majority + " => COMMIT [" + entry + "] ✅");
  } else {
    console.log("  ACK " + acks + " < majority " + majority + " => CHƯA commit, chờ thêm ❌");
  }
  console.log("");
}

// Case 1: đủ ACK -> commit (leader + 2 follower = 3)
replicate("SET x=10", [1, 1, 0, 0]);
// Case 2: nhiều follower chết, không đủ ACK -> KHÔNG commit (leader + 1 = 2)
replicate("SET y=20", [1, 0, 0, 0]);`,
    },
  ],
  interactive: {
    title: '🧭 Cluster size N → majority & khả năng chịu lỗi',
    inputLabel: 'Số node trong cluster (N), ví dụ 3, 5, 7',
    inputPlaceholder: '5',
    inputType: 'number',
    run(value) {
      const n = Math.max(1, Math.floor(parseFloat(value) || 0))
      const majority = Math.floor(n / 2) + 1
      const canDie = n - majority
      const isEven = n % 2 === 0
      const oddBelow = n - 1
      const oddCanDie = oddBelow >= 1 ? oddBelow - (Math.floor(oddBelow / 2) + 1) : 0
      return [
        `Cluster N = ${n} node`,
        ``,
        `✅ Majority (quorum) cần: ${majority} node phải đồng ý/sống`,
        `💀 Số node được phép CHẾT: ${canDie}`,
        ``,
        isEven
          ? `⚠️  N chẵn LÃNG PHÍ: N=${n} chịu ${canDie} lỗi, nhưng N=${oddBelow} (lẻ) cũng chịu ${oddCanDie} lỗi với ÍT hơn 1 node → nên dùng N LẺ.`
          : `👍 N lẻ là lựa chọn tối ưu (không lãng phí node).`,
        ``,
        n < 3
          ? `🚫 N < 3 không chịu được node nào chết → chưa đủ HA cho consensus.`
          : `Gợi ý: production thường dùng 3, 5 hoặc 7 node (nhiều hơn nữa → chậm vì phải chờ nhiều ACK).`,
      ].join('\n')
    },
  },
  callouts: [
    { type: 'info', icon: '🔢', title: 'Luôn dùng số node LẺ', body: 'N lẻ (3, 5, 7) cho khả năng chịu lỗi tối đa trên mỗi node. N chẵn chỉ tốn thêm node mà không tăng số node được phép chết.' },
    { type: 'warning', icon: '🧠', title: 'Quorum chặn Split-brain', body: 'Chỉ phe có majority mới được bầu leader và ghi. Phe thiểu số phải dừng ghi, nhờ vậy không bao giờ có 2 leader ghi mâu thuẫn.' },
    { type: 'success', icon: '🧭', title: 'Raft dễ hiểu hơn Paxos', body: 'Raft tách bài toán thành leader election + log replication rõ ràng, nên etcd, Consul và Kafka KRaft đều chọn Raft.' },
  ],
  quiz: [
    {
      q: "Công thức majority (quorum) cho cluster N node trong consensus là gì?",
      options: ["Luôn đúng 2 node bất kể N", "Cả N node đều phải đồng ý", "N - 1 node", "floor(N/2) + 1 node"],
      answer: 3,
      explain: "Majority = floor(N/2) + 1, tức quá bán. Vì hai quorum bất kỳ luôn giao nhau ít nhất 1 node nên không thể có hai quyết định mâu thuẫn cùng được duyệt.",
    },
    {
      q: "Với cluster N=5, tối đa bao nhiêu node được phép chết mà cụm vẫn hoạt động?",
      options: ["2 node", "4 node", "3 node", "0 node"],
      answer: 0,
      explain: "majority = floor(5/2)+1 = 3. Số node được phép chết = N - majority = 5 - 3 = 2.",
    },
    {
      q: "Trong Raft, khi nào Leader được phép COMMIT một log entry?",
      options: ["Khi chính leader vừa ghi entry vào log của mình", "Khi TẤT CẢ follower đã ACK", "Khi >= majority node đã ghi (ACK) entry đó", "Ngay khi client gửi lệnh tới"],
      answer: 2,
      explain: "Leader chỉ commit khi số node đã ghi entry đạt majority, KHÔNG cần tất cả. Nhờ vậy cụm vẫn commit được dù vài node chết.",
    },
    {
      q: "Consensus ngăn chặn split-brain bằng cách nào?",
      options: ["Cho phép cả hai phe cùng bầu leader riêng của mình", "Chỉ phe đạt majority mới được bầu leader và ghi; phe thiểu số phải dừng ghi", "Tắt toàn bộ cluster ngay khi mạng bị chia", "Dùng đồng hồ hệ thống để chọn ra leader"],
      answer: 1,
      explain: "Vì bầu leader và commit đều cần majority, phe thiểu số không đủ quorum nên không thể có leader hợp lệ và không ghi được, do đó không bao giờ tồn tại 2 leader mâu thuẫn.",
    },
  ],
}
