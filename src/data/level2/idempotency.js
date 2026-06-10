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
  demos: [{
    id: 'coming-soon', label: '🚧 Coming Soon',
    language: 'javascript', code: `console.log('Idempotency – demos coming soon!');`,
  }],
  interactive: null,
  callouts: [
    { type: 'danger', icon: '💸', title: 'Payment luôn cần Idempotency', body: 'Không có Idempotency Key trong payment API là bug nghiêm trọng. Double charge là hậu quả trực tiếp.' },
    { type: 'success', icon: '🔑', title: 'Client tạo key', body: 'Client tạo UUID trước khi gửi request. Retry dùng cùng key. Server xử lý deduplication.' },
    { type: 'info', icon: '📬', title: 'At-least-once + Idempotent = Safe', body: 'Message queue với at-least-once + idempotent consumer = exactly-once behavior ở application layer.' },
  ],
}
