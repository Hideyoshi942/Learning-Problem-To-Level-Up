export default {
  slug: 'news-feed',
  order: 23,
  title: 'News Feed',
  emoji: '📰',
  description: 'Fan-out on Write vs Fan-out on Read cho social media feed.',
  project: 'Social Network.',
  problems: [
    { icon: '🌟', title: 'Bài toán Người Nổi Tiếng (Celebrity Problem)', desc: 'Khi một tài khoản có 100M người theo dõi đăng bài, việc nhân bản bài viết vào 100M hộp thư (Push) sẽ làm sập hàng loạt server ghi.' },
    { icon: '💾', title: 'Bộ nhớ phình to nhanh chóng (Storage Bloat)', desc: 'Lưu trữ feed riêng cho hàng trăm triệu người dùng hoạt động sẽ ngốn hàng petabytes RAM nếu giữ quá nhiều bài viết cũ trong cache.' },
    { icon: '🔄', title: ' OFFSET gây trùng/lọt tin (Pagination Issue)', desc: 'Trong lúc người dùng lướt feed (Infinite Scroll) dùng OFFSET, nếu có bài đăng mới chen vào, các trang sau sẽ bị lặp lại hoặc bỏ sót bài viết.' }
  ],
  concepts: [
    {
      name: 'Fan-out on Write',
      icon: '✍️',
      explain: 'Fan-out on Write (Push Model): khi user đăng post → ngay lập tức write post đó vào news feed cache/inbox của tất cả followers. Read feed = đọc pre-computed inbox (cực nhanh). Nhưng write rất đắt nếu user có nhiều followers (celebrity problem: 100M followers → 100M writes mỗi post).',
      tip: 'Phù hợp khi users có ít followers (<10K). Twitter dùng Fan-out on Write cho non-celebrities. Read latency rất thấp vì feed đã được pre-compute.',
      example: '// Fan-out on Write:\nasync function publishPost(userId, post) {\n  // Save post:\n  const postId = await db.savePost(post);\n\n  // Get followers (có thể hàng triệu!):\n  const followerIds = await db.getFollowers(userId);\n\n  // Write to each follower\'s feed cache:\n  const pipeline = redis.pipeline();\n  followerIds.forEach(followerId => {\n    pipeline.lpush(`feed:${followerId}`, postId);\n    pipeline.ltrim(`feed:${followerId}`, 0, 999); // Keep 1000\n  });\n  await pipeline.exec();\n}\n\n// Reading feed is FAST:\nasync function getFeed(userId, page = 0) {\n  const postIds = await redis.lrange(`feed:${userId}`, page*20, page*20+19);\n  return db.getPostsByIds(postIds); // batch load\n}',
    },
    {
      name: 'Fan-out on Read',
      icon: '👁️',
      explain: 'Fan-out on Read (Pull Model): khi user đọc feed → query posts của tất cả people they follow, merge và sort theo thời gian. Write cực nhanh (chỉ save 1 post). Read đắt hơn (phải merge nhiều lists). Phù hợp cho users có nhiều followings hoặc celebrities.',
      tip: 'Fan-out on Read cần caching để chịu được traffic. Combine với Fan-out on Write: celebrities dùng on Read, normal users dùng on Write. Twitter dùng hybrid approach này.',
      example: '// Fan-out on Read:\nasync function getFeed(userId, limit = 20) {\n  // 1. Lấy danh sách following:\n  const followingIds = await db.getFollowing(userId);\n\n  // 2. Query posts của từng người (IN clause):\n  const posts = await db.query(`\n    SELECT * FROM posts\n    WHERE user_id = ANY($1)\n    ORDER BY created_at DESC\n    LIMIT $2\n  `, [followingIds, limit * 3]); // Fetch extra for ranking\n\n  // 3. Merge, rank, paginate:\n  return rankAndFilter(posts, userId).slice(0, limit);\n}\n// ⚠️ Slow nếu following 500 người, mỗi người 100 posts/ngày',
    },
    {
      name: 'Timeline',
      icon: '📅',
      explain: 'Timeline là sorted list of posts cho mỗi user feed. Thường sort theo created_at DESC hoặc theo ranking score. Redis Sorted Set là perfect structure: ZADD timeline userId timestamp postId → O(log n) insert, O(log n + k) range query. LinkedIn, Twitter dùng Redis Sorted Set cho timeline.',
      tip: 'Redis Sorted Set ZRANGE với score=timestamp cho time-based timeline. Dùng ZRANGEBYSCORE để paginate theo time range. Max timeline size thường giới hạn 1000 items.',
      example: '// Redis Sorted Set Timeline:\n// ZADD feed:{userId} {timestamp} {postId}\n\nasync function addToTimeline(userId, postId, timestamp) {\n  await redis.zadd(`feed:${userId}`, timestamp, postId);\n  // Trim to 1000 items:\n  await redis.zremrangebyrank(`feed:${userId}`, 0, -1001);\n}\n\n// Paginate:\nasync function getTimeline(userId, page = 0) {\n  const start = page * 20;\n  const end = start + 19;\n  // Newest first (reverse order):\n  const postIds = await redis.zrevrange(`feed:${userId}`, start, end);\n  return db.batchGetPosts(postIds);\n}',
    },
    {
      name: 'Ranking',
      icon: '⭐',
      explain: 'Ranking algorithm quyết định thứ tự hiển thị posts. Không phải chronological – EdgeRank (Facebook cũ), GraphRank, ML-based. Factors: recency, engagement (likes/comments/shares), relationship strength (thường xuyên interact), content type preference. Modern feeds dùng ML models.',
      tip: 'Simple ranking: score = likes×2 + comments×3 + shares×5 - age_hours×0.1. Complex: trained ML model với user-specific features. Start simple, iterate.',
      example: '// Simple ranking function:\nfunction rankPost(post, viewerUserId) {\n  const ageHours = (Date.now() - post.createdAt) / 3_600_000;\n\n  // Engagement score:\n  const engagement = post.likes * 2\n    + post.comments * 3\n    + post.shares * 5;\n\n  // Relationship boost:\n  const relationBoost = post.authorId in viewerCloseFreinds ? 2 : 1;\n\n  // Decay over time:\n  const timeDecay = Math.exp(-0.1 * ageHours);\n\n  return engagement * relationBoost * timeDecay;\n}\n\n// Sort feed by score:\nposts.sort((a, b) => rankPost(b, userId) - rankPost(a, userId));',
    },
    {
      name: 'Pagination',
      icon: '📄',
      explain: 'News Feed pagination cần Cursor-based (Keyset) thay vì OFFSET vì: (1) Feed thay đổi liên tục (mới insert, delete), (2) Infinite scroll UX. Cursor = timestamp của post cuối cùng. Request tiếp theo: posts WHERE created_at < cursor. Fan-out on Write: cursor trong Redis Sorted Set (ZREVRANGEBYSCORE).',
      tip: 'Encode cursor như opaque token (Base64). Đừng expose raw timestamp – người dùng có thể manipulate. Cho phép pull-to-refresh = query posts mới hơn cursor đầu tiên.',
      example: '// Cursor pagination cho news feed:\nasync function getFeedPage(userId, cursor = null) {\n  let postIds;\n\n  if (!cursor) {\n    // First page:\n    postIds = await redis.zrevrange(`feed:${userId}`, 0, 19);\n  } else {\n    // Decode cursor:\n    const lastScore = JSON.parse(atob(cursor)).score;\n    postIds = await redis.zrevrangebyscore(\n      `feed:${userId}`,\n      lastScore - 1, // Exclusive\n      "-inf",\n      "LIMIT", 0, 20\n    );\n  }\n\n  const posts = await db.batchGetPosts(postIds);\n  const nextCursor = posts.length > 0\n    ? btoa(JSON.stringify({ score: posts.at(-1).timestamp }))\n    : null;\n\n  return { posts, nextCursor };\n}',
    },
  ],
  demos: [
    {
      id: 'push-pull-hybrid',
      label: '📰 Push vs Pull (Hybrid Feed)',
      language: 'javascript',
      code: `// Giả lập mô hình Hybrid (Push/Pull) giải quyết bài toán Người Nổi Tiếng
class SocialNetworkFeed {
  constructor() {
    this.celebrities = new Set(['user_cristiano', 'user_messi']);
    
    // Giả lập inbox feed lưu sẵn (Push model) của từng user
    this.inboxFeeds = new Map(); // userId -> list of postIds
    // Lưu riêng database tất cả các post của từng người
    this.postsDb = new Map(); // authorId -> array of posts
    // Follow list
    this.following = new Map(); // followerId -> set of followingIds
  }

  follow(followerId, targetId) {
    if (!this.following.has(followerId)) {
      this.following.set(followerId, new Set());
    }
    this.following.get(followerId).add(targetId);
  }

  // User viết bài
  createPost(authorId, text) {
    const post = { id: 'post_' + Math.random().toString(36).substr(2, 5), authorId, text, time: Date.now() };
    
    // Lưu vào database
    if (!this.postsDb.has(authorId)) this.postsDb.set(authorId, []);
    this.postsDb.get(authorId).push(post);

    if (this.celebrities.has(authorId)) {
      // 1. Pull Model: Nếu là người nổi tiếng, KHÔNG push. Chỉ ghi 1 nơi.
      console.log(\`📢 [Pull] \${authorId} (Celebrity) đăng bài. Bỏ qua push inbox để bảo vệ tài nguyên.\`);
    } else {
      // 2. Push Model: Nếu là người dùng thường, nhân bản tới toàn bộ followers
      console.log(\`✍️ [Push] \${authorId} (Normal) đăng bài. Đang nhân bản tới các followers...\`);
      this.pushToFollowers(authorId, post.id);
    }
    return post;
  }

  pushToFollowers(authorId, postId) {
    // Tìm followers (giả lập duyệt các user theo dõi authorId)
    this.following.forEach((followingSet, followerId) => {
      if (followingSet.has(authorId)) {
        if (!this.inboxFeeds.has(followerId)) this.inboxFeeds.set(followerId, []);
        this.inboxFeeds.get(followerId).push(postId);
        console.log(\`   -> Đã push postId \${postId} vào inbox của \${followerId}\`);
      }
    });
  }

  // Đọc News Feed (Gộp dữ liệu từ Push Inbox và Pull từ các Celebrity)
  getFeed(userId) {
    console.log(\`\\n🔍 Đang tải News Feed cho \${userId}...\`);
    const finalFeed = [];

    // Bước A: Lấy các post được PUSH sẵn vào inbox
    const inboxPostIds = this.inboxFeeds.get(userId) || [];
    inboxPostIds.forEach(pid => {
      // Tìm post object từ database
      this.postsDb.forEach(posts => {
        const found = posts.find(p => p.id === pid);
        if (found) finalFeed.push(found);
      });
    });

    // Bước B: PULL từ các tài khoản celebrity mà user có follow
    const followings = this.following.get(userId) || new Set();
    followings.forEach(followingId => {
      if (this.celebrities.has(followingId)) {
        console.log(\`   -> Pull thêm bài đăng mới nhất từ Celebrity \${followingId}...\`);
        const celebPosts = this.postsDb.get(followingId) || [];
        finalFeed.push(...celebPosts);
      }
    });

    // Sắp xếp feed theo thời gian mới nhất
    return finalFeed.sort((a, b) => b.time - a.time);
  }
}

const net = new SocialNetworkFeed();
net.follow('Bob', 'Alice');         // Alice là user bình thường
net.follow('Bob', 'user_cristiano'); // Ronaldo là celebrity

// Đăng bài
net.createPost('Alice', 'Hôm nay trời đẹp quá!');
net.createPost('user_cristiano', 'Siuuuuuuu! ⚽');

// Bob tải feed
const feed = net.getFeed('Bob');
console.log('--- Kết quả Feed cuối cùng của Bob ---');
feed.forEach(p => console.log(\`[\${p.authorId}]: \${p.text}\`));`
    },
    {
      id: 'cursor-pagination',
      label: '📄 Cursor Pagination',
      language: 'javascript',
      code: `// Giả lập phân trang bằng Cursor-based Pagination (Keyset Pagination)
class PostDatabase {
  constructor() {
    this.posts = [];
    // Nạp sẵn danh sách bài đăng có timestamp lùi dần
    for (let i = 1; i <= 45; i++) {
      this.posts.push({
        id: \`post_\${i}\`,
        text: \`Nội dung bài viết số \${i}\`,
        timestamp: 1700000000000 - i * 1000 // Mỗi post cách nhau 1 giây
      });
    }
  }

  // Phân trang bằng cursor (sử dụng timestamp của phần tử cuối làm cursor)
  fetchPage(cursor = null, limit = 10) {
    console.log(\`\\n📡 Client yêu cầu tải trang với cursor: \`, cursor);
    
    let filteredPosts = this.posts;
    if (cursor) {
      // Chỉ lấy các bài viết có timestamp CŨ HƠN cursor (created_at < cursor)
      filteredPosts = this.posts.filter(p => p.timestamp < cursor);
    }

    const pageItems = filteredPosts.slice(0, limit);
    
    // Tạo cursor cho trang tiếp theo (dựa trên timestamp của phần tử cuối cùng)
    const nextCursor = pageItems.length === limit ? pageItems[pageItems.length - 1].timestamp : null;

    return {
      data: pageItems,
      nextCursor: nextCursor
    };
  }
}

const db = new PostDatabase();

// Tải Trang 1
const page1 = db.fetchPage(null, 5);
console.log('Trang 1:', page1.data.map(p => \`\${p.id} (\${p.timestamp})\`));

// Giả lập thêm bài đăng mới chen vào đầu database (không ảnh hưởng tới phân trang tiếp theo)
db.posts.unshift({ id: 'post_new_viral', text: 'Tin nóng mới đăng!', timestamp: Date.now() });

// Tải Trang 2 sử dụng nextCursor của trang 1
const page2 = db.fetchPage(page1.nextCursor, 5);
console.log('Trang 2:', page2.data.map(p => \`\${p.id} (\${p.timestamp})\`));
// Kết quả không bị trùng lặp phần tử mặc dù có post mới chen vào đầu! ✅`
    }
  ],
  interactive: null,
  callouts: [
    { type: 'warning', icon: '⚠️', title: 'OFFSET là kẻ thù của Infinite Scroll', body: 'Tuyệt đối không dùng LIMIT OFFSET cho tính năng cuộn vô hạn. OFFSET buộc DB phải quét qua hàng triệu bản ghi không cần thiết và cực dễ gây trùng hoặc lọt bài viết khi có post mới đăng.' },
    { type: 'success', icon: '⚡', title: 'Redis Sorted Set lưu trữ Timeline cực đỉnh', body: 'Sử dụng cấu trúc dữ liệu Sorted Set (ZSET) với Score là timestamp của bài viết để lưu trữ dòng thời gian giúp bạn truy xuất và phân trang theo thời gian cực nhanh với độ phức tạp chỉ O(log N).' },
    { type: 'info', icon: '🏢', title: 'Mô hình Hybrid: Tối ưu chi phí ghi/đọc', body: 'Hãy kết hợp: Push model cho đa số người dùng bình thường để có read latency siêu thấp, và Pull model cho các celebrity để tránh quá tải ghi khi họ tạo bài viết.' },
    { type: 'tip', icon: '🧹', title: 'Chỉ nên cache feed của Active User', body: 'Đừng lãng phí bộ nhớ lưu trữ feed cho các user lâu ngày không online. Hãy đặt TTL hoặc cơ chế dọn dẹp để giới hạn timeline của active user ở 500-1000 bài viết mới nhất.' }
  ]
}
