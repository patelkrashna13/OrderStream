# OrderStream — Database Sharding Ingestion Architecture

A scalable Node.js backend for processing bulk order files, securely storing raw data in Google Cloud Storage, and distributing validated orders across sharded PostgreSQL databases.

## 🚀 Features

* **Streaming Processing** — Processes CSV/Excel files without loading the entire file into memory.
* **Google Cloud Storage** — Archives uploaded files using Google Application Default Credentials (ADC).
* **Application-Level Sharding** — Routes orders across PostgreSQL shards using `customer_id` hashing.
* **Batch Inserts** — Inserts records in batches of 500 using PostgreSQL transactions.
* **Error Isolation** — Invalid rows are logged and stored separately without stopping valid records.
* **Observability** — Tracks import jobs, failed records, and structured logs using Pino.

## 🏗️ Architecture

```text
Client
  │
  ▼
POST /upload-orders
  │
  ├──► Google Cloud Storage
  │
  └──► Streaming Parser
          │
          ├── Valid Rows
          │      ▼
          │   Shard Router
          │      │
          │      ├──► PostgreSQL Shard 1
          │      └──► PostgreSQL Shard 2
          │
          └── Invalid Rows
                 ▼
            Failed Records
```

![alt text](image.png)

## 🛠️ Tech Stack

* Node.js
* Express.js
* PostgreSQL
* Google Cloud Storage
* `csv-parser`
* `ExcelJS`
* Pino

## ⚡ Quick Start

### 1. Install

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Example:

```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

GCS_BUCKET_NAME=your-gcs-bucket

DB_SHARD_COUNT=2
DB_SHARD_1_URL=postgresql://postgres:postgres@localhost:5432/orders_shard_1
DB_SHARD_2_URL=postgresql://postgres:postgres@localhost:5433/orders_shard_2

BATCH_SIZE=500
MAX_FILE_SIZE_BYTES=52428800
```

### 3. Run Migrations

```bash
npm run migrate
```

### 4. Start Server

```bash
npm start
```

Development:

```bash
npm run dev
```

Server runs on:

```text
http://localhost:3000
```

## ☁️ Google ADC Setup

No service-account JSON keys are stored in the repository.

For local development:

```bash
gcloud auth application-default login
```

The Google Cloud Storage SDK automatically uses these credentials.

## 🗄️ Sharding Strategy

Order data uses **application-level sharding** based on `customer_id`.

```text
ShardIndex = Hash(customer_id) % NumberOfShards
```

This keeps orders belonging to the same customer on the same shard, making customer-based queries efficient.

### Why `customer_id`?

* Simple deterministic routing
* Even distribution across shards
* Customer orders remain together
* Avoids unnecessary scatter-gather queries

## 📡 API Endpoints

### Upload Orders

```http
POST /upload-orders
```

Accepts CSV/Excel files, uploads the raw file to GCS, validates records, and stores valid orders in PostgreSQL.

### Get Order

```http
GET /orders/:orderId
```

### Get Customer Orders

```http
GET /orders?customerId=CUST-0001
```

### Health Check

```http
GET /health
```

## 🔄 Processing Flow

```text
Upload File
     ↓
Store in GCS
     ↓
Stream & Parse
     ↓
Validate Rows
     ↓
Route to Shard
     ↓
Batch Insert
     ↓
Commit Transaction
     ↓
Return Processing Summary
```

Invalid records are isolated and stored in `failed_records`.

## 🧪 Testing

Generate sample data:

```bash
npm run generate-sample
```

Run all tests:

```bash
npm test
```

Unit tests:

```bash
npm run test:unit
```

Integration tests:

```bash
npm run test:integration
```

## 📁 Project Deliverables

* Source code
* `README.md`
* PostgreSQL migrations
* `.env.example`
* Unit & integration tests

## 📌 Key Design Decisions

| Decision                | Purpose                  |
| ----------------------- | ------------------------ |
| Streaming               | Low memory usage         |
| GCS + ADC               | Secure file storage      |
| Customer-based sharding | Scalable database writes |
| Batch inserts           | Better performance       |
| Transactions            | Data consistency         |
| Failed records          | Fault isolation          |
| Structured logging      | Better observability     |

## 👨‍💻 Project

**OrderStream — High-Performance Order Ingestion & Processing Platform**
