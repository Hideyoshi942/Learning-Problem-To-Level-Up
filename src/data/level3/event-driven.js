const makeTopic = (slug, order, title, emoji, desc, project, concepts) => ({
  slug, order, title, emoji, description: desc, project,
  problems: [{ icon: '🚧', title: 'Coming Soon', desc: 'Nội dung đang được chuẩn bị.' }],
  concepts,
  demos: [{ id: 'cs', label: '🚧 Coming Soon', language: 'javascript', code: `console.log('${title}');` }],
  interactive: null,
  callouts: [{ type: 'info', icon: '🚧', title: 'Đang phát triển', body: `Demos cho "${title}" đang được chuẩn bị!` }],
})

export default makeTopic(
  'event-driven', 12, 'Event Driven Architecture', '⚡',
  'Event Bus, Event Streaming, CQRS để xây dựng hệ thống loosely coupled.',
  'Order Processing System.',
  [
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
  ]
)
