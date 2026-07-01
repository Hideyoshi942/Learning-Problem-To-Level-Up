export default {
  slug: 'ticket-booking',
  order: 27,
  title: 'Ticket Booking',
  emoji: '🎟️',
  description: 'Concurrency, distributed lock, seat reservation cho hệ thống đặt vé.',
  project: 'Ticket Booking.',
  problems: [
    { icon: '⚔️', title: 'Đặt trùng ghế (Double Booking)', desc: 'Xảy ra khi hàng trăm người dùng cùng bấm nút thanh toán một chiếc ghế trống tại cùng một mili giây, dẫn đến việc bán một ghế cho nhiều người.' },
    { icon: '⏳', title: 'Khóa ảo giữ ghế (Seat Hoarding)', desc: 'Nhiều người dùng chọn ghế để giữ chỗ rồi bỏ đi không thanh toán. Ghế bị khóa ảo (lock holding) khiến khách hàng thực tế khác không mua được.' },
    { icon: '🌪️', title: 'Quá tải đột biến (Flash Sale Traffic Spike)', desc: 'Khi liveshow của ca sĩ nổi tiếng mở bán, hàng triệu request đổ vào hệ thống trong 1 giây, gây sập server và đứt kết nối Database.' }
  ],
  concepts: [
    {
      name: 'Distributed Lock',
      icon: '🔐',
      explain: 'Distributed Lock trong ticket booking ngăn nhiều users cùng book cùng seat. Khi user chọn ghế → acquire lock cho seat ID (Redis SETNX với TTL ~10 phút). Nếu không acquire được → ghế đã có người đang chọn. Sau khi payment xong → confirm booking và release lock.',
      tip: 'TTL phải đủ để hoàn thành payment nhưng không quá dài. Cần UX "timer countdown" hiển thị cho user biết còn bao nhiêu thời gian. Nếu timeout → release lock và notify user.',
      example: '// Seat reservation với Distributed Lock:\nasync function reserveSeat(seatId, userId) {\n  const lockKey = `seat:lock:${seatId}`;\n  const TTL = 600; // 10 phút để thanh toán\n\n  // Acquire lock:\n  const locked = await redis.set(\n    lockKey, userId, "NX", "EX", TTL\n  );\n\n  if (!locked) {\n    const holder = await redis.get(lockKey);\n    throw new Error(holder === userId\n      ? "You already reserved this seat"\n      : "Seat is being reserved by another user"\n    );\n  }\n\n  // Lock acquired! Create temp reservation in DB:\n  await db.insert("temp_reservations", {\n    seat_id: seatId, user_id: userId,\n    expires_at: new Date(Date.now() + TTL * 1000)\n  });\n\n  return { reservationId, expiresIn: TTL };\n}',
    },
    {
      name: 'Optimistic Locking',
      icon: '🤞',
      explain: 'Optimistic Locking cho ticket booking: không lock ngay khi user xem ghế. Chỉ check version/status khi user confirm booking. Nếu status đã thay đổi (người khác book trước) → fail và thông báo. Giảm lock contention, tốt hơn khi conflict rate thấp (most users book different seats).',
      tip: 'Kết hợp Optimistic Locking (cho most cases) với Distributed Lock (cho hot events khi nhiều người cùng chọn 1 ghế). Check-then-act phải trong một transaction.',
      example: '// Optimistic Locking với version:\n// Schema: seats(id, status, version)\n\nasync function confirmBooking(seatId, userId, expectedVersion) {\n  // Atomic update với version check:\n  const result = await db.query(`\n    UPDATE seats\n    SET status = \'booked\', user_id = $1, version = version + 1\n    WHERE id = $2\n      AND status = \'available\'\n      AND version = $3  -- Optimistic check!\n  `, [userId, seatId, expectedVersion]);\n\n  if (result.rowsAffected === 0) {\n    // Seat was taken by someone else!\n    throw new ConflictError("Seat no longer available");\n  }\n  return { success: true };\n}',
    },
    {
      name: 'Queue',
      icon: '📋',
      explain: 'Queue (Virtual Waiting Queue) xử lý traffic spike khi hot events mở bán (flash sale). Thay vì tất cả users hit server đồng thời, Queue cho phép xử lý từng batch. Người dùng nhận "position in queue" và waiting time estimate. Khi đến lượt → redirect vào booking flow.',
      tip: 'Queue không xóa bỏ concurrency issues nhưng serializes demand. Kết hợp với rate limiting và distributed lock. Implement qua Redis Sorted Set hoặc dedicated queue service.',
      example: '// Virtual Queue với Redis Sorted Set:\nasync function joinQueue(userId, eventId) {\n  const queueKey = `queue:${eventId}`;\n  const timestamp = Date.now();\n\n  // Add to queue (score = timestamp, earlier = higher priority):\n  await redis.zadd(queueKey, timestamp, userId);\n\n  // Get position:\n  const position = await redis.zrank(queueKey, userId);\n  const ahead = position; // 0-indexed\n\n  // Estimate wait time (assume 30s/person):\n  const waitSeconds = ahead * 30;\n\n  return { position: ahead + 1, waitSeconds };\n}\n\n// Process queue (run every 30s):\nasync function processQueue(eventId, batchSize = 10) {\n  const next = await redis.zrange(`queue:${eventId}`, 0, batchSize - 1);\n  next.forEach(userId => notifyAndRedirect(userId, eventId));\n  await redis.zrem(`queue:${eventId}`, ...next);\n}',
    },
    {
      name: 'Reservation Timeout',
      icon: '⏱️',
      explain: 'Reservation Timeout là cơ chế tự động release seat nếu user không hoàn thành payment trong time limit. Implement: background job quét expired reservations mỗi phút, hoặc Redis TTL với keyspace notifications. Cần cleanup cả DB record lẫn distributed lock.',
      tip: 'Dùng Redis keyspace notifications để react ngay khi key expire (gần real-time) thay vì polling. Configure: notify-keyspace-events Ex (expired events).',
      example: '// Redis keyspace notification khi lock expire:\n// redis.conf: notify-keyspace-events Ex\n\nconst subscriber = redis.duplicate();\nawait subscriber.subscribe("__keyevent@0__:expired");\n\nsubscriber.on("message", async (channel, expiredKey) => {\n  if (expiredKey.startsWith("seat:lock:")) {\n    const seatId = expiredKey.replace("seat:lock:", "");\n    // Release reservation:\n    await db.query(`\n      UPDATE seats SET status=\'available\', user_id=null\n      WHERE id=$1 AND status=\'reserved\'\n    `, [seatId]);\n    await db.delete("temp_reservations", { seat_id: seatId });\n    console.log(`Seat ${seatId} released due to timeout`);\n  }\n});',
    },
    {
      name: 'CQRS',
      icon: '✂️',
      explain: 'CQRS trong Ticket Booking: Write side xử lý reservation commands (strict consistency, distributed locks). Read side cung cấp seat availability view (denormalized, cached, eventual consistent). Seat map read-heavy (thousands of users viewing concurrently) → cache aggressive. Seat booking write-heavy với strict ordering.',
      tip: 'Read Model (seat availability) được update via events: SeatReserved, SeatReleased, SeatBooked. Cache seat map trong Redis. Invalidate cache khi events xảy ra.',
      example: '// Write side - strict with lock:\nasync function reserveSeatCommand(cmd) {\n  const lock = await acquireLock(`seat:${cmd.seatId}`);\n  try {\n    // Strict consistency check:\n    const seat = await writeDb.findSeat(cmd.seatId);\n    if (seat.status !== "available") throw new ConflictError();\n    await writeDb.updateSeat(cmd.seatId, { status: "reserved", userId: cmd.userId });\n    await eventBus.emit("SeatReserved", { seatId: cmd.seatId });\n  } finally {\n    await lock.release();\n  }\n}\n\n// Read side - fast from cache:\nasync function getSeatMapQuery(eventId) {\n  const cached = await redis.get(`seatmap:${eventId}`);\n  if (cached) return JSON.parse(cached);\n  const map = await readDb.getSeatMap(eventId); // Denormalized view\n  await redis.setex(`seatmap:${eventId}`, 5, JSON.stringify(map));\n  return map;\n}',
    },
  ],
  demos: [
    {
      id: 'seat-reservation',
      label: '🔐 Distributed Seat Lock',
      language: 'javascript',
      code: `// Giả lập cơ chế giữ ghế (Seat Reservation) bằng Distributed Lock trong Redis
class RedisMock {
  constructor() {
    this.store = new Map(); // key -> value
    this.ttls = new Map();  // key -> expiration timestamp
  }

  // Thuật toán SET với tham số NX (Not Exists) và EX (Expire)
  setNXEX(key, value, expireSeconds) {
    // 1. Kiểm tra tồn tại khóa và check hết hạn
    if (this.store.has(key)) {
      const isExpired = this.ttls.get(key) < Date.now();
      if (!isExpired) {
        return false; // Khóa vẫn còn hiệu lực -> Không ghi đè
      }
    }

    // 2. Ghi khóa mới và thiết lập TTL
    this.store.set(key, value);
    this.ttls.set(key, Date.now() + expireSeconds * 1000);
    return true;
  }

  get(key) {
    if (this.ttls.has(key) && this.ttls.get(key) < Date.now()) {
      this.store.delete(key);
      this.ttls.delete(key);
      return null;
    }
    return this.store.get(key);
  }

  delete(key) {
    this.store.delete(key);
    this.ttls.delete(key);
  }
}

const redis = new RedisMock();

function tryReserveSeat(seatId, userId) {
  const lockKey = \`seat:lock:\${seatId}\`;
  const holdTime = 2; // Giữ ghế trong 2 giây (giả lập ngắn để chạy thử)

  const success = redis.setNXEX(lockKey, userId, holdTime);
  if (success) {
    console.log(\`✅ [\${userId}] Đã đặt khóa thành công ghế \${seatId}. Bạn có \${holdTime}s để thanh toán.\`);
  } else {
    const activeUser = redis.get(lockKey);
    console.log(\`❌ [\${userId}] Giữ ghế \${seatId} THẤT BẠI. Ghế đang bị giữ bởi: \${activeUser}\`);
  }
}

// Giả lập hai user tranh nhau ghế A1
tryReserveSeat('A1', 'User_Alice');
tryReserveSeat('A1', 'User_Bob'); // Thất bại vì Alice đang giữ

// Giả lập sau 2.5 giây (hết holdTime)
setTimeout(() => {
  console.log('\\n=== Sau 2.5s (Hết hạn khóa của Alice) ===');
  tryReserveSeat('A1', 'User_Bob'); // Bob giữ thành công
}, 2500);`
    },
    {
      id: 'optimistic-locking',
      label: '🤞 Concurrency Control',
      language: 'javascript',
      code: `// Giả lập kiểm soát đồng thời bằng Optimistic Locking (Khóa lạc quan) với Version
class TicketService {
  constructor() {
    // Ghế A12 ở Database
    this.dbSeat = {
      id: 'A12',
      status: 'AVAILABLE',
      userId: null,
      version: 1 // Trường quản lý phiên bản
    };
  }

  // Cố gắng đặt ghế với phiên bản mong muốn
  confirmBooking(userId, clientExpectedVersion) {
    console.log(\`\\n🎟️ [\${userId}] Gửi request thanh toán ghế A12 với version dự kiến: \${clientExpectedVersion}\`);

    // Kiểm tra nguyên tử (Atomic Check-then-Act)
    if (this.dbSeat.status === 'AVAILABLE' && this.dbSeat.version === clientExpectedVersion) {
      // Thành công -> cập nhật DB và tăng version
      this.dbSeat.status = 'BOOKED';
      this.dbSeat.userId = userId;
      this.dbSeat.version += 1;
      console.log(\`   ✅ [\${userId}] Giao dịch thành công! DB Seat version hiện tại: \${this.dbSeat.version}\`);
      return true;
    } else {
      console.log(\`   ❌ [\${userId}] Thất bại! Ghế đã được book trước đó hoặc version đã thay đổi (Version thực tế: \${this.dbSeat.version})\`);
      return false;
    }
  }
}

const service = new TicketService();

// Giả sử hai client cùng lấy được thông tin ghế A12 ở version 1
const client1Version = 1;
const client2Version = 1;

// Client 1 gửi yêu cầu trước
service.confirmBooking('User_Alice', client1Version);

// Client 2 gửi yêu cầu trễ hơn một chút (nhưng vẫn mang theo version 1)
service.confirmBooking('User_Bob', client2Version);`
    }
  ],
  callouts: [
    { type: 'warning', icon: '⚠️', title: 'Hạn chế thời gian giữ khóa tối đa', body: 'Thời gian giữ khóa ghế ảo (Lock TTL) chỉ nên kéo dài từ 5-10 phút. Nếu đặt quá dài, kẻ xấu có thể thực hiện tấn công "Seat Hoarding" làm tê liệt việc bán vé của các ghế.' },
    { type: 'success', icon: '📋', title: 'Hàng chờ ảo (Virtual Waiting Room)', body: 'Với các sự kiện cực hot, việc sử dụng các hàng chờ ảo (như Queue-It) ở tầng Gateway giúp chặn bớt lưu lượng, xếp hàng và chỉ cho phép một lượng nhỏ user truy cập hệ thống ở mỗi thời điểm.' },
    { type: 'info', icon: '🔑', title: 'Tại sao Redis tốt hơn SQL Lock?', body: 'Việc sử dụng Distributed Lock trên Redis (bằng bộ nhớ RAM) giúp giảm thiểu các truy vấn khóa chặn (blocking query) kéo dài trên Database SQL, giảm nguy cơ sập DB do deadlock.' },
    { type: 'tip', icon: '⚡', title: 'Invalidate cache nhanh chóng qua Pub/Sub', body: 'Khi một ghế được đặt thành công, hãy gửi tin nhắn thông báo qua Redis Pub/Sub để tất cả các API nodes lập tức invalidate local cache, hiển thị trạng thái ghế "Đã bán" cho các người dùng khác.' }
  ],
  quiz: [
    {
      q: 'Distributed Lock giữ ghế trong ticket booking thường được triển khai như thế nào?',
      options: ['Dùng SQL SELECT FOR UPDATE giữ khóa vĩnh viễn trên hàng ghế', 'Redis SETNX kèm TTL, nếu không acquire được thì ghế đang có người chọn', 'Lưu trạng thái ghế trong localStorage của client', 'Broadcast toàn bộ ghế qua WebSocket cho mọi user cùng lúc'],
      answer: 1,
      explain: 'Khi user chọn ghế sẽ acquire lock cho seat ID bằng Redis SETNX với TTL khoảng 10 phút; nếu không acquire được nghĩa là ghế đang bị người khác giữ.',
    },
    {
      q: 'Optimistic Locking phù hợp nhất trong trường hợp nào?',
      options: ['Khi hầu hết users cùng tranh đúng một ghế hot duy nhất', 'Khi cần khóa ghế ngay tại thời điểm user vừa mở xem sơ đồ', 'Khi hệ thống hoàn toàn không dùng tới Database', 'Khi conflict rate thấp, đa số users đặt những ghế khác nhau'],
      answer: 3,
      explain: 'Optimistic Locking không khóa ngay khi xem mà chỉ check version/status lúc confirm, giảm lock contention và tốt hơn khi tỉ lệ xung đột thấp.',
    },
    {
      q: 'Virtual Waiting Queue giúp giải quyết traffic spike bằng cách nào?',
      options: ['Serializes demand, xử lý từng batch thay vì để tất cả users hit server đồng thời', 'Xóa bỏ hoàn toàn concurrency issues mà không cần bất kỳ lock nào', 'Tăng gấp đôi số lượng ghế có thể bán ra trong sự kiện', 'Mã hóa thông tin thanh toán của từng user trong hàng chờ'],
      answer: 0,
      explain: 'Queue không xóa bỏ concurrency issues nhưng serializes demand: user nhận position in queue và khi đến lượt mới được redirect vào booking flow, giúp xử lý theo batch.',
    },
    {
      q: 'Ưu điểm của việc dùng Redis keyspace notifications cho Reservation Timeout là gì?',
      options: ['Tăng TTL của lock lên vô hạn để không bao giờ mất ghế', 'Chỉ cần chạy background job polling mỗi giờ một lần', 'React gần real-time ngay khi key expire thay vì phải polling liên tục', 'Xóa toàn bộ ghế trong hệ thống mỗi khi có một timeout'],
      answer: 2,
      explain: 'Keyspace notifications (notify-keyspace-events Ex) cho phép hệ thống nhận event ngay khi key hết hạn để release ghế gần real-time, thay vì polling định kỳ.',
    },
  ],
  challenge: {
    brief: 'Thiết kế hệ thống bán vé cho sự kiện hot: hàng triệu người tranh mua trong vài giây mà không bán trùng ghế.',
    scale: ['1 triệu vé mở bán trong 10 phút', '2 triệu người dùng đồng thời lúc mở cổng', 'Giữ ghế tối đa 10 phút chờ thanh toán', 'p99 xem sơ đồ ghế < 1 giây'],
    requirements: [
      'Hiển thị sơ đồ ghế và trạng thái còn/hết real-time',
      'Giữ ghế tạm khi user chọn, không cho người khác cướp',
      'Tuyệt đối không bán trùng một ghế cho hai người',
      'Tự động nhả ghế nếu user không thanh toán kịp',
    ],
    steps: [
      { title: 'Capacity Estimation', prompt: 'Ước lượng QPS đọc sơ đồ ghế và QPS ghi đặt ghế lúc mở bán.', hint: '2 triệu user cùng xem, mỗi người vài request → hàng trăm nghìn read/s (read-heavy). Ghi đặt ghế thấp hơn nhiều nhưng cần strict ordering. Tách read và write.' },
      { title: 'API Design', prompt: 'Thiết kế API xem ghế, giữ ghế và xác nhận. Làm sao chặn bớt dòng traffic đỉnh?', hint: 'GET /api/events/:id/seats (cache), POST /api/seats/:id/hold (acquire lock), POST /api/bookings/confirm. Đặt virtual waiting queue ở gateway để nhả từng batch user vào.' },
      { title: 'Data Model', prompt: 'Thiết kế lưu trạng thái ghế, khóa giữ ghế và reservation tạm. Đặt TTL ở đâu?', hint: 'seats(id, status, version) cho optimistic locking. Khóa giữ ghế trên Redis SET NX EX ~600s. temp_reservations(seat_id, user_id, expires_at) để cleanup khi timeout.' },
      { title: 'Concurrency & Anti-Oversell', prompt: 'Đảm bảo một ghế chỉ bán cho đúng một người khi hàng nghìn request tranh cùng lúc.', hint: 'Distributed lock (Redis SETNX + TTL) cho ghế hot. Optimistic locking (check version trong UPDATE ... WHERE version=?) cho phần lớn ca. Check-then-act phải nằm trong một transaction.' },
      { title: 'Scale & Trade-offs', prompt: 'Xử lý flash sale, nhả ghế hết hạn và cân đối consistency với UX.', hint: 'Virtual queue serializes demand, xử lý theo batch. Reservation timeout dùng Redis keyspace notification (gần real-time) thay vì polling. CQRS: read side cache eventual-consistent, write side strict. Trade-off: TTL ngắn tránh hoarding vs đủ dài để kịp trả tiền.' },
    ],
    rubric: [
      'Có ước lượng QPS đọc/ghi và nhận ra đây là read-heavy khi mở bán',
      'API có giữ ghế, xác nhận và cơ chế virtual queue chặn traffic đỉnh',
      'Data model có version cho optimistic locking và TTL cho reservation',
      'Giải thích cơ chế chống oversell (distributed lock + optimistic locking)',
      'Nêu cách nhả ghế hết hạn và ít nhất 2 trade-offs khi scale',
    ],
  },
}
