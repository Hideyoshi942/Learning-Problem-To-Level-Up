const makeTopic = (slug, order, title, emoji, desc, project, concepts) => ({
  slug, order, title, emoji, description: desc, project,
  problems: [{ icon: '🚧', title: 'Coming Soon', desc: 'Nội dung đang được chuẩn bị.' }],
  concepts,
  demos: [{ id: 'cs', label: '🚧 Coming Soon', language: 'javascript', code: `console.log('${title}');` }],
  interactive: null,
  callouts: [{ type: 'info', icon: '🚧', title: 'Đang phát triển', body: `Demos cho "${title}" đang được chuẩn bị!` }],
})

export default makeTopic(
  'distributed-transaction', 11, 'Distributed Transaction', '🌐',
  '2PC, Saga Pattern, Outbox Pattern cho giao dịch phân tán.',
  'E-commerce Microservice.',
  [
    {
      name: 'Two Phase Commit',
      icon: '🤝',
      explain: '2PC (Two Phase Commit) là giao thức đảm bảo atomicity trên nhiều services/databases. Phase 1 (Prepare): Coordinator hỏi tất cả participants "can you commit?". Phase 2 (Commit/Abort): nếu tất cả vote YES → Commit, nếu có 1 NO → Abort tất cả.',
      tip: '2PC có vấn đề blocking: nếu Coordinator crash sau Phase 1 → participants bị lock mãi. Không scale tốt và tăng latency. Dùng Saga Pattern thay thế cho microservices.',
      example: '// 2PC Flow:\n// Phase 1 - Prepare:\ncoordinator.prepare([\n  orderService.prepare(order),      // "Ready"\n  paymentService.prepare(payment),  // "Ready"\n  inventoryService.prepare(item),   // "Ready"\n]);\n\n// Phase 2 - Commit (nếu tất cả OK):\nif (allVotedYes) {\n  coordinator.commit([\n    orderService.commit(),\n    paymentService.commit(),\n    inventoryService.commit(),\n  ]);\n} else {\n  coordinator.rollback([...]);\n}',
    },
    {
      name: 'Saga Pattern',
      icon: '📖',
      explain: 'Saga là chuỗi local transactions, mỗi step có một compensating transaction để undo nếu cần. Khi step thất bại, chạy compensating transactions ngược lại để rollback. Không blocking như 2PC, phù hợp với microservices. 2 cách implement: Choreography (event-driven) và Orchestration.',
      tip: 'Choreography Saga: services phát events và react tới events của nhau. Orchestration Saga: Saga Orchestrator trung tâm điều phối. Orchestration dễ debug hơn nhưng tập trung hóa logic.',
      example: '// Saga Orchestration cho Order:\n// Step 1: Create Order → success\n// Step 2: Reserve Inventory → success\n// Step 3: Process Payment → FAIL!\n\n// Compensating transactions (rollback):\n// Compensate Step 2: Release Inventory\n// Compensate Step 1: Cancel Order\n\n// Choreography qua events:\norderService.on("order-created", () => inventoryService.reserve());\ninventoryService.on("reserved", () => paymentService.charge());\npaymentService.on("charge-failed", () => inventoryService.release());\ninventoryService.on("released", () => orderService.cancel());',
    },
    {
      name: 'Outbox Pattern',
      icon: '📤',
      explain: 'Outbox Pattern giải quyết bài toán: làm thế nào để update DB và publish event atomically? Giải pháp: write event vào bảng "outbox" trong CÙNG DB transaction. Background job đọc outbox và publish lên message queue. Đảm bảo at-least-once event delivery.',
      tip: 'Transactional Outbox là pattern chuẩn cho event-driven microservices. Dùng Debezium (CDC) để đọc outbox từ DB WAL log, hiệu quả hơn polling.',
      example: '// Trong cùng 1 DB transaction:\nawait db.transaction(async (trx) => {\n  // Update domain:\n  await trx.insert("orders", { id, status: "created" });\n\n  // Write to outbox (cùng transaction!):\n  await trx.insert("outbox", {\n    event_type: "order-created",\n    aggregate_id: orderId,\n    payload: JSON.stringify(orderData),\n    created_at: new Date()\n  });\n});\n\n// Background job:\nconst events = await db.query(\n  "SELECT * FROM outbox WHERE published=false ORDER BY created_at"\n);\nfor (const event of events) {\n  await kafka.publish(event.event_type, event.payload);\n  await db.query("UPDATE outbox SET published=true WHERE id=?", [event.id]);\n}',
    },
    {
      name: 'Compensating Transaction',
      icon: '↩️',
      explain: 'Compensating Transaction là "undo" transaction dùng trong Saga Pattern. Thay vì rollback (không thể trong distributed), tạo một transaction mới để đảo ngược effect của transaction trước. Ví dụ: "reserve inventory" → compensate bằng "release inventory".',
      tip: 'Compensating transaction phải idempotent (có thể chạy nhiều lần an toàn). Không phải mọi operation đều có compensating transaction dễ (ví dụ: email đã gửi không thể unsend).',
      example: '// Mapping: Operation → Compensating Transaction\nconst saga = [\n  {\n    action: () => orderService.create(order),\n    compensate: (orderId) => orderService.cancel(orderId)\n  },\n  {\n    action: () => inventoryService.reserve(item),\n    compensate: (reservationId) => inventoryService.release(reservationId)\n  },\n  {\n    action: () => paymentService.charge(amount),\n    compensate: (chargeId) => paymentService.refund(chargeId)\n  }\n];\n// Nếu step 3 fail → run compensate[1] rồi compensate[0]',
    },
  ]
)
