# Health Checks Documentation

Documentation for health check endpoints and monitoring.

## Overview

Health check endpoints provide visibility into system status and help with monitoring, load balancing, and debugging.

## Endpoints

### GET `/api/health`

Basic health check endpoint. Returns 200 if the service is running.

**Response**: `200 OK`
```json
{
  "ok": true,
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "service": "bridge-mvp-v3"
}
```

**Use Cases**:
- Load balancer health checks
- Basic uptime monitoring
- Service discovery

---

### GET `/api/health/detailed`

Detailed health check with dependency status (admin only).

**Response**: `200 OK` or `503 Service Unavailable`
```json
{
  "ok": true,
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "service": "bridge-mvp-v3",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": "5ms",
      "connected": true
    },
    "redis": {
      "status": "healthy",
      "responseTime": "2ms",
      "connected": true
    },
    "queues": {
      "status": "healthy",
      "payments": {
        "waiting": 0,
        "active": 2,
        "completed": 100,
        "failed": 0
      },
      "webhooks": {
        "waiting": 0,
        "active": 1,
        "completed": 50,
        "failed": 0
      }
    },
    "circuit_breakers": {
      "status": "healthy",
      "breakers": {
        "lemonade": {
          "state": "CLOSED",
          "stats": { ... }
        },
        "stripe": {
          "state": "CLOSED",
          "stats": { ... }
        },
        "database": {
          "state": "CLOSED",
          "stats": { ... }
        }
      }
    },
    "cache": {
      "status": "healthy",
      "totalKeys": 1000,
      "hitRate": 0.85
    }
  }
}
```

**Status Values**:
- `healthy` - All checks passing
- `degraded` - Some checks failing (non-critical)
- `unhealthy` - Critical checks failing

**Use Cases**:
- Detailed system monitoring
- Debugging issues
- Performance monitoring
- Alerting triggers

## Health Check Components

### Database Check

Tests database connectivity and response time.

**Status**:
- `healthy` - Database responds within timeout
- `unhealthy` - Database connection fails or times out

### Redis Check

Tests Redis connectivity and response time.

**Status**:
- `healthy` - Redis responds within timeout
- `unhealthy` - Redis connection fails or times out

### Queue Check

Checks message queue status.

**Status**:
- `healthy` - Queues operational
- `unhealthy` - Queues unavailable or error

**Metrics**:
- Waiting jobs
- Active jobs
- Completed jobs
- Failed jobs

### Circuit Breaker Check

Checks circuit breaker states.

**Status**:
- `healthy` - All breakers closed
- `degraded` - Some breakers open

**Breakers Checked**:
- Lemonade API
- Stripe API
- Database

### Cache Check

Checks cache status and statistics.

**Status**:
- `healthy` - Cache operational
- `unhealthy` - Cache unavailable

**Metrics**:
- Total keys
- Hit rate
- Miss rate

## Monitoring Integration

### Prometheus (Optional)

Health check endpoints can be scraped by Prometheus:

```yaml
scrape_configs:
  - job_name: 'bridge-api'
    metrics_path: '/api/health'
    static_configs:
      - targets: ['localhost:4000']
```

### Uptime Monitoring

Use services like:
- **UptimeRobot** - Monitor `/api/health`
- **Pingdom** - Monitor `/api/health`
- **StatusCake** - Monitor `/api/health`

### Alerting

Set up alerts based on health check status:

```javascript
// Example alerting logic
if (health.status !== 'healthy') {
  sendAlert({
    severity: health.status === 'unhealthy' ? 'critical' : 'warning',
    message: `Service health: ${health.status}`,
    checks: health.checks,
  });
}
```

## Best Practices

1. **Use `/api/health` for load balancers** - Fast, no auth required
2. **Use `/api/health/detailed` for monitoring** - Comprehensive status
3. **Set appropriate timeouts** - Don't wait too long for checks
4. **Fail gracefully** - Don't fail health check if non-critical services are down
5. **Monitor trends** - Track response times over time

## Response Codes

- `200 OK` - Service is healthy
- `503 Service Unavailable` - Service is degraded or unhealthy
- `401 Unauthorized` - `/api/health/detailed` requires admin access
- `403 Forbidden` - User is not admin

## Troubleshooting

### Health Check Failing

1. Check individual component status in `/api/health/detailed`
2. Review error messages in response
3. Check service logs
4. Verify environment variables
5. Test connectivity manually

### Database Check Failing

- Verify `DATABASE_URL` is correct
- Check database is running
- Verify network connectivity
- Check firewall rules

### Redis Check Failing

- Verify `REDIS_URL` is correct
- Check Redis is running
- Verify network connectivity
- Check Redis authentication

### Queue Check Failing

- Verify Redis connection
- Check queue workers are running
- Review queue error logs
- Verify queue configuration

---

**Last Updated**: 2024-01-01

