export default {
  slug: 'security',
  order: 32,
  title: 'Security & Auth',
  emoji: '🔒',
  description: 'Security là nền tảng sống còn của mọi backend: phân biệt AuthN (bạn là ai) với AuthZ (bạn được làm gì), dùng OAuth2/OIDC & JWT đúng cách, chọn session hay token, RBAC vs ABAC, phòng OWASP (SQL Injection/XSS/CSRF), băm mật khẩu và quản lý secrets. Làm sai một chỗ là mở toang cửa cho hacker.',
  project: 'Hệ thống đăng nhập & phân quyền cho REST API.',
  problems: [
    { icon: '🔓', title: 'Lưu mật khẩu plaintext', desc: 'DB bị lộ là mất sạch tài khoản; user thường tái sử dụng mật khẩu ở nơi khác.' },
    { icon: '🎭', title: 'Nhầm AuthN với AuthZ', desc: 'Đã đăng nhập nhưng quên kiểm tra quyền → user thường gọi được cả API admin.' },
    { icon: '💉', title: 'Tin input từ client', desc: 'SQL Injection, XSS, CSRF phá query, chèn script, giả mạo request nếu không validate input.' },
  ],
  concepts: [
    {
      name: 'AuthN vs AuthZ',
      icon: '🪪',
      explain: 'AuthN (Authentication) là xác minh BẠN LÀ AI — kiểm tra danh tính qua mật khẩu, OTP, biometric... AuthZ (Authorization) là xác định BẠN ĐƯỢC LÀM GÌ — kiểm tra quyền truy cập tài nguyên. Luôn AuthN trước, AuthZ sau. Gộp lẫn hai khái niệm này là lỗi thiết kế bảo mật cực phổ biến.',
      tip: 'Nhớ: AuthN = identity (who), AuthZ = permission (what). Một user đã đăng nhập (AuthN pass) vẫn phải bị từ chối khi gọi API admin (AuthZ fail).',
      example: '// AuthN: xác minh danh tính\nconst user = login(email, password); // đúng mật khẩu? -> biết BẠN LÀ AI\n\n// AuthZ: kiểm tra quyền\nif (user.role !== "admin") {\n  throw new Error("403 Forbidden"); // đã đăng nhập nhưng KHÔNG đủ quyền\n}\ndeleteAllUsers(); // chỉ admin mới tới được đây',
    },
    {
      name: 'OAuth2 & OIDC',
      icon: '🔑',
      explain: 'OAuth2 là framework ỦY QUYỀN (authorization): cho phép app truy cập tài nguyên thay mặt user mà KHÔNG cần biết mật khẩu của user. OIDC (OpenID Connect) xây trên OAuth2, bổ sung lớp XÁC THỰC và trả về ID Token (JWT) chứa thông tin user. Authorization Code Flow là flow chuẩn cho web app: redirect user tới Identity Provider, nhận về authorization code, rồi backend đổi code lấy token.',
      tip: 'Dùng Authorization Code Flow (kèm PKCE cho SPA/mobile). Access token để gọi API, ID token (OIDC) để biết user là ai. KHÔNG dùng Implicit Flow nữa vì lộ token ngay trên URL.',
      example: '// Authorization Code Flow (rút gọn):\n// 1. Redirect user tới Identity Provider (Google, Auth0...)\n//    GET /authorize?client_id=...&redirect_uri=...&response_type=code\n// 2. User đăng nhập & đồng ý -> IdP redirect về kèm code\n//    GET /callback?code=AUTH_CODE\n// 3. Backend đổi code lấy token (server-to-server, có client_secret)\nconst res = await exchange("/token", {\n  grant_type: "authorization_code",\n  code: "AUTH_CODE",\n  client_id: "app",\n  client_secret: "SECRET" // chỉ ở backend, không lộ ra client\n});\n// res = { access_token, id_token, refresh_token }',
    },
    {
      name: 'JWT',
      icon: '🎫',
      explain: 'JWT (JSON Web Token) gồm 3 phần ngăn cách bởi dấu chấm: header.payload.signature. Header chứa thuật toán (vd HS256, RS256). Payload chứa claims (sub, role, exp...). Signature = ký(header + payload, secret) để chống giả mạo. Header và payload chỉ được Base64URL encode — KHÔNG mã hóa — nên bất kỳ ai cũng đọc được payload.',
      tip: 'KHÔNG bao giờ để mật khẩu, PII hay secret trong payload (ai cũng decode được). Luôn set exp ngắn. Chọn RS256 (asymmetric) khi nhiều service cần verify mà không phải chia sẻ secret.',
      example: '// Cấu trúc: header . payload . signature\n// header    = { "alg": "HS256", "typ": "JWT" }\n// payload   = { "sub": "user-42", "role": "user", "exp": 1893456000 }\n// signature = HMAC_SHA256(base64(header) + "." + base64(payload), secret)\n\n// Verify ở server (cần secret):\nconst valid = verify(token, SECRET); // sai secret -> signature không khớp -> reject\n// Decode payload KHÔNG cần secret -> đừng để dữ liệu nhạy cảm ở đây',
    },
    {
      name: 'Session vs Token',
      icon: '🍪',
      explain: 'Session (stateful): server lưu session data (thường trong Redis), client chỉ giữ session ID trong cookie. Mỗi request server tra session ID để lấy state. Dễ revoke (xóa session) nhưng tốn bộ nhớ và khó scale ngang. Token/JWT (stateless): toàn bộ state nằm trong token ở client, server chỉ verify signature nên không cần lưu -> scale dễ. Nhược điểm: khó revoke trước khi hết hạn.',
      tip: 'Session hợp với monolith cần revoke tức thì. JWT hợp với microservices/API stateless. Kết hợp phổ biến: access token ngắn hạn (JWT) + refresh token (lưu ở server, có thể revoke).',
      example: '// Session (stateful):\ncookie: "sid=abc123"          // client chỉ giữ ID\nredis.get("session:abc123")   // server lưu state, tra mỗi request\n\n// Token (stateless):\nheader: "Authorization: Bearer <JWT>" // client giữ cả state\nverify(jwt, SECRET)                    // server chỉ verify, không lưu gì\n\n// Revoke: session -> redis.del(...) tức thì\n//         JWT     -> phải đợi exp hoặc dùng blacklist',
    },
    {
      name: 'RBAC vs ABAC',
      icon: '👮',
      explain: 'RBAC (Role-Based Access Control): gán quyền theo VAI TRÒ. User có role (admin, editor, viewer), mỗi role có tập permissions. Đơn giản, dễ audit, đủ cho đa số hệ thống. ABAC (Attribute-Based Access Control): quyết định dựa trên THUỘC TÍNH của user/tài nguyên/môi trường qua policy — vd editor chỉ sửa bài của chính mình, trong giờ làm việc. Linh hoạt hơn nhưng phức tạp hơn.',
      tip: 'Bắt đầu với RBAC (đủ cho khoảng 90% trường hợp). Bổ sung ABAC khi cần quyền theo ngữ cảnh (ownership, thời gian, phòng ban). Đừng rải logic quyền khắp code — gom về một policy layer.',
      example: '// RBAC: role -> permissions\nconst permissions = {\n  admin:  ["read", "write", "delete"],\n  editor: ["read", "write"],\n  viewer: ["read"]\n};\nfunction can(user, action) {\n  return permissions[user.role].includes(action);\n}\ncan({ role: "editor" }, "delete"); // false\n\n// ABAC: dựa trên thuộc tính + ngữ cảnh\nfunction canEdit(user, post) {\n  return user.id === post.ownerId; // chỉ sửa bài của chính mình\n}',
    },
    {
      name: 'Password Hashing',
      icon: '🧂',
      explain: 'KHÔNG BAO GIỜ lưu mật khẩu dạng plaintext. Băm một chiều bằng thuật toán CHẬM và có salt: bcrypt, scrypt, argon2. Salt là chuỗi ngẫu nhiên riêng cho mỗi user, lưu kèm hash — khiến hai user cùng mật khẩu vẫn ra hash khác nhau và vô hiệu hóa rainbow table. Hàm hash nhanh (MD5, SHA-256) KHÔNG dùng cho mật khẩu vì brute-force quá dễ.',
      tip: 'Dùng bcrypt cost factor >= 12 (hoặc argon2id). bcrypt tự sinh và nhúng salt vào output. Khi login: so sánh bằng bcrypt.compare (constant-time), đừng tự so hash bằng dấu bằng.',
      example: '// Đăng ký: hash rồi mới lưu\nconst hash = await bcrypt.hash(password, 12); // 12 = cost factor\ndb.saveUser({ email, passwordHash: hash }); // KHÔNG lưu password gốc\n\n// Đăng nhập: so sánh an toàn (constant-time)\nconst ok = await bcrypt.compare(inputPassword, user.passwordHash);\nif (!ok) throw new Error("Sai mật khẩu");\n\n// bcrypt output đã gồm cả salt: $2b$12$<salt><hash>',
    },
  ],
  demos: [
    {
      id: 'jwt-decode',
      label: '🎫 JWT decode (atob)',
      language: 'javascript',
      code: `// JWT gồm 3 phần: header.payload.signature (ngăn cách bởi dấu chấm)
// Dùng btoa() để tạo, atob() để decode Base64 -> đọc được header + payload
// => payload KHÔNG mã hóa, ai cũng đọc được -> đừng để secret trong đó!

// Server tạo token (mô phỏng - phần ký chỉ là chuỗi giả)
var header = { alg: 'HS256', typ: 'JWT' };
var payload = { sub: 'user-42', role: 'user', exp: 1893456000 };
var token = btoa(JSON.stringify(header)) + '.' +
            btoa(JSON.stringify(payload)) + '.' +
            'CHU_KY_HMAC_GIA';

console.log('JWT gửi cho client:');
console.log(token);
console.log('');

// Bất kỳ ai cầm token đều tách + decode được (KHÔNG cần secret!)
var parts = token.split('.');
console.log('Tách theo dấu chấm -> ' + parts.length + ' phần');
console.log('HEADER  đọc được: ' + JSON.stringify(JSON.parse(atob(parts[0]))));
console.log('PAYLOAD đọc được: ' + JSON.stringify(JSON.parse(atob(parts[1]))));
console.log('');
console.log('=> Payload chỉ Base64, KHÔNG mã hóa -> DỪNG để mật khẩu/secret ở đây!');
console.log('=> Signature mới chống giả mạo (server verify bằng secret).');`,
    },
    {
      id: 'salted-hash',
      label: '🧂 Băm mật khẩu có salt',
      language: 'javascript',
      code: `// Băm mật khẩu: KHÔNG bao giờ lưu plaintext.
// Hàm băm đồ chơi (tổng char-code, trộn thêm) - CHỈ để minh họa!
function toyHash(str) {
  var h = 7;
  for (var i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) % 1000000007;
  }
  return h;
}

var alicePass = 'matkhau123';
var bobPass = 'matkhau123'; // Bob TRÙNG mật khẩu với Alice (rất phổ biến!)

console.log('== KHÔNG salt ==');
console.log('Alice: ' + toyHash(alicePass));
console.log('Bob  : ' + toyHash(bobPass));
console.log('=> Hai hash GIỐNG NHAU -> lộ 1 là suy ra cả 2 + dễ tra rainbow table!');
console.log('');

// Mỗi user một salt ngẫu nhiên riêng, lưu kèm hash
var saltAlice = 'S4_alice_9f2';
var saltBob = 'S4_bob_7c1';
console.log('== CÓ salt (mỗi user 1 salt riêng) ==');
console.log('Alice: ' + toyHash(saltAlice + alicePass));
console.log('Bob  : ' + toyHash(saltBob + bobPass));
console.log('=> Cùng mật khẩu nhưng hash KHÁC NHAU -> rainbow table vô dụng.');
console.log('');
console.log('Thực tế: dùng bcrypt/argon2 (chậm + tự sinh salt), KHÔNG dùng toyHash này.');`,
    },
    {
      id: 'sql-injection',
      label: '💉 SQL Injection',
      language: 'javascript',
      code: `// SQL Injection: nối chuỗi input thẳng vào câu query là CỰC KỲ nguy hiểm.
// Input độc hại (mô phỏng): chuỗi "abc OR 1=1"
// (hacker thật còn thêm dấu nháy để thoát chuỗi; ở đây ta tránh dấu nháy)
var userInput = 'abc OR 1=1';

// SAI: nối thẳng input vào câu query
var badQuery = 'SELECT * FROM users WHERE name = ' + userInput;
console.log('❌ Nối chuỗi (SAI):');
console.log('   ' + badQuery);
console.log('   => Mệnh đề OR 1=1 luôn đúng -> trả về TOÀN BỘ bảng users!');
console.log('');

// ĐÚNG: parameterized query, DB coi input là DỮ LIỆU chứ không phải lệnh
function runParameterized(sql, params) {
  console.log('   SQL   : ' + sql);
  console.log('   Params: ' + JSON.stringify(params));
  console.log('   => Cả chuỗi "' + params[0] + '" bị coi là 1 cái tên -> tìm được 0 kết quả.');
}
console.log('✅ Parameterized (ĐÚNG):');
runParameterized('SELECT * FROM users WHERE name = ?', [userInput]);
console.log('');
console.log('Bài học: LUÔN dùng prepared statement / ORM binding, KHÔNG nối chuỗi input vào SQL.');`,
    },
  ],
  interactive: {
    title: '🔒 Độ dài mật khẩu → thời gian brute-force',
    inputLabel: 'Độ dài mật khẩu (số ký tự)',
    inputPlaceholder: '12',
    inputType: 'number',
    run(value) {
      const len = Math.min(Math.max(parseInt(value, 10) || 0, 0), 64)
      if (len <= 0) return 'Nhập độ dài mật khẩu (số ký tự) lớn hơn 0.'
      const charset = 72 // a-z, A-Z, 0-9 + vài ký tự đặc biệt
      const guessesPerSec = 1e9 // giả định 1 tỷ thử/giây (hash nhanh)
      const combos = Math.pow(charset, len)
      const seconds = combos / guessesPerSec

      const MIN = 60, HOUR = 3600, DAY = 86400, YEAR = 365 * DAY
      const UNIVERSE_YEARS = 13.8e9 // tuổi vũ trụ ~13.8 tỷ năm
      let timeStr
      if (seconds < 1) timeStr = 'dưới 1 giây (tức thì!)'
      else if (seconds < MIN) timeStr = `${seconds.toFixed(1)} giây`
      else if (seconds < HOUR) timeStr = `${(seconds / MIN).toFixed(1)} phút`
      else if (seconds < DAY) timeStr = `${(seconds / HOUR).toFixed(1)} giờ`
      else if (seconds < YEAR) timeStr = `${(seconds / DAY).toFixed(1)} ngày`
      else {
        const years = seconds / YEAR
        timeStr = years > UNIVERSE_YEARS
          ? `${(years / UNIVERSE_YEARS).toExponential(2)} lần tuổi vũ trụ`
          : `${years.toExponential(2)} năm`
      }

      const verdict = len < 8 ? '🚨 Quá yếu! Bẻ khoá gần như tức thì.'
        : len < 12 ? '⚠️  Tạm ổn nhưng nên dài hơn (>= 12).'
        : len < 16 ? '👍 Khá mạnh.'
        : '✅ Rất mạnh — brute-force gần như bất khả thi.'

      return [
        `Charset ~${charset} ký tự (a-z, A-Z, 0-9, ký tự đặc biệt)`,
        `Tốc độ giả định: ${guessesPerSec.toLocaleString()} thử/giây`,
        ``,
        `🔢 Số tổ hợp: 72^${len} ≈ ${combos.toExponential(2)}`,
        `⏱️  Thời gian bẻ khoá tối đa: ${timeStr}`,
        ``,
        verdict,
        ``,
        `💡 bcrypt/argon2 cố tình CHẬM (vài chục hash/giây), nên con số thực còn khủng khiếp hơn nhiều so với hash nhanh như MD5/SHA.`,
      ].join('\n')
    },
  },
  callouts: [
    { type: 'danger', icon: '🔑', title: 'Không bao giờ lưu mật khẩu plaintext', body: 'Luôn băm bằng bcrypt/argon2 + salt riêng cho mỗi user. Rò rỉ DB mà mật khẩu là plaintext = mất toàn bộ tài khoản, và user thường tái sử dụng mật khẩu ở nơi khác.' },
    { type: 'warning', icon: '🛡️', title: 'OWASP: SQLi, XSS, CSRF', body: 'SQLi: dùng parameterized query. XSS: escape/sanitize output + Content-Security-Policy. CSRF: anti-CSRF token hoặc cookie SameSite. Không tin bất kỳ input nào từ client.' },
    { type: 'info', icon: '🔐', title: 'Secrets management', body: 'Đừng hardcode API key/secret trong code hay nhét vào JWT payload. Dùng biến môi trường + secrets manager (Vault, AWS Secrets Manager), phân quyền tối thiểu và rotate secret định kỳ.' },
  ],
  quiz: [
    {
      q: "Authentication (AuthN) khác Authorization (AuthZ) ở điểm nào?",
      options: ["AuthN xác minh bạn LÀ AI (danh tính), AuthZ mới xét bạn được làm gì", "AuthN giới hạn số request mỗi giây", "AuthN kiểm tra bạn được phép làm gì (quyền)", "AuthN mã hóa dữ liệu khi truyền qua mạng"],
      answer: 0,
      explain: "AuthN (authentication) xác minh danh tính (who). AuthZ (authorization) mới quyết định quyền truy cập (what). Luôn AuthN trước, AuthZ sau.",
    },
    {
      q: "Vì sao KHÔNG nên để mật khẩu hay secret trong payload của JWT?",
      options: ["Vì payload có dung lượng tối đa 8 byte", "Vì payload bị server tự động xóa sau 1 giây", "Vì payload được mã hóa AES nên sẽ làm verify rất chậm", "Vì payload chỉ được Base64 encode, ai cầm token cũng decode đọc được"],
      answer: 3,
      explain: "Payload JWT chỉ là Base64 (KHÔNG mã hóa) — bất kỳ ai cầm token đều decode đọc được. Chỉ signature mới bảo vệ tính toàn vẹn và cần secret để verify.",
    },
    {
      q: "Cách hiệu quả nhất để chống SQL Injection là gì?",
      options: ["Chỉ cần bật HTTPS là đủ", "Dùng parameterized query / prepared statement", "Đổi tên bảng cho khó đoán", "Nối chuỗi input thật cẩn thận bằng dấu cộng"],
      answer: 1,
      explain: "Prepared statement coi input là DỮ LIỆU chứ không phải câu lệnh, nên mệnh đề như OR 1=1 không thể phá cấu trúc query.",
    },
    {
      q: "Vì sao mỗi user cần một salt riêng khi băm mật khẩu?",
      options: ["Để không cần dùng HTTPS nữa", "Để mật khẩu chiếm ít chỗ hơn khi lưu vào DB", "Để hai user cùng mật khẩu vẫn cho hash KHÁC nhau, vô hiệu hóa rainbow table", "Để quá trình đăng nhập chạy nhanh hơn"],
      answer: 2,
      explain: "Salt riêng khiến cùng một mật khẩu ra hash khác nhau → rainbow table (bảng tra hash dựng sẵn) trở nên vô dụng, và lộ một user không kéo theo lộ user khác.",
    },
  ],
}
