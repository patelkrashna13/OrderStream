-- Migration: 001_create_tables.sql
-- Description: Core tables and indexes for sharded order persistence and auditing

-- Enable UUID extension if supported
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Orders Table (Primary Domain Entity)
CREATE TABLE IF NOT EXISTS orders (
    order_id VARCHAR(128) PRIMARY KEY,
    customer_id VARCHAR(128) NOT NULL,
    order_date TIMESTAMPTZ NOT NULL,
    order_amount NUMERIC(12, 2) NOT NULL CHECK (order_amount >= 0),
    status VARCHAR(50) NOT NULL,
    job_id VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Orders Query Acceleration
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_date ON orders (customer_id, order_date DESC);

-- 2. Import Jobs Table (Operational Auditing)
CREATE TABLE IF NOT EXISTS import_jobs (
    job_id VARCHAR(128) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    gcs_uri VARCHAR(512),
    total_records INT DEFAULT 0,
    valid_records INT DEFAULT 0,
    failed_records INT DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'PROCESSING',
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs (status);

-- 3. Failed Records Table (Dead-Letter Storage)
CREATE TABLE IF NOT EXISTS failed_records (
    failure_id VARCHAR(128) PRIMARY KEY,
    job_id VARCHAR(128),
    line_number INT,
    raw_payload TEXT,
    failure_reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_failed_records_job_id ON failed_records (job_id);

-- 4. Processing Logs Table (System Observability)
CREATE TABLE IF NOT EXISTS processing_logs (
    log_id VARCHAR(128) PRIMARY KEY,
    job_id VARCHAR(128),
    log_level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_processing_logs_job ON processing_logs (job_id, log_level);
