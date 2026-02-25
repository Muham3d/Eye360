# PatrolManager Security Best Practices

**Version:** 1.0
**Last Updated:** 2026-02-24
**Applies To:** Backend API & Admin Panel

---

## Table of Contents

1. [Authentication Security](#authentication-security)
2. [Session Management](#session-management)
3. [Password Security](#password-security)
4. [API Security](#api-security)
5. [Database Security](#database-security)
6. [Input Validation](#input-validation)
7. [Error Handling](#error-handling)
8. [Logging and Monitoring](#logging-and-monitoring)
9. [Deployment Security](#deployment-security)
10. [Development Practices](#development-practices)

---

## Authentication Security

### JWT Token Management

```typescript
// DO: Use strong secrets (minimum 32 characters)
JWT_SECRET=use_a_minimum_32_character_random_secret_here

// DO: Set appropriate expiration times
JWT_EXPIRES_IN=1h        // Access tokens: short-lived
JWT_REFRESH_EXPIRES_IN=7d // Refresh tokens: longer-lived

// DO: Include issuer and audience
const token = jwt.sign(payload, secret, {
  issuer: 'patrolmanager',
  audience: 'patrolmanager-api',
  expiresIn: '1h'
});

// DON'T: Include sensitive data in tokens
// Avoid: password, personal data, internal IDs
```

### Token Storage

```typescript
// Mobile (JWT): Store in secure storage
// Android: EncryptedSharedPreferences
// iOS: Keychain

// Web (Session): HttpOnly, Secure, SameSite cookies
app.use(session({
  cookie: {
    httpOnly: true,
    secure: true,      // HTTPS only
    sameSite: 'strict',
    maxAge: 86400000   // 24 hours
  }
}));
```

### Multi-Factor Authentication (Recommended for Admin)

```typescript
// Implement TOTP for admin accounts
import speakeasy from 'speakeasy';

function generateTOTPSecret(userId: number) {
  return speakeasy.generateSecret({
    name: 'PatrolManager Admin',
    issuer: 'PatrolManager'
  });
}

function verifyTOTP(token: string, secret: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token
  });
}
```

---

## Session Management

### Session Configuration

```typescript
// DO: Configure sessions properly
const sessionConfig = {
  secret: process.env.SESSION_SECRET,  // Min 32 characters
  resave: false,
  saveUninitialized: false,
  rolling: true,                       // Refresh on activity
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000        // 24 hours
  },
  name: 'pm_session'                   // Custom name (not connect.sid)
};
```

### Session Fixation Prevention

```typescript
// DO: Regenerate session after login
app.post('/login', (req, res) => {
  // Authenticate user...
  req.session.regenerate((err) => {
    req.session.user = authenticatedUser;
    res.redirect('/dashboard');
  });
});

// DON'T: Use predictable session IDs
```

### Concurrent Session Limits

```typescript
// Limit concurrent sessions per user
const MAX_SESSIONS_PER_USER = 5;

async function createSession(userId: number) {
  const activeSessions = await getActiveSessions(userId);

  if (activeSessions.length >= MAX_SESSIONS_PER_USER) {
    // Revoke oldest session
    await revokeSession(activeSessions[0].id);
  }

  return await createNewSession(userId);
}
```

---

## Password Security

### Password Policy

```typescript
// Minimum requirements (enforced)
const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false,  // Optional
  preventCommon: true,        // Block "password123", etc.
  preventSequential: true,    // Block "abc123", "123456"
  preventRepeated: true       // Block "aaa111"
};
```

### Password Hashing

```typescript
// DO: Use bcrypt with appropriate cost factor
import bcrypt from 'bcrypt';

const BCRYPT_COST = 12;  // 12 is recommended as of 2024

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(BCRYPT_COST);
  return bcrypt.hash(password, salt);
}

// DON'T: Use MD5, SHA1, or SHA256 for passwords
// DON'T: Implement your own hashing algorithm
```

### Password Reset Flow

```typescript
// 1. Generate secure token (time-based)
function generateResetToken(userId: number): string {
  const payload = { userId, type: 'password_reset' };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '1h'
  });
}

// 2. Send via email (NEVER return in API)
async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;
  await emailService.send({
    to: email,
    subject: 'Password Reset Request',
    template: 'password-reset',
    data: { resetUrl }
  });
}

// 3. Verify token server-side
async function verifyResetToken(token: string) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'password_reset') {
      throw new Error('Invalid token type');
    }
    return decoded.userId;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}
```

### Password History

```typescript
// Prevent password reuse (last 5 passwords)
async function validatePasswordHistory(
  userId: number,
  newPasswordHash: string
): Promise<boolean> {
  const history = await getPasswordHistory(userId, 5);

  for (const entry of history) {
    if (await bcrypt.compare(newPasswordHash, entry.passwordHash)) {
      return false;  // Password was used recently
    }
  }

  return true;
}
```

---

## API Security

### Request Validation

```typescript
// DO: Validate all inputs
import Joi from 'joi';

const loginSchema = Joi.object({
  email: Joi.string().email().required().max(255),
  password: Joi.string().min(8).max(128).required()
});

router.post('/login',
  validateRequest({ body: loginSchema }),
  authController.login
);

// DON'T: Trust client-side validation only
```

### Rate Limiting

```typescript
// Tiered rate limiting
const rateLimitConfig = {
  // Authentication endpoints (strict)
  auth: rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 5,                      // 5 attempts
    skipSuccessfulRequests: true
  }),

  // API endpoints (moderate)
  api: rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 100                    // 100 requests
  }),

  // GPS tracking (lenient)
  gps: rateLimit({
    windowMs: 1 * 60 * 1000,   // 1 minute
    max: 60                     // 1 per second
  })
};
```

### CORS Configuration

```typescript
// DO: Configure CORS properly
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGIN.split(',');

    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400  // 24 hours
};
```

### Security Headers

```typescript
// DO: Use Helmet for security headers
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
```

---

## Database Security

### SQL Injection Prevention

```typescript
// DO: Use parameterized queries (Sequelize ORM)
const users = await User.findAll({
  where: {
    email: req.body.email  // Automatically parameterized
  }
});

// DON'T: Concatenate user input into queries
// Bad: `WHERE email = '${req.body.email}'`
```

### Sensitive Data Storage

```typescript
// DO: Hash sensitive data
const user = await User.create({
  email: email.toLowerCase(),
  passwordHash: await hashPassword(password),
  // Other fields...
});

// DON'T: Store passwords in plain text or reversible encryption
```

### Database Connection Security

```javascript
// .env configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=patrolmanager
DB_USER=patrolmanager_app  // Limited privilege account
DB_PASSWORD=strong_password_here
DB_SSL=true                // Enable SSL in production
DB_POOL_MIN=2
DB_POOL_MAX=10
```

### Query Optimization

```typescript
// DO: Select only needed fields
const users = await User.findAll({
  attributes: ['id', 'email', 'firstName', 'lastName'],  // No password
  where: { status: 'active' }
});

// DON'T: Use SELECT * unnecessarily
```

---

## Input Validation

### Email Validation

```typescript
// Use proper email validation
const emailSchema = Joi.string()
  .email()
  .lowercase()
  .trim()
  .max(255)
  .required();

// Normalize email before storage
const normalizedEmail = email.toLowerCase().trim();
```

### Phone Number Validation

```typescript
const phoneSchema = Joi.string()
  .trim()
  .pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
  .optional();
```

### Sanitization

```typescript
// DO: Sanitize user input
import * as sanitizer from 'sanitize-html';

function sanitizeHtml(input: string): string {
  return sanitizer(input, {
    allowedTags: [],
    allowedAttributes: {}
  });
}

// For names and other text fields
function sanitizeText(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}
```

---

## Error Handling

### Generic Error Messages

```typescript
// DO: Use generic error messages for auth
return res.status(401).json({
  error: 'Invalid credentials'
});

// DON'T: Reveal which field is incorrect
// Bad: "Email not found" or "Incorrect password"
```

### Safe Error Responses

```typescript
// DO: Log details, return generic message
app.use((err, req, res, next) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    requestId: req.id
  });

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'An error occurred'
      : err.message
  });
});
```

---

## Logging and Monitoring

### Security Events

```typescript
// Log security-relevant events
const securityEvents = [
  'login_success',
  'login_failed',
  'account_locked',
  'password_changed',
  'password_reset_requested',
  'permission_denied',
  'suspicious_activity_detected'
];

async function logSecurityEvent(event: {
  type: string;
  userId?: number;
  email: string;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, unknown>;
}) {
  await SecurityEventLog.create({
    ...event,
    timestamp: new Date(),
    severity: event.type.includes('failed') ? 'warning' : 'info'
  });
}
```

### Audit Trail

```typescript
// Maintain audit trail for sensitive operations
async function createAuditLog(params: {
  action: string;
  entityType: string;
  entityId: number;
  performedBy: number;
  changes?: Record<string, { from: unknown; to: unknown }>;
}) {
  await AuditLog.create({
    ...params,
    timestamp: new Date(),
    ipAddress: getRequestIP(),
    userAgent: getUserAgent()
  });
}
```

---

## Deployment Security

### Environment Variables

```bash
# .env.example (commit to git)
JWT_SECRET=generate_a_strong_random_secret_minimum_32_chars
SESSION_SECRET=generate_a_different_strong_random_secret_minimum_32_chars
DB_PASSWORD=set_a_strong_database_password

# .env.production (DO NOT commit)
# Use actual secrets in production
```

### SSL/TLS Configuration

```typescript
// DO: Enforce HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (!req.secure) {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Configure HSTS
app.use(helmet.hsts({
  maxAge: 31536000,
  includeSubDomains: true,
  preload: true
}));
```

### Docker Security

```dockerfile
# Use non-root user
FROM node:20-alpine

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN chown -R nodejs:nodejs /app

USER nodejs
EXPOSE 3000

CMD ["node", "dist/server.js"]
```

---

## Development Practices

### Dependency Management

```bash
# Regularly audit dependencies
npm audit

# Auto-fix vulnerabilities
npm audit fix

# Use Snyk for additional scanning
npm install -g snyk
snyk test
snyk monitor
```

### Code Review Checklist

- [ ] No hardcoded secrets or credentials
- [ ] All user input is validated
- [ ] Error messages don't leak information
- [ ] Sensitive data is hashed/encrypted
- [ ] Authorization checks on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (input sanitization)
- [ ] CSRF protection (state-changing operations)
- [ ] Rate limiting implemented
- [ ] Security headers configured

### Security Testing

```typescript
// Example security test
describe('Authentication Security', () => {
  it('should reject weak passwords', async () => {
    const weakPasswords = ['password', '12345678', 'abc123'];

    for (const password of weakPasswords) {
      const result = await authService.registerUser({
        email: 'test@example.com',
        password,
        firstName: 'Test',
        lastName: 'User',
        roleId: 4
      }, 1);

      expect(result).toHaveProperty('error');
    }
  });

  it('should lock account after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await authService.loginMobile({
        email: 'test@example.com',
        password: 'wrongpassword'
      });
    }

    const result = await authService.loginMobile({
      email: 'test@example.com',
      password: 'correctpassword'
    });

    expect(result.accountLocked).toBe(true);
  });
});
```

---

## Quick Reference

### Password Requirements
- Minimum 8 characters (recommended: 12+)
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Not a common password
- No sequential characters (abc, 123)

### Session Configuration
- Cookie: HttpOnly, Secure, SameSite=Strict
- Max age: 24 hours
- Regenerate after login
- Limit concurrent sessions: 5 per user

### JWT Configuration
- Secret: Minimum 32 characters
- Access token expiration: 1 hour
- Refresh token expiration: 7 days
- Include issuer and audience

### Rate Limiting
- Authentication: 5 per 15 minutes
- API: 100 per 15 minutes
- GPS: 60 per 1 minute

---

**Document Version:** 1.0
**Maintained By:** Security Team
**Review Date:** 2025-02-24
