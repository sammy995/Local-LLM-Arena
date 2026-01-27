# Security Considerations

## Overview

Ollama Arena is designed for **personal, local-first evaluation workflows** in trusted environments. It is NOT designed for multi-tenant production deployments or handling highly sensitive data without additional hardening.

## Current Security Model

### ✅ What's Protected

- **No cloud exposure**: Server binds to `127.0.0.1` by default (localhost only)
- **No telemetry**: Zero external API calls, no tracking, no analytics
- **Data sovereignty**: All data stays on user's machine unless explicitly exported
- **Optional authentication**: Set `WEB_CHAT_TOKEN` environment variable for bearer token protection

### ⚠️ Known Limitations

#### 1. Input Sanitization
- **Risk**: User prompts not sanitized before rendering
- **Impact**: Potential XSS if malicious content in model responses
- **Mitigation**: Markdown renderer escapes HTML, but not foolproof
- **Status**: Low priority for single-user local deployment

#### 2. Rate Limiting
- **Risk**: No rate limiting on `/api/chat` or `/api/stream_chat` endpoints
- **Impact**: Local DoS possible (flood with requests)
- **Mitigation**: Single-user deployment reduces risk
- **Status**: Consider adding for production deployments

#### 3. File Upload Validation
- **Risk**: File upload accepts any file type
- **Impact**: Users could upload binary files, large files (>10MB limit exists)
- **Mitigation**: Client-side file reading only, no server-side storage
- **Status**: Low risk, consider restricting to `.txt`, `.md`, `.json`

#### 4. localStorage Security
- **Risk**: Conversations stored unencrypted in browser localStorage
- **Impact**: Anyone with browser access can read all chat history
- **Mitigation**: localStorage is designed for non-sensitive, personal use
- **Status**: **By design** for simplicity; see "Scope" below

#### 5. Authentication Token Storage
- **Risk**: `WEB_CHAT_TOKEN` stored in environment variables (plaintext)
- **Impact**: Token visible to anyone with shell access
- **Mitigation**: Use OS keychain or secrets manager for production
- **Status**: Acceptable for local development

#### 6. CORS and CSRF
- **Risk**: No CORS restrictions, no CSRF tokens
- **Impact**: Other localhost apps could make requests
- **Mitigation**: Requires malicious local app, low risk
- **Status**: Low priority for trusted local environment

## Scope & Intended Use

### ✅ Appropriate Use Cases
- **Personal research**: Individual researchers evaluating models on their laptop
- **Proof of concept**: Testing Ollama integration before production deployment
- **Educational**: Learning about local LLM orchestration
- **Exploratory analysis**: Comparing models on non-sensitive datasets

### ❌ Inappropriate Use Cases (Without Hardening)
- **Multi-user production**: Requires user authentication, session management, backend DB
- **Regulated data**: HIPAA/SOX/GDPR compliance requires encryption at rest, audit logs
- **Public deployment**: Exposing to internet requires reverse proxy, rate limiting, WAF
- **Shared workstations**: localStorage is per-browser, no isolation between OS users

## Hardening for Production

If you need to deploy Ollama Arena in a production or shared environment, consider:

### Authentication & Authorization
- [ ] Replace bearer token with proper user authentication (Flask-Login, OAuth)
- [ ] Add session management with secure cookies (HttpOnly, SameSite=Strict)
- [ ] Implement role-based access control (admin, user, viewer)

### Data Protection
- [ ] Move from localStorage to backend database (SQLite, PostgreSQL)
- [ ] Encrypt sensitive data at rest (SQLCipher, application-level encryption)
- [ ] Add audit logging (who accessed what, when)

### Network Security
- [ ] Deploy behind reverse proxy (nginx, Caddy) with HTTPS
- [ ] Add rate limiting (flask-limiter, nginx limit_req)
- [ ] Implement CORS restrictions for API endpoints
- [ ] Add CSRF protection for state-changing operations

### Input Validation
- [ ] Sanitize user prompts before rendering (DOMPurify on client-side)
- [ ] Validate file uploads (MIME type, size, content)
- [ ] Add Content Security Policy (CSP) headers

### Monitoring & Incident Response
- [ ] Set up logging aggregation (Elasticsearch, Splunk)
- [ ] Monitor for anomalous usage patterns
- [ ] Define incident response procedures
- [ ] Regular security audits and penetration testing

## Reporting Security Issues

If you discover a security vulnerability, please:

1. **Do NOT open a public GitHub issue**
2. Email the maintainer directly: [your-email@example.com]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 72 hours and coordinate a fix timeline.

## Security Update Policy

- **Critical vulnerabilities**: Patched within 7 days, immediate release
- **High severity**: Patched within 30 days
- **Medium/Low severity**: Included in next minor version

---

**Last updated**: January 2026  
**Security point of contact**: [Maintainer Name]
