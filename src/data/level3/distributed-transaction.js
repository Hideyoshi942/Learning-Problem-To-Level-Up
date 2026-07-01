export default {
  slug: 'distributed-transaction',
  order: 11,
  title: 'Distributed Transaction',
  emoji: '🌐',
  description: '2PC, Saga Pattern, Outbox Pattern cho giao dịch phân tán.',
  project: 'E-commerce Microservice.',
  problems: [
    { icon: '💥', title: 'Partial failure', desc: 'Order tạo thành công nhưng payment service down → hệ thống ở trạng thái không nhất quán: đơn hàng exists nhưng tiền chưa trừ.' },
    { icon: '🔒', title: 'Không thể ROLLBACK cross-service', desc: 'Database ACID chỉ hoạt động trong một DB duy nhất. Khi span nhiều services, không có cơ chế rollback tự động nào.' },
    { icon: '📡', title: 'Network failure mid-transaction', desc: 'Inventory đã bị trừ, payment đang xử lý thì network drop → không biết payment thành công hay chưa.' },
  ],
  concepts: [
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
  ],
  demos: [
    {
      id: 'saga-orchestration',
      label: '📖 Saga Orchestrator',
      language: 'javascript',
      code: `// Saga Orchestrator Pattern - Order Processing
class SagaOrchestrator {
  constructor() {
    this.steps = [];
    this.executedSteps = [];
  }

  addStep(name, action, compensate) {
    this.steps.push({ name, action, compensate });
  }

  async execute(context) {
    console.log('🚀 Bắt đầu Saga...');
    
    for (const step of this.steps) {
      try {
        console.log(\`  ▶ Executing: \${step.name}\`);
        const result = await step.action(context);
        this.executedSteps.push({ step, result });
        console.log(\`  ✅ \${step.name} thành công\`);
      } catch (err) {
        console.log(\`  ❌ \${step.name} thất bại: \${err.message}\`);
        console.log('  ↩️  Bắt đầu compensate...');
        await this.compensate(context);
        return { success: false, error: err.message };
      }
    }
    return { success: true };
  }

  async compensate(context) {
    for (const { step, result } of [...this.executedSteps].reverse()) {
      console.log(\`  🔄 Compensating: \${step.name}\`);
      await step.compensate(context, result);
    }
  }
}

// --- Simulate Order Saga ---
const saga = new SagaOrchestrator();

saga.addStep(
  'Create Order',
  async (ctx) => {
    ctx.orderId = 'ORD-' + Date.now();
    return ctx.orderId;
  },
  async (ctx) => {
    console.log(\`     Cancel order \${ctx.orderId}\`);
  }
);

saga.addStep(
  'Reserve Inventory',
  async (ctx) => {
    ctx.reservationId = 'RES-001';
    return ctx.reservationId;
  },
  async (ctx) => {
    console.log(\`     Release reservation \${ctx.reservationId}\`);
  }
);

saga.addStep(
  'Process Payment',
  async (ctx) => {
    // Simulate payment failure!
    throw new Error('Insufficient funds');
  },
  async (ctx) => {
    console.log(\`     Refund payment for order \${ctx.orderId}\`);
  }
);

const ctx = {};
saga.execute(ctx).then(result => {
  console.log('\\n📊 Kết quả:', result);
});`,
    },
    {
      id: 'outbox-pattern',
      label: '📤 Outbox Pattern',
      language: 'javascript',
      code: `// Transactional Outbox Pattern
// Đảm bảo DB update + event publish là atomic

class OutboxDB {
  constructor() {
    this.orders = [];
    this.outbox = [];
    this.nextId = 1;
  }

  async transaction(fn) {
    const rollbackData = {
      orders: [...this.orders],
      outbox: [...this.outbox]
    };
    try {
      await fn(this);
      console.log('  ✅ Transaction committed!');
    } catch (err) {
      this.orders = rollbackData.orders;
      this.outbox = rollbackData.outbox;
      console.log('  ❌ Transaction rolled back:', err.message);
      throw err;
    }
  }
}

class OrderService {
  constructor(db, eventPublisher) {
    this.db = db;
    this.publisher = eventPublisher;
  }

  async createOrder(orderData) {
    // Both DB write + outbox write in SAME transaction
    await this.db.transaction(async (trx) => {
      const order = { id: 'ORD-' + trx.nextId++, ...orderData, status: 'created' };
      trx.orders.push(order);
      console.log(\`  📝 Inserted order \${order.id} into DB\`);

      // Write event to OUTBOX in same transaction
      trx.outbox.push({
        id: 'EVT-' + trx.nextId++,
        event_type: 'order-created',
        payload: JSON.stringify(order),
        published: false,
        created_at: Date.now()
      });
      console.log(\`  📋 Inserted event into outbox\`);
    });
  }
}

// Background relay worker
async function outboxRelay(db, publisher) {
  const pending = db.outbox.filter(e => !e.published);
  console.log(\`\\n🔄 Outbox Relay: tìm thấy \${pending.length} events chưa publish\`);

  for (const event of pending) {
    console.log(\`  📤 Publishing: \${event.event_type}\`);
    await publisher.publish(event.event_type, JSON.parse(event.payload));
    event.published = true;
    console.log(\`  ✅ Published & marked as done\`);
  }
}

// --- Demo ---
const db = new OutboxDB();
const publisher = {
  publish: async (type, payload) => {
    console.log(\`     → Kafka: topic=\${type}, orderId=\${payload.id}\`);
  }
};

const orderService = new OrderService(db, publisher);

console.log('=== Tạo đơn hàng ===');
orderService.createOrder({ userId: 'U1', amount: 299000, items: ['ProductA'] })
  .then(() => outboxRelay(db, publisher))
  .then(() => {
    console.log('\\n📊 DB State:');
    console.log('  Orders:', db.orders.length);
    console.log('  Outbox published:', db.outbox.filter(e => e.published).length);
  });`,
    },
  ],
  interactive: null,
  callouts: [
    { type: 'warning', icon: '🚫', title: 'Tránh 2PC trong microservices', body: 'Two Phase Commit block resources, không chịu được network partition. Dùng Saga Pattern với eventual consistency thay thế – đây là industry standard.' },
    { type: 'success', icon: '📤', title: 'Outbox Pattern là must-have', body: 'Luôn dùng Transactional Outbox khi cần vừa update DB vừa publish event. Không có Outbox, có thể mất events hoặc publish events khi transaction đã rollback.' },
    { type: 'info', icon: '↩️', title: 'Compensating transaction phải idempotent', body: 'Saga compensate có thể chạy nhiều lần (do retry). Mỗi step cần xử lý trường hợp "đã compensate rồi" mà không bị lỗi.' },
    { type: 'tip', icon: '🔭', title: 'Orchestration vs Choreography', body: 'Orchestration (central coordinator) dễ debug, dễ monitor flow. Choreography (event-driven) ít coupling hơn nhưng khó trace. Bắt đầu với Orchestration cho đến khi team quen với distributed systems.' },
  ],
  quiz: [
    {
      q: 'Vấn đề lớn nhất của Two Phase Commit trong microservices là gì?',
      options: [
        'Không đảm bảo được atomicity giữa các services',
        'Không thể phát events lên message queue',
        'Blocking: nếu Coordinator crash sau Phase 1, participants bị lock mãi',
        'Không hỗ trợ nhiều database khác nhau',
      ],
      answer: 2,
      explain: '2PC bị blocking vì khi Coordinator crash sau Phase 1, các participants đã prepare sẽ bị lock resources mãi, cộng thêm không scale tốt và tăng latency.',
    },
    {
      q: 'Trong Saga Pattern, khi một step thất bại thì hệ thống rollback bằng cách nào?',
      options: [
        'Chạy các compensating transactions ngược lại để undo các step đã thành công',
        'Gọi lệnh ROLLBACK của database trên tất cả services',
        'Chờ Coordinator gửi lệnh abort tới mọi participant',
        'Xóa toàn bộ dữ liệu rồi bắt đầu lại từ đầu',
      ],
      answer: 0,
      explain: 'Saga là chuỗi local transactions, mỗi step có một compensating transaction. Khi một step fail, chạy các compensating transactions ngược lại thay vì rollback kiểu database.',
    },
    {
      q: 'Outbox Pattern được sinh ra để giải quyết bài toán nào?',
      options: [
        'Giảm latency khi phải gọi nhiều services đồng bộ',
        'Cân bằng tải giữa nhiều consumers',
        'Tự động rollback transaction span nhiều services',
        'Update DB và publish event một cách atomic trong cùng một transaction',
      ],
      answer: 3,
      explain: 'Outbox ghi event vào bảng outbox trong CÙNG DB transaction với việc update domain, sau đó background job đọc outbox và publish, đảm bảo update DB và publish event là atomic.',
    },
    {
      q: 'Vì sao compensating transaction cần phải idempotent?',
      options: [
        'Để giảm dung lượng lưu trữ trong event store',
        'Vì nó có thể bị chạy nhiều lần do retry nhưng vẫn phải an toàn',
        'Vì database bắt buộc mọi transaction phải idempotent',
        'Để tăng tốc độ xử lý của Saga Orchestrator',
      ],
      answer: 1,
      explain: 'Saga compensate có thể chạy nhiều lần do retry, nên mỗi step phải xử lý được trường hợp đã compensate rồi mà không bị lỗi, tức là phải idempotent.',
    },
  ],
}
