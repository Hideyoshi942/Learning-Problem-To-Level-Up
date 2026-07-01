export default {
  slug: 'recommendation',
  order: 30,
  title: 'Recommendation System',
  emoji: '⭐',
  description: 'Collaborative filtering, content-based, matrix factorization cho recommender.',
  project: 'Recommendation Engine.',
  problems: [
    { icon: '❄️', title: 'Khởi đầu lạnh (Cold Start)', desc: 'Xảy ra khi có người dùng mới hoặc sản phẩm mới gia nhập hệ thống. Do chưa có lịch sử tương tác, thuật toán không thể tính toán sự tương đồng để đề xuất.' },
    { icon: '🐌', title: 'Độ trễ tính toán thời gian thực (Real-time Latency)', desc: 'Khi hệ thống có hàng triệu sản phẩm và hàng triệu user, việc tính toán ma trận tương đồng (similarity matrix) trực tiếp trên mỗi request là bất khả thi.' },
    { icon: '🔄', title: 'Lệch pha dữ liệu (Training-Serving Skew)', desc: 'Mô hình ML được huấn luyện trên dữ liệu cũ (Offline), nhưng hành vi sở thích của người dùng thay đổi theo từng phút trên môi trường chạy thực tế (Online).' }
  ],
  concepts: [
    {
      name: 'Collaborative Filtering',
      icon: '👥',
      explain: 'Collaborative Filtering đưa ra recommendations dựa trên behavior của users tương tự. "Users who liked X also liked Y." 2 approaches: User-based CF (tìm users giống bạn, recommend những gì họ thích) và Item-based CF (tìm items tương tự những gì bạn đã thích). Amazon, Netflix dùng CF làm core.',
      tip: 'Item-based CF thường tốt hơn User-based vì: items ít thay đổi hơn users, similarity matrix có thể pre-compute. User-based CF tốt hơn cho new items (cold start).',
      example: '// Item-based Collaborative Filtering:\n// Similarity matrix (pre-computed offline):\n// item_similarity["Harry Potter"]["Lord of Rings"] = 0.87\n// item_similarity["Harry Potter"]["Narnia"] = 0.72\n\nasync function recommend(userId, limit = 10) {\n  // 1. Lấy items user đã rated:\n  const ratedItems = await db.getUserRatings(userId);\n\n  // 2. Tìm similar items cho mỗi rated item:\n  const candidates = new Map(); // itemId → score\n  for (const { itemId, rating } of ratedItems) {\n    const similar = await similarityStore.getTopN(itemId, 50);\n    similar.forEach(({ similarItemId, similarity }) => {\n      if (!ratedItems.find(r => r.itemId === similarItemId)) {\n        const score = (candidates.get(similarItemId) || 0) + similarity * rating;\n        candidates.set(similarItemId, score);\n      }\n    });\n  }\n\n  // 3. Sort và return top N:\n  return [...candidates.entries()]\n    .sort(([,a], [,b]) => b - a)\n    .slice(0, limit)\n    .map(([itemId]) => itemId);\n}',
    },
    {
      name: 'Content-Based',
      icon: '📋',
      explain: 'Content-Based Filtering recommend items tương tự những gì user đã thích, dựa trên features của items. Tạo user profile từ features của items đã rated. Recommend items có feature vector gần nhất với user profile. Không cần data từ users khác → không có cold start problem với items.',
      tip: 'Content-Based tốt khi: ít users, cần không phụ thuộc vào other users, cần explainability ("Vì bạn thích X, chúng tôi suggest Y"). Nhược điểm: chỉ recommend trong vùng comfort zone của user (filter bubble).',
      example: '// Content-Based Filtering:\n// Movie features: genre, director, actors, year\n\nfunction buildUserProfile(ratedMovies) {\n  // Average feature vector của movies user đã thích:\n  const profile = {};\n  ratedMovies\n    .filter(m => m.rating >= 4) // Only liked movies\n    .forEach(m => {\n      m.genres.forEach(g => profile[g] = (profile[g] || 0) + 1);\n    });\n  return normalizeVector(profile);\n}\n\nfunction cosineSimilarity(vecA, vecB) {\n  const dot = Object.keys(vecA).reduce((sum, k) =>\n    sum + (vecA[k] || 0) * (vecB[k] || 0), 0);\n  const magA = Math.sqrt(Object.values(vecA).reduce((s,v) => s+v*v, 0));\n  const magB = Math.sqrt(Object.values(vecB).reduce((s,v) => s+v*v, 0));\n  return dot / (magA * magB);\n}\n\nasync function recommend(userId) {\n  const profile = buildUserProfile(await getUserRatings(userId));\n  const allMovies = await getUnwatchedMovies(userId);\n  return allMovies\n    .map(movie => ({ movie, score: cosineSimilarity(profile, movie.features) }))\n    .sort((a, b) => b.score - a.score)\n    .slice(0, 10);\n}',
    },
    {
      name: 'Matrix Factorization',
      icon: '🔢',
      explain: 'Matrix Factorization (ALS, SVD) học latent factors từ user-item interaction matrix. Factorize matrix R (users×items) thành 2 matrices: U (users×factors) và V (items×factors). Predict rating = U[user] · V[item]. Factors học tự động represent hidden concepts (genres, styles). Netflix Prize winner dùng approach này.',
      tip: 'ALS (Alternating Least Squares) train hiệu quả với Spark MLlib cho large scale. SGD (Stochastic Gradient Descent) linh hoạt hơn. k=50-200 factors thường đủ. Regularization (lambda) quan trọng để tránh overfitting.',
      example: '// Matrix Factorization với SGD:\nclass MatrixFactorization {\n  constructor(numUsers, numItems, k = 50, lr = 0.01, reg = 0.1) {\n    // Random initialization:\n    this.U = randomMatrix(numUsers, k); // User factors\n    this.V = randomMatrix(numItems, k); // Item factors\n    this.lr = lr;\n    this.reg = reg;\n  }\n\n  predict(userId, itemId) {\n    return dotProduct(this.U[userId], this.V[itemId]);\n  }\n\n  train(ratings, epochs = 20) {\n    for (let e = 0; e < epochs; e++) {\n      shuffle(ratings).forEach(({ userId, itemId, rating }) => {\n        const pred = this.predict(userId, itemId);\n        const err = rating - pred;\n\n        // Update with gradient descent:\n        const uGrad = err * this.V[itemId].map(v => v) - this.reg * this.U[userId];\n        const vGrad = err * this.U[userId].map(v => v) - this.reg * this.V[itemId];\n        this.U[userId] = add(this.U[userId], scale(uGrad, this.lr));\n        this.V[itemId] = add(this.V[itemId], scale(vGrad, this.lr));\n      });\n    }\n  }\n}',
    },
    {
      name: 'Feature Store',
      icon: '🗄️',
      explain: 'Feature Store là centralized repository lưu trữ và serve features (input variables) cho ML models. Hai layers: Offline Store (historical features cho training – data warehouse) và Online Store (real-time features cho serving – Redis/DynamoDB). Đảm bảo training/serving parity: model training và inference dùng cùng feature definitions.',
      tip: 'Feature Store giải quyết "training-serving skew": features được compute khác nhau trong training vs inference → predictions sai. Feast, Tecton là open source Feature Stores. Uber Michelangelo là internal solution.',
      example: '// Feature Store pattern:\n// Offline (training):\nconst trainingFeatures = await offlineStore.getHistoricalFeatures(\n  entityDf,\n  featureRefs: [\n    "user_stats:avg_rating",\n    "user_stats:purchase_count_30d",\n    "item_stats:popularity_score"\n  ],\n  startDate: "2024-01-01",\n  endDate: "2024-06-01"\n);\nconst model = trainModel(trainingFeatures);\n\n// Online (inference, <10ms latency):\nasync function recommend(userId) {\n  const features = await onlineStore.getOnlineFeatures({\n    entityRows: [{ user_id: userId }],\n    featureRefs: ["user_stats:avg_rating", "user_stats:purchase_count_30d"]\n  });\n  return model.predict(features);\n}',
    },
    {
      name: 'A/B Testing',
      icon: '🧪',
      explain: 'A/B Testing trong recommendation system: test 2 (hay nhiều) recommendation algorithms trên real users để đo impact. Group A dùng algorithm cũ, Group B dùng algorithm mới. Đo metrics: CTR, conversion rate, session duration, revenue. Cần đủ sample size và statistical significance.',
      tip: 'Minimum sample size: dùng power analysis (thường 1000+ users mỗi variant). Test ít nhất 1-2 tuần để capture weekly patterns. Avoid novelty effect (users click mới vì lạ, không phải vì tốt hơn).',
      example: '// A/B Test assignment:\nasync function getRecommendations(userId) {\n  // Deterministic assignment (same user → same variant):\n  const variant = hash(`${userId}:experiment-rec-v2`) % 100 < 50\n    ? "control"\n    : "treatment";\n\n  // Log for analysis:\n  await analytics.log({ userId, experiment: "rec-v2", variant });\n\n  if (variant === "treatment") {\n    return newCollaborativeFilteringV2(userId);\n  }\n  return existingMatrixFactorization(userId);\n}\n\n// Statistical significance check (after collecting data):\n// control CTR: 3.2% (n=10,000)\n// treatment CTR: 3.8% (n=10,000)\n// p-value < 0.05 → statistically significant! Deploy treatment ✅',
    },
  ],
  demos: [
    {
      id: 'cosine-similarity',
      label: '👥 CF Cosine Similarity',
      language: 'javascript',
      code: `// Giả lập tính toán cosine similarity để tìm độ tương đồng sở thích giữa hai User
class CosineSimilarityCalculator {
  // Tính tích vô hướng của hai vector (Dot Product)
  dotProduct(vecA, vecB) {
    let product = 0;
    for (const key in vecA) {
      if (vecB[key] !== undefined) {
        product += vecA[key] * vecB[key];
      }
    }
    return product;
  }

  // Độ dài Euclid (Magnitude) của vector
  magnitude(vec) {
    let sum = 0;
    for (const key in vec) {
      sum += vec[key] * vec[key];
    }
    return Math.sqrt(sum);
  }

  // Tính độ tương đồng Cosine (Cosine Similarity)
  calcSimilarity(userA, userB) {
    const dot = this.dotProduct(userA, userB);
    const magA = this.magnitude(userA);
    const magB = this.magnitude(userB);

    if (magA === 0 || magB === 0) return 0;
    return parseFloat((dot / (magA * magB)).toFixed(4));
  }
}

// Bảng điểm đánh giá phim (Rating từ 1-5) của 3 người dùng đối với các phim:
// [Inception, Interstellar, Toy Story, Coco]
const users = {
  Alice: { inception: 5, interstellar: 4, toyStory: 1, coco: 2 },
  Bob: { inception: 4, interstellar: 5, toyStory: 2, coco: 1 },
  Charlie: { inception: 1, interstellar: 1, toyStory: 5, coco: 5 }
};

const calc = new CosineSimilarityCalculator();
const simAliceBob = calc.calcSimilarity(users.Alice, users.Bob);
const simAliceCharlie = calc.calcSimilarity(users.Alice, users.Charlie);

console.log('=== Phân Tích Độ Tương Đồng Giữa Các User (Collaborative Filtering) ===');
console.log(\`Alice và Bob: \${simAliceBob} (Sở thích phim Khoa học Viễn tưởng tương đồng cao 🚀)\`);
console.log(\`Alice và Charlie: \${simAliceCharlie} (Sở thích khác hẳn nhau, Charlie thích Hoạt hình 🧸)\`);`
    },
    {
      id: 'feature-store',
      label: '🗄️ Real-Time Feature Store',
      language: 'javascript',
      code: `// Giả lập Online Feature Store (Redis-like) cung cấp feature latency thấp cho ML Model
class OnlineFeatureStore {
  constructor() {
    this.store = new Map();
    // Nạp sẵn dữ liệu feature tính toán trước (Pre-computed features)
    this.store.set('user:u101', { avg_rating: 4.2, purchase_count_30d: 8 });
    this.store.set('item:movie_99', { popularity_score: 9.5, age_hours: 48 });
  }

  // Lấy feature cực nhanh phục vụ inference (<10ms)
  async getOnlineFeatures(userKey, itemKey) {
    const startTime = Date.now();
    
    // Giả lập đọc RAM nhanh
    const userFeatures = this.store.get(userKey) || {};
    const itemFeatures = this.store.get(itemKey) || {};

    const elapsed = Date.now() - startTime;
    return {
      latency: \`\${elapsed}ms\`,
      featureVector: {
        ...userFeatures,
        ...itemFeatures
      }
    };
  }
}

// Giả lập Recommendation Model dự báo CTR (Click-Through Rate)
class RecommendationModel {
  predict(features) {
    // Thuật toán chấm điểm dựa trên feature vector
    const score = features.avg_rating * 0.4 + 
                  features.purchase_count_30d * 0.1 + 
                  features.popularity_score * 0.5;
    return score;
  }
}

(async () => {
  const store = new OnlineFeatureStore();
  const model = new RecommendationModel();

  console.log('=== Lấy Features từ Online Store và chấm điểm đề xuất ===');
  const res = await store.getOnlineFeatures('user:u101', 'item:movie_99');
  
  console.log('Độ trễ truy xuất (Latency):', res.latency);
  console.log('Feature Vector nhận được:', res.featureVector);
  
  const score = model.predict(res.featureVector);
  console.log(\`🎯 Điểm dự đoán độ phù hợp của Movie_99 cho User_101: \${score.toFixed(2)}/10\`);
})();`
    }
  ],
  callouts: [
    { type: 'warning', icon: '⚠️', title: 'Đề phòng hiện tượng bong bóng bộ lọc (Filter Bubble)', body: 'Thuật toán Collaborative Filtering thuần túy có thể nhốt người dùng trong một "hộp kén" thông tin, chỉ đề xuất những gì họ đã xem. Hãy chèn thêm 5-10% các sản phẩm ngẫu nhiên mang tính khám phá (Exploration) để tạo sự mới mẻ.' },
    { type: 'success', icon: '🎯', title: 'Hệ thống lai (Hybrid System) tối ưu nhất', body: 'Hãy kết hợp Content-Based Filtering cho các sản phẩm mới (chưa có tương tác) và Collaborative Filtering cho các sản phẩm đã có lịch sử click để hạn chế tối đa điểm yếu Cold Start.' },
    { type: 'info', icon: '📊', title: 'Hiểu về Training-Serving Skew', body: 'Đây là hiện tượng lệch pha dữ liệu xảy ra khi code tính toán feature lúc huấn luyện (Offline) khác với code tính feature chạy trực tiếp (Online). Sử dụng Feature Store (e.g. Feast) là giải pháp tiêu chuẩn để giải quyết triệt để vấn đề này.' },
    { type: 'tip', icon: '⚡', title: 'Tính toán offline các ma trận tương đồng', body: 'Tính tương đồng (Similarity) giữa các sản phẩm (Item-item similarity) tốn rất nhiều tài nguyên. Hãy chạy tính toán này offline định kỳ (hàng ngày bằng Spark/BigQuery), lưu kết quả vào Redis để phục vụ truy vấn thời gian thực.' }
  ],
  quiz: [
    {
      q: 'Collaborative Filtering đưa ra đề xuất dựa trên cơ sở nào?',
      options: ['Dựa trên features của item như genre, director, actors', 'Dựa trên nội dung mô tả chi tiết của từng sản phẩm', 'Dựa trên behavior của những users tương tự (users thích X cũng thích Y)', 'Dựa trên số lượng links trỏ vào mỗi item'],
      answer: 2,
      explain: 'Collaborative Filtering khai thác hành vi của users tương tự: tìm người giống bạn hoặc item tương tự để đề xuất, đúng với ý tưởng users thích X cũng thích Y.',
    },
    {
      q: 'Nhược điểm chính của Content-Based Filtering là gì?',
      options: ['Cần rất nhiều dữ liệu tương tác từ những users khác', 'Không thể giải thích được lý do đưa ra đề xuất', 'Yêu cầu pre-compute một similarity matrix rất phức tạp', 'Chỉ đề xuất trong vùng comfort zone của user, gây filter bubble'],
      answer: 3,
      explain: 'Content-Based không có cold start với item và có explainability, nhưng nhược điểm là chỉ gợi ý quanh sở thích cũ của user, tạo filter bubble.',
    },
    {
      q: 'Matrix Factorization hoạt động theo nguyên lý nào?',
      options: ['Học latent factors bằng cách factorize user-item matrix thành hai ma trận U và V', 'Đếm số lượng từ khóa chung giữa các sản phẩm', 'Lưu trữ và serve features cho inference real-time', 'Chia traffic thành hai nhóm để so sánh thuật toán'],
      answer: 0,
      explain: 'Matrix Factorization phân rã ma trận tương tác R (users nhân items) thành U (users nhân factors) và V (items nhân factors), predict rating bằng tích vô hướng U[user] và V[item].',
    },
    {
      q: 'Feature Store được dùng để giải quyết vấn đề nào?',
      options: ['Cold start cho những user hoàn toàn mới', 'Training-serving skew, đảm bảo training và inference dùng cùng feature definitions', 'Filter bubble trong các đề xuất của hệ thống', 'Độ trễ cao của web crawler khi thu thập dữ liệu'],
      answer: 1,
      explain: 'Feature Store là kho tập trung với Offline Store và Online Store, đảm bảo training/serving parity nên loại bỏ được training-serving skew.',
    },
  ],
  challenge: {
    brief: 'Thiết kế một recommendation system như Netflix/YouTube: gợi ý cá nhân hoá cho hàng triệu user theo thời gian thực.',
    scale: ['100 triệu user hoạt động', '10 triệu item trong catalog', '1 tỷ tương tác (view/click)/ngày', 'p99 độ trễ gợi ý < 100ms'],
    requirements: [
      'Gợi ý cá nhân hoá dựa trên hành vi (collaborative filtering)',
      'Xử lý cold start cho user và item mới',
      'Phục vụ gợi ý real-time với độ trễ thấp',
      'Đảm bảo nhất quán feature giữa training và serving',
    ],
    steps: [
      { title: 'Capacity Estimation', prompt: 'Ước lượng QPS gợi ý, dung lượng interaction data và similarity matrix.', hint: '1 tỷ tương tác/ngày ≈ 11.500 ghi/s. Nếu mỗi user xem 5 trang/ngày → ~5.800 request gợi ý/s. Item-item similarity đầy đủ cho 10 triệu item là bất khả thi → chỉ giữ top-K (~100) mỗi item.' },
      { title: 'API Design', prompt: 'Định nghĩa endpoint lấy danh sách gợi ý và ghi nhận tương tác.', hint: 'GET /recommendations?userId=...&count=20 → 200 {items, modelVersion}. POST /events {userId, itemId, type} để log click/view làm dữ liệu train. Trả kèm lý do gợi ý phục vụ explainability.' },
      { title: 'Data Model', prompt: 'Thiết kế lưu trữ tương tác, embeddings và feature cho model.', hint: 'Interaction log (user, item, type, timestamp) trong data warehouse. User/item embeddings (vector k ≈ 50-200 chiều) từ matrix factorization. Feature store gồm Offline Store (train) và Online Store (serve, Redis/DynamoDB).' },
      { title: 'Retrieval & Ranking', prompt: 'Thiết kế kiến trúc 2 tầng: candidate generation và ranking cá nhân hoá.', hint: 'Tầng 1 (retrieval): CF hoặc ANN trên embeddings lấy vài trăm candidate thật nhanh. Tầng 2 (ranking): model nặng hơn dùng feature từ Online Store chấm điểm top-K. Cold start: dùng content-based hoặc popularity cho user/item mới.' },
      { title: 'Scale & Trade-offs', prompt: 'Cân bằng offline vs online serving và chống filter bubble.', hint: 'Tính offline similarity/embeddings hàng ngày bằng Spark, lưu Redis để serve real-time. Feature store chống training-serving skew. Chèn 5-10% item khám phá (exploration) chống filter bubble. Trade-off: model phức tạp (chính xác) vs độ trễ serving.' },
    ],
    rubric: [
      'Có ước lượng QPS gợi ý, dung lượng interaction và giới hạn similarity matrix',
      'API lấy gợi ý và ghi nhận tương tác rõ ràng',
      'Thiết kế được lưu trữ interaction, embeddings và feature store',
      'Tách được kiến trúc 2 tầng retrieval và ranking, có xử lý cold start',
      'Nêu trade-off offline vs online serving và chống filter bubble',
    ],
  },
}
