const makeTopic = (slug, order, title, emoji, desc, project, concepts) => ({
  slug, order, title, emoji, description: desc, project,
  problems: [{ icon: '🚧', title: 'Coming Soon', desc: 'Nội dung đang được chuẩn bị.' }],
  concepts,
  demos: [{ id: 'cs', label: '🚧 Coming Soon', language: 'javascript', code: `console.log('${title}');` }],
  interactive: null,
  callouts: [{ type: 'info', icon: '🚧', title: 'Đang phát triển', body: `Demos cho "${title}" đang được chuẩn bị!` }],
})

export default makeTopic(
  'event-sourcing', 13, 'Event Sourcing', '📜',
  'Lưu trạng thái hệ thống dưới dạng chuỗi events thay vì current state.',
  'Banking Ledger.',
  [
    {
      name: 'Aggregate',
      icon: '🧱',
      explain: 'Aggregate là cluster of domain objects được treat như một unit. Mỗi Aggregate có một root entity (Aggregate Root) là entry point duy nhất. Aggregate đảm bảo business invariants. Trong Event Sourcing, Aggregate state được rebuild từ events. Ví dụ: Order (root) + OrderLines + Payment.',
      tip: 'Aggregate nên nhỏ và focused. Giao tiếp giữa aggregates qua events, không gọi trực tiếp. Mỗi transaction chỉ modify một Aggregate.',
      example: 'class BankAccount {\n  apply(event) {\n    switch (event.type) {\n      case "AccountOpened":\n        this.id = event.accountId;\n        this.balance = 0;\n        break;\n      case "MoneyDeposited":\n        this.balance += event.amount;\n        break;\n      case "MoneyWithdrawn":\n        this.balance -= event.amount;\n        break;\n    }\n  }\n\n  // Rebuild state from events:\n  static fromEvents(events) {\n    const account = new BankAccount();\n    events.forEach(e => account.apply(e));\n    return account;\n  }\n}',
    },
    {
      name: 'Event Store',
      icon: '🗃️',
      explain: 'Event Store là database lưu tất cả events theo thứ tự. Không bao giờ UPDATE hay DELETE events – chỉ APPEND. Mỗi event có: aggregate_id, sequence_number, event_type, payload, timestamp. Rebuild state = load tất cả events của aggregate và apply từng event.',
      tip: 'EventStoreDB là database chuyên dụng cho Event Sourcing. Hoặc dùng PostgreSQL với append-only table. Cần index trên (aggregate_id, sequence_number).',
      example: '// Event Store schema:\nCREATE TABLE events (\n  id BIGSERIAL PRIMARY KEY,\n  aggregate_id UUID NOT NULL,\n  sequence_no BIGINT NOT NULL,\n  event_type VARCHAR(100) NOT NULL,\n  payload JSONB NOT NULL,\n  occurred_at TIMESTAMPTZ DEFAULT NOW(),\n  UNIQUE (aggregate_id, sequence_no)\n);\n\n// Append event:\nINSERT INTO events (aggregate_id, sequence_no, event_type, payload)\nVALUES ($1, $2, $3, $4);\n\n// Rebuild aggregate:\nSELECT * FROM events\nWHERE aggregate_id = $1\nORDER BY sequence_no;',
    },
    {
      name: 'Snapshot',
      icon: '📸',
      explain: 'Snapshot là "checkpoint" của aggregate state tại một thời điểm. Thay vì replay toàn bộ events từ đầu (có thể hàng triệu events), load snapshot gần nhất + chỉ replay events sau snapshot. Giảm load time từ O(n) xuống O(events_since_snapshot).',
      tip: 'Tạo snapshot sau mỗi N events (ví dụ: 100 events). Lưu snapshot kèm sequence_number. Khi load: fetch snapshot, sau đó fetch events WHERE sequence_no > snapshot.sequence_no.',
      example: '// Snapshot strategy:\nasync function loadAggregate(aggregateId) {\n  // 1. Load snapshot gần nhất:\n  const snapshot = await db.query(\n    "SELECT * FROM snapshots WHERE aggregate_id=? ORDER BY version DESC LIMIT 1",\n    [aggregateId]\n  );\n\n  const startVersion = snapshot ? snapshot.version : 0;\n  const state = snapshot ? snapshot.state : {};\n\n  // 2. Chỉ load events SAU snapshot:\n  const events = await db.query(\n    "SELECT * FROM events WHERE aggregate_id=? AND sequence_no > ? ORDER BY sequence_no",\n    [aggregateId, startVersion]\n  );\n\n  // 3. Apply events lên snapshot state:\n  return events.reduce(applyEvent, state);\n}',
    },
    {
      name: 'Replay',
      icon: '⏮️',
      explain: 'Event Replay là tính năng mạnh nhất của Event Sourcing: reprocess tất cả events để rebuild state, fix bugs, migrate data, hoặc create new projections. Toàn bộ lịch sử được preserve → có thể "du hành thời gian" đến bất kỳ thời điểm nào.',
      tip: 'Replay cần xử lý idempotency và versioning cẩn thận. Dùng "cold" replay (offline, không ảnh hưởng production) cho migrations lớn. "Hot" replay chỉ cho small volumes.',
      example: '// Replay để tạo new read model:\nconst events = await eventStore.getAllEvents({\n  fromPosition: 0,\n  types: ["OrderCreated", "OrderShipped", "OrderCancelled"]\n});\n\n// Rebuild new projection:\nconst newView = {};\nfor (const event of events) {\n  switch (event.type) {\n    case "OrderCreated":\n      newView[event.orderId] = { ...event.data, status: "new" };\n      break;\n    case "OrderShipped":\n      newView[event.orderId].status = "shipped";\n      break;\n  }\n}\n\nawait db.bulkUpsert("order_views", Object.values(newView));',
    },
    {
      name: 'CQRS',
      icon: '✂️',
      explain: 'CQRS thường đi kèm với Event Sourcing: Write side dùng Event Sourcing để persist state thay đổi. Read side project events thành denormalized views tối ưu cho queries. Events từ Write side được consumed bởi projection builders để update read models.',
      tip: 'CQRS + Event Sourcing là powerful combo nhưng có eventual consistency: sau khi write, read model có thể chưa được update ngay. UI cần handle "optimistic update" hoặc hiển thị loading state.',
      example: '// Write side (Event Sourcing):\nclass OrderCommandHandler {\n  async handle(createOrderCmd) {\n    const events = [new OrderCreatedEvent(createOrderCmd)];\n    await eventStore.append("order", orderId, events);\n    await eventBus.publish(events); // Notify read side\n  }\n}\n\n// Read side (Projection):\neventBus.on("OrderCreated", async (event) => {\n  // Update denormalized read model:\n  await db.upsert("order_list_view", {\n    id: event.orderId,\n    customer_name: event.customerName, // Denormalized\n    total: event.total,\n    status: "pending"\n  });\n});',
    },
  ]
)
