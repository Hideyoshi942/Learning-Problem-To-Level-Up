export default {
  slug: 'service-discovery',
  order: 15,
  title: 'Service Discovery',
  emoji: '🗺️',
  description: 'Registry và Health Check cho microservices tự động tìm thấy nhau.',
  project: 'Microservice Platform.',
  problems: [
    { icon: '🔧', title: 'Hardcoded IP addresses', desc: 'Khi scale thêm instances hoặc restart service, IP thay đổi. Config hardcoded cần update thủ công → downtime và lỗi.' },
    { icon: '💀', title: 'Không biết service nào đang sống', desc: 'Load balancer gửi traffic đến unhealthy instances → request fail. Cần tự động phát hiện và loại bỏ bad instances.' },
    { icon: '🌐', title: 'Multi-environment complexity', desc: 'Dev, staging, production có addresses khác nhau. Quản lý config cho nhiều environments rất phức tạp và error-prone.' },
  ],
  concepts: [
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
  ],
  demos: [
    {
      id: 'service-registry-demo',
      label: '📒 Service Registry',
      language: 'javascript',
      code: `// Service Registry Simulation
// Minh họa: Auto-discovery + Health Check + Load Balancing

class ServiceRegistry {
  constructor() {
    this.services = new Map(); // name → [instances]
    this.healthChecks = new Map();
  }

  register(name, instance) {
    if (!this.services.has(name)) this.services.set(name, []);
    const instances = this.services.get(name);
    
    const entry = {
      id: \`\${name}-\${instance.host}-\${instance.port}\`,
      ...instance,
      status: 'healthy',
      registeredAt: Date.now(),
      lastHeartbeat: Date.now()
    };
    
    instances.push(entry);
    console.log(\`  📝 Registered: \${entry.id} (\${instance.host}:\${instance.port})\`);
    return entry;
  }

  deregister(name, instanceId) {
    const instances = this.services.get(name) || [];
    const idx = instances.findIndex(i => i.id === instanceId);
    if (idx !== -1) {
      instances.splice(idx, 1);
      console.log(\`  ❌ Deregistered: \${instanceId}\`);
    }
  }

  markUnhealthy(name, instanceId) {
    const instances = this.services.get(name) || [];
    const instance = instances.find(i => i.id === instanceId);
    if (instance) {
      instance.status = 'unhealthy';
      console.log(\`  💀 Marked unhealthy: \${instanceId}\`);
    }
  }

  discover(name) {
    const instances = this.services.get(name) || [];
    const healthy = instances.filter(i => i.status === 'healthy');
    
    if (healthy.length === 0) throw new Error(\`No healthy instances for \${name}\`);
    
    // Round-robin load balancing
    const instance = healthy[Math.floor(Math.random() * healthy.length)];
    return instance;
  }

  listAll() {
    console.log('\\n📋 Registry State:');
    for (const [name, instances] of this.services) {
      console.log(\`  [\${name}] \${instances.length} instances:\`);
      instances.forEach(i => {
        const icon = i.status === 'healthy' ? '✅' : '❌';
        console.log(\`    \${icon} \${i.id} (\${i.host}:\${i.port})\`);
      });
    }
  }
}

// === Demo: Microservice Platform ===
const registry = new ServiceRegistry();

console.log('=== Services Starting Up ===');
registry.register('payment-service', { host: '10.0.0.1', port: 8080, version: 'v2' });
registry.register('payment-service', { host: '10.0.0.2', port: 8080, version: 'v2' });
registry.register('payment-service', { host: '10.0.0.3', port: 8080, version: 'v2' });
registry.register('inventory-service', { host: '10.0.1.1', port: 9090, version: 'v1' });
registry.register('inventory-service', { host: '10.0.1.2', port: 9090, version: 'v1' });

registry.listAll();

// Simulate health check failure
console.log('\\n=== Health Check: 10.0.0.2 fails ===');
registry.markUnhealthy('payment-service', 'payment-service-10.0.0.2-8080');
registry.listAll();

// Client discovers service (only gets healthy instances)
console.log('\\n=== Client Discovering payment-service (5 calls) ===');
for (let i = 0; i < 5; i++) {
  const instance = registry.discover('payment-service');
  console.log(\`  Call \${i+1}: routed to \${instance.host}:\${instance.port}\`);
}`,
    },
    {
      id: 'health-check-demo',
      label: '❤️ Health Check',
      language: 'javascript',
      code: `// Health Check Pattern
// Kubernetes-style Liveness & Readiness Probes

class ServiceInstance {
  constructor(name, config = {}) {
    this.name = name;
    this.isAlive = true;         // Liveness
    this.isReady = false;        // Readiness (false until startup done)
    this.startupTime = config.startupTime || 2000;
    this.dependencies = {
      database: 'ok',
      redis: 'ok',
      externalApi: 'ok'
    };
    this.requestCount = 0;
    this.startTime = Date.now();
  }

  // Startup simulation
  async startup() {
    console.log(\`  🚀 \${this.name} starting (takes \${this.startupTime}ms)...\`);
    await new Promise(r => setTimeout(r, this.startupTime));
    this.isReady = true;
    console.log(\`  ✅ \${this.name} is ready!\`);
  }

  // Liveness: is the process alive?
  livenessCheck() {
    return {
      alive: this.isAlive,
      uptime: Date.now() - this.startTime,
      pid: Math.floor(Math.random() * 9999) + 1000 // simulated PID
    };
  }

  // Readiness: can it serve traffic?
  readinessCheck() {
    const depStatus = Object.values(this.dependencies).every(s => s === 'ok');
    const ready = this.isReady && depStatus;

    return {
      ready,
      dependencies: this.dependencies,
      requestCount: this.requestCount
    };
  }

  // Simulate dependency failure
  failDependency(dep) {
    this.dependencies[dep] = 'error';
    console.log(\`  ⚠️  \${this.name}: \${dep} is down!\`);
  }

  // Simulate recovery
  recoverDependency(dep) {
    this.dependencies[dep] = 'ok';
    console.log(\`  💚 \${this.name}: \${dep} recovered\`);
  }
}

// Kubernetes Probe Simulator
class KubeProber {
  probe(instance, type) {
    if (type === 'liveness') {
      const result = instance.livenessCheck();
      const status = result.alive ? '✅ PASS' : '❌ FAIL → Will restart!';
      console.log(\`  Liveness \${instance.name}: \${status} (uptime: \${result.uptime}ms)\`);
      return result.alive;
    }
    
    if (type === 'readiness') {
      const result = instance.readinessCheck();
      const status = result.ready ? '✅ PASS' : '⛔ FAIL → Remove from LB';
      const deps = Object.entries(result.dependencies)
        .map(([k,v]) => \`\${k}:\${v === 'ok' ? '✅' : '❌'}\`)
        .join(', ');
      console.log(\`  Readiness \${instance.name}: \${status}\`);
      console.log(\`    Dependencies: \${deps}\`);
      return result.ready;
    }
  }
}

async function demo() {
  const service = new ServiceInstance('payment-service', { startupTime: 500 });
  const prober = new KubeProber();

  console.log('=== Service Starting ===');
  console.log('\\n[Before ready]');
  prober.probe(service, 'liveness');
  prober.probe(service, 'readiness');

  await service.startup();

  console.log('\\n[After startup]');
  prober.probe(service, 'liveness');
  prober.probe(service, 'readiness');

  console.log('\\n=== Database connection drops ===');
  service.failDependency('database');
  prober.probe(service, 'liveness');   // Still alive
  prober.probe(service, 'readiness'); // Not ready → removed from LB

  console.log('\\n=== Database recovers ===');
  service.recoverDependency('database');
  prober.probe(service, 'readiness'); // Ready again → re-added to LB
}

demo();`,
    },
  ],
  interactive: null,
  callouts: [
    { type: 'success', icon: '❤️', title: 'Health Check là nền tảng', body: 'Liveness + Readiness probes là cặp bài trùng trong Kubernetes. Liveness quyết định restart, Readiness quyết định traffic routing. Thiếu readiness probe → traffic vào service chưa sẵn sàng = lỗi.' },
    { type: 'warning', icon: '📒', title: 'Registry phải HA', body: 'Service Registry là single point of failure nếu không có HA. Consul cluster (3-5 nodes với Raft), Eureka cluster, hoặc etcd cluster đảm bảo registry luôn available. Clients cần cache registry data để chịu được downtime ngắn.' },
    { type: 'info', icon: '🌐', title: 'Kubernetes làm sẵn cho bạn', body: 'Trong Kubernetes: CoreDNS làm DNS discovery, Service object làm load balancing, Readiness/Liveness probes làm health check tự động. Không cần Consul/Eureka nếu bạn đang dùng K8s.' },
    { type: 'tip', icon: '🔄', title: 'Client-side vs Server-side Discovery', body: 'Server-side: Load balancer query registry và route (đơn giản cho client). Client-side: Client query registry và chọn instance (linh hoạt hơn, Eureka model). K8s dùng server-side (Service/ClusterIP).' },
  ],
  quiz: [
    {
      q: 'Service Registry đảm nhiệm vai trò gì trong hệ thống microservices?',
      options: [
        'Cân bằng tải trực tiếp giữa các database',
        'Lưu danh sách services và addresses, services register khi startup và deregister khi shutdown',
        'Mã hóa toàn bộ traffic giữa các services',
        'Tập trung lưu trữ logs của toàn hệ thống',
      ],
      answer: 1,
      explain: 'Service Registry là database lưu danh sách services và addresses (IP:port). Services register khi startup, deregister khi shutdown, còn clients query registry để tìm service cần gọi.',
    },
    {
      q: 'Sự khác biệt giữa Liveness Probe và Readiness Probe là gì?',
      options: [
        'Liveness remove khỏi load balancer, Readiness thì restart service',
        'Cả hai đều restart service khi kiểm tra thất bại',
        'Liveness fail thì restart service, Readiness fail thì remove khỏi load balancer',
        'Cả hai đều chỉ remove instance khỏi load balancer',
      ],
      answer: 2,
      explain: 'Liveness Probe kiểm tra service còn sống không (fail thì restart). Readiness Probe kiểm tra service sẵn sàng nhận traffic không (fail thì remove khỏi load balancer).',
    },
    {
      q: 'Netflix Eureka ưu tiên điều gì trong CAP theorem?',
      options: [
        'Availability hơn consistency (thiên về AP)',
        'Consistency hơn availability (thiên về CP)',
        'Chỉ quan tâm đến partition tolerance',
        'Cân bằng cả ba thuộc tính như nhau',
      ],
      answer: 0,
      explain: 'Eureka ưu tiên availability over consistency (AP trong CAP), và có Self-Preservation Mode để không evict services khi nghi ngờ network partition.',
    },
    {
      q: 'Ưu điểm nổi bật của DNS-based Service Discovery là gì?',
      options: [
        'Đảm bảo strong consistency tuyệt đối giữa các node',
        'Lưu trữ được toàn bộ lịch sử thay đổi của services',
        'Bắt buộc phải dùng một client library chuyên dụng',
        'Đơn giản nhất, không cần client library đặc biệt',
      ],
      answer: 3,
      explain: 'DNS-based discovery resolve service name thành IP và load balance ở DNS level (nhiều A records). Ưu điểm là đơn giản nhất, không cần client library như Consul hay Eureka.',
    },
  ],
}
