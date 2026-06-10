export default {
  slug: 'distributed-lock',
  order: 9,
  title: 'Distributed Lock',
  emoji: '🔐',
  description: 'Distributed Lock ngăn nhiều instance cùng xử lý một resource. Quan trọng trong môi trường microservices và horizontal scaling.',
  project: 'Hệ thống đặt vé.',
  problems: [
    { icon: '🎭', title: 'Race condition', desc: '2 users cùng mua vé cuối → oversell!' },
    { icon: '💀', title: 'Deadlock phân tán', desc: 'Lock không được release do process crash.' },
  ],
  concepts: [
    {
      name: 'Redis SETNX',
      icon: '🔴',
      explain: 'SETNX (SET if Not eXists) là lệnh Redis đặt key chỉ khi chưa tồn tại. Dùng để implement distributed lock: SET key value NX EX timeout. Atomic trong Redis (single-threaded). Nếu SET thành công → có lock. Nếu fail → người khác đang giữ lock.',
      tip: 'Luôn set TTL (EX) cùng lúc với NX trong một lệnh SET. Không dùng SETNX rồi EXPIRE riêng – có thể process crash giữa 2 lệnh → lock không bao giờ expire.',
      example: '// ✅ Atomic SET với NX và EX:\nconst lockAcquired = await redis.set(\n  "lock:ticket:42",    // key\n  "owner-uuid-1234",   // value (owner ID để verify)\n  "NX",               // Only set if not exists\n  "EX", 30            // Expire sau 30 giây\n);\n\nif (!lockAcquired) {\n  throw new Error("Resource locked, try again");\n}\n\ntry {\n  await processPurchase(ticket);\n} finally {\n  await releaseLock("lock:ticket:42", "owner-uuid-1234");\n}',
    },
    {
      name: 'Redlock Algorithm',
      icon: '🔒',
      explain: 'Redlock là thuật toán của Redis cho distributed lock với multiple Redis nodes. Để acquire lock: cố gắng set lock trên N nodes (≥3). Nếu majority (N/2+1) thành công trong thời gian ngắn → lock acquired. Giải quyết vấn đề single Redis node failure.',
      tip: 'Redlock bị Martin Kleppmann phê bình vì không đảm bảo safety với clock skew và GC pauses. Dùng fencing token để safe hơn khi critical. Với non-critical workloads, single Redis node SETNX đủ.',
      example: '// Redlock với 5 Redis nodes:\n// Cần acquire lock trên ít nhất 3/5 nodes\n\nconst redlock = new Redlock([redis1, redis2, redis3, redis4, redis5]);\n\ntry {\n  // Acquire lock với TTL 30s, retry 3 lần\n  const lock = await redlock.acquire(["lock:resource"], 30000);\n\n  try {\n    await criticalSection();\n  } finally {\n    await lock.release(); // Release trên tất cả nodes\n  }\n} catch (err) {\n  // Không acquire được lock\n}',
    },
    {
      name: 'ZooKeeper',
      icon: '🦁',
      explain: 'ZooKeeper là distributed coordination service, thường dùng cho distributed lock, leader election, và service discovery. Dùng ephemeral nodes (tự xóa khi client disconnect) để implement lock an toàn hơn Redis – không cần TTL vì node tự xóa khi holder crash.',
      tip: 'ZooKeeper phức tạp hơn Redis nhưng cung cấp stronger consistency (ZAB protocol). Dùng khi cần strict ordering và strong consistency. Kubernetes, Kafka dùng ZooKeeper (hoặc KRaft thay thế mới hơn).',
      example: '// ZooKeeper Distributed Lock (Java/Curator):\nInterProcessMutex lock = new InterProcessMutex(\n  client, "/locks/ticket-42"\n);\n\nif (lock.acquire(30, TimeUnit.SECONDS)) {\n  try {\n    processPurchase(ticket);\n  } finally {\n    lock.release();\n  }\n} else {\n  throw new Exception("Could not acquire lock");\n}\n\n// Ephemeral node tự xóa nếu client crash\n// → Không cần lo lock bị giữ mãi',
    },
    {
      name: 'Lease Timeout',
      icon: '⏱️',
      explain: 'Lease Timeout là TTL của lock – thời gian tối đa một process được giữ lock. Nếu process crash mà không release, lock sẽ tự expire sau timeout. Quan trọng để tránh lock bị giữ mãi (lock leak). Timeout phải đủ dài cho operation nhưng không quá dài.',
      tip: 'Timeout nên = expected_duration × safety_factor (ví dụ: 2-3x). Nếu operation thường mất 1s, set timeout 10s. Implement lock renewal (heartbeat) cho long-running operations.',
      example: '// Lock renewal cho long-running operations:\nconst LOCK_TTL = 30; // 30 giây\n\nasync function acquireWithRenewal(key) {\n  await redis.set(key, "owner", "NX", "EX", LOCK_TTL);\n\n  // Heartbeat: renew mỗi 10 giây\n  const heartbeat = setInterval(async () => {\n    await redis.expire(key, LOCK_TTL); // Reset TTL\n  }, 10000);\n\n  return () => {\n    clearInterval(heartbeat);\n    redis.del(key); // Release\n  };\n}\n\nconst release = await acquireWithRenewal("lock:job");\ntry { await longRunningJob(); }\nfinally { release(); }',
    },
    {
      name: 'Fencing Token',
      icon: '🛡️',
      explain: 'Fencing Token giải quyết vấn đề "lock held by dead process but storage still accepts writes": mỗi lần lock được granted, server cấp một monotonically increasing token. Client phải gửi token kèm mọi request. Server reject requests với token cũ hơn token hiện tại.',
      tip: 'Fencing Token là giải pháp đúng đắn nhất theo Martin Kleppmann. Cần server-side support. ZooKeeper cung cấp epoch/zxid. Redis có thể dùng counter.',
      example: '// Fencing Token flow:\n// 1. Client A acquires lock → token = 33\n// 2. Client A bị GC pause dài (lock expire)\n// 3. Client B acquires lock → token = 34\n// 4. Client A tỉnh dậy, gửi request với token=33\n// 5. Storage server thấy token=33 < current=34\n//    → REJECT Client A\'s write! ✅\n\n// Implementation:\nconst { token } = await acquireLock("resource");\n// Gửi token kèm mỗi request:\nawait storageServer.write(data, { fencingToken: token });\n// Storage check: if (token < lastSeenToken) reject;',
    },
  ],
  demos: [{
    id: 'coming-soon', label: '🚧 Coming Soon',
    language: 'javascript', code: `console.log('Distributed Lock – demos coming soon!');`,
  }],
  interactive: null,
  callouts: [
    { type: 'success', icon: '🔴', title: 'Redis SETNX cho hầu hết cases', body: 'Single Redis SETNX với NX+EX đủ tốt cho hầu hết distributed lock use cases. Đơn giản và hiệu quả.' },
    { type: 'warning', icon: '🔒', title: 'Redlock cho high availability', body: 'Dùng Redlock khi cần HA và không thể chấp nhận lock failure khi một Redis node down.' },
    { type: 'info', icon: '🛡️', title: 'Fencing Token cho correctness', body: 'Với truly critical operations, kết hợp lock với fencing token để đảm bảo correctness kể cả khi clock skew xảy ra.' },
  ],
}
