export default {
  slug: 'ride-hailing',
  order: 25,
  title: 'Ride Hailing',
  emoji: '🚗',
  description: 'Geo search, driver matching, real-time location cho ride-hailing app.',
  project: 'Ride Hailing App.',
  problems: [
    { icon: '📡', title: 'Sai lệch GPS (GPS Drift/Accuracy)', desc: 'Tọa độ GPS từ điện thoại di động thường bị trôi lệch, nhảy vị trí hoặc mất sóng khi đi vào tầng hầm, đường hầm hoặc giữa các tòa nhà cao tầng.' },
    { icon: '🌪️', title: 'Bão cập nhật vị trí (Location Update Storm)', desc: 'Hàng trăm ngàn tài xế gửi cập nhật GPS mỗi 3 giây tạo ra lượng tải khổng lồ lên máy chủ và database nếu xử lý không tối ưu.' },
    { icon: '⚔️', title: 'Tranh giành xe (Double-Assign Race Condition)', desc: 'Khi nhiều khách hàng cùng đặt xe tại một địa điểm, hệ thống dễ rơi vào xung đột gán cùng một tài xế cho hai người dùng khác nhau.' }
  ],
  concepts: [
    {
      name: 'Geohash',
      icon: '🗺️',
      explain: 'Geohash là thuật toán encode tọa độ (latitude, longitude) thành string ngắn. Ví dụ: Hà Nội ≈ "w3gv". Độ dài string tỉ lệ với độ chính xác: 6 chars ≈ 1.2km, 8 chars ≈ 38m. Các cells địa lý gần nhau có prefix giống nhau → dễ query neighbors bằng prefix match hoặc range scan.',
      tip: 'Geohash 6 chars đủ cho driver matching (precision ~1.2km). Redis GEOSEARCH dùng geohash internally. Nhược điểm: cells ở biên giới có prefix khác dù gần nhau → phải query 9 cells (center + 8 neighbors).',
      example: '// Redis Geo commands (dùng geohash internally):\nawait redis.geoadd("drivers",\n  105.8542, 21.0245, "driver:1",  // Hà Nội\n  105.8412, 21.0134, "driver:2",\n);\n\n// Tìm drivers trong 5km từ user:\nconst nearbyDrivers = await redis.geosearch(\n  "drivers",\n  "FROMLONLAT", 105.8412, 21.0134,  // user location\n  "BYRADIUS", 5, "km",\n  "ASC",\n  "COUNT", 10,\n  "WITHCOORD",\n  "WITHDIST"\n);\n// → [["driver:1", "0.35", [105.8542, 21.0245]], ...]',
    },
    {
      name: 'QuadTree',
      icon: '🌳',
      explain: 'QuadTree là cấu trúc cây chia không gian 2D thành 4 ô vuông đệ quy. Mỗi node đại diện một vùng địa lý, chia nhỏ khi có quá nhiều objects (ví dụ >100 drivers/cell). Efficient cho spatial queries: tìm all objects trong bounding box, range queries. Uber/Lyft dùng QuadTree hoặc H3 hexagonal grid.',
      tip: 'QuadTree tốt hơn Geohash cho areas có mật độ driver không đều (city center dense, suburbs sparse). H3 (Uber\'s hexagonal hierarchical system) là alternative tốt hơn cho production.',
      example: '// QuadTree node:\nclass QuadTree {\n  constructor(bounds, maxItems = 50) {\n    this.bounds = bounds; // {x1, y1, x2, y2}\n    this.items = [];      // Drivers trong cell này\n    this.children = null; // [NW, NE, SW, SE]\n    this.maxItems = maxItems;\n  }\n\n  insert(driver) {\n    if (!this.contains(driver.location)) return false;\n    if (!this.children) {\n      this.items.push(driver);\n      if (this.items.length > this.maxItems) this.split();\n    } else {\n      this.children.find(c => c.insert(driver));\n    }\n  }\n\n  query(range) {\n    if (!this.intersects(range)) return [];\n    if (!this.children) return this.items.filter(i => range.contains(i.location));\n    return this.children.flatMap(c => c.query(range));\n  }\n}',
    },
    {
      name: 'Matching Engine',
      icon: '🎯',
      explain: 'Matching Engine quyết định driver nào được assign cho request. Factors: distance, ETA, driver rating, vehicle type, surge pricing zone. Algorithm: tìm N nearest drivers (via Geohash/QuadTree), score từng driver theo multi-factor, assign driver tốt nhất. Cần xử lý concurrent requests và lock để tránh double-assign.',
      tip: 'Uber dùng Hungarian Algorithm cho batch matching (optimize tổng thể). Lyft dùng greedy với real-time matching. Cần distributed lock để prevent race condition khi assign driver.',
      example: '// Simplified matching:\nasync function matchDriver(riderLocation, riderRequest) {\n  // 1. Tìm available drivers trong 5km:\n  const candidates = await redis.geosearch(\n    "available_drivers",\n    "FROMLONLAT", riderLocation.lng, riderLocation.lat,\n    "BYRADIUS", 5, "km", "ASC", "COUNT", 20\n  );\n\n  // 2. Score và rank:\n  const scored = candidates.map(driver => ({\n    ...driver,\n    score: calcScore(driver, riderLocation, riderRequest)\n  })).sort((a, b) => b.score - a.score);\n\n  // 3. Try to assign (with lock to prevent double-assign):\n  for (const driver of scored) {\n    const locked = await redis.set(\n      `driver:lock:${driver.id}`, riderRequest.id, "NX", "EX", 10\n    );\n    if (locked) return driver;\n  }\n  return null; // No available driver\n}',
    },
    {
      name: 'WebSocket',
      icon: '🔌',
      explain: 'WebSocket là backbone của real-time location tracking trong ride-hailing. Driver app gửi GPS update mỗi 3-5s qua WebSocket. Server broadcast location đến rider app. Cần scale WebSocket servers: mỗi server handle ~50K concurrent connections. Load balancer cần sticky session.',
      tip: 'Driver location updates tần suất cao → cần efficient publish: Redis Pub/Sub hoặc Kafka. Rider chỉ subscribe location của driver của mình → targeted delivery.',
      example: '// Driver sends GPS every 4s:\nconst ws = new WebSocket("wss://location.ridehailing.com");\n\nsetInterval(async () => {\n  const { lat, lng } = await getCurrentPosition();\n  ws.send(JSON.stringify({\n    type: "location_update",\n    driverId: myDriverId,\n    lat, lng,\n    heading: compass.heading,\n    speed: gps.speed\n  }));\n}, 4000);\n\n// Server broadcasts to rider:\nws.on("message", async (data) => {\n  const { type, driverId, lat, lng } = JSON.parse(data);\n  if (type === "location_update") {\n    // Update Redis:\n    await redis.geoadd("drivers", lng, lat, `driver:${driverId}`);\n    // Notify rider:\n    const riderId = await redis.get(`driver:current_rider:${driverId}`);\n    notifyRider(riderId, { driverId, lat, lng });\n  }\n});',
    },
    {
      name: 'OSRM',
      icon: '🗺️',
      explain: 'OSRM (Open Source Routing Machine) là routing engine tính toán optimal route giữa hai điểm trên bản đồ đường bộ (OpenStreetMap data). Tính ETA, turn-by-turn directions, distance. Uber dùng H3 + internal routing. Google Maps Directions API là commercial alternative. Cần update routing data khi traffic thay đổi.',
      tip: 'OSRM pre-processes map data → O(1) shortest path queries! Chạy OSRM locally cho privacy và cost. Kết hợp với real-time traffic (HERE, Google) để dynamic ETA.',
      example: '// OSRM HTTP API:\nconst response = await fetch(\n  "http://router.project-osrm.org/route/v1/driving/"\n  + `${driverLng},${driverLat};${riderLng},${riderLat}`\n  + "?overview=full&geometries=geojson"\n);\nconst data = await response.json();\n\nconst route = data.routes[0];\nconsole.log(`Distance: ${(route.distance / 1000).toFixed(1)} km`);\nconsole.log(`ETA: ${Math.ceil(route.duration / 60)} minutes`);\n\n// Turn-by-turn:\nroute.legs[0].steps.forEach(step => {\n  console.log(`${step.maneuver.type}: ${step.name}`);\n});',
    },
  ],
  demos: [
    {
      id: 'driver-matching',
      label: '🚗 Driver Matching Engine',
      language: 'javascript',
      code: `// Giả lập cơ chế quét vùng và gán tài xế dựa trên khoảng cách và rating
class Matchmaker {
  constructor() {
    this.drivers = [
      { id: 'drv:1', name: 'Nguyễn Văn A', lat: 21.0245, lng: 105.8542, rating: 4.8, active: true },
      { id: 'drv:2', name: 'Trần Văn B', lat: 21.0280, lng: 105.8590, rating: 4.9, active: true },
      { id: 'drv:3', name: 'Lê Văn C', lat: 21.0200, lng: 105.8480, rating: 4.2, active: true }
    ];
  }

  // Tính khoảng cách Haversine đơn giản (đơn vị: km)
  calcDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Bán kính Trái Đất
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Thuật toán chấm điểm Driver
  evaluateDriver(driver, riderLat, riderLng) {
    const distance = this.calcDistance(riderLat, riderLng, driver.lat, driver.lng);
    
    // Công thức tính điểm: Trọng số khoảng cách 70%, Trọng số rating 30%
    const distanceScore = Math.max(0, 10 - distance * 2); // 10 điểm tuyệt đối, trừ dần theo km
    const ratingScore = driver.rating * 2; // scale rating từ 0-5 lên 0-10
    const finalScore = distanceScore * 0.7 + ratingScore * 0.3;

    return { driver, distance, finalScore };
  }

  match(riderLat, riderLng) {
    console.log(\`🎯 [Match] Bắt đầu tìm tài xế gần vị trí (\${riderLat}, \${riderLng})...\`);
    
    const candidates = this.drivers
      .filter(d => d.active)
      .map(d => this.evaluateDriver(d, riderLat, riderLng))
      .filter(c => c.distance <= 3.0) // Chỉ chấp nhận tài xế trong phạm vi 3km
      .sort((a, b) => b.finalScore - a.finalScore); // Sắp xếp theo score giảm dần

    if (candidates.length > 0) {
      const best = candidates[0];
      console.log(\`✅ Gán xe thành công cho \${best.driver.name} (Khoảng cách: \${best.distance.toFixed(2)}km, Score: \${best.finalScore.toFixed(1)})\`);
      best.driver.active = false; // Đánh dấu tài xế đã bận
      return best.driver;
    }
    
    console.log('❌ Rất tiếc, không tìm thấy tài xế khả dụng gần đây.');
    return null;
  }
}

const engine = new Matchmaker();
// Khách hàng đặt xe tại Hoàn Kiếm (21.025, 105.855)
const matchedDriver = engine.match(21.0250, 105.8550);`
    },
    {
      id: 'dynamic-pricing',
      label: '📈 Dynamic Pricing Engine',
      language: 'javascript',
      code: `// Giả lập thuật toán Nhân Hệ Số Giá (Surge Pricing Multiplier) theo Cung / Cầu địa phương
class DynamicPricing {
  calculateSurge(riderDemand, driverSupply) {
    console.log(\`\\n📊 [Surge-Check] Khách tìm xe: \${riderDemand} | Xe trống: \${driverSupply}\`);
    
    // Nếu cung dồi dào, hệ số là 1.0 (không nhân giá)
    if (driverSupply >= riderDemand) {
      return 1.0;
    }

    if (driverSupply === 0) {
      console.log('🚨 Quá khan hiếm xe! Áp dụng hệ số trần.');
      return 2.5; // Hệ số nhân giá tối đa
    }

    // Tỉ lệ cầu / cung
    const ratio = riderDemand / driverSupply;
    
    // Thuật toán tính nhân hệ số
    let surge = 1.0 + (ratio - 1.0) * 0.5;
    
    // Giới hạn hệ số trong khoảng [1.0 - 2.5]
    surge = Math.min(2.5, Math.max(1.0, surge));
    return parseFloat(surge.toFixed(1));
  }
}

const pricing = new DynamicPricing();
const basePrice = 30000; // Giá gốc 30,000 VND

// Trường hợp 1: Giờ thấp điểm, xe nhiều hơn khách
const surge1 = pricing.calculateSurge(10, 25);
console.log(\`💰 Hệ số nhân: \${surge1}x -> Giá chuyến đi: \${basePrice * surge1} VND\`);

// Trường hợp 2: Giờ cao điểm / trời mưa, khách đông hơn xe
const surge2 = pricing.calculateSurge(50, 10);
console.log(\`💰 Hệ số nhân: \${surge2}x -> Giá chuyến đi: \${basePrice * surge2} VND\`);`
    }
  ],
  interactive: null,
  callouts: [
    { type: 'warning', icon: '⚠️', title: 'Không ghi tọa độ GPS trực tiếp vào RDBMS', body: 'Tài xế cập nhật GPS liên tục sẽ phá hủy hiệu năng ghi của SQL Database. Hãy lưu trữ tọa độ tạm thời trên Redis (sử dụng cấu trúc dữ liệu GEO) và chỉ ghi lịch sử chuyến đi vào SQL khi kết thúc hành trình.' },
    { type: 'success', icon: '📍', title: 'Redis GEO là giải pháp tối ưu cho real-time', body: 'Cấu trúc dữ liệu Redis GEO cho phép lưu và tính khoảng cách địa lý cực kỳ nhanh ngay trên bộ nhớ RAM, giúp định vị tài xế lân cận trong thời gian thực chỉ mất vài mili giây.' },
    { type: 'info', icon: '🔷', title: 'Ưu điểm cấu trúc tổ chức không gian H3 (Hexagon)', body: 'Uber phát minh ra H3 sử dụng lưới lục giác để chia bản đồ. So với lưới ô vuông của Geohash, lưới lục giác có khoảng cách từ tâm cell tới tất cả các cell lân cận là hoàn toàn bằng nhau, giúp tính toán bán kính tìm kiếm chính xác hơn.' },
    { type: 'tip', icon: '🔋', title: 'Tiết kiệm pin cho điện thoại tài xế', body: 'Đừng bắt GPS cập nhật mỗi giây khi xe đang đỗ hoặc kẹt xe. Hãy dùng gia tốc kế của điện thoại để tự động giảm tần suất quét GPS xuống 10-15s khi dừng đỗ để tiết kiệm pin.' }
  ]
}
