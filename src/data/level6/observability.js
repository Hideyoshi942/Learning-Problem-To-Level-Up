export default {
  slug: 'observability',
  order: 33,
  title: 'Observability',
  emoji: '📊',
  description: 'Observability là khả năng hiểu được trạng thái bên trong hệ thống chỉ qua output (logs, metrics, traces). Nắm vững 3 trụ cột, percentile p95/p99, SLI/SLO/error budget và distributed tracing giúp bạn debug production nhanh và đo đúng trải nghiệm user.',
  project: 'Nền tảng microservices thương mại điện tử cần giám sát và debug production.',
  problems: [
    { icon: '🕵️', title: 'Không biết vì sao chậm', desc: 'Một request checkout chậm 2 giây nhưng không rõ nghẽn ở service nào trong chuỗi 6 service.' },
    { icon: '🔔', title: 'Alert fatigue', desc: 'Quá nhiều alert nhiễu (CPU cao, disk đầy) khiến dev bỏ qua luôn cả alert user thật sự bị lỗi.' },
    { icon: '📉', title: 'Average đánh lừa', desc: 'Dashboard chỉ hiển thị average latency 60ms trông đẹp, nhưng p99 tới 2000ms khiến 1% user rất khó chịu.' },
  ],
  concepts: [
    {
      name: '3 Pillars',
      icon: '🏛️',
      explain: 'Observability đứng trên 3 trụ cột. LOGS: sự kiện chi tiết tại một thời điểm (dùng để debug sâu). METRICS: số liệu tổng hợp theo thời gian, rẻ để lưu (dùng cho dashboard và alert). TRACES: hành trình của một request đi qua nhiều service (dùng để tìm nghẽn ở đâu). Ba loại này bổ trợ nhau, không thay thế nhau.',
      tip: 'Bắt đầu bằng metrics (biết CÓ vấn đề), rồi traces (biết vấn đề ở ĐÂU), rồi logs (biết TẠI SAO). Đừng chỉ dựa vào logs vì logs đắt để lưu và khó tổng hợp.',
      example: '// 3 tru cot cua Observability:\n// 1) LOG   - su kien chi tiet tai 1 thoi diem\nlogger.info({ event: "order_created", orderId: 123 })\n// 2) METRIC - so lieu tong hop theo thoi gian\ncounter.inc("orders_total")\nhistogram.observe("checkout_duration_seconds", 0.42)\n// 3) TRACE - hanh trinh 1 request qua nhieu service\nconst span = tracer.startSpan("checkout")',
    },
    {
      name: 'Structured Logging',
      icon: '📝',
      explain: 'Structured logging là ghi log dưới dạng JSON key-value thay vì free text. Máy đọc được nên có thể query, filter, aggregate dễ dàng (ví dụ: đếm mọi lỗi của userId=123). Luôn kèm context như requestId, userId, service để nối các dòng log lại với nhau.',
      tip: 'Luôn log JSON có cấu trúc, nhúng correlation id vào mỗi dòng, dùng đúng log level (info/warn/error), và TUYỆT ĐỐI không log PII hay secrets (mật khẩu, token, số thẻ).',
      example: '// Log dang text kho parse:\nconsole.log("User 123 bought item 456 in 0.42s")\n\n// Structured log (JSON) - may doc va query duoc:\nlogger.info({\n  event: "purchase",\n  userId: 123,\n  itemId: 456,\n  durationMs: 420,\n  requestId: "req-abc-789"\n})',
    },
    {
      name: 'RED & USE Metrics',
      icon: '📐',
      explain: 'Hai bộ metrics kinh điển. RED dành cho service xử lý request: Rate (số request/giây), Errors (tỉ lệ request lỗi), Duration (latency, đo bằng histogram để lấy percentile). USE dành cho tài nguyên: Utilization (mức dùng), Saturation (độ quá tải / hàng đợi), Errors. Chọn ít metrics nhưng đủ để trả lời được câu hỏi.',
      tip: 'RED cho API/service, USE cho tài nguyên (CPU, disk, queue). Cẩn thận cardinality: đừng gắn label có giá trị vô hạn như userId hay email vào metric, vì mỗi giá trị tạo ra một time series mới và sẽ làm nổ bộ nhớ.',
      example: '// RED - cho moi endpoint/service:\n//   Rate     : http_requests_total (req/s)\n//   Errors   : ti le 5xx / tong request\n//   Duration : histogram latency -> p50/p95/p99\nhistogram.observe("http_request_duration_seconds", 0.23)\ncounter.inc("http_requests_total", { route: "/checkout", status: 200 })\n\n// USE - cho tai nguyen (CPU, disk, queue):\n//   Utilization / Saturation / Errors\ngauge.set("queue_depth", 1200)',
    },
    {
      name: 'Percentiles',
      icon: '📈',
      explain: 'Percentile mô tả phân phối latency tốt hơn average. p50 (median) là mức mà 50% request nhanh hơn; p95/p99 là 5%/1% chậm nhất. Average bị các giá trị đuôi (outlier) kéo lệch và CHE GIẤU trải nghiệm của nhóm user tệ nhất. Vì vậy latency SLO gần như luôn đặt theo p95/p99.',
      tip: 'Không cộng/trung bình các percentile lại được (p99 của tổng KHÁC tổng các p99). Muốn tính percentile chính xác phải lưu histogram, đừng chỉ lưu average vì average không thể tái dựng lại đuôi.',
      example: '// Percentile: sort tang dan roi lay theo vi tri\n// p95 = gia tri ma 95% request nhanh hon no\nfunction percentile(values, p) {\n  const sorted = values.slice().sort(function (a, b) { return a - b })\n  const idx = Math.ceil((p / 100) * sorted.length) - 1\n  return sorted[Math.max(0, idx)]\n}\n// average = 60ms nhung p99 = 2000ms -> tail bi che giau!',
    },
    {
      name: 'SLI / SLO / Error Budget',
      icon: '🎯',
      explain: 'SLI (Indicator) là số đo thực tế, ví dụ tỉ lệ request thành công. SLO (Objective) là mục tiêu cho SLI đó, ví dụ 99.9%. Error budget = 100% - SLO = lượng lỗi được phép trong kỳ. Khi đốt hết budget thì dừng ship feature mới và ưu tiên độ ổn định; còn budget thì thoải mái release nhanh.',
      tip: 'SLO 100% là một cái bẫy: chi phí tiến tới vô hạn và chặn mọi thay đổi. Hãy đặt SLO đủ tốt cho user (three nines, four nines) và dùng error budget để cân bằng giữa tốc độ ship và độ tin cậy.',
      example: '// SLI  = so do thuc te\nconst availability = goodRequests / totalRequests   // 0.9995 = 99.95%\n// SLO  = muc tieu\nconst SLO = 0.999                                   // 99.9%\n// Error budget = 100% - SLO\nconst budget = 1 - SLO                              // 0.001 = 0.1%\n// Tren 1 trieu request -> duoc phep loi 1000 request/thang',
    },
    {
      name: 'Distributed Tracing',
      icon: '🔗',
      explain: 'Trace là hành trình của một request đi qua nhiều service. Mỗi bước là một span (có thời điểm bắt đầu, duration, và parent span). Toàn bộ span của cùng một request chia sẻ một trace id duy nhất. Correlation id / request id được truyền (propagate) qua header (ví dụ traceparent của chuẩn W3C) để nối log và span của các service lại thành một bức tranh.',
      tip: 'Propagate trace context qua MỌI hop (HTTP header, message queue). Dùng OpenTelemetry để chuẩn hoá. Nhúng trace id vào mỗi dòng log để nhảy nhanh từ một log lỗi sang trace tương ứng.',
      example: '// Trace context truyen qua header giua cac service:\n// traceparent: 00-4bf92f3577b34da6-00f067aa0ba902b7-01\n//                 ^trace_id          ^span_id\n\nconst span = tracer.startSpan("payment.charge", { parent: ctx })\nspan.setAttribute("amount", 4200)\n// ... goi service khac, truyen tiep trace_id ...\nspan.end()   // ghi lai duration cua span',
    },
  ],
  demos: [
    {
      id: 'percentiles',
      label: '📈 Percentiles vs Average',
      language: 'javascript',
      code: `// Average CHE GIAU duoi (long tail)
// 980 request nhanh (~20ms) + 20 request duoi cham (~2000ms)
const latency = [];
for (let i = 0; i < 980; i++) latency.push(18 + (i % 7));   // 18..24 ms
for (let j = 0; j < 20; j++) latency.push(1500 + j * 50);   // 1500..2450 ms

const n = latency.length;
let sum = 0;
for (let i = 0; i < n; i++) sum += latency[i];
const avg = sum / n;

// Percentile: sort tang dan roi lay phan tu o vi tri ceil(p% * n) - 1
const sorted = latency.slice().sort(function (a, b) { return a - b; });
function pct(arr, p) {
  let idx = Math.ceil((p / 100) * arr.length) - 1;
  if (idx < 0) idx = 0;
  return arr[idx];
}

console.log("Tong request : " + n + "  (980 nhanh + 20 cham)");
console.log('');
console.log("Average (trung binh) : " + avg.toFixed(1) + " ms");
console.log("p50 (median)         : " + pct(sorted, 50) + " ms");
console.log("p95                  : " + pct(sorted, 95) + " ms");
console.log("p99                  : " + pct(sorted, 99) + " ms");
console.log('');
console.log("Nhan xet:");
console.log("- 95% user thay <= " + pct(sorted, 95) + "ms (rat nhanh)");
console.log("- Nhung p99 = " + pct(sorted, 99) + "ms -> 1% user rat kho chiu");
console.log("- Average " + avg.toFixed(1) + "ms KHONG dai dien cho ai ca!");
console.log("=> Luon do p95/p99, dung chi nhin average.");`,
    },
    {
      id: 'error-budget',
      label: '🎯 Error Budget (SLO 99.9%)',
      language: 'javascript',
      code: `// Error Budget = 100% - SLO = luong loi duoc phep trong ky
const SLO = 99.9;                       // muc tieu (%)
const budgetPct = 100 - SLO;            // 0.1%
const minutesPerMonth = 30 * 24 * 60;   // 43200 phut/thang (30 ngay)

const allowedDowntimeMin = (budgetPct / 100) * minutesPerMonth;

console.log("SLO muc tieu      : " + SLO + "%");
console.log("Error budget      : " + budgetPct.toFixed(3) + "%");
console.log("Downtime cho phep : " + allowedDowntimeMin.toFixed(1) + " phut/thang");
console.log('');

// Quy doi ra so request loi cho phep tren tong request
const totalReq = 1000000;
const allowedErrors = Math.round((budgetPct / 100) * totalReq);
console.log("Tren " + totalReq.toLocaleString() + " request:");
console.log("  So loi cho phep : " + allowedErrors.toLocaleString());
console.log('');

// Thuc te da loi bao nhieu -> da dot bao nhieu % budget?
const actualErrors = 650;
const burnedPct = (actualErrors / allowedErrors) * 100;
console.log("Thuc te da loi    : " + actualErrors.toLocaleString() + " request");
console.log("Budget da dot     : " + burnedPct.toFixed(1) + "% error budget");
console.log('');
if (burnedPct >= 100) console.log("=> DA VUOT budget! Vi pham SLO, dung ship feature moi.");
else if (burnedPct >= 75) console.log("=> Sap het budget! Uu tien on dinh he thong.");
else console.log("=> Con budget, van an toan de ship.");`,
    },
    {
      id: 'trace',
      label: '🔗 Distributed Trace',
      language: 'javascript',
      code: `// 1 request checkout di qua nhieu service, cung 1 trace_id
// Moi buoc la 1 SPAN co duration rieng; depth = do sau trong cay
const traceId = "4bf92f3577b34da6";

const spans = [
  { name: "GET /checkout",  service: "api-gateway", ms: 210, depth: 0 },
  { name: "auth.verify",    service: "auth-svc",    ms: 25,  depth: 1 },
  { name: "cart.get",       service: "cart-svc",    ms: 40,  depth: 1 },
  { name: "db.query",       service: "cart-svc",    ms: 30,  depth: 2 },
  { name: "payment.charge", service: "payment-svc", ms: 120, depth: 1 },
  { name: "http.stripe",    service: "payment-svc", ms: 95,  depth: 2 },
];

console.log("trace_id = " + traceId);
console.log('');
console.log("Span tree (do dai bar = thoi gian):");
for (let i = 0; i < spans.length; i++) {
  const s = spans[i];
  let indent = "";
  for (let d = 0; d < s.depth; d++) indent += "  ";
  const bar = "#".repeat(Math.max(1, Math.round(s.ms / 10)));
  console.log(indent + s.name + " [" + s.service + "] " + s.ms + "ms " + bar);
}
console.log('');

const root = spans[0];
let sumChildren = 0;
for (let i = 0; i < spans.length; i++) if (spans[i].depth === 1) sumChildren += spans[i].ms;
const services = new Set(spans.map(function (s) { return s.service; }));

console.log("Tong thoi gian request (root span) = " + root.ms + "ms");
console.log("Tong cac span con truc tiep        = " + sumChildren + "ms");
console.log("=> Correlate qua trace_id giup gop log tu " + services.size + " service ve 1 cho.");`,
    },
  ],
  interactive: {
    title: '📊 SLO → downtime cho phép & error budget',
    inputLabel: 'SLO target (%) — ví dụ 99.9',
    inputPlaceholder: '99.9',
    inputType: 'number',
    run(value) {
      const slo = Math.min(Math.max(parseFloat(value) || 0, 0), 100)
      const budget = 100 - slo
      const minMonth = 30 * 24 * 60      // 43200 phut/thang
      const downMin = (budget / 100) * minMonth
      const downSec = downMin * 60
      const errPerM = Math.round((budget / 100) * 1000000)
      const label =
        slo >= 99.99 ? "🚀 Rất nghiêm ngặt (four nines) — cần HA và automation mạnh."
        : slo >= 99.9 ? "👍 Phổ biến cho dịch vụ production (three nines)."
        : slo >= 99 ? "🙂 Chấp nhận được cho dịch vụ nội bộ."
        : "⚠️ SLO thấp — user sẽ cảm nhận rõ downtime."
      return [
        `SLO target   : ${slo}%`,
        `Error budget : ${budget.toFixed(3)}%`,
        ``,
        `⏱️  Downtime cho phép mỗi tháng (30 ngày):`,
        `    ${downMin.toFixed(1)} phút  (~ ${Math.round(downSec).toLocaleString()} giây)`,
        ``,
        `📉 Trên 1.000.000 request:`,
        `    Số lỗi cho phép: ${errPerM.toLocaleString()} request`,
        ``,
        label,
      ].join("\n")
    },
  },
  callouts: [
    { type: 'success', icon: '🏛️', title: 'Observability > Monitoring', body: 'Monitoring trả lời câu hỏi đã biết trước; observability giúp điều tra cả những sự cố chưa từng lường tới. Ba trụ cột logs + metrics + traces làm được điều đó.' },
    { type: 'warning', icon: '💥', title: 'Cardinality bùng nổ', body: 'Đừng gắn label có giá trị vô hạn (userId, email, requestId) vào metric. Mỗi tổ hợp label tạo một time series mới, cardinality cao sẽ làm nổ bộ nhớ và chi phí.' },
    { type: 'danger', icon: '🔔', title: 'Alert theo triệu chứng', body: 'Alert dựa trên symptom ảnh hưởng tới user (tỉ lệ lỗi, p99 latency, đốt error budget), không phải cause (CPU cao). Alert theo cause gây nhiễu và dẫn tới alert fatigue.' },
  ],
  quiz: [
    {
      q: "Ba trụ cột (three pillars) của Observability là gì?",
      options: ["Frontend, Backend, Database", "Logs, Metrics, Traces", "Alerts, Dashboards, Reports", "CPU, RAM, Disk"],
      answer: 1,
      explain: "Ba trụ cột là Logs (sự kiện chi tiết), Metrics (số liệu tổng hợp theo thời gian) và Traces (hành trình của một request qua nhiều service). Chúng bổ trợ nhau chứ không thay thế nhau.",
    },
    {
      q: "Vì sao nên đo p95/p99 thay vì chỉ nhìn average (trung bình) của latency?",
      options: ["Vì percentile luôn nhỏ hơn average", "Vì average không dùng được cho latency", "Vì average bị vài request đuôi (tail) chậm che giấu, không phản ánh trải nghiệm nhóm user tệ nhất", "Vì average khó tính hơn percentile"],
      answer: 2,
      explain: "Average có thể trông ổn dù p99 rất cao vì một ít request chậm ở đuôi bị làm mờ đi. p95/p99 cho thấy trải nghiệm thật của nhóm user chậm nhất.",
    },
    {
      q: "Với SLO 99.9%, error budget mỗi tháng (30 ngày) tương đương downtime cho phép khoảng bao nhiêu?",
      options: ["Khoảng 43 phút", "Khoảng 7.2 giờ", "Khoảng 4.3 phút", "0 phút — không được phép lỗi"],
      answer: 0,
      explain: "Budget = 100% - 99.9% = 0.1%. 0.1% của 43200 phút/tháng xấp xỉ 43.2 phút downtime cho phép mỗi tháng.",
    },
    {
      q: "Trong distributed tracing, cái gì giúp nối tất cả span của cùng MỘT request khi đi qua nhiều service?",
      options: ["Timestamp của log", "Tên của service", "Địa chỉ IP của server", "trace id (được propagate/correlate qua mọi service)"],
      answer: 3,
      explain: "Một trace id duy nhất sinh ra ở đầu request và được truyền qua header tới mọi service. Mỗi bước là một span nhưng cùng chung trace id nên gộp lại thành một trace hoàn chỉnh.",
    },
  ],
}
