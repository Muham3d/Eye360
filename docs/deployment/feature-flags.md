# Feature Flags System

## Overview

PatrolManager uses a multi-layered feature flag system to control feature availability across environments. This enables safe rollouts, A/B testing, and quick rollback capabilities.

## Flag Types

### 1. Environment-Based Flags

Flags set via environment variables. Changed via deployment.

```bash
# .env.production
FEATURE_OFFLINE_SYNC=true
FEATURE_SOS_ALERTS=true
```

### 2. Database-Stored Flags

Flags stored in database with admin UI controls. Changed without deployment.

```sql
-- feature_flags table
CREATE TABLE feature_flags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  description TEXT,
  rollout_percentage INTEGER DEFAULT 100,
  user_whitelist TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Remote Config (Future)

Integration with AWS AppConfig or LaunchDarkly for dynamic flags.

## Available Feature Flags

| Flag Name | Description | Default (Prod) | Default (Staging) |
|-----------|-------------|----------------|------------------|
| `FEATURE_OFFLINE_SYNC` | Enable offline data synchronization | `true` | `true` |
| `FEATURE_SOS_ALERTS` | Enable SOS emergency alerts | `true` | `true` |
| `FEATURE_PTT_ENABLED` | Enable Push-to-Talk communication | `true` | `true` |
| `FEATURE_INCIDENT_ESCALATION` | Enable automatic incident escalation | `true` | `true` |
| `FEATURE_PATROL_AUTO_ASSIGNMENT` | Enable automatic patrol assignment | `false` | `true` |
| `FEATURE_REAL_TIME_TRACKING` | Enable real-time GPS tracking | `true` | `true` |
| `FEATURE_ANALYTICS_DASHBOARD` | Enable analytics dashboard | `true` | `true` |
| `FEATURE_MULTI_TENANT` | Enable multi-tenant support | `false` | `false` |
| `FEATURE_ADVANCED_REPORTING` | Enable advanced reporting features | `false` | `true` |

## Implementation

### Environment Flag Service

```typescript
// backend/src/core/services/FeatureFlagService.ts
export class FeatureFlagService {
  private flags: Map<string, boolean>;

  constructor() {
    this.flags = new Map();
    this.loadFlagsFromEnv();
  }

  private loadFlagsFromEnv(): void {
    const flagPrefix = 'FEATURE_';
    Object.entries(process.env).forEach(([key, value]) => {
      if (key.startsWith(flagPrefix)) {
        const flagName = key.substring(flagPrefix.length).toLowerCase();
        this.flags.set(flagName, value === 'true');
      }
    });
  }

  isEnabled(flagName: string): boolean {
    return this.flags.get(flagName) ?? false;
  }

  getAll(): Record<string, boolean> {
    return Object.fromEntries(this.flags);
  }
}
```

### Database Flag Service

```typescript
// backend/src/infrastructure/database/DatabaseFeatureFlagRepository.ts
export class DatabaseFeatureFlagRepository {
  constructor(private sequelize: Sequelize) {}

  async isEnabled(flagName: string, userId?: string): Promise<boolean> {
    const flag = await this.sequelize.models.FeatureFlag.findOne({
      where: { name: flagName }
    });

    if (!flag || !flag.enabled) {
      return false;
    }

    // Check rollout percentage
    if (flag.rollout_percentage < 100) {
      if (!userId) {
        return false;
      }
      const hash = this.hashCode(userId + flagName);
      const bucket = hash % 100;
      return bucket < flag.rollout_percentage;
    }

    // Check whitelist
    if (flag.user_whitelist?.length > 0 && userId) {
      return flag.user_whitelist.includes(userId);
    }

    return true;
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
```

### Combined Flag Service

```typescript
// backend/src/core/services/FeatureFlagService.ts (extended)
export class FeatureFlagService {
  constructor(
    private envFlags: EnvironmentFlagService,
    private dbFlags: DatabaseFeatureFlagRepository
  ) {}

  async isEnabled(flagName: string, userId?: string): Promise<boolean> {
    // Check environment flags first (layer 1)
    const envValue = this.envFlags.isEnabled(flagName);
    if (envValue !== undefined) {
      return envValue;
    }

    // Check database flags (layer 2)
    return await this.dbFlags.isEnabled(flagName, userId);
  }
}
```

### Middleware Integration

```typescript
// backend/src/interfaces/http/middleware/featureFlags.ts
export const featureFlagMiddleware = (flagName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const featureService = req.container.resolve('FeatureFlagService');
    const userId = req.user?.id;

    const enabled = await featureService.isEnabled(flagName, userId);

    if (!enabled) {
      return res.status(403).json({
        error: 'FeatureNotAvailable',
        message: `Feature "${flagName}" is not available`
      });
    }

    next();
  };
};

// Usage in routes
router.post('/patrols/assign',
  featureFlagMiddleware('PATROL_AUTO_ASSIGNMENT'),
  PatrolController.assign
);
```

## Flag Evaluation Logic

### Priority Order

1. **User-specific whitelist** - Override for specific users
2. **Rollout percentage** - Gradual rollout
3. **Database flag** - Admin-controlled
4. **Environment variable** - Deployment-controlled
5. **Default value** - Fallback

### Flow Diagram

```
┌─────────────────┐
│  Check Feature  │
│      Flag       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐    Yes    ┌──────────────────┐
│ User in         │──────────▶│ Return true      │
│ Whitelist?      │           └──────────────────┘
└────────┬────────┘
         │ No
         ▼
┌─────────────────┐    Yes    ┌──────────────────┐
│ User in Rollout │──────────▶│ Return true      │
│ Percentage?     │           └──────────────────┘
└────────┬────────┘
         │ No
         ▼
┌─────────────────┐    Yes    ┌──────────────────┐
│ Flag Enabled in │──────────▶│ Return true      │
│ Database?       │           └──────────────────┘
└────────┬────────┘
         │ No
         ▼
┌─────────────────┐    Yes    ┌──────────────────┐
│ Flag Enabled in │──────────▶│ Return true      │
│ Environment?    │           └──────────────────┘
└────────┬────────┘
         │ No
         ▼
┌─────────────────┐
│ Return Default  │
│  (false)        │
└─────────────────┘
```

## Rollback Strategy

### Level 1: Environment Variable Rollback

Fastest rollback - requires new deployment.

```bash
# .env.production - disable feature
FEATURE_PATROL_AUTO_ASSIGNMENT=false
```

Deploy with `npm run deploy:production`.

### Level 2: Database Flag Rollback

Instant rollback via admin UI or SQL.

```sql
UPDATE feature_flags
SET enabled = false
WHERE name = 'PATROL_AUTO_ASSIGNMENT';
```

### Level 3: Rollout Percentage Reduction

Gradual rollback without full disable.

```sql
-- Reduce from 100% to 0%
UPDATE feature_flags
SET rollout_percentage = 0
WHERE name = 'PATROL_AUTO_ASSIGNMENT';
```

## Admin UI Controls

### Feature Flag Management Screen

```typescript
// Admin view for managing flags
interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  rollout_percentage: number;
  user_whitelist: string[];
  last_updated: Date;
}

// API endpoint
router.get('/admin/feature-flags', AdminController.listFeatureFlags);
router.put('/admin/feature-flags/:name', AdminController.updateFeatureFlag);
```

### Toggle Endpoint

```typescript
// backend/src/interfaces/http/controllers/AdminController.ts
async updateFeatureFlag(req: Request, res: Response): Promise<void> {
  const { name } = req.params;
  const { enabled, rollout_percentage, user_whitelist } = req.body;

  await this.featureFlagService.update(name, {
    enabled,
    rollout_percentage,
    user_whitelist
  });

  // Clear cache
  await this.cacheService.delete(`feature_flag:${name}`);

  res.json({ success: true });
}
```

## A/B Testing Integration

### Experiment Configuration

```sql
CREATE TABLE experiments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  flag_name VARCHAR(100) NOT NULL,
  variant_a_percentage INTEGER DEFAULT 50,
  variant_b_percentage INTEGER DEFAULT 50,
  metrics TEXT[], -- Metrics to track
  start_at TIMESTAMP,
  end_at TIMESTAMP
);
```

### Variant Assignment

```typescript
async getVariant(experimentName: string, userId: string): Promise<'A' | 'B'> {
  const experiment = await this.getExperiment(experimentName);
  const hash = this.hashCode(userId + experimentName);
  const bucket = hash % 100;

  return bucket < experiment.variant_a_percentage ? 'A' : 'B';
}
```

## Monitoring

### Feature Flag Usage Tracking

```typescript
// Log flag evaluation
async isEnabled(flagName: string, userId?: string): Promise<boolean> {
  const result = await this.evaluateFlag(flagName, userId);

  // Track usage
  await this.metricsService.increment('feature_flag.evaluation', {
    flag_name: flagName,
    result: result ? 'enabled' : 'disabled',
    user_id: userId
  });

  return result;
}
```

### Dashboard Metrics

- Flag evaluation rate per flag
- Enabled vs disabled ratio
- Rollout percentage distribution
- User whitelist size

## Testing

### Unit Tests

```typescript
describe('FeatureFlagService', () => {
  it('should return true when environment flag is enabled', async () => {
    process.env.FEATURE_TEST = 'true';
    const service = new FeatureFlagService();
    expect(await service.isEnabled('test')).toBe(true);
  });

  it('should respect rollout percentage', async () => {
    // Test with different user IDs
  });
});
```

### Integration Tests

```typescript
describe('Feature Flag Integration', () => {
  it('should block requests when feature is disabled', async () => {
    const response = await request(app)
      .post('/api/patrols/assign')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('FeatureNotAvailable');
  });
});
```

## Best Practices

1. **Default to false** - New features should be opt-in
2. **Remove old flags** - Clean up flags after full rollout
3. **Document flags** - Maintain updated documentation
4. **Test flags** - Test both enabled and disabled states
5. **Monitor usage** - Track flag evaluation and usage
6. **Version flags** - Include version in flag name for breaking changes
7. **Never commit secrets** - Use environment variable references for sensitive flags

## Migration Path

When removing a feature flag after full rollout:

1. Remove flag checks from code
2. Update documentation
3. Remove from database
4. Remove from environment files
5. Deploy and verify

```sql
-- Remove flag after 30 days of 100% rollout
DELETE FROM feature_flags WHERE name = 'OLD_FEATURE' AND rollout_percentage = 100;
```

## References

- [Feature Flags Best Practices](https://martinfowler.com/articles/feature-toggles.html)
- [AWS AppConfig](https://docs.aws.amazon.com/appconfig/)
- [LaunchDarkly Documentation](https://docs.launchdarkly.com/)
