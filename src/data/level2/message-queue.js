export default {
  slug: 'message-queue',
  order: 10,
  title: 'Message Queue',
  emoji: '📨',
  description: 'Message Queue tách coupling giữa services, cho phép async processing và retry logic. Kafka, RabbitMQ là 2 hệ thống phổ biến nhất.',
  project: 'Order Service + Notification Service.',
  problems: [
    { icon: '🔗', title: 'Tight coupling', desc: 'Order service gọi thẳng notification service → nếu notification fail thì order cũng fail.' },
    { icon: '⚡', title: 'Slow synchronous flow', desc: 'User phải chờ email/SMS được gửi mới nhận response.' },
  ],
  concepts: [
    {
      name: 'Producer/Consumer',
      icon: '🏭',
      explain: 'Producer tạo và gửi messages vào queue. Consumer đọc và xử lý messages. Producer và Consumer hoàn toàn decoupled – không biết nhau, chạy độc lập, có thể scale riêng. Queue là buffer đảm bảo messages không bị mất khi consumer bận.',
      tip: 'Có thể có nhiều producers và nhiều consumers (consumer group). Consumer group trong Kafka: mỗi partition chỉ được một consumer trong group xử lý. RabbitMQ: competing consumers.',
      example: '// Producer:\nawait kafka.producer().send({\n  topic: "order-created",\n  messages: [{\n    key: orderId,\n    value: JSON.stringify({ orderId, userId, amount })\n  }]\n});\n\n// Consumer:\nconst consumer = kafka.consumer({ groupId: "email-service" });\nawait consumer.subscribe({ topic: "order-created" });\nawait consumer.run({\n  eachMessage: async ({ message }) => {\n    const order = JSON.parse(message.value);\n    await sendConfirmationEmail(order);\n  }\n});',
    },
    {
      name: 'Dead Letter Queue',
      icon: '☠️',
      explain: 'Dead Letter Queue (DLQ) là queue đặc biệt chứa các messages không xử lý được sau N lần retry. Thay vì bỏ message, DLQ lưu lại để debug và xử lý thủ công. Ngăn "poison pill" messages block toàn bộ queue.',
      tip: 'Luôn cấu hình DLQ và monitoring. Setup alert khi DLQ có message. Implement dashboard để view và requeue messages từ DLQ. Đây là safety net quan trọng.',
      example: '// RabbitMQ DLQ config:\nconst channel = await connection.createChannel();\n\n// Main queue với DLQ config:\nawait channel.assertQueue("orders", {\n  durable: true,\n  arguments: {\n    "x-dead-letter-exchange": "orders.dlx",\n    "x-dead-letter-routing-key": "orders.dead",\n    "x-max-retries": 3\n  }\n});\n\n// Dead letter queue:\nawait channel.assertQueue("orders.dead", { durable: true });\n\n// Consumer reject → moves to DLQ after 3 attempts:\nchannel.nack(msg, false, false); // requeue=false → DLQ',
    },
    {
      name: 'At-least-once',
      icon: '📬',
      explain: 'At-least-once delivery: message được deliver ít nhất 1 lần, có thể nhiều hơn. Consumer ack message SAU khi xử lý xong. Nếu consumer crash trước khi ack → broker redeliver. Đây là default của RabbitMQ và Kafka consumer với manual commit.',
      tip: 'At-least-once là lựa chọn phổ biến nhất. Consumer phải idempotent để xử lý duplicate an toàn. Dùng Idempotency Key hoặc check duplicate trước khi xử lý.',
      example: '// RabbitMQ - Manual ack (at-least-once):\nchannel.consume("orders", async (msg) => {\n  try {\n    await processOrder(JSON.parse(msg.content));\n    channel.ack(msg);  // Ack SAU khi xử lý xong\n  } catch (err) {\n    channel.nack(msg, false, true); // Requeue nếu fail\n  }\n}, { noAck: false }); // noAck=false = manual ack\n\n// Kafka - Manual offset commit:\nconst { messages } = await consumer.fetch();\nfor (const msg of messages) {\n  await processMessage(msg);\n}\nawait consumer.commitOffsets(); // Commit sau khi xử lý',
    },
    {
      name: 'At-most-once',
      icon: '📭',
      explain: 'At-most-once delivery: message được deliver tối đa 1 lần, có thể bị mất. Consumer ack message TRƯỚC khi xử lý. Nếu processing fail → message bị mất. Phù hợp cho log, metrics, analytics – nơi mất một số messages chấp nhận được. Throughput cao hơn.',
      tip: 'Không dùng At-most-once cho financial, order, hay bất kỳ business-critical operations. Chỉ dùng cho use cases mà mất message là chấp nhận được.',
      example: '// Kafka - Auto commit (at-most-once risk):\n// enable.auto.commit=true, auto.commit.interval.ms=5000\n// Message có thể committed offset trước khi xử lý xong\n\n// RabbitMQ autoAck (at-most-once):\nchannel.consume("logs", (msg) => {\n  // Ack ngay lập tức khi nhận (trước khi process!)\n  // Nếu crash ở đây → message mất!\n  processLog(JSON.parse(msg.content));\n}, { noAck: true }); // noAck=true = auto ack immediately',
    },
    {
      name: 'Exactly-once',
      icon: '🎯',
      explain: 'Exactly-once: message được xử lý đúng 1 lần, không mất, không duplicate. Khó nhất trong 3 delivery semantics. Kafka hỗ trợ Exactly-once Semantics (EOS) với Idempotent Producer + Transactional API. Rất tốn tài nguyên, chỉ dùng khi thực sự cần.',
      tip: 'Thực tế: At-least-once + Idempotent Consumer thường đủ và đơn giản hơn. Truly Exactly-once chỉ cần cho financial transactions với strict audit requirements.',
      example: '// Kafka Exactly-once với Transactions:\nconst producer = kafka.producer({\n  transactionalId: "payment-processor-1",\n  idempotent: true\n});\nawait producer.connect();\n\nawait producer.transaction(async (txn) => {\n  await txn.send({\n    topic: "payment-completed",\n    messages: [{ value: JSON.stringify(payment) }]\n  });\n  // Commit offset và send trong cùng transaction:\n  await txn.sendOffsets({ consumer, topics: [...] });\n});\n// → Đảm bảo exactly-once end-to-end',
    },
    {
      name: 'Kafka Partition',
      icon: '🗂️',
      explain: 'Kafka topic được chia thành nhiều partitions. Mỗi partition là ordered, immutable log. Partition là đơn vị parallelism – mỗi partition chỉ được 1 consumer trong group xử lý. Tăng partition = tăng throughput. Message có cùng key luôn vào cùng partition (ordering guarantee).',
      tip: 'Số partition quyết định max parallelism. Partition không giảm được (chỉ tăng). Dùng key-based partitioning để đảm bảo ordering cho related events (e.g., tất cả events của cùng user_id vào cùng partition).',
      example: '// Key-based partitioning:\nawait producer.send({\n  topic: "user-events",\n  messages: [{\n    key: userId.toString(), // → cùng partition cho cùng user\n    value: JSON.stringify(event)\n  }]\n});\n// → Tất cả events của user 123 ordered trong 1 partition\n\n// Consumer group với 3 partitions, 3 consumers:\n// Consumer 1 → Partition 0\n// Consumer 2 → Partition 1\n// Consumer 3 → Partition 2\n// → 3x throughput! ⚡',
    },
    {
      name: 'RabbitMQ Exchange',
      icon: '🐰',
      explain: 'RabbitMQ Exchange nhận messages từ producers và route đến queues theo routing rules. 4 loại: Direct (exact key match), Topic (wildcard pattern), Fanout (broadcast đến tất cả queues), Headers (match headers thay vì routing key). Binding là connection giữa exchange và queue.',
      tip: 'Direct Exchange cho simple routing. Topic Exchange cho flexible routing với wildcards (*, #). Fanout Exchange cho pub/sub broadcast. Dùng dead letter exchange cho error handling.',
      example: '// Topic Exchange routing:\nawait channel.assertExchange("events", "topic", { durable: true });\n\n// Queues binding với routing patterns:\nawait channel.bindQueue("order-service", "events", "order.*");\nawait channel.bindQueue("email-service", "events", "order.created");\nawait channel.bindQueue("analytics", "events", "#"); // All\n\n// Publish:\nchannel.publish("events", "order.created", content);\n// → Routes to: order-service, email-service, analytics\nchannel.publish("events", "order.shipped", content);\n// → Routes to: order-service, analytics (only)',
    },
  ],
  demos: [
    {
      id: 'sync-vs-async',
      label: '⚡ Đồng bộ vs Queue',
      language: 'javascript',
      code: `// Gọi thẳng (coupling chặt): user phải CHỜ order + email + sms xong mới có response.
const ORDER_MS = 50, EMAIL_MS = 300, SMS_MS = 200;
const syncLatency = ORDER_MS + EMAIL_MS + SMS_MS;

// Qua queue (bất đồng bộ): chỉ ghi đơn + đẩy message vào queue rồi trả về NGAY.
// email/sms do consumer xử lý sau, không chặn user.
const PUBLISH_MS = 5;
const asyncLatency = ORDER_MS + PUBLISH_MS;

console.log('Đồng bộ (gọi thẳng) : ' + syncLatency + 'ms  = order + email + sms');
console.log('Qua queue           : ' + asyncLatency + 'ms  = order + publish');
console.log('');
console.log('⚡ Phản hồi cho user nhanh gấp ' + (syncLatency / asyncLatency).toFixed(1) + 'x.');
console.log('Bonus: email service chết thì đơn hàng VẪN tạo được (đã decoupled).');`,
    },
    {
      id: 'dlq',
      label: '☠️ Dead Letter Queue',
      language: 'javascript',
      code: `// Dead Letter Queue: message fail sau N lần retry -> chuyển sang DLQ,
// không làm kẹt cả queue vì 1 "poison message".
const MAX_RETRY = 3;
const mainQueue = ['msg-1', 'poison-2', 'msg-3'];   // poison-2 luôn fail
const dlq = [];
let processed = 0;

function handle(msg) {
  if (msg.indexOf('poison') === 0) throw new Error('cannot process');
  processed++;
}

for (const msg of mainQueue) {
  let ok = false;
  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    try {
      handle(msg);
      ok = true;
      console.log(msg + ' -> ✅ ok (lần ' + attempt + ')');
      break;
    } catch (e) {
      console.log(msg + ' -> ❌ fail lần ' + attempt + ' (' + e.message + ')');
    }
  }
  if (!ok) { dlq.push(msg); console.log(msg + ' -> ☠️  vào DLQ sau ' + MAX_RETRY + ' lần retry'); }
}

console.log('');
console.log('Xử lý ok: ' + processed + ' | Trong DLQ: ' + dlq.length + ' [' + dlq.join(', ') + ']');`,
    },
    {
      id: 'kafka-partition',
      label: '🗂️ Kafka Partition Ordering',
      language: 'javascript',
      code: `// Kafka: message CÙNG key -> CÙNG partition -> giữ đúng THỨ TỰ.
// Partition là đơn vị song song: nhiều partition -> nhiều consumer chạy song song.
const PARTITIONS = 3;
function partitionOf(key) {
  let h = 0;                              // hash đơn giản: tổng mã ký tự % số partition
  for (let i = 0; i < key.length; i++) h += key.charCodeAt(i);
  return h % PARTITIONS;
}

const events = [
  { key: 'user-1', ev: 'created' },
  { key: 'user-2', ev: 'created' },
  { key: 'user-1', ev: 'paid' },
  { key: 'user-1', ev: 'shipped' },
  { key: 'user-2', ev: 'paid' },
];

const parts = [[], [], []];
for (const e of events) parts[partitionOf(e.key)].push(e.key + ':' + e.ev);

for (let p = 0; p < PARTITIONS; p++) {
  console.log('Partition ' + p + ': ' + (parts[p].join('  ->  ') || '(trống)'));
}
console.log('');
console.log('✅ Mọi event của user-1 nằm cùng 1 partition -> đúng thứ tự created -> paid -> shipped.');`,
    },
  ],
  interactive: {
    title: '📨 Đồng bộ vs Queue khi có N service phụ',
    inputLabel: 'Số service phụ (email, sms, ...), mỗi cái ~200ms',
    inputPlaceholder: '5',
    inputType: 'number',
    run(value) {
      const n = Math.max(parseInt(value) || 0, 0)
      const CORE = 50, EACH = 200, PUBLISH = 5
      const sync = CORE + n * EACH
      const viaQueue = CORE + PUBLISH
      return [
        `Nghiệp vụ chính ${CORE}ms + ${n} service phụ (mỗi cái ${EACH}ms):`,
        ``,
        `❌ Đồng bộ (gọi thẳng): ${sync}ms user phải chờ`,
        `✅ Qua queue          : ${viaQueue}ms (chỉ chờ core + publish)`,
        ``,
        n > 0
          ? `→ Nhanh gấp ${(sync / viaQueue).toFixed(1)}x, và các service phụ độc lập (1 cái chết không kéo đổ đơn hàng).`
          : `→ Chưa có service phụ; thêm vài cái để thấy queue tách coupling thế nào.`,
      ].join('\n')
    },
  },
  callouts: [
    { type: 'success', icon: '📬', title: 'At-least-once + Idempotent', body: 'Đây là pattern chuẩn. At-least-once delivery với idempotent consumer = effectively exactly-once với ít complexity hơn.' },
    { type: 'warning', icon: '☠️', title: 'Luôn cấu hình DLQ', body: 'Dead Letter Queue là safety net. Không có DLQ = messages bị mất âm thầm khi xử lý fail.' },
    { type: 'info', icon: '🗂️', title: 'Kafka vs RabbitMQ', body: 'Kafka: high throughput, event streaming, replay. RabbitMQ: complex routing, priority queues, short-lived messages.' },
  ],
  quiz: [
    {
      q: 'Lợi ích chính khi chuyển từ gọi đồng bộ sang dùng message queue là gì?',
      options: [
        'Đơn hàng được tính chính xác hơn',
        'Decoupling + phản hồi nhanh (user không phải chờ email/sms), service phụ chết không kéo đổ nghiệp vụ chính',
        'Không cần database nữa',
        'Bảo mật cao hơn tự động',
      ],
      answer: 1,
      explain: 'Producer chỉ đẩy message rồi trả về ngay; consumer xử lý sau. Order service không còn phụ thuộc trực tiếp vào notification service.',
    },
    {
      q: 'Dead Letter Queue (DLQ) dùng để làm gì?',
      options: [
        'Tăng tốc độ xử lý của queue',
        'Lưu lại các message đã xử lý thành công',
        'Xoá hẳn các message lỗi',
        'Chứa message fail sau N lần retry để không làm kẹt queue và để debug/xử lý sau',
      ],
      answer: 3,
      explain: 'Một "poison message" xử lý mãi không được sẽ chặn cả queue; DLQ tách chúng ra làm safety net và để xem lại sau.',
    },
    {
      q: 'Trong Kafka, message có CÙNG key được đảm bảo điều gì?',
      options: [
        'Vào CÙNG một partition → giữ đúng thứ tự',
        'Bị loại bỏ vì trùng',
        'Rải vào các partition khác nhau',
        'Luôn bị xử lý 2 lần',
      ],
      answer: 0,
      explain: 'Key-based partitioning: hash(key) % số partition → mọi event cùng key (ví dụ cùng user) vào cùng partition, mà mỗi partition là một log có thứ tự.',
    },
    {
      q: '"At-most-once" khác "at-least-once" ở điểm nào?',
      options: [
        'At-most-once giao nhiều lần hơn',
        'Hai cái hoàn toàn giống nhau',
        'At-most-once có thể MẤT message (ack trước khi xử lý); at-least-once có thể TRÙNG (ack sau khi xử lý)',
        'At-least-once thì luôn mất message',
      ],
      answer: 2,
      explain: 'Ack trước khi xử lý → crash thì mất (at-most-once, hợp cho log/metrics). Ack sau khi xử lý → có thể redeliver gây trùng (at-least-once, cần consumer idempotent).',
    },
  ],
  exercises: [
    {
      id: 'fix-consumer-dedup',
      title: 'Sửa lỗi consumer không dedup gây đơn trùng',
      task: 'Consumer nhận message theo cơ chế at-least-once nên vài message bị giao lặp (evt-1, evt-2 xuất hiện 2 lần). Vì không dedup theo eventId, consumer tạo đơn cho cả bản trùng nên số đơn nhiều hơn số event thực. Hãy dùng Set để bỏ qua eventId đã xử lý, số đơn phải bằng số event duy nhất. Output kỳ vọng: So don = 3.',
      buggyCode: `// BUG: consumer khong dedup -> message trung tao don trung
var ordersCreated = 0;
var seen = new Set();
function handle(eventId) {
  ordersCreated++;                 // tao don ma khong kiem tra trung
}
// at-least-once: evt-1 va evt-2 bi giao lap
var delivered = ['evt-1', 'evt-2', 'evt-1', 'evt-3', 'evt-2'];
for (var i = 0; i < delivered.length; i++) handle(delivered[i]);
console.log('So don = ' + ordersCreated);`,
      expectedOutput: 'So don = 3',
      hint: 'Trước khi tạo đơn, kiểm tra seen.has(eventId); nếu đã có thì return để bỏ qua bản trùng, nếu chưa thì seen.add(eventId) rồi mới tăng số đơn.',
      solution: `var ordersCreated = 0;
var seen = new Set();
function handle(eventId) {
  if (seen.has(eventId)) return;   // da xu ly -> bo qua ban trung
  seen.add(eventId);
  ordersCreated++;
}
var delivered = ['evt-1', 'evt-2', 'evt-1', 'evt-3', 'evt-2'];
for (var i = 0; i < delivered.length; i++) handle(delivered[i]);
console.log('So don = ' + ordersCreated);`,
    },
  ],
}
