export default {
  slug: 'chat-system',
  order: 22,
  title: 'Chat System',
  emoji: '💬',
  description: 'WebSocket, Message Queue, Fan-out cho hệ thống chat real-time.',
  project: 'Chat Application.',
  problems: [
    { icon: '🔌', title: 'Quá tải kết nối đồng thời (Connection Limit)', desc: 'Vì WebSocket là kết nối dạng stateful (giữ liên tục), một server duy nhất bị giới hạn bởi RAM và số lượng file descriptor có thể duy trì.' },
    { icon: '🔄', title: 'Tin nhắn sai thứ tự (Out-of-order Messages)', desc: 'Do mạng chập chờn hoặc cơ chế retry, tin nhắn gửi sau có thể đến trước, gây lộn xộn nội dung cuộc hội thoại.' },
    { icon: '🟢', title: 'Đồng bộ trạng thái online (Presence Overhead)', desc: 'Khi một user online hoặc offline, việc thông báo trạng thái này cho hàng ngàn bạn bè của họ (Fan-out) tạo ra lượng tải khổng lồ lên hệ thống.' }
  ],
  concepts: [
    {
      name: 'WebSocket',
      icon: '🔌',
      explain: 'WebSocket là protocol full-duplex, bidirectional communication trên một TCP connection. Khác HTTP (request-response), WebSocket cho phép server push messages đến client bất kỳ lúc nào. Sau HTTP upgrade handshake, connection persistent. Độ trễ thấp (~1-5ms) cho real-time chat.',
      tip: 'Load balance WebSocket connections cần sticky session (same client → same server) hoặc pub/sub qua Redis để server A forward message đến client của server B.',
      example: '// Server (Node.js với ws library):\nconst wss = new WebSocketServer({ port: 8080 });\nconst clients = new Map(); // userId → ws\n\nwss.on("connection", (ws, req) => {\n  const userId = authenticate(req);\n  clients.set(userId, ws);\n\n  ws.on("message", async (data) => {\n    const msg = JSON.parse(data);\n    // Save to DB:\n    await db.saveMessage(msg);\n    // Deliver to recipient:\n    const recipientWs = clients.get(msg.to);\n    if (recipientWs?.readyState === WebSocket.OPEN) {\n      recipientWs.send(JSON.stringify(msg));\n    }\n  });\n\n  ws.on("close", () => clients.delete(userId));\n});',
    },
    {
      name: 'Long Polling',
      icon: '🔄',
      explain: 'Long Polling là fallback khi WebSocket không available. Client gửi HTTP request và server giữ connection open cho đến khi có message mới (hoặc timeout). Khi có message → server respond → client immediately gửi request mới. Kém hiệu quả hơn WebSocket nhưng works qua proxies.',
      tip: 'Dùng Long Polling làm fallback cho environments không support WebSocket (một số proxies/firewalls block WS). Thư viện Socket.IO tự động fallback từ WS → Long Polling.',
      example: '// Long Polling server:\nconst pendingClients = new Map(); // userId → res\n\napp.get("/poll", async (req, res) => {\n  const userId = req.user.id;\n  // Set timeout (30s):\n  const timeout = setTimeout(() => {\n    pendingClients.delete(userId);\n    res.json({ messages: [] }); // Empty response\n  }, 30000);\n\n  pendingClients.set(userId, { res, timeout });\n});\n\n// Khi có message mới:\nfunction deliverMessage(userId, message) {\n  const client = pendingClients.get(userId);\n  if (client) {\n    clearTimeout(client.timeout);\n    pendingClients.delete(userId);\n    client.res.json({ messages: [message] });\n  }\n}',
    },
    {
      name: 'Message Queue',
      icon: '📨',
      explain: 'Trong Chat System, Message Queue (Kafka/Redis Streams) giúp: (1) Decouple message sending từ delivery, (2) Persistent messages khi user offline, (3) Fan-out messages đến nhiều servers. Multi-server setup: Server A nhận message → publish Kafka → tất cả chat servers subscribe → deliver đến connected users.',
      tip: 'Redis Pub/Sub cho real-time delivery (fast nhưng không persistent). Kafka cho persistent delivery với replay capability. Combine: Kafka cho storage + Redis Pub/Sub cho real-time notification.',
      example: '// Multi-server chat với Redis Pub/Sub:\n// Server A có user Alice, Server B có user Bob\n\n// Alice gửi message đến Bob:\n// Server A:\nawait db.saveMessage({ from: "alice", to: "bob", text: "Hi!" });\nawait redis.publish(`user:bob:messages`,\n  JSON.stringify({ from: "alice", text: "Hi!" }));\n\n// Server B (subscribed):\nredis.subscribe(`user:bob:messages`, (message) => {\n  const bobWs = connectedClients.get("bob");\n  if (bobWs) bobWs.send(message);\n  // Else: user offline → message already in DB\n});',
    },
    {
      name: 'Fan-out',
      icon: '📢',
      explain: 'Fan-out trong Chat System: khi gửi message đến group chat, message phải được delivered đến tất cả members. Fan-out on Write: khi gửi → ngay lập tức copy message đến inbox của từng member (fast read, slow write). Fan-out on Read: lưu 1 copy, khi đọc mới query (fast write, slow read).',
      tip: 'Group nhỏ (<100 members): Fan-out on Write. Group lớn (1000+ members) hoặc broadcast channels: Fan-out on Read. Hybrid: Fan-out on Write cho small groups, on Read cho large groups.',
      example: '// Fan-out on Write cho group chat:\nasync function sendGroupMessage(groupId, message) {\n  // Lấy tất cả members:\n  const members = await db.getGroupMembers(groupId);\n\n  // Save message:\n  const msgId = await db.saveMessage(message);\n\n  // Fan-out: copy đến inbox từng member:\n  await Promise.all(\n    members.map(memberId =>\n      db.insertInbox(memberId, msgId)\n    )\n  );\n\n  // Notify online members via WebSocket:\n  members.forEach(memberId => {\n    const ws = connectedClients.get(memberId);\n    ws?.send(JSON.stringify(message));\n  });\n}',
    },
    {
      name: 'Presence',
      icon: '🟢',
      explain: 'Presence System cho biết user đang online hay offline. Implementation: khi user connect WebSocket → set "online" trong Redis với TTL; disconnect → delete. Heartbeat mỗi 30s để renew TTL. Query "is user online?" = Redis GET. Show "last seen" = timestamp khi user disconnect.',
      tip: 'Redis Sorted Set: zadd "online_users" timestamp userId. Expired members = offline. Không nên query DB cho presence check (too slow). Redis với TTL là approach chuẩn.',
      example: '// Presence với Redis:\nconst PRESENCE_TTL = 60; // 60 giây\n\n// User connect:\nasync function onUserConnect(userId) {\n  await redis.setex(`presence:${userId}`, PRESENCE_TTL, "online");\n  await broadcastPresence(userId, "online");\n}\n\n// Heartbeat mỗi 30s:\nsetInterval(async () => {\n  await redis.expire(`presence:${userId}`, PRESENCE_TTL);\n}, 30000);\n\n// User disconnect:\nasync function onUserDisconnect(userId) {\n  await redis.del(`presence:${userId}`);\n  await redis.set(`last_seen:${userId}`, Date.now(), "EX", 86400);\n  await broadcastPresence(userId, "offline");\n}\n\n// Check presence:\nasync function isOnline(userId) {\n  return await redis.exists(`presence:${userId}`);\n}',
    },
  ],
  demos: [
    {
      id: 'ws-heartbeat',
      label: '🔌 WS Heartbeat Manager',
      language: 'javascript',
      code: `// Giả lập cơ chế Heartbeat Ping/Pong của WebSocket Connection
class WebSocketConnection {
  constructor(userId) {
    this.userId = userId;
    this.isAlive = true;
  }

  ping() {
    console.log(\`📡 Server -> Ping \${this.userId}\`);
    this.isAlive = false; // Set tạm thời thành false, đợi client pong
  }

  pong() {
    console.log(\`   Client \${this.userId} -> Pong 🟢\`);
    this.isAlive = true;
  }
}

class ChatServer {
  constructor() {
    this.connections = new Map();
  }

  addConnection(userId) {
    const conn = new WebSocketConnection(userId);
    this.connections.set(userId, conn);
    console.log(\`✅ Thiết lập kết nối WebSocket cho \${userId}\`);
  }

  // Chạy heartbeat check định kỳ (giả lập)
  startHeartbeatCheck() {
    console.log('\\n=== Bắt đầu kiểm tra định kỳ (Heartbeat Check) ===');
    this.connections.forEach((conn, userId) => {
      if (conn.isAlive === false) {
        console.log(\`🚨 Node detected dead client \${userId}. Đang giải phóng kết nối...\`);
        this.connections.delete(userId);
      } else {
        conn.ping();
      }
    });
  }
}

const server = new ChatServer();
server.addConnection('user_alice');
server.addConnection('user_bob');

// Alice phản hồi Pong
server.connections.get('user_alice').pong();

// Bob chập chờn mạng không gửi Pong kịp
server.startHeartbeatCheck(); // Gửi Ping

// Giả lập lần quét tiếp theo
setTimeout(() => {
  // Alice vẫn phản hồi tiếp
  server.connections.get('user_alice')?.pong();
  server.startHeartbeatCheck();
}, 100);`
    },
    {
      id: 'redis-pubsub-relay',
      label: '📨 Redis Multi-Server Relay',
      language: 'javascript',
      code: `// Giả lập Redis Pub/Sub làm cầu nối tin nhắn giữa các Chat Server vật lý khác nhau
class ChatServerInstance {
  constructor(serverId, redisBroker) {
    this.serverId = serverId;
    this.broker = redisBroker;
    this.localClients = new Map(); // local sockets: userId -> socket
    
    // Đăng ký nhận tin từ Message Broker
    this.broker.subscribe(serverId, (message) => {
      this.deliverLocally(message);
    });
  }

  connectClient(userId) {
    this.localClients.set(userId, { name: userId });
    console.log(\`📱 [Connect] User \${userId} kết nối trực tiếp vào \${this.serverId}\`);
  }

  // Khi client gửi tin đi
  sendMessage(from, to, text) {
    console.log(\`\\n✉️ [Send] \${from} gửi tin tới \${to}: "\${text}"\`);
    const payload = { from, to, text };
    
    // Hỏi Broker xem user đích ở server nào để chuyển tiếp
    const targetServer = this.broker.lookupUserServer(to);
    if (targetServer) {
      console.log(\`   Routing tin nhắn qua Message Broker tới channel của \${targetServer}...\`);
      this.broker.publish(targetServer, payload);
    } else {
      console.log(\`   User \${to} đang offline. Lưu tin nhắn vào Database.\`);
    }
  }

  // Nhận tin từ broker và đẩy xuống socket client cục bộ
  deliverLocally(payload) {
    const client = this.localClients.get(payload.to);
    if (client) {
      console.log(\`🚀 [\${this.serverId}] Đã truyền tin nhắn xuống socket của \${payload.to}: "\${payload.text}" (Gửi từ: \${payload.from})\`);
    }
  }
}

// Giả lập Redis Message Broker
class RedisBroker {
  constructor() {
    this.channels = new Map(); // serverId -> array of subscribers
    this.userRouting = new Map(); // userId -> serverId
  }

  registerUser(userId, serverId) {
    this.userRouting.set(userId, serverId);
  }

  lookupUserServer(userId) {
    return this.userRouting.get(userId);
  }

  subscribe(serverId, callback) {
    this.channels.set(serverId, callback);
  }

  publish(serverId, message) {
    const callback = this.channels.get(serverId);
    if (callback) callback(message);
  }
}

const broker = new RedisBroker();
const serverA = new ChatServerInstance('Server-A', broker);
const serverB = new ChatServerInstance('Server-B', broker);

// Alice kết nối Server A, Bob kết nối Server B
serverA.connectClient('Alice');
broker.registerUser('Alice', 'Server-A');

serverB.connectClient('Bob');
broker.registerUser('Bob', 'Server-B');

// Alice chat với Bob
serverA.sendMessage('Alice', 'Bob', 'Chào Bob, mình ở server A nhé!');`
    }
  ],
  interactive: null,
  callouts: [
    { type: 'warning', icon: '⚠️', title: 'WebSocket là Stateful Connection', body: 'Hãy cẩn thận vì bạn không thể áp dụng các Load Balancer thông thường kiểu Round-Robin cho WebSocket. Cần cấu hình Sticky Session ở tầng Load Balancer để đảm bảo Handshake và Connection đi cùng một cụm Server.' },
    { type: 'success', icon: '🟢', title: 'Redis là công cụ Presence tuyệt vời', body: 'Dùng Redis với thời gian hết hạn TTL tự động cập nhật qua Heartbeat là giải pháp nhẹ nhàng nhất để lưu trữ trạng thái Online/Offline mà không gây tải cho SQL Database.' },
    { type: 'info', icon: '⚡', title: 'Cân nhắc Server-Sent Events (SSE)', body: 'Nếu bạn đang làm tính năng chỉ yêu cầu luồng dữ liệu 1 chiều từ Server xuống Client (như Notification, Live Feed), SSE là một sự thay thế nhẹ nhàng, đơn giản và ít tốn tài nguyên hơn WebSocket.' },
    { type: 'tip', icon: '🔢', title: 'Giải quyết thứ tự tin nhắn', body: 'Đừng dùng timestamp thuần túy để sắp xếp tin nhắn (nhiều tin nhắn trong cùng 1 mili giây sẽ bị sai lệch). Hãy sử dụng ID tăng dần tự động của Database hoặc chuỗi Sequence ID cục bộ do client sinh ra trước.' }
  ],
  quiz: [
    {
      q: 'WebSocket khác biệt cơ bản gì so với HTTP request-response thông thường?',
      options: ['Chỉ cho phép client gửi request, server không bao giờ push được', 'Là kết nối stateless, tự đóng ngay sau mỗi message', 'Chỉ hoạt động thông qua HTTP polling định kỳ', 'Là kết nối full-duplex cho phép server push message đến client bất kỳ lúc nào'],
      answer: 3,
      explain: 'WebSocket là full-duplex, bidirectional trên một TCP connection persistent, nên server có thể chủ động push message cho client.',
    },
    {
      q: 'Vì sao không thể dùng Load Balancer kiểu Round-Robin thông thường cho WebSocket?',
      options: ['Vì WebSocket chỉ hỗ trợ đúng một server duy nhất', 'Vì WebSocket là kết nối stateful, cần Sticky Session để giữ client ở đúng server', 'Vì WebSocket hoàn toàn không tương thích với HTTP', 'Vì Round-Robin làm tăng độ trễ của tin nhắn'],
      answer: 1,
      explain: 'WebSocket giữ kết nối liên tục (stateful) nên cần Sticky Session hoặc pub/sub qua Redis để handshake và connection đi cùng một server.',
    },
    {
      q: 'Khi gửi tin nhắn tới một group chat nhỏ (dưới 100 thành viên), chiến lược nào phù hợp nhất?',
      options: ['Fan-out on Write: copy ngay tin nhắn vào inbox của từng thành viên', 'Fan-out on Read: chỉ lưu 1 bản, khi thành viên đọc mới query', 'Không cần fan-out, gửi trực tiếp qua HTTP POST', 'Dùng Long Polling cho toàn bộ thành viên'],
      answer: 0,
      explain: 'Group nhỏ nên dùng Fan-out on Write (fast read, slow write chấp nhận được). Group lớn mới cân nhắc Fan-out on Read.',
    },
    {
      q: 'Cách chuẩn để triển khai hệ thống Presence (online/offline) là gì?',
      options: ['Query SQL Database mỗi lần cần kiểm tra trạng thái', 'Lưu trạng thái trong RAM của một server duy nhất', 'Dùng Redis với TTL, renew qua heartbeat mỗi 30s', 'Gửi email thông báo mỗi khi user đổi trạng thái'],
      answer: 2,
      explain: 'Set key presence trong Redis với TTL khi connect, heartbeat renew TTL, disconnect thì xóa key. Query DB cho presence là quá chậm.',
    },
  ],
  challenge: {
    brief: 'Thiết kế một hệ thống chat real-time như Messenger hoặc WhatsApp: hỗ trợ 1-1, group chat và trạng thái online.',
    scale: ['50 triệu DAU, cao điểm 10 triệu kết nối đồng thời', '40 tỷ tin nhắn/ngày', 'p99 gửi tin < 100ms', 'Lưu lịch sử tin nhắn tối thiểu 1 năm'],
    requirements: [
      'Nhắn tin 1-1 và group real-time kèm biên nhận đã gửi/đã nhận',
      'Lưu và đồng bộ tin nhắn khi user offline rồi online lại',
      'Hiển thị trạng thái online/offline và last seen',
      '(Tuỳ chọn) đảm bảo đúng thứ tự tin nhắn trong một hội thoại',
    ],
    steps: [
      { title: 'Capacity Estimation', prompt: 'Ước lượng số kết nối đồng thời, QPS tin nhắn, RAM giữ kết nối và dung lượng lưu trữ.', hint: '40 tỷ tin/ngày ≈ 460.000 tin/s (cao điểm x3). 10 triệu WebSocket đồng thời, mỗi kết nối ~10KB RAM → ~100GB RAM chỉ để duy trì kết nối, cần hàng nghìn chat server. Lưu 40 tỷ x 300B ≈ 12TB/ngày.' },
      { title: 'API Design', prompt: 'Định nghĩa các sự kiện WebSocket real-time và REST endpoint tải lịch sử.', hint: 'WS events: sendMessage, messageDelivered, typing, presenceUpdate. REST: GET /conversations, GET /conversations/{id}/messages?before=cursor. Nâng cấp qua HTTP handshake rồi giữ kết nối persistent.' },
      { title: 'Data Model', prompt: 'Thiết kế schema lưu tin nhắn, hội thoại và inbox. SQL hay NoSQL?', hint: 'messages(message_id snowflake, conversation_id, sender_id, content, created_at). Ghi-nhiều + tra theo conversation_id → wide-column store (Cassandra/HBase) phân vùng theo conversation_id, sắp theo message_id tăng dần.' },
      { title: 'Realtime Delivery & Presence', prompt: 'Làm sao chuyển tin giữa 2 user ở 2 server khác nhau và quản lý presence cùng fan-out group?', hint: 'Sticky session ở LB cho WebSocket. Server A publish tin qua Redis Pub/Sub hoặc Kafka → server B đang giữ kết nối người nhận đẩy xuống socket. Presence: Redis key TTL 60s, heartbeat 30s renew, disconnect thì xóa. Group nhỏ (< 100) fan-out on write, group lớn/broadcast fan-out on read.' },
      { title: 'Scale & Trade-offs', prompt: 'Bàn về sticky session, thứ tự tin nhắn, presence fan-out và WebSocket vs Long Polling/SSE.', hint: 'Thứ tự: dùng sequence ID / snowflake tăng dần thay vì timestamp thuần (nhiều tin trong 1ms sẽ lệch). User có hàng nghìn bạn bè tạo presence fan-out lớn → gom batch hoặc chỉ cập nhật khi bạn bè đang xem. Long Polling/SSE làm fallback khi proxy chặn WS.' },
    ],
    rubric: [
      'Có ước lượng cụ thể số kết nối đồng thời, QPS tin nhắn và RAM/dung lượng',
      'API tách bạch kênh real-time (WebSocket) và tải lịch sử (REST)',
      'Data model chịu ghi-nhiều, tra cứu theo hội thoại và giữ đúng thứ tự',
      'Giải thích cơ chế delivery đa server (Pub/Sub-Kafka) và presence bằng Redis TTL',
      'Nêu được ít nhất 2 trade-offs (sticky session, fan-out presence, WS vs SSE)',
    ],
  },
}
