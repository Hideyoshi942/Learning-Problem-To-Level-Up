const stub = (slug, order, title, emoji, description, project, problems, concepts) => ({
  slug, order, title, emoji, description, project, problems, concepts,
  demos: [{ id: 'coming-soon', label: '🚧 Coming Soon', language: 'javascript', code: `console.log('${title} – coming soon!');` }],
  interactive: null,
  callouts: [{ type: 'info', icon: '🚧', title: 'Đang phát triển', body: `Nội dung cho "${title}" đang được chuẩn bị!` }],
})

export default stub(
  'rate-limiting', 7, 'Rate Limiting', '🚦',
  'Rate Limiting bảo vệ API khỏi bị lạm dụng và DDoS. Token Bucket, Leaky Bucket, Sliding Window là 3 thuật toán phổ biến nhất.',
  'API Gateway.',
  [
    { icon: '🔥', title: 'API bị abuse', desc: 'Bot gọi API hàng nghìn lần/giây, làm hệ thống quá tải.' },
    { icon: '💸', title: 'Cost overrun', desc: 'Unlimited API calls tăng chi phí cloud không kiểm soát.' },
  ],
  ['Token Bucket', 'Leaky Bucket', 'Sliding Window Log', 'Sliding Window Counter', 'Fixed Window', 'Redis Rate Limiter'],
)
