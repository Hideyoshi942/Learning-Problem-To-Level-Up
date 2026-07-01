export default {
  slug: 'distributed-lock',
  order: 9,
  title: 'Distributed Lock',
  emoji: '🔐',
  description: 'Distributed Lock ngăn nhiều instance cùng xử lý một resource. Quan trọng trong môi trường microservices và horizontal scaling.',
  project: 'Hệ thống đặt vé.',
  problems: [
    { icon: '🎭', title: 'Race condition', desc: '2 users cùng mua vé cuối → oversell!' },
    { icon: '💀', title: 'Deadlock phân tán', desc: 'Lock không được release do process crash.' },
  ],
  concepts: [
    {
      name: 'Redis SETNX',
      icon: '🔴',
      explain: 'SETNX (SET if Not eXists) là lệnh Redis đặt key chỉ khi chưa tồn tại. Dùng để implement distributed lock: SET key value NX EX timeout. Atomic trong Redis (single-threaded). Nếu SET thành công → có lock. Nếu fail → người khác đang giữ lock.',
      tip: 'Luôn set TTL (EX) cùng lúc với NX trong một lệnh SET. Không dùng SETNX rồi EXPIRE riêng – có thể process crash giữa 2 lệnh → lock không bao giờ expire.',
      example: '// ✅ Atomic SET với NX và EX:\nconst lockAcquired = await redis.set(\n  "lock:ticket:42",    // key\n  "owner-uuid-1234",   // value (owner ID để verify)\n  "NX",               // Only set if not exists\n  "EX", 30            // Expire sau 30 giây\n);\n\nif (!lockAcquired) {\n  throw new Error("Resource locked, try again");\n}\n\ntry {\n  await processPurchase(ticket);\n} finally {\n  await releaseLock("lock:ticket:42", "owner-uuid-1234");\n}',
    },
    {
      name: 'Redlock Algorithm',
      icon: '🔒',
      explain: 'Redlock là thuật toán của Redis cho distributed lock với multiple Redis nodes. Để acquire lock: cố gắng set lock trên N nodes (≥3). Nếu majority (N/2+1) thành công trong thời gian ngắn → lock acquired. Giải quyết vấn đề single Redis node failure.',
      tip: 'Redlock bị Martin Kleppmann phê bình vì không đảm bảo safety với clock skew và GC pauses. Dùng fencing token để safe hơn khi critical. Với non-critical workloads, single Redis node SETNX đủ.',
      example: '// Redlock với 5 Redis nodes:\n// Cần acquire lock trên ít nhất 3/5 nodes\n\nconst redlock = new Redlock([redis1, redis2, redis3, redis4, redis5]);\n\ntry {\n  // Acquire lock với TTL 30s, retry 3 lần\n  const lock = await redlock.acquire(["lock:resource"], 30000);\n\n  try {\n    await criticalSection();\n  } finally {\n    await lock.release(); // Release trên tất cả nodes\n  }\n} catch (err) {\n  // Không acquire được lock\n}',
    },
    {
      name: 'ZooKeeper',
      icon: '🦁',
      explain: 'ZooKeeper là distributed coordination service, thường dùng cho distributed lock, leader election, và service discovery. Dùng ephemeral nodes (tự xóa khi client disconnect) để implement lock an toàn hơn Redis – không cần TTL vì node tự xóa khi holder crash.',
      tip: 'ZooKeeper phức tạp hơn Redis nhưng cung cấp stronger consistency (ZAB protocol). Dùng khi cần strict ordering và strong consistency. Kubernetes, Kafka dùng ZooKeeper (hoặc KRaft thay thế mới hơn).',
      example: '// ZooKeeper Distributed Lock (Java/Curator):\nInterProcessMutex lock = new InterProcessMutex(\n  client, "/locks/ticket-42"\n);\n\nif (lock.acquire(30, TimeUnit.SECONDS)) {\n  try {\n    processPurchase(ticket);\n  } finally {\n    lock.release();\n  }\n} else {\n  throw new Exception("Could not acquire lock");\n}\n\n// Ephemeral node tự xóa nếu client crash\n// → Không cần lo lock bị giữ mãi',
    },
    {
      name: 'Lease Timeout',
      icon: '⏱️',
      explain: 'Lease Timeout là TTL của lock – thời gian tối đa một process được giữ lock. Nếu process crash mà không release, lock sẽ tự expire sau timeout. Quan trọng để tránh lock bị giữ mãi (lock leak). Timeout phải đủ dài cho operation nhưng không quá dài.',
      tip: 'Timeout nên = expected_duration × safety_factor (ví dụ: 2-3x). Nếu operation thường mất 1s, set timeout 10s. Implement lock renewal (heartbeat) cho long-running operations.',
      example: '// Lock renewal cho long-running operations:\nconst LOCK_TTL = 30; // 30 giây\n\nasync function acquireWithRenewal(key) {\n  await redis.set(key, "owner", "NX", "EX", LOCK_TTL);\n\n  // Heartbeat: renew mỗi 10 giây\n  const heartbeat = setInterval(async () => {\n    await redis.expire(key, LOCK_TTL); // Reset TTL\n  }, 10000);\n\n  return () => {\n    clearInterval(heartbeat);\n    redis.del(key); // Release\n  };\n}\n\nconst release = await acquireWithRenewal("lock:job");\ntry { await longRunningJob(); }\nfinally { release(); }',
    },
    {
      name: 'Fencing Token',
      icon: '🛡️',
      explain: 'Fencing Token giải quyết vấn đề "lock held by dead process but storage still accepts writes": mỗi lần lock được granted, server cấp một monotonically increasing token. Client phải gửi token kèm mọi request. Server reject requests với token cũ hơn token hiện tại.',
      tip: 'Fencing Token là giải pháp đúng đắn nhất theo Martin Kleppmann. Cần server-side support. ZooKeeper cung cấp epoch/zxid. Redis có thể dùng counter.',
      example: '// Fencing Token flow:\n// 1. Client A acquires lock → token = 33\n// 2. Client A bị GC pause dài (lock expire)\n// 3. Client B acquires lock → token = 34\n// 4. Client A tỉnh dậy, gửi request với token=33\n// 5. Storage server thấy token=33 < current=34\n//    → REJECT Client A\'s write! ✅\n\n// Implementation:\nconst { token } = await acquireLock("resource");\n// Gửi token kèm mỗi request:\nawait storageServer.write(data, { fencingToken: token });\n// Storage check: if (token < lastSeenToken) reject;',
    },
  ],
  demos: [
    {
      id: 'race-condition',
      label: '🎭 Race Condition (oversell)',
      language: 'javascript',
      code: `// Race condition: 2 người cùng mua chiếc vé CUỐI, KHÔNG có khoá.
// "Đồng thời" = cả hai ĐỌC tồn kho TRƯỚC khi bất kỳ ai kịp GHI.
let stock = 1;   // còn đúng 1 vé
let sold = 0;

const seenA = stock;   // A đọc: thấy còn 1
const seenB = stock;   // B đọc: thấy còn 1 (A chưa kịp ghi)

if (seenA > 0) { stock = seenA - 1; sold++; console.log('A thấy còn ' + seenA + ' -> ✅ mua được'); }
if (seenB > 0) { stock = seenB - 1; sold++; console.log('B thấy còn ' + seenB + ' -> ✅ mua được'); }

console.log('');
console.log('Vé bán: ' + sold + ' | Tồn kho: ' + stock);
console.log('❌ OVERSELL! Chỉ có 1 vé nhưng bán ' + sold + ', tồn kho âm (' + stock + ').');`,
    },
    {
      id: 'setnx-lock',
      label: '🔴 Redis SETNX Lock (fix)',
      language: 'javascript',
      code: `// Distributed Lock (SETNX): chỉ 1 process vào "vùng tới hạn" tại một thời điểm.
// -> read-modify-write trở thành thao tác NGUYÊN TỬ.
let stock = 1;
let sold = 0;
let lock = null;   // giả lập Redis: SET key value NX

function tryLock(owner) {
  if (lock === null) { lock = owner; return true; }  // NX: chỉ set khi CHƯA tồn tại
  return false;
}
function unlock(owner) { if (lock === owner) lock = null; }   // chỉ chủ lock mới nhả

function buy(user) {
  if (!tryLock('lock:ticket')) { console.log(user + ' -> ⏳ không lấy được lock'); return; }
  try {
    const seen = stock;                 // đọc AN TOÀN trong lock
    if (seen > 0) { stock = seen - 1; sold++; console.log(user + ' -> ✅ mua được'); }
    else { console.log(user + ' -> ❌ hết vé'); }
  } finally {
    unlock('lock:ticket');              // LUÔN nhả lock (dù thành công hay lỗi)
  }
}

buy('A');   // A vào lock, mua, rồi nhả
buy('B');   // B mới vào được -> thấy đã hết

console.log('');
console.log('Vé bán: ' + sold + ' | Tồn kho: ' + stock);
console.log('✅ Không oversell: đúng 1 vé được bán.');`,
    },
    {
      id: 'fencing-token',
      label: '🛡️ Fencing Token',
      language: 'javascript',
      code: `// Vì sao lock thôi CHƯA đủ? Process có thể bị "đơ" (GC pause) đủ lâu để lock
// HẾT HẠN mà nó không biết -> ghi đè dữ liệu của người sau.
// Fix: mỗi lần cấp lock -> 1 token TĂNG DẦN. Storage từ chối token CŨ.
let currentToken = 0;
function acquire() { currentToken++; return currentToken; }

let lastSeenToken = 0;
function write(data, token) {
  if (token < lastSeenToken) {   // token cũ hơn cái đã thấy -> chặn
    console.log('write "' + data + '" (token=' + token + ') -> ❌ REJECT: đã có token ' + lastSeenToken);
    return;
  }
  lastSeenToken = token;
  console.log('write "' + data + '" (token=' + token + ') -> ✅ OK');
}

const tokenA = acquire();          // 1) Client A lấy lock -> token 1
// 2) A bị GC pause lâu -> lock của A hết hạn
const tokenB = acquire();          // 3) Client B lấy lock -> token 2
write('from B', tokenB);           //    B ghi thành công (lastSeen = 2)
write('from A (stale)', tokenA);   // 4) A "tỉnh dậy", ghi với token cũ = 1 -> BỊ CHẶN

console.log('');
console.log('🛡️  Fencing token chặn được ghi đè từ process giữ lock đã hết hạn.');`,
    },
  ],
  interactive: {
    title: '🔐 N người cùng mua 1 vé cuối',
    inputLabel: 'Số người bấm "Mua" cùng lúc',
    inputPlaceholder: '50',
    inputType: 'number',
    run(value) {
      const n = Math.max(parseInt(value) || 1, 1)
      return [
        `Còn đúng 1 vé, ${n} người bấm "Mua" cùng lúc:`,
        ``,
        `❌ Không khoá: tối đa ${n} người cùng đọc "còn 1 vé" → có thể bán ${n} vé (oversell ${n - 1}).`,
        `✅ Có distributed lock: chỉ 1 người vào vùng tới hạn → bán đúng 1 vé, ${n - 1} người báo "hết vé".`,
        ``,
        `→ Lock biến read-modify-write thành thao tác nguyên tử (atomic).`,
      ].join('\n')
    },
  },
  callouts: [
    { type: 'success', icon: '🔴', title: 'Redis SETNX cho hầu hết cases', body: 'Single Redis SETNX với NX+EX đủ tốt cho hầu hết distributed lock use cases. Đơn giản và hiệu quả.' },
    { type: 'warning', icon: '🔒', title: 'Redlock cho high availability', body: 'Dùng Redlock khi cần HA và không thể chấp nhận lock failure khi một Redis node down.' },
    { type: 'info', icon: '🛡️', title: 'Fencing Token cho correctness', body: 'Với truly critical operations, kết hợp lock với fencing token để đảm bảo correctness kể cả khi clock skew xảy ra.' },
  ],
  quiz: [
    {
      q: 'Vì sao 2 người có thể cùng mua chiếc vé cuối khi KHÔNG có lock?',
      options: [
        'Vì database bị lỗi',
        'Vì hệ thống tự nhân đôi vé',
        'Vì cả hai ĐỌC tồn kho (còn 1) trước khi ai kịp GHI giảm số',
        'Vì mạng quá chậm',
      ],
      answer: 2,
      explain: 'Read-modify-write không nguyên tử: cả hai đọc "còn 1", cả hai thấy hợp lệ, cả hai ghi giảm → bán 2 vé (oversell), tồn kho âm.',
    },
    {
      q: 'Vì sao lệnh SET phải kèm NX và EX (TTL) trong CÙNG một lệnh?',
      options: [
        'Để nếu process crash sau khi lấy lock, lock vẫn tự hết hạn (không kẹt vĩnh viễn)',
        'Để Redis chạy nhanh hơn',
        'Để lock không bao giờ hết hạn',
        'Để cho nhiều người cùng giữ một lock',
      ],
      answer: 0,
      explain: 'Nếu tách SETNX rồi EXPIRE thành 2 lệnh, process có thể crash ở giữa → lock không có TTL → kẹt mãi. SET key val NX EX gộp atomic để tránh điều đó.',
    },
    {
      q: 'Fencing Token giải quyết vấn đề gì mà lock + TTL vẫn còn?',
      options: [
        'Lock được cấp quá nhanh',
        'Redis hết RAM',
        'Client không kết nối được',
        'Process bị pause (GC) đủ lâu để lock hết hạn, khi tỉnh dậy vẫn ghi đè dữ liệu của người sau',
      ],
      answer: 3,
      explain: 'Mỗi lần cấp lock kèm 1 token tăng dần; storage từ chối token cũ hơn token mới nhất → thao tác ghi từ chủ lock đã hết hạn bị chặn.',
    },
    {
      q: 'Distributed lock biến thao tác read-modify-write thành gì?',
      options: [
        'Thao tác chạy nhanh hơn',
        'Thao tác NGUYÊN TỬ — chỉ 1 process trong vùng tới hạn tại một thời điểm',
        'Thao tác bất đồng bộ',
        'Thao tác không cần database',
      ],
      answer: 1,
      explain: 'Lock serialize truy cập: chỉ một process vào vùng tới hạn nên đọc-sửa-ghi diễn ra trọn vẹn trước khi người khác vào → không oversell.',
    },
  ],
  exercises: [
    {
      id: 'fix-lock-oversell',
      title: 'Sửa lỗi thiếu lock gây oversell vé',
      task: 'Đoạn code mô phỏng 2 người cùng mua chiếc vé cuối. Vì thiếu lock quanh read-modify-write nên cả hai cùng đọc còn 1 vé rồi cùng ghi, dẫn tới bán 2 vé (oversell). Các hàm tryLock/unlock đã có sẵn nhưng chưa được dùng. Hãy bọc thao tác đọc-sửa-ghi trong lock và xử lý tuần tự để chỉ bán đúng 1 vé. Output kỳ vọng: Ve ban = 1 và Ton kho = 0.',
      buggyCode: `// BUG: thieu lock quanh read-modify-write -> 2 nguoi mua 1 ve (oversell)
var stock = 1;   // con dung 1 ve
var sold = 0;
var lock = null;
function tryLock(o) { if (lock === null) { lock = o; return true; } return false; }
function unlock(o) { if (lock === o) lock = null; }

// mo phong 2 request DONG THOI: ca hai doc ton kho TRUOC khi ai kip ghi
var seenA = stock;   // A thay con 1
var seenB = stock;   // B cung thay con 1 (khong lock nen A chua kip ghi)
if (seenA > 0) { stock = seenA - 1; sold++; }
if (seenB > 0) { stock = seenB - 1; sold++; }

console.log('Ve ban = ' + sold);
console.log('Ton kho = ' + stock);`,
      expectedOutput: 'Ve ban = 1\nTon kho = 0',
      hint: 'Bọc toàn bộ read-modify-write trong tryLock/unlock để mỗi người mua đọc tồn kho sau khi người trước đã ghi xong; gọi buy tuần tự cho từng người.',
      solution: `var stock = 1;
var sold = 0;
var lock = null;
function tryLock(o) { if (lock === null) { lock = o; return true; } return false; }
function unlock(o) { if (lock === o) lock = null; }

function buy(user) {
  if (!tryLock('L')) return;                 // chi 1 process vao vung toi han
  try {
    var seen = stock;                         // doc AN TOAN trong lock
    if (seen > 0) { stock = seen - 1; sold++; }
  } finally {
    unlock('L');                              // luon nha lock
  }
}

// xu ly tuan tu: moi nguoi vao vung toi han lan luot
buy('A');
buy('B');

console.log('Ve ban = ' + sold);
console.log('Ton kho = ' + stock);`,
    },
  ],
}
