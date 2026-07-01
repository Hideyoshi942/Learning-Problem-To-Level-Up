export default {
  slug: 'testing',
  order: 34,
  title: 'Testing Strategy',
  emoji: '🧪',
  description: 'Testing Strategy giúp team viết đúng loại test ở đúng tầng: nhiều unit test nhanh ở đáy, integration test vừa phải ở giữa, ít e2e test ở đỉnh. Hiểu test pyramid, test double, contract testing và giới hạn của coverage giúp CI chạy nhanh, ổn định và bắt bug sớm.',
  project: 'Bộ test cho một service backend tính đơn hàng và thanh toán.',
  problems: [
    { icon: '🐌', title: 'CI chạy quá chậm', desc: 'Quá nhiều e2e test khiến mỗi lần push phải chờ 30 phút mới biết pass hay fail.' },
    { icon: '🎲', title: 'Flaky test', desc: 'Test lúc pass lúc fail dù code không đổi, team mất niềm tin và bắt đầu bỏ qua kết quả CI.' },
    { icon: '🕳️', title: 'Coverage cao vẫn lọt bug', desc: 'Coverage 95% nhưng production vẫn lỗi vì test chỉ chạy qua code chứ không assert đúng hành vi.' },
  ],
  concepts: [
    {
      name: 'Test Pyramid',
      icon: '🔺',
      explain: 'Test Pyramid mô tả tỉ lệ hợp lý giữa các loại test: nhiều unit test ở đáy (nhanh, rẻ), một lượng integration test ở giữa, và ít e2e test ở đỉnh (chậm, đắt, dễ vỡ). Đảo ngược pyramid thành ice-cream cone (nhiều e2e, ít unit) làm CI chậm và flaky.',
      tip: 'Tỉ lệ tham khảo khoảng 70% unit / 20% integration / 10% e2e. Nguyên tắc: mỗi bug nên được cover ở tầng THẤP nhất có thể tái hiện được nó.',
      example: '// Tỉ lệ tham khảo trong Test Pyramid\n// 70% unit        -> nhanh (ms), chạy mọi lúc\n// 20% integration -> vừa phải (trăm ms)\n// 10% e2e         -> chậm (giây), chỉ luồng chính\n\nconst suite = { unit: 700, integration: 200, e2e: 100 };\n// Nguyên tắc: cover bug ở tầng THẤP nhất có thể tái hiện nó',
    },
    {
      name: 'Unit Test',
      icon: '⚡',
      explain: 'Unit test kiểm tra một đơn vị nhỏ (một hàm, một class) một cách CÔ LẬP với DB, network, filesystem. Vì cô lập nên rất nhanh (mili giây) và deterministic. Dependency bên ngoài được thay bằng test double.',
      tip: 'Một unit test tốt tuân theo Arrange-Act-Assert, chỉ assert một hành vi, và không phụ thuộc thứ tự chạy. Nếu test cần DB thật thì đó là integration test, không phải unit.',
      example: '// Unit test: cô lập, nhanh, deterministic (Arrange-Act-Assert)\nfunction tinhThue(gia, thueSuat) {\n  return gia + gia * thueSuat;\n}\n\n// Arrange -> Act -> Assert\nconst ketQua = tinhThue(1000, 0.1);\nconsole.log(ketQua === 1100); // true, không đụng DB hay network',
    },
    {
      name: 'Integration Test',
      icon: '🔌',
      explain: 'Integration test kiểm tra nhiều thành phần làm việc CÙNG NHAU: code + DB thật, code + message queue, nhiều module gọi nhau. Bắt được bug mà unit test bỏ lọt (sai schema, sai query, sai config). Chậm hơn unit vì đụng I/O thật.',
      tip: 'Dùng Testcontainers hoặc DB tạm để có môi trường sạch mỗi lần chạy. Giữ số lượng vừa phải vì mỗi integration test chậm hơn unit khoảng 40 lần.',
      example: '// Integration test: code + DB THẬT chạy cùng nhau\n// Dùng Testcontainers để có DB sạch mỗi lần chạy\nbeforeAll(async () => {\n  db = await startPostgresContainer();\n});\n\ntest("lưu và đọc lại order", async () => {\n  await repo.save({ id: 1, total: 500 });\n  const found = await repo.findById(1);\n  expect(found.total).toBe(500); // bắt lỗi schema/query unit bỏ lọt\n});',
    },
    {
      name: 'Contract Testing',
      icon: '📜',
      explain: 'Contract testing đảm bảo hai service (consumer và provider) đồng ý về format của request/response. Consumer định nghĩa contract (kỳ vọng), provider chạy test để xác nhận vẫn thỏa contract. Bắt được breaking change API mà không cần dựng cả hệ thống e2e.',
      tip: 'Pact là tool phổ biến cho contract testing. Contract test rẻ hơn nhiều so với e2e nhưng vẫn bắt được lỗi tích hợp giữa các service khi chúng deploy độc lập.',
      example: '// Contract testing (Pact): consumer định nghĩa kỳ vọng\n// Provider chạy test để xác nhận vẫn thỏa contract\nconst contract = {\n  request:  { method: "GET", path: "/orders/1" },\n  response: { status: 200, body: { id: 1, total: 500 } },\n};\n// Nếu provider đổi field "total" thành "amount" -> contract FAIL\n// -> bắt breaking change mà không cần dựng cả hệ thống e2e',
    },
    {
      name: 'Test Doubles (Mock/Stub/Fake)',
      icon: '🎭',
      explain: 'Test double thay thế dependency thật khi test. Stub trả về giá trị định sẵn (không quan tâm được gọi thế nào). Mock kiểm tra tương tác (verify được gọi đúng số lần, đúng tham số). Fake là bản cài đặt đơn giản chạy được thật (ví dụ in-memory DB).',
      tip: 'Đừng mock quá mức. Mock nhiều làm test dính chặt vào implementation, refactor là gãy test dù hành vi vẫn đúng. Ưu tiên fake/stub cho giá trị, chỉ mock khi cần verify một tương tác quan trọng.',
      example: '// Test doubles thay dependency thật\n// STUB: trả giá trị định sẵn\nconst stubGia = { layGia: () => 1000 };\n\n// FAKE: cài đặt đơn giản chạy thật (in-memory)\nclass FakeRepo {\n  constructor() { this.data = new Map(); }\n  save(o) { this.data.set(o.id, o); }\n  find(id) { return this.data.get(id); }\n}\n\n// MOCK: verify tương tác (được gọi đúng không)\nconst mockMail = { sent: 0, send() { this.sent++; } };\ncheckout(mockMail);\nconsole.log(mockMail.sent === 1); // đã gửi đúng 1 email',
    },
    {
      name: 'Test Coverage',
      icon: '📊',
      explain: 'Coverage đo phần trăm dòng/nhánh code được chạy qua khi test. Hữu ích để tìm vùng chưa được test, nhưng KHÔNG đo chất lượng test. Coverage 100% vẫn có thể không assert gì (chạy qua code mà không kiểm tra kết quả). Coverage là điều kiện cần, không phải điều kiện đủ.',
      tip: 'Đừng đặt coverage 100% làm mục tiêu cứng vì nó khuyến khích test rác. Ưu tiên branch coverage cho logic quan trọng (thanh toán, phân quyền) và chấp nhận coverage thấp hơn ở code ít rủi ro.',
      example: '// Coverage cao KHÔNG đồng nghĩa test tốt\nfunction chia(a, b) {\n  return a / b; // quên xử lý b === 0\n}\n\ntest("chia chạy được", () => {\n  chia(10, 2);   // chạy qua hàm -> coverage 100%\n  // nhưng KHÔNG có assert -> bug chia cho 0 vẫn lọt!\n});\n// Coverage đo dòng ĐƯỢC CHẠY, không đo có ASSERT đúng hay không',
    },
  ],
  demos: [
    {
      id: 'test-runner',
      label: '🧪 Mini Test Runner',
      language: 'javascript',
      code: `// Mini test runner tự viết - không dùng jest, tự đếm pass/fail
var pass = 0, fail = 0;
function assert(name, cond) {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else      { fail++; console.log("  FAIL  " + name); }
}

// Hàm cần test: tính giá sau khi giảm giá
// Giảm theo phần trăm nhưng không vượt quá maxGiam (VND)
function tinhGiamGia(gia, phanTram, maxGiam) {
  var giam = gia * phanTram / 100;
  if (giam > maxGiam) giam = maxGiam;
  return gia - giam;
}

console.log("Chạy unit test cho tinhGiamGia:");
assert("giảm 10% của 1000 = 900", tinhGiamGia(1000, 10, 999999) === 900);
assert("giảm 0% giữ nguyên giá", tinhGiamGia(500, 0, 100) === 500);
assert("giảm bị chặn bởi maxGiam (500 -> 200)", tinhGiamGia(1000, 50, 200) === 800);
assert("giảm 50% của 100 = 40 (test cố tình SAI)", tinhGiamGia(100, 50, 999) === 40);

console.log("");
console.log("Kết quả: " + pass + " PASS, " + fail + " FAIL");
if (fail > 0) console.log("Có test thất bại -> phải sửa code hoặc sửa test, không được bỏ qua!");
else console.log("Tất cả test đều xanh!");`,
    },
    {
      id: 'pyramid-cost',
      label: '🔺 Chi phí Test Pyramid',
      language: 'javascript',
      code: `// So sánh tổng thời gian chạy test: Pyramid chuẩn vs Ice-cream Cone
var UNIT_MS = 5, INT_MS = 200, E2E_MS = 5000;

function tongThoiGian(unit, integration, e2e) {
  return unit * UNIT_MS + integration * INT_MS + e2e * E2E_MS;
}
function trinhBay(ten, unit, integration, e2e) {
  var ms = tongThoiGian(unit, integration, e2e);
  var giay = (ms / 1000).toFixed(1);
  console.log(ten);
  console.log("  unit=" + unit + "  integration=" + integration + "  e2e=" + e2e);
  console.log("  tổng = " + ms + "ms (~" + giay + "s)");
}

console.log("Cùng tổng 1000 test, chia theo 2 cách:");
console.log("");
trinhBay("Pyramid chuẩn (nhiều unit, ít e2e):", 800, 150, 50);
console.log("");
trinhBay("Ice-cream cone (đảo ngược, nhiều e2e):", 50, 150, 800);
console.log("");

var a = tongThoiGian(800, 150, 50);
var b = tongThoiGian(50, 150, 800);
console.log("Ice-cream cone chậm hơn " + (b / a).toFixed(1) + "x!");
console.log("=> Càng nhiều e2e, CI càng chậm và càng dễ flaky.");`,
    },
    {
      id: 'flaky-detector',
      label: '🎲 Flaky Test Detector',
      language: 'javascript',
      code: `// Flaky test: chạy CÙNG một test nhiều lần mà kết quả không ổn định
// Giả lập nguyên nhân: test phụ thuộc trạng thái biến đổi (vd thứ tự chạy)
function chayTestFlaky(lanThu) {
  // deterministic nhưng trông như ngẫu nhiên: cứ 3 lần lại fail 1 lần
  return (lanThu % 3) !== 0;
}
function chayTestOnDinh(lanThu) {
  return true; // logic thuần: cùng input -> cùng output
}

var N = 9;
var flakyPass = 0, flakyFail = 0;
var lichSu = "";

for (var i = 1; i <= N; i++) {
  if (chayTestFlaky(i)) { flakyPass++; lichSu += "P"; }
  else                  { flakyFail++; lichSu += "F"; }
  chayTestOnDinh(i);
}

console.log("Chạy 1 test " + N + " lần (code KHÔNG đổi):");
console.log("");
console.log("Test flaky   : " + lichSu + "  (" + flakyPass + " pass / " + flakyFail + " fail)");
console.log("Test ổn định : PPPPPPPPP  (9 pass / 0 fail)");
console.log("");
if (flakyFail > 0 && flakyPass > 0)
  console.log("=> Lúc pass lúc fail dù code không đổi -> đây là FLAKY test!");
console.log("Xử lý: cô lập nguyên nhân (thời gian, thứ tự, network, race) và làm test deterministic.");`,
    },
  ],
  interactive: {
    title: '🧪 Thời gian chạy CI theo số e2e test',
    inputLabel: 'Số lượng e2e test (mỗi e2e ~5 giây)',
    inputPlaceholder: '20',
    inputType: 'number',
    run(value) {
      const e2e = Math.max(Math.floor(parseFloat(value) || 0), 0)
      const UNIT_N = 500, UNIT_MS = 5
      const INT_N = 50, INT_MS = 200
      const E2E_MS = 5000
      const unitMs = UNIT_N * UNIT_MS
      const intMs = INT_N * INT_MS
      const e2eMs = e2e * E2E_MS
      const totalMs = unitMs + intMs + e2eMs
      const totalS = totalMs / 1000
      const phut = Math.floor(totalS / 60)
      const giay = Math.round(totalS % 60)
      const e2eShare = totalMs > 0 ? Math.round((e2eMs / totalMs) * 100) : 0
      return [
        `Giả định cố định: 500 unit x5ms + 50 integration x200ms`,
        `Bạn nhập: ${e2e} e2e test x5000ms`,
        ``,
        `⏱️  Tổng thời gian CI: ${totalS.toFixed(1)}s (~${phut}m ${giay}s)`,
        `    unit        : ${(unitMs / 1000).toFixed(1)}s`,
        `    integration : ${(intMs / 1000).toFixed(1)}s`,
        `    e2e         : ${(e2eMs / 1000).toFixed(1)}s (chiếm ${e2eShare}% tổng thời gian)`,
        ``,
        e2eShare >= 70
          ? `🚨 e2e chiếm ${e2eShare}% thời gian CI — đây là ice-cream cone! CI chậm và dễ flaky. Hãy đẩy bớt test xuống tầng unit/integration.`
          : e2eShare >= 40
          ? `⚠️  e2e đã chiếm ${e2eShare}% thời gian CI. e2e rất chậm, cân nhắc đẩy bớt kịch bản xuống unit/integration.`
          : `✅ e2e chỉ chiếm ${e2eShare}% thời gian CI. Pyramid đang cân đối, CI chạy nhanh.`,
      ].join('\n')
    },
  },
  callouts: [
    { type: 'success', icon: '🔺', title: 'Nhiều unit, ít e2e', body: 'Ưu tiên unit test ở đáy pyramid: nhanh, rẻ, chỉ rõ chỗ hỏng. Chỉ dùng e2e cho vài luồng nghiệp vụ quan trọng nhất. Tránh ice-cream cone để CI nhanh và ổn định.' },
    { type: 'warning', icon: '🎲', title: 'Flaky test giết niềm tin', body: 'Test lúc pass lúc fail khiến team bỏ qua kết quả CI. Cô lập nguyên nhân (thời gian, thứ tự chạy, network, race) và làm test deterministic. Test flaky nên bị cách ly hoặc sửa ngay.' },
    { type: 'info', icon: '🔴', title: 'TDD: Red - Green - Refactor', body: 'Viết test FAIL trước (Red), viết code tối thiểu để test PASS (Green), rồi dọn dẹp code mà test vẫn xanh (Refactor). Test dẫn dắt thiết kế và trở thành lưới an toàn khi refactor.' },
  ],
  quiz: [
    {
      q: "Vì sao Test Pyramid khuyến khích có nhiều unit test và ít e2e test?",
      options: ["Vì công cụ CI không hỗ trợ chạy e2e test", "Vì unit test bắt được mọi loại bug mà e2e không bao giờ bắt được", "Vì e2e test không bao giờ phát hiện lỗi thật", "Vì unit test nhanh, rẻ và ổn định; còn e2e chậm, đắt và dễ flaky nên chỉ dùng ít"],
      answer: 3,
      explain: "Đáy pyramid là unit test (nhanh, rẻ, deterministic); đỉnh là e2e (chậm, đắt, dễ vỡ). Đảo ngược thành ice-cream cone làm CI vừa chậm vừa flaky.",
    },
    {
      q: "Mock và Stub khác nhau ở điểm nào?",
      options: ["Mock chỉ dùng cho frontend, còn Stub chỉ dùng cho backend", "Stub trả về giá trị định sẵn; Mock còn kiểm tra tương tác (được gọi đúng số lần và tham số không)", "Mock và Stub là hai tên gọi của cùng một thứ, không khác gì nhau", "Stub luôn gọi dependency thật, còn Mock thì không"],
      answer: 1,
      explain: "Stub chỉ cung cấp dữ liệu trả về định sẵn. Mock thiên về verify tương tác: được gọi đúng số lần và đúng tham số hay không. Fake là bản cài đặt thật đơn giản (in-memory).",
    },
    {
      q: "Coverage đạt 100% nói lên điều gì về chất lượng bộ test?",
      options: ["Mọi hành vi quan trọng đều đã được assert đúng", "Code đã sẵn sàng lên production mà không cần review", "Chỉ nói mọi dòng ĐƯỢC CHẠY qua, không đảm bảo test có ASSERT đúng hành vi", "Chắc chắn không còn bug nào trong code"],
      answer: 2,
      explain: "Coverage đo dòng/nhánh được thực thi, không đo test có kiểm tra đúng kết quả hay không. Test chạy qua code mà không assert vẫn cho coverage cao nhưng bỏ lọt bug.",
    },
    {
      q: "Trong chu trình TDD (Red-Green-Refactor), bước ĐẦU TIÊN là gì?",
      options: ["Viết một test FAIL trước (Red) cho hành vi mong muốn", "Viết toàn bộ code hoàn chỉnh rồi mới viết test", "Đo test coverage trước khi viết bất kỳ dòng code nào", "Refactor code cho sạch trước khi có test nào"],
      answer: 0,
      explain: "TDD bắt đầu bằng Red: viết test mô tả hành vi mong muốn và để nó FAIL. Sau đó viết code tối thiểu để PASS (Green), rồi Refactor mà test vẫn xanh.",
    },
  ],
}
