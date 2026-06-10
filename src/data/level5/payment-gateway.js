export default {
  slug: 'payment-gateway',
  order: 26,
  title: 'Payment Gateway',
  emoji: '💳',
  description: 'Idempotency, Saga, PCI-DSS compliance cho payment processing system.',
  project: 'Payment Gateway.',
  problems: [
    { icon: '💸', title: 'Trừ tiền hai lần (Double Charging)', desc: 'Khi client gặp lỗi kết nối mạng và ấn nút thanh toán lại, hệ thống có nguy cơ trừ tiền của người dùng hai lần nếu không xử lý trùng lặp.' },
    { icon: '📊', title: 'Sai lệch số dư sổ cái (Ledger Discrepancy)', desc: 'Xảy ra khi cổng thanh toán đã trừ tiền thành công nhưng DB của hệ thống lại lưu trạng thái thất bại do crash giữa chừng.' },
    { icon: '📡', title: 'Mất mát Webhook (Webhook Delivery Failure)', desc: 'Cổng thanh toán gọi webhook để báo hoàn tất giao dịch nhưng server của bạn bận hoặc sập, dẫn đến đơn hàng không bao giờ được kích hoạt.' }
  ],
  concepts: [
    {
      name: 'Idempotency',
      icon: '🔁',
      explain: 'Idempotency trong payment là tính chất đảm bảo xử lý payment nhiều lần cho cùng request chỉ charge tiền một lần. Implement bằng Idempotency Key (UUID do client tạo): server lưu key + result, nếu gặp key đã xử lý → trả về cached result. Stripe yêu cầu Idempotency-Key header cho mọi API call.',
      tip: 'Stripe\'s idempotency keys có TTL 24 giờ. Sau đó, cùng key có thể dùng lại cho operation mới. Lưu key trong DB có unique index để prevent race condition.',
      example: '// Payment với Idempotency Key:\nconst idempotencyKey = crypto.randomUUID();\n\n// Lưu vào localStorage để retry:\nlocalStorage.setItem("payment_key", idempotencyKey);\n\ntry {\n  const result = await fetch("/api/payment", {\n    method: "POST",\n    headers: {\n      "Content-Type": "application/json",\n      "Idempotency-Key": idempotencyKey\n    },\n    body: JSON.stringify({ amount: 100000, currency: "VND" })\n  });\n} catch (networkError) {\n  // Retry với CÙNG key - safe!\n  await retryPayment(idempotencyKey);\n}',
    },
    {
      name: 'Saga',
      icon: '📖',
      explain: 'Saga Pattern trong Payment Gateway xử lý distributed transaction: OrderService → PaymentService → InventoryService → NotificationService. Mỗi step có compensating transaction. Nếu Payment fail → Compensate: cancel order. Nếu Inventory fail → Compensate: refund payment, cancel order.',
      tip: 'Orchestration Saga tốt hơn Choreography cho payment flow vì cần central tracking. Dùng Saga Orchestrator để log từng step và trigger compensations khi cần.',
      example: '// Payment Saga:\nclass CheckoutSaga {\n  async execute(order) {\n    const steps = [];\n    try {\n      // Step 1: Create Order\n      const orderId = await orderService.create(order);\n      steps.push({ compensate: () => orderService.cancel(orderId) });\n\n      // Step 2: Process Payment\n      const chargeId = await paymentService.charge(order.total);\n      steps.push({ compensate: () => paymentService.refund(chargeId) });\n\n      // Step 3: Reserve Inventory\n      await inventoryService.reserve(order.items);\n\n      return { success: true, orderId };\n    } catch (error) {\n      // Compensate in reverse order:\n      for (const step of steps.reverse()) {\n        await step.compensate().catch(console.error);\n      }\n      return { success: false, error };\n    }\n  }\n}',
    },
    {
      name: 'PCI-DSS',
      icon: '🔒',
      explain: 'PCI-DSS (Payment Card Industry Data Security Standard) là tiêu chuẩn bảo mật bắt buộc cho mọi hệ thống xử lý thẻ tín dụng. 12 requirements: network security, encryption, access control, monitoring, testing. Level 1 (>6M transactions/year) cần audit hàng năm. Không comply → bị revoke merchant account.',
      tip: 'Cách đơn giản nhất để comply: không bao giờ touch raw card data! Dùng Stripe.js/Braintree.js để tokenize card ở client side → server chỉ nhận token. PCI scope tối thiểu.',
      example: '// PCI-compliant: card data KHÔNG bao giờ đến server của bạn!\n// Client side (Stripe.js):\nconst stripe = Stripe("pk_live_...");\nconst { token } = await stripe.createToken(cardElement);\n// token = "tok_visa" (opaque, không phải card number!)\n\n// Gửi token đến server:\nconst result = await fetch("/api/checkout", {\n  method: "POST",\n  body: JSON.stringify({ token: token.id, amount: 100000 })\n});\n\n// Server: charge bằng token (không cần biết card number):\nawait stripe.charges.create({\n  amount: 100000,\n  currency: "vnd",\n  source: token.id // Stripe handle PCI compliance\n});',
    },
    {
      name: 'Tokenization',
      icon: '🔑',
      explain: 'Tokenization thay thế sensitive card data (PAN - Primary Account Number) bằng non-sensitive token. Token không thể reverse để lấy lại card number (khác encryption). Stripe, Braintree lưu card data trong PCI-compliant vault và trả về token. Merchant chỉ lưu token → minimize PCI scope.',
      tip: 'Vault tokenization: Stripe lưu card, cho bạn token. Network tokenization: Visa/Mastercard cấp token thay thế PAN cho device-based payments (Apple Pay). Tokens có thể be limited by merchant, amount, or device.',
      example: '// Tokenization flow:\n// 1. Customer nhập card 4111-1111-1111-1111\n// 2. Stripe.js encrypt và gửi đến Stripe servers\n// 3. Stripe lưu card trong PCI vault\n// 4. Stripe trả về token: "tok_1234abcd"\n// 5. Merchant server chỉ lưu "tok_1234abcd"\n// 6. Charged bằng token: không cần card number!\n\n// Token re-use:\nconst savedCard = await stripe.paymentMethods.attach(\n  "pm_1234abcd", { customer: "cus_xyz" }\n);\n// Next time, charge without re-entering card:\nawait stripe.paymentIntents.create({\n  amount: 50000,\n  payment_method: "pm_1234abcd",\n  confirm: true\n});',
    },
    {
      name: 'Reconciliation',
      icon: '📊',
      explain: 'Reconciliation là quá trình đối chiếu giữa transactions trong hệ thống của bạn với records từ payment processor (Stripe, bank). Phát hiện discrepancies: charge thành công nhưng không ghi nhận, hoặc ngược lại. Chạy tự động hàng ngày. Critical cho financial integrity.',
      tip: 'Stripe Webhook không đảm bảo delivery 100% → Reconciliation là backup. Luôn implement cả webhook (real-time) + reconciliation (batch, daily). Log mọi payment event với idempotency.',
      example: '// Daily reconciliation job:\nasync function reconcile(date) {\n  // Lấy transactions từ Stripe:\n  const stripeCharges = await stripe.charges.list({\n    created: { gte: startOfDay(date), lt: endOfDay(date) },\n    limit: 100\n  });\n\n  // So sánh với DB của mình:\n  for (const charge of stripeCharges.data) {\n    const localTxn = await db.findByExternalId(charge.id);\n    if (!localTxn) {\n      console.error(`MISSING: ${charge.id} in local DB!`);\n      await alertTeam(charge); // Cần investigate!\n    } else if (localTxn.amount !== charge.amount) {\n      console.error(`AMOUNT MISMATCH: ${charge.id}`);\n    }\n  }\n}',
    },
  ],
  demos: [
    {
      id: 'idempotency-engine',
      label: '🔁 Idempotency Key API Processor',
      language: 'javascript',
      code: `// Giả lập cơ chế lọc trùng lặp yêu cầu thanh toán bằng Idempotency Key
class PaymentProcessor {
  constructor() {
    this.idempotencyStore = new Map(); // key -> cachedResponse
    this.bankLedger = []; // Giao dịch thực tế tại ngân hàng
  }

  async processPayment(idempotencyKey, details) {
    console.log(\`\\n🔌 Nhận request thanh toán với Key: "\${idempotencyKey}"\`);

    // 1. Kiểm tra xem key này đã được xử lý chưa
    if (this.idempotencyStore.has(idempotencyKey)) {
      const cached = this.idempotencyStore.get(idempotencyKey);
      console.log(\`⚡ [Cache Hit] Phát hiện trùng lặp! Trả về kết quả lưu sẵn (Không trừ tiền lần 2):\`);
      return cached;
    }

    // 2. Giả lập trừ tiền ngân hàng
    const transactionId = 'txn_' + Math.random().toString(36).substr(2, 6);
    const success = true; 
    const response = {
      status: 'SUCCESS',
      transactionId,
      amount: details.amount,
      timestamp: Date.now()
    };

    // Lưu vào lịch sử ngân hàng
    this.bankLedger.push({ transactionId, amount: details.amount });
    console.log(\`💰 [Ngân Hàng] Đã trừ thành công \${details.amount} VND\`);

    // 3. Cache kết quả tương ứng với Idempotency Key
    this.idempotencyStore.set(idempotencyKey, response);

    return response;
  }
}

(async () => {
  const processor = new PaymentProcessor();
  const key = 'idem_key_uuid_9999';

  // Yêu cầu thanh toán lần 1
  const res1 = await processor.processPayment(key, { amount: 150000 });
  console.log('Kết quả 1:', res1);

  // Giả lập client bị lag mạng, gửi lại y hệt request trên
  const res2 = await processor.processPayment(key, { amount: 150000 });
  console.log('Kết quả 2:', res2);

  console.log('\\n📊 Lịch sử ngân hàng:', processor.bankLedger);
  // Chỉ có 1 giao dịch thực tế được thực hiện! ✅
})();`
    },
    {
      id: 'reconciliation-auditor',
      label: '📊 Payment Reconciliation Auditor',
      language: 'javascript',
      code: `// Giả lập cơ chế Đối Soát Tài Chính (Reconciliation) hàng ngày để phát hiện chênh lệch
class ReconciliationSystem {
  constructor() {
    // Sổ cái hệ thống nội bộ
    this.localLedger = [
      { orderId: 'ord:1', extTxnId: 'txn_aaa', amount: 50000, status: 'COMPLETED' },
      { orderId: 'ord:2', extTxnId: 'txn_bbb', amount: 120000, status: 'COMPLETED' },
      { orderId: 'ord:3', extTxnId: 'txn_ccc', amount: 80000, status: 'PENDING' } // Local lưu Pending
    ];

    // Báo cáo đối soát từ đối tác cổng thanh toán (Stripe/Paypal)
    this.gatewayLedger = [
      { extTxnId: 'txn_aaa', amount: 50000 },
      { extTxnId: 'txn_bbb', amount: 100000 }, // Lệch số tiền (DB: 120K vs Cổng: 100K)
      { extTxnId: 'txn_ccc', amount: 80000 },  // Cổng đã báo thu được tiền
      { extTxnId: 'txn_ddd', amount: 45000 }   // Giao dịch mồ côi (chỉ có trên cổng)
    ];
  }

  audit() {
    console.log('=== Bắt đầu tiến hành đối soát (Audit) ===');
    const localMap = new Map(this.localLedger.map(l => [l.extTxnId, l]));
    const gatewayMap = new Map(this.gatewayLedger.map(g => [g.extTxnId, g]));

    // 1. So khớp từ Sổ cái nội bộ sang Cổng thanh toán
    this.localLedger.forEach(local => {
      const gateway = gatewayMap.get(local.extTxnId);
      
      if (!gateway) {
        if (local.status === 'COMPLETED') {
          console.log(\`🚨 [Cảnh Báo] Giao dịch nội bộ \${local.orderId} báo thành công nhưng Cổng thanh toán KHÔNG có record nào!\`);
        }
      } else {
        if (local.amount !== gateway.amount) {
          console.log(\`💸 [Lệch Tiền] Giao dịch \${local.orderId} lệch giá trị! Nội bộ: \${local.amount} | Cổng thanh toán: \${gateway.amount}\`);
        }
        if (local.status === 'PENDING') {
          console.log(\`🔧 [Cần Cập Nhật] Giao dịch \${local.orderId} đang ở trạng thái Pending nhưng Cổng đã thu được tiền. Cần update đơn hàng này!\`);
        }
      }
    });

    // 2. So khớp ngược lại để tìm giao dịch mồ côi (Ghost transactions)
    this.gatewayLedger.forEach(gateway => {
      if (!localMap.has(gateway.extTxnId)) {
        console.log(\`👻 [Giao dịch mồ côi] Cổng thanh toán báo giao dịch \${gateway.extTxnId} (\${gateway.amount} VND) thành công nhưng local DB không có thông tin.\`);
      }
    });
  }
}

const auditSystem = new ReconciliationSystem();
auditSystem.audit();`
    }
  ],
  interactive: null,
  callouts: [
    { type: 'warning', icon: '⚠️', title: 'Không bao giờ cộng trừ balance bằng SQL thô', body: 'Tuyệt đối không dùng query kiểu "UPDATE accounts SET balance = balance + 10" mà không có khóa lạc quan (Optimistic Locking) hoặc SELECT FOR UPDATE. Điều này sẽ gây lỗi Race Condition mất mát số dư tài khoản.' },
    { type: 'success', icon: '🔒', title: 'Tokenization giảm thiểu phạm vi audit PCI-DSS', body: 'Hãy luôn sử dụng các giải pháp Tokenize thẻ ngay từ phía Frontend (như Stripe.js). Bằng cách này, thông tin thẻ không bao giờ đi qua máy chủ của bạn, giúp bạn đạt chuẩn bảo mật PCI-DSS cực kỳ dễ dàng.' },
    { type: 'info', icon: '📊', title: 'Nguyên lý Sổ Cái Kép (Double-Entry Bookkeeping)', body: 'Trong các hệ thống tài chính, dữ liệu không được xóa hoặc cập nhật đè. Mọi thay đổi số dư phải được ghi nhận dưới dạng hai bút toán đối ứng: Có (Credit) và Nợ (Debit). Điều này đảm bảo tính minh bạch và khả năng kiểm toán.' },
    { type: 'tip', icon: '📡', title: 'Thiết kế Webhook kiên cường', body: 'Webhook có thể bị gửi trễ hoặc gửi lặp lại. Hãy thiết kế webhook endpoint có tính idempotent, kiểm tra chữ ký số (Signature Verification) để tránh giả mạo và phản hồi HTTP 200 ngay trước khi xử lý logic nặng bất đồng bộ.' }
  ]
}
