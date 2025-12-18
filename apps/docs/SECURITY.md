# Security Documentation

## Security Measures Implemented

### 1. Debug Endpoints Protection

Debug endpoints (`/api/debug/*`) are protected with multiple layers:

- **Admin-Only Access**: Only users with `admin` role can access
- **Production Disable**: Automatically disabled in production unless `ENABLE_DEBUG_ENDPOINTS=true`
- **Audit Logging**: All access attempts are logged
- **404 Response**: Returns 404 in production to hide endpoint existence

**Configuration**:
```bash
# Disable in production (default)
NODE_ENV=production

# Enable in production (only if needed for debugging)
ENABLE_DEBUG_ENDPOINTS=true
```

### 2. CSRF Protection

CSRF protection is enabled via Auth.js:

- **Automatic Protection**: Auth.js handles CSRF for all auth routes
- **Token Validation**: CSRF tokens are validated automatically
- **Development Override**: Can be disabled in development via `SKIP_CSRF_CHECK=true`

**Configuration**:
```bash
# Enable CSRF (default in production)
NODE_ENV=production

# Disable CSRF (development only)
SKIP_CSRF_CHECK=true
```

### 3. Password Strength Requirements

Passwords must meet the following requirements:

- **Minimum Length**: 8 characters
- **Maximum Length**: 128 characters (prevents DoS)
- **Uppercase Letter**: At least one (A-Z)
- **Lowercase Letter**: At least one (a-z)
- **Number**: At least one (0-9)
- **Special Character**: At least one (!@#$%^&*()_+-=[]{}|;':"\\,.<>/?)
- **Common Password Check**: Rejects common weak passwords

**Implementation**: `web/src/app/api/utils/passwordValidation.js`

### 4. Session Security

Sessions are configured with security best practices:

- **HttpOnly Cookies**: Prevents XSS attacks
- **Secure Cookies**: Only sent over HTTPS in production
- **SameSite**: Set to 'lax' to prevent CSRF while allowing normal navigation
- **Session Duration**: 30 days with automatic refresh every 24 hours
- **JWT Strategy**: Uses JWT for stateless session management

**Configuration**:
- Session max age: 30 days
- Session update age: 24 hours
- Secure cookies: Enabled in production only

### 5. Rate Limiting

Rate limiting is implemented on critical endpoints:

- **Signup**: 5 requests/minute, 30 requests/hour per IP
- **Login**: Rate limited via existing middleware
- **Payment Operations**: Rate limited where applicable

### 6. Input Validation

- **Email Validation**: Regex-based email format validation
- **Password Validation**: Strength requirements enforced
- **Request Size Limits**: 4.5MB body size limit
- **SQL Injection Prevention**: Parameterized queries only

### 7. Audit Logging

Security events are logged:

- Failed login attempts
- Unauthorized access to debug endpoints
- Admin actions
- Payment operations

## Security Best Practices

### For Developers

1. **Never commit secrets** to version control
2. **Use environment variables** for all sensitive data
3. **Validate all user input** before processing
4. **Use parameterized queries** (already implemented)
5. **Keep dependencies updated** to patch security vulnerabilities

### For Production

1. **Enable CSRF protection** (default)
2. **Disable debug endpoints** (default)
3. **Use HTTPS** for all connections
4. **Set secure cookies** (automatic in production)
5. **Monitor audit logs** for suspicious activity
6. **Rotate secrets regularly** (especially AUTH_SECRET)
7. **Implement WAF** (Web Application Firewall) if possible

## Security Checklist

Before deploying to production:

- [ ] `AUTH_SECRET` is at least 32 characters
- [ ] `ENABLE_DEBUG_ENDPOINTS` is not set (or false)
- [ ] `SKIP_CSRF_CHECK` is not set (or false)
- [ ] `NODE_ENV=production`
- [ ] HTTPS is enabled
- [ ] Database credentials are secure
- [ ] All environment variables are set
- [ ] Rate limiting is configured
- [ ] Audit logging is enabled
- [ ] Error messages don't leak sensitive information

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do not** create a public issue
2. Contact the security team directly
3. Provide detailed information about the vulnerability
4. Allow time for the issue to be addressed before public disclosure

## Security Updates

This document should be updated whenever:
- New security measures are added
- Security configurations change
- Vulnerabilities are discovered and fixed
- Security best practices evolve



