export default {
  slug: 'video-streaming',
  order: 24,
  title: 'Video Streaming',
  emoji: '🎬',
  description: 'CDN, chunk upload, adaptive bitrate cho video streaming platform.',
  project: 'Video Platform.',
  problems: [
    { icon: '💸', title: 'Chi phí băng thông khổng lồ (Bandwidth Cost)', desc: 'Truyền tải video dung lượng lớn trực tiếp từ Origin Server tiêu tốn lượng băng thông mạng khổng lồ và chi phí máy chủ cực kỳ đắt đỏ.' },
    { icon: '⚙️', title: 'Nghẽn cổ chai khi Transcoding', desc: 'Việc chuyển đổi định dạng và độ phân giải video (360p, 720p, 1080p) tốn cực kỳ nhiều CPU/GPU, dễ gây nghẽn hàng đợi xử lý video mới.' },
    { icon: '🔄', title: 'Trễ tải và giật lag (Buffering)', desc: 'Mạng của người dùng thay đổi liên tục. Nếu không thay đổi độ phân giải linh hoạt (Adaptive), video sẽ bị dừng liên tục để đợi tải (Buffering).' }
  ],
  concepts: [
    {
      name: 'CDN',
      icon: '🌐',
      explain: 'CDN (Content Delivery Network) là mạng lưới edge servers phân tán toàn cầu, cache và serve content từ vị trí gần user nhất. Thay vì stream video từ origin server ở US → user ở VN phải travel 15,000km, CDN cache video tại Singapore → latency giảm 80%. CloudFront, Cloudflare, Fastly là CDN phổ biến.',
      tip: 'Video files không thể cache ở CDN layer thông thường (quá lớn). Thay vào đó: CDN cache các video segments nhỏ (2-10s mỗi segment). Pre-warm popular content lên edge nodes.',
      example: '// CDN URL pattern:\n// Origin: storage.example.com/videos/abc123/720p/segment001.ts\n// CDN:    cdn.example.com/videos/abc123/720p/segment001.ts\n\n// CloudFront config:\n{\n  "Origins": [{\n    "DomainName": "storage.example.com",\n    "Id": "VideoOrigin"\n  }],\n  "DefaultCacheBehavior": {\n    "ViewerProtocolPolicy": "redirect-to-https",\n    "CachePolicyId": "video-cache-policy",\n    // Cache video segments 7 ngày:\n    "TTL": 604800\n  }\n}\n\n// Signed URL cho private videos:\nconst signedUrl = cloudfront.getSignedUrl({\n  url: "https://cdn.example.com/video/abc123",\n  expires: Date.now() / 1000 + 3600 // 1 giờ\n});',
    },
    {
      name: 'HLS',
      icon: '📺',
      explain: 'HLS (HTTP Live Streaming) là Apple\'s adaptive streaming protocol. Video được chia thành segments nhỏ (2-10s, thường .ts format). Master playlist (.m3u8) chứa danh sách các quality variants. Media playlist chứa URLs của segments. Player tự động chọn quality phù hợp bandwidth.',
      tip: 'HLS có latency cao hơn DASH (~20-30s). Low-Latency HLS (LL-HLS) giảm xuống 2-3s. Hỗ trợ rộng rãi trên iOS, macOS, Smart TVs. Default cho Apple platforms.',
      example: '// HLS Master Playlist (master.m3u8):\n#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360\n360p/playlist.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=1280x720\n720p/playlist.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1920x1080\n1080p/playlist.m3u8\n\n// Media Playlist (720p/playlist.m3u8):\n#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXTINF:6.0,\nsegment001.ts\n#EXTINF:6.0,\nsegment002.ts\n#EXTINF:5.8,\nsegment003.ts',
    },
    {
      name: 'DASH',
      icon: '📊',
      explain: 'DASH (Dynamic Adaptive Streaming over HTTP) là open-source adaptive streaming tiêu chuẩn ISO. Tương tự HLS nhưng dùng MPD file (XML) thay vì m3u8. Hỗ trợ video segments dạng MP4 (fMP4). Linh hoạt hơn HLS cho DRM, multiple audio tracks, subtitle. YouTube, Netflix dùng DASH.',
      tip: 'DASH không được hỗ trợ native trên iOS Safari → cần dash.js player. Kết hợp DASH + EME (Encrypted Media Extensions) cho DRM. fMP4 segments compatible hơn TS.',
      example: '// DASH MPD (manifest):\n<?xml version="1.0"?>\n<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="dynamic">\n  <Period>\n    <AdaptationSet mimeType="video/mp4">\n      <!-- 360p -->\n      <Representation id="1" bandwidth="800000"\n        width="640" height="360">\n        <SegmentTemplate media="360p_$Number$.m4s"\n          initialization="360p_init.mp4" duration="6"/>\n      </Representation>\n      <!-- 720p -->\n      <Representation id="2" bandwidth="1400000"\n        width="1280" height="720">\n        <SegmentTemplate media="720p_$Number$.m4s"\n          initialization="720p_init.mp4" duration="6"/>\n      </Representation>\n    </AdaptationSet>\n  </Period>\n</MPD>',
    },
    {
      name: 'Chunk Upload',
      icon: '📦',
      explain: 'Chunk Upload (Multipart Upload) chia file lớn thành nhiều chunks để upload. Nếu connection bị đứt → chỉ cần resume từ chunk chưa upload. AWS S3 Multipart Upload: tối thiểu 5MB/part. Tus protocol là open standard cho resumable uploads. YouTube dùng Google\'s resumable upload API.',
      tip: 'Upload chunks song song để tăng tốc. Minimum chunk size 5MB (S3 requirement). Lưu upload state ở client (localStorage) để resume sau khi browser refresh.',
      example: '// Tus resumable upload:\nimport * as tus from "tus-js-client";\n\nconst upload = new tus.Upload(file, {\n  endpoint: "https://api.example.com/upload/",\n  retryDelays: [0, 3000, 5000, 10000], // Auto retry\n  chunkSize: 5 * 1024 * 1024, // 5MB chunks\n  metadata: { filename: file.name, filetype: file.type },\n  onError: (error) => console.error(error),\n  onProgress: (bytesUploaded, bytesTotal) => {\n    const percentage = (bytesUploaded / bytesTotal * 100).toFixed(2);\n    console.log(`${percentage}%`);\n  },\n  onSuccess: () => console.log("Upload complete!")\n});\nupload.start(); // Resume nếu đã có previous upload',
    },
    {
      name: 'Transcoding',
      icon: '⚙️',
      explain: 'Transcoding là quá trình chuyển đổi video từ format/codec này sang khác và tạo nhiều quality variants (360p, 720p, 1080p, 4K). CPU/GPU intensive. Workflow: upload raw video → message queue → transcoding workers (FFmpeg) → output segments → store S3 → invalidate CDN cache.',
      tip: 'Dùng hardware acceleration: NVIDIA NVENC, Intel QuickSync, AWS MediaConvert. Transcoding cost ~1s video = 10-30s processing. Queue system (SQS, Kafka) để scale workers theo demand.',
      example: '// FFmpeg transcoding command:\n$ ffmpeg -i input.mp4 \\\\\n  -vf "scale=1280:720" \\\\\n  -c:v libx264 -preset fast -crf 23 \\\\\n  -c:a aac -b:a 128k \\\\\n  -hls_time 6 \\\\\n  -hls_playlist_type vod \\\\\n  -hls_segment_filename "720p_%03d.ts" \\\\\n  720p/playlist.m3u8\n\n// AWS MediaConvert job:\nawait mediaconvert.createJob({\n  Role: "arn:aws:iam::...",\n  Settings: {\n    Inputs: [{ FileInput: "s3://raw/video.mp4" }],\n    OutputGroups: [/* HLS output config */]\n  }\n});',
    },
    {
      name: 'ABR',
      icon: '📶',
      explain: 'ABR (Adaptive Bitrate) là kỹ thuật tự động chọn quality phù hợp với bandwidth của user. Player đo throughput liên tục, nếu bandwidth giảm → switch xuống quality thấp hơn (tránh buffering), nếu tăng → switch lên quality cao hơn. Các algorithms: BOLA, MPC, pensieve (ML-based).',
      tip: 'Buffer target thường 15-30s. Switch quality dựa trên: buffer level, estimated bandwidth, segment download time. Không switch quá thường xuyên (gây flicker). Segment boundary là điểm switch.',
      example: '// Simple ABR algorithm:\nclass SimpleABR {\n  estimateBandwidth(downloadTime, segmentSize) {\n    // bits per second:\n    return (segmentSize * 8) / downloadTime;\n  }\n\n  selectQuality(bandwidth, buffer) {\n    // Low buffer → aggressive downgrade:\n    if (buffer < 5) return "360p";\n\n    // Select best quality that fits bandwidth:\n    const qualities = [\n      { name: "1080p", bitrate: 2_800_000 },\n      { name: "720p",  bitrate: 1_400_000 },\n      { name: "480p",  bitrate: 1_000_000 },\n      { name: "360p",  bitrate:   800_000 },\n    ];\n\n    // Use 80% of bandwidth (safety margin):\n    const safeBandwidth = bandwidth * 0.8;\n    return qualities.find(q => q.bitrate <= safeBandwidth)?.name ?? "360p";\n  }\n}',
    },
  ],
  demos: [
    {
      id: 'abr-player',
      label: '📶 Adaptive Bitrate (ABR) Simulation',
      language: 'javascript',
      code: `// Giả lập thuật toán tự động chuyển đổi chất lượng video (ABR) dựa trên mạng
class VideoPlayer {
  constructor() {
    this.bufferSeconds = 15; // Lượng video đã tải sẵn trong bộ đệm (giây)
    this.qualities = [
      { name: '1080p', bitrate: 4500 }, // Bitrate cần: 4500 Kbps
      { name: '720p', bitrate: 2000 },  // Bitrate cần: 2000 Kbps
      { name: '360p', bitrate: 800 }     // Bitrate cần: 800 Kbps
    ];
  }

  // Thuật toán chọn độ phân giải dựa trên băng thông và độ dày buffer
  chooseQuality(bandwidthKbps) {
    console.log(\`\\n📈 [ABR] Băng thông đo được: \${bandwidthKbps} Kbps. Bộ đệm hiện tại: \${this.bufferSeconds}s\`);
    
    // Nếu buffer quá thấp (< 5s), hạ cấp nhanh về chất lượng thấp nhất để tránh buffering
    if (this.bufferSeconds < 5) {
      console.log('⚠️ [Buffer-Cảnh-Báo] Bộ đệm quá thấp! Bắt buộc hạ chất lượng xuống 360p.');
      return '360p';
    }

    // Chọn chất lượng cao nhất không vượt quá 80% băng thông thực tế (safety margin)
    const availableBandwidth = bandwidthKbps * 0.8;
    const selected = this.qualities.find(q => q.bitrate <= availableBandwidth);

    return selected ? selected.name : '360p';
  }

  simulatePlayback(secondsElapsed) {
    this.bufferSeconds -= secondsElapsed;
    if (this.bufferSeconds < 0) this.bufferSeconds = 0;
  }

  loadNextSegment(segmentSizeKb, networkSpeedKbps) {
    const downloadTime = segmentSizeKb / networkSpeedKbps;
    // Nạp thêm 6 giây video sau khi tải xong segment
    this.bufferSeconds += 6; 
    console.log(\`📥 Đã tải xong 1 segment. Thời gian tải: \${downloadTime.toFixed(1)}s. Buffer tăng lên: \${this.bufferSeconds}s\`);
  }
}

const player = new VideoPlayer();

// Mạng cực tốt (6000 Kbps)
let currentQuality = player.chooseQuality(6000);
console.log('=> Độ phân giải đang phát:', currentQuality); // 1080p

// Giả lập mạng bị sụt giảm bất ngờ xuống 1000 Kbps (mất kết nối đột ngột)
player.simulatePlayback(12); // Xem trôi qua 12 giây, không nạp kịp -> Buffer giảm
currentQuality = player.chooseQuality(1000);
console.log('=> Độ phân giải đang phát:', currentQuality); // 360p hoặc 720p tùy buffer`
    },
    {
      id: 'hls-playlist-parser',
      label: '📺 HLS Manifest Parser',
      language: 'javascript',
      code: `// Giả lập Parser phân tích Master Playlist HLS (.m3u8) để lấy luồng video tương ứng
class HlsManifestParser {
  constructor() {
    this.masterM3u8 = \`
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
360p/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1280x720
720p/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=4500000,RESOLUTION=1920x1080
1080p/playlist.m3u8
\`;

    this.mediaPlaylists = {
      '720p': \`
#EXTM3U
#EXT-X-TARGETDURATION:6
#EXTINF:6.0,
segment_001_720.ts
#EXTINF:6.0,
segment_002_720.ts
#EXTINF:5.8,
segment_003_720.ts
      \`
    };
  }

  // Phân tích file master m3u8
  parseMaster() {
    console.log('=== Phân tích Master HLS Manifest ===');
    const lines = this.masterM3u8.split('\\n');
    const streams = [];

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('#EXT-X-STREAM-INF')) {
        const bandwidthMatch = lines[i].match(/BANDWIDTH=(\\d+)/);
        const resolutionMatch = lines[i].match(/RESOLUTION=(.+)/);
        const url = lines[i + 1]?.trim();

        if (bandwidthMatch && url) {
          streams.push({
            bandwidth: parseInt(bandwidthMatch[1]),
            resolution: resolutionMatch ? resolutionMatch[1] : 'Unknown',
            playlistUrl: url
          });
        }
      }
    }
    return streams;
  }

  // Lấy các phân đoạn (segments) nhỏ để player tải
  getSegments(quality) {
    console.log(\`\\n=== Tải Media Playlist cho chất lượng: \${quality} ===\`);
    const playlist = this.mediaPlaylists[quality];
    if (!playlist) return [];

    const lines = playlist.split('\\n');
    const segments = [];
    lines.forEach(line => {
      if (line.endsWith('.ts')) {
        segments.push(line.trim());
      }
    });
    return segments;
  }
}

const parser = new HlsManifestParser();
const streams = parser.parseMaster();
streams.forEach(s => {
  console.log(\`📺 Stream: \${s.resolution} | Băng thông: \${s.bandwidth} bps | Path: \${s.playlistUrl}\`);
});

// Giả lập player chọn chất lượng 720p
const segments = parser.getSegments('720p');
console.log('Danh sách Video Segments cần tải:', segments);`
    }
  ],
  interactive: null,
  callouts: [
    { type: 'warning', icon: '🚫', title: 'Không cho phép upload trực tiếp video lớn', body: 'Tuyệt đối tránh việc upload trực tiếp file video dung lượng lớn qua một API HTTP POST duy nhất. Kết nối mạng chập chờn sẽ khiến upload thất bại hoàn toàn. Hãy luôn sử dụng giao thức Chunk Upload (Multipart Upload) như TUS Protocol.' },
    { type: 'success', icon: '🌐', title: 'CDN Edge Caching tiết kiệm 90% chi phí', body: 'Video là dữ liệu tĩnh. Bằng cách chia nhỏ video thành các phân đoạn (segments) và lưu trữ chúng trên CDN Edge Server, bạn có thể phục vụ hàng triệu người dùng toàn cầu với chi phí hạ tầng Origin Server tối thiểu.' },
    { type: 'info', icon: '📺', title: 'So sánh HLS vs DASH', body: 'HLS (.m3u8) được Apple bảo trợ, tương thích 100% với các thiết bị iOS/macOS. DASH (.mpd) là tiêu chuẩn ISO mở, thân thiện hơn với các hệ điều hành Android, Smart TV và hỗ trợ các công nghệ bảo vệ bản quyền DRM phong phú hơn.' },
    { type: 'tip', icon: '⚡', title: 'Transcoding song song bằng cách chia nhỏ video', body: 'Để giảm thời gian Transcoding cho các video dài (2-3 tiếng), hãy cắt video gốc thành các đoạn nhỏ 5-10 phút, phân phối cho các máy ảo transcode song song, rồi gộp các segment kết quả lại.' }
  ],
  quiz: [
    {
      q: 'Vai trò chính của CDN trong hệ thống video streaming là gì?',
      options: ['Chuyển đổi định dạng video sang nhiều độ phân giải khác nhau', 'Cache và phục vụ các segment video từ edge server gần user nhất để giảm latency', 'Chia file lớn thành nhiều chunk để upload', 'Chọn chất lượng video phù hợp với băng thông của user'],
      answer: 1,
      explain: 'CDN cache content tại edge server gần user, thay vì stream từ origin server xa hàng nghìn km, giúp giảm latency đáng kể.',
    },
    {
      q: 'Khi buffer của player quá thấp (dưới 5s), thuật toán ABR nên làm gì?',
      options: ['Tăng chất lượng lên cao nhất để tận dụng băng thông', 'Dừng phát video hoàn toàn cho tới khi mạng ổn định', 'Chuyển sang giao thức DASH', 'Hạ nhanh xuống chất lượng thấp nhất (360p) để tránh buffering'],
      answer: 3,
      explain: 'Buffer thấp là dấu hiệu nguy cơ giật lag, ABR sẽ hạ cấp nhanh về chất lượng thấp để nạp kịp và tránh buffering.',
    },
    {
      q: 'Điểm khác biệt cơ bản giữa HLS và DASH là gì?',
      options: ['HLS do Apple bảo trợ dùng m3u8, DASH là chuẩn ISO mở dùng file mpd', 'HLS dùng file XML, còn DASH dùng m3u8', 'HLS không hỗ trợ adaptive streaming, chỉ DASH mới có', 'HLS chỉ chạy trên Android, còn DASH chỉ chạy trên iOS'],
      answer: 0,
      explain: 'HLS là protocol của Apple dùng playlist m3u8 (tốt cho iOS/macOS); DASH là chuẩn ISO mở dùng MPD (XML), linh hoạt hơn cho DRM và nhiều nền tảng.',
    },
    {
      q: 'Lợi ích chính của Chunk Upload (Multipart Upload) là gì?',
      options: ['Giảm chi phí băng thông của CDN', 'Tự động chọn độ phân giải video phù hợp', 'Khi kết nối bị đứt, chỉ cần resume từ chunk chưa upload thay vì làm lại từ đầu', 'Nén video để giảm dung lượng lưu trữ'],
      answer: 2,
      explain: 'Chia file thành nhiều chunk giúp upload lại chỉ phần bị lỗi khi mất kết nối, thay vì phải upload lại toàn bộ file lớn.',
    },
  ],
  challenge: {
    brief: 'Thiết kế nền tảng video streaming như YouTube hoặc Netflix: upload, xử lý và phát video mượt cho hàng triệu người xem.',
    scale: ['500 triệu DAU, 1 tỷ giờ xem/ngày', '500 giờ video upload mỗi phút', 'Lưu trữ hàng trăm PB, nhiều quality variant mỗi video', 'p99 thời gian bắt đầu phát (startup) < 2s'],
    requirements: [
      'Upload video lớn ổn định kể cả khi mạng chập chờn',
      'Chuyển đổi video sang nhiều độ phân giải (360p → 4K)',
      'Phát video thích ứng băng thông (adaptive bitrate), ít buffering',
      'Phục vụ nội dung toàn cầu với độ trễ thấp',
    ],
    steps: [
      { title: 'Capacity Estimation', prompt: 'Ước lượng dung lượng lưu trữ, băng thông serve và tải transcoding.', hint: '500 giờ/phút upload; mỗi giờ video ~1GB, tạo ~5 quality variant → dung lượng gốc cộng biến thể tăng nhanh, hàng trăm PB/năm. Băng thông đọc gấp nhiều lần ghi → CDN gánh hơn 90%. Transcoding: 1s video tốn 10-30s xử lý.' },
      { title: 'API Design', prompt: 'Định nghĩa endpoint upload và endpoint lấy luồng phát.', hint: 'POST /upload dạng resumable/chunk (trả upload_id, part URL). GET /videos/{id}/manifest trả master.m3u8 hoặc .mpd; các segment URL trỏ về CDN. GET /videos/{id} trả metadata.' },
      { title: 'Data Model', prompt: 'Thiết kế nơi lưu metadata và nơi lưu video segment.', hint: 'videos(video_id, title, uploader_id, status, duration); video_variants(video_id, resolution, codec, segment_path). Metadata để SQL; raw và segment (2-10s) để object storage (S3) rồi phân phối qua CDN.' },
      { title: 'Upload → Transcode → Deliver Pipeline', prompt: 'Mô tả pipeline từ lúc upload tới khi phát được mượt.', hint: 'Chunk/multipart upload (TUS, tối thiểu 5MB/part) → lưu raw lên S3 → đẩy job vào queue (SQS/Kafka) → transcoding worker (FFmpeg, cắt video dài thành đoạn 5-10 phút để transcode song song) tạo HLS/DASH segment → đẩy lên CDN và invalidate cache.' },
      { title: 'Scale & Trade-offs', prompt: 'Bàn về CDN caching, ABR, HLS vs DASH và chi phí transcoding.', hint: 'CDN chỉ cache segment nhỏ (không cache nguyên file), pre-warm nội dung hot lên edge. ABR chọn quality theo bandwidth và buffer (dùng 80% băng thông làm biên an toàn). HLS (m3u8, tốt cho iOS) vs DASH (mpd, mở, DRM phong phú). Transcoding tốn CPU/GPU → hardware accel (NVENC) và scale worker theo độ dài queue.' },
    ],
    rubric: [
      'Có ước lượng dung lượng lưu trữ, băng thông và tải transcoding',
      'API hỗ trợ resumable/chunk upload và trả manifest trỏ segment về CDN',
      'Data model tách metadata (SQL) và video segment (object storage/CDN)',
      'Mô tả được pipeline upload → transcode → deliver rõ ràng',
      'Nêu được ít nhất 2 trade-offs (HLS vs DASH, CDN caching, ABR, hardware transcoding)',
    ],
  },
}
