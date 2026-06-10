export default {
  slug: 'event-sourcing',
  order: 13,
  title: 'Event Sourcing',
  emoji: '📜',
  description: 'Lưu trạng thái hệ thống dưới dạng chuỗi events thay vì current state.',
  project: 'Banking Ledger.',
  problems: [
    { icon: '🕵️', title: 'Không có audit trail', desc: 'Traditional DB chỉ lưu current state. Không biết tài khoản đã trải qua bao nhiêu giao dịch, ai đã làm gì, lúc mấy giờ.' },
    { icon: '🐛', title: 'Bug fix không thể undo', desc: 'Nếu có lỗi business logic làm sai số dư tài khoản, không có cách nào recompute lại từ đầu với logic đúng.' },
    { icon: '📊', title: 'Không thể query lịch sử', desc: '"Số dư tài khoản ngày 15 tháng trước là bao nhiêu?" – câu hỏi không thể trả lời với CRUD truyền thống.' },
  ],
  concepts: [
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
  ],
  demos: [
    {
      id: 'bank-account-es',
      label: '🏦 BankAccount Event Sourcing',
      language: 'javascript',
      code: `// Event Sourcing: BankAccount
// State được rebuild hoàn toàn từ events – không bao giờ UPDATE trực tiếp

class EventStore {
  constructor() {
    this.events = []; // Append-only!
  }

  append(aggregateId, eventType, payload) {
    const seqNo = this.events.filter(e => e.aggregateId === aggregateId).length + 1;
    const event = {
      id: 'EVT-' + this.events.length,
      aggregateId,
      seqNo,
      type: eventType,
      payload,
      occurredAt: new Date().toISOString()
    };
    this.events.push(event);
    return event;
  }

  getEvents(aggregateId) {
    return this.events
      .filter(e => e.aggregateId === aggregateId)
      .sort((a, b) => a.seqNo - b.seqNo);
  }
}

class BankAccount {
  constructor() {
    this.id = null;
    this.owner = null;
    this.balance = 0;
    this.status = 'inactive';
    this.transactions = 0;
  }

  apply(event) {
    switch (event.type) {
      case 'AccountOpened':
        this.id = event.payload.accountId;
        this.owner = event.payload.owner;
        this.balance = event.payload.initialDeposit;
        this.status = 'active';
        break;
      case 'MoneyDeposited':
        this.balance += event.payload.amount;
        this.transactions++;
        break;
      case 'MoneyWithdrawn':
        this.balance -= event.payload.amount;
        this.transactions++;
        break;
      case 'AccountFrozen':
        this.status = 'frozen';
        break;
    }
  }

  static fromEvents(events) {
    const account = new BankAccount();
    events.forEach(e => account.apply(e));
    return account;
  }
}

// === Demo ===
const store = new EventStore();
const ACCOUNT_ID = 'ACC-001';

// All operations are events!
store.append(ACCOUNT_ID, 'AccountOpened',   { accountId: ACCOUNT_ID, owner: 'Nguyen Van A', initialDeposit: 5000000 });
store.append(ACCOUNT_ID, 'MoneyDeposited',  { amount: 2000000, description: 'Lương tháng 6' });
store.append(ACCOUNT_ID, 'MoneyWithdrawn',  { amount: 500000,  description: 'ATM rút tiền' });
store.append(ACCOUNT_ID, 'MoneyDeposited',  { amount: 1000000, description: 'Chuyển khoản nhận' });
store.append(ACCOUNT_ID, 'MoneyWithdrawn',  { amount: 3000000, description: 'Thanh toán hóa đơn' });

// Rebuild current state from events:
const events = store.getEvents(ACCOUNT_ID);
const account = BankAccount.fromEvents(events);

console.log('=== Event Log (Source of Truth) ===');
events.forEach(e => {
  const sign = e.type === 'MoneyDeposited' ? '+' : e.type === 'MoneyWithdrawn' ? '-' : ' ';
  const amount = e.payload.amount ? \`\${sign}\${e.payload.amount.toLocaleString()}đ\` : '';
  console.log(\`  [\${e.seqNo}] \${e.type.padEnd(20)} \${amount}\`);
});

console.log('\\n=== Current Account State (Rebuilt from Events) ===');
console.log(\`  Owner  : \${account.owner}\`);
console.log(\`  Balance: \${account.balance.toLocaleString()}đ\`);
console.log(\`  Status : \${account.status}\`);
console.log(\`  Txns   : \${account.transactions}\`);

// Time travel: state at event #2
console.log('\\n=== Time Travel: State after event #2 ===');
const pastAccount = BankAccount.fromEvents(events.slice(0, 2));
console.log(\`  Balance after event #2: \${pastAccount.balance.toLocaleString()}đ\`);`,
    },
    {
      id: 'snapshot-demo',
      label: '📸 Snapshot Optimization',
      language: 'javascript',
      code: `// Snapshot Pattern: Optimize aggregate loading
// Problem: Nếu có 1 triệu events, replay từ đầu rất chậm

class EventStoreWithSnapshot {
  constructor() {
    this.events = [];
    this.snapshots = {};
  }

  append(aggId, type, payload) {
    this.events.push({ aggId, seqNo: this.getEvents(aggId).length + 1, type, payload });
    // Auto-snapshot every 3 events (normally every 100+)
    const evtCount = this.getEvents(aggId).length;
    if (evtCount % 3 === 0) this.createSnapshot(aggId);
  }

  getEvents(aggId, fromSeqNo = 0) {
    return this.events.filter(e => e.aggId === aggId && e.seqNo > fromSeqNo);
  }

  createSnapshot(aggId) {
    const allEvents = this.getEvents(aggId);
    // Simulate building state
    let balance = 0;
    for (const e of allEvents) {
      if (e.type === 'Deposit') balance += e.payload.amount;
      if (e.type === 'Withdraw') balance -= e.payload.amount;
      if (e.type === 'Open') balance = e.payload.initial;
    }
    const snapshot = { seqNo: allEvents.length, balance, createdAt: Date.now() };
    this.snapshots[aggId] = snapshot;
    console.log(\`  📸 Snapshot created at seqNo=\${snapshot.seqNo}, balance=\${balance.toLocaleString()}đ\`);
  }

  loadAggregate(aggId) {
    const snapshot = this.snapshots[aggId];
    
    if (snapshot) {
      console.log(\`  ✅ Using snapshot at seqNo=\${snapshot.seqNo}\`);
      const remainingEvents = this.getEvents(aggId, snapshot.seqNo);
      console.log(\`  📖 Replaying \${remainingEvents.length} events since snapshot\`);
      let balance = snapshot.balance;
      for (const e of remainingEvents) {
        if (e.type === 'Deposit') balance += e.payload.amount;
        if (e.type === 'Withdraw') balance -= e.payload.amount;
      }
      return { balance, fromSnapshot: true };
    } else {
      const allEvents = this.getEvents(aggId);
      console.log(\`  ⚠️  No snapshot – replaying ALL \${allEvents.length} events\`);
      let balance = 0;
      for (const e of allEvents) {
        if (e.type === 'Deposit') balance += e.payload.amount;
        if (e.type === 'Withdraw') balance -= e.payload.amount;
        if (e.type === 'Open') balance = e.payload.initial;
      }
      return { balance, fromSnapshot: false };
    }
  }
}

const store = new EventStoreWithSnapshot();
const ACC = 'ACC-999';

console.log('=== Building event history ===');
store.append(ACC, 'Open',    { initial: 1000000 });
store.append(ACC, 'Deposit', { amount: 500000 });
store.append(ACC, 'Withdraw',{ amount: 200000 });  // → Snapshot #1 created
store.append(ACC, 'Deposit', { amount: 300000 });
store.append(ACC, 'Withdraw',{ amount: 100000 });
store.append(ACC, 'Deposit', { amount: 800000 });  // → Snapshot #2 created
store.append(ACC, 'Deposit', { amount: 200000 });
store.append(ACC, 'Withdraw',{ amount: 50000 });

console.log(\`\\nTotal events: \${store.events.length}\`);
console.log(\`\\n=== Loading aggregate (with snapshot optimization) ===\`);
const result = store.loadAggregate(ACC);
console.log(\`\\n💰 Final balance: \${result.balance.toLocaleString()}đ\`);
console.log(\`   Loaded from snapshot: \${result.fromSnapshot}\`);`,
    },
  ],
  interactive: null,
  callouts: [
    { type: 'success', icon: '⏮️', title: 'Audit trail miễn phí', body: 'Event Sourcing tự động tạo complete audit trail. Mọi thay đổi state đều có event tương ứng với timestamp, actor, và reason. Đây là điều không thể làm với CRUD truyền thống.' },
    { type: 'warning', icon: '📸', title: 'Cần Snapshot cho aggregates sống lâu', body: 'Nếu không có snapshot, mỗi lần load account với 10.000 transactions phải replay toàn bộ. Tạo snapshot định kỳ (mỗi 100 events) để giữ performance.' },
    { type: 'info', icon: '🐛', title: 'Event Replay để fix bugs', body: 'Đây là superpower của Event Sourcing: khi tìm bug trong business logic, fix code và replay toàn bộ events → tự động recompute đúng state cho tất cả aggregates.' },
    { type: 'tip', icon: '⚠️', title: 'Không thể xóa events', body: 'Events là immutable và append-only. Để "undo" một operation, phải tạo compensating event mới (ví dụ: RefundIssued thay vì xóa PaymentCharged). Đây là trade-off cần chấp nhận.' },
  ],
}
