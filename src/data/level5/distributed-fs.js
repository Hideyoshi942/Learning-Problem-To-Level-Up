export default {
  slug: 'distributed-fs',
  order: 29,
  title: 'Distributed File Storage',
  emoji: '📁',
  description: 'Replication, consistency, erasure coding cho distributed storage.',
  project: 'File Storage.',
  problems: [
    { icon: '🐘', title: 'Nghẽn NameNode do quá nhiều file nhỏ', desc: 'HDFS lưu toàn bộ metadata (tên file, cấu trúc block) trong RAM của NameNode. Hàng triệu file nhỏ (<1MB) sẽ nhanh chóng vắt kiệt bộ nhớ của NameNode.' },
    { icon: '🔄', title: 'Xung đột ghi đồng thời (Concurrent Write Conflict)', desc: 'Khi nhiều client cùng ghi vào một file phân tán, việc giữ cho dữ liệu nhất quán trên các bản sao (replicas) mà không làm giảm băng thông là cực kỳ phức tạp.' },
    { icon: '⚡', title: 'Hỏng ổ đĩa hàng loạt (Corrupted Blocks)', desc: 'Trong các cluster chứa hàng ngàn ổ đĩa, tỷ lệ hỏng ổ cứng hàng ngày là rất cao. Nếu số node sập đồng thời vượt quá số bản sao, dữ liệu sẽ mất vĩnh viễn.' }
  ],
  concepts: [
    {
      name: 'Replication Factor',
      icon: '📑',
      explain: 'Replication Factor (RF) là số copies của mỗi data block trong distributed file system. HDFS default RF=3: data stored on 3 DataNodes. Nếu 1 node fail → 2 còn lại. RF=3 tolerate tối đa 2 node failures. Trade-off: RF cao → storage cost cao, RF thấp → ít durable hơn.',
      tip: 'RF=3 là tiêu chuẩn cho production. Rack-aware replication: đặt replicas trên different racks để survive rack-level failures. AWS S3 replicate across 3 AZs (11 nines durability).',
      example: '// HDFS Replication:\n// File: video.mp4 (1GB) với RF=3\n// HDFS chia thành blocks (128MB mặc định):\n// Block 1 → DataNode 1 (Rack A), DataNode 3 (Rack B), DataNode 5 (Rack C)\n// Block 2 → DataNode 2 (Rack A), DataNode 4 (Rack B), DataNode 6 (Rack C)\n// ...\n\n// Thay đổi RF:\nhadoop fs -setrep -w 5 /user/data/important.parquet\n// → 5 copies cho critical data!\n\n// Check replication status:\nhdfs fsck /user/data -files -blocks -locations\n// → Shows block locations và missing replicas',
    },
    {
      name: 'Erasure Coding',
      icon: '⚙️',
      explain: 'Erasure Coding là alternative cho replication: thay vì lưu N copies, chia data thành k data blocks + m parity blocks (k+m blocks total). Có thể recover data từ bất kỳ k blocks nào trong k+m. Reed-Solomon (8+4) = 12 blocks nhưng chỉ cần 8 để recover → 50% overhead thay vì 200% với RF=3.',
      tip: 'Erasure Coding tiết kiệm storage đáng kể (50% vs 200% overhead). Nhưng: recovery phức tạp hơn (đọc k nodes, compute), higher read latency, higher CPU usage. Phù hợp cho cold/warm storage.',
      example: '// Reed-Solomon (6, 3): 6 data + 3 parity = 9 chunks\n// Có thể recover khi mất bất kỳ 3 chunks nào\n\n// Encoding:\nconst encoder = new ReedSolomon(6, 3);\nconst dataChunks = splitFile(file, 6); // 6 equal parts\nconst [d1,d2,d3,d4,d5,d6] = dataChunks;\nconst [p1,p2,p3] = encoder.encode(dataChunks);\n// Lưu 9 chunks trên 9 nodes khác nhau\n\n// Recovery khi mất chunks 2 và 5:\nconst available = [d1, null, d3, d4, null, d6, p1, p2, p3];\nconst recovered = encoder.decode(available);\n// → Original file recovered! ✅\n// Storage overhead: 9/6 = 1.5x (vs 3x với RF=3)',
    },
    {
      name: 'Consistency',
      icon: '🔄',
      explain: 'Distributed storage consistency models: Strong Consistency (mọi read thấy latest write – Amazon S3 default từ 2020), Eventual Consistency (reads eventually consistent – DynamoDB default), Read-after-Write Consistency (read ngay sau write thấy data mới). CAP theorem: không thể có cả 3: Consistency, Availability, Partition tolerance.',
      tip: 'Amazon S3 có Strong Consistency miễn phí từ Dec 2020. HDFS: strong consistency (single writer). GCS: strong consistency. Object storage thường strong, NoSQL thường tunable.',
      example: '// Consistency levels trong Cassandra:\n// Write CL=QUORUM: ghi vào majority nodes\n// Read CL=QUORUM: đọc từ majority nodes\n// → Strong consistency (W + R > RF)\n\nconst session = cassandra.connect();\nawait session.execute(\n  "INSERT INTO files (id, data) VALUES (?, ?)",\n  [fileId, data],\n  { consistency: cassandra.types.consistencies.quorum } // Write to majority\n);\n\nconst result = await session.execute(\n  "SELECT data FROM files WHERE id=?",\n  [fileId],\n  { consistency: cassandra.types.consistencies.quorum } // Read from majority\n);\n// W=2 + R=2 > RF=3 → Always reads latest write! ✅',
    },
    {
      name: 'HDFS',
      icon: '🐘',
      explain: 'HDFS (Hadoop Distributed File System) là distributed file system của Apache Hadoop. Architecture: 1 NameNode (metadata: file names, blocks, locations) + nhiều DataNodes (actual data blocks). Write-once-read-many pattern. Optimized cho large files, sequential reads. Block size mặc định 128MB.',
      tip: 'HDFS NameNode là single point of failure → cần HA NameNode (Active + Standby). Không phù hợp cho small files (nhiều small files overload NameNode metadata). Dùng Sequence Files hoặc ORC để bundle small files.',
      example: '// HDFS Architecture:\n// Client → NameNode: "Write file video.mp4"\n// NameNode: "Split into blocks, store on DN1, DN2, DN3"\n// Client → DN1: write block 1\n// DN1 → DN2 → DN3: pipeline replication\n\n// HDFS Commands:\nhadoop fs -put localfile.mp4 /user/hadoop/videos/  # Upload\nhadoop fs -get /user/hadoop/videos/video.mp4 .     # Download\nhadoop fs -ls /user/hadoop/videos/                  # List\nhadoop fs -du -h /user/hadoop/                      # Disk usage\n\n// Java API:\nFileSystem fs = FileSystem.get(conf);\nFSDataOutputStream out = fs.create(new Path("/video.mp4"));\nFileUtils.copyFile(localFile, out);',
    },
    {
      name: 'Object Storage',
      icon: '☁️',
      explain: 'Object Storage (S3, GCS, Azure Blob) lưu data dưới dạng objects trong flat namespace (không phải hierarchy). Mỗi object có: key (path), data, metadata, version. Hầu hết scalable, strongly consistent (S3 2020+), với 11 nines durability. REST API. Tối ưu cho large unstructured data.',
      tip: 'Object Storage rẻ hơn Block Storage 5-10x. Dùng cho: media files, backups, data lake, static website hosting. Nhược điểm: không mount như filesystem, không support random writes (immutable objects).',
      example: '// AWS S3 operations:\nimport { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";\n\nconst s3 = new S3Client({ region: "ap-southeast-1" });\n\n// Upload:\nawait s3.send(new PutObjectCommand({\n  Bucket: "my-bucket",\n  Key: "videos/2024/movie.mp4",  // Flat key, not real path!\n  Body: fileBuffer,\n  ContentType: "video/mp4",\n  Metadata: { "uploaded-by": "user-123" }\n}));\n\n// Presigned URL (allow direct upload from browser):\nconst url = await getSignedUrl(s3, new PutObjectCommand({\n  Bucket: "my-bucket", Key: "uploads/video.mp4"\n}), { expiresIn: 3600 }); // 1 hour\n// Client uploads directly to S3 (không qua server)',
    },
  ],
  demos: [
    {
      id: 'hdfs-metadata',
      label: '📂 HDFS NameNode Metadata Sim',
      language: 'javascript',
      code: `// Giả lập cơ chế điều phối Metadata của NameNode và Đọc ghi từ DataNodes trong HDFS
class NameNode {
  constructor() {
    this.fileRegistry = new Map(); // path -> list of block ids
    this.blockLocations = new Map(); // blockId -> list of DataNodes
  }

  registerFile(path, blockCount, dataNodes) {
    const blocks = [];
    for (let i = 0; i < blockCount; i++) {
      const blockId = \`blk_\${Math.floor(Math.random() * 100000)}\`;
      blocks.push(blockId);

      // Lưu phân phối bản sao (Replication Factor = 3)
      const shuffledNodes = [...dataNodes].sort(() => 0.5 - Math.random());
      const replicas = shuffledNodes.slice(0, 3);
      this.blockLocations.set(blockId, replicas);
    }
    this.fileRegistry.set(path, blocks);
    console.log(\`📂 [NameNode] Đã đăng ký file: \${path} với \${blockCount} blocks.\`);
  }

  getFileBlocks(path) {
    const blockIds = this.fileRegistry.get(path);
    if (!blockIds) return null;

    return blockIds.map(bid => ({
      blockId: bid,
      locations: this.blockLocations.get(bid)
    }));
  }
}

const dataNodes = ['DN-1', 'DN-2', 'DN-3', 'DN-4', 'DN-5'];
const nameNode = new NameNode();

// Client tải lên 1 file lớn chia thành 2 block (e.g. 256MB)
nameNode.registerFile('/data/users.csv', 2, dataNodes);

// Client khác muốn đọc file này
console.log('\\n=== Client Đọc File ===');
const queryResult = nameNode.getFileBlocks('/data/users.csv');

queryResult.forEach((b, idx) => {
  console.log(\`📦 Block \${idx + 1} (\${b.blockId}):\`);
  console.log(\`   -> Vị trí lưu trữ DataNode bản sao: \`, b.locations.join(', '));
  console.log(\`   -> Đang tải block trực tiếp từ DataNode đầu tiên: \${b.locations[0]}...\`);
});`
    },
    {
      id: 'erasure-coding',
      label: '⚙️ Erasure Coding (Data + Parity)',
      language: 'javascript',
      code: `// Giả lập cơ chế phục hồi dữ liệu dùng Erasure Coding (Cơ bản)
class SimpleErasureCoding {
  constructor(dataChunks = 3, parityChunks = 2) {
    this.k = dataChunks;
    this.m = parityChunks;
  }

  // Tạo Parity chunks đơn giản bằng thuật toán XOR (Chỉ minh họa nguyên lý)
  encode(data) {
    if (data.length !== this.k) throw new Error('Data size mismatch');

    // Chuyển ký tự thành mã số để tính toán
    const dataVals = data.map(c => c.charCodeAt(0));
    
    // Parity 1: XOR chéo toàn bộ dữ liệu
    const p1Val = dataVals.reduce((acc, val) => acc ^ val, 0);
    // Parity 2: XOR dịch chuyển để tạo tính đa dạng
    const p2Val = dataVals.reduce((acc, val) => acc ^ (val + 1), 0);

    const parity = [String.fromCharCode(p1Val), String.fromCharCode(p2Val)];
    return { data, parity };
  }

  // Khôi phục nếu bị mất tối đa m chunks
  recover(chunks) {
    console.log('\\n=== Phục hồi dữ liệu ===');
    console.log('Các chunks nhận được:', chunks.map(c => c ? c : '❌ [Mất]').join(', '));
    
    const missingCount = chunks.filter(c => c === null).length;
    if (missingCount > this.m) {
      console.log('🚨 Quá số lượng chunks lỗi! Không thể khôi phục dữ liệu.');
      return null;
    }

    // Giả lập thuật toán khôi phục dữ liệu gốc
    console.log('✅ Khôi phục thành công dữ liệu gốc: "A, B, C"');
    return ['A', 'B', 'C'];
  }
}

const ec = new SimpleErasureCoding(3, 2);
const fileData = ['A', 'B', 'C'];

console.log('Dữ liệu gốc:', fileData.join(', '));
const encoded = ec.encode(fileData);
console.log('Parity chunks được sinh ra:', encoded.parity.join(', '));

// Giả lập mất mát chunk ở node thứ 2 và node thứ 4 (Parity 1)
const receivedChunks = ['A', null, 'C', null, 'Y']; 
ec.recover(receivedChunks);`
    }
  ],
  callouts: [
    { type: 'warning', icon: '⚠️', title: 'Hạn chế lưu hàng triệu file nhỏ trên HDFS', body: 'NameNode giữ toàn bộ metadata trong bộ nhớ RAM để đảm bảo truy xuất nhanh. Mỗi file bất kể lớn nhỏ đều tiêu tốn ~150 bytes RAM. Lưu quá nhiều file nhỏ sẽ làm NameNode hết bộ nhớ trước khi ổ đĩa DataNode đầy.' },
    { type: 'success', icon: '☁️', title: 'Độ bền vượt trội 11 số 9 của S3', body: 'AWS S3 đảm bảo độ bền dữ liệu 99.999999999% bằng cách tự động sao chép và đồng bộ tệp tin qua ít nhất 3 vùng sẵn sàng (Availability Zones) hoàn toàn cách biệt địa lý.' },
    { type: 'info', icon: '📁', title: 'Phân biệt Object Storage vs Block Storage', body: 'Block Storage (như AWS EBS) hoạt động ở tầng hệ điều hành, cho phép đọc/ghi ngẫu nhiên trên phân vùng đĩa. Object Storage là Flat Key-Value, dữ liệu là bất biến (Immutable), không hỗ trợ ghi đè một đoạn giữa tệp.' },
    { type: 'tip', icon: '🏗️', title: 'Lắp cấu hình Rack-Awareness giảm thiểu rủi ro', body: 'Hãy cấu hình Rack-Awareness trong HDFS để đảm bảo bản sao block được phân phối trên các tủ Rack mạng khác nhau. Điều này giúp hệ thống sống sót ngay cả khi cả một tủ rack bị sập nguồn hoặc đứt switch.' }
  ],
  quiz: [
    {
      q: 'Với Replication Factor RF=3, hệ thống chịu được tối đa bao nhiêu node failures?',
      options: ['3 node failures cùng lúc', 'Tối đa 2 node failures', 'Chỉ 1 node failure duy nhất', 'Không giới hạn số node failures'],
      answer: 1,
      explain: 'RF=3 lưu 3 copies của mỗi block, nên nếu mất 2 node vẫn còn 1 copy để phục vụ; do đó chịu được tối đa 2 node failures.',
    },
    {
      q: 'Ưu điểm chính của Erasure Coding so với replication truyền thống là gì?',
      options: ['Reed-Solomon dạng 8+4 chỉ tốn khoảng 50% overhead thay vì 200% như RF=3', 'Luôn cần tới 300% storage overhead cho mọi cấu hình', 'Không cần sinh ra bất kỳ parity block nào', 'Recovery đơn giản và nhanh hơn hẳn so với replication'],
      answer: 0,
      explain: 'Erasure Coding chia data thành k data blocks và m parity blocks, chỉ cần bất kỳ k blocks để recover, giúp overhead khoảng 50% thay vì 200% của RF=3.',
    },
    {
      q: 'Điểm yếu nào của HDFS cần được khắc phục bằng thiết kế phù hợp?',
      options: ['DataNode phải lưu toàn bộ metadata của cả cluster', 'HDFS chỉ hỗ trợ các file nhỏ dưới 1MB', 'NameNode là single point of failure nên cần HA NameNode (Active và Standby)', 'HDFS hoàn toàn không hỗ trợ cơ chế replication'],
      answer: 2,
      explain: 'Kiến trúc HDFS có 1 NameNode giữ metadata, đây là single point of failure nên cần HA NameNode dạng Active cộng Standby để đảm bảo tính sẵn sàng.',
    },
    {
      q: 'Đặc điểm nào đúng với Object Storage như S3, GCS?',
      options: ['Hỗ trợ ghi ngẫu nhiên (random writes) vào giữa một object', 'Lưu data theo cấu trúc phân cấp thư mục như filesystem thông thường', 'Đắt hơn Block Storage khoảng 5-10 lần', 'Lưu data dạng objects trong flat namespace, immutable, không hỗ trợ random writes'],
      answer: 3,
      explain: 'Object Storage lưu data dưới dạng objects trong flat namespace (key phẳng, không phải hierarchy), objects là immutable và không hỗ trợ random writes.',
    },
  ],
  challenge: {
    brief: 'Thiết kế một distributed file storage như GFS/HDFS: lưu file cực lớn, bền vững và chịu được hỏng ổ đĩa hàng loạt.',
    scale: ['100 PB tổng dung lượng', '10.000 DataNode trong cluster', 'File đơn lẻ tới hàng TB', 'Độ bền dữ liệu 11 số 9 (99.999999999%)'],
    requirements: [
      'Lưu file lớn bằng cách chia thành block/chunk',
      'Đảm bảo durability khi ổ đĩa hoặc node hỏng',
      'Quản lý metadata (file → block → vị trí) tập trung',
      'Tối ưu chi phí lưu trữ cho dữ liệu nguội (tuỳ chọn)',
    ],
    steps: [
      { title: 'Capacity Estimation', prompt: 'Ước lượng số block, dung lượng metadata và overhead lưu trữ.', hint: 'Block 128MB → 100PB ≈ 800 triệu block. Mỗi block metadata ~150 bytes → ~120GB RAM cho master. RF=3 → overhead 200%; erasure coding (8+4) → overhead chỉ 50%.' },
      { title: 'API Design', prompt: 'Định nghĩa thao tác read/write file và luồng ghi đi qua master.', hint: 'write(path, data), read(path, offset, len), append(path, data). Client hỏi master để lấy vị trí block rồi đọc/ghi trực tiếp với DataNode. Ghi theo pipeline replication qua các replica.' },
      { title: 'Data Model', prompt: 'Thiết kế metadata cho namespace và ánh xạ block → node.', hint: 'Master lưu path → danh sách blockId; blockId → danh sách DataNode (replica). Namespace dạng cây thư mục. Metadata giữ trong RAM để truy xuất nhanh, kèm edit log và checkpoint để phục hồi.' },
      { title: 'Replication & Durability', prompt: 'Thiết kế replication, phát hiện block hỏng và cân nhắc erasure coding.', hint: 'RF=3 rack-aware (đặt replica trên rack khác nhau) chịu được 2 node fail. Heartbeat và checksum phát hiện block hỏng rồi tự re-replicate. Erasure coding Reed-Solomon (k=8, m=4) cho cold data để tiết kiệm dung lượng.' },
      { title: 'Scale & Trade-offs', prompt: 'Xử lý single point of failure của master và vấn đề nhiều file nhỏ.', hint: 'Master là single point of failure → HA master (Active và Standby, chung edit log). Nhiều file nhỏ vắt kiệt RAM master → gom lại bằng SequenceFile/ORC. Trade-off: RF (nhanh, tốn dung lượng) vs erasure coding (rẻ, recovery tốn CPU và độ trễ cao).' },
    ],
    rubric: [
      'Có ước lượng số block, dung lượng metadata và overhead lưu trữ',
      'API và luồng ghi qua master rồi tới DataNode rõ ràng',
      'Mô tả đúng metadata namespace và ánh xạ block → node',
      'Nêu cơ chế replication rack-aware và/hoặc erasure coding kèm con số',
      'Xử lý được single point of failure của master và vấn đề file nhỏ',
    ],
  },
}
