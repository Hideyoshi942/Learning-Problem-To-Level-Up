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
  concepts: ['Trie', 'Inverted Index', 'TF-IDF', 'BM25', 'Edit Distance', 'Levenshtein', 'Elasticsearch', 'n-gram'],
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
}
