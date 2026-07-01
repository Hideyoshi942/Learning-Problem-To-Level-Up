export default {
  slug: 'consistency-models',
  order: 38,
  title: 'Consistency Models',
  emoji: '⚖️',
  description: 'Consistency Models định nghĩa mức độ "mới" và "đồng thuận" mà hệ phân tán bảo đảm khi đọc/ghi trên nhiều replica. Hiểu CAP, PACELC, quorum và logical clock giúp bạn chọn đúng trade-off giữa nhất quán, độ trễ và tính sẵn sàng.',
  project: 'Hệ thống ví điện tử multi-region: cùng một số dư được đọc/ghi từ nhiều data center.',
  problems: [
    { icon: '🕰️', title: 'Đọc trúng data cũ', desc: 'Ghi xong đọc lại từ replica chưa kịp sync → user thấy dữ liệu cũ (stale read).' },
    { icon: '💥', title: 'Xung đột ghi đồng thời', desc: 'Hai node cùng cập nhật một key khi mạng phân mảnh → không biết bản nào mới nhất.' },
    { icon: '🤔', title: 'Chọn C hay A?', desc: 'Khi network partition, hệ thống nên từ chối request (giữ nhất quán) hay vẫn trả lời (giữ sẵn sàng)?' },
  ],
  concepts: [
    {
      name: 'CAP Theorem',
      icon: '🎯',
      explain: 'CAP theorem (Brewer): trong hệ phân tán, khi có Network Partition (P) bạn chỉ giữ được 1 trong 2 tính chất còn lại — Consistency (mọi node đọc thấy data mới nhất) hoặc Availability (mọi request đều nhận response). Vì mạng luôn có thể lỗi nên P là điều BẮT BUỘC phải chấp nhận, thực tế chỉ còn chọn giữa CP và AP.',
      tip: 'Đừng hiểu CAP là "chọn 2 trong 3". Partition không phải lựa chọn — chỉ khi partition xảy ra bạn mới phải trade-off C và A. Lúc mạng bình thường, hệ thống có thể có cả C lẫn A.',
      example: '// Khi network partition xảy ra:\n// CP (MongoDB, HBase, Zookeeper): từ chối để tránh data cũ → mất Availability\n// AP (Cassandra, DynamoDB, Riak): vẫn trả lời nhưng có thể data cũ → mất Consistency\n//\n// P (Partition) là BẮT BUỘC vì mạng luôn có thể lỗi\n// → thực tế chỉ chọn giữa CP và AP',
    },
    {
      name: 'PACELC',
      icon: '🔀',
      explain: 'PACELC mở rộng CAP: IF Partition (P) THEN chọn Availability (A) hay Consistency (C); ELSE (E, khi mạng bình thường) chọn Latency (L) hay Consistency (C). Điểm quan trọng: ngay cả khi KHÔNG có partition, vẫn tồn tại trade-off giữa độ trễ và tính nhất quán.',
      tip: 'Phân loại quen thuộc: Cassandra và DynamoDB là PA/EL (ưu tiên availability và latency), MongoDB và HBase là PC/EC (ưu tiên nhất quán). Muốn đọc nhất quán mạnh thì phải hỏi nhiều replica → chậm hơn.',
      example: '// PACELC = if P then (A hay C) else (L hay C)\n// Cassandra / DynamoDB : PA/EL  → ưu tiên trả lời nhanh\n// MongoDB / HBase      : PC/EC  → ưu tiên nhất quán\n// Ngay cả khi KHÔNG partition (E) vẫn phải chọn Latency vs Consistency',
    },
    {
      name: 'Strong vs Eventual vs Causal',
      icon: '📶',
      explain: 'Strong consistency: sau khi ghi thành công, MỌI lần đọc tiếp theo đều thấy giá trị mới (như thể chỉ có một bản sao). Eventual consistency: các replica sẽ hội tụ về cùng giá trị SAU một khoảng thời gian, trong lúc đó có thể đọc data cũ. Causal consistency nằm ở giữa — bảo đảm thứ tự các sự kiện có quan hệ nhân quả, nhưng các sự kiện độc lập (concurrent) có thể thấy khác thứ tự.',
      tip: 'Causal consistency là điểm ngọt cho nhiều app xã hội: reply phải xuất hiện sau câu hỏi gốc (nhân quả), còn hai post độc lập thì thứ tự không quan trọng.',
      example: '// Causal: reply phải hiển thị SAU câu hỏi gốc\n// e1: A hỏi "Ai đi ăn trưa?"\n// e2: B đọc e1 rồi trả lời "Tôi đi!"  (e2 phụ thuộc e1)\n// → Causal đảm bảo mọi người thấy e1 trước e2\n//\n// Eventual: có thể tạm thấy e2 trước e1 (khó hiểu)\n// Strong  : luôn đúng thứ tự nhưng phải đồng bộ → chậm',
    },
    {
      name: 'Linearizability vs Serializability',
      icon: '🧵',
      explain: 'Hai khái niệm hay bị nhầm. Linearizability (recency guarantee) nói về MỘT object: mọi operation như xảy ra tức thời tại một điểm giữa lúc gọi và lúc trả về, theo thời gian thực → đọc luôn thấy ghi mới nhất. Serializability (isolation guarantee) nói về NHIỀU transaction: kết quả của các transaction đồng thời tương đương với việc chạy chúng tuần tự theo MỘT thứ tự nào đó (không nhất thiết theo thời gian thực). Strict Serializability = Serializability + Linearizability.',
      tip: 'Ghi nhớ: Linearizability = single-object + real-time order; Serializability = multi-object transaction isolation. Cụm "serializable isolation" của database khác với "linearizable register" trong distributed systems.',
      example: '// Linearizability (1 object, thứ tự thời gian thực):\n//   T1 ghi x=1 lúc 10:00:01 → T2 đọc x lúc 10:00:02 BẮT BUỘC thấy x=1\n//\n// Serializability (nhiều transaction):\n//   Kết quả tương đương chạy tuần tự theo MỘT thứ tự nào đó\n//   T1 chuyển tiền A→B ; T2 tính tổng A+B\n//   T2 thấy trạng thái trước HOẶC sau T1, không ở giữa\n//\n// Strict Serializable = Serializable + Linearizable',
    },
    {
      name: 'Quorum (W+R>N) & Session Guarantees',
      icon: '🗳️',
      explain: 'Quorum: với N replica, chọn W (số bản phải xác nhận khi WRITE) và R (số bản đọc khi READ). Nếu W+R>N thì tập replica được đọc CHẮC CHẮN giao với tập replica đã ghi mới nhất → đọc thấy được bản ghi mới nhất. Session guarantees hướng tới trải nghiệm một user: Read-your-writes (đọc lại thấy chính cái mình vừa ghi) và Monotonic reads (đã thấy giá trị mới thì không bao giờ thấy lại giá trị cũ hơn).',
      tip: 'W+R>N đảm bảo overlap nhưng vẫn cần versioning để chọn bản mới nhất trong tập giao. Read-your-writes thường cài bằng sticky routing (đọc từ primary một lúc sau khi ghi) để né replication lag.',
      example: '// Quorum overlap (N=3):\n//   W=2, R=2 → W+R=4 > 3 → tập đọc GIAO tập ghi → thấy bản mới\n//   W=1, R=1 → W+R=2 < 3 → có thể đọc trúng replica CHƯA có bản mới\n//\n// Read-your-writes: ghi primary → replica sync trễ → đọc replica thấy bản CŨ\n//   fix: đọc từ primary (sticky) trong vài giây sau khi ghi\n//\n// Monotonic reads: ghim user vào 1 replica → không bị tua ngược data',
    },
    {
      name: 'Lamport & Vector Clock',
      icon: '⏱️',
      explain: 'Đồng hồ vật lý giữa các máy không đáng tin (lệch, drift), nên ta dùng logical clock để đánh thứ tự sự kiện. Lamport clock gán cho mỗi sự kiện một số tăng dần: nếu A happens-before B thì L(A)<L(B) — nhưng chiều ngược lại KHÔNG đúng (L(A)<L(B) chưa chắc A→B). Vector clock cho mỗi node giữ một vector đếm sự kiện của tất cả node; so sánh hai vector cho biết chính xác là happens-before hay concurrent.',
      tip: 'Quy tắc vector clock: nếu V(A) ≤ V(B) ở mọi vị trí và có ít nhất một vị trí nhỏ hơn thì A happens-before B. Nếu không so sánh được (mỗi cái lớn hơn ở một vị trí) thì hai sự kiện là concurrent và cần chiến lược resolve.',
      example: '// Lamport: A → B suy ra L(A) < L(B) (một chiều)\n//   nhưng L(A) < L(B) KHÔNG suy ra A → B (có thể concurrent)\n//\n// Vector clock (2 node): so sánh từng vị trí\n//   A=[2,1], B=[2,3]: A ≤ B mọi vị trí và có < → A happens-before B\n//   A=[2,1], B=[1,2]: mỗi bên lớn hơn ở 1 vị trí → CONCURRENT\n//\n// Concurrent → cần resolve: last-write-wins hoặc merge (CRDT)',
    },
  ],
  demos: [
    {
      id: 'quorum-overlap',
      label: '🗳️ Quorum Overlap (W+R>N)',
      language: 'javascript',
      code: `// Quorum: N replica, W ban ghi xac nhan khi WRITE, R ban doc khi READ.
// Neu W + R > N -> tap DOC chac chan GIAO tap GHI moi nhat
// -> doc thay du lieu moi nhat.

function check(N, W, R) {
  var overlap = (W + R) > N;
  console.log("N=" + N + " W=" + W + " R=" + R
    + " | W+R=" + (W + R) + (overlap ? " > " : " <= ") + N
    + " -> " + (overlap ? "OVERLAP: doc thay ghi moi nhat"
                        : "CO THE doc trung du lieu CU"));
}

console.log("=== N = 3 replica ===");
check(3, 2, 2);   // W+R=4 > 3 -> an toan
check(3, 3, 1);   // ghi tat ca, doc 1 -> van overlap
check(3, 1, 3);   // ghi 1, doc tat ca -> van overlap
check(3, 1, 1);   // W+R=2 <= 3 -> nguy hiem: doc data cu
console.log("");

// Mo phong doc data CU khi khong du quorum:
// W=1 chi ghi 1 noi -> chi replica[0] co ban moi
var replicas = ["v2-MOI", "v1-cu", "v1-cu"];
console.log("Ghi W=1 -> chi replica[0] co v2-MOI");
console.log("Doc R=1 tu replica[2] -> thay: " + replicas[2] + " (CU!)");
console.log("Doc R=2 gom replica[1] va replica[0] -> co " + replicas[0]
  + " -> chon ban moi nhat theo version");`,
    },
    {
      id: 'vector-clock',
      label: '⏱️ Vector Clock: happens-before vs concurrent',
      language: 'javascript',
      code: `// Vector clock: moi node giu 1 vector dem su kien cua tat ca node.
// So sanh V(A) va V(B):
//   - A <= B moi vi tri va co it nhat 1 vi tri < -> A happens-before B
//   - B <= A tuong tu -> B happens-before A
//   - Khong ben nao <= ben kia -> CONCURRENT (xung dot, can resolve)

function compare(A, B) {
  var aLessEq = true, bLessEq = true, equal = true;
  for (var i = 0; i < A.length; i++) {
    if (A[i] > B[i]) aLessEq = false;
    if (B[i] > A[i]) bLessEq = false;
    if (A[i] !== B[i]) equal = false;
  }
  if (equal) return "EQUAL (cung 1 trang thai)";
  if (aLessEq) return "A happens-before B (A -> B)";
  if (bLessEq) return "B happens-before A (B -> A)";
  return "CONCURRENT (xung dot, can resolve)";
}

function show(A, B) {
  console.log("A=[" + A + "] vs B=[" + B + "] -> " + compare(A, B));
}

console.log("=== So sanh vector clock (2 node) ===");
show([2, 1], [2, 3]);   // A <= B -> A happens-before B (nhan qua)
show([1, 0], [1, 1]);   // A <= B -> A happens-before B
show([2, 1], [1, 2]);   // moi ben lon hon 1 vi tri -> CONCURRENT
show([3, 3], [3, 3]);   // giong het -> EQUAL`,
    },
    {
      id: 'read-your-writes',
      label: '🕰️ Read-your-writes & Replication Lag',
      language: 'javascript',
      code: `// Read-your-writes: sau khi GHI, chinh user do doc lai phai thay ban MOI.
// Van de: replica sync TRE -> doc tu replica chua sync thay ban CU.

var primary = { balance: 100 };
var replica = { balance: 100 };   // chua sync

function writePrimary(v) {
  primary.balance = v;            // ghi thanh cong o primary
  console.log("GHI primary: balance = " + v + " (replica CHUA sync)");
}
function readReplica() { return replica.balance; }
function readPrimary() { return primary.balance; }
function syncReplica() { replica.balance = primary.balance; }

writePrimary(500);
console.log("");
console.log("Doc tu REPLICA (chua sync) -> " + readReplica()
  + "  <- SAI: khong thay tien vua nap!");
console.log("Doc tu PRIMARY (sticky)    -> " + readPrimary()
  + "  <- DUNG: read-your-writes");
console.log("");
syncReplica();
console.log("Sau khi replica sync xong  -> doc replica: " + readReplica()
  + "  (eventual consistency da hoi tu)");`,
    },
  ],
  interactive: {
    title: '⚖️ Quorum Explorer: N replica → các bộ (W,R) thoả W+R>N',
    inputLabel: 'Số replica N (ví dụ 3, 5, 7)',
    inputPlaceholder: '5',
    inputType: 'number',
    run(value) {
      const N = Math.min(Math.max(parseInt(value) || 0, 1), 15)
      const combos = []
      for (let W = 1; W <= N; W++) {
        for (let R = 1; R <= N; R++) {
          if (W + R > N) combos.push({ W, R })
        }
      }
      const minW = combos.reduce((a, b) => (b.W < a.W ? b : a))
      const minR = combos.reduce((a, b) => (b.R < a.R ? b : a))
      const balanced = combos.reduce((a, b) =>
        Math.abs(b.W - b.R) < Math.abs(a.W - a.R) ? b : a)
      return [
        `N = ${N} replica → cần W + R > ${N} để đọc thấy ghi mới nhất`,
        ``,
        `Tổng số bộ (W,R) hợp lệ: ${combos.length}`,
        ``,
        `⚡ Ưu tiên ĐỌC nhanh  (R nhỏ): W=${minR.W}, R=${minR.R}  → ghi chậm, đọc nhanh`,
        `⚖️  Cân bằng  (W ≈ R)        : W=${balanced.W}, R=${balanced.R}`,
        `✍️  Ưu tiên GHI nhanh (W nhỏ): W=${minW.W}, R=${minW.R}  → ghi nhanh, đọc chậm`,
        ``,
        `Quy tắc: W lớn → ghi chậm (đợi nhiều replica) nhưng đọc nhanh & mới.`,
        `         R lớn → đọc chậm (hỏi nhiều replica) nhưng chắc chắn mới.`,
        N % 2 === 1
          ? `✅ N lẻ: đa số rõ ràng, tránh split-brain khi bầu quorum.`
          : `💡 Mẹo: nên chọn N lẻ để đa số quorum luôn rõ ràng.`,
      ].join('\n')
    },
  },
  callouts: [
    { type: 'success', icon: '⚖️', title: 'W+R>N = đọc thấy bản mới', body: 'Với N replica, chọn W+R>N để tập đọc luôn giao tập ghi, đảm bảo mọi read thấy được bản ghi mới nhất.' },
    { type: 'warning', icon: '🔀', title: 'PACELC vượt xa CAP', body: 'Ngay cả khi không có partition, vẫn phải đánh đổi giữa Latency và Consistency. Đừng chỉ suy nghĩ theo CAP.' },
    { type: 'info', icon: '⏱️', title: 'Vector clock phát hiện concurrent', body: 'Khi hai vector clock không so sánh được, hai sự kiện là concurrent và cần chiến lược resolve (last-write-wins hoặc CRDT).' },
  ],
  quiz: [
    {
      q: "Theo CAP theorem, khi network partition (P) xảy ra bạn buộc phải chọn giữa hai tính chất nào?",
      options: ["Consistency và Partition tolerance", "Latency và Availability", "Consistency và Availability", "Durability và Consistency"],
      answer: 2,
      explain: "Khi partition xảy ra, phải hy sinh một trong hai: Consistency (không trả data cũ) hoặc Availability (vẫn trả lời). P là điều bắt buộc phải chấp nhận.",
    },
    {
      q: "Với N=3 replica, bộ (W,R) nào KHÔNG đảm bảo đọc thấy ghi mới nhất?",
      options: ["W=1, R=3", "W=1, R=1", "W=2, R=2", "W=3, R=1"],
      answer: 1,
      explain: "Cần W+R>N. Với N=3, W=1,R=1 cho W+R=2 <= 3 nên tập đọc có thể không giao tập ghi → đọc trúng data cũ.",
    },
    {
      q: "Hai vector clock A=[2,1] và B=[1,2] có quan hệ gì?",
      options: ["Concurrent (không so sánh được)", "A happens-before B", "B happens-before A", "A và B giống hệt nhau"],
      answer: 0,
      explain: "A lớn hơn B ở vị trí 0 còn B lớn hơn A ở vị trí 1 → không bên nào <= bên kia → concurrent, cần chiến lược resolve.",
    },
    {
      q: "Điểm khác biệt chính giữa Linearizability và Serializability là gì?",
      options: ["Serializability chỉ áp dụng cho đúng một object", "Linearizability không quan tâm thứ tự đọc/ghi", "Chúng hoàn toàn giống nhau", "Linearizability là thứ tự thời gian thực trên một object; Serializability là cô lập nhiều transaction"],
      answer: 3,
      explain: "Linearizability bảo đảm recency (real-time order) trên một object; Serializability bảo đảm isolation cho nhiều transaction tương đương chạy tuần tự theo một thứ tự nào đó.",
    },
  ],
}
