const { useState } = React;

function App() {
  const [timestamp] = useState(new Date().toLocaleString());

  const openApiDocs = () => {
    window.location.href = 'http://localhost:3000/api-docs/';
  };

  return (
    <div className="main-container">
      <div className="dashboard-card">
        <div className="header-row">
          <div className="title-block">
            <span className="badge">OrderStream</span>
            <h1>Sharded Orders Dashboard</h1>
            <p>Upload bulk order files, track processing status, and explore API documentation from a modern dashboard landing page.</p>
          </div>
          <div className="hero-buttons">
            <button className="primary-cta" onClick={openApiDocs}>
              Click the Shard Database
            </button>
          </div>
        </div>

        <div className="grid-panels">
          <section className="panel">
            <h2>Fast Ingestion Flow</h2>
            <p>Stream multipart uploads directly into GCS while validating each row in real time. Only clean, verified orders are routed to the correct PostgreSQL shard.</p>
            <ul className="panel-list">
              <li>CSV / Excel file streaming</li>
              <li>Application-level shard routing</li>
              <li>Transactional batch inserts</li>
            </ul>
          </section>

          <section className="panel">
            <h2>Swagger Docs</h2>
            <p>Inspect endpoints, sample payloads, and schema definitions using a refreshed OpenAPI UI.</p>
          </section>
        </div>

        <section className="panel" style={{ marginTop: '24px' }}>
          <h2>Live Session Snapshot</h2>
          <p>OrderStream is ready to run locally on <strong>http://localhost:3000</strong>. Your documentation is available instantly through the button above.</p>
        </section>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
