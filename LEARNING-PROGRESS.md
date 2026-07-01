# Level 2 (Scalability) — Hoàn thiện "Coming Soon" ✅

Đã thay toàn bộ 5 phần `🚧 Coming Soon` bằng **demo chạy được + interactive widget**.
Tất cả demo đã được verify (chạy qua bản mô phỏng đúng sandbox) và index.js load sạch (TOTAL_TOPICS = 30).

Xem trực tiếp: `npm run dev` → Level 2 → chọn topic → bấm **Chạy Code** / nhập input widget.

| Topic | Demos đã thêm | Interactive widget |
|-------|---------------|--------------------|
| ⚡ **Caching** | Cache Aside (hit/miss) · Cache Stampede (mutex) · LRU Eviction | Hit ratio → độ trễ & tải DB |
| 🚦 **Rate Limiting** | Token Bucket · Fixed Window (lỗ hổng ranh giới) · Sliding Window Log | Burst N request → allow/block |
| 🔁 **Idempotency** | Double Charge (bug) · Idempotency Key (fix) · At-least-once + Dedup | N retry → có vs không idempotency |
| 🔐 **Distributed Lock** | Race Condition (oversell) · Redis SETNX Lock (fix) · Fencing Token | N người mua 1 vé → oversell vs lock |
| 📨 **Message Queue** | Đồng bộ vs Queue · Dead Letter Queue · Kafka Partition Ordering | N service phụ → latency đồng bộ vs queue |

## Ràng buộc kỹ thuật đã áp dụng (để demo mới cũng đúng chuẩn này)
- **Demo phải ĐỒNG BỘ.** [CodeRunner.jsx](src/components/CodeRunner/CodeRunner.jsx) chạy `eval` rồi
  `postMessage` log ngay lập tức → `async`/`await`/`setTimeout` sẽ mất output. Nên mọi demo mô phỏng
  "thời gian"/"đồng thời" bằng vòng lặp + clock giả, không dùng async thật.
- **Không dùng `` ` `` hay `${}` bên trong chuỗi `code`** (vì `code` đã là template literal) → demo dùng
  nối chuỗi `'...' +` và `console.log('')` để xuống dòng, tránh phải escape.
- `interactive.run(value)` chạy trong app context (không sandbox) nên dùng template literal bình thường,
  chỉ cần đồng bộ và trả về string.

## 🧠 Hệ thống Quiz (đã thêm)

Component tái sử dụng: [Quiz.jsx](src/components/Quiz/Quiz.jsx) + [Quiz.module.css](src/components/Quiz/Quiz.module.css),
render trong [TopicPage.jsx](src/pages/TopicPage.jsx) ở mục "🧠 Kiểm tra kiến thức".

- **Schema:** thêm field `quiz: [{ q, options: [...], answer: <index>, explain }]` vào file topic.
- **UX:** chọn đáp án → "Nộp bài" (chỉ bật khi đã trả lời hết) → hiện đúng (xanh) / sai (đỏ) + giải thích
  từng câu + điểm. Không lộ đáp án trước khi nộp. Nút "Làm lại" để reset.
- **Tích hợp tiến độ:** đạt ≥ 70% → tự gọi `markDone` (nếu chưa done) → topic được tick hoàn thành ở LevelPage.
- **Đáp án đúng được đặt ở vị trí khác nhau** giữa các câu (không dồn 1 chỗ) — xem cột "vị trí đáp án đúng".
- **Đã có quiz: TẤT CẢ 30/30 topic (Level 1→5), tổng 121 câu.** Level 3-5 hoá ra KHÔNG phải stub —
  mỗi topic có 4-6 concepts + 2 demos nên đủ nội dung để ra đề.
- Verify tập trung: integrity check (mọi `answer` trong range, options=4, không trùng option) → 0 lỗi;
  `npm run build` OK; spot-check nội dung 3 file (sql / consistent-hashing / url-shortener) → đáp án đúng thật.
- 25 topic còn lại (Level 1,3,4,5) được thêm quiz bằng 5 subagent chạy song song (mỗi agent 5 file rời nhau).

## 🚀 Mở rộng lên chuẩn Mid/Senior

**Phase 1 (XONG):** Thêm 2 level mới (data-driven, tự hiện ở sidebar/home/routing):
- **Level 6 · Production Readiness** (🛠️): api-design, security, observability, testing, cicd-deploy.
- **Level 7 · Reliability & Consensus** (🎯): resilience, consensus, consistency-models.
- 8 topic mới tạo song song bằng 8 subagent (mỗi topic: 6 concepts + 3 demo chạy được + interactive + 4 quiz).
- Sửa hardcode: Sidebar/Home count → dùng `TOTAL_TOPICS`; thêm `--level6-color`/`--level7-color`.
- Đáp án quiz được **xáo vị trí khác nhau giữa các file** (script rotate options + answer, giữ đúng đáp án).
- **Verify tập trung:** 7 level / 38 topic / 153 câu quiz · 0 lỗi integrity · mọi demo mới chạy qua sandbox-sim OK · `npm run build` OK · spot-check đáp án sau shuffle vẫn đúng.

**Phase 2 (XONG):** Nâng cấp đánh giá Bloom 3–5.
- **Component mới:** `sandbox.js` (tách runner dùng chung), `CodeRunner` editable (✎ Sửa → chạy → ↺ khôi phục),
  `DesignChallenge` (đề mở + capacity steps + rubric tự chấm), `DebugExercise` (sửa code → auto-check output).
- **Design Challenge (Bloom 4-5):** 10/10 topic Level 5 — brief + scale + requirements + 5 bước (prompt/hint) + rubric 5 tiêu chí.
- **Debug Exercise (Bloom 3):** 10 topic (Level 1 x5 + Level 2 x5) — mỗi bài 1 code có bug thật, auto so output với kỳ vọng.
- **Verify tập trung:** 10 challenge (0 lỗi shape) · 10 exercise **chạy thật**: solution khớp expected & buggy khác expected (0 lỗi) · `npm run build` OK.
- Tạo bằng 6 subagent song song; component + gold example do mình tự build & verify trước.

## Ghi chú
Bạn đã chọn "bỏ phần học, chỉ build". Nếu sau này muốn hiểu sâu (vấn đề → giải pháp → tại sao → tác động,
kèm quiz), cứ nói — mình có thể dạy từng topic. Các khái niệm này chính là nền của hệ thống flash-sale DDD
ở thư mục `xxxx.com-section4` (getTicketDefaultCacheVip dùng distributed lock để chống cache stampede + oversell).
