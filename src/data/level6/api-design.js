export default {
  slug: 'api-design',
  order: 31,
  title: 'API Design',
  emoji: '🔌',
  description: 'API Design la nghe thuat thiet ke hop dong (contract) giua client va server sao cho ro rang, nhat quan va de tien hoa. Nam vung REST resource, HTTP verb/status, idempotency, versioning va pagination giup API ben vung qua nhieu nam.',
  project: 'Thiet ke REST API cho mot cua hang thuong mai dien tu: quan ly products, orders va thanh toan.',
  problems: [
    { icon: '🎭', title: 'Verb lon xon', desc: 'Dung POST cho moi thu, status code luon la 200 ke ca khi loi khien client khong biet chuyen gi xay ra.' },
    { icon: '📦', title: 'Over-fetching', desc: 'Endpoint tra full object 20 field trong khi mobile chi can 3 field, ton bang thong va pin.' },
    { icon: '🧨', title: 'Breaking change', desc: 'Doi format response lam sap app cu vi API khong co chien luoc versioning.' },
  ],
  concepts: [
    {
      name: 'REST Resources & HTTP Verbs',
      icon: '🧩',
      explain: 'REST mo hinh hoa he thong thanh cac resource (danh tu so nhieu nhu /products, /orders) va dung HTTP verb de mo ta hanh dong len chung. GET de doc, POST de tao, PUT/PATCH de cap nhat, DELETE de xoa. Nguyen tac vang: URL chua danh tu, verb nam o HTTP method, tranh nhet dong tu vao URL kieu /getProduct hay /createOrder.',
      tip: 'Dung danh tu so nhieu va long resource theo quan he: GET /orders/42/items. PATCH cap nhat mot phan, PUT thay the toan bo. Tranh /api/doAction, hay map hanh dong ve resource hoac sub-resource.',
      example: '// TOT: danh tu + HTTP verb\nGET    /products          // list\nGET    /products/42       // chi tiet\nPOST   /products          // tao moi\nPUT    /products/42       // thay the toan bo\nPATCH  /products/42       // cap nhat mot phan\nDELETE /products/42       // xoa\n\n// TE: dong tu nhet vao URL\nPOST /getProduct?id=42\nPOST /createProduct\nPOST /deleteProductById',
    },
    {
      name: 'HTTP Status Codes',
      icon: '🚦',
      explain: 'Status code la tin hieu chuan cho client biet ket qua request. 2xx thanh cong (200 OK, 201 Created, 204 No Content), 3xx redirect (304 Not Modified), 4xx loi phia client (400, 401, 403, 404, 409, 422, 429), 5xx loi phia server (500, 503). Tra dung status giup client xu ly retry va hien thi loi chinh xac.',
      tip: 'Dung tra 200 kem field success:false — client se phai parse body moi biet loi. Dung 4xx cho loi client, 5xx cho loi server, va kem body loi theo chuan Problem Details (RFC 7807) voi type, title, status, detail.',
      example: '// Map status theo tinh huong\n201 Created      + Location: /orders/1001   // tao thanh cong\n204 No Content                              // DELETE ok, khong body\n400 Bad Request                             // input sai cu phap\n401 Unauthorized                            // chua dang nhap\n403 Forbidden                               // da login nhung khong co quyen\n404 Not Found                               // resource khong ton tai\n409 Conflict                                // trung du lieu / version lech\n422 Unprocessable Entity                     // validate that bai\n429 Too Many Requests                        // vuot rate limit\n\n// Error body chuan (RFC 7807 Problem Details)\n{\n  "type": "https://api.shop.vn/errors/out-of-stock",\n  "title": "Out of stock",\n  "status": 409,\n  "detail": "San pham 42 chi con 0 trong kho",\n  "instance": "/orders/1001"\n}',
    },
    {
      name: 'Idempotency (GET/PUT/DELETE vs POST)',
      icon: '🔁',
      explain: 'Mot method la idempotent neu goi 1 lan hay N lan cho ra cung mot trang thai server. GET (chi doc), PUT (ghi de cung gia tri), DELETE (xoa roi thi van la da xoa) la idempotent. POST khong idempotent vi moi lan goi thuong tao resource moi. Dieu nay quan trong khi client retry do timeout mang.',
      tip: 'Cho POST tao don hang hay thanh toan, dung Idempotency-Key header: server luu key + ket qua lan dau, cac lan retry cung key se tra lai ket qua cu thay vi tao trung. Day la cach Stripe chong double-charge.',
      example: '// Idempotent: goi lai KHONG doi trang thai\nPUT /products/42  { "price": 100 }   // goi 3 lan -> gia van la 100\nDELETE /products/42                   // goi 3 lan -> van la da xoa (404 tu lan 2)\n\n// KHONG idempotent: POST tao moi moi lan\nPOST /orders  { "item": 42 }          // goi 3 lan -> 3 don hang!\n\n// Fix: Idempotency-Key cho POST\nPOST /payments\nIdempotency-Key: 9f1c-uuid-abc\n{ "amount": 500 }\n// Server: neu key da thay -> tra ket qua cu, KHONG charge lai',
    },
    {
      name: 'API Versioning (URL vs Header)',
      icon: '🏷️',
      explain: 'Versioning cho phep API tien hoa ma khong lam sap client cu. Hai cach pho bien: version trong URL (/v1/products) — de thay, de cache, de route; hoac version trong header (Accept: application/vnd.shop.v2+json) — URL sach, dung tinh than REST nhung kho debug hon. Chon mot cach va giu nhat quan toan he thong.',
      tip: 'URL versioning pho bien nhat vi don gian va ai cung hieu. Chi tang major version khi co breaking change; them field moi la backward-compatible nen khong can version moi. Luon co chinh sach deprecation kem header Deprecation va Sunset.',
      example: '// Cach 1: version trong URL (pho bien nhat)\nGET /v1/products/42\nGET /v2/products/42     // v2 co the doi shape response\n\n// Cach 2: version trong header (URL sach)\nGET /products/42\nAccept: application/vnd.shop.v2+json\n\n// Bao truoc khi khai tu mot version\nHTTP/1.1 200 OK\nDeprecation: true\nSunset: Wed, 31 Dec 2026 23:59:59 GMT\nLink: </v2/products/42>; rel="successor-version"',
    },
    {
      name: 'Pagination (Offset vs Cursor)',
      icon: '📄',
      explain: 'Khong bao gio tra ve toan bo list — luon phan trang. Offset pagination (?limit=20&offset=40) don gian, nhay trang tuy y duoc, nhung cham khi offset lon va bi lap/nhay dong khi co insert xen vao. Cursor pagination (?limit=20&cursor=abc) dung con tro toi ban ghi cuoi, on dinh khi data thay doi va nhanh voi dataset lon, nhung chi di tien/lui tuan tu.',
      tip: 'Offset hop cho admin table nho can nhay trang. Cursor la chuan cho infinite scroll va feed lon (Twitter, Slack deu dung cursor). Tra kem metadata: next_cursor va has_more de client biet con data khong.',
      example: '// Offset: de lech khi co insert\nGET /products?limit=3&offset=0   // A, B, C\n// (co nguoi them X len dau list)\nGET /products?limit=3&offset=3   // C lap lai! (bi day xuong)\n\n// Cursor: neo theo id ban ghi cuoi -> on dinh\nGET /products?limit=3\n{ "data": [A, B, C], "next_cursor": "id_C", "has_more": true }\nGET /products?limit=3&cursor=id_C  // luon tiep sau C, khong lap',
    },
    {
      name: 'REST vs gRPC vs GraphQL',
      icon: '🔀',
      explain: 'Ba style API cho ba nhu cau khac nhau. REST don gian, cache tot qua HTTP, hop public API nhung de over-fetch (tra du field) va under-fetch (phai goi nhieu endpoint). GraphQL cho client chon dung field can trong 1 query — het over/under-fetching — nhung caching va rate-limit phuc tap hon. gRPC dung Protobuf nhi phan tren HTTP/2, cuc nhanh va type-safe, ly tuong cho giao tiep service-to-service noi bo.',
      tip: 'Public API cho ben thu ba: chon REST. App phuc tap nhieu man hinh can data linh hoat: chon GraphQL. Microservice noi bo can throughput cao: chon gRPC. Nhieu he thong lon dung ket hop ca ba.',
      example: '// REST: over-fetch (tra ca 20 field du chi can 2)\nGET /users/1\n{ "id":1, "name":"An", "email":"...", "address":"...", ... 20 field }\n\n// GraphQL: client chon dung field can\nquery { user(id:1) { name email } }\n{ "data": { "user": { "name":"An", "email":"..." } } }\n\n// gRPC: dinh nghia service bang Protobuf (nhi phan, HTTP/2)\nservice UserService {\n  rpc GetUser (UserRequest) returns (UserReply);\n}',
    },
  ],
  demos: [
    {
      id: 'over-fetch',
      label: '📦 Over-fetch: REST vs GraphQL',
      language: 'javascript',
      code: `// Over-fetching: REST tra full object, GraphQL chi tra field client can
// Gia lap 1 user co 20 field, moi field ~ 25 bytes

var TOTAL_FIELDS = 20;
var BYTES_PER_FIELD = 25;

// Client mobile that su chi can 3 field
var needed = ['id', 'name', 'avatar'];

// REST: endpoint tra HET 20 field
var restFields = TOTAL_FIELDS;
var restBytes = restFields * BYTES_PER_FIELD;

// GraphQL: chi tra dung so field client chon
var gqlFields = needed.length;
var gqlBytes = gqlFields * BYTES_PER_FIELD;

console.log('Client that su can :', gqlFields, 'field ->', needed.join(', '));
console.log('');
console.log('REST    tra ve :', restFields, 'field =', restBytes, 'bytes');
console.log('GraphQL tra ve :', gqlFields, 'field =', gqlBytes, 'bytes');
console.log('');

var wasted = restFields - gqlFields;
var pct = Math.round((wasted / restFields) * 100);
console.log('Over-fetch :', wasted, 'field thua (' + pct + '% lang phi)');
console.log('GraphQL tiet kiem :', restBytes - gqlBytes, 'bytes moi request');

// Tren 100k request/ngay
var perDay = 100000;
var savedKB = Math.round(((restBytes - gqlBytes) * perDay) / 1024);
console.log('');
console.log('Tren', perDay, 'request/ngay -> tiet kiem ~', savedKB, 'KB');`,
    },
    {
      id: 'idempotency',
      label: '🔁 Idempotency cua HTTP methods',
      language: 'javascript',
      code: `// Idempotency: goi lai nhieu lan co lam doi trang thai server khong?
// GET/PUT/DELETE idempotent (khong doi) vs POST (tao moi moi lan)

// Kho du lieu gia lap
var product = { id: 42, price: 100 };
var orders = [];        // moi POST se them 1 don
var orderSeq = 0;

function callGET() { return product.price; }                    // chi doc
function callPUT(p) { product.price = p; return product.price; } // ghi de cung gia tri
function callDELETE() { product.deleted = true; return 'deleted'; }
function callPOST() { orderSeq++; orders.push({ id: orderSeq }); return orders.length; }

console.log('Goi moi method 3 lan lien tiep (gia lap client retry):');
console.log('');
console.log('GET     x3 -> price:', callGET(), callGET(), callGET(), '(khong doi -> idempotent)');
console.log('PUT 100 x3 -> price:', callPUT(100), callPUT(100), callPUT(100), '(khong doi -> idempotent)');
console.log('DELETE  x3 -> state:', callDELETE(), callDELETE(), callDELETE(), '(van deleted -> idempotent)');
console.log('POST    x3 -> so don:', callPOST(), callPOST(), callPOST(), '(tang moi lan -> KHONG idempotent!)');
console.log('');
console.log('Tong don tao ra sau 3 POST:', orders.length, '-> 3 don TRUNG do retry!');
console.log('Fix: dung Idempotency-Key de POST an toan khi retry.');`,
    },
    {
      id: 'pagination',
      label: '📄 Cursor vs Offset khi co insert',
      language: 'javascript',
      code: `// Pagination: chuyen gi xay ra khi co INSERT xen vao giua cac lan goi trang?
// page size = 3, list moi nhat o dau, id giam dan

var SIZE = 3;

// --- OFFSET pagination ---
var list = [
  { id: 50 }, { id: 49 }, { id: 48 },
  { id: 47 }, { id: 46 }, { id: 45 },
];
function offsetPage(data, offset) {
  var out = [];
  for (var i = offset; i < offset + SIZE && i < data.length; i++) out.push(data[i].id);
  return out;
}

console.log('=== OFFSET (limit=3) ===');
console.log('Trang 1 (offset 0):', offsetPage(list, 0).join(', '));
list.unshift({ id: 51 });   // co nguoi INSERT id=51 len DAU list
console.log('(insert id=51 len dau list)');
console.log('Trang 2 (offset 3):', offsetPage(list, 3).join(', '));
console.log('-> 48 BI LAP lai vi moi thu bi day xuong 1 o!');
console.log('');

// --- CURSOR pagination ---
var list2 = [
  { id: 50 }, { id: 49 }, { id: 48 },
  { id: 47 }, { id: 46 }, { id: 45 },
];
function cursorPage(data, afterId) {
  var out = [];
  var started = afterId === null;
  for (var i = 0; i < data.length; i++) {
    if (started) { out.push(data[i].id); if (out.length === SIZE) break; }
    if (data[i].id === afterId) started = true;
  }
  return out;
}

console.log('=== CURSOR (limit=3) ===');
var c1 = cursorPage(list2, null);
console.log('Trang 1:', c1.join(', '), '-> next_cursor = id', c1[c1.length - 1]);
list2.unshift({ id: 51 });   // cung insert id=51 len dau
console.log('(insert id=51 len dau list)');
console.log('Trang 2 (cursor=48):', cursorPage(list2, 48).join(', '));
console.log('-> On dinh! Khong lap, khong nhay du co insert.');`,
    },
  ],
  interactive: {
    title: '🔌 Over-fetch: REST full object vs GraphQL chon field',
    inputLabel: 'So field client THUC SU can (tren tong 20 field)',
    inputPlaceholder: '3',
    inputType: 'number',
    run(value) {
      const TOTAL = 20
      const BYTES = 25
      let need = Math.round(parseFloat(value) || 0)
      need = Math.min(Math.max(need, 0), TOTAL)
      const restBytes = TOTAL * BYTES
      const gqlBytes = need * BYTES
      const wasted = TOTAL - need
      const pct = Math.round((wasted / TOTAL) * 100)
      const perDay = 100000
      const savedMB = (((restBytes - gqlBytes) * perDay) / (1024 * 1024)).toFixed(2)
      return [
        `Tong object co ${TOTAL} field, moi field ~ ${BYTES} bytes`,
        ``,
        `REST    tra ve : ${TOTAL} field = ${restBytes} bytes/request`,
        `GraphQL tra ve : ${need} field = ${gqlBytes} bytes/request`,
        ``,
        `Over-fetch : ${wasted} field thua = ${pct}% lang phi`,
        `GraphQL tiet kiem : ${restBytes - gqlBytes} bytes moi request`,
        ``,
        `Tren ${perDay.toLocaleString()} request/ngay -> tiet kiem ~ ${savedMB} MB`,
        ``,
        pct >= 70
          ? '⚠️  Over-fetch rat cao -> can nhac GraphQL hoac sparse fieldset (?fields=...)'
          : pct >= 30
            ? '👍 Over-fetch vua phai -> co the toi uu them.'
            : '✅ Client dung gan het field -> REST full object hoan toan ok.',
      ].join('\n')
    },
  },
  callouts: [
    { type: 'success', icon: '🧩', title: 'Noun trong URL, verb trong method', body: 'Thiet ke resource la danh tu so nhieu, dung HTTP verb cho hanh dong. URL sach + verb chuan giup API tu mo ta va de doan.' },
    { type: 'info', icon: '⏳', title: 'Rate-limit headers', body: 'Tra kem X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset va Retry-After khi 429 de client biet con bao nhieu quota va khi nao thu lai.' },
    { type: 'danger', icon: '🧨', title: 'Dung tra 200 cho loi', body: 'Tra ve 200 kem success:false khien client phai parse body moi biet loi. Hay dung dung 4xx/5xx + body Problem Details (RFC 7807).' },
  ],
  quiz: [
    {
      q: "Nhung HTTP method nao la idempotent (goi N lan cho cung trang thai)?",
      options: ["POST va PATCH", "Chi GET", "GET, PUT va DELETE", "Tat ca method deu idempotent"],
      answer: 2,
      explain: "GET chi doc, PUT ghi de cung gia tri, DELETE xoa roi van la da xoa -> goi N lan cho cung trang thai. POST tao moi moi lan nen KHONG idempotent.",
    },
    {
      q: "Van de cua offset pagination khi co insert xen vao giua cac lan goi trang?",
      options: ["Ban ghi co the bi lap lai hoac nhay do moi thu bi day xuong", "Server bao gio cung tra sai status code", "Khong the gioi han so ban ghi moi trang", "Cursor va offset luon cho ket qua giong het nhau"],
      answer: 0,
      explain: "Insert len dau list lam moi phan tu day xuong -> trang sau lap lai ban ghi da thay o trang truoc. Cursor neo theo id ban ghi cuoi nen on dinh hon.",
    },
    {
      q: "Client chi can 3/20 field nhung REST tra het 20 field. Day la van de gi va cach giai quyet triet de?",
      options: ["Under-fetching, giai quyet bang cache", "Rate limiting, giai quyet bang retry", "N+1 query, giai quyet bang JOIN", "Over-fetching, GraphQL cho phep chon dung field can"],
      answer: 3,
      explain: "Tra du field so voi nhu cau la over-fetching. GraphQL cho client khai bao dung field can trong 1 query nen loai bo over/under-fetching.",
    },
    {
      q: "Tao don hang bang POST, client bi timeout va retry. Lam sao tranh tao don trung?",
      options: ["Doi POST thanh GET cho an toan", "Dung Idempotency-Key: server nho ket qua lan dau, retry cung key tra lai ket qua cu", "Luon tra 200 OK de client khong retry", "Tang timeout len that lon"],
      answer: 1,
      explain: "POST khong idempotent nen retry co the tao don trung. Idempotency-Key cho phep server nhan dien request lap va tra ket qua da luu thay vi tao moi.",
    },
  ],
}
