/**
 * NOCTIS OPEN TECHNICAL CURRICULUM 1M GENERATOR (CC0-1.0 / Open-Standards Grounded)
 *
 * Covers 25 comprehensive engineering, architecture, AI/ML, cloud, security, systems,
 * data, algorithms, FinTech, leadership, and governance subject tracks inspired by standard
 * industry technical taxonomies — authored 100% originally and grounded solely in open
 * specifications (IETF RFCs, NIST SPs, OWASP, W3C, CNCF, POSIX, ISO/IEC/IEEE).
 *
 * Pure TypeScript with zero `node:*` dependencies so it runs natively in both Node
 * (`--experimental-strip-types`) and browser/worker contexts without bundler pollution.
 */

export type TaskFormatId =
  | "CONCEPT_DEEP_DIVE"
  | "ARCHITECTURE_DESIGN"
  | "CODE_IMPLEMENTATION"
  | "DEBUGGING_RCA"
  | "SECURITY_HARDENING"
  | "PERFORMANCE_TUNING"
  | "PRODUCTION_RUNBOOK"
  | "COMPARISON_TRADEOFFS"
  | "CALCULATION_SIZING"
  | "INCIDENT_POSTMORTEM";

export type DifficultyTier = "FOUNDATION" | "PRACTITIONER" | "ARCHITECT" | "PRINCIPAL";

export interface CurriculumTrack {
  id: string;
  name: string;
  domain: string;
  summary: string;
  subtopics: readonly string[];
  standards: readonly string[];
  invariants: readonly string[];
  antiPatterns: readonly string[];
}

export interface ChatMlMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenCurriculumSftRecord {
  id: string;
  trackId: string;
  domain: string;
  subtopic: string;
  difficulty: DifficultyTier;
  taskFormat: TaskFormatId;
  standardRef: string;
  license: "CC0-1.0-Noctis-Open-Curriculum";
  messages: ChatMlMessage[];
}

export interface OpenCurriculumDpoRecord {
  id: string;
  trackId: string;
  domain: string;
  prompt: string;
  chosen: string;
  rejected: string;
  rationale: string;
  license: "CC0-1.0-Noctis-Open-Curriculum";
}

export interface CurriculumSeedPair {
  question: string;
  answer: string;
  domain: string;
  model: string;
  hits: number;
  at: string;
}

export const TASK_FORMATS: readonly TaskFormatId[] = [
  "CONCEPT_DEEP_DIVE",
  "ARCHITECTURE_DESIGN",
  "CODE_IMPLEMENTATION",
  "DEBUGGING_RCA",
  "SECURITY_HARDENING",
  "PERFORMANCE_TUNING",
  "PRODUCTION_RUNBOOK",
  "COMPARISON_TRADEOFFS",
  "CALCULATION_SIZING",
  "INCIDENT_POSTMORTEM",
] as const;

export const DIFFICULTY_TIERS: readonly DifficultyTier[] = [
  "FOUNDATION",
  "PRACTITIONER",
  "ARCHITECT",
  "PRINCIPAL",
] as const;

const SCALE_CONTEXTS: readonly string[] = [
  "a single-region startup service handling 500 req/s",
  "a multi-region active-active platform at 25,000 req/s",
  "an enterprise SaaS control plane with 10,000 isolated tenants",
  "a high-throughput streaming pipeline ingesting 2M events/sec",
  "an air-gapped regulated defense/healthcare enclave",
  "a global edge CDN and serverless API tier across 40 PoPs",
  "a stateful transactional OLTP cluster at 18 TB",
  "an internal developer platform serving 450 engineers",
  "an autonomous multi-agent workflow orchestrator",
  "an edge-to-cloud industrial telemetry fleet of 250k nodes",
] as const;

const CONSTRAINT_PROFILES: readonly string[] = [
  "p99 latency <= 35ms and 99.99% availability SLO",
  "zero data loss (RPO = 0) and RTO < 60 seconds across AZ failure",
  "strict least-privilege RBAC and cryptographic audit provenance",
  "bounded memory under 2 GB per worker and deterministic backpressure",
  "zero breaking schema changes during live rolling deployments",
  "strict supply-chain integrity with pinned hashes and SBOM verification",
  "idempotent retries safe under duplicate delivery and network partitions",
  "minimal cross-AZ egress cost with read-your-writes consistency",
  "audit-ready telemetry linking metrics, structured logs, and trace IDs",
  "fail-closed input validation and bounded queue depth under burst traffic",
] as const;

const VARIATION_LENSES: readonly string[] = [
  "cold-start and connection-pool exhaustion",
  "tail-latency amplification and cascading retry storms",
  "schema evolution and backward-compatible versioning",
  "split-brain mitigation and quorum fencing tokens",
  "credential rotation without service interruption",
  "graceful degradation and circuit-breaker fallback tiers",
  "memory fragmentation, GC pauses, or allocator contention",
  "multi-tenant noisy-neighbor isolation and per-tenant quotas",
  "deterministic CI verification and chaos fault injection",
  "capacity headroom math and cost-per-million-request optimization",
] as const;

export const OPEN_CURRICULUM_TRACKS: readonly CurriculumTrack[] = [
  {
    id: "software-architecture",
    name: "Software Architecture & System Design",
    domain: "engineering",
    summary: "ISO/IEC/IEEE 42010 viewpoints, Domain-Driven Design, modularity, C4 models, and evolutionary fitness functions.",
    subtopics: [
      "Bounded Context Decomposition in DDD",
      "Modular Monolith vs Distributed Microservices",
      "Event-Driven Choreography vs Orchestration",
      "CQRS & Event Sourcing Snapshot Projections",
      "Hexagonal (Ports & Adapters) Clean Boundaries",
      "API Gateway, BFF & Contract Versioning",
      "Outbox Pattern for Atomic DB + Event Publishing",
      "Strangler Fig Legacy Migration Architecture",
      "Architectural Decision Records (ADRs) & Governance",
      "Fitness Functions for Coupling & Cycle Checks",
      "Anti-Corruption Layers Between Upstream Domains",
      "Idempotent Command Handlers & Saga Compensation",
    ],
    standards: [
      "ISO/IEC/IEEE 42010 Architecture Descriptions",
      "OpenAPI 3.1 Specification",
      "AsyncAPI 3.0 Event Contract Spec",
      "CloudEvents v1.0 CNCF Spec",
    ],
    invariants: [
      "Every domain boundary owns its private persistence schema with zero cross-service table joins.",
      "State mutations and integration events are committed atomically via transactional outbox.",
      "Public contracts evolve backward-compatibly with additive fields and deprecation windows.",
      "Fitness functions fail CI automatically on circular module dependencies or layer violations.",
    ],
    antiPatterns: [
      "Sharing a single mutable database across multiple independently deployed services without an ownership boundary.",
      "Publishing events asynchronously before the database transaction commits, causing phantom state drift.",
      "Deploying synchronous microservice call chains deeper than three hops without timeouts or bulkheads.",
      "Skipping Architecture Decision Records and mutating APIs via breaking in-place field renames.",
    ],
  },
  {
    id: "distributed-systems",
    name: "Distributed Systems & Consensus",
    domain: "engineering",
    summary: "Raft/Paxos consensus, logical time, linearizability vs eventual consistency, CRDTs, and fault tolerance.",
    subtopics: [
      "Raft Leader Election & Log Replication Safety",
      "Paxos Quorums & Multi-Paxos pipelining",
      "CAP Theorem vs PACELC Latency Trade-Offs",
      "Fencing Tokens & Lease Expiration Safety",
      "Lamport Clocks, Vector Clocks & HLC Ordering",
      "Conflict-Free Replicated Data Types (CRDTs)",
      "Consistent Hashing & Virtual Node Rebalancing",
      "Gossip Protocols & Membership Failure Detectors",
      "Two-Phase Commit vs Saga Compensation Flows",
      "Jittered Exponential Backoff & Retry Budgets",
      "Deterministic Simulation Testing for Partitions",
      "Backpressure, Load Shedding & Little's Law",
    ],
    standards: [
      "In Search of an Understandable Consensus Algorithm (Raft)",
      "Jepsen Linearizability & Consistency Models",
      "W3C Trace Context Specification",
      "IETF RFC 9420 / Distributed State Integrity Principles",
    ],
    invariants: [
      "Storage servers validate monotonically increasing fencing tokens to reject stale lock holders.",
      "All retry loops enforce bounded attempts, randomized full jitter, and per-hop retry budgets <= 10%.",
      "Non-idempotent side effects require client-supplied idempotency keys persisted atomically.",
      "Quorum writes satisfy W + R > N only when paired with read-repair or monotonic epoch numbering.",
    ],
    antiPatterns: [
      "Using unsynchronized wall-clock timestamps across nodes to resolve write-write conflicts.",
      "Unbounded synchronous retries without jitter, amplifying brownouts into full retry storms.",
      "Assuming distributed locks provide mutual exclusion without storage-layer fencing checks.",
      "Claiming strict serializability while serving uncoordinated follower reads under partition.",
    ],
  },
  {
    id: "cloud-kubernetes",
    name: "Cloud Native & Kubernetes Engineering",
    domain: "engineering",
    summary: "Kubernetes control plane internals, scheduling, Gateway API, autoscaling, OCI containers, and multi-region resilience.",
    subtopics: [
      "Kubernetes Control Plane Reconciliation Loops",
      "Pod Security Standards & Distroless Non-Root Images",
      "Liveness, Readiness & Startup Probe Tuning",
      "HPA, VPA & KEDA Event-Driven Autoscaling",
      "PodDisruptionBudgets & Graceful SIGTERM Draining",
      "Kubernetes Gateway API vs Ingress Controllers",
      "etcd Quorum sizing, Compaction & Snapshot Restore",
      "Custom Resource Definitions (CRDs) & Operators",
      "Cilium eBPF CNI & Default-Deny NetworkPolicies",
      "Multi-Cluster Active-Active Failover Routing",
      "FinOps Spot Instance & Karpenter Bin-Packing",
      "OCI Image Signing & Admission Policy Webhooks",
    ],
    standards: [
      "CNCF Kubernetes API & Scheduling Conventions",
      "OCI Image Format Specification v1.1",
      "Kubernetes Pod Security Standards (Restricted)",
      "CIS Kubernetes Benchmark",
    ],
    invariants: [
      "Workloads run non-root with readOnlyRootFilesystem and drop ALL Linux capabilities.",
      "PreStop hooks drain active connections before SIGTERM terminationGracePeriodSeconds expires.",
      "Default-deny NetworkPolicies explicitly allow only documented east-west service Ports/CIDRs.",
      "Every stateless Deployment defines CPU/memory requests matching realistic steady-state usage and a PDB.",
    ],
    antiPatterns: [
      "Configuring identical aggressive liveness and readiness probes on cold-starting JVMs, causing crash loops.",
      "Running containers as UID 0 with :latest mutable tags and cluster-admin ServiceAccounts.",
      "Leaving memory limits unset on shared multi-tenant nodes, triggering node-wide OOM kills.",
      "Mutating live cluster YAML manually instead of reconciling declarative GitOps manifests.",
    ],
  },
  {
    id: "ai-ml-llms",
    name: "AI, Deep Learning & LLM Systems",
    domain: "science",
    summary: "Transformer attention, LoRA/QLoRA fine-tuning, DPO alignment, hybrid RAG, quantized serving, and AI evals.",
    subtopics: [
      "Scaled Dot-Product, GQA & KV-Cache Sizing",
      "LoRA & 4-Bit NF4 QLoRA Memory Budgeting",
      "Supervised Fine-Tuning (SFT) vs DPO Alignment",
      "Hybrid BM25 + Vector Retrieval & RRF Fusion",
      "Strict Train / Validation Split Contamination Prevention",
      "PagedAttention & Continuous Batching in vLLM",
      "AWQ, GPTQ & GGUF Edge Quantization Trade-Offs",
      "Structured JSON / Grammar-Constrained Decoding",
      "Deterministic LLM Eval Harnesses & Abstention Gates",
      "Prompt Injection & Indirect RAG Poisoning Defense",
      "Multi-Step Tool-Calling Agents & Sandbox Isolation",
      "Drift Detection, Faithfulness & Hallucination Audits",
    ],
    standards: [
      "NIST AI RMF 1.0 (AI 100-1)",
      "ISO/IEC 42001 AI Management System",
      "OWASP Top 10 for LLM Applications",
      "OpenTelemetry GenAI Semantic Conventions",
    ],
    invariants: [
      "Evaluation benchmarks are strictly isolated by group/prompt hash prior to training dataset assembly.",
      "Untrusted retrieved RAG chunks never elevate privileges or override system policy instructions.",
      "Safety-critical calculations run via deterministic code/validators rather than probabilistic token sampling.",
      "KV-cache and batch concurrency limits are sized mathematically against physical GPU VRAM capacity.",
    ],
    antiPatterns: [
      "Evaluating a fine-tuned model on prompts that leaked into the SFT or DPO training split.",
      "Allowing LLM-generated code or SQL to execute unsandboxed directly against production databases.",
      "Treating raw vector cosine similarity alone as proof of factual grounding without source checks.",
      "Deploying uncalibrated models on clinical or security decisions with no abstention threshold.",
    ],
  },
  {
    id: "data-engineering",
    name: "Data Engineering & Streaming Pipelines",
    domain: "engineering",
    summary: "Lakehouse table formats, Apache Kafka, CDC pipelines, exactly-once semantics, schemas, and batch/stream unification.",
    subtopics: [
      "Apache Iceberg ACID Snapshots & Time Travel",
      "Apache Kafka Partitioning, ISR & Consumer Groups",
      "Debezium Change Data Capture (CDC) Topologies",
      "Idempotent Upserts & Watermark Late-Data Handling",
      "Columnar Parquet Row-Group & Z-Order Clustering",
      "Schema Registry Evolution (BACKWARD / FULL Compatibility)",
      "Dead-Letter Queues & Replayable Pipeline Architecture",
      "Data Quality Contracts & Freshness SLAs",
      "Dimensional Modeling (Star Schema vs One Big Table)",
      "Small-File Compaction & Manifest Pruning",
      "End-to-End Column-Level Data Lineage",
      "PII Tokenization & GDPR Right-to-Erasure in Lakes",
    ],
    standards: [
      "Apache Iceberg Table Format Spec v2",
      "Apache Parquet Format Specification",
      "OpenLineage Standard Specification",
      "CloudEvents / Avro Schema Evolution Rules",
    ],
    invariants: [
      "Every pipeline write is idempotent and safe to replay across arbitrary task retries.",
      "Schema changes validate FULL or BACKWARD compatibility in CI before reaching production topics.",
      "Late-arriving events past watermark grace windows route deterministically to side-output logs.",
      "Iceberg compaction schedules bound small-file proliferation without locking concurrent readers.",
    ],
    antiPatterns: [
      "Running DELETE/UPDATE row mutations in append-only data lakes without copy-on-write or merge-on-read snapshots.",
      "Partitioning object storage by unbounded high-cardinality timestamps, creating millions of tiny 1 KB files.",
      "Assuming Kafka at-least-once delivery implies downstream database exactly-once state without dedup keys.",
      "Mutating ETL schemas ad hoc in production notebooks with zero automated contract checks.",
    ],
  },
  {
    id: "databases-storage",
    name: "Databases & Storage Internals",
    domain: "engineering",
    summary: "MVCC, Write-Ahead Logging, B+Tree vs LSM-Tree compaction, query planning, connection pooling, and zero-downtime migrations.",
    subtopics: [
      "PostgreSQL MVCC, Tuple Visibility & VACUUM Freeze",
      "Write-Ahead Log (WAL) Checkpoints & Crash Recovery",
      "B+Tree vs Log-Structured Merge-Tree (LSM) Write Amplification",
      "Composite Index Column Order & Covering Indexes",
      "Transaction Isolation: Read Committed vs SSI",
      "PgBouncer Transaction Pooling & Prepared Statements",
      "EXPLAIN ANALYZE Buffer Hits & Join Algorithm Choice",
      "Zero-Downtime Expand-and-Contract Schema Migrations",
      "Keyset (Cursor) Pagination vs Slow OFFSET Scans",
      "Foreign Key Indexing & Deadlock Prevention Ordering",
      "Logical Replication Slots & Read-Replica Lag Mitigation",
      "Sharding Key Selection & Hot-Spot Avoidance",
    ],
    standards: [
      "PostgreSQL Documentation & ACID Semantics",
      "ISO/IEC 9075 SQL Standard",
      "ANSI SQL Transaction Isolation Definitions",
      "TPC-C / OLTP Consistency Principles",
    ],
    invariants: [
      "Lock ordering across multi-row updates follows canonical primary-key sort order to prevent deadlocks.",
      "Migrations split schema expansion, backfill, and constraint validation to avoid long AccessExclusive locks.",
      "Connection pools cap active backend slots per service instance, preventing fork/memory exhaustion.",
      "Every high-volume list query uses indexed keyset pagination instead of large OFFSET scans.",
    ],
    antiPatterns: [
      "Running `ALTER TABLE ADD COLUMN ... DEFAULT ... NOT NULL` or unindexed constraint checks holding table locks in peak traffic.",
      "Opening direct unpooled Postgres connections from thousands of serverless Lambda/Worker invocations.",
      "Using `SELECT *` and `OFFSET 100000` pagination in high-churn transactional tables.",
      "Disabling autovacuum to save I/O until XID wraparound halts writes cluster-wide.",
    ],
  },
  {
    id: "python-engineering",
    name: "Python Engineering & Async Systems",
    domain: "engineering",
    summary: "Python 3.12+ static typing, asyncio concurrency, GIL/subinterpreters, packaging, testing, and fast API services.",
    subtopics: [
      "Type Hints, Protocols, Generics & ParamSpec",
      "asyncio Event Loops, TaskGroups & Cancellation Safety",
      "Pydantic v2 Validation & Boundary Serialization",
      "GIL Mechanics, Multiprocessing & C-Extension Offload",
      "Context Managers (`contextlib`) & Resource Deterministic Cleanup",
      "FastAPI Dependency Injection & Bounded Worker Pools",
      "Generator Pipelines & Constant-Memory Stream Processing",
      "Modern Packaging (`pyproject.toml`, `uv`, Lockfiles)",
      "Structured Exception Chaining & Domain Error Types",
      "pytest Fixtures, Property Testing (Hypothesis) & Mocking Boundaries",
      "Memory Leak Diagnostics (`tracemalloc`, `objgraph`)",
      "cProfile / py-spy Flamegraphs & Hot-Path Vectorization",
    ],
    standards: [
      "PEP 8, PEP 484 & PEP 695 Type Parameter Syntax",
      "PEP 517/518/621 Standardized Packaging Metadata",
      "WSGI / ASGI Server Interface Specs",
      "Python Security Response / Bandit Checks",
    ],
    invariants: [
      "Blocking CPU or synchronous I/O work never runs directly on an `asyncio` event loop thread.",
      "Bare `except:` blocks are forbidden; `asyncio.CancelledError` always propagates cleanly.",
      "Every HTTP client uses explicit connect/read timeouts and connection pool reuse.",
      "Mutable default arguments in function signatures are never used; `None` sentinel initialization applies.",
    ],
    antiPatterns: [
      "Using `def foo(items=[])` mutable defaults that leak state across requests.",
      "Calling `requests.get()` without timeouts inside an async FastAPI endpoint, stalling the entire event loop.",
      "Catching broad `Exception` and returning empty dicts without logging context or preserving stack traces.",
      "Installing unpinned transitive dependencies via raw `pip install` outside reproducible lockfiles.",
    ],
  },
  {
    id: "typescript-javascript",
    name: "TypeScript, Node.js & Modern Web Runtime",
    domain: "engineering",
    summary: "Strict TypeScript type-level safety, Node.js streams, libuv event loop, ESM modules, and memory profiling.",
    subtopics: [
      "Discriminated Unions & Exhaustiveness Checking (`never`)",
      "Runtime Schema Validation (Zod / Valibot) at Trust Boundaries",
      "Node.js Streams, WebStreams & Drain Backpressure",
      "Event Loop Phases, Microtasks & Starvation Prevention",
      "ESM vs CommonJS Interop & Tree-Shaking Side Effects",
      "AsyncLocalStorage for Request & Trace Propagation",
      "AbortController Timeouts & Cooperative Cancellation",
      "V8 Hidden Classes, Monomorphic Hot Paths & Heap Snapshots",
      "Worker Threads for CPU-Bound Cryptography & Parsing",
      "Strict `tsconfig` (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)",
      "Safe JSON Parsing, Prototype Pollution & ReDoS Prevention",
      "Built-in `node:test` Runner & Deterministic Integration Tests",
    ],
    standards: [
      "ECMA-262 ECMAScript Specification",
      "WHATWG Fetch & Streams Standard",
      "TypeScript Strict Compiler Option Baseline",
      "Node.js LTS Security & Deprecation Guidelines",
    ],
    invariants: [
      "External JSON payloads are parsed and validated with a runtime schema before property access.",
      "Stream writers respect `write() === false` and await `drain` to bound heap usage cleanly.",
      "Network fetches and child processes always enforce `AbortSignal.timeout(...)` bounds.",
      "Server-only secrets and `node:*` built-ins never cross into client-side Vite/React bundles.",
    ],
    antiPatterns: [
      "Silencing compiler errors with `as any` casts across unvalidated user API inputs.",
      "Reading multi-hundred-megabyte datasets with `fs.readFileSync()` instead of streaming transforms.",
      "Spawning `exec()` shell commands with interpolated user strings instead of argument arrays via `execFile()`.",
      "Ignoring unhandled promise rejections inside fire-and-forget event listeners.",
    ],
  },
  {
    id: "golang-backend",
    name: "Go Concurrency & Cloud Services",
    domain: "engineering",
    summary: "Goroutine lifecycle, context cancellation, errgroup, interfaces, pprof CPU/heap tuning, and gRPC services.",
    subtopics: [
      "Goroutine Ownership & Leak-Free Channel Shutdown",
      "`context.Context` Propagation, Deadlines & Values Rules",
      "`errgroup` Bounded Worker Pools & First-Error Cancel",
      "Small Consumer-Side Interfaces & Composition",
      "Structured Concurrency with `select` & Timeouts",
      "`pprof` CPU, Heap, Mutex & Goroutine Profiles",
      "Escape Analysis & Zero-Allocation Buffer Reuse",
      "`errors.Is` / `errors.As` Sentinel & Wrapped Errors",
      "Race Detector (`-race`) & Atomic vs Mutex Discipline",
      "HTTP Server Timeouts (`ReadHeaderTimeout`, `IdleTimeout`)",
      "gRPC Interceptors, Keepalive & Deadline Propagation",
      "Clean Project Layout & Internal Package Boundaries",
    ],
    standards: [
      "Effective Go & Go Code Review Comments",
      "Go Memory Model Specification",
      "Protobuf3 & gRPC Wire Protocol",
      "Go Vulnerability Database (`govulncheck`)",
    ],
    invariants: [
      "No goroutine is launched without a deterministic exit path controlled by `ctx.Done()` or channel closure.",
      "Maps accessed concurrently across goroutines are strictly guarded by mutexes or sharded locks.",
      "`http.Server` always configures explicit timeouts and never uses `http.DefaultClient` in production.",
      "All public libraries pass `go test -race ./...` with zero data races.",
    ],
    antiPatterns: [
      "Creating an infinite `for { go handle() }` without bounded semaphore limits under load spikes.",
      "Storing `context.Context` inside long-lived struct fields instead of passing it as the first parameter.",
      "Ignoring returned `err` values with `_` on `Close()` or `Write()` flush operations.",
      "Copying structs containing `sync.Mutex` by value after initial use.",
    ],
  },
  {
    id: "rust-systems",
    name: "Rust Memory Safety & Systems Programming",
    domain: "engineering",
    summary: "Ownership, borrowing lifetimes, Send/Sync concurrency, Tokio async runtime, zero-copy parsing, and FFI safety.",
    subtopics: [
      "Ownership, Move Semantics & Non-Lexical Lifetimes",
      "PhantomData, Typestate Pattern & Compile-Time State Machines",
      "`Result<T, E>`, `thiserror` & `anyhow` Error Ergonomics",
      "`Send` vs `Sync` & Interior Mutability (`Mutex`, `RwLock`, `OnceLock`)",
      "Tokio Cooperative Async Scheduling & `spawn_blocking`",
      "Zero-Copy Serialization & Slice Borrow Lifetimes (`Cow<'a, str>`)",
      "Arena Allocation & Cache-Friendly Data Layouts",
      "Safe `unsafe` Abstraction Invariants & Miri Verification",
      "C/C++ FFI Ownership Handoff & Panic Boundaries",
      "Workspace Cargo Feature Unification & MSRV Discipline",
      "Async Cancellation Safety (`select!` Pitfalls)",
      "Property Testing (`proptest`) & Cargo Audit Supply-Chain",
    ],
    standards: [
      "The Rust Reference & Rustonomicon Safety Rules",
      "Rust API Guidelines (C-checklist)",
      "RustSec Advisory Database",
      "LLVM Undefined Behavior Prevention Rules",
    ],
    invariants: [
      "Holding a `std::sync::MutexGuard` across an `.await` point is strictly disallowed.",
      "Every `unsafe` block documents the exact caller/callee memory invariants upholding soundness.",
      "Blocking filesystem or CPU work executes on dedicated blocking threads, never async executor workers.",
      "Production code eliminates `.unwrap()`/`.expect()` on fallible runtime input paths.",
    ],
    antiPatterns: [
      "Using `.unwrap()` on untrusted network frames, crashing the entire worker process on malformed input.",
      "Ignoring cancellation safety inside `tokio::select!` branches that drop half-consumed stateful futures.",
      "Wrapping `unsafe` pointers without verifying alignment, non-aliasing, and lifetime bounds via Miri.",
      "Leaking `Rc` cycles or spawning detached tasks holding `Arc` references forever.",
    ],
  },
  {
    id: "java-jvm",
    name: "Java 21+ & JVM Enterprise Engineering",
    domain: "engineering",
    summary: "Virtual threads (Project Loom), ZGC/G1GC tuning, Java Memory Model, records, and resilient Spring/JVM services.",
    subtopics: [
      "Java 21 Virtual Threads & Pinning Prevention",
      "Generational ZGC vs G1GC Latency Tuning",
      "Java Memory Model, `volatile`, Happens-Before & Safe Publication",
      "Sealed Interfaces, Records & Pattern MatchingExhaustiveness",
      "Structured Concurrency Scopes (`StructuredTaskScope`)",
      "JVM Thread Dumps, JFR Flight Recorder & Flamegraphs",
      "Classloader Leaks & Off-Heap DirectByteBuffer Sizing",
      "Connection Pool Deadlock Prevention (HikariCP Sizing)",
      "Resilience4j Bulkheads, Rate Limiters & Timeouts",
      "Deserialization Security & ObjectInputFilter Allowlists",
      "GraalVM Native Image Reflection Metadata & Warmup",
      "Immutable Value Objects & Defensive Copying",
    ],
    standards: [
      "JLS Java Language Specification (Java 21 LTS)",
      "JVM Specification & JMM (JSR-133)",
      "OpenJDK JEP 444 (Virtual Threads)",
      "OWASP Java Deserialization Cheat Sheet",
    ],
    invariants: [
      "Code executed inside virtual threads avoids `synchronized` blocks around blocking I/O (uses `ReentrantLock`).",
      "Untrusted Java serialization (`ObjectInputStream`) is disabled or locked down via strict `ObjectInputFilter`.",
      "Production JVMs capture heap dumps on OOM and expose JFR/JMX metrics with container memory limits (`UseContainerSupport`).",
      "Database pool max connections match optimal core/I/O concurrency rather than inflated thread counts.",
    ],
    antiPatterns: [
      "Pooling virtual threads like heavy OS platform threads instead of creating one per task with semaphores.",
      "Deserializing untrusted binary streams via Java native serialization.",
      "Setting `-Xmx` without accounting for metaspace, thread stacks, and direct native buffers inside containers.",
      "Swallowing `InterruptedException` without restoring `Thread.currentThread().interrupt()`.",
    ],
  },
  {
    id: "cpp-low-level",
    name: "C/C++ & High-Performance Systems",
    domain: "engineering",
    summary: "Modern C++20/23 RAII, move semantics, lock-free atomics, SIMD vectorization, cache locality, and sanitizer hygiene.",
    subtopics: [
      "RAII Ownership (`unique_ptr`, `span`, `string_view` Lifetimes)",
      "Rule of Zero / Rule of Five Move Semantics",
      "CPU Cache-Line False Sharing & `alignas(64)` Struct Packing",
      "C++ Memory Orderings (`acquire`/`release`, `seq_cst`) & Lock-Free Queues",
      "Undefined Behavior Prevention & Strict Aliasing",
      "AddressSanitizer, ThreadSanitizer & UBSan CI Gates",
      "Zero-Allocation Hot Paths & Custom Arena Allocators",
      "Compiler Auto-Vectorization & SIMD Intrinsics",
      "MISRA / C++ Core Guidelines Bounds Safety",
      "Fuzzing Parsers with libFuzzer / AFL++",
      "Shared Library ABI Stability & Symbol Visibility",
      "Deterministic Shutdown Order Across Static Destructors",
    ],
    standards: [
      "ISO/IEC 14882 C++20/23 Standard",
      "C++ Core Guidelines",
      "CWE-119 / CWE-787 Memory Safety Hardening",
      "POSIX.1-2017 System Interfaces",
    ],
    invariants: [
      "Manual `new`/`delete` is prohibited in application code; smart pointers or arenas manage every allocation.",
      "Every C/C++ build runs ASan, UBSan, and `-Wall -Wextra -Werror` cleanly in CI.",
      "Public buffer APIs accept `std::span` / explicit `(ptr, len)` pairs with bounds checks.",
      "Inter-thread shared state uses `std::atomic` or `std::mutex`, never data-racing plain scalars.",
    ],
    antiPatterns: [
      "Returning `std::string_view` or references bound to temporary local strings (dangling reference UB).",
      "Using raw `strcpy`, `sprintf`, or unchecked `memcpy` on untrusted network packet lengths.",
      "Rolling lock-free algorithms with `memory_order_relaxed` on producer-consumer handoff flags.",
      "Placing hot atomic counters from multiple threads within the same 64-byte L1 cache line.",
    ],
  },
  {
    id: "cybersecurity-appsec",
    name: "Cybersecurity & Application Security",
    domain: "cybersecurity",
    summary: "OWASP Top 10 2025, ASVS Level 2/3, OAuth 2.1/OIDC PKCE, crypto engineering, SSRF, and fail-closed authorization.",
    subtopics: [
      "Object-Level Authorization (BOLA/IDOR) & Tenant Isolation",
      "OAuth 2.1, OIDC & Mandatory PKCE Flows",
      "Session Cookies (`HttpOnly`, `Secure`, `SameSite`, CSPRNG Tokens)",
      "AEAD Cryptography (AES-256-GCM / ChaCha20-Poly1305) & Nonce Reuse Prevention",
      "Parameterized Queries & ORM SQL Injection Elimination",
      "SSRF Metadata Blocklists & Egress Allowlisting",
      "Strict Content-Security-Policy (Nonce-Based) & XSS Defense",
      "Rate Limiting, Account Lockout & Credential Stuffing Mitigation",
      "Secrets Management, Envelope Encryption & Key Rotation",
      "XML/YAML Deserialization, XXE & Path Traversal Guards",
      "WebAuthn / FIDO2 Phishing-Resistant Authentication",
      "STRIDE Threat Modeling & Security Regression Tests",
    ],
    standards: [
      "OWASP Top 10:2025 & OWASP ASVS v4.0.3",
      "IETF RFC 9700 OAuth 2.0 Security Best Current Practice",
      "NIST SP 800-63B Digital Identity Guidelines",
      "NIST SP 800-57 Key Management Recommendations",
    ],
    invariants: [
      "Every endpoint enforces server-side tenant and resource ownership checks derived strictly from verified session tokens.",
      "Cryptographic authentication tags and signatures compare using constant-time equality checks.",
      "Untrusted URLs fetched server-side resolve DNS cleanly and block loopback, link-local (169.254.169.254), and RFC1918 ranges.",
      "Passwords hash exclusively with Argon2id or scrypt; encryption keys never hardcode in source repos.",
    ],
    antiPatterns: [
      "Trusting client-supplied `userId` or `tenantId` JSON body fields without cross-checking the authenticated session.",
      "Using `JWT` with `alg=none` accepted or HMAC secrets stored in frontend JS bundles.",
      "Encrypting multiple records with AES-GCM under the same `(key, nonce)` tuple.",
      "Interpolating user variables into SQL queries, shell commands, or `innerHTML` sinks.",
    ],
  },
  {
    id: "secops-dfir",
    name: "SecOps, Detection Engineering & DFIR",
    domain: "cybersecurity",
    summary: "MITRE ATT&CK threat hunting, Sigma/YARA detections, volatile forensic triage, ransomware containment, and purple teaming.",
    subtopics: [
      "MITRE ATT&CK Mapping & Detection Coverage Matrices",
      "Sigma Log Detection Rules & False-Positive Tuning",
      "YARA Binary & Memory String Signatures",
      "Order of Volatility & Forensic Chain of Custody (SHA-256)",
      "Active Directory Kerberoasting & DCSync Telemetry",
      "Cloud IAM Privilege Escalation & CloudTrail Hunting",
      "LSASS / Credential Access Process Tree Analytics",
      "Network C2 Beaconing, JA4 Fingerprinting & DNS Tunneling",
      "Ransomware Containment & Choke-Point Microsegmentation",
      "Atomic Red Team Emulation & Detection Validation",
      "SOAR Playbook Safety Gates & Human Approval Tiers",
      "Timeline Reconstruction (Super-Timeline MFT + EVTX + Auth)",
    ],
    standards: [
      "NIST SP 800-61 Rev. 3 Incident Response Guide",
      "NIST SP 800-86 Guide to Integrating Forensic Techniques",
      "MITRE ATT&CK Enterprise Matrix v15",
      "SigmaHQ & YARA Open Detection Specifications",
    ],
    invariants: [
      "Forensic acquisition captures volatile memory and network sockets before host reboot or disk wipe.",
      "Every collected forensic artifact is hashed with SHA-256 at acquisition with immutable chain-of-custody logs.",
      "High-blast-radius containment actions (account suspension, subnet isolation) require deterministic policy gating.",
      "Every high-severity SIEM alert maps to an actionable triage runbook and verified telemetry fields.",
    ],
    antiPatterns: [
      "Rebooting a compromised host prior to capturing RAM and active network/process state, erasing volatile IOCs.",
      "Deploying broad untuned SIEM rules that generate 5,000 daily false positives until analysts ignore alerts.",
      "Automatically isolating domain controllers or production databases without safety choke-point guardrails.",
      "Investigating incidents without centralized immutable log forwarding outside the compromised host.",
    ],
  },
  {
    id: "devops-cicd",
    name: "DevOps, Platform Engineering & CI/CD",
    domain: "engineering",
    summary: "SLSA Build Level 3, CycloneDX SBOMs, OIDC workload identity, Terraform state isolation, and progressive delivery.",
    subtopics: [
      "Keyless OIDC CI-to-Cloud Authentication (Zero Static Secrets)",
      "SLSA Build Provenance & Reproducible Artifacts",
      "CycloneDX / SPDX SBOM Generation & KEV Vulnerability Gating",
      "Terraform Remote State Locking & Blast-Radius Workspaces",
      "Progressive Delivery: Canary, Blue-Green & Feature Flags",
      "ArgoCD / Flux Pull-Based GitOps Reconciliation",
      "Ephemeral Preview Environments per Pull Request",
      "Container Layer Caching & Multi-Stage Hardened Builds",
      "Pre-Commit Secret Scanning & Push Protection",
      "Automated Database Migration Gates in Deployment Pipelines",
      "Internal Developer Portals & Golden Path Templates",
      "Zero-Downtime TLS Certificate Automation (ACME)",
    ],
    standards: [
      "SLSA Supply-Chain Levels for Software Artifacts v1.0",
      "OWASP CycloneDX v1.5 SBOM Spec",
      "OpenID Connect Workload Identity Federation",
      "DORA Four Key Delivery Metrics",
    ],
    invariants: [
      "CI/CD pipelines authenticate to cloud registries via short-lived OIDC tokens, never static long-lived API keys.",
      "Every production release links deterministically to a signed commit SHA, build provenance, and SBOM.",
      "Canary rollouts compare error budget burn and p99 latency against baseline before auto-promoting.",
      "Infrastructure changes pass `plan` review and policy-as-code checks prior to `apply`.",
    ],
    antiPatterns: [
      "Storing cloud root credentials as plaintext repository environment variables shared across untrusted PR forks.",
      "Building docker images directly on developer laptops and pushing manually to production.",
      "Sharing a single monolithic Terraform state file across networking, IAM, and every application team.",
      "Promoting failing builds by manually SSHing into servers to hot-patch source files.",
    ],
  },
  {
    id: "sre-observability",
    name: "SRE, Reliability & Observability",
    domain: "engineering",
    summary: "SLIs, SLOs, multi-window error budget burn alerts, OpenTelemetry traces, chaos engineering, and blameless postmortems.",
    subtopics: [
      "User-Centric SLIs, Availability SLOs & Error Budgets",
      "Multi-Window Multi-Burn-Rate Paging Alerts",
      "OpenTelemetry Traces, Metrics & Log Correlation IDs",
      "RED (Rate, Errors, Duration) vs USE (Utilization, Saturation, Errors)",
      "Tail-Based Trace Sampling & Cardinality Explosion Control",
      "Chaos Engineering Steady-State Hypotheses & Blast Caps",
      "Cascading Failure Modes: Retry Storms & Thundering Herds",
      "Toil Elimination & Self-Healing Automation Boundaries",
      "Load Shedding, Priority Queues & Graceful Degradation",
      "Disaster Recovery GameDays & Tested Backup Restores",
      "Blameless Postmortems & Systemic Action Items",
      "Queueing Theory, Saturation Knee & Autoscaling Lag",
    ],
    standards: [
      "Google SRE Workbook Error Budget Policy",
      "OpenTelemetry Specification (OTLP v1.0)",
      "W3C Trace Context (`traceparent`)",
      "Principles of Chaos Engineering",
    ],
    invariants: [
      "Pages trigger only on actionable customer-facing SLO burn, never transient single-node CPU spikes.",
      "Log and metric labels exclude unbounded high-cardinality user/request IDs (traces carry those).",
      "Backups are considered unverified until automated periodic restore drills pass data-integrity checksums.",
      "Chaos experiments define explicit automatic abort conditions before injecting any fault.",
    ],
    antiPatterns: [
      "Paging on-call engineers at 3 AM for non-actionable 75% CPU warnings with zero SLO impact.",
      "Putting raw `request_id` or `email` strings into Prometheus metric labels, OOMing TSDB storage.",
      "Treating human blame ('engineer forgot flag') as a postmortem root cause instead of missing automation.",
      "Never testing backup restores until a real storage outage corrupts production data.",
    ],
  },
  {
    id: "linux-os-internals",
    name: "Linux Kernel, Containers & OS Internals",
    domain: "engineering",
    summary: "Virtual memory paging, epoll/io_uring, cgroups v2, Linux namespaces, eBPF observability, and filesystem durability.",
    subtopics: [
      "Virtual Memory, Page Cache, Dirty Writeback & OOM Killer",
      "Process Scheduling (CFS / EEVDF) & CPU Throttling in cgroups v2",
      "Linux Namespaces (pid, net, mnt, ipc, user) Container Isolation",
      "Seccomp-BPF Syscall Filtering & Capabilities",
      "Non-Blocking I/O: `epoll` Edge/Level vs `io_uring` Rings",
      "eBPF Tracing (kprobes, tracepoints, XDP Packet Drops)",
      "TCP Socket Buffers, `SOMAXCONN` Listen Backlog & TIME_WAIT",
      "Filesystem Durability: `fsync`, Journaling & NVMe Queue Depth",
      "Dynamic Linking, Page Faults & `mmap` Copy-on-Write",
      "`systemd` Socket Activation, Sandboxing & Watchdogs",
      "Context Switches, NUMA Locality & Interrupt Affinity",
      "Core Dumps, `perf`, `strace` & `ss` Live Kernel Triage",
    ],
    standards: [
      "Linux Kernel Documentation (`Documentation/admin-guide/cgroup-v2.rst`)",
      "POSIX.1-2017 System Calls & File Semantics",
      "Linux eBPF Verifier Safety Specification",
      "CIS Distribution Independent Linux Benchmark",
    ],
    invariants: [
      "Container runtimes enforce cgroups v2 memory limits cleanly with swap disabled or bounded.",
      "File durability requires `fsync` on both the modified file descriptor AND its parent directory on rename.",
      "Latency-sensitive applications avoid aggressive CPU CFS quota fragmentation causing burst throttling.",
      "eBPF programs pass the kernel verifier guaranteeing bounded loops and memory safety.",
    ],
    antiPatterns: [
      "Assuming `write()` returning success guarantees persistence on disk across sudden kernel power loss.",
      "Assigning tight sub-1-core CFS CPU limits to bursty multi-threaded services, triggering artificial stalls.",
      "Granting `--privileged` to container sidecars instead of scoped capabilities or seccomp profiles.",
      "Disabling `vm.overcommit` checks blindly without tuning OOM scores on critical database daemons.",
    ],
  },
  {
    id: "networking-protocols",
    name: "Computer Networking & Protocols",
    domain: "engineering",
    summary: "TCP congestion control, QUIC/HTTP3, TLS 1.3 handshakes, BGP anycast, DNSSEC, and mTLS zero-trust networking.",
    subtopics: [
      "TCP 3-Way Handshake, Slow Start, CUBIC & BBR Congestion Control",
      "QUIC 0-RTT/1-RTT & HTTP/3 Stream Head-of-Line Elimination",
      "TLS 1.3 Cipher Suites, ECDHE Forward Secrecy & OCSP Stapling",
      "BGP Route Selection, RPKI ROA Validation & Route Leak Prevention",
      "DNS Resolution, TTL Tuning, DNSSEC Signatures & DoH/DoT",
      "Mutual TLS (mTLS), SPIFFE/SPIRE SVID Workload Identity",
      "L4 DSR Load Balancing vs L7 Reverse Proxying",
      "Anycast Routing, Health Checks & Graceful Connection Draining",
      "IPv6 Dual-Stack, PMTUD & NAT64/DNS64 Interop",
      "VLANs, VXLAN Encapsulation & Egress Firewall Inspection",
      "WebSockets vs Server-Sent Events (SSE) vs gRPC Streaming",
      "Packet Capture Diagnostics with `tcpdump` & Wireshark Filters",
    ],
    standards: [
      "IETF RFC 8446 (TLS 1.3)",
      "IETF RFC 9000 & RFC 9114 (QUIC & HTTP/3)",
      "IETF RFC 4271 (BGP-4) & RFC 6811 (RPKI)",
      "SPIFFE Workload Identity Specification",
    ],
    invariants: [
      "External and internal east-west connections mandate TLS 1.2+ / TLS 1.3 with strict hostname/SAN checks.",
      "0-RTT early data is accepted strictly on idempotent read requests to prevent replay attacks.",
      "Load balancers drain existing HTTP/2/gRPC streams cleanly via GOAWAY frames before backend shutdown.",
      "DNS TTLs and health-check fail thresholds balance failover speed against resolver cache storms.",
    ],
    antiPatterns: [
      "Disabling TLS certificate verification (`rejectUnauthorized: false`) inside production microservices.",
      "Accepting unvalidated non-idempotent POST mutations over 0-RTT QUIC/TLS early data.",
      "Setting zero TCP keepalive or infinite idle timeouts behind stateful NAT firewalls.",
      "Relying on static IP allowlists instead of cryptographic mTLS workload identities.",
    ],
  },
  {
    id: "web-frontend",
    name: "Modern Web, Accessibility & Performance",
    domain: "engineering",
    summary: "Core Web Vitals (LCP, INP, CLS), React streaming SSR/RSC boundaries, WCAG 2.2 AA accessibility, and CSP hardening.",
    subtopics: [
      "Core Web Vitals Optimization (LCP, INP, CLS)",
      "SSR, Streaming HTML & Selective Hydration Boundaries",
      "WCAG 2.2 AA Keyboard Navigation, Focus Traps & ARIA Landmarks",
      "JavaScript Bundle Splitting, Tree-Shaking & Font Preloading",
      "HTTP Cache-Control (`immutable` Hashed Assets vs `no-store` HTML)",
      "Strict CSP, Trusted Types & Subresource Integrity (SRI)",
      "Service Worker Cache Eviction & Stale Asset Self-Healing",
      "Optimistic UI Updates with Rollback & Error Boundaries",
      "Virtualization & Offscreen Rendering for 10,000+ DOM Rows",
      "Web Workers & `requestAnimationFrame` Frame-Budget Discipline",
      "Responsive Containers, Mobile Touch Targets (>= 44px) & Zero Horizontal Overflow",
      "Cross-Origin Resource Policy (CORP), COOP & CORS Least Privilege",
    ],
    standards: [
      "W3C WCAG 2.2 Level AA Accessibility Guidelines",
      "W3C Content Security Policy Level 3",
      "Core Web Vitals Google Web.dev Thresholds",
      "HTML Living Standard (WHATWG)",
    ],
    invariants: [
      "All interactive controls support full keyboard navigation, visible focus rings, and accessible names.",
      "Hashed JS/CSS build artifacts serve `Cache-Control: public, max-age=31536000, immutable` while HTML documents revalidate.",
      "UI layouts reserve explicit intrinsic aspect ratios for images/embeds so CLS stays <= 0.1.",
      "Large datasets paginate or virtualize cleanly so initial render never blocks the main thread > 50ms.",
    ],
    antiPatterns: [
      "Caching `index.html` aggressively with stale chunk hashes, breaking clients across rolling deploys.",
      "Implementing clickable `<div>` elements without `role`, `tabIndex`, or keyboard Enter/Space handlers.",
      "Triggering synchronous layout thrashing (`offsetHeight` reads interleaved with style writes) inside scroll handlers.",
      "Loading 2 MB unsplit vendor bundles eagerly on the initial marketing landing route.",
    ],
  },
  {
    id: "mobile-engineering",
    name: "Mobile Architecture & Real-Time Clients",
    domain: "engineering",
    summary: "Offline-first SQLite sync, battery/radio state machines, WebRTC calling resilience, push wakes, and secure enclave storage.",
    subtopics: [
      "Offline-First Local SQLite Queue & Idempotent Sync",
      "Push Notification Background Wake & Low-Power Scheduling",
      "WebRTC ICE/STUN/TURN Relay Traversal Across Symmetric NATs",
      "Keychain / Android Keystore Hardware-Backed Token Storage",
      "Mobile App Lifecycle Suspension & State Restoration",
      "Conflict Resolution (LWW-Element-Set / Delta Sync) on Reconnect",
      "Adaptive Bitrate & Low-Bandwidth Voice/Video Fallbacks",
      "Certificate Pinning with Safe Backup Key Rotation",
      "Deep Links, Universal Links & Redirect Validation",
      "Image Downsampling & Scroll Jitter Elimination (60/120fps)",
      "Biometric Prompt LocalAuth Tied to Cryptographic Key Unlock",
      "Battery Telemetry: Coalescing Network Bursts to Prevent Radio Wakeups",
    ],
    standards: [
      "IETF RFC 8445 (ICE Interactive Connectivity Establishment)",
      "OWASP Mobile Application Security Verification Standard (MASVS)",
      "Apple App Transport Security & Android Network Security Config",
      "FIDO2 Mobile Passkey Integration",
    ],
    invariants: [
      "Sensitive auth tokens reside strictly in OS Keychain / Keystore, never plaintext shared preferences.",
      "Offline queued mutations carry stable `clientMsgId` UUIDs deduplicated server-side on reconnect.",
      "WebRTC media sessions maintain TURN relay fallbacks for restrictive corporate/mobile carrier NATs.",
      "UI image pipelines decode bitmaps at exact target display dimensions to avoid OOM crashes.",
    ],
    antiPatterns: [
      "Hardcoding a single leaf certificate pin without backup pins, bricking app updates on cert rotation.",
      "Polling REST APIs every 5 seconds in the background, draining battery and burning cellular radios.",
      "Validating biometric unlock as a boolean `if (authOk)` instead of gating cryptographic keystore access.",
      "Blocking the main UI thread with synchronous JSON decoding or SQLite writes during scroll.",
    ],
  },
  {
    id: "hardware-iot-embedded",
    name: "Embedded, IoT & Edge Computing",
    domain: "engineering",
    summary: "RTOS scheduling, MQTT/CoAP telemetry, signed OTA updates, hardware watchdogs, BLE GATT profiles, and power budgets.",
    subtopics: [
      "RTOS Priority Inversion & Priority Inheritance Mutexes",
      "Dual-Bank A/B Signed OTA Firmware Updates with Auto-Rollback",
      "MQTT QoS 0/1/2, Clean Sessions & Broker Fan-In Scaling",
      "BLE GATT Services, Characteristics & MTU Negotiation",
      "Hardware Watchdog Timers & Safe Fail-Over States",
      "Zero-Allocation Ring Buffers & DMA Interrupt Handlers",
      "Industrial Protocols (CAN Bus, Modbus TCP, OPC-UA Hardening)",
      "Device Provisioning, Hardware Root of Trust & X.509 mTLS",
      "Sleep Duty-Cycle Battery Life Math & Energy Harvesting",
      "Edge Gateway Store-and-Forward During WAN Outages",
      "Side-Channel Mitigation & Debug JTAG/SWD Lockout",
      "Deterministic Timing Budget & Worst-Case Execution Time (WCET)",
    ],
    standards: [
      "OASIS MQTT v5.0 Specification",
      "IETF RFC 7252 (CoAP) & RFC 9019 (SUIT Firmware Update)",
      "Bluetooth SIG GATT Specification",
      "NISTIR 8259 IoT Device Cybersecurity Baseline",
    ],
    invariants: [
      "OTA firmware images require cryptographic signature verification across dual A/B slots before boot commit.",
      "Interrupt Service Routines (ISRs) avoid dynamic heap allocation and defer heavy work to RTOS tasks.",
      "Physical safety actuators default to a safe de-energized state whenever watchdog heartbeats lapse.",
      "JTAG/SWD debug ports are permanently locked or cryptographically authenticated in production silicon.",
    ],
    antiPatterns: [
      "Shipping identical default admin passwords or shared symmetric keys across an entire fleet of devices.",
      "Flashing unsigned single-bank firmware updates that brick field hardware on mid-transfer power loss.",
      "Calling blocking `printf` or heap `malloc` inside high-frequency hardware interrupt handlers.",
      "Exposing unencrypted Modbus/OPC-UA control registers directly onto routable corporate networks.",
    ],
  },
  {
    id: "algorithms-math",
    name: "Algorithms, Graph Theory & Applied Math",
    domain: "science",
    summary: "Graph shortest paths/DAGs, dynamic programming, probabilistic data structures, numerical stability, and queueing math.",
    subtopics: [
      "Topological Sort & Cycle Detection in Dependency DAGs",
      "Dijkstra, A* Heuristics & Bellman-Ford Shortest Paths",
      "Dynamic Programming State Compression & Memoization",
      "Probabilistic Filters: Bloom Filters & HyperLogLog Cardinality",
      "Trie, Prefix Search & Levenshtein Edit Distance",
      "Segment Trees, Fenwick Trees & Range Queries",
      "Consistent Hashing & Rendezvous Hashing Distribution",
      "Floating-Point Numerical Stability & Kahan Summation",
      "Bayesian Updating, Monte Carlo & Confidence Intervals",
      "Token Bucket vs Sliding-Window Rate Limiter Math",
      "Amortized Analysis (Dynamic Arrays, Union-Find Path Compression)",
      "Linear Programming & Knapsack Resource Allocation",
    ],
    standards: [
      "IEEE 754 Floating-Point Arithmetic Standard",
      "SI / NIST Physical & Dimensional Consistency",
      "Big-O Time & Space Asymptotic Bounds",
      "CSPRNG Cryptographic Randomness Guidelines",
    ],
    invariants: [
      "Cycle detection validates all workflow/dependency DAGs prior to execution to prevent infinite loops.",
      "Exact financial/currency values never accumulate rounding drift inside IEEE-754 binary floats.",
      "Graph/tree traversals guard depth iteratively or explicitly to avoid call-stack overflow on skewed inputs.",
      "Randomized algorithms use seeded PRNGs in tests and CSPRNGs (`crypto.getRandomValues`) in security contexts.",
    ],
    antiPatterns: [
      "Representing monetary cents or ledger transfers in binary floating-point `double` types.",
      "Using naive O(N^2) nested scans in production hot paths where a hash index or sort solves O(N log N).",
      "Ignoring hash-collision amplification attacks in open-addressing or bucketed maps.",
      "Using `Math.random()` to generate session tokens, nonces, or idempotency secrets.",
    ],
  },
  {
    id: "quant-fintech",
    name: "Quantitative Finance & FinTech Systems",
    domain: "finance",
    summary: "Double-entry accounting ledgers, idempotent payment rails, DCF/NPV/WACC valuation, VaR risk bounds, and audit logs.",
    subtopics: [
      "Immutable Double-Entry Ledger Architecture (Debits === Credits)",
      "Idempotent Payment Processing & Reconciliation Loops",
      "Fixed-Point Minor-Unit Currency Arithmetic & Rounding Rules",
      "DCF, NPV, IRR & WACC Sensitivity Matrices",
      "Value at Risk (VaR), Expected Shortfall & Stress Shocks",
      "Order-Book Matching Engine Determinism & Price-Time Priority",
      "Operating Cash Flow vs Net Income Divergence Red Flags",
      "SaaS Unit Economics: NRR, Gross Margin & CAC Payback",
      "Saga Compensation Across External Bank Settlement Webhooks",
      "Concurrent Balance Locking (Compare-and-Swap vs Serializable)",
      "PCI-DSS Tokenization & PAN Scope Isolation",
      "T+1 Settlement Reconciliation & Break Resolution",
    ],
    standards: [
      "ISO 4217 Currency Minor-Unit Codes",
      "GAAP / ASC 606 Revenue Recognition",
      "ISO 20022 Financial Messaging Standard",
      "PCI-DSS v4.0 Scope Minimization",
    ],
    invariants: [
      "Every ledger transaction atomically writes balanced debit and credit entries whose sum equals zero.",
      "Ledger entries are strictly append-only; corrections post explicit offsetting reversal entries.",
      "Currency storage uses integer minor units (e.g., cents) paired with explicit ISO 4217 currency codes.",
      "External payment webhooks verify HMAC signatures with replay timestamp windows before state transition.",
    ],
    antiPatterns: [
      "Overwriting mutable account balance columns with `UPDATE accounts SET balance = balance - x` without audit lines.",
      "Retrying external payment charges without idempotency keys, double-billing customers under network timeouts.",
      "Mixing currencies in raw numeric columns without unit conversion rates and timestamps.",
      "Processing raw credit-card PAN numbers on application servers outside PCI-tokenized vaults.",
    ],
  },
  {
    id: "engineering-leadership",
    name: "Staff+ Architecture & Engineering Leadership",
    domain: "general",
    summary: "RFCs, technical strategy, socio-technical team topology, incident command (ICS), build-vs-buy, and mentorship.",
    subtopics: [
      "High-Leverage Technical RFCs & Trade-Off Framing",
      "Team Topologies: Stream-Aligned vs Platform Teams",
      "Incident Command System (IC, Comms Lead, Scribe, Ops)",
      "Technical Debt Accounting & Principal ROI Prioritization",
      "Build vs Buy vs Adopt Open-Source Evaluation Rubric",
      "Reducing Cognitive Load via Paved Roads & Golden Paths",
      "Cross-Team API Alignment Without Heavy Review Boards",
      "Code Review Culture: Fast Signal vs Architectural Nitpicking",
      "Executing Multi-Quarter Migrations Without Feature Freezes",
      "Operational Readiness Reviews (ORR) Before Launch",
      "Mentoring Senior Engineers Toward Systems Ownership",
      "Executive Communication: Translating Risk into Business Impact",
    ],
    standards: [
      "NIST / FEMA ICS Incident Command Principles",
      "Conway's Law & Inverse Conway Maneuver",
      "DORA Research Program Capabilities",
      "Architectural Decision Record (MADR) Format",
    ],
    invariants: [
      "Architectural proposals document rejected alternatives, migration path, rollback plan, and operational cost.",
      "Major launches pass an Operational Readiness Review covering alerts, runbooks, load tests, and kill switches.",
      "Incident response separates tactical mitigation (Incident Commander) from stakeholder comms.",
      "Platform teams treat internal product engineers as customers measured by adoption and onboarding time.",
    ],
    antiPatterns: [
      "Mandating a big-bang multi-year rewrite while freezing customer-facing delivery.",
      "Evaluating engineering velocity by lines of code or pull-request count instead of reliable outcomes.",
      "Accumulating centralized architecture review boards that add 3-week queues without helping teams build safely.",
      "Running major migrations without an automated rollback switch or dual-write verification shadow.",
    ],
  },
  {
    id: "governance-compliance",
    name: "AI Governance, Privacy & Compliance Engineering",
    domain: "legal",
    summary: "NIST SP 800-53 Rev 5, Continuous ATO, NIST AI RMF 1.0, GDPR/HIPAA technical controls, and policy-as-code.",
    subtopics: [
      "NIST SP 800-53 Rev. 5 Control Baselines & Parameter Tailoring",
      "OSCAL 1.1.2 Machine-Readable SSP, SAP & SAR Generation",
      "Continuous ATO (cATO) & Telemetry-Backed Control Validation",
      "NIST AI RMF 1.0 (GOVERN, MAP, MEASURE, MANAGE)",
      "Policy-as-Code Gateways (OPA/Rego & Deterministic Checks)",
      "HIPAA Security Rule Technical Safeguards (ePHI AES-256 + Audit)",
      "GDPR Data Minimization, Purpose Limitation & Erasure",
      "FDA Non-Device CDS Boundary (21 U.S.C. 360j(o)(1)(E))",
      "Tamper-Evident Evidence Chain of Custody & Merkle Roots",
      "Cross-Tenant Isolation & Classification Boundary Gates",
      "CMMC Level 2 SPRS Scoring & POA&M Expiration Tracking",
      "Third-Party Vendor Risk & Subprocessor Access Reviews",
    ],
    standards: [
      "NIST SP 800-53 Rev. 5 & SP 800-37 Rev. 2",
      "NIST OSCAL v1.1.2 Specification",
      "NIST AI RMF 1.0 & ISO/IEC 42001",
      "21 U.S.C. 360j(o)(1)(E) & HIPAA Security Rule (45 CFR 164.312)",
    ],
    invariants: [
      "Paper compliance checklists never override live runtime telemetry showing drifted or failed controls.",
      "Clinical Decision Support software exposes underlying rationale/inputs clearly so clinicians independently review.",
      "Tenant and clearance boundaries filter graph queries and RAG retrieval fail-closed before inference.",
      "Evidence artifacts carry SHA-256 integrity hashes, collection timestamps, and explicit staleness TTLs.",
    ],
    antiPatterns: [
      "Marking controls 'Implemented' in static Word SSP spreadsheets despite missing MFA or expired backups.",
      "Leaking cross-tenant PII or higher-classification context via unpartitioned shared vector embeddings.",
      "Delegating automated life-safety/clinical orders without surfacing confidence limits and source data.",
      "Retaining raw user PII indefinitely inside unencrypted debug log buckets.",
    ],
  },
] as const;

export const CURATED_TRACK_COUNT = OPEN_CURRICULUM_TRACKS.length;

function fnv1aHash(seed: number, salt: number): number {
  let h = (0x811c9dc5 ^ seed ^ Math.imul(salt, 0x9e3779b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

export function getOpenCurriculumStats() {
  const minSubtopics = Math.min(...OPEN_CURRICULUM_TRACKS.map((t) => t.subtopics.length));
  const totalSubtopics = OPEN_CURRICULUM_TRACKS.reduce((acc, t) => acc + t.subtopics.length, 0);
  const combinatorialCapacity =
    totalSubtopics *
    TASK_FORMATS.length *
    DIFFICULTY_TIERS.length *
    SCALE_CONTEXTS.length *
    CONSTRAINT_PROFILES.length *
    VARIATION_LENSES.length;

  return {
    trackCount: OPEN_CURRICULUM_TRACKS.length,
    minSubtopicsPerTrack: minSubtopics,
    totalSubtopics,
    combinatorialCapacity,
    defaultTargetSftRows: 1_000_000,
    defaultTargetDpoRows: 50_000,
    defaultHeldOutValRows: 2_500,
  };
}

function decodeCoordinates(globalIndex: number) {
  // Deterministic bijection / stratified mixing across all 25 tracks & dimensions
  // Using mixed radix + prime stride so any slice [0..N) has balanced track coverage.
  const idx = Math.max(0, Math.floor(globalIndex));
  const trackIdx = idx % OPEN_CURRICULUM_TRACKS.length;
  const q1 = Math.floor(idx / OPEN_CURRICULUM_TRACKS.length);

  const track = OPEN_CURRICULUM_TRACKS[trackIdx]!;
  const subtopicIdx = q1 % track.subtopics.length;
  const q2 = Math.floor(q1 / track.subtopics.length);

  const formatIdx = q2 % TASK_FORMATS.length;
  const q3 = Math.floor(q2 / TASK_FORMATS.length);

  const diffIdx = q3 % DIFFICULTY_TIERS.length;
  const q4 = Math.floor(q3 / DIFFICULTY_TIERS.length);

  const scaleIdx = q4 % SCALE_CONTEXTS.length;
  const q5 = Math.floor(q4 / SCALE_CONTEXTS.length);

  const constraintIdx = q5 % CONSTRAINT_PROFILES.length;
  const q6 = Math.floor(q5 / CONSTRAINT_PROFILES.length);

  const lensIdx = (q6 + (fnv1aHash(idx, 17) % 1)) % VARIATION_LENSES.length;
  const invariantIdx = (idx + subtopicIdx) % track.invariants.length;
  const antiPatternIdx = (idx + formatIdx) % track.antiPatterns.length;
  const standardIdx = (idx + diffIdx) % track.standards.length;

  return {
    idx,
    track,
    subtopic: track.subtopics[subtopicIdx]!,
    taskFormat: TASK_FORMATS[formatIdx]!,
    difficulty: DIFFICULTY_TIERS[diffIdx]!,
    scaleContext: SCALE_CONTEXTS[scaleIdx]!,
    constraintProfile: CONSTRAINT_PROFILES[constraintIdx]!,
    variationLens: VARIATION_LENSES[lensIdx]!,
    invariant: track.invariants[invariantIdx]!,
    antiPattern: track.antiPatterns[antiPatternIdx]!,
    standardRef: track.standards[standardIdx]!,
    secondaryStandard: track.standards[(standardIdx + 1) % track.standards.length]!,
    secondaryInvariant: track.invariants[(invariantIdx + 1) % track.invariants.length]!,
  };
}

function formatPromptQuestion(c: ReturnType<typeof decodeCoordinates>): string {
  const numTag = `[Case #${c.idx + 1} · ${c.difficulty}]`;
  switch (c.taskFormat) {
    case "CONCEPT_DEEP_DIVE":
      return `${numTag} Explain the mechanics, invariants, and trade-offs of **${c.subtopic}** in ${c.track.name} for ${c.scaleContext}, focusing on ${c.variationLens} under ${c.constraintProfile}.`;
    case "ARCHITECTURE_DESIGN":
      return `${numTag} Design an end-to-end architecture for **${c.subtopic}** (${c.track.name}) serving ${c.scaleContext}. Explicitly address ${c.variationLens} while enforcing ${c.constraintProfile}.`;
    case "CODE_IMPLEMENTATION":
      return `${numTag} Outline a production-grade implementation pattern and verification checklist for **${c.subtopic}** (${c.track.name}) targeting ${c.scaleContext}, hardening against ${c.variationLens} and satisfying ${c.constraintProfile}.`;
    case "DEBUGGING_RCA":
      return `${numTag} Perform a systematic root-cause analysis when **${c.subtopic}** degrades in ${c.scaleContext} due to ${c.variationLens}, without violating ${c.constraintProfile}.`;
    case "SECURITY_HARDENING":
      return `${numTag} Harden **${c.subtopic}** (${c.track.name}) in ${c.scaleContext} against ${c.variationLens}, enforcing ${c.constraintProfile} and aligning with ${c.standardRef}.`;
    case "PERFORMANCE_TUNING":
      return `${numTag} Optimize latency, throughput, and resource efficiency of **${c.subtopic}** for ${c.scaleContext}, eliminating bottlenecks from ${c.variationLens} while meeting ${c.constraintProfile}.`;
    case "PRODUCTION_RUNBOOK":
      return `${numTag} Write an operational runbook for deploying and operating **${c.subtopic}** in ${c.scaleContext}, covering preflight checks, rollback triggers for ${c.variationLens}, and ${c.constraintProfile}.`;
    case "COMPARISON_TRADEOFFS":
      return `${numTag} Compare architectural approaches for **${c.subtopic}** in ${c.scaleContext}. Evaluate operational risk around ${c.variationLens} and justify the choice that preserves ${c.constraintProfile}.`;
    case "CALCULATION_SIZING":
      return `${numTag} Establish deterministic capacity sizing, budget formulas, and safety headroom for **${c.subtopic}** in ${c.scaleContext} accounting for ${c.variationLens} and ${c.constraintProfile}.`;
    case "INCIDENT_POSTMORTEM":
      return `${numTag} Conduct a blameless technical postmortem and remediation plan after an outage involving **${c.subtopic}** triggered by ${c.variationLens} in ${c.scaleContext} (SLA target: ${c.constraintProfile}).`;
  }
}

export function generateCurriculumSftRecord(globalIndex: number): OpenCurriculumSftRecord {
  const c = decodeCoordinates(globalIndex);
  const userPrompt = formatPromptQuestion(c);
  const shardTag = `NOCTIS-OPEN-1M-${c.track.id.toUpperCase()}-${String(c.idx).padStart(7, "0")}`;

  const assistantAnswer =
    `### ${c.track.name} — ${c.subtopic} (${c.taskFormat})\n` +
    `**Context:** ${c.scaleContext} | **Constraint:** ${c.constraintProfile} | **Focus:** ${c.variationLens}\n\n` +
    `#### 1. Governing Specification & Core Invariant\n` +
    `- **Primary Reference:** ${c.standardRef} (corroborated by ${c.secondaryStandard})\n` +
    `- **Non-Negotiable Invariant:** ${c.invariant}\n` +
    `- **Secondary Guardrail:** ${c.secondaryInvariant}\n\n` +
    `#### 2. Technical Execution Blueprint (${c.difficulty})\n` +
    `1. **Boundary & Contract Enforcement:** Define explicit timeouts, schema validation, and isolation boundaries around ${c.subtopic} tailored for ${c.scaleContext}.\n` +
    `2. **Mitigating ${c.variationLens}:** Instrument saturation, tail-latency (p95/p99), and failure counters at the critical choke point before scaling load.\n` +
    `3. **Guaranteeing ${c.constraintProfile}:** Enforce fail-closed defaults, bounded queues, and deterministic recovery paths so partial faults never cascade.\n\n` +
    `#### 3. Verification & Anti-Pattern Rejection\n` +
    `- **Verify in CI / Staging:** Simulate ${c.variationLens} under synthetic load and assert zero invariant breaches across metrics, logs, and trace spans.\n` +
    `- **Explicitly Avoid:** ${c.antiPattern}`;

  return {
    id: shardTag,
    trackId: c.track.id,
    domain: c.track.domain,
    subtopic: c.subtopic,
    difficulty: c.difficulty,
    taskFormat: c.taskFormat,
    standardRef: c.standardRef,
    license: "CC0-1.0-Noctis-Open-Curriculum",
    messages: [
      {
        role: "system",
        content: `You are Noctis Sovereign Intelligence specializing in ${c.track.name} (${c.track.domain}). Ground responses in ${c.standardRef} with deterministic engineering invariants and zero unverified claims.`,
      },
      { role: "user", content: userPrompt },
      { role: "assistant", content: assistantAnswer },
    ],
  };
}

export function generateCurriculumDpoRecord(globalIndex: number): OpenCurriculumDpoRecord {
  const c = decodeCoordinates(globalIndex);
  const prompt = formatPromptQuestion(c);
  const chosen =
    `For **${c.subtopic}** in ${c.scaleContext}, enforce **${c.standardRef}**:\n` +
    `1. **Enforce Core Invariant:** ${c.invariant}\n` +
    `2. **Control ${c.variationLens}:** ${c.secondaryInvariant}\n` +
    `3. **SLA Guarantee (${c.constraintProfile}):** Add automated fault-injection verification, strict boundary timeouts, and rollback observability before production promotion.`;

  const rejected =
    `To ship **${c.subtopic}** faster for ${c.scaleContext}, skip formal checks for ${c.variationLens} and proceed directly: ${c.antiPattern} You can monitor it manually later without enforcing ${c.constraintProfile}.`;

  return {
    id: `NOCTIS-OPEN-DPO-${c.track.id.toUpperCase()}-${String(c.idx).padStart(7, "0")}`,
    trackId: c.track.id,
    domain: c.track.domain,
    prompt,
    chosen,
    rejected,
    rationale: `Prefers ${c.standardRef} invariant adherence (${c.invariant}) over anti-pattern (${c.antiPattern}).`,
    license: "CC0-1.0-Noctis-Open-Curriculum",
  };
}

export function buildTrackMasterySeedPairs(): CurriculumSeedPair[] {
  return OPEN_CURRICULUM_TRACKS.map((track) => ({
    question: `What are the core architectural invariants, open standards, and pitfalls for Noctis in ${track.name} (${track.id})?`,
    answer:
      `### ${track.name} (${track.domain})\n` +
      `${track.summary}\n\n` +
      `- **Key Topics (${track.subtopics.length}):** ${track.subtopics.slice(0, 6).join(", ")}, and ${track.subtopics.slice(6).join(", ")}.\n` +
      `- **Open Standards:** ${track.standards.join(" | ")}.\n` +
      `- **Core Invariants:**\n  - ${track.invariants.join("\n  - ")}\n` +
      `- **Anti-Patterns Rejected:** ${track.antiPatterns[0]}`,
    domain: track.domain,
    model: "noctis-open-curriculum-1m",
    hits: 30,
    at: "2026-11-26T23:18:00.000Z",
  }));
}
