/**
 * Swagger API Documentation Setup
 *
 * Configures Swagger UI for interactive API documentation.
 * Serves the OpenAPI specification at /api-docs.
 *
 * @module interfaces/http/swagger
 */

import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../../infrastructure/config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load OpenAPI specification from file
 */
function loadOpenAPISpec(): Record<string, any> {
  try {
    const specPath = path.join(process.cwd(), 'docs', 'api', 'openapi.yaml');

    // For now, we'll create a minimal spec inline
    // In production, you'd parse the YAML file
    const openApiSpec = {
      openapi: '3.0.3',
      info: {
        title: 'PatrolManager API',
        description: 'RESTful API for PatrolManager - Security guard management system with real-time tracking, incident reporting, and patrol coordination.',
        version: '1.0.0',
        contact: {
          name: 'PatrolManager API Support',
          email: 'support@patrolmanager.com',
        },
        license: {
          name: 'Proprietary',
        },
      },
      servers: [
        {
          url: config.server.apiUrl || 'http://localhost:3000/api/v1',
          description: config.server.env === 'production' ? 'Production server' : 'Development server',
        },
      ],
      tags: [
        { name: 'Authentication', description: 'User authentication and authorization endpoints' },
        { name: 'Users', description: 'User management operations' },
        { name: 'Roles', description: 'Role and permission management' },
        { name: 'Sites', description: 'Site and location management' },
        { name: 'Checkpoints', description: 'Patrol checkpoint management' },
        { name: 'Patrols', description: 'Patrol template and execution management' },
        { name: 'Incidents', description: 'Incident reporting and workflow' },
        { name: 'Reports', description: 'Analytics and reporting endpoints' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT authentication for mobile clients',
          },
          sessionAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'connect.sid',
            description: 'Session-based authentication for web admin panel',
          },
        },
        schemas: {
          Error: {
            type: 'object',
            required: ['error', 'timestamp'],
            properties: {
              error: {
                type: 'object',
                required: ['code', 'message'],
                properties: {
                  code: { type: 'string', example: 'AUTH_001' },
                  message: { type: 'string', example: 'Invalid credentials' },
                  details: { type: 'object' },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          User: {
            type: 'object',
            required: ['id', 'email', 'firstName', 'lastName', 'role', 'status'],
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              role: { type: 'string', enum: ['admin', 'manager', 'supervisor', 'guard'] },
              status: { type: 'string', enum: ['active', 'inactive', 'suspended', 'on_leave'] },
              phone: { type: 'string', nullable: true },
              employeeId: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        responses: {
          Unauthorized: {
            description: 'Unauthorized - authentication required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: {
                  error: { code: 'AUTH_005', message: 'Invalid or expired token', details: {} },
                  timestamp: '2024-02-23T10:00:00Z',
                },
              },
            },
          },
          Forbidden: {
            description: 'Forbidden - insufficient permissions',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: {
                  error: { code: 'AUTHZ_001', message: 'Insufficient permissions', details: {} },
                  timestamp: '2024-02-23T10:00:00Z',
                },
              },
            },
          },
          NotFound: {
            description: 'Resource not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: {
                  error: { code: 'RES_001', message: 'Resource not found', details: {} },
                  timestamp: '2024-02-23T10:00:00Z',
                },
              },
            },
          },
          RateLimitExceeded: {
            description: 'Rate limit exceeded',
            headers: {
              'Retry-After': { description: 'Seconds until retry is allowed', schema: { type: 'integer' } },
              'X-RateLimit-Limit': { description: 'Rate limit quota', schema: { type: 'integer' } },
              'X-RateLimit-Remaining': { description: 'Remaining requests', schema: { type: 'integer' } },
              'X-RateLimit-Reset': { description: 'Unix timestamp when quota resets', schema: { type: 'integer' } },
            },
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: {
                  error: { code: 'RATE_001', message: 'Rate limit exceeded', details: { retryAfter: 60 } },
                  timestamp: '2024-02-23T10:00:00Z',
                },
              },
            },
          },
        },
      },
      security: [{ bearerAuth: [] }, { sessionAuth: [] }],
      paths: {},
    };

    return openApiSpec;
  } catch (error) {
    console.error('Failed to load OpenAPI specification:', error);
    return {};
  }
}

/**
 * Swagger UI configuration options
 */
export const swaggerOptions: swaggerUi.SwaggerOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: config.server.isDevelopment ? 'list' : 'none',
    filter: true,
    showRequestHeaders: true,
    tryItOutEnabled: true,
    syntaxHighlight: {
      activate: true,
      theme: 'monokai',
    },
    defaultModelExpandDepth: 1,
    defaultModelRendering: 'example',
    displayOperationId: false,
    maxDisplayedTags: 0, // Show all tags
    operationsSorter: 'alpha', // Sort operations alphabetically
    tagsSorter: 'alpha', // Sort tags alphabetically
    supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
    validatorUrl: null, // Disable online validator for security
  },
  customSiteTitle: 'PatrolManager API Documentation',
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { font-size: 32px; font-weight: 700; color: #1e293b; }
    .swagger-ui .info .description { color: #64748b; }
    .swagger-ui .info .baseUrl { color: #3b82f6; font-weight: 600; }
    .swagger-ui .scheme-container { margin: 20px 0; }
    .swagger-ui .loading-container { display: none; }
    .swagger-ui .btn.authorize {
      background-color: #3b82f6;
      border-color: #3b82f6;
    }
    .swagger-ui .btn.authorize:hover {
      background-color: #2563eb;
      border-color: #2563eb;
    }
    .swagger-ui .opblock.opblock-post {
      border-color: #49cc90;
    }
    .swagger-ui .opblock.opblock-post .opblock-summary {
      border-color: #49cc90;
    }
    .swagger-ui .opblock.opblock-get {
      border-color: #61affe;
    }
    .swagger-ui .opblock.opblock-get .opblock-summary {
      border-color: #61affe;
    }
    .swagger-ui .opblock.opblock-put {
      border-color: #fca130;
    }
    .swagger-ui .opblock.opblock-put .opblock-summary {
      border-color: #fca130;
    }
    .swagger-ui .opblock.opblock-delete {
      border-color: #f93e3e;
    }
    .swagger-ui .opblock.opblock-delete .opblock-summary {
      border-color: #f93e3e;
    }
    .swagger-ui .responses-inner h4,
    .swagger-ui .responses-inner h5 {
      color: #1e293b;
      font-weight: 600;
    }
    .swagger-ui .response-col_status {
      color: #3b82f6;
      font-weight: 600;
    }
    .swagger-ui .tab li {
      padding: 0 20px;
    }
    .swagger-ui .tab li.active:after {
      background: #3b82f6;
    }
  `,
  customfavIcon: '/assets/favicon.ico',
  customJs: `
    // Add custom JavaScript for enhanced functionality
    console.log('PatrolManager API Documentation loaded');
  `,
};

/**
 * Swagger UI HTML template with custom branding
 */
export const swaggerHtmlTemplate = (req: any, res: any, next: any) => {
  const html = swaggerUi.generateHTML(loadOpenAPISpec(), swaggerOptions);
  res.send(html);
};

/**
 * Register Swagger UI middleware with the Express app
 *
 * @param app - Express application instance
 */
export function registerSwagger(app: Express): void {
  const openApiSpec = loadOpenAPISpec();

  // Serve the OpenAPI JSON specification
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(openApiSpec);
  });

  // Serve Swagger UI
  app.use('/api-docs', swaggerUi.serve);
  app.get('/api-docs', swaggerUi.setup(openApiSpec, swaggerOptions));

  // Also serve at root docs path for convenience
  app.use('/docs', swaggerUi.serve);
  app.get('/docs', swaggerUi.setup(openApiSpec, swaggerOptions));
}

/**
 * Middleware to add API documentation link to responses
 */
export function addDocsLink(req: any, res: any, next: any) {
  res.setHeader('X-API-Docs', `${req.protocol}://${req.get('host')}/api-docs`);
  next();
}

export default registerSwagger;
