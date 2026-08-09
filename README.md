# Backend Engineering Assessment — Scalable Order Ingestion System

A production-ready Node.js backend application designed to ingest, validate, and store bulk dataset files (~10,000 order records per upload in CSV or Excel format), archive raw files in Google Cloud Storage (GCS) using Google Application Default Credentials (ADC), and persist records into a horizontally sharded PostgreSQL database cluster.

---

## Technical Features & Highlights

- **Stream-Based File Processing**: Incremental parsing of CSV (`csv-parser`) and Excel (`exceljs`) files under constant low memory usage (< 50MB RAM).
- **Google ADC Integration**: Secure, credential-less GCP authentication via `gcloud` Application Default Credentials without hardcoded keys or committed secrets.
- **Application-Level Sharding**: Horizontal write scaling across PostgreSQL database instances using a deterministic `customer_id` modulo hashing strategy.
- **Transactional Batch Writes**: Grouping validated records into multi-row SQL insert batches (500 items per chunk) wrapped in explicit PostgreSQL transactions (`BEGIN` ... `COMMIT` / `ROLLBACK`).
- **Defensive Error Isolation**: Row-level validation engine isolating and logging malformed rows without crashing the stream pipeline or terminating valid row persistence.
- **Auditing & Observability**: Complete dead-letter storage (`failed_records`), job progress tracking (`import_jobs`), and structured JSON logging (`pino`).

---

## System Architecture

```
[ HTTP Multipart File Stream (POST /upload-orders) ]
                         │
                         ▼
             [ API Ingestion Controller ]
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
[ GCS Stream Upload (via ADC) ]   [ Streaming File Parser ]
(gs://bucket/orders/file.csv)     (CSV / Excel Row-by-Row)
                                          │
                                          ▼
                              [ Row Validation Engine ]
                              (Schema & Type Validation)
                                     │         │
                     (Valid Row)     │         │ (Invalid Row)
                        ┌────────────┘         └────────────┐
                        ▼                                   ▼
             [ Application Shard Router ]          [ Isolated Error Logger ]
             (customer_id Modulo Hashing)          (Insert into failed_records)
                        │
                        ▼
      [ Transactional Batch Processor (500 items) ]
                        │
        ┌───────────────┴───────────────┐
        ▼                               ▼
[ PostgreSQL Shard 1 ]        [ PostgreSQL Shard 2 ]
```

---

## 1. Quick Start & Execution Guide

### Prerequisites
- Node.js (v18+ LTS)
- PostgreSQL (v12+) engine instances
- Google Cloud SDK CLI (`gcloud`)

### Step 1: Clone & Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to create your local `.env` configuration file:
```bash
cp .env.example .env
```

Ensure environment configuration values match your local database and GCS bucket settings:
```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

GCS_BUCKET_NAME=your-gcs-orders-bucket

DB_SHARD_COUNT=2
DB_SHARD_1_URL=postgresql://postgres:postgres@localhost:5432/orders_shard_1
DB_SHARD_2_URL=postgresql://postgres:postgres@localhost:5433/orders_shard_2

BATCH_SIZE=500
MAX_FILE_SIZE_BYTES=52428800
```

### Step 3: Run Database Schema Migrations
Execute the automated database schema migration runner across all configured PostgreSQL shards:
```bash
npm run migrate
```

### Step 4: Start Server
```bash
# Production mode
npm start

# Development mode (with auto-reload)
npm run dev
```

The application will launch on `http://localhost:3000`.

---

## 2. Google Application Default Credentials (ADC) Setup

This project enforces Google Cloud's security mandate: **zero static service account key JSON files or plain secrets are committed to the code repository**.

### Local Development Authentication
To authenticate locally with Google Cloud Storage:

1. Install the [Google Cloud SDK CLI](https://cloud.google.com/sdk/docs/install).
2. Authenticate your developer machine using Application Default Credentials:
   ```bash
   gcloud auth application-default login
   ```
3. Select your Google Cloud project containing the target GCS bucket. The `@google-cloud/storage` SDK automatically resolves these ADC credentials from your environment.

### Cloud / Production Deployment Context
In cloud hosting environments (such as Google Cloud Run, Google Kubernetes Engine, or Compute Engine), ADC automatically inherits the bound IAM Service Account identity via Workload Identity without requiring any local key files.

---

## 3. Sharding Strategy Explanation & Rationale

### Chosen Strategy: `customer_id` Modulo Hashing Strategy (Recommended)

The database persistence tier implements **Application-Level Sharding** with a **`customer_id` Modulo Hashing Strategy**.

#### How Shard Routing Works:
1. When a validated order record is received, the `ShardRouter` passes the record's `customer_id` string into a deterministic MD5/32-bit integer hash function (`hashString(customer_id)`).
2. The hash value is evaluated against the total shard count using modulo arithmetic:
   $$\text{ShardIndex} = |\text{Hash}(\text{customer\_id})| \pmod{N}$$
3. The `ShardRouter` routes the record or batch directly to the target `pg.Pool` connection pool corresponding to $\text{ShardIndex}$.

#### Architectural Trade-offs & Benefits:
- **Benefits**: Co-locates all order transactions for a given customer onto the same database shard instance. This makes customer order history queries (`GET /orders?customerId=`) highly optimal, executing directly against a single target shard without scatter-gather overhead.
- **Alternative Strategies**:
  - **Hash of `order_id`**: Ensures perfectly uniform data distribution across shards, but turns customer history queries into scatter-gather operations across all shards.
  - **Time-Based (`order_date`)**: Ideal for time-series archiving, but creates write hotspots on the current month/year partition.

---

## 4. Architectural Design Decisions & Trade-Offs

| Decision | Rationale | Architectural Benefits | Trade-offs |
| :--- | :--- | :--- | :--- |
| **Streaming File Parsing** | Avoid loading full ~10k payloads into RAM. | Constant low memory usage (< 50MB RAM); handles concurrent large uploads. | Requires handling Node.js stream events and backpressure signals (`pause`/`resume`). |
| **Google ADC Authentication** | Eliminates static cloud key files per assessment mandate. | High security posture; zero committed key vulnerabilities. | Local dev requires running `gcloud auth application-default login`. |
| **Chunked Multi-Row Batch Inserts** | Executes bulk `INSERT INTO orders ... VALUES (...), (...)` in 500-item chunks. | Increases write throughput 10x–50x over single-row inserts; reduces network round-trips. | Requires temporary in-memory batch buffers before flushing to database. |
| **Transactional Atomicity** | Wraps multi-row batch inserts in `BEGIN` ... `COMMIT` / `ROLLBACK` blocks. | Guarantees atomic writes per chunk; prevents dirty/corrupt database states. | Batch write failure triggers rollback for that specific 500-record chunk. |
| **Defensive Row Validation** | Catches field type/constraint errors per row. | Non-fatal row errors are isolated, logged, and sent to `failed_records` without crashing ingestion. | Ingestion summary includes malformed row metrics. |

---

## 5. API Endpoint Documentation

### 1. Ingest Bulk Orders File
- **Endpoint**: `POST /upload-orders` or `POST /api/v1/upload-orders`
- **Content-Type**: `multipart/form-data`
- **Form Field**: `file` (CSV `.csv` or Excel `.xlsx`, `.xls` file)
- **Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "message": "Orders file ingested successfully.",
    "data": {
      "jobId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "filename": "sample_orders_10k.csv",
      "gcsUri": "gs://orders-bucket/orders/1723000000000_sample_orders_10k.csv",
      "metrics": {
        "totalRecords": 10000,
        "insertedRecords": 9900,
        "failedRecords": 100,
        "processingTimeMs": 3420
      }
    }
  }
  ```

### 2. Fetch Single Order (Bonus Endpoint)
- **Endpoint**: `GET /orders/:orderId` or `GET /api/v1/orders/:orderId`
- **Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "data": {
      "orderId": "ORD-2026-000001",
      "customerId": "CUST-0001",
      "orderDate": "2026-08-06T14:30:00.000Z",
      "orderAmount": 149.99,
      "status": "COMPLETED"
    }
  }
  ```

### 3. Fetch Customer Orders (Bonus Endpoint)
- **Endpoint**: `GET /orders?customerId=CUST-0001` or `GET /api/v1/orders?customerId=CUST-0001`
- **Response (`200 OK`)**:
  ```json
  {
    "status": "success",
    "data": {
      "customerId": "CUST-0001",
      "totalCount": 20,
      "orders": [...]
    }
  }
  ```

### 4. Health Check Endpoint (Bonus Endpoint)
- **Endpoint**: `GET /health`
- **Response (`200 OK`)**:
  ```json
  {
    "status": "UP",
    "timestamp": "2026-08-06T22:35:00.000Z",
    "components": {
      "gcsStorage": "CONNECTED",
      "databaseShards": {
        "shard1": "UP",
        "shard2": "UP"
      }
    }
  }
  ```

---

## 6. Testing Guide

Generate a sample 10,000-record CSV test file:
```bash
npm run generate-sample
```

Run automated unit and integration tests:
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration
```

---

## 7. Submission Checklist Verification

- [x] **Source Code (Git Repository)**: Modular Node.js codebase adhering to clean architecture rules.
- [x] **`README.md`**: Complete documentation for setup, ADC config, sharding strategy, and trade-offs.
- [x] **SQL Migrations**: `src/database/migrations/001_create_tables.sql` DDLs and indexing scripts.
- [x] **`.env.example`**: Clean environment template without committed secret keys.
#   O r d e r S t r e a m  
 