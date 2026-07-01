export default {
  slug: 'cicd-deploy',
  order: 35,
  title: 'CI/CD & Deployment',
  emoji: '🚀',
  description: 'CI/CD tự động hóa build, test và deploy để ship code nhanh mà vẫn an toàn. Nắm vững Canary, Blue-Green, Rolling Update, Feature Flags và IaC giúp bạn release nhiều lần mỗi ngày với rủi ro tối thiểu và rollback trong vài giây.',
  project: 'Pipeline release cho một web service chạy nhiều instance.',
  problems: [
    { icon: '💥', title: 'Deploy gây downtime', desc: 'Deploy thủ công lúc nửa đêm, app sập vài phút, user gặp lỗi.' },
    { icon: '🐛', title: 'Bản lỗi lên thẳng 100%', desc: 'Bug lọt qua, release cho toàn bộ user cùng lúc → sự cố diện rộng.' },
    { icon: '🕰️', title: 'Rollback chậm', desc: 'Phát hiện lỗi nhưng không quay về bản cũ nhanh được → downtime kéo dài.' },
  ],
  concepts: [
    {
      name: 'CI Pipeline',
      icon: '🔨',
      explain: 'CI (Continuous Integration) tự động build + lint + test + security scan mỗi khi push code. Mục tiêu: phát hiện lỗi sớm và giữ nhánh main luôn ở trạng thái deploy được. Pipeline chạy các stage TUẦN TỰ và FAIL-FAST: một stage fail thì dừng ngay, không chạy tiếp. CD (Continuous Delivery/Deployment) là bước tiếp theo: tự động đưa artifact đã pass CI lên môi trường (staging/production).',
      tip: 'Đặt stage nhanh và hay fail (lint, unit test) lên trước để fail-fast tiết kiệm thời gian; stage chậm (integration, e2e) để sau. Cache dependencies để build nhanh hơn.',
      example: '# CI pipeline (chay tuan tu, fail-fast)\nstages:\n  - build:  npm ci && npm run build\n  - lint:   npm run lint\n  - test:   npm test\n  - scan:   npm audit --audit-level=high\n  - deploy: ./deploy.sh --strategy canary',
    },
    {
      name: 'Blue-Green Deployment',
      icon: '🔵',
      explain: 'Chạy song song 2 môi trường giống hệt nhau: BLUE (đang live) và GREEN (bản mới). Deploy bản mới lên GREEN, smoke test xong thì chuyển router/load balancer trỏ toàn bộ traffic sang GREEN TỨC THỜI. Nếu lỗi, switch lại BLUE ngay lập tức (chỉ đổi router). Rollback cực nhanh nhưng tốn gấp đôi tài nguyên vì phải duy trì 2 môi trường.',
      tip: 'Blue-Green cho zero-downtime và rollback tính bằng giây. Cẩn thận database migration: schema phải backward compatible với cả 2 phiên bản vì traffic có thể switch qua lại.',
      example: '// Blue-Green: doi router tro sang moi truong moi\nlet live = "blue";       // dang chay\n// deploy v2 len green, smoke test OK\nlive = "green";          // switch 100% traffic tuc thoi\n// neu phat hien loi:\nlive = "blue";           // rollback tuc thoi (chi doi router)',
    },
    {
      name: 'Canary Release',
      icon: '🐤',
      explain: 'Dịch traffic sang bản mới TỪ TỪ theo phần trăm (1% → 10% → 50% → 100%). Giám sát metrics (error rate, latency) ở mỗi bước. Nếu vượt ngưỡng → tự động rollback, chỉ một phần nhỏ user bị ảnh hưởng. Tên gọi lấy từ hình ảnh chim hoàng yến trong mỏ than. Khác Blue-Green ở chỗ traffic được chia dần chứ không switch 100% một phát.',
      tip: 'Kết hợp canary với automated rollback dựa trên SLO/metrics. Chọn canary group đại diện cho user thật (không chỉ nội bộ). Cần observability tốt (metrics, tracing) để quyết định promote hay rollback.',
      example: '// Canary: tang dan % traffic sang ban moi\nconst steps = [1, 10, 50, 100];   // %\nfor (const pct of steps) {\n  shiftTraffic("v2", pct);        // dich pct% traffic sang v2\n  if (errorRate("v2") > SLO) {    // vuot nguong\n    rollback("v1");               // quay ve ban cu\n    break;\n  }\n}',
    },
    {
      name: 'Rolling Update',
      icon: '🌊',
      explain: 'Thay thế dần các instance/pod cũ bằng bản mới, từng nhóm nhỏ một, cho tới khi tất cả chạy bản mới. Không cần gấp đôi tài nguyên như Blue-Green. Kubernetes mặc định dùng rolling update với maxSurge và maxUnavailable. Nhược điểm: trong lúc rollout cả 2 phiên bản cùng phục vụ traffic, và rollback chậm hơn Blue-Green.',
      tip: 'Đặt readiness probe để LB chỉ gửi traffic tới pod đã sẵn sàng. maxUnavailable=0 để không giảm capacity trong lúc deploy. Đảm bảo backward compatibility vì 2 version chạy đồng thời.',
      example: '# Kubernetes Rolling Update\nstrategy:\n  type: RollingUpdate\n  rollingUpdate:\n    maxSurge: 1          # tao them toi da 1 pod moi\n    maxUnavailable: 0    # khong giam capacity\n# readinessProbe de LB chi gui traffic toi pod san sang',
    },
    {
      name: 'Feature Flags',
      icon: '🚩',
      explain: 'Feature flag (feature toggle) cho phép bật/tắt tính năng bằng config mà KHÔNG cần deploy lại. Tách biệt việc deploy code khỏi việc release feature. Có thể bật tính năng cho một nhóm user (%), rollout dần, hoặc tắt ngay (kill switch) khi có sự cố. Về bản chất là dạng canary ở tầng application.',
      tip: 'Dọn dẹp flag cũ để tránh nợ kỹ thuật (flag debt). Dùng cho A/B testing, gradual rollout và kill switch. Lưu flag ở nơi thay đổi nhanh (config service) chứ không hardcode trong code.',
      example: '// Feature flag: bat/tat runtime, khong deploy lai\nif (flags.isEnabled("new_checkout", user)) {\n  renderNewCheckout();   // chi bat cho % user hoac nhom cu the\n} else {\n  renderOldCheckout();\n}\n// Su co? Tat flag ngay (kill switch), khong can rollback code',
    },
    {
      name: 'IaC & Immutable Infrastructure',
      icon: '📜',
      explain: 'IaC (Infrastructure as Code) quản lý hạ tầng bằng file khai báo (Terraform, CloudFormation) thay vì click tay → tái lập được, versioned, review qua PR. Immutable infrastructure: không sửa server đang chạy; muốn đổi thì build image/container MỚI rồi thay thế, không patch tại chỗ. Container (Docker) đóng gói app + dependencies thành artifact bất biến, chạy giống nhau ở mọi môi trường.',
      tip: 'Immutable + container loại bỏ vấn đề works on my machine và configuration drift. Mỗi deploy là một image tag mới → rollback = deploy lại tag cũ. Không SSH vào sửa production.',
      example: '# IaC voi Terraform (khai bao ha tang)\nresource "aws_instance" "web" {\n  ami           = "ami-123"\n  instance_type = "t3.micro"\n}\n\n# Immutable: build image moi thay vi sua server\n# docker build -t app:v2 .  ->  deploy tag moi, rollback = deploy tag cu',
    },
  ],
  demos: [
    {
      id: 'canary',
      label: '🐤 Canary Rollout (auto rollback)',
      language: 'javascript',
      code: `// Canary Release: dich traffic sang ban moi TU TU theo %
// Giam sat moi buoc, neu so user gap loi vuot nguong -> ROLLBACK ngay
var TOTAL_USERS = 100000;
var ERROR_RATE = 30;    // % request loi cua ban moi (gia dinh ban loi nang)
var THRESHOLD = 500;    // so user gap loi toi da chap nhan moi buoc
var steps = [1, 10, 50, 100];   // % traffic canary qua tung buoc

var rolledBack = false;
for (var i = 0; i < steps.length; i++) {
  var pct = steps[i];
  var exposed = Math.round(TOTAL_USERS * pct / 100);      // user dung ban moi
  var affected = Math.round(exposed * ERROR_RATE / 100);  // user gap loi
  console.log("Buoc " + (i + 1) + ": canary " + pct + "% -> " + exposed + " user dung ban moi, " + affected + " user gap loi");
  if (affected > THRESHOLD) {
    console.log("   Vuot nguong " + THRESHOLD + " -> ROLLBACK! Dung tang traffic.");
    rolledBack = true;
    break;
  }
}
console.log("");
var fullAffected = Math.round(TOTAL_USERS * ERROR_RATE / 100);
console.log("Neu full rollout 100% ngay tu dau: " + fullAffected + " user gap loi");
if (rolledBack) {
  console.log("Canary chan ban loi tu som -> chi mot phan nho user bi anh huong.");
} else {
  console.log("Rollout 100% thanh cong.");
}`,
    },
    {
      id: 'blue-green',
      label: '🔵 Blue-Green Switch',
      language: 'javascript',
      code: `// Blue-Green: 2 moi truong giong het nhau
// BLUE = dang chay (live), GREEN = ban moi (idle)
// Switch router sang GREEN tuc thoi. Loi -> switch lai BLUE tuc thoi.
var blue = { name: "BLUE", version: "v1.0" };
var green = { name: "GREEN", version: "v2.0" };
var live = blue;   // router dang tro toi BLUE

console.log("Ban dau : traffic -> " + live.name + " (" + live.version + ")");
console.log("Deploy " + green.version + " len GREEN, chay smoke test...");

// Switch TUC THOI sang GREEN (khong dich dan tung % nhu canary)
live = green;
console.log("SWITCH  : traffic -> " + live.name + " (" + live.version + ") ngay lap tuc");

// Gia su phat hien loi nghiem trong tren GREEN sau khi switch
var greenHasBug = true;
console.log("");
if (greenHasBug) {
  console.log("Phat hien loi nghiem trong tren GREEN!");
  live = blue;   // switch lai tuc thoi, khong can rebuild
  console.log("ROLLBACK: traffic -> " + live.name + " (" + live.version + ") tuc thoi (chi doi router)");
}
console.log("");
console.log("Blue-Green: rollback = doi router (giay). Khac canary phai dich dan tung %.");`,
    },
    {
      id: 'ci-pipeline',
      label: '🔨 CI Pipeline (fail-fast)',
      language: 'javascript',
      code: `// CI Pipeline: chay cac stage TUAN TU, FAIL-FAST khi 1 stage fail
var stages = [
  { name: "build",            pass: true },
  { name: "lint",             pass: true },
  { name: "unit test",        pass: false },  // stage nay fail
  { name: "integration test", pass: true },
  { name: "security scan",    pass: true },
  { name: "deploy",           pass: true }
];

var failedAt = -1;
for (var i = 0; i < stages.length; i++) {
  var s = stages[i];
  if (s.pass) {
    console.log("PASS  [" + (i + 1) + "/" + stages.length + "] " + s.name);
  } else {
    console.log("FAIL  [" + (i + 1) + "/" + stages.length + "] " + s.name + " -> dung pipeline (fail-fast)");
    failedAt = i;
    break;
  }
}
console.log("");
if (failedAt >= 0) {
  var skipped = stages.length - failedAt - 1;
  console.log("Pipeline FAILED tai stage: " + stages[failedAt].name);
  console.log("Bo qua " + skipped + " stage phia sau -> khong deploy code loi.");
} else {
  console.log("Pipeline PASSED -> deploy!");
}`,
    },
    {
      id: 'ci-yaml',
      label: '📄 CI config (YAML)',
      language: 'yaml',
      code: `name: CI Pipeline
on: [push]
jobs:
  build-test-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Build
        run: npm ci && npm run build
      - name: Lint
        run: npm run lint
      - name: Unit test
        run: npm test
      - name: Security scan
        run: npm audit --audit-level=high
      - name: Deploy canary
        run: ./deploy.sh --strategy canary --steps 1,10,50,100`,
    },
  ],
  interactive: {
    title: '🐤 Canary % → số user bị ảnh hưởng nếu bản mới lỗi',
    inputLabel: 'Tỉ lệ canary traffic (%) từ 0 đến 100',
    inputPlaceholder: '10',
    inputType: 'number',
    run(value) {
      const pct = Math.min(Math.max(parseFloat(value) || 0, 0), 100)
      const TOTAL = 100000
      const ERROR_RATE = 30
      const canaryExposed = Math.round((TOTAL * pct) / 100)
      const canaryAffected = Math.round((canaryExposed * ERROR_RATE) / 100)
      const fullAffected = Math.round((TOTAL * ERROR_RATE) / 100)
      const saved = fullAffected - canaryAffected
      const savedPct = fullAffected > 0 ? Math.round((saved / fullAffected) * 100) : 0
      return [
        `Giả định: bản mới lỗi (error rate ${ERROR_RATE}%), tổng ${TOTAL.toLocaleString()} user`,
        ``,
        `🐤 Canary ${pct}%:`,
        `    User dùng bản mới : ${canaryExposed.toLocaleString()}`,
        `    User gặp lỗi      : ${canaryAffected.toLocaleString()}`,
        ``,
        `🌊 Full rollout 100%:`,
        `    User gặp lỗi      : ${fullAffected.toLocaleString()}`,
        ``,
        `🛡️  Canary giúp tránh cho ${saved.toLocaleString()} user (${savedPct}%) khỏi bị lỗi`,
        pct <= 5 ? '✅ Canary nhỏ → phát hiện lỗi sớm, thiệt hại tối thiểu.'
          : pct <= 25 ? '👍 Canary vừa phải → cân bằng tốc độ và an toàn.'
          : '⚠️ Canary lớn → rollout nhanh nhưng nhiều user bị ảnh hưởng nếu lỗi.',
      ].join('\n')
    },
  },
  callouts: [
    { type: 'success', icon: '🐤', title: 'Canary + auto rollback', body: 'Rollout dần và tự rollback theo metrics giúp giới hạn thiệt hại chỉ ở một nhóm nhỏ user thay vì toàn bộ.' },
    { type: 'warning', icon: '🗄️', title: 'Database migration', body: 'Với Blue-Green và Rolling Update, schema phải backward compatible vì 2 phiên bản chạy đồng thời trong lúc rollout.' },
    { type: 'danger', icon: '🔴', title: 'Đừng sửa tay production', body: 'Immutable infra: mọi thay đổi phải qua IaC và image mới. SSH vào sửa tay gây configuration drift rất khó tái lập.' },
  ],
  quiz: [
    {
      q: "Canary release khác Blue-Green deployment chủ yếu ở điểm nào?",
      options: ["Canary dịch traffic DẦN theo %, còn Blue-Green switch 100% traffic tức thời", "Canary luôn tốn gấp đôi tài nguyên hơn Blue-Green", "Canary không cần test trước khi deploy", "Blue-Green chỉ dùng được cho database"],
      answer: 0,
      explain: "Canary chia traffic tăng dần (1% → 10% → ...) và giám sát mỗi bước; Blue-Green chuyển toàn bộ traffic sang môi trường mới một lần và rollback bằng cách đổi router.",
    },
    {
      q: "Trong CI pipeline, fail-fast nghĩa là gì?",
      options: ["Bỏ qua stage test để deploy nhanh hơn", "Tự động retry stage lỗi vô hạn lần", "Khi một stage fail thì dừng pipeline ngay, không chạy các stage sau", "Chạy tất cả stage song song cho nhanh"],
      answer: 2,
      explain: "Fail-fast dừng ngay khi phát hiện lỗi để tiết kiệm thời gian và tài nguyên; vì vậy nên đặt stage nhanh/hay fail (lint, unit test) lên đầu.",
    },
    {
      q: "Ưu điểm lớn nhất của Blue-Green deployment là gì?",
      options: ["Tiết kiệm tài nguyên vì chỉ cần một môi trường", "Không cần quan tâm tới database migration", "Traffic tự động chia đều theo phần trăm", "Rollback gần như tức thời chỉ bằng cách đổi router về môi trường cũ"],
      answer: 3,
      explain: "Vì môi trường cũ (BLUE) vẫn còn nguyên, chỉ cần trỏ router lại là rollback trong vài giây. Đổi lại phải duy trì song song 2 môi trường nên tốn tài nguyên.",
    },
    {
      q: "Feature flag giúp giải quyết vấn đề gì?",
      options: ["Tăng tốc độ build trong CI", "Bật/tắt tính năng bằng config mà không cần deploy lại, tách deploy khỏi release", "Thay thế hoàn toàn nhu cầu về container", "Tự động viết test cho pipeline"],
      answer: 1,
      explain: "Feature flag cho phép release hoặc kill tính năng lúc runtime qua config (kill switch, gradual rollout, A/B test) mà không phải deploy lại code.",
    },
  ],
}
