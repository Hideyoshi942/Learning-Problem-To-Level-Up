// Central registry – import all levels & topics here
// Thêm level mới: chỉ cần import và thêm vào LEVELS array

import sql        from './level1/sql.js'
import search     from './level1/search.js'
import pagination from './level1/pagination.js'
import transaction from './level1/transaction.js'
import n1query    from './level1/n1query.js'

import caching        from './level2/caching.js'
import rateLimiting   from './level2/rate-limiting.js'
import idempotency    from './level2/idempotency.js'
import distributedLock from './level2/distributed-lock.js'
import messageQueue   from './level2/message-queue.js'

// Level 3–5 stubs (sẽ thêm nội dung dần)
import distributedTransaction from './level3/distributed-transaction.js'
import eventDriven            from './level3/event-driven.js'
import eventSourcing          from './level3/event-sourcing.js'
import cqrs                   from './level3/cqrs.js'
import serviceDiscovery       from './level3/service-discovery.js'

import dbReplication   from './level4/db-replication.js'
import sharding        from './level4/sharding.js'
import consistentHash  from './level4/consistent-hashing.js'
import leaderElection  from './level4/leader-election.js'
import distributedCache from './level4/distributed-cache.js'

import urlShortener    from './level5/url-shortener.js'
import chatSystem      from './level5/chat-system.js'
import newsFeed        from './level5/news-feed.js'
import videoStreaming  from './level5/video-streaming.js'
import rideHailing     from './level5/ride-hailing.js'
import paymentGateway  from './level5/payment-gateway.js'
import ticketBooking   from './level5/ticket-booking.js'
import searchEngine    from './level5/search-engine.js'
import distributedFS   from './level5/distributed-fs.js'
import recommendation  from './level5/recommendation.js'

import apiDesign         from './level6/api-design.js'
import security          from './level6/security.js'
import observability     from './level6/observability.js'
import testing           from './level6/testing.js'
import cicdDeploy        from './level6/cicd-deploy.js'

import resilience        from './level7/resilience.js'
import consensus         from './level7/consensus.js'
import consistencyModels from './level7/consistency-models.js'

export const LEVELS = [
  {
    id: 1,
    title: 'Backend Fundamentals',
    emoji: '🗄️',
    color: 'var(--level1-color)',
    description: 'Nền tảng cốt lõi của mọi Backend Engineer: SQL, Search, Pagination, Transaction, N+1.',
    topics: [sql, search, pagination, transaction, n1query],
  },
  {
    id: 2,
    title: 'Scalability',
    emoji: '📈',
    color: 'var(--level2-color)',
    description: 'Kỹ thuật scale hệ thống: Caching, Rate Limiting, Idempotency, Distributed Lock, Message Queue.',
    topics: [caching, rateLimiting, idempotency, distributedLock, messageQueue],
  },
  {
    id: 3,
    title: 'Distributed Systems',
    emoji: '🌐',
    color: 'var(--level3-color)',
    description: 'Hệ thống phân tán: Distributed Transaction, Event-Driven, Event Sourcing, CQRS, Service Discovery.',
    topics: [distributedTransaction, eventDriven, eventSourcing, cqrs, serviceDiscovery],
  },
  {
    id: 4,
    title: 'High Scale Systems',
    emoji: '🚀',
    color: 'var(--level4-color)',
    description: 'Hệ thống quy mô lớn: DB Replication, Sharding, Consistent Hashing, Leader Election.',
    topics: [dbReplication, sharding, consistentHash, leaderElection, distributedCache],
  },
  {
    id: 5,
    title: 'System Design',
    emoji: '🏗️',
    color: 'var(--level5-color)',
    description: 'Design các hệ thống thực tế: URL Shortener, Chat, News Feed, Video Streaming, Ride Hailing...',
    topics: [urlShortener, chatSystem, newsFeed, videoStreaming, rideHailing, paymentGateway, ticketBooking, searchEngine, distributedFS, recommendation],
  },
  {
    id: 6,
    title: 'Production Readiness',
    emoji: '🛠️',
    color: 'var(--level6-color)',
    description: 'Sẵn sàng vận hành production: API Design, Security & Auth, Observability, Testing, CI/CD & Deployment.',
    topics: [apiDesign, security, observability, testing, cicdDeploy],
  },
  {
    id: 7,
    title: 'Reliability & Consensus',
    emoji: '🎯',
    color: 'var(--level7-color)',
    description: 'Độ tin cậy & đồng thuận (senior): Resilience Patterns, Consensus (Raft/Paxos), Consistency Models.',
    topics: [resilience, consensus, consistencyModels],
  },
]

// Flat lookup map: "levelId:slug" → topic
export const TOPIC_MAP = {}
for (const level of LEVELS) {
  for (const topic of level.topics) {
    TOPIC_MAP[`${level.id}:${topic.slug}`] = { ...topic, levelId: level.id }
  }
}

export function getTopic(levelId, slug) {
  return TOPIC_MAP[`${levelId}:${slug}`] ?? null
}

export function getLevel(levelId) {
  return LEVELS.find((l) => l.id === Number(levelId)) ?? null
}

export const TOTAL_TOPICS = LEVELS.reduce((s, l) => s + l.topics.length, 0)
