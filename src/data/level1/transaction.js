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
  concepts: ['ACID', 'Isolation Level', 'MVCC', 'Serializable', 'Read Committed', 'Repeatable Read', 'Deadlock', 'Optimistic Locking'],
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
