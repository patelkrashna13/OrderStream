# Implementation Guide

## 1. Project Goal

The goal of this project is to build a high-performance, memory-efficient Node.js backend application for the **Backend Engineering Assessment**. The application accepts bulk order dataset files (~10,000 records in CSV or Excel format), archives raw files in Google Cloud Storage (GCS) using Google Application Default Credentials (ADC), streams and validates record payloads, and persists validated order records into a sharded PostgreSQL database setup using transactional batch execution `[Requirement]`.

---

## 2. Technology Stack

| Technology | Purpose | Notes |
| :--- | :--- | :--- |
| **Node.js (v18+ LTS)** | Backend Runtime Environment | Provides event-driven, non-blocking I/O execution `[Requirement]`. |
| **Express.js** | HTTP REST API Framework | Handles incoming HTTP requests and routing `[Requirement]`. |
| **PostgreSQL (v12+)** | Relational Database | Stores order records across sharded tables/instances `[Requirement]`. |
| **Google Cloud Storage SDK** | Cloud File Storage | Archives uploaded orders files into GCS buckets `[Requirement]`. |
| **Google ADC** | Keyless Cloud Authentication | Authenticates GCP calls without hardcoded key files `[Requirement]`. |
| **Multer** | Multipart File Upload Middleware | Streams incoming file uploads from HTTP requests `[Requirement]`. |
| **`csv-parser` / `exceljs`** | Streaming File Parsers | Reads CSV/Excel rows incrementally without loading RAM `[Requirement]`. |
| **`pg` (node-postgres)** | PostgreSQL Database Client | Manages database connection pools and SQL queries `[Requirement]`. |
| **`dotenv`** | Environment Configuration | Loads environment variables from `.env` files `[Requirement]`. |
| **Pino / Winston** | Structured JSON Logging | Emits operational, validation, and error logs `[Recommendation]`. |

---

## 3. Development Order

To build the application systematically and prevent integration roadblocks, development should proceed in the following 12 sequential steps:

1. **Project Initialization**: Initialize the Git repository, Node.js project (`package.json`), and folder structure.
2. **Environment Configuration**: Create `.env.example` and setup `dotenv` config loaders.
3. **Database Connection Setup**: Create multi-pool database connections (`pg.Pool`) targeting PostgreSQL shards.
4. **Google Cloud Storage Integration**: Initialize GCS SDK using Google ADC authentication (`gcloud auth application-default login`).
5. **File Upload Intake Layer**: Configure Multer middleware for streaming multipart file uploads on `POST /upload-orders`.
6. **Streaming File Parser**: Implement stream parser transforms for CSV and Excel files.
7. **Row Validation Engine**: Implement row-level field type checks (`order_id`, `customer_id`, `order_date`, `order_amount`, `status`).
8. **Shard Router Implementation**: Build deterministic shard routing logic based on chosen shard key (`customer_id`, Hash of `order_id`, or `order_date`).
9. **Transactional Batch Persistence**: Build batch chunking and multi-row SQL insert execution wrapped in database transactions (`BEGIN` ... `COMMIT`).
10. **API Controller & Routing**: Complete `POST /upload-orders` response formatting and add optional endpoints (`GET /orders/:orderId`, `GET /orders?customerId=`).
11. **Structured Logging Integration**: Add upload lifecycle, batch metrics, and validation error logging.
12. **Testing & Documentation**: Verify end-to-end ingestion with sample 10,000-record files and complete `README.md`.

---

## 4. Module Responsibilities

The system is decomposed into modular layers with explicit responsibilities:

- **Config (`src/config/`)**: Reads environment variables, sets default values, and initializes read-only configuration objects.
- **Database (`src/database/`)**: Manages PostgreSQL connection pools per shard, executes parameterized SQL queries, and handles transactions.
- **Google Cloud (`src/cloud/`)**: Wraps `@google-cloud/storage` SDK, managing file uploads authenticated via Google ADC.
- **Upload (`src/upload/`)**: Configures Multer stream middleware to accept file payloads without disk buffering.
- **Parser (`src/parser/`)**: Transforms raw file streams into JavaScript record objects row-by-row.
- **Validation (`src/validation/`)**: Verifies record attribute types and domain rules ($order\_amount > 0$), isolating malformed rows.
- **Shard Router (`src/sharding/`)**: Calculates destination shard indices for records/batches using the designated shard key.
- **Repository (`src/repositories/`)**: Encapsulates database query composition and multi-row batch insert SQL execution.
- **Service (`src/services/`)**: Orchestrates business logic, coordinating upload streaming, validation, routing, and batch persistence.
- **Controller (`src/controllers/`)**: Manages HTTP request extraction, invokes application services, and formats JSON responses.
- **Routes (`src/routes/`)**: Maps HTTP paths (`POST /upload-orders`, `GET /orders`) to controller methods.
- **Logger (`src/utils/logger.js`)**: Provides structured JSON logging across all application components.

---

## 5. Folder Structure Overview

```
src/
├── config/             # Environment variables and ADC configuration settings
├── controllers/        # HTTP transport controllers (Request parsing, status codes)
├── database/           # PostgreSQL connection pools and migration DDL scripts
├── cloud/              # Google Cloud Storage SDK wrapper (ADC authenticated)
├── middlewares/        # Express middleware (Multer file upload, error handler)
├── parsers/            # CSV/Excel streaming parser implementations
├── repositories/       # Database access objects and batch SQL builders
├── routes/             # Express API endpoint route definitions
├── services/           # Application domain services (Ingestion pipeline orchestrator)
├── sharding/           # Shard key evaluation and multi-pool shard router
├── utils/              # Structured logger and helper functions
├── validation/         # Order schema validation rules and error isolation logic
└── app.js              # Express app factory and server initialization
```

### Folder Purpose Summary
- `config/`: Centralizes `.env` reading and ADC cloud storage setup.
- `controllers/`: Handles HTTP request intake and formats JSON response bodies.
- `database/`: Holds database pool definitions and SQL migration DDLs.
- `cloud/`: Manages GCS cloud storage bucket streams.
- `middlewares/`: Exposes Multer upload limits and global error boundaries.
- `parsers/`: Houses streaming file readers to process files chunk-by-chunk.
- `repositories/`: Composes batch insert SQL statements for target shards.
- `routes/`: Defines HTTP path endpoints (`/api/v1/upload-orders`).
- `services/`: Coordinates end-to-end ingestion pipeline logic.
- `sharding/`: Computes deterministic shard destinations for database writes.
- `utils/`: Houses Pino/Winston logging instances.
- `validation/`: Enforces type checks on parsed order fields.

---

## 6. Coding Guidelines

Follow these core coding guidelines during development:

1. **Keep Controllers Thin**: Controllers should only handle HTTP request extraction and response formatting. Business processing belongs in Services `[Recommendation]`.
2. **Encapsulate Business Logic in Services**: Service modules orchestrate file streaming, validation, routing, and batch persistence `[Recommendation]`.
3. **Always Use Async/Await**: Avoid callbacks; handle asynchronous Promises cleanly using `async/await` `[Requirement]`.
4. **Validate All Input Data**: Verify file extension types, multipart headers, and row-level attributes before processing `[Requirement]`.
5. **Handle Errors Gracefully**: Isolate row validation errors so malformed rows do not crash the Node.js process `[Requirement]`.
6. **Avoid Duplicate Code**: Extract shared utilities (such as logger calls or formatters) into common utility helpers `[Recommendation]`.
7. **Keep Configuration in `.env`**: Never hardcode ports, database strings, or GCS bucket names in source code `[Requirement]`.

---

## 7. Development Rules

Maintain these operational development rules:

1. **Build One Module at a Time**: Complete and verify individual modules (e.g., Database connection before Shard Router) sequentially `[Recommendation]`.
2. **Test Each Module Before Proceeding**: Execute unit or integration checks on a module before moving to dependent layers `[Recommendation]`.
3. **Avoid Modifying Completed Modules Unnecessarily**: Keep module interfaces stable once verified `[Recommendation]`.
4. **Follow Project Documentation**: Adhere strictly to specs defined in `System_Architecture.md`, `Database_Design.md`, and `API_Design.md` `[Requirement]`.
5. **Write Clean, Readable Code**: Use self-descriptive variable names (`camelCase`) and modular functions `[Recommendation]`.

---

## 8. Testing Plan

Step-by-step verification plan for every module:

- **Database Connection Testing**: Run a test script to verify successful connection pool instantiation (`pg.Pool`) across all PostgreSQL database shards.
- **GCS Upload Testing**: Verify that test file streams upload successfully to the designated GCS bucket using Google ADC credentials.
- **CSV/Excel Parsing Testing**: Pass sample CSV and Excel files through stream parsers and verify row-by-row object generation under low memory footprint.
- **Validation Testing**: Pass valid and malformed order payloads through the Validation Engine; verify valid rows pass and invalid rows are caught and logged.
- **Batch Insert Testing**: Execute multi-row batch insert scripts (`500–1000 rows`) inside SQL transactions; verify database insertion and rollback safety.
- **API End-to-End Testing**: Use API clients (Postman or cURL) to trigger `POST /upload-orders` with a 10,000-record sample file, verifying HTTP 200 responses and metric output.

---

## 9. Definition of Done

A development module is considered **Done** when:

1. **Functionality Verified**: All requirements for the module execute cleanly without errors `[Requirement]`.
2. **Error Boundary Maintained**: Operational errors are caught, logged, and isolated without crashing the application `[Requirement]`.
3. **Structured Logging Added**: Structured log entries are emitted for major module milestones `[Requirement]`.
4. **Standards Adhered To**: Code complies with rules in `Coding_Standards.md` `[Requirement]`.
5. **Module Tested**: Verification tests pass successfully `[Requirement]`.

---

## 10. Next Steps

Execution order from start to finish:

```
[ Step 1: Project Setup ] ---> [ Step 2: Config & ADC ] ---> [ Step 3: Database Shards ]
                                                                      |
[ Step 6: Validation ]   <--- [ Step 5: Stream Parser ] <--- [ Step 4: GCS Upload ]
          |
          v
[ Step 7: Shard Router ] ---> [ Step 8: Batch Inserts ] ---> [ Step 9: API Controller ]
                                                                      |
[ Step 12: README & Delivery ] <--- [ Step 11: End-to-End Test ] <--- [ Step 10: Logging ]
```

1. Initialize project structure, dependencies, and `.env.example`.
2. Configure Google ADC authentication and GCS cloud storage SDK adapter.
3. Establish PostgreSQL multi-shard database connection pools and schema migrations.
4. Build Multer stream intake middleware and pipe uploads to GCS.
5. Connect CSV/Excel streaming parser to intake stream.
6. Attach Validation Engine to inspect row fields and isolate invalid rows.
7. Build Shard Router to compute target database shards based on shard key.
8. Implement Batch Insert Service to execute transactional bulk SQL writes.
9. Implement `POST /upload-orders` API controller and JSON response formatter.
10. Add structured logging across all processing stages.
11. Execute end-to-end integration tests using 10,000-record dataset files.
12. Finalize `README.md` documentation and prepare submission package.
