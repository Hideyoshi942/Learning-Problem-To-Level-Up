export default {
  slug: 'resilience',
  order: 36,
  title: 'Resilience Patterns',
  emoji: '🛡️',
  description: 'Resilience Patterns giúp hệ thống chịu lỗi (fault tolerance): Timeout, Retry với exponential backoff + jitter, Circuit Breaker, Bulkhead, Fallback và Load Shedding. Mục tiêu: một service lỗi không kéo sập cả hệ thống.',
  project: 'Một API Gateway gọi nhiều downstream service (payment, inventory, recommendation).',
  problems: [
    { icon: '🌊', title: 'Cascading failure', desc: 'Một downstream chậm khiến thread/connection pool cạn kiệt, kéo sập luôn service gọi nó.' },
    { icon: '🌩️', title: 'Retry storm', desc: 'Khi service lỗi, client đồng loạt retry ngay lập tức làm nó càng quá tải, không kịp hồi phục.' },
    { icon: '⏳', title: 'Request treo', desc: 'Thiếu timeout: request chờ vô hạn, giữ tài nguyên, người dùng thấy ứng dụng bị đơ.' },
  ],
  concepts: [
    {
      name: 'Timeout',
      icon: '⏱️',
      explain: 'Timeout là thời gian tối đa chờ một operation (network call, DB query) trước khi bỏ cuộc và trả lỗi. Không có timeout, một downstream chậm sẽ giữ thread/connection vô hạn, làm pool cạn kiệt và gây cascading failure. Cần cả connection timeout lẫn read/request timeout.',
      tip: 'Đặt timeout theo p99 latency của downstream, đừng để mặc định (thường là vô hạn hoặc quá dài). Timeout của caller phải lớn hơn tổng timeout các downstream mà nó gọi, nếu không caller bỏ cuộc trong khi downstream vẫn đang chạy.',
      example: '// Luôn đặt timeout cho mọi network call\n// axios (client):\nconst res = await axios.get(url, { timeout: 2000 }); // 2s\n\n// fetch + AbortController:\nconst c = new AbortController();\nconst t = setTimeout(() => c.abort(), 2000);\nawait fetch(url, { signal: c.signal });\n\n// Quy tac: timeout(caller) > tong timeout(downstream)',
    },
    {
      name: 'Retry + Backoff + Jitter',
      icon: '🔁',
      explain: 'Retry giúp vượt qua lỗi tạm thời (transient: timeout, 503, mất gói mạng). Nhưng retry ngay và đồng loạt gây retry storm. Exponential backoff tăng gấp đôi thời gian chờ mỗi lần (100, 200, 400ms...). Jitter thêm phần ngẫu nhiên để tránh nhiều client đồng bộ hóa và cùng ập vào server (thundering herd).',
      tip: 'Chỉ retry lỗi tạm thời và với operation Idempotent. Retry một POST tạo đơn hàng có thể tạo trùng nếu không có Idempotency key. Giới hạn số lần retry (3-5) và đặt trần (cap) cho delay để tổng thời gian chờ không phình to.',
      example: '// Retry chi cho loi tam thoi + operation idempotent\nasync function retry(fn, max = 3) {\n  for (let i = 0; i < max; i++) {\n    try { return await fn(); }\n    catch (e) {\n      if (i === max - 1) throw e;\n      const base = 100 * Math.pow(2, i);   // 100, 200, 400\n      const jitter = Math.random() * base; // rai deu cac lan\n      await sleep(base + jitter);\n    }\n  }\n}',
    },
    {
      name: 'Circuit Breaker',
      icon: '🔌',
      explain: 'Circuit Breaker giám sát tỉ lệ lỗi tới một downstream với 3 trạng thái. CLOSED: bình thường, cho request đi qua và đếm lỗi. OPEN: khi lỗi vượt ngưỡng, chặn ngay lập tức (fast fail), không gọi downstream để nó có thời gian hồi phục. HALF-OPEN: sau cooldown, cho vài request thử; thành công thì về CLOSED, thất bại thì OPEN lại.',
      tip: 'Circuit breaker ngăn cascading failure và cho downstream thời gian thở. Kết hợp với Fallback: khi OPEN thì trả giá trị dự phòng thay vì lỗi. Thư viện: resilience4j (Java), Polly (.NET), opossum (Node).',
      example: '// Circuit Breaker bao ve downstream dang gap su co\n// CLOSED    -> cho request qua, dem loi\n// OPEN      -> chan ngay (fast fail), khong goi downstream\n// HALF_OPEN -> sau cooldown, thu 1 request de kiem tra\n\n// Vi du voi opossum (Node):\nconst breaker = new CircuitBreaker(callDownstream, {\n  timeout: 2000,\n  errorThresholdPercentage: 50, // 50% loi -> OPEN\n  resetTimeout: 10000,          // 10s sau -> HALF_OPEN\n});\nbreaker.fallback(() => cachedValue); // graceful degradation',
    },
    {
      name: 'Bulkhead',
      icon: '🚧',
      explain: 'Bulkhead (vách ngăn tàu thủy) cô lập tài nguyên theo từng nhóm để một phần lỗi không kéo sập toàn bộ. Ví dụ: cấp thread pool / connection pool riêng cho từng downstream. Nếu service A chậm và ăn hết pool của nó, service B vẫn còn pool riêng để hoạt động. Giới hạn số request đồng thời (concurrency limit) cũng là một dạng bulkhead.',
      tip: 'Đừng dùng chung một thread pool khổng lồ cho mọi downstream. Chia pool riêng (hoặc semaphore giới hạn concurrency) cho từng dependency quan trọng, rồi kết hợp với timeout và circuit breaker.',
      example: '// Bulkhead: pool rieng cho tung downstream -> co lap loi\n// Semaphore gioi han so request dong thoi:\nconst poolA = pLimit(10); // toi da 10 concurrent cho A\nconst poolB = pLimit(10); // pool RIENG cho B\n\n// A cham -> chi poolA can, B van chay binh thuong\nawait poolA(() => callServiceA());\nawait poolB(() => callServiceB());',
    },
    {
      name: 'Fallback / Graceful Degradation',
      icon: '🪂',
      explain: 'Fallback là phương án dự phòng khi operation chính thất bại: trả cached data, giá trị mặc định, hoặc phiên bản rút gọn của tính năng. Graceful degradation nghĩa là hệ thống suy giảm từ từ (mất bớt tính năng) thay vì sập hoàn toàn. Ví dụ: trang thương mại điện tử mất service gợi ý thì vẫn hiển thị sản phẩm, chỉ ẩn phần gợi ý.',
      tip: 'Fallback nên trả về thứ hữu ích (stale cache, danh sách rỗng, giá trị mặc định) chứ không phải lỗi 500. Luôn tự hỏi: nếu downstream này chết thì tính năng nào phải sống, tính năng nào có thể tắt.',
      example: '// Fallback: service chinh loi -> tra phuong an du phong\nasync function getRecommendations(userId) {\n  try {\n    return await recoService.get(userId);  // service chinh\n  } catch (e) {\n    // Graceful degradation: khong sap, chi bot tinh nang\n    return getPopularProducts();           // fallback\n    // hoac: return cache.get(userId) || [];\n  }\n}',
    },
    {
      name: 'Load Shedding',
      icon: '🚦',
      explain: 'Load shedding là chủ động từ chối bớt request khi hệ thống quá tải, để phần còn lại được phục vụ đúng chất lượng. Thay vì nhận hết rồi chậm/sập tất cả, server trả 503 (hoặc 429) cho request vượt ngưỡng. Thường dựa trên queue length, CPU, hoặc concurrency hiện tại; nên ưu tiên request quan trọng hơn.',
      tip: 'Load shedding khác rate limiting: rate limiting giới hạn theo client (công bằng), còn load shedding bảo vệ server khỏi sụp khi tổng tải vượt sức chứa. Nên shed sớm và rẻ (reject ngay ở tầng đầu), tránh làm việc dở dang rồi mới bỏ.',
      example: '// Load shedding: qua tai -> tu choi bot de cuu phan con lai\nlet inFlight = 0;\nconst MAX = 100;                 // suc chua toi da\nfunction handle(req) {\n  if (inFlight >= MAX) {\n    return respond(503, "Server ban, thu lai sau"); // shed\n  }\n  inFlight++;\n  try { return process(req); }\n  finally { inFlight--; }\n}',
    },
  ],
  demos: [
    {
      id: 'backoff-jitter',
      label: '🔁 Exponential Backoff + Jitter',
      language: 'javascript',
      code: `// Exponential Backoff + Jitter
// delay = base * 2^(attempt-1), roi cong them jitter ngau nhien
// Muc dich: khong de tat ca client retry cung mot thoi diem (thundering herd)

var base = 100; // ms

console.log('attempt | base delay | + jitter | tong cho');
console.log('------------------------------------------');

var tongBase = 0;
for (var n = 1; n <= 6; n++) {
  var baseDelay = base * Math.pow(2, n - 1);                 // 100,200,400,800,1600,3200
  var jitter = Math.floor(Math.random() * baseDelay * 0.5); // toi da 50%
  var tong = baseDelay + jitter;
  tongBase += baseDelay;
  console.log('   ' + n + '    |  ' + baseDelay + ' ms  |  ' + jitter + ' ms | ' + tong + ' ms');
}

console.log('');
console.log('Tong delay neu KHONG jitter: ' + tongBase + ' ms');
console.log('Jitter rai deu cac lan retry -> tranh dong bo, giam tai dot bien cho server');`,
    },
    {
      id: 'circuit-breaker',
      label: '🔌 Circuit Breaker (3 trạng thái)',
      language: 'javascript',
      code: `// Circuit Breaker: 3 trang thai CLOSED -> OPEN -> HALF_OPEN
// CLOSED   : cho request di qua, dem so loi lien tiep
// OPEN     : chan NGAY (fast fail), khong goi downstream nua
// HALF_OPEN: sau cooldown, thu dung 1 request de do

var FAIL_THRESHOLD = 3;   // du 3 loi lien tiep -> mo mach
var COOLDOWN = 2;         // cho 2 buoc roi moi thu lai

var state = 'CLOSED';
var failCount = 0;
var cooldownLeft = 0;

// chuoi ket qua tu downstream: true = ok, false = loi
var results = [true, false, false, false, true, true, false, true, true, true];

for (var i = 0; i < results.length; i++) {
  var step = i + 1;
  var ok = results[i];

  if (state === 'OPEN') {
    cooldownLeft--;                    // mo phong thoi gian troi qua
    console.log('Buoc ' + step + ' | OPEN      | chan ngay (fast fail), cooldown con ' + cooldownLeft);
    if (cooldownLeft <= 0) {
      state = 'HALF_OPEN';
      console.log('         -> het cooldown, chuyen sang HALF_OPEN');
    }
    continue;
  }

  if (state === 'HALF_OPEN') {
    if (ok) {
      state = 'CLOSED';
      failCount = 0;
      console.log('Buoc ' + step + ' | HALF_OPEN | request thu OK -> CLOSED (phuc hoi)');
    } else {
      state = 'OPEN';
      cooldownLeft = COOLDOWN;
      console.log('Buoc ' + step + ' | HALF_OPEN | request thu LOI -> OPEN lai');
    }
    continue;
  }

  // state === CLOSED
  if (ok) {
    failCount = 0;
    console.log('Buoc ' + step + ' | CLOSED    | OK (reset dem loi)');
  } else {
    failCount++;
    console.log('Buoc ' + step + ' | CLOSED    | LOI (' + failCount + '/' + FAIL_THRESHOLD + ')');
    if (failCount >= FAIL_THRESHOLD) {
      state = 'OPEN';
      cooldownLeft = COOLDOWN;
      console.log('         -> du nguong loi, MO circuit (OPEN)');
    }
  }
}

console.log('');
console.log('Trang thai cuoi cung: ' + state);`,
    },
    {
      id: 'bulkhead',
      label: '🚧 Bulkhead (cô lập tài nguyên)',
      language: 'javascript',
      code: `// Bulkhead: co lap tai nguyen bang cach gioi han so request dong thoi
// Pool day -> tu choi request moi NGAY (fail fast)
// -> loi bi nhot trong 1 ngan, khong tran sang service khac

var POOL = 3;             // toi da 3 request dong thoi cho service nay
var inUse = 0;
var accepted = 0, rejected = 0;

// timeline: in = request toi, out = 1 request xong (tra slot)
var events = ['in','in','in','in','in','out','in','out','out','in','in'];

for (var i = 0; i < events.length; i++) {
  if (events[i] === 'out') {
    if (inUse > 0) inUse--;
    console.log('release -> dang dung ' + inUse + '/' + POOL);
    continue;
  }
  // request toi
  if (inUse < POOL) {
    inUse++; accepted++;
    console.log('accept  -> dang dung ' + inUse + '/' + POOL);
  } else {
    rejected++;
    console.log('REJECT  -> pool DAY (' + inUse + '/' + POOL + '), fail fast');
  }
}

console.log('');
console.log('Chap nhan: ' + accepted + ' | Tu choi: ' + rejected);
console.log('Nho bulkhead, service qua tai khong keo sap ca he thong');`,
    },
  ],
  interactive: {
    title: '🔁 Retry Backoff → tổng thời gian chờ tối đa',
    inputLabel: 'Số lần retry (base 100ms, gấp đôi mỗi lần)',
    inputPlaceholder: '5',
    inputType: 'number',
    run(value) {
      const n = Math.min(Math.max(parseInt(value, 10) || 0, 0), 15)
      const base = 100
      let total = 0
      const rows = []
      for (let i = 1; i <= n; i++) {
        const d = base * Math.pow(2, i - 1)
        total += d
        rows.push(`  lần ${i}: chờ ${d.toLocaleString()} ms`)
      }
      const sec = total / 1000
      return [
        `Exponential backoff, base = ${base}ms, số lần retry = ${n}`,
        ``,
        ...(n === 0 ? ['  (không retry lần nào)'] : rows),
        ``,
        `⏳ Tổng thời gian chờ tối đa: ${total.toLocaleString()} ms (~${sec.toFixed(1)}s)`,
        ``,
        n === 0
          ? 'ℹ️ Không retry: lỗi tạm thời sẽ trả thẳng cho client.'
          : total > 30000
          ? '🚨 Quá lâu! User đã bỏ đi. Giới hạn 3-5 lần retry và đặt trần (cap) cho delay.'
          : total > 5000
          ? '⚠️ Khá lâu. Cân nhắc giảm số retry hoặc thêm max cap cho delay.'
          : '✅ Hợp lý. Chỉ nên retry lỗi tạm thời (timeout, 503) và bảo đảm Idempotency để tránh tạo trùng.',
      ].join('\n')
    },
  },
  callouts: [
    { type: 'success', icon: '🔌', title: 'Circuit Breaker + Fallback', body: 'Kết hợp hai pattern: circuit breaker chặn gọi downstream đang chết (fast fail), còn fallback trả cache/giá trị mặc định để user vẫn dùng được.' },
    { type: 'warning', icon: '🌩️', title: 'Tránh Retry Storm', body: 'Luôn retry với exponential backoff + jitter và giới hạn số lần (3-5). Retry ngay lập tức, đồng loạt sẽ giết chết service đang cố hồi phục.' },
    { type: 'danger', icon: '🔁', title: 'Retry phải Idempotent', body: 'Chỉ retry operation idempotent. Retry một POST tạo đơn hàng mà không có Idempotency key có thể tạo nhiều đơn trùng. Xem lại chủ đề Idempotency.' },
  ],
  quiz: [
    {
      q: "Circuit Breaker ở trạng thái OPEN sẽ làm gì với request tới?",
      options: ["Chờ mỗi request rồi mới báo lỗi sau khi hết timeout", "Chặn request ngay lập tức (fast fail), không gọi downstream, để nó hồi phục", "Tự động retry vô hạn cho tới khi thành công", "Cho toàn bộ request đi qua downstream như bình thường"],
      answer: 1,
      explain: "OPEN nghĩa là mạch đã ngắt: request bị từ chối ngay (fast fail) để không dồn thêm tải lên downstream đang lỗi, cho nó thời gian phục hồi. Sau cooldown mới chuyển sang HALF-OPEN để thử lại.",
    },
    {
      q: "Vì sao cần thêm jitter vào exponential backoff?",
      options: ["Để tăng gấp đôi thời gian chờ sau mỗi lần retry", "Để bảo đảm mọi operation đều trở thành idempotent", "Để giảm số lần retry xuống bằng 0", "Để các client không đồng loạt retry cùng một thời điểm (tránh thundering herd)"],
      answer: 3,
      explain: "Backoff tăng thời gian chờ theo cấp số nhân; jitter thêm phần ngẫu nhiên để rải đều các lần retry, tránh nhiều client đồng bộ hóa và cùng ập vào server một lúc.",
    },
    {
      q: "Bulkhead pattern bảo vệ hệ thống bằng cách nào?",
      options: ["Cô lập tài nguyên (pool riêng) để một service lỗi không làm cạn tài nguyên của service khác", "Lưu dữ liệu vào cache để đọc nhanh hơn", "Tăng gấp đôi số thread cho mọi downstream", "Bỏ qua mọi lỗi và luôn trả về thành công"],
      answer: 0,
      explain: "Bulkhead chia tài nguyên thành các ngăn riêng (thread/connection pool riêng cho từng dependency), nên một downstream chậm chỉ làm cạn pool của chính nó, các phần còn lại vẫn chạy.",
    },
    {
      q: "Retry một request tạo đơn hàng (POST) mà không có Idempotency key có rủi ro gì?",
      options: ["Retry luôn bị timeout chặn nên không sao", "Không có rủi ro gì, POST luôn an toàn khi retry", "Có thể tạo nhiều đơn hàng trùng lặp nếu request đầu thực ra đã thành công", "Server sẽ tự động gộp các đơn trùng lại làm một"],
      answer: 2,
      explain: "Nếu request đầu đã ghi thành công nhưng phản hồi bị mất, client tưởng lỗi và retry, tạo ra đơn thứ hai. Idempotency key giúp server nhận ra và bỏ qua request lặp.",
    },
  ],
}
