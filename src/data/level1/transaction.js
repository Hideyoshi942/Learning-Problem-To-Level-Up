export default {
  slug: 'transaction',
  order: 4,
  title: 'Transaction & Isolation',
  emoji: '🔒',
  description: 'Transaction đảm bảo tính toàn vẹn dữ liệu. Hiểu ACID, Isolation Levels và MVCC là bắt buộc để build hệ thống banking, payment, inventory đáng tin cậy.',
  project: 'Internet Banking.',
  problems: [
    { icon: '👀', title: 'Dirty Read', desc: 'Transaction A đọc data mà Transaction B chưa commit (có thể sẽ bị rollback).' },
    { icon: '🔄', title: 'Non-repeatable Read', desc: 'Transaction A đọc cùng row 2 lần nhưng nhận giá trị khác nhau do B đã commit giữa 2 lần đọc.' },
    { icon: '👻', title: 'Phantom Read', desc: 'Transaction A query range nhưng lần 2 thấy thêm rows mới do B đã insert và commit.' },
  ],
  concepts: [
    {
      name: 'ACID',
      icon: '⚛️',
      explain: 'ACID là 4 tính chất đảm bảo transaction đáng tin cậy: Atomicity (all-or-nothing), Consistency (rules không bị vi phạm), Isolation (transactions không thấy nhau trong khi chạy), Durability (committed data tồn tại mãi kể cả crash).',
      tip: 'Không phải mọi DB đều đảm bảo đầy đủ ACID. MongoDB trước v4 không có multi-document transaction. Hiểu rõ guarantee của DB bạn đang dùng.',
      example: '-- Atomicity: chuyển tiền\nBEGIN;\n  UPDATE accounts SET balance = balance - 1000 WHERE id = 1; -- Alice\n  UPDATE accounts SET balance = balance + 1000 WHERE id = 2; -- Bob\nCOMMIT; -- Cả 2 thành công hoặc cả 2 rollback\n\n-- Durability: sau COMMIT, data tồn tại kể cả server crash\n-- (vì đã được ghi vào WAL - Write Ahead Log)',
    },
    {
      name: 'Isolation Level',
      icon: '🔒',
      explain: 'Isolation Level kiểm soát mức độ các transaction nhìn thấy nhau. 4 mức: READ UNCOMMITTED (thấy data chưa commit) → READ COMMITTED (chỉ thấy committed) → REPEATABLE READ (lần đọc 2 giống lần đọc 1) → SERIALIZABLE (hoàn toàn tuần tự).',
      tip: 'Isolation level cao hơn = an toàn hơn nhưng chậm hơn (nhiều lock hơn). PostgreSQL default: READ COMMITTED. MySQL InnoDB: REPEATABLE READ.',
      example: '-- Xem isolation level hiện tại:\nSHOW TRANSACTION ISOLATION LEVEL;\n\n-- Set cho session:\nSET TRANSACTION ISOLATION LEVEL SERIALIZABLE;\n\n-- | Level            | Dirty | Non-rep | Phantom |\n-- | READ UNCOMMITTED |  ✅   |   ✅   |   ✅   |\n-- | READ COMMITTED   |  ❌   |   ✅   |   ✅   |\n-- | REPEATABLE READ  |  ❌   |   ❌   |   ✅   |\n-- | SERIALIZABLE     |  ❌   |   ❌   |   ❌   |',
    },
    {
      name: 'MVCC',
      icon: '📸',
      explain: 'MVCC (Multi-Version Concurrency Control) cho phép read và write chạy song song mà không block nhau. Mỗi transaction thấy một snapshot của database tại thời điểm bắt đầu. PostgreSQL, MySQL InnoDB, Oracle đều dùng MVCC.',
      tip: 'MVCC sinh ra "dead tuples" (phiên bản cũ) cần được dọn dẹp bởi VACUUM (PostgreSQL) hoặc Purge thread (MySQL). Cấu hình AUTOVACUUM đúng rất quan trọng.',
      example: '-- MVCC: T1 và T2 cùng lúc, không block nhau\n-- T1: BEGIN\n--   T1 sees: balance = 1000 (snapshot)\n-- T2: UPDATE balance = 2000; COMMIT\n-- T1: SELECT balance → vẫn thấy 1000! (snapshot isolation)\n-- T1: COMMIT\n\n-- PostgreSQL: mỗi row có xmin, xmax\n-- xmin = txnId tạo row, xmax = txnId delete row',
    },
    {
      name: 'Serializable',
      icon: '🚦',
      explain: 'SERIALIZABLE là isolation level cao nhất – các transaction chạy như thể tuần tự (dù thực tế có thể song song). Ngăn mọi anomaly: dirty read, non-repeatable read, và phantom read. PostgreSQL dùng SSI (Serializable Snapshot Isolation) rất hiệu quả.',
      tip: 'SERIALIZABLE trong PostgreSQL (SSI) thường chỉ chậm hơn REPEATABLE READ 1-2%. MySQL SERIALIZABLE dùng lock nhiều hơn → chậm hơn đáng kể.',
      example: '-- Khi nào cần SERIALIZABLE?\n-- Booking: kiểm tra seat_available rồi insert reservation\n-- Transfer: kiểm tra balance rồi debit/credit\n-- Inventory: kiểm tra stock rồi deduct\n\nBEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;\n  SELECT count(*) FROM reservations WHERE seat_id = 42;\n  -- If 0: insert new reservation\nCOMMIT;\n-- PostgreSQL sẽ phát hiện conflict và abort một txn',
    },
    {
      name: 'Read Committed',
      icon: '✅',
      explain: 'READ COMMITTED: transaction chỉ thấy data đã được commit bởi các transaction khác. Tránh Dirty Read nhưng vẫn có Non-repeatable Read (đọc cùng row 2 lần có thể thấy khác nhau). Là default của PostgreSQL.',
      tip: 'Phù hợp cho hầu hết OLTP workloads. Nếu cần consistency cao hơn trong một transaction (ví dụ: check rồi update), dùng SELECT FOR UPDATE hoặc nâng lên REPEATABLE READ.',
      example: '-- Non-repeatable Read với READ COMMITTED:\n-- T1: BEGIN;\n--   T1: SELECT balance → 1000\n-- T2: UPDATE balance = 2000; COMMIT;\n--   T1: SELECT balance → 2000 (khác lần đọc đầu!)\n-- T1: COMMIT;\n\n-- Fix: dùng SELECT FOR UPDATE\nSELECT balance FROM accounts WHERE id=1 FOR UPDATE;',
    },
    {
      name: 'Repeatable Read',
      icon: '🔄',
      explain: 'REPEATABLE READ: đọc cùng row nhiều lần trong cùng transaction luôn cho cùng kết quả. Tránh Dirty Read và Non-repeatable Read. Vẫn có Phantom Read (query range có thể thấy rows mới). Default của MySQL InnoDB.',
      tip: 'MySQL InnoDB dùng gap lock để ngăn Phantom Read ngay cả ở REPEATABLE READ. PostgreSQL REPEATABLE READ dùng snapshot → không có gap lock.',
      example: '-- Với REPEATABLE READ:\nBEGIN;\n  SELECT balance FROM accounts WHERE id=1;\n  -- → 1000\n  -- (dù T2 commit UPDATE thành 2000 ở giữa)\n  SELECT balance FROM accounts WHERE id=1;\n  -- → 1000 (consistent, repeatable!) ✅\nCOMMIT;',
    },
    {
      name: 'Deadlock',
      icon: '💀',
      explain: 'Deadlock xảy ra khi 2 (hay nhiều) transactions cùng lúc giữ lock của nhau và đợi nhau release: T1 lock A đợi B, T2 lock B đợi A → circular wait, không ai tiến được. Database phát hiện và kill victim transaction.',
      tip: 'Prevention: luôn acquire locks theo cùng thứ tự (e.g., luôn lock account với id nhỏ hơn trước). Giảm scope và duration của transactions.',
      example: '-- Deadlock kinh điển – Bank Transfer:\n-- T1: lock Account A → lock Account B\n-- T2: lock Account B → lock Account A\n-- → DEADLOCK!\n\n-- Fix: luôn lock theo order (by id)\nBEGIN;\n  SELECT * FROM accounts WHERE id IN (1,2)\n    ORDER BY id FOR UPDATE; -- lock id=1 trước, id=2 sau\n  -- → T1 và T2 cùng order → không deadlock',
    },
    {
      name: 'Optimistic Locking',
      icon: '🤞',
      explain: 'Optimistic Locking không dùng lock thật – thay vào đó, check version/timestamp khi UPDATE. Nếu version đã thay đổi (ai đó đã update trước), throw conflict error và retry. Phù hợp cho read-heavy workloads với ít conflict.',
      tip: 'Dùng cột version (số nguyên tăng dần) hoặc updated_at. ORM như JPA, Hibernate, ActiveRecord có built-in support với @Version annotation.',
      example: '-- Schema:\nCREATE TABLE products (\n  id INT, stock INT, version INT DEFAULT 0\n);\n\n-- Optimistic update:\nUPDATE products\nSET stock = stock - 1, version = version + 1\nWHERE id = 42\n  AND version = :expected_version; -- kiểm tra version\n\n-- Nếu 0 rows affected → conflict → retry!',
    },
  ],
  demos: [
    {
      id: 'acid',
      label: '⚛️ ACID Properties',
      language: 'javascript',
      code: `// ACID – 4 tính chất cốt lõi của Transaction
// A – Atomicity: tất cả hoặc không có gì
// C – Consistency: rules không bị vi phạm
// I – Isolation: transactions không thấy nhau
// D – Durability: committed = permanent

class BankDB {
  constructor() {
    this.accounts = [
      { id: 1, name: 'Alice', balance: 5_000_000 },
      { id: 2, name: 'Bob',   balance: 2_000_000 },
    ];
    this._snapshot = null;
  }

  begin() {
    this._snapshot = JSON.parse(JSON.stringify(this.accounts));
    console.log('BEGIN TRANSACTION');
    return this;
  }

  transfer(fromId, toId, amount) {
    const from = this.accounts.find(a => a.id === fromId);
    const to   = this.accounts.find(a => a.id === toId);
    if (!from || !to) throw new Error('Account not found');
    if (from.balance < amount)
      throw new Error(\`Insufficient: \${from.balance.toLocaleString()} < \${amount.toLocaleString()}\`);
    from.balance -= amount;
    to.balance   += amount;
    console.log(\`  \${from.name}: -\${amount.toLocaleString()} → \${from.balance.toLocaleString()}\`);
    console.log(\`  \${to.name}:   +\${amount.toLocaleString()} → \${to.balance.toLocaleString()}\`);
    return this;
  }

  commit()   { this._snapshot = null; console.log('COMMIT ✅'); }
  rollback() {
    this.accounts = JSON.parse(JSON.stringify(this._snapshot));
    console.log('ROLLBACK ❌ – state restored');
  }
  show() {
    this.accounts.forEach(a =>
      console.log(\`  \${a.name}: \${a.balance.toLocaleString()} VND\`));
  }
}

const db = new BankDB();
console.log('=== ACID Demo: Internet Banking ===\\n');
console.log('Initial state:'); db.show();

// TXN 1: success
console.log('\\n--- Txn 1: Alice → Bob 1,000,000 ---');
try {
  db.begin().transfer(1, 2, 1_000_000).commit();
} catch(e) { console.log('ERROR: ' + e.message); db.rollback(); }
db.show();

// TXN 2: fail (insufficient)
console.log('\\n--- Txn 2: Bob → Alice 10,000,000 (insufficient!) ---');
try {
  db.begin().transfer(2, 1, 10_000_000).commit();
} catch(e) { console.log('  ERROR: ' + e.message); db.rollback(); }
console.log('After rollback:'); db.show();`,
    },
    {
      id: 'isolation',
      label: '🔒 Isolation Levels',
      language: 'javascript',
      code: `// 4 Isolation Levels (thấp → cao):
// 1. READ UNCOMMITTED  – Dirty Read xảy ra ✗
// 2. READ COMMITTED    – No dirty, có non-repeatable ✓/✗
// 3. REPEATABLE READ   – No dirty/non-repeatable, có phantom ✓/✓/✗
// 4. SERIALIZABLE      – Hoàn toàn cô lập ✓/✓/✓

class MVCCSimulator {
  constructor() {
    this.committed = { balance: 1000 };
    this.pending = null;
    this.snapshots = new Map();
    this.txnId = 0;
  }

  begin(level) {
    const id = ++this.txnId;
    const snapshot = ['REPEATABLE_READ','SERIALIZABLE'].includes(level)
      ? { ...this.committed } : null; // snapshot tại thời điểm begin
    this.snapshots.set(id, { level, snapshot });
    return id;
  }

  read(txnId) {
    const { level, snapshot } = this.snapshots.get(txnId);
    switch (level) {
      case 'READ_UNCOMMITTED': return this.pending ?? this.committed;
      case 'READ_COMMITTED':   return this.committed;
      case 'REPEATABLE_READ':
      case 'SERIALIZABLE':     return snapshot;
    }
  }

  writeUncommitted(val) {
    this.pending = { balance: val };
    console.log(\`  Txn B writes \${val} (uncommitted)\`);
  }
  rollbackB() { this.pending = null; console.log('  Txn B ROLLBACK'); }
}

const sim = new MVCCSimulator();
const levels = ['READ_UNCOMMITTED','READ_COMMITTED','REPEATABLE_READ'];
console.log('=== Dirty Read Demo ===\\n');

for (const level of levels) {
  console.log(\`--- \${level} ---\`);
  const txnA = sim.begin(level);
  sim.writeUncommitted(9999); // B writes but not commits
  const read1 = sim.read(txnA);
  sim.rollbackB();            // B rollbacks – 9999 never existed!
  const read2 = sim.read(txnA);
  console.log(\`  A read1=\${read1.balance} | A read2=\${read2.balance}\`);
  console.log(\`  Dirty Read: \${read1.balance === 9999 ? '❌ YES (read phantom data!)' : '✅ NO'}\\n\`);
}

console.log('💡 PostgreSQL default: READ COMMITTED');
console.log('💡 MySQL InnoDB default: REPEATABLE READ');`,
    },
    {
      id: 'deadlock',
      label: '💀 Deadlock',
      language: 'javascript',
      code: `// DEADLOCK – T1 lock A đợi B, T2 lock B đợi A
// → Circular wait → cả hai block mãi mãi!

class LockManager {
  constructor() {
    this.locks   = new Map(); // resource → txnId
    this.waiting = new Map(); // txnId → resource
  }

  acquire(txnId, resource) {
    if (this.locks.has(resource)) {
      const holder = this.locks.get(resource);
      if (holder === txnId) return true;
      console.log(\`  \${txnId} WAITING for "\${resource}" held by \${holder}\`);
      this.waiting.set(txnId, resource);
      return false;
    }
    this.locks.set(resource, txnId);
    console.log(\`  \${txnId} ACQUIRED "\${resource}" ✅\`);
    return true;
  }

  detectDeadlock() {
    for (const [txn] of this.waiting) {
      const visited = new Set();
      let cur = txn;
      while (cur) {
        if (visited.has(cur)) return cur;
        visited.add(cur);
        const res = this.waiting.get(cur);
        cur = res ? this.locks.get(res) : undefined;
      }
    }
    return null;
  }

  killVictim(txnId) {
    this.waiting.delete(txnId);
    for (const [res, owner] of this.locks)
      if (owner === txnId) this.locks.delete(res);
    console.log(\`  ⚰️  \${txnId} KILLED as victim → ROLLBACK\`);
  }
}

const lm = new LockManager();
console.log('=== Deadlock Demo ===');
console.log('T1: transfer A→B (lock A then B)');
console.log('T2: transfer B→A (lock B then A)\\n');

lm.acquire('T1', 'Account_A');
lm.acquire('T2', 'Account_B');
lm.acquire('T1', 'Account_B'); // blocked by T2
lm.acquire('T2', 'Account_A'); // blocked by T1 → DEADLOCK

const victim = lm.detectDeadlock();
if (victim) {
  console.log(\`\\n💀 DEADLOCK! Killing victim: \${victim}\`);
  lm.killVictim(victim);
  console.log('✅ T1 can now proceed');
}

console.log('\\n💡 Prevention: always acquire locks in same order!');`,
    },
  ],
  interactive: {
    title: '🏦 Simulate Bank Transfer Transaction',
    inputLabel: 'Số tiền chuyển (VND)',
    inputPlaceholder: '500000',
    inputType: 'number',
    run(value) {
      const amount = parseInt(value) || 0
      const balance = 5_000_000
      if (amount <= 0) return '⚠️  Số tiền phải > 0'
      if (amount > balance) {
        return [
          `🏦 Alice: ${balance.toLocaleString()} VND`,
          `💸 Chuyển: ${amount.toLocaleString()} VND → Bob`,
          ``,
          `BEGIN TRANSACTION`,
          `  Check balance: ${balance.toLocaleString()} < ${amount.toLocaleString()}`,
          `  ❌ INSUFFICIENT BALANCE`,
          `ROLLBACK`,
          ``,
          `✅ Atomicity: không có tiền nào bị mất`,
          `   Alice vẫn còn: ${balance.toLocaleString()} VND`,
        ].join('\n')
      }
      return [
        `🏦 Alice: ${balance.toLocaleString()} VND`,
        `💸 Chuyển: ${amount.toLocaleString()} VND → Bob`,
        ``,
        `BEGIN TRANSACTION (REPEATABLE READ)`,
        `  Lock Account Alice, Bob`,
        `  Alice: ${balance.toLocaleString()} → ${(balance - amount).toLocaleString()} VND`,
        `  Bob:   1,000,000 → ${(1_000_000 + amount).toLocaleString()} VND`,
        `  Write to WAL log (Durability)`,
        `COMMIT ✅`,
        ``,
        `✅ Consistency check: ${(balance + 1_000_000).toLocaleString()} = ${(balance - amount + 1_000_000 + amount).toLocaleString()} VND`,
      ].join('\n')
    },
  },
  callouts: [
    { type: 'info', icon: '⚛️', title: 'ACID là gì?', body: 'Atomicity (all-or-nothing), Consistency (rules preserved), Isolation (txns độc lập), Durability (committed = permanent on disk).' },
    { type: 'warning', icon: '⚖️', title: 'Isolation vs Performance', body: 'Isolation cao hơn = an toàn hơn nhưng chậm hơn. READ COMMITTED là điểm cân bằng phổ biến nhất.' },
    { type: 'danger', icon: '💀', title: 'Tránh Deadlock', body: 'Luôn acquire locks theo cùng thứ tự. Dùng lock timeout. Consider optimistic locking cho read-heavy workloads.' },
  ],
}
