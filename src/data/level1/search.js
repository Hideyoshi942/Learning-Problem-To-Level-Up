export default {
  slug: 'search',
  order: 2,
  title: 'Search',
  emoji: '🔍',
  description: 'Xây dựng tính năng tìm kiếm hiệu quả là bài toán core. Từ prefix search đến full-text search với ranking, mỗi cách tiếp cận có ưu/nhược điểm riêng.',
  project: 'Xây dựng website thương mại điện tử có tìm kiếm sản phẩm.',
  problems: [
    { icon: '🔤', title: 'Prefix Search', desc: 'Gõ "app" → gợi ý "apple", "application". Cần Trie data structure.' },
    { icon: '📝', title: 'Full Text Search', desc: 'Tìm kiếm toàn văn bản, match từ bất kỳ trong câu. Cần Inverted Index.' },
    { icon: '🌀', title: 'Fuzzy Search', desc: 'Chịu được lỗi chính tả: "appel" → "apple". Dùng Edit Distance.' },
    { icon: '⭐', title: 'Ranking', desc: 'Sắp xếp kết quả theo độ liên quan. TF-IDF, BM25 là thuật toán phổ biến.' },
  ],
  concepts: [
    {
      name: 'Trie',
      icon: '🌲',
      explain: 'Trie (Prefix Tree) là cấu trúc cây nơi mỗi node đại diện cho một ký tự. Insert và search đều O(m) với m là độ dài từ. Rất hiệu quả cho autocomplete, không phụ thuộc vào số lượng từ trong từ điển.',
      tip: 'Trie tốn nhiều memory (mỗi node có array 26 ký tự). Dùng Compressed Trie (Radix Tree) để tiết kiệm memory.',
      example: 'const trie = new Trie();\n["apple","apply","apt","banana"].forEach(w => trie.insert(w));\n\ntrie.search("app");\n// → ["apple", "apply"]  ✅ O(3) = O(len("app"))\n\n// SQL LIKE \'app%\' → O(n) full scan ❌',
    },
    {
      name: 'Inverted Index',
      icon: '📑',
      explain: 'Inverted Index là cấu trúc ánh xạ từ term → danh sách documents chứa term đó (posting list). Đây là cơ chế cốt lõi của mọi search engine (Elasticsearch, Lucene). Cho phép tìm kiếm full-text cực nhanh.',
      tip: 'Inverted index được build offline (batch) hoặc real-time khi index document. Merge posting lists với AND/OR để xử lý multi-term query.',
      example: '// Inverted index structure:\n{\n  "javascript": [docId:1, docId:2, docId:5],\n  "backend":    [docId:1, docId:3],\n  "database":   [docId:3, docId:4]\n}\n\n// Query "javascript AND backend"\n// → intersect([1,2,5], [1,3]) = [1] ✅',
    },
    {
      name: 'TF-IDF',
      icon: '📊',
      explain: 'TF-IDF (Term Frequency – Inverse Document Frequency) là score đánh giá độ quan trọng của một từ trong document. TF = tần suất từ trong doc. IDF = log(N/df) penalize từ phổ biến (the, a, is). Score = TF × IDF.',
      tip: 'Từ xuất hiện nhiều trong doc nhưng hiếm trong corpus → score cao. Từ phổ biến (stop words) có IDF thấp → bị penalize tự nhiên.',
      example: '// TF-IDF example:\n// Corpus: 1000 docs, "javascript" có trong 50 docs\n// IDF("javascript") = log(1000/50) = 2.99\n\n// Doc A: "javascript" xuất hiện 5 lần / 100 words\n// TF = 5/100 = 0.05\n// TF-IDF = 0.05 × 2.99 = 0.15\n\n// Doc B: "javascript" xuất hiện 1 lần / 200 words\n// TF-IDF = (1/200) × 2.99 = 0.015 → thấp hơn',
    },
    {
      name: 'BM25',
      icon: '🎯',
      explain: 'BM25 (Best Match 25) là thuật toán ranking tốt hơn TF-IDF, hiện là default của Elasticsearch và Lucene. BM25 xử lý term saturation (TF cao quá không có ích) và chuẩn hóa theo độ dài document.',
      tip: 'BM25 có 2 tham số: k1 (term saturation, default 1.2) và b (doc length normalization, default 0.75). Elasticsearch cho phép tune chúng.',
      example: '// BM25 vs TF-IDF:\n// "javascript" xuất hiện 10 lần vs 1 lần:\n\n// TF-IDF: score tăng tuyến tính (10x)\n// BM25:   score tăng chậm dần (saturation)\n//         TF đã trên ngưỡng → thêm nữa không tăng score\n\n// → BM25 chính xác hơn trong thực tế\n// Elasticsearch uses BM25 by default since v5',
    },
    {
      name: 'Edit Distance',
      icon: '✏️',
      explain: 'Edit Distance (Khoảng cách chỉnh sửa) là số phép biến đổi tối thiểu (insert, delete, replace) để chuyển string A thành string B. Nền tảng của fuzzy search, spell correction, và DNA alignment.',
      tip: 'Levenshtein Distance O(m×n) DP. BK-Tree giúp fuzzy search nhanh hơn O(n) brute force. Threshold thường là 1-2 cho spell check.',
      example: '// Edit distance("kitten", "sitting") = 3\n// k→s (replace)  = 1 op\n// e→i (replace)  = 1 op\n// →g  (insert)   = 1 op\n\n// Fuzzy search threshold:\ndist("aple", "apple") = 1  → suggest ✅\ndist("xyz",  "apple") = 5  → no match ❌',
    },
    {
      name: 'Levenshtein',
      icon: '🔤',
      explain: 'Levenshtein Distance là loại Edit Distance phổ biến nhất. Dùng Dynamic Programming với bảng DP[m+1][n+1]. DP[i][j] = edit distance giữa s1[0..i] và s2[0..j]. Complexity: O(m×n) time và space.',
      tip: 'Tối ưu space với sliding window (chỉ cần 2 rows), giảm xuống O(min(m,n)) space. Với short strings, thường đủ nhanh cho real-time.',
      example: '//     ""  s  i  t  t  i  n  g\n// ""   0  1  2  3  4  5  6  7\n// k    1  1  2  3  4  5  6  7\n// i    2  2  1  2  3  4  5  6\n// t    3  3  2  1  2  3  4  5\n// t    4  4  3  2  1  2  3  4\n// e    5  5  4  3  2  2  3  4\n// n    6  6  5  4  3  3  2  3\n//\n// Answer: DP[6][7] = 3',
    },
    {
      name: 'Elasticsearch',
      icon: '🔭',
      explain: 'Elasticsearch là distributed search engine built on Lucene. Index document dạng JSON, tự động phân tích text (tokenize, stemming, stop words). Hỗ trợ full-text search, aggregation, geo search, và real-time analytics.',
      tip: 'Elasticsearch không phải database chính – dùng song song với DB. Sync data từ DB → ES qua CDC (Change Data Capture) hoặc Dual Write.',
      example: '// Index một document:\nPUT /products/_doc/1\n{ "name": "iPhone 15", "brand": "Apple" }\n\n// Full-text search:\nGET /products/_search\n{ "query": { "match": { "name": "iphone" } } }\n\n// Fuzzy search (chịu typo):\n{ "query": { "fuzzy": { "name": {\n  "value": "iphon", "fuzziness": 1 } } } }',
    },
    {
      name: 'n-gram',
      icon: '🔗',
      explain: 'N-gram là chuỗi n ký tự/từ liên tiếp. Bigram (n=2), Trigram (n=3). Dùng để tìm kiếm substring, typo-tolerant search, và language modeling. Elasticsearch dùng edge n-gram cho autocomplete.',
      tip: 'Edge n-gram đặc biệt hữu ích cho autocomplete: "appl" → ["a","ap","app","appl"]. N-gram nhỏ tăng recall nhưng giảm precision.',
      example: '// Trigrams của "apple":\n// "app", "ppl", "ple"\n\n// n-gram search "appl" → "apple" ✅\n// vì có chung trigram "app"\n\n// Elasticsearch edge n-gram:\n"apple" → ["a","ap","app","appl","apple"]\n// → gõ "app" → match "apple" ngay lập tức',
    },
  ],
  demos: [
    {
      id: 'trie',
      label: '🌲 Trie – Prefix Search',
      language: 'javascript',
      code: `// TRIE – O(m) prefix search, m = độ dài prefix

class TrieNode {
  constructor() {
    this.children = {};
    this.isEnd = false;
    this.word = null;
  }
}

class Trie {
  constructor() { this.root = new TrieNode(); }

  insert(word) {
    let node = this.root;
    for (const ch of word.toLowerCase()) {
      if (!node.children[ch]) node.children[ch] = new TrieNode();
      node = node.children[ch];
    }
    node.isEnd = true;
    node.word = word;
  }

  search(prefix) {
    let node = this.root;
    for (const ch of prefix.toLowerCase()) {
      if (!node.children[ch]) return [];
      node = node.children[ch];
    }
    return this._collect(node, []);
  }

  _collect(node, res) {
    if (node.isEnd) res.push(node.word);
    for (const child of Object.values(node.children))
      this._collect(child, res);
    return res;
  }
}

// --- DEMO ---
const trie = new Trie();
['apple','application','apply','apt','banana','band','bandwidth',
 'react','reactive','reactivity','node','nodejs','javascript','java','jest']
  .forEach(w => trie.insert(w));

console.log('=== Trie Prefix Search ===\\n');
for (const p of ['app','ban','react','java']) {
  const r = trie.search(p);
  console.log(\`"\${p}" → [\${r.join(', ')}]\`);
}
console.log('\\n⏱️  O(m) – m là độ dài prefix, không phụ thuộc số từ!');`,
    },
    {
      id: 'inverted-index',
      label: '📑 Inverted Index',
      language: 'javascript',
      code: `// INVERTED INDEX – Cơ chế của Elasticsearch/Lucene
// term → posting list [docId1, docId2, ...]

class InvertedIndex {
  constructor() {
    this.index = new Map();   // term → Set<docId>
    this.docs = new Map();    // docId → text
    this.tf = new Map();      // "docId:term" → count
  }

  add(id, text) {
    this.docs.set(id, text);
    const tokens = this._tokenize(text);
    for (const t of tokens) {
      if (!this.index.has(t)) this.index.set(t, new Set());
      this.index.get(t).add(id);
      const k = \`\${id}:\${t}\`;
      this.tf.set(k, (this.tf.get(k) || 0) + 1);
    }
  }

  search(query) {
    const terms = this._tokenize(query);
    if (!terms.length) return [];
    let hits = null;
    for (const t of terms) {
      const posting = this.index.get(t) || new Set();
      hits = hits === null ? new Set(posting)
        : new Set([...hits].filter(id => posting.has(id)));
    }
    return [...(hits || [])].map(id => ({
      id,
      score: terms.reduce((s, t) => s + (this.tf.get(\`\${id}:\${t}\`) || 0), 0),
      text: this.docs.get(id),
    })).sort((a, b) => b.score - a.score);
  }

  _tokenize(text) {
    return text.toLowerCase().replace(/[^a-z0-9\\s]/g, '').split(/\\s+/).filter(Boolean);
  }
}

// --- DEMO ---
const idx = new InvertedIndex();
[
  [1, 'Node.js là runtime JavaScript cho backend development'],
  [2, 'JavaScript là ngôn ngữ lập trình phổ biến nhất'],
  [3, 'Backend development cần hiểu database và caching'],
  [4, 'Redis là in-memory database dùng cho caching'],
  [5, 'Elasticsearch dùng inverted index cho full text search'],
].forEach(([id, text]) => idx.add(id, text));

console.log('=== Inverted Index Full-Text Search ===\\n');
for (const q of ['javascript backend', 'database caching']) {
  console.log(\`Query: "\${q}"\`);
  idx.search(q).forEach(r =>
    console.log(\`  [score=\${r.score}] Doc\${r.id}: \${r.text}\`)
  );
  console.log();
}`,
    },
    {
      id: 'fuzzy',
      label: '🌀 Fuzzy – Edit Distance',
      language: 'javascript',
      code: `// LEVENSHTEIN DISTANCE – đo số phép biến đổi tối thiểu
// insert, delete, replace để biến s1 → s2

function levenshtein(s1, s2) {
  const m = s1.length, n = s2.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = s1[i-1] === s2[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function fuzzySearch(query, dict, maxDist = 2) {
  return dict
    .map(w => ({ word: w, dist: levenshtein(query.toLowerCase(), w.toLowerCase()) }))
    .filter(r => r.dist <= maxDist)
    .sort((a, b) => a.dist - b.dist);
}

// --- DEMO ---
const dict = ['apple','application','apply','orange','arrange','angle',
  'javascript','java','jest','python','pandas','database','datastore'];

const typos = ['aple', 'javscript', 'pyhon', 'databas'];
console.log('=== Fuzzy Search (max edit distance = 2) ===\\n');
for (const t of typos) {
  const r = fuzzySearch(t, dict);
  console.log(\`"\${t}" → [\${r.map(x => \`\${x.word}(d=\${x.dist})\`).join(', ')}]\`);
}

console.log('\\n--- Edit distance "kitten" → "sitting" ---');
console.log(\`distance = \${levenshtein('kitten','sitting')} operations\`);`,
    },
  ],
  interactive: {
    title: '🌲 Thử Trie: nhập prefix để tìm kiếm',
    inputLabel: 'Gõ prefix',
    inputPlaceholder: 'app, java, react...',
    inputType: 'text',
    run(value) {
      const prefix = (value || '').toLowerCase().trim()
      if (!prefix) return 'Nhập prefix để tìm kiếm!'
      const words = ['apple','application','apply','apt','appetizer','banana','band','bandwidth','react','reactive','reactivity','node','nodejs','javascript','java','jest','python','pandas','docker','database','datastore']
      const matches = words.filter(w => w.startsWith(prefix))
      return [
        `🔍 Prefix: "${prefix}"`,
        ``,
        matches.length > 0
          ? `✅ ${matches.length} kết quả: [${matches.join(', ')}]`
          : `❌ Không tìm thấy từ nào`,
        ``,
        `⏱️  Trie: O(${prefix.length}) – chỉ traverse ${prefix.length} node`,
        `   SQL LIKE '%${prefix}%': O(n) – phải scan toàn bộ`,
      ].join('\n')
    },
  },
  callouts: [
    { type: 'success', icon: '🌲', title: 'Trie', body: 'Prefix search O(m). Phù hợp autocomplete, IP routing. Tốn memory O(alphabet × max_len × n).' },
    { type: 'info', icon: '📑', title: 'Inverted Index', body: 'Full-text search. Elasticsearch/Lucene dùng cách này. Rất nhanh cho OR/AND queries.' },
    { type: 'warning', icon: '🌀', title: 'Fuzzy Search', body: 'Levenshtein O(m×n). Dùng khi cần chịu typo. Nên kết hợp với BK-Tree để tăng tốc.' },
  ],
  quiz: [
    {
      q: 'Trie (Prefix Tree) có độ phức tạp tìm kiếm prefix là bao nhiêu, với m là độ dài từ?',
      options: [
        'O(n) với n là số từ trong từ điển',
        'O(n log n)',
        'O(m), không phụ thuộc số lượng từ',
        'O(m × n)',
      ],
      answer: 2,
      explain: 'Trie search chỉ traverse theo từng ký tự của prefix nên là O(m) với m là độ dài từ, hoàn toàn không phụ thuộc vào số lượng từ trong từ điển.',
    },
    {
      q: 'Inverted Index ánh xạ dữ liệu theo hướng nào?',
      options: [
        'Từ term đến danh sách documents chứa term đó (posting list)',
        'Từ document đến danh sách các từ trong đó',
        'Từ ký tự đến các node con trong cây',
        'Từ query đến kết quả đã cache',
      ],
      answer: 0,
      explain: 'Inverted Index ánh xạ term đến posting list (danh sách docId chứa term). Đây là cơ chế cốt lõi của Elasticsearch và Lucene, cho phép merge posting list với AND/OR rất nhanh.',
    },
    {
      q: 'BM25 khác TF-IDF chủ yếu ở điểm nào?',
      options: [
        'BM25 không cần inverted index',
        'BM25 chỉ hoạt động trên số, không trên text',
        'BM25 luôn cho score tăng tuyến tính theo tần suất từ',
        'BM25 xử lý term saturation và chuẩn hóa theo độ dài document',
      ],
      answer: 3,
      explain: 'BM25 xử lý term saturation (TF cao quá thì thêm nữa cũng không tăng score nhiều) và chuẩn hóa theo độ dài document, nên chính xác hơn TF-IDF vốn tăng tuyến tính.',
    },
    {
      q: 'Edit Distance (Levenshtein) giữa kitten và sitting bằng bao nhiêu?',
      options: [
        '1',
        '3',
        '5',
        '7',
      ],
      answer: 1,
      explain: 'Cần 3 phép biến đổi: k→s (replace), e→i (replace), và thêm g (insert). Do đó edit distance bằng 3.',
    },
  ],
  exercises: [
    {
      id: 'rank-desc-order',
      title: 'Sửa thứ tự ranking kết quả tìm kiếm',
      task: 'Kết quả tìm kiếm đang được sắp xếp TĂNG dần theo score (số lần khớp từ khóa), nên document liên quan nhất lại nằm cuối. Hãy sửa để sắp xếp GIẢM dần, document điểm cao nhất lên đầu. Output kỳ vọng: Doc2 (score 2) đứng trước Doc1 (score 1).',
      buggyCode: `// Đếm số lần từ khóa xuất hiện (term frequency) rồi xếp hạng
var docs = [
  { id: 1, text: 'javascript backend node' },
  { id: 2, text: 'javascript javascript frontend' },
  { id: 3, text: 'python backend' },
];
var query = 'javascript';

function score(text, q) {
  var words = text.split(' ');
  var c = 0;
  for (var i = 0; i < words.length; i++) if (words[i] === q) c++;
  return c;
}

var results = [];
for (var i = 0; i < docs.length; i++) {
  var s = score(docs[i].text, query);
  if (s > 0) results.push({ id: docs[i].id, score: s });
}

// BUG: sắp xếp TĂNG dần -> doc liên quan nhất bị xuống cuối
results.sort(function(a, b) { return a.score - b.score; });

results.forEach(function(r) { console.log('Doc' + r.id + ' score=' + r.score); });`,
      expectedOutput: 'Doc2 score=2\nDoc1 score=1',
      hint: 'Để xếp GIẢM dần theo score, đổi comparator thành b.score - a.score.',
      solution: `var docs = [
  { id: 1, text: 'javascript backend node' },
  { id: 2, text: 'javascript javascript frontend' },
  { id: 3, text: 'python backend' },
];
var query = 'javascript';

function score(text, q) {
  var words = text.split(' ');
  var c = 0;
  for (var i = 0; i < words.length; i++) if (words[i] === q) c++;
  return c;
}

var results = [];
for (var i = 0; i < docs.length; i++) {
  var s = score(docs[i].text, query);
  if (s > 0) results.push({ id: docs[i].id, score: s });
}

// FIX: sắp xếp GIẢM dần theo score
results.sort(function(a, b) { return b.score - a.score; });

results.forEach(function(r) { console.log('Doc' + r.id + ' score=' + r.score); });`,
    },
  ],
}
