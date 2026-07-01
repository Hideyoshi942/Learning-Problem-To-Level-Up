export default {
  slug: 'idempotency',
  order: 8,
  title: 'Idempotency',
  emoji: '🔁',
  description: 'Idempotency đảm bảo một operation có thể được thực hiện nhiều lần mà không tạo ra side effects khác nhau. Critical cho payment và order systems.',
  project: 'Payment Service.',
  problems: [
    { icon: '💸', title: 'Double charge', desc: 'Network timeout → client retry → payment bị tính 2 lần!' },
    { icon: '📦', title: 'Duplicate order', desc: 'User click Submit nhiều lần → nhiều đơn hàng trùng nhau.' },
  ],
  concepts: [
    {
      name: 'Idempotency Key',
      icon: '🔑',
      explain: 'Idempotency Key là unique identifier do client tạo ra (thường UUID) gửi kèm mỗi request. Server dùng key này để detect duplicate requests. Nếu key đã xử lý → trả về cached response, không xử lý lại. Stripe, PayPal, Braintree đều dùng pattern này.',
      tip: 'Client phải tạo Idempotency Key trước khi gửi request và giữ lại để retry nếu cần. Mỗi "operation" (không phải retry) cần key khác nhau.',
      example: '// Client tạo key trước khi gửi:\nconst idempotencyKey = crypto.randomUUID(); // "550e8400-e29b-41d4-a716-446655440000"\n\n// Gửi với header:\nPOST /payments\nIdempotency-Key: 550e8400-e29b-41d4-a716-446655440000\n{ "amount": 100000, "currency": "VND" }\n\n// Nếu timeout → retry với CÙNG key:\nPOST /payments\nIdempotency-Key: 550e8400-e29b-41d4-a716-446655440000\n// → Server trả về response cũ, không charge lại!',
    },
    {
      name: 'Deduplication',
      icon: '🔄',
      explain: 'Deduplication là kỹ thuật phát hiện và loại bỏ duplicate requests/messages. Server lưu Idempotency Key vào DB hoặc Redis với TTL. Khi request đến: check key → nếu tồn tại → return cached result. Cần atomic check-and-set để thread-safe.',
      tip: 'TTL của idempotency key nên đủ dài để cover retry window (thường 24 giờ). Sau TTL, key bị xóa và cùng key có thể được dùng lại (usually fine).',
      example: 'async function handlePayment(idempotencyKey, paymentData) {\n  const cacheKey = `idem:${idempotencyKey}`;\n\n  // Atomic check-and-lock:\n  const locked = await redis.set(cacheKey, "PROCESSING", "NX", "EX", 86400);\n  if (!locked) {\n    // Đang xử lý hoặc đã xử lý\n    const result = await waitForResult(cacheKey);\n    return result;\n  }\n\n  // Xử lý lần đầu:\n  const result = await processPayment(paymentData);\n  await redis.set(cacheKey, JSON.stringify(result), "EX", 86400);\n  return result;\n}',
    },
    {
      name: 'UUID',
      icon: '🆔',
      explain: 'UUID (Universally Unique Identifier) là chuỗi 128-bit đảm bảo unique trên toàn cầu. UUID v4 (random) là phổ biến nhất cho Idempotency Key. UUID v7 (time-ordered) mới hơn, tốt hơn cho database index vì monotonically increasing.',
      tip: 'UUID v4 có xác suất collision cực thấp (~1/2^122). Dùng crypto.randomUUID() (Node.js v14.17+) thay vì thư viện bên ngoài. UUID v7 recommend cho primary key DB vì sorted.',
      example: '// Node.js built-in:\nconst id = crypto.randomUUID();\n// → "550e8400-e29b-41d4-a716-446655440000"\n\n// UUID v4 format: 8-4-4-4-12 hex chars\n// xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx\n\n// UUID v7 (time-ordered, better for DB):\nimport { v7 as uuidv7 } from "uuid";\nconst id = uuidv7();\n// → "018f3a5b-e5c1-7000-bfde-1c6d9e2f3a4b"\n// Sortable! → Better B-Tree index performance',
    },
    {
      name: 'Retry with Idempotency',
      icon: '🔃',
      explain: 'Retry logic cần kết hợp với Idempotency Key để an toàn. Client retry với exponential backoff + jitter và cùng Idempotency Key. Server đảm bảo operation chỉ xảy ra một lần. Đây là pattern chuẩn cho reliable distributed systems.',
      tip: 'Exponential backoff: wait 1s, 2s, 4s, 8s... với jitter để tránh thundering herd. Max retry thường 3-5 lần. Sau đó dead letter queue hoặc alert.',
      example: 'async function payWithRetry(paymentData, maxRetries = 3) {\n  const idempotencyKey = crypto.randomUUID(); // Tạo 1 lần!\n\n  for (let attempt = 1; attempt <= maxRetries; attempt++) {\n    try {\n      return await fetch("/payments", {\n        method: "POST",\n        headers: { "Idempotency-Key": idempotencyKey },\n        body: JSON.stringify(paymentData)\n      });\n    } catch (err) {\n      if (attempt === maxRetries) throw err;\n      // Exponential backoff + jitter\n      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;\n      await sleep(delay);\n    }\n  }\n}',
    },
    {
      name: 'At-least-once Delivery',
      icon: '📬',
      explain: 'At-least-once Delivery là guarantee của message queue: message sẽ được deliver ít nhất 1 lần, nhưng có thể deliver nhiều lần (duplicate). Consumer phải idempotent để xử lý duplicate messages an toàn. Ngược lại với At-most-once (có thể mất message).',
      tip: 'At-least-once + Idempotent consumer = đảm bảo exactly-once behavior ở application level, dù queue không guarantee exactly-once.',
      example: '// Consumer phải idempotent:\nasync function processOrderCreated(message) {\n  const { orderId, event } = message;\n\n  // Check duplicate:\n  const processed = await db.query(\n    "SELECT 1 FROM processed_events WHERE event_id = ?",\n    [event.id]\n  );\n  if (processed) return; // Skip duplicate!\n\n  // Process & mark as processed atomically:\n  await db.transaction(async (trx) => {\n    await createOrder(orderId, trx);\n    await trx.insert("processed_events", { event_id: event.id });\n  });\n}',
    },
  ],
  demos: [
    {
      id: 'double-charge',
      label: '💸 Double Charge (bug)',
      language: 'javascript',
      code: `// KHÔNG có Idempotency: mạng timeout -> client retry -> bị charge NHIỀU lần
let balance = 0;
function chargeNoIdem(amount) {
  balance += amount;   // luôn thực thi, không kiểm tra trùng lặp
}

// User bấm "Thanh toán 100,000đ" 1 LẦN, nhưng timeout nên client gửi lại 3 lần
const amount = 100000;
for (let attempt = 1; attempt <= 3; attempt++) {
  chargeNoIdem(amount);
  console.log('attempt ' + attempt + ' -> đã trừ, balance = ' + balance.toLocaleString() + 'đ');
}

console.log('');
console.log('❌ User định trả 1 lần 100,000đ');
console.log('   Nhưng bị trừ: ' + balance.toLocaleString() + 'đ  (charge 3 lần!)');`,
    },
    {
      id: 'idempotency-key',
      label: '🔑 Idempotency Key (fix)',
      language: 'javascript',
      code: `// CÓ Idempotency Key: server nhớ key đã xử lý -> retry trả lại kết quả cũ,
// KHÔNG charge lại. Store (Map) mô phỏng Redis/DB với TTL.
let balance = 0;
const processed = new Map();   // idemKey -> response đã lưu

function charge(idemKey, amount) {
  if (processed.has(idemKey)) {         // đã xử lý -> trả response cũ
    return { cached: true, result: processed.get(idemKey) };
  }
  balance += amount;                    // xử lý ĐÚNG 1 lần
  const result = { status: 'charged', amount: amount };
  processed.set(idemKey, result);
  return { cached: false, result: result };
}

// Client tạo key MỘT LẦN, dùng cho MỌI lần retry của cùng giao dịch
const key = 'txn-abc-123';
const amount = 100000;
for (let attempt = 1; attempt <= 3; attempt++) {
  const r = charge(key, amount);
  console.log('attempt ' + attempt + ' -> ' + (r.cached ? '♻️  trả cache (không charge lại)' : '✅ charge mới'));
}

console.log('');
console.log('✅ Bị trừ đúng: ' + balance.toLocaleString() + 'đ  (charge 1 lần dù retry 3 lần)');`,
    },
    {
      id: 'idempotent-consumer',
      label: '📬 At-least-once + Dedup',
      language: 'javascript',
      code: `// Message queue "at-least-once": 1 message có thể được giao NHIỀU lần (trùng).
// Consumer phải idempotent -> check event id trước khi xử lý -> exactly-once về hiệu quả.
const seen = new Set();
let ordersCreated = 0;

function handleOrderEvent(eventId) {
  if (seen.has(eventId)) {            // đã xử lý -> bỏ qua bản trùng
    console.log('  ' + eventId + ' -> ⏭️  duplicate, skip');
    return;
  }
  seen.add(eventId);
  ordersCreated++;
  console.log('  ' + eventId + ' -> ✅ tạo đơn hàng');
}

// broker giao 5 message, trong đó evt-1 và evt-2 bị giao lặp
const delivered = ['evt-1', 'evt-2', 'evt-1', 'evt-3', 'evt-2'];
for (const id of delivered) handleOrderEvent(id);

console.log('');
console.log('Message nhận: ' + delivered.length + ' | Đơn hàng tạo: ' + ordersCreated + ' (đúng số event duy nhất)');`,
    },
  ],
  interactive: {
    title: '🔁 Retry thanh toán: có vs không Idempotency',
    inputLabel: 'Số lần client gửi lại (do timeout)',
    inputPlaceholder: '4',
    inputType: 'number',
    run(value) {
      const retries = Math.max(parseInt(value) || 1, 1)
      const amount = 100000
      const without = amount * retries
      const withIdem = amount
      return [
        `1 giao dịch ${amount.toLocaleString()}đ, nhưng timeout nên client gửi lại ${retries} lần:`,
        ``,
        `❌ Không idempotency: bị trừ ${without.toLocaleString()}đ  (x${retries} lần!)`,
        `✅ Có idempotency key: bị trừ ${withIdem.toLocaleString()}đ  (đúng 1 lần)`,
        ``,
        retries > 1
          ? `→ Idempotency tránh double-charge ${(without - withIdem).toLocaleString()}đ.`
          : `→ Với 1 lần gửi chưa thấy khác biệt; tăng số retry lên để thấy rõ.`,
      ].join('\n')
    },
  },
  callouts: [
    { type: 'danger', icon: '💸', title: 'Payment luôn cần Idempotency', body: 'Không có Idempotency Key trong payment API là bug nghiêm trọng. Double charge là hậu quả trực tiếp.' },
    { type: 'success', icon: '🔑', title: 'Client tạo key', body: 'Client tạo UUID trước khi gửi request. Retry dùng cùng key. Server xử lý deduplication.' },
    { type: 'info', icon: '📬', title: 'At-least-once + Idempotent = Safe', body: 'Message queue với at-least-once + idempotent consumer = exactly-once behavior ở application layer.' },
  ],
  quiz: [
    {
      q: 'Idempotency Key thường do AI tạo ra?',
      options: [
        'Server tạo sau khi nhận được request',
        'Client tạo TRƯỚC khi gửi, và giữ nguyên key đó khi retry',
        'Database tự sinh ngẫu nhiên',
        'Load balancer gắn vào',
      ],
      answer: 1,
      explain: 'Client tạo key (thường UUID) trước khi gửi và dùng LẠI đúng key đó cho mọi lần retry của cùng một thao tác → server nhận ra là trùng và không xử lý lại.',
    },
    {
      q: 'Không có idempotency, điều gì xảy ra khi client retry do timeout?',
      options: [
        'Không có gì thay đổi',
        'Request luôn bị từ chối',
        'Thao tác bị thực hiện NHIỀU lần (ví dụ double charge)',
        'Server bị crash',
      ],
      answer: 2,
      explain: 'Mỗi lần retry là một request mới với server; nếu server không dedup thì payment / đơn hàng bị tạo nhiều lần.',
    },
    {
      q: '"At-least-once delivery" kết hợp consumer idempotent cho ta điều gì?',
      options: [
        'Hiệu quả EXACTLY-ONCE ở tầng ứng dụng',
        'Chỉ còn at-most-once',
        'Chắc chắn mất message',
        'Không cần dùng queue nữa',
      ],
      answer: 0,
      explain: 'Queue có thể giao trùng (at-least-once). Nếu consumer idempotent (bỏ qua bản trùng qua event id), kết quả cuối chỉ được áp dụng 1 lần → như exactly-once mà đơn giản hơn nhiều.',
    },
    {
      q: 'Để dedup idempotency key an toàn, server cần thao tác gì?',
      options: [
        'Đọc rồi ghi ở hai bước tách rời',
        'Tuyệt đối không đặt TTL cho key',
        'Xoá key ngay sau khi vừa đọc',
        'Atomic check-and-set (ví dụ SET NX) để tránh race giữa các request trùng',
      ],
      answer: 3,
      explain: 'Nếu check và set tách rời, hai request trùng đến cùng lúc có thể cùng "thấy chưa xử lý" → xử lý 2 lần. SET NX (atomic) đảm bảo chỉ 1 request giành được quyền xử lý.',
    },
  ],
  exercises: [
    {
      id: 'fix-idempotency-charge',
      title: 'Sửa lỗi thiếu Idempotency Key gây double charge',
      task: 'Hàm charge bị lỗi: không dedup theo idempotency key nên khi client retry cùng một giao dịch 3 lần thì bị trừ tiền 3 lần. Hãy sửa để server nhớ key đã xử lý và chỉ trừ tiền đúng 1 lần dù retry. Output kỳ vọng: Tong tru = 100000.',
      buggyCode: `// BUG: khong dedup theo idempotency key -> retry bi charge nhieu lan
var balance = 0;
var processed = {};
function charge(key, amount) {
  balance += amount;                 // luon charge, khong kiem tra key da xu ly
  return { status: 'charged', amount: amount };
}
var key = 'txn-1';
for (var i = 1; i <= 3; i++) charge(key, 100000);   // retry 3 lan cung 1 giao dich
console.log('Tong tru = ' + balance);`,
      expectedOutput: 'Tong tru = 100000',
      hint: 'Trước khi charge, kiểm tra key đã có trong store processed chưa; nếu có thì trả lại kết quả cũ, nếu chưa thì charge rồi lưu key lại để lần retry sau nhận ra là trùng.',
      solution: `var balance = 0;
var processed = {};
function charge(key, amount) {
  if (processed[key]) return processed[key];   // da xu ly -> tra ket qua cu
  balance += amount;                            // charge dung 1 lan
  var result = { status: 'charged', amount: amount };
  processed[key] = result;                      // nho key da xu ly
  return result;
}
var key = 'txn-1';
for (var i = 1; i <= 3; i++) charge(key, 100000);
console.log('Tong tru = ' + balance);`,
    },
  ],
}
