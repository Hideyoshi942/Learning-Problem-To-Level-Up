export default {
  slug: 'cqrs',
  order: 14,
  title: 'CQRS',
  emoji: '✂️',
  description: 'Command Query Responsibility Segregation – tách read model và write model.',
  project: 'Ticket Booking.',
  problems: [
    { icon: '🐌', title: 'Read và Write conflict về performance', desc: 'Normalized schema tốt cho write (integrity) nhưng query cần JOIN 5 bảng → slow. Optimize cho read (denormalize) lại phức tạp cho write.' },
    { icon: '⚖️', title: 'Không thể scale read/write độc lập', desc: 'Hệ thống đọc nhiều gấp 10x ghi, nhưng shared DB buộc phải scale cả 2 cùng nhau, lãng phí tài nguyên.' },
    { icon: '📊', title: 'Different query requirements', desc: 'Dashboard cần aggregated data, mobile app cần simplified view, analytics cần full history – một model không thể serve tất cả hiệu quả.' },
  ],
  concepts: [
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
  ],
  demos: [
    {
      id: 'cqrs-basic',
      label: '✂️ CQRS Flow',
      language: 'javascript',
      code: `// CQRS Pattern: Tách Read Model & Write Model
// Ví dụ: Ticket Booking System

// ============ WRITE SIDE (Command) ============
class WriteDB {
  constructor() {
    // Normalized tables
    this.tickets = [];
    this.users = { 'U1': { name: 'Nguyen Van A', email: 'a@example.com' } };
    this.events = []; // Event Store
  }
}

class TicketCommandHandler {
  constructor(writeDb, eventBus) {
    this.db = writeDb;
    this.bus = eventBus;
  }

  async bookTicket(cmd) {
    const { userId, concert, seat, price } = cmd;
    
    // Business logic on Write side:
    const user = this.db.users[userId];
    if (!user) throw new Error('User not found');
    
    const taken = this.db.tickets.find(t => t.concert === concert && t.seat === seat);
    if (taken) throw new Error(\`Seat \${seat} đã được đặt!\`);

    // Write to normalized table:
    const ticket = { id: 'TKT-' + Date.now(), userId, concert, seat, price, status: 'confirmed' };
    this.db.tickets.push(ticket);
    console.log(\`  ✅ Write DB: Ticket \${ticket.id} saved (normalized)\`);

    // Publish event → read side will update
    await this.bus.emit('TicketBooked', { ticket, user });
    return ticket.id;
  }
}

// ============ READ SIDE (Query) ============
class ReadDB {
  constructor() {
    // Denormalized for fast queries
    this.myTicketsView = {};   // userId → [tickets]
    this.concertSeatView = {}; // concertId → { seat → status }
  }
}

class TicketProjection {
  constructor(readDb) {
    this.db = readDb;
  }

  async on(event) {
    if (event.type !== 'TicketBooked') return;
    const { ticket, user } = event.payload;

    // Update "My Tickets" view (denormalized: user info embedded)
    if (!this.db.myTicketsView[ticket.userId]) this.db.myTicketsView[ticket.userId] = [];
    this.db.myTicketsView[ticket.userId].push({
      ticketId: ticket.id,
      userName: user.name,      // Denormalized!
      concert: ticket.concert,
      seat: ticket.seat,
      price: ticket.price.toLocaleString() + 'đ',
      status: ticket.status
    });

    // Update "Concert Seat" view
    if (!this.db.concertSeatView[ticket.concert]) this.db.concertSeatView[ticket.concert] = {};
    this.db.concertSeatView[ticket.concert][ticket.seat] = 'taken';
    
    console.log(\`  📊 Read DB updated: \${event.type}\`);
  }
}

// ============ DEMO ============
class EventBus {
  constructor() { this.handlers = []; }
  subscribe(h) { this.handlers.push(h); }
  async emit(type, payload) {
    const event = { type, payload };
    await Promise.all(this.handlers.map(h => h.on(event)));
  }
}

const writeDb = new WriteDB();
const readDb = new ReadDB();
const bus = new EventBus();
const projection = new TicketProjection(readDb);
bus.subscribe(projection);

const handler = new TicketCommandHandler(writeDb, bus);

async function demo() {
  console.log('=== Commands (Write Side) ===');
  await handler.bookTicket({ userId: 'U1', concert: 'Coldplay 2025', seat: 'A15', price: 1500000 });
  await handler.bookTicket({ userId: 'U1', concert: 'Coldplay 2025', seat: 'A16', price: 1500000 });

  console.log('\\n=== Queries (Read Side – no JOIN needed!) ===');
  const myTickets = readDb.myTicketsView['U1'];
  console.log('My Tickets for U1:');
  myTickets.forEach(t => console.log(\`  - \${t.concert} | Seat \${t.seat} | \${t.price} | \${t.status}\`));

  console.log('\\nSeat map for Coldplay 2025:');
  const seats = readDb.concertSeatView['Coldplay 2025'];
  ['A15', 'A16', 'A17'].forEach(s => {
    console.log(\`  Seat \${s}: \${seats[s] || 'available'}\`);
  });
}

demo();`,
    },
    {
      id: 'cqrs-multiple-views',
      label: '📊 Multiple Read Models',
      language: 'javascript',
      code: `// CQRS: Một Write Model → Nhiều Read Models
// Mỗi view được optimize cho use case khác nhau

class EventBus {
  constructor() { this.handlers = []; }
  subscribe(name, h) { this.handlers.push({ name, h }); }
  async emit(type, payload) {
    console.log(\`\\n⚡ Event: \${type}\`);
    for (const { name, h } of this.handlers) {
      await h({ type, payload });
      console.log(\`  → [\${name}] updated\`);
    }
  }
}

const bus = new EventBus();

// === Read Model 1: User Dashboard View ===
const dashboardView = {}; // userId → { totalSpent, ticketCount, lastBooking }
bus.subscribe('DashboardProjection', async ({ type, payload }) => {
  if (type !== 'TicketBooked') return;
  const { userId, price, concert } = payload;
  if (!dashboardView[userId]) dashboardView[userId] = { totalSpent: 0, ticketCount: 0 };
  dashboardView[userId].totalSpent += price;
  dashboardView[userId].ticketCount++;
  dashboardView[userId].lastBooking = concert;
});

// === Read Model 2: Concert Analytics View ===
const analyticsView = {}; // concert → { revenue, tickets, topSeat }
bus.subscribe('AnalyticsProjection', async ({ type, payload }) => {
  if (type !== 'TicketBooked') return;
  const { concert, price, seat } = payload;
  if (!analyticsView[concert]) analyticsView[concert] = { revenue: 0, tickets: 0, seats: [] };
  analyticsView[concert].revenue += price;
  analyticsView[concert].tickets++;
  analyticsView[concert].seats.push(seat);
});

// === Read Model 3: Search Index (Elasticsearch-like) ===
const searchIndex = []; // Flat, searchable documents
bus.subscribe('SearchIndexProjection', async ({ type, payload }) => {
  if (type !== 'TicketBooked') return;
  searchIndex.push({
    id: payload.ticketId,
    fullText: \`\${payload.userName} \${payload.concert} \${payload.seat}\`,
    ...payload
  });
});

// === Write Side: Emit events ===
async function bookTicket(data) {
  console.log(\`\\n=== Booking: \${data.concert} Seat \${data.seat} ===\`);
  await bus.emit('TicketBooked', { ...data, ticketId: 'TKT-' + Math.random().toString(36).substr(2,6) });
}

async function demo() {
  await bookTicket({ userId: 'U1', userName: 'An Nguyen', concert: 'Coldplay', seat: 'A1', price: 1500000 });
  await bookTicket({ userId: 'U2', userName: 'Binh Tran',  concert: 'Coldplay', seat: 'B5', price: 1200000 });
  await bookTicket({ userId: 'U1', userName: 'An Nguyen', concert: 'BTS World Tour', seat: 'C10', price: 2000000 });

  // Query different read models
  console.log('\\n=== 📊 Dashboard View (User U1) ===');
  const dash = dashboardView['U1'];
  console.log(\`  Total spent: \${dash.totalSpent.toLocaleString()}đ\`);
  console.log(\`  Ticket count: \${dash.ticketCount}\`);
  console.log(\`  Last booking: \${dash.lastBooking}\`);

  console.log('\\n=== 🎵 Analytics View (Coldplay) ===');
  const analytics = analyticsView['Coldplay'];
  console.log(\`  Revenue: \${analytics.revenue.toLocaleString()}đ\`);
  console.log(\`  Tickets sold: \${analytics.tickets}\`);
  console.log(\`  Seats: \${analytics.seats.join(', ')}\`);

  console.log('\\n=== 🔍 Search Index ===');
  const results = searchIndex.filter(d => d.fullText.includes('Nguyen'));
  console.log(\`  Search "Nguyen" → \${results.length} results\`);
  results.forEach(r => console.log(\`    - \${r.concert} | \${r.seat} | \${r.userName}\`));
}

demo();`,
    },
  ],
  interactive: null,
  callouts: [
    { type: 'success', icon: '📊', title: 'Multiple Read Models là killer feature', body: 'CQRS cho phép tạo nhiều read models tối ưu cho từng use case: Dashboard dùng Redis, Search dùng Elasticsearch, Reporting dùng PostgreSQL. Tất cả từ cùng một event stream.' },
    { type: 'warning', icon: '⏳', title: 'Chấp nhận Eventual Consistency', body: 'Read Model sẽ có độ trễ so với Write Model (thường < 100ms). UI cần xử lý: optimistic updates, loading indicators, hoặc polling. Đây là trade-off của CQRS.' },
    { type: 'info', icon: '⚖️', title: 'Khi nào dùng CQRS?', body: 'Chỉ dùng CQRS khi thực sự cần: read/write load khác biệt lớn, cần multiple read views, hoặc domain phức tạp. Đừng over-engineer – CRUD đơn giản cho 90% use cases.' },
    { type: 'tip', icon: '🔄', title: 'Projection có thể rebuild', body: 'Nếu Read Model bị corrupt hoặc cần thay đổi schema, chỉ cần xóa và rebuild projection bằng cách replay toàn bộ events. Đây là advantage lớn của CQRS + Event Sourcing.' },
  ],
}
