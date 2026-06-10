const makeTopic = (slug, order, title, emoji, desc, project, concepts) => ({
  slug, order, title, emoji, description: desc, project,
  problems: [{ icon: '🚧', title: 'Coming Soon', desc: 'Nội dung đang được chuẩn bị.' }],
  concepts,
  demos: [{ id: 'cs', label: '🚧 Coming Soon', language: 'javascript', code: `console.log('${title}');` }],
  interactive: null,
  callouts: [{ type: 'info', icon: '🚧', title: 'Đang phát triển', body: `Demos cho "${title}" đang được chuẩn bị!` }],
})

export default makeTopic(
  'service-discovery', 15, 'Service Discovery', '🗺️',
  'Registry và Health Check cho microservices tự động tìm thấy nhau.',
  'Microservice Platform.',
  [
    {
      name: 'Service Registry',
      icon: '📒',
      explain: 'Service Registry là database lưu danh sách tất cả services và addresses của chúng (IP:port). Services register khi startup, deregister khi shutdown. Clients query registry để tìm service cần gọi. Consul, Eureka, etcd là các registry phổ biến.',
      tip: 'Service Registry nên highly available (cluster mode). Nếu registry down → services không thể discover nhau. Clients thường cache registry data để chịu được downtime ngắn.',
      example: '// Service registration (khi startup):\nconsul.agent.service.register({\n  name: "payment-service",\n  id: "payment-service-1",\n  address: "10.0.0.5",\n  port: 8080,\n  tags: ["payment", "v2"],\n  check: {\n    http: "http://10.0.0.5:8080/health",\n    interval: "10s"\n  }\n});\n\n// Client discovery:\nconst services = await consul.health.service("payment-service");\nconst healthy = services.filter(s => s.Checks.every(c => c.Status === "passing"));\nconst service = healthy[Math.floor(Math.random() * healthy.length)];\nconst url = `http://${service.Service.Address}:${service.Service.Port}`;',
    },
    {
      name: 'Health Check',
      icon: '❤️',
      explain: 'Health Check là endpoint mà orchestrator/registry dùng để biết service có đang hoạt động không. /health endpoint trả về status của service và dependencies (DB, cache, external APIs). Kubernetes dùng Liveness Probe và Readiness Probe.',
      tip: 'Liveness Probe: service còn sống không? (restart nếu fail). Readiness Probe: service sẵn sàng nhận traffic không? (remove from load balancer nếu fail). Startup Probe: cho slow-starting services.',
      example: '// Express health check endpoint:\napp.get("/health", async (req, res) => {\n  const checks = {\n    status: "ok",\n    timestamp: new Date().toISOString(),\n    dependencies: {}\n  };\n\n  // Check database:\n  try {\n    await db.query("SELECT 1");\n    checks.dependencies.database = "ok";\n  } catch {\n    checks.dependencies.database = "error";\n    checks.status = "degraded";\n  }\n\n  // Check Redis:\n  try {\n    await redis.ping();\n    checks.dependencies.redis = "ok";\n  } catch {\n    checks.dependencies.redis = "error";\n    checks.status = "degraded";\n  }\n\n  res.status(checks.status === "ok" ? 200 : 503).json(checks);\n});',
    },
    {
      name: 'Consul',
      icon: '🏛️',
      explain: 'Consul là distributed service mesh tool của HashiCorp: service discovery, health checking, KV store, và service mesh. Dùng Raft consensus cho consistency. Hỗ trợ DNS và HTTP API. Multi-datacenter support. Sidecar proxy (Envoy) cho service mesh.',
      tip: 'Consul agent chạy trên mỗi node (sidecar). Dùng Consul Template để tự động update config files (nginx, haproxy) khi service registry thay đổi.',
      example: '# Consul service definition (service.json):\n{\n  "service": {\n    "name": "web-api",\n    "tags": ["rails", "v2"],\n    "port": 3000,\n    "check": {\n      "http": "http://localhost:3000/health",\n      "interval": "10s",\n      "timeout": "1s"\n    }\n  }\n}\n\n# DNS discovery:\n# web-api.service.consul → resolved to healthy IPs\n$ dig web-api.service.consul\n# → 10.0.0.1, 10.0.0.2 (only healthy instances)',
    },
    {
      name: 'Eureka',
      icon: '🔭',
      explain: 'Netflix Eureka là service registry và discovery server. Services register với Eureka Server. Clients dùng Eureka Client để discover và load-balance. Spring Cloud Eureka tích hợp sẵn với Spring Boot. Ưu tiên availability over consistency (AP trong CAP theorem).',
      tip: 'Eureka có Self-Preservation Mode: nếu nhiều services heartbeat fail cùng lúc → không evict chúng (assume network partition, không phải service down). Cần disable trong development.',
      example: '// Spring Boot Eureka Server:\n@SpringBootApplication\n@EnableEurekaServer\npublic class EurekaServerApp { ... }\n\n// Spring Boot Service (Client):\n@SpringBootApplication\n@EnableEurekaClient\npublic class PaymentService { ... }\n\n// application.yml:\neureka:\n  client:\n    serviceUrl:\n      defaultZone: http://eureka:8761/eureka/\n  instance:\n    preferIpAddress: true\n    leaseRenewalIntervalInSeconds: 10\n\n// Discovery:\n@Autowired EurekaClient eurekaClient;\nInstanceInfo instance = eurekaClient.getNextServerFromEureka("PAYMENT-SERVICE", false);',
    },
    {
      name: 'DNS Discovery',
      icon: '🌐',
      explain: 'DNS-based Service Discovery dùng DNS để resolve service names thành IPs. Kubernetes CoreDNS: service name → ClusterIP. Consul DNS: service.consul → healthy instances. Load balancing ở DNS level (multiple A records). Đơn giản nhất – không cần client library.',
      tip: 'DNS TTL phải ngắn (vài giây) để clients cập nhật nhanh khi service thay đổi. DNS caching ở client side có thể gây issues – dùng InetAddress.setDefaultUseCaches(false) trong Java.',
      example: '// Kubernetes DNS:\n# Service: payment-service trong namespace default\n# DNS name: payment-service.default.svc.cluster.local\n\n# Gọi service đơn giản:\nconst response = await fetch("http://payment-service/api/charge");\n// CoreDNS resolve: payment-service → 10.96.0.10 (ClusterIP)\n// ClusterIP load balance đến Pods\n\n# Cross-namespace:\n# http://payment-service.payments.svc.cluster.local\n\n# Headless service (trả về Pod IPs thay vì ClusterIP):\nspec:\n  clusterIP: None  # Headless\n# → DNS trả về IPs của tất cả healthy Pods trực tiếp',
    },
  ]
)
