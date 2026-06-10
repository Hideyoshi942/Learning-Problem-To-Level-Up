export default {
  slug: 'event-driven',
  order: 12,
  title: 'Event Driven Architecture',
  emoji: '⚡',
  description: 'Event Bus, Event Streaming, CQRS để xây dựng hệ thống loosely coupled.',
  project: 'Order Processing System.',
  problems: [
    { icon: '🔗', title: 'Tight coupling giữa services', desc: 'Order service gọi trực tiếp Email, Inventory, Analytics → nếu một service down, cả flow bị block. Thêm service mới = sửa code Order service.' },
    { icon: '🐌', title: 'Synchronous blocking calls', desc: 'User phải chờ email được gửi, inventory được update xong mới nhận response. Latency tăng theo số lượng services.' },
    { icon: '🌊', title: 'Không replay được events', desc: 'Khi thêm Analytics service mới, không có cách nào lấy lại dữ liệu lịch sử từ các services đã gửi request trước đó.' },
  ],
  concepts: [
    {
      name: 'Event Bus',
      icon: '🚌',
      explain: 'Event Bus là pub/sub in-memory broker cho phép components giao tiếp qua events mà không cần biết nhau. Publisher phát event lên bus. Subscribers lắng nghe và xử lý. Phù hợp cho monolith, còn microservices cần message queue thực sự (Kafka, RabbitMQ).',
      tip: 'In-process Event Bus (như EventEmitter, Spring ApplicationEvent) không đảm bảo delivery nếu process crash. Cho production microservices, dùng external message broker.',
      example: '// Node.js EventEmitter as Event Bus:\nconst eventBus = new EventEmitter();\n\n// Publisher:\neventBus.emit("order-created", { orderId: 123, userId: 456 });\n\n// Subscribers (decoupled!):\neventBus.on("order-created", async (event) => {\n  await emailService.sendConfirmation(event.userId);\n});\neventBus.on("order-created", async (event) => {\n  await inventoryService.reserve(event.orderId);\n});\n// Cả 2 handlers không biết nhau tồn tại ✅',
    },
    {
      name: 'Event Streaming',
      icon: '🌊',
      explain: 'Event Streaming (như Apache Kafka) lưu events như một immutable, ordered log. Consumers có thể đọc events từ bất kỳ vị trí nào trong log (replay từ đầu). Khác với traditional message queue: messages không bị xóa sau khi consumed. Cho phép multiple consumers độc lập.',
      tip: 'Kafka retention mặc định 7 ngày. Events được lưu lâu dài cho phép: debugging, audit trail, replay, và thêm consumer mới mà không cần resend events.',
      example: '// Kafka Event Streaming:\n// Producer ghi events vào log:\nproducer.send({ topic: "user-actions", messages: [{ value: event }] });\n\n// Consumer A (Email Service) đọc từ offset 0:\nconsumerA.seek({ topic: "user-actions", partition: 0, offset: 0 });\n\n// Consumer B (Analytics) - CÙNG events, offset riêng:\nconsumerB.seek({ topic: "user-actions", partition: 0, offset: 0 });\n\n// Cả 2 consumers hoàn toàn độc lập!\n// Event không bị xóa sau khi A consumed',
    },
    {
      name: 'CQRS',
      icon: '✂️',
      explain: 'CQRS (Command Query Responsibility Segregation): tách Command (write) model và Query (read) model. Write side xử lý business logic và publish events. Read side denormalize data thành views tối ưu cho queries. Cho phép scale read/write riêng biệt.',
      tip: 'CQRS thêm complexity đáng kể. Chỉ dùng khi read/write có requirements rất khác nhau. Kết hợp CQRS với Event Sourcing cho audit trail đầy đủ.',
      example: '// Write side (Command):\nasync function createOrder(command) {\n  const order = Order.create(command);\n  await orderRepository.save(order);\n  await eventBus.publish("OrderCreated", order.getEvents());\n}\n\n// Read side (Query) - denormalized view:\neventBus.on("OrderCreated", async (event) => {\n  await db.upsert("order_summary_view", {\n    order_id: event.orderId,\n    user_name: event.userName, // Denormalized!\n    total: event.total,\n    status: "created"\n  });\n});\n\n// Query - cực nhanh, không JOIN:\nconst orders = await db.query("SELECT * FROM order_summary_view");',
    },
    {
      name: 'Event Schema',
      icon: '📋',
      explain: 'Event Schema định nghĩa cấu trúc của events. Cần versioning để không breaking consumers khi schema thay đổi. Apache Avro, Protobuf, JSON Schema là các format phổ biến. Schema Registry (Confluent) quản lý và validate schemas centrally.',
      tip: 'Backward compatible changes (thêm optional fields) OK. Incompatible changes (xóa/rename fields) cần version mới. Consumers nên tolerant of unknown fields.',
      example: '// Event Schema v1:\n{\n  "event_type": "order-created",\n  "schema_version": "1.0",\n  "event_id": "uuid",\n  "timestamp": "2024-01-01T00:00:00Z",\n  "payload": {\n    "order_id": "123",\n    "user_id": "456",\n    "total": 99.99\n  }\n}\n\n// v2 - backward compatible (thêm optional field):\n"payload": {\n  "order_id": "123",\n  "user_id": "456",\n  "total": 99.99,\n  "currency": "VND"  // NEW - optional, old consumers ignore\n}',
    },
    {
      name: 'Idempotent Consumer',
      icon: '🔁',
      explain: 'Idempotent Consumer: consumer xử lý cùng event nhiều lần vẫn cho kết quả như xử lý 1 lần. Cần thiết với at-least-once delivery (có thể nhận duplicate events). Implement bằng: check event_id trong DB trước khi xử lý, hoặc dùng conditional updates.',
      tip: 'Lưu processed event_ids vào DB (hoặc Redis với TTL). Dùng UPSERT thay INSERT khi có thể. Thiết kế operations tự nhiên idempotent (SET value=X vs INCREMENT).',
      example: '// Idempotent consumer với event deduplication:\nasync function handleOrderCreated(event) {\n  const key = `processed:${event.event_id}`;\n\n  // Check Redis trước:\n  const alreadyProcessed = await redis.exists(key);\n  if (alreadyProcessed) {\n    console.log(`Duplicate event ${event.event_id}, skipping`);\n    return;\n  }\n\n  // Process:\n  await createOrder(event.payload);\n\n  // Mark as processed (TTL 7 ngày):\n  await redis.setex(key, 604800, "1");\n}',
    },
  ],
  demos: [
    {
      id: 'event-bus-demo',
      label: '🚌 Event Bus',
      language: 'javascript',
      code: `// Event-Driven Architecture với Event Bus
// Minh họa: Order service decoupled với các downstream services

class EventBus {
  constructor() {
    this.listeners = {};
  }

  on(eventType, handler) {
    if (!this.listeners[eventType]) this.listeners[eventType] = [];
    this.listeners[eventType].push(handler);
    console.log(\`📋 Registered handler for: \${eventType}\`);
  }

  async emit(eventType, payload) {
    const event = {
      event_id: 'EVT-' + Math.random().toString(36).substr(2, 8),
      event_type: eventType,
      timestamp: new Date().toISOString(),
      payload
    };
    
    console.log(\`\\n⚡ Event emitted: \${eventType}\`);
    const handlers = this.listeners[eventType] || [];
    
    // All handlers run independently (decoupled!)
    await Promise.all(handlers.map(h => h(event)));
  }
}

const bus = new EventBus();

// === Register Services (loosely coupled) ===

bus.on('order.created', async (event) => {
  const { orderId, userEmail } = event.payload;
  console.log(\`  📧 EmailService: Gửi xác nhận đến \${userEmail}\`);
  // await emailService.send(...)
});

bus.on('order.created', async (event) => {
  const { orderId, items } = event.payload;
  console.log(\`  📦 InventoryService: Reserve \${items.length} items cho \${orderId}\`);
  // await inventoryService.reserve(...)
});

bus.on('order.created', async (event) => {
  const { orderId, amount } = event.payload;
  console.log(\`  📊 AnalyticsService: Log revenue +\${amount.toLocaleString()}đ\`);
  // await analytics.track(...)
});

bus.on('order.created', async (event) => {
  console.log(\`  🔔 NotificationService: Push notification đến app\`);
  // await pushService.send(...)
});

// === Order Service: chỉ cần emit event ===
async function createOrder(orderData) {
  console.log('=== Order Service: Tạo đơn hàng ===');
  // Save to DB...
  const orderId = 'ORD-' + Date.now();
  
  // Emit event - không biết ai sẽ handle!
  await bus.emit('order.created', {
    orderId,
    userEmail: orderData.email,
    items: orderData.items,
    amount: orderData.amount
  });
  
  console.log(\`\\n✅ Done! Order \${orderId} created. Handlers: 4 services notified.\`);
}

createOrder({
  email: 'user@example.com',
  items: ['iPhone 15', 'AirPods Pro'],
  amount: 35000000
});`,
    },
    {
      id: 'kafka-streaming',
      label: '🌊 Event Streaming',
      language: 'javascript',
      code: `// Kafka-like Event Streaming Simulation
// Key feature: Multiple consumers với independent offsets

class EventLog {
  constructor(topic) {
    this.topic = topic;
    this.log = []; // Immutable append-only log
  }

  append(message) {
    const offset = this.log.length;
    this.log.push({ offset, timestamp: Date.now(), ...message });
    return offset;
  }

  read(fromOffset) {
    return this.log.slice(fromOffset);
  }
}

class Consumer {
  constructor(name, log) {
    this.name = name;
    this.log = log;
    this.currentOffset = 0; // Independent offset per consumer!
  }

  async poll() {
    const messages = this.log.read(this.currentOffset);
    if (messages.length === 0) return;

    console.log(\`\\n[\${this.name}] Polling from offset \${this.currentOffset}...\`);
    for (const msg of messages) {
      await this.process(msg);
      this.currentOffset = msg.offset + 1; // Commit offset
    }
  }

  async process(msg) {
    console.log(\`  [\${this.name}] Processed offset \${msg.offset}: \${msg.type} - \${msg.data}\`);
  }
}

// === Setup ===
const orderLog = new EventLog('order-events');

// Producer: append events
console.log('=== Producer: Producing events ===');
orderLog.append({ type: 'order.created',  data: 'ORD-001 | user1 | 500,000đ' });
orderLog.append({ type: 'order.paid',     data: 'ORD-001 | payment successful' });
orderLog.append({ type: 'order.created',  data: 'ORD-002 | user2 | 1,200,000đ' });
orderLog.append({ type: 'order.shipped',  data: 'ORD-001 | tracking: VN123456' });
orderLog.append({ type: 'order.created',  data: 'ORD-003 | user3 | 299,000đ' });
console.log(\`Total events in log: \${orderLog.log.length}\\n\`);

// Multiple independent consumers
const emailConsumer = new Consumer('EmailService', orderLog);
const analyticsConsumer = new Consumer('Analytics', orderLog);

// Simulate independent consumption
async function demo() {
  // Email reads all
  await emailConsumer.poll();
  
  // Analytics only starts reading now (gets ALL events from offset 0!)
  console.log('\\n🆕 Analytics service vừa được deploy...');
  await analyticsConsumer.poll(); // Gets ALL historical events!
  
  // New event arrives
  console.log('\\n=== New event arrives ===');
  orderLog.append({ type: 'order.delivered', data: 'ORD-001 | delivered!' });
  
  // Both read new event from their own offset
  await emailConsumer.poll();
  await analyticsConsumer.poll();
}

demo();`,
    },
  ],
  interactive: null,
  callouts: [
    { type: 'success', icon: '✂️', title: 'Decoupling là lợi ích lớn nhất', body: 'Event-driven architecture cho phép thêm consumers mới mà không sửa producer. Thêm Analytics service → chỉ cần subscribe vào existing events, không đụng Order service.' },
    { type: 'warning', icon: '🔁', title: 'Luôn implement Idempotent Consumer', body: 'Message brokers đảm bảo at-least-once delivery → có thể nhận duplicate events. Consumer phải check event_id trước khi xử lý để tránh side effects.' },
    { type: 'info', icon: '🌊', title: 'Kafka vs RabbitMQ', body: 'Kafka: immutable log, replay được, high throughput, long retention. RabbitMQ: complex routing, acknowledgment, messages bị xóa sau khi consumed. Dùng Kafka khi cần replay history hoặc high-volume streaming.' },
    { type: 'tip', icon: '📋', title: 'Versioning Event Schema từ đầu', body: 'Luôn include schema_version trong event payload. Khi thay đổi schema, bump version và maintain backward compatibility. Consumer nên ignore unknown fields (tolerant reader pattern).' },
  ],
}
