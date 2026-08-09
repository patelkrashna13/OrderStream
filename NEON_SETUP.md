# Neon PostgreSQL Setup Guide

This guide outlines the step-by-step procedure for provisioning, configuring, and connecting the backend system to **Neon PostgreSQL** (https://neon.tech/).

---

## Table of Contents

1. [Neon Account Setup](#1-neon-account-setup)
2. [Creating a Database & Branches](#2-creating-a-database--branches)
3. [Obtaining Connection Strings](#3-obtaining-connection-strings)
4. [Environment Configuration](#4-environment-configuration)
5. [Running Database Migrations](#5-running-database-migrations)
6. [Verifying Database Connection](#6-verifying-database-connection)
7. [Connection Pooling & Sharding Notes](#7-connection-pooling--sharding-notes)
8. [Common Troubleshooting Steps](#8-common-troubleshooting-steps)

---

## 1. Neon Account Setup

1. Go to [https://neon.tech](https://neon.tech) and click **Sign Up**.
2. Authenticate using GitHub, Google, or Email.
3. Once logged in, navigate to the Neon Console dashboard (`https://console.neon.tech`).

---

## 2. Creating a Database & Branches

### Single Database Provisioning
1. Click **New Project** in the Neon Console.
2. Enter a **Project Name** (e.g., `orders-ingestion-backend`).
3. Select your preferred **Cloud Provider** (AWS) and **Region** (e.g., `us-east-1` or closest to your application deployment).
4. Enter the default **Database Name** (default is `neondb`).
5. Click **Create Project**.

### Sharded Setup Provisioning (Optional)
If maintaining multi-shard logical database separation per the application sharding router:
- **Option A (Multiple Projects/Endpoints)**: Create 2 separate Neon projects or databases named `orders_shard_1` and `orders_shard_2`.
- **Option B (Same Database)**: Use the default database `neondb` URI for both `DB_SHARD_1_URL` and `DB_SHARD_2_URL` (or separate database names on the same compute endpoint).

---

## 3. Obtaining Connection Strings

1. In the Neon Console Dashboard, locate the **Connection Details** widget on the right sidebar.
2. Select your target **Branch** (usually `main`) and **Database** (`neondb`).
3. Choose **Node.js** or **psql** from the dropdown menu to inspect the connection format.
4. Copy the complete PostgreSQL connection URI. It will look like this:

```text
postgresql://neondb_owner:npg_xYz123Abc@ep-cool-name-123456.us-east-1.aws.neon.tech/neondb?sslmode=require
```

> [!IMPORTANT]
> Always ensure `?sslmode=require` is present in the connection string. Neon strictly requires SSL encryption for all external database connections.

---

## 4. Environment Configuration

1. Copy `.env.example` to create your local `.env` file:

```bash
cp .env.example .env
```

2. Edit `.env` and set the `DB_SHARD_1_URL` and `DB_SHARD_2_URL` variables to your Neon connection strings:

```env
# Application Configuration
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Google Cloud Storage Configuration
GCS_BUCKET_NAME=orders-ingestion-bucket

# Database Sharding Connection Strings (Neon PostgreSQL)
DB_SHARD_COUNT=2
DB_SHARD_1_URL=postgresql://user:password@ep-shard1.us-east-1.aws.neon.tech/neondb?sslmode=require
DB_SHARD_2_URL=postgresql://user:password@ep-shard2.us-east-1.aws.neon.tech/neondb?sslmode=require

# Pipeline Configuration
BATCH_SIZE=500
MAX_FILE_SIZE_BYTES=52428800
```

---

## 5. Running Database Migrations

The application includes an automated DDL migration runner at `src/database/migrate.js` that applies the table schemas (`orders`, `import_jobs`, `failed_records`, `processing_logs`) and indexes across all configured Neon database shards.

Run the migration command:

```bash
npm run migrate
```

### Sample Expected Output:

```text
[2026-08-07 00:30:00.000 +0000] INFO: Applying database schema migrations across 2 shard(s)...
[2026-08-07 00:30:01.200 +0000] INFO: Schema migration applied successfully to Shard [0]
[2026-08-07 00:30:01.400 +0000] INFO: Schema migration applied successfully to Shard [1]
[2026-08-07 00:30:01.405 +0000] INFO: All database schema migrations completed successfully.
```

---

## 6. Verifying Database Connection

### 1. Via Application Health Check
Start the server and check database connectivity logs:

```bash
npm start
```

You can also send a request to the health check endpoint:

```bash
curl http://localhost:3000/health
```

### 2. Via `psql` Command Line
Test direct connection using PostgreSQL CLI:

```bash
psql "postgresql://user:password@ep-shard1.us-east-1.aws.neon.tech/neondb?sslmode=require" -c "SELECT version();"
```

---

## 7. Connection Pooling & Sharding Notes

- **Client Pooling**: The Node.js `pg.Pool` automatically manages connections with a `max: 20` bounded limit and a `10,000ms` connection timeout tailored for Neon serverless responsiveness.
- **Neon Built-in Pooled Endpoint**: If using high-concurrency serverless function deployment, use Neon's pooled connection strings (which include `-pooler` in the endpoint hostname, e.g., `ep-name-pooler.region.aws.neon.tech`).

---

## 8. Common Troubleshooting Steps

### Issue 1: `SSL/TLS connection required` Error
- **Cause**: The connection string is missing `?sslmode=require` or SSL is disabled in `pg.Pool`.
- **Solution**: Ensure your connection URI in `.env` ends with `?sslmode=require`. `src/database/pool.js` automatically enables `{ ssl: { rejectUnauthorized: false } }` whenever connecting to a Neon domain.

### Issue 2: `Connection timeout (10000ms)` or Cold Start Delays
- **Cause**: Neon compute endpoints automatically suspend after 5 minutes of inactivity on free plans. The initial request wakes up the compute endpoint.
- **Solution**: The application uses a 10-second `connectionTimeoutMillis`. If cold starts exceed this limit, check your network connectivity to the Neon cloud region or trigger a warmup ping via `/health`.

### Issue 3: `too many clients already` Connection Limit Exceeded
- **Cause**: Client connection pool limit per instance exceeds Neon endpoint max connection limit.
- **Solution**: Use Neon pooled connection strings (`-pooler` hostname) which utilize PgBouncer under the hood to support thousands of concurrent client connections.

### Issue 4: `extension "uuid-ossp" is not available`
- **Cause**: Restricted PostgreSQL permissions.
- **Solution**: Neon supports `uuid-ossp` and `pgcrypto` natively for default database admin users (`neondb_owner`). Ensure your user role has extension creation privileges or use standard `gen_random_uuid()`.
