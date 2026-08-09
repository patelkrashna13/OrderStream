const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger.config');
const logger = require('../utils/logger');

/**
 * Registers Swagger UI middleware on an Express application
 * @param {import('express').Application} app 
 * @param {string} [path='/api-docs'] 
 */
function setupSwagger(app, routePath = '/api-docs') {
  const options = {
    customCss: `
      .swagger-ui .topbar { background: #0f172a; border-bottom: 1px solid rgba(148, 163, 184, 0.18); box-shadow: 0 10px 30px rgba(15, 23, 42, 0.22); }
      .swagger-ui .topbar a span { color: #38bdf8 !important; }
      .swagger-ui .topbar a img { display: none; }
      .swagger-ui .topbar .link span { font-weight: 700; }
      .swagger-ui .wrapper { background: #020617; }
      .swagger-ui .info { background: rgba(15, 23, 42, 0.96); border-radius: 24px; padding: 28px; border: 1px solid rgba(148, 163, 184, 0.16); box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18); }
      .swagger-ui .info h1 { color: #f8fafc; font-size: 2.25rem; margin-bottom: 12px; }
      .swagger-ui .info p { color: #cbd5e1; line-height: 1.75; }
      .swagger-ui .schemes, .swagger-ui .scheme-container, .swagger-ui .swagger-ui .info { background: transparent; }
      .swagger-ui .opblock-tag-section { margin-bottom: 20px; }
      .swagger-ui .opblock-tag { border-radius: 24px; background: rgba(15, 23, 42, 0.92); border: 1px solid rgba(148, 163, 184, 0.12); box-shadow: 0 18px 50px rgba(15, 23, 42, 0.18); }
      .swagger-ui .opblock { background: rgba(15, 23, 42, 0.9); border-radius: 20px; border: 1px solid rgba(148, 163, 184, 0.14); margin-bottom: 20px; box-shadow: 0 20px 55px rgba(15, 23, 42, 0.12); }
      .swagger-ui .opblock-summary { padding: 20px 24px; min-height: 72px; }
      .swagger-ui .opblock-summary-method { color: #0f172a; background: linear-gradient(135deg, #38bdf8 0%, #8b5cf6 100%); border-radius: 14px; padding: 10px 16px; font-weight: 700; }
      .swagger-ui .opblock-summary-description { color: #cbd5e1; }
      .swagger-ui .opblock-summary-path { font-size: 0.95rem; color: #dbeafe; }
      .swagger-ui .opblock-body { border-top: 1px solid rgba(148, 163, 184, 0.1); padding: 20px 22px 24px; }
      .swagger-ui .responses-table, .swagger-ui .request-body, .swagger-ui .parameter-content, .swagger-ui .examples-wrapper, .swagger-ui .responses-inner { background: rgba(15, 23, 42, 0.88); border-radius: 18px; border: 1px solid rgba(148, 163, 184, 0.12); }
      .swagger-ui .responses-table td, .swagger-ui .responses-table th { border-color: rgba(148, 163, 184, 0.12); }
      .swagger-ui .btn.authorize { background: #38bdf8; color: #0f172a; border-radius: 999px; padding: 10px 18px; font-weight: 700; }
      .swagger-ui .btn.execute { background: #8b5cf6; border-radius: 999px; color: #fff; }
      .swagger-ui .btn.try-out__btn, .swagger-ui button.cancel, .swagger-ui .btn.execute, .swagger-ui .opblock-summary-control { border-radius: 999px; }
      .swagger-ui .opblock-summary-control { background: rgba(255, 255, 255, 0.05); }
      .swagger-ui .response-col_description__inner, .swagger-ui .response-col_status__inner { background: rgba(15, 23, 42, 0.92); padding: 16px; border-radius: 14px; }
      .swagger-ui .tab li.active a { color: #38bdf8; }
    `,
    customSiteTitle: 'OrderStream API Docs',
  };

  app.use(routePath, swaggerUi.serve, swaggerUi.setup(swaggerSpec, options));
  logger.info(`Swagger UI documentation registered at [${routePath}]`);
}

module.exports = {
  setupSwagger,
  swaggerSpec,
};
