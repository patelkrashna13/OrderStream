# Coding Standards

## 1. General Principles

This document defines the technical coding standards, style conventions, and architectural guidelines for the **Backend Engineering Assessment** system. All codebase contributions must adhere to these standards to ensure code readability, maintainability, performance, and security.

- **Clean Architecture & Separation of Concerns**: Keep transport HTTP controllers, business domain logic, stream transformers, database sharding routers, and cloud infrastructure decoupled `[Requirement]`.
- **Zero Static Credentials**: Never hardcode API keys, database passwords, or Google Cloud service account keys. All cloud operations must rely on Google Application Default Credentials (ADC) `[Requirement]`.
- **Asynchronous Non-Blocking Execution**: Use `async/await` and streaming APIs for I/O bound operations. Never block the event loop with synchronous file or database calls `[Requirement]`.
- **Defensive Error Isolation**: Isolate row parsing errors so invalid rows in bulk ingestion files do not crash the Node.js process `[Requirement]`.

---

## 2. Folder Organization

The project codebase follows a modular, feature-by-layer structure:

```
src/
├── config/             # Configuration modules, environment variable readers, ADC helpers
├── controllers/        # Express request/response transport handlers
├── routes/             # Express API route definitions
├── services/           # Business domain services (Upload, Ingestion, Validation)
├── streams/            # Stream transformers, CSV/Excel parsers
├── sharding/           # Shard Router, shard key strategy functions, connection pool maps
├── database/           # PostgreSQL pool managers, batch inserters, migration scripts
├── utils/              # Helper utilities, logger instances, custom error classes
└── app.js              # Express application factory / entry point
```

---

## 3. Naming Conventions

### 3.1 Casing Summary

| Target Element | Casing Style | Example |
| :--- | :--- | :--- |
| **Files & Directories** | `kebab-case` | `upload-controller.js`, `shard-router.js` |
| **Variables & Functions** | `camelCase` | `orderAmount`, `processFileStream()` |
| **Classes & Interfaces** | `PascalCase` | `ValidationEngine`, `ShardRouter` |
| **Constants & Environment Variables** | `UPPER_SNAKE_CASE` | `BATCH_SIZE`, `GCS_BUCKET_NAME` |
| **Database Tables & Columns** | `snake_case` | `order_id`, `customer_id`, `order_amount` |

---

## 4. File Naming

- Files must use **`kebab-case`** suffixes matching their role `[Recommendation]`:
  - Controllers: `upload.controller.js` or `upload-controller.js`
  - Services: `ingestion.service.js` or `ingestion-service.js`
  - Routes: `orders.routes.js` or `orders-routes.js`
  - Utilities: `logger.js`

---

## 5. Function Naming

- Functions must be named using **`camelCase`** and start with a verb describing the action `[Recommendation]`:
  - `parseOrderStream()`
  - `validateOrderRow()`
  - `getShardConnection()`
  - `executeBatchInsert()`

---

## 6. Variable Naming

- Variables must use **`camelCase`** and have self-descriptive names `[Recommendation]`.
- Avoid single-letter variable names except for index loops (`i`, `j`).
- Boolean variables must start with a verb prefix (`isValid`, `hasError`, `isCompleted`).

---

## 7. Class Naming

- Classes must use **`PascalCase`** nouns reflecting domain responsibility `[Recommendation]`:
  - `ShardRouter`
  - `StreamValidationTransformer`
  - `GcsStorageAdapter`

---

## 8. Async/Await Standards

- **Avoid Callbacks**: Always use Promises and `async/await` syntax for asynchronous operations `[Requirement]`.
- **Top-Level Error Catching**: Always wrap asynchronous route handlers or use async middleware wrappers to catch rejected Promises `[Requirement]`.
- **Parallel Promises**: Use `Promise.all()` for concurrent independent asynchronous tasks (e.g., querying multiple database shards in parallel) `[Recommendation]`.

---

## 9. Error Handling Standards

- **Custom Error Classes**: Define custom error classes inheriting from standard `Error` (e.g., `ValidationError`, `GcsUploadError`, `DatabaseShardError`) `[Recommendation]`.
- **No Swallowed Exceptions**: Never use empty `catch` blocks (`catch (err) {}`). Always log errors or propagate them to error handling middleware `[Requirement]`.
- **Row Validation Isolation**: Parse errors on individual dataset rows must be logged and skipped; fatal stream or connection errors must abort gracefully `[Requirement]`.

---

## 10. Logging Standards

- **Structured Logging Framework**: Use a high-performance JSON logging library (e.g., Pino or Winston) `[Recommendation]`.
- **Log Levels**:
  - `FATAL`: Process-crashing unhandled exceptions.
  - `ERROR`: Component failure (GCS upload dropped, database transaction failure).
  - `WARN`: Isolated malformed row skipped during ingestion.
  - `INFO`: Operational milestones (upload start, batch committed, process complete).
  - `DEBUG`: Ingestion batch progress counters and connection state details.
- **Forbidden Log Items**: Never log sensitive environment credentials or secret keys `[Requirement]`.

---

## 11. Validation Standards

- **Input Payload Validation**: Validate incoming HTTP headers and file extension types before initializing stream parsers `[Requirement]`.
- **Row-Level Attribute Validation**: Enforce exact type checks for mandatory order attributes (`order_id`, `customer_id`, `order_date`, `order_amount`, `status`) `[Requirement]`.
- **Non-Fatal Error Isolation**: Validation errors on dataset rows must append details to audit logs or dead-letter storage without terminating processing `[Requirement]`.

---

## 12. Database Access Standards

- **No Raw String Concatenation**: Never build dynamic SQL strings via string concatenation. Always use parameterized queries (`$1, $2, ...`) to eliminate SQL injection `[Requirement]`.
- **Connection Pooling**: Use connection pools (`pg.Pool`) per database shard with strictly bounded pool limits (e.g., 10–20 connections) `[Requirement]`.
- **Explicit Transactions**: Wrap multi-row batch insert operations inside `BEGIN` and `COMMIT` / `ROLLBACK` blocks `[Requirement]`.

---

## 13. Configuration Standards

- **Centralized Configuration**: All application settings must be loaded through a centralized configuration module (`src/config/index.js`) reading from `process.env` `[Recommendation]`.
- **Immutability**: Export read-only frozen configuration objects to prevent accidental runtime state mutation `[Recommendation]`.

---

## 14. Environment Variable Standards

- **Configuration File**: Environment variables must be loaded from `.env` files using `dotenv` `[Requirement]`.
- **Template Requirement**: Maintain a comprehensive `.env.example` file containing key names and default values without sensitive secrets `[Requirement]`.
- **Required Variable Categories**:
  - `PORT`: HTTP server port.
  - `GCS_BUCKET_NAME`: Target Google Cloud Storage bucket.
  - `DB_SHARD_HOSTS`: Connection strings or host maps for PostgreSQL shards.
  - `BATCH_SIZE`: Bulk insert chunk size limit.

---

## 15. API Standards

- **REST Conventions**: Use standard HTTP verbs (`POST /upload-orders`, `GET /orders/:orderId`) mapping to domain resources `[Requirement]`.
- **URI Path Versioning**: Prefix all API routes with `/api/v1/` `[Recommendation]`.
- **Explicit Content-Type**: Enforce `multipart/form-data` for uploads and `application/json` for API responses `[Requirement]`.

---

## 16. Response Standards

- **Standard Envelope**: Format all JSON response bodies using consistent response envelopes `[Recommendation]`:
  - **Success**: `{ "status": "success", "message": "...", "data": { ... } }`
  - **Error**: `{ "status": "error", "code": "...", "message": "...", "details": [ ... ] }`

---

## 17. Exception Standards

- **HTTP Exception Mapping**: Map internal domain exceptions directly to appropriate HTTP status codes `[Requirement]`:
  - `ValidationError` -> `400 Bad Request` or `422 Unprocessable Entity`
  - `GcsStorageError` -> `502 Bad Gateway`
  - `DatabaseShardError` -> `500 Internal Server Error`

---

## 18. Security Standards

- **Google Application Default Credentials (ADC)**: Rely on `gcloud` ADC locally or Workload Identity in cloud deployment; never commit service account keys `[Requirement]`.
- **Payload Limits**: Cap maximum incoming file upload stream size (e.g., 50MB) to mitigate DoS attacks `[Recommendation]`.
- **SQL Parameterization**: Parameterize all queries to enforce SQL injection immunity `[Requirement]`.

---

## 19. Performance Standards

- **Stream File Processing**: Stream file payloads sequentially using streams to maintain constant memory consumption (< 50MB RAM) `[Requirement]`.
- **Batch SQL Inserts**: Group record insertions into multi-row batch statements (500–1000 items per chunk) `[Requirement]`.
- **Event Loop Responsiveness**: Avoid heavy CPU-blocking calculations on the main Node.js thread.

---

## 20. Code Review Checklist

Submissions and pull requests must be evaluated against this checklist:

- [ ] Does the code comply with `camelCase` / `PascalCase` / `kebab-case` naming rules?
- [ ] Are all database queries parameterized?
- [ ] Is Google ADC used for GCS storage authentication without key files?
- [ ] Are file uploads streamed without loading the entire payload into RAM?
- [ ] Are row validation errors caught and isolated gracefully?
- [ ] Are batch database inserts executed within explicit SQL transactions?
- [ ] Is a `.env.example` file updated with all required configuration keys?
- [ ] Is structured JSON logging used for major operational events?

---

## 21. Documentation Standards

- **Inline JSDoc Comments**: Document function parameters, return types, and thrown exceptions using standard JSDoc syntax for complex service modules `[Recommendation]`.
- **`README.md` Completeness**: Document setup instructions, ADC configuration, sharding strategy rationale, and trade-off decisions `[Requirement]`.

---

## 22. Git Commit Standards

- **Conventional Commit Messages**: Format git commit messages using Conventional Commits standard `[Recommendation]`:
  - `feat: add streaming CSV parser module`
  - `fix: correct shard router modulo calculation`
  - `docs: update ADC setup instructions in README`
  - `refactor: optimize batch insert SQL builder`

---

## 23. Branch Naming

- **Standard Branch Structure**: Name branches using type prefixes `[Recommendation]`:
  - `feature/gcs-adc-integration`
  - `feature/stream-validator`
  - `fix/transaction-rollback-handling`

---

## 24. Pull Request Standards

- **PR Descriptions**: Pull requests must include a summary of changes, testing steps performed, and verification of GCS/Database operations `[Recommendation]`.

---

## 25. Best Practices

1. **Fail Fast on Invalid Config**: Validate required environment variables at application startup and abort immediately if critical configurations are missing `[Recommendation]`.
2. **Handle Stream Backpressure**: Ensure writable streams observe backpressure signals (`write() === false`) to prevent memory buffering `[Requirement]`.
3. **Idempotent Database Writes**: Utilize idempotent SQL syntax (`ON CONFLICT DO NOTHING`) where appropriate to support retry execution `[Recommendation]`.

---

## 26. Summary

These **Coding Standards** ensure that the codebase developed for the Backend Engineering Assessment adheres to enterprise-grade Node.js, PostgreSQL, and GCP practices. By enforcing modular architecture, stream processing, keyless ADC authentication, transactional batch execution, and structured logging, the application guarantees high performance, security, and maintainability.
