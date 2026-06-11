# 🎓 Backend Learning Hub

> Nền tảng học **Backend Engineering** theo lộ trình 5 cấp độ — từ Junior đến Senior — với lý thuyết, code demo **chạy trực tiếp trong trình duyệt**, và bài tập tương tác.

Ứng dụng web (React + Vite) giúp bạn học các bài toán kinh điển của Backend: SQL, Search, Pagination, Caching, Distributed Systems, System Design... Mỗi chủ đề đi kèm **demo code thật sự chạy được** ngay trên trang.

---

## 📖 Mục lục

- [Tính năng](#-tính-năng)
- [Cài đặt & Chạy](#-cài-đặt--chạy)
- [Hướng dẫn sử dụng](#-hướng-dẫn-sử-dụng)
- [Lộ trình 5 cấp độ](#-lộ-trình-5-cấp-độ)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Thêm chủ đề mới](#-thêm-chủ-đề-mới)
- [Build & Deploy](#-build--deploy)

---

## ✨ Tính năng

| Tính năng | Mô tả |
|---|---|
| 🗂️ **5 Levels, ~30 chủ đề** | Lộ trình từ nền tảng đến System Design |
| 💻 **Code Runner** | Chạy code JavaScript trực tiếp trong sandbox an toàn (iframe), xem `console.log` ngay |
| 🎮 **Bài tập tương tác** | Nhập input và xem kết quả tính toán theo thời gian thực |
| 📖 **Khái niệm có thể click** | Click vào mỗi khái niệm để mở giải thích, tip và ví dụ code |
| ✅ **Theo dõi tiến độ** | Đánh dấu hoàn thành — tự lưu vào `localStorage`, không mất khi tải lại |
| 🗺️ **Roadmap** | Trang lộ trình tổng quan 7 giai đoạn |

---

## 🚀 Cài đặt & Chạy

### Yêu cầu

- **Node.js** ≥ 20 (khuyến nghị 24 — khớp với CI)
- **npm** (đi kèm Node.js)

### Các bước

```bash
# 1. Cài dependencies
npm install

# 2. Chạy dev server (có Hot Module Reload)
npm run dev
```

Mở trình duyệt tại địa chỉ in ra terminal — mặc định `http://localhost:5173/`
(nếu cổng 5173 đang bận, Vite tự chuyển sang 5174, 5175...).

### Các lệnh khác

| Lệnh | Tác dụng |
|---|---|
| `npm run dev` | Khởi động dev server (HMR) |
| `npm run build` | Build production vào thư mục `dist/` |
| `npm run preview` | Xem thử bản build production |
| `npm run lint` | Kiểm tra code bằng ESLint |

---

## 🧭 Hướng dẫn sử dụng

### 1. Trang chủ (Home)

- Hiển thị lưới **5 cấp độ** (Level cards) cùng các chủ đề con (topic chips).
- **Sidebar** bên trái liệt kê toàn bộ Level → chủ đề, kèm tiến độ (ví dụ `0/5`).
- Góc dưới sidebar hiển thị **tổng tiến độ** (ví dụ `0/30`).
- Click một Level để xem chi tiết, hoặc click thẳng vào một chủ đề.

### 2. Trang chủ đề (Topic)

Mỗi chủ đề gồm các phần (cuộn từ trên xuống):

1. **❌ Các vấn đề cần giải quyết** — những "nỗi đau" thực tế của bài toán.
2. **📖 Kiến thức cần học** — *click vào từng khái niệm* để mở giải thích chi tiết + tip + ví dụ code.
3. **💻 Code Minh Họa** — chọn tab demo rồi nhấn **Run** để chạy code thật, xem output `console.log`.
4. **🎮 Thử Nghiệm Tương Tác** — nhập số/giá trị và xem kết quả tính ngay lập tức.
5. **📌 Tổng Kết & Best Practices** — các callout đúc kết.
6. **← / →** — điều hướng sang bài trước / bài sau trong cùng Level.

### 3. Theo dõi tiến độ

- Nhấn nút **đánh dấu hoàn thành** trên chủ đề để tick ✅.
- Tiến độ lưu trong `localStorage` (key `backend-hub-progress`) — **không mất khi reload**.
- Muốn reset: xoá key đó trong DevTools → Application → Local Storage.

### 4. Roadmap

Truy cập đường dẫn `/roadmap` (hoặc nút **Xem Roadmap** ở trang chủ) để xem lộ trình tổng quan 7 giai đoạn.

---

## 🪜 Lộ trình 5 cấp độ

| Level | Tên | Nội dung |
|:---:|---|---|
| 1 🗄️ | **Backend Fundamentals** | SQL Optimization, Search, Pagination, Transaction, N+1 Query |
| 2 📈 | **Scalability** | Caching, Rate Limiting, Idempotency, Distributed Lock, Message Queue |
| 3 🌐 | **Distributed Systems** | Distributed Transaction, Event-Driven, Event Sourcing, CQRS, Service Discovery |
| 4 🚀 | **High Scale Systems** | DB Replication, Sharding, Consistent Hashing, Leader Election, Distributed Cache |
| 5 🏗️ | **System Design** | URL Shortener, Chat, News Feed, Video Streaming, Ride Hailing, Payment Gateway... |

---

## 📁 Cấu trúc dự án

```
Learning-Problem-To-Level-Up/
├── index.html              # HTML gốc (lang="vi", có #root)
├── vite.config.js          # Cấu hình Vite + base path cho GitHub Pages
├── package.json            # Scripts & dependencies
└── src/
    ├── main.jsx            # Điểm vào — render <App/> + BrowserRouter
    ├── App.jsx             # Định nghĩa routes (Home / Level / Topic / Roadmap)
    ├── components/         # UI tái sử dụng (Layout, Sidebar, CodeRunner, ...)
    ├── pages/              # Các trang: Home, LevelPage, TopicPage, RoadmapPage
    ├── store/
    │   └── useProgressStore.js   # Zustand store — lưu tiến độ vào localStorage
    └── data/               # ★ Toàn bộ NỘI DUNG học nằm ở đây
        ├── index.js        # Registry trung tâm — gom tất cả level & topic
        ├── level1/ ... level5/   # Mỗi file = 1 chủ đề
```

> **Điểm mấu chốt:** Nội dung (`src/data/`) **tách rời** khỏi giao diện. Muốn thêm bài học, bạn chỉ cần thêm file dữ liệu — không động tới component.

### Định tuyến (Routes)

| Đường dẫn | Trang |
|---|---|
| `/` | Trang chủ |
| `/level/:levelId` | Danh sách chủ đề của một Level |
| `/level/:levelId/topic/:topicSlug` | Nội dung chi tiết một chủ đề |
| `/roadmap` | Lộ trình tổng quan |

---

## ➕ Thêm chủ đề mới

Mỗi chủ đề là **một file `.js`** export một object. Ví dụ tối thiểu:

```js
// src/data/level1/my-topic.js
export default {
  slug: 'my-topic',           // dùng trong URL: /level/1/topic/my-topic
  order: 6,                   // thứ tự hiển thị trong level
  title: 'Tên chủ đề',
  emoji: '⚡',
  description: 'Mô tả ngắn về chủ đề.',
  project: 'Dự án thực hành (tuỳ chọn).',

  problems: [                 // Các vấn đề cần giải quyết
    { icon: '🐢', title: 'Vấn đề A', desc: 'Mô tả...' },
  ],

  concepts: [                 // Kiến thức (click để xem chi tiết)
    { name: 'Khái niệm', icon: '🌳', explain: '...', tip: '...', example: 'code...' },
  ],

  demos: [                    // Code chạy được (Code Runner)
    { id: 'demo-1', label: '🔍 Demo', language: 'javascript', code: `console.log('Hello')` },
  ],

  interactive: {              // Bài tập tương tác (tuỳ chọn)
    title: '⚡ Thử nghiệm',
    inputLabel: 'Nhập số', inputType: 'number', inputPlaceholder: '100',
    run(value) { return `Kết quả: ${value}` },
  },

  callouts: [                 // Tổng kết (tuỳ chọn)
    { type: 'success', icon: '🚀', title: 'Mẹo', body: '...' },
  ],
}
```

> Tất cả các trường ngoài `slug` / `title` đều **tuỳ chọn** — phần nào không có sẽ tự động ẩn.

Sau đó **đăng ký** chủ đề trong [`src/data/index.js`](src/data/index.js):

```js
import myTopic from './level1/my-topic.js'   // 1. import

// 2. thêm vào mảng topics của level tương ứng
{ id: 1, title: 'Backend Fundamentals', /* ... */,
  topics: [sql, search, pagination, transaction, n1query, myTopic] },
```

Xong! Sidebar, routing và đếm tiến độ (`TOTAL_TOPICS`) tự cập nhật.

> 💡 **Lưu ý về Code Runner:** code trong `demos` chạy trong **iframe sandbox** chỉ với JavaScript thuần — hỗ trợ `console.log` / `console.time`. Code SQL (`language: 'sql'`) chỉ để hiển thị, không thực thi.

---

## 📦 Build & Deploy

### Build production cục bộ

```bash
npm run build      # tạo thư mục dist/
npm run preview    # xem thử bản build
```

### Tự động deploy lên GitHub Pages

Repo có sẵn workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

- Kích hoạt khi **push lên nhánh `develop`**.
- Tự động: `npm ci` → `npm run lint` → `npm run build` → deploy lên GitHub Pages.
- Khi build trên CI, biến `GITHUB_ACTIONS=true` khiến `base` đổi thành `/Learning-Problem-To-Level-Up/` để khớp đường dẫn GitHub Pages.

---

## 🛠️ Công nghệ sử dụng

- **React 19** — UI
- **Vite 8** — build tool & dev server (HMR)
- **React Router 7** — định tuyến client-side
- **Zustand 5** — quản lý state + lưu tiến độ (`persist` → localStorage)

---

<div align="center">

**Học Backend bài bản — Level Up từ Junior đến Senior 🚀**

</div>
