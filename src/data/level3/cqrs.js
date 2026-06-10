const makeTopic = (slug, order, title, emoji, desc, project, concepts) => ({
  slug, order, title, emoji, description: desc, project,
  problems: [{ icon: '🚧', title: 'Coming Soon', desc: 'Nội dung đang được chuẩn bị.' }],
  concepts,
  demos: [{ id: 'cs', label: '🚧 Coming Soon', language: 'javascript', code: `console.log('${title}');` }],
  interactive: null,
  callouts: [{ type: 'info', icon: '🚧', title: 'Đang phát triển', body: `Demos cho "${title}" đang được chuẩn bị!` }],
})

export default makeTopic(
  'cqrs', 14, 'CQRS', '✂️',
  'Command Query Responsibility Segregation – tách read model và write model.',
  'Ticket Booking.',
  [
    {
      name: 'Read Model',
      icon: '👁️',
      explain: 'Read Model (Query side) là data store được optimize hoàn toàn cho queries. Data denormalized, pre-aggregated, format sẵn cho UI. Không cần JOIN phức tạp. Có thể là Elasticsearch (full-text), Redis (cache), PostgreSQL (reporting), MongoDB (flexible schema) – mỗi loại query có thể dùng DB riêng.',
      tip: 'Read Model là "projection" của Write Model. Một Write Model có thể có nhiều Read Models khác nhau cho các use cases: mobile app, web dashboard, reporting.',
      example: '// Write Model (normalized):\n// orders: { id, user_id, status }\n// order_items: { order_id, product_id, qty, price }\n// users: { id, name, email }\n\n// Read Model (denormalized cho Order List):\nCREATE MATERIALIZED VIEW order_list_view AS\nSELECT\n  o.id,\n  u.name AS customer_name,  -- Denormalized!\n  COUNT(oi.id) AS item_count,  -- Pre-aggregated!\n  SUM(oi.qty * oi.price) AS total,\n  o.status\nFROM orders o\nJOIN users u ON o.user_id = u.id\nJOIN order_items oi ON o.id = oi.order_id\nGROUP BY o.id, u.name, o.status;',
    },
    {
      name: 'Write Model',
      icon: '✏️',
      explain: 'Write Model (Command side) xử lý business logic và đảm bảo business rules (invariants). Normalized, focused on correctness. Commands trigger state changes, emit events. Write Model không quan tâm đến query performance – đó là việc của Read Model.',
      tip: 'Write Model nên minimal và focused. Chứa business logic (validation, invariants). Không bao giờ query Write Model cho display purposes – dùng Read Model.',
      example: '// Command Handler:\nclass OrderCommandHandler {\n  async createOrder(command) {\n    // 1. Load aggregate (Write Model):\n    const user = await userRepo.findById(command.userId);\n\n    // 2. Validate business rules:\n    if (!user.isActive()) throw new Error("User inactive");\n    if (command.total > user.creditLimit) throw new Error("Exceeds limit");\n\n    // 3. Create and save:\n    const order = new Order(command);\n    await orderRepo.save(order);\n\n    // 4. Emit events (Read side sẽ update):\n    await eventBus.emit("OrderCreated", order.toEvent());\n  }\n}',
    },
    {
      name: 'Projection',
      icon: '🎬',
      explain: 'Projection là quá trình transform events/commands từ Write side thành Read Models. Projection handlers lắng nghe events và update read store tương ứng. Có thể rebuild (replay) projection từ đầu bằng cách reprocess tất cả events.',
      tip: 'Projection phải idempotent – có thể chạy lại nhiều lần. Lưu last processed event position để biết đâu tiếp tục nếu bị interrupt.',
      example: '// Projection Handler:\nclass OrderProjection {\n  async on(event) {\n    switch (event.type) {\n      case "OrderCreated":\n        await readDb.insert("order_views", {\n          id: event.orderId,\n          customer: event.customerName,\n          status: "pending",\n          total: event.total\n        });\n        break;\n\n      case "OrderShipped":\n        await readDb.update("order_views",\n          { status: "shipped", tracking: event.trackingNo },\n          { id: event.orderId }\n        );\n        break;\n    }\n  }\n}',
    },
    {
      name: 'Event Store',
      icon: '🗃️',
      explain: 'Trong CQRS context, Event Store là source of truth cho Write side. Tất cả state changes được lưu dưới dạng events trong event store. Read Models được derived từ events này. Nếu Read Model bị mất hoặc corrupt, có thể rebuild từ Event Store.',
      tip: 'Event Store nên append-only và immutable. Dùng optimistic concurrency: include expected version khi append, reject nếu version không match (ai đó đã modify trước).',
      example: '// Append event với optimistic concurrency:\nasync function appendEvent(aggregateId, event, expectedVersion) {\n  const result = await db.query(`\n    INSERT INTO events (aggregate_id, version, type, data)\n    SELECT $1, COALESCE(MAX(version), 0) + 1, $2, $3\n    FROM events\n    WHERE aggregate_id = $1\n    HAVING COALESCE(MAX(version), 0) = $4\n  `, [aggregateId, event.type, event.data, expectedVersion]);\n\n  if (result.rowCount === 0) {\n    throw new OptimisticConcurrencyError("Version conflict!");\n  }\n}',
    },
    {
      name: 'Eventual Consistency',
      icon: '⏳',
      explain: 'Eventual Consistency: sau khi write, Read Model sẽ được updated EVENTUALLY (không ngay lập tức). Có một khoảng delay giữa Write side commit và Read side update (thường milliseconds, đôi khi seconds). Đây là trade-off của CQRS/Event-driven architecture.',
      tip: 'Xử lý trong UI: sau khi submit form, dùng optimistic update (hiển thị kết quả expected ngay), hoặc polling/WebSocket để biết khi nào Read Model ready.',
      example: '// Client handling eventual consistency:\nasync function createOrder(orderData) {\n  // 1. Submit command:\n  const { orderId } = await api.post("/orders", orderData);\n\n  // 2. Optimistic update (hiển thị ngay):\n  orderStore.addOptimistic({ id: orderId, status: "pending" });\n\n  // 3. Poll cho đến khi Read Model updated:\n  await poll(() => api.get(`/orders/${orderId}`), {\n    until: (order) => order.status === "pending",\n    interval: 500,\n    timeout: 10000\n  });\n\n  // 4. Replace optimistic với real data:\n  orderStore.confirmOptimistic(orderId);\n}',
    },
  ]
)
