---
description: Perform comprehensive security review of codebase
argument-hint: [scope] [depth]
---

I'll perform a comprehensive security review of your codebase focusing on defensive security practices.

**Security Review**: ${1:-full} ${1:+scope }${2:+(depth: $2)}

## Available Review Modes

**Usage Examples:**
- `/security` - Full comprehensive review
- `/security quick` - Fast scan for common vulnerabilities
- `/security deps` - Focus on dependency vulnerabilities
- `/security secrets` - Scan for exposed credentials
- `/security config` - Review security configurations
- `/security auth` - Analyze authentication/authorization

## Security Analysis Framework

### 🔍 **Vulnerability Detection**
- **Code Injection Risks**: SQL injection, NoSQL injection, command injection patterns
- **XSS Prevention**: Input sanitization, output encoding, CSP implementation
- **CSRF Protection**: Token validation, SameSite cookies, request verification
- **Path Traversal**: File access controls, directory validation
- **Insecure Deserialization**: Object deserialization safety checks

### 🔐 **Authentication & Authorization**
- **Multi-factor Authentication**: Implementation strength and coverage
- **Session Security**: Token generation, expiration, invalidation
- **Access Controls**: Role-based permissions, principle of least privilege
- **Password Security**: Hashing algorithms, complexity requirements
- **OAuth/JWT Security**: Token validation, scope limitations

### ⚙️ **Configuration Hardening**
- **Security Headers**: HSTS, CSP, X-Frame-Options, etc.
- **TLS/SSL Configuration**: Cipher suites, certificate validation
- **Environment Variables**: Sensitive data exposure prevention
- **Error Handling**: Information disclosure in error messages
- **CORS Policies**: Cross-origin request restrictions

### 📦 **Supply Chain Security**
- **Dependency Scanning**: Known CVE identification
- **Package Integrity**: Checksum verification, signed packages
- **Version Management**: Outdated package identification
- **License Compliance**: Security-relevant licensing issues
- **Transitive Dependencies**: Nested vulnerability analysis

### 🔑 **Secret Management**
- **Credential Detection**: API keys, passwords, tokens in code
- **Environment Security**: .env file exposure, variable leakage
- **Key Rotation**: Automated rotation mechanisms
- **Secure Storage**: Encrypted credential storage
- **Access Logging**: Secret access audit trails

### 🛡️ **Data Protection**
- **Encryption Standards**: AES-256, RSA key lengths, algorithm choices
- **Data Classification**: PII identification and protection
- **Secure Transmission**: TLS implementation, certificate pinning
- **Data Sanitization**: Secure deletion, memory clearing
- **Privacy Compliance**: GDPR, CCPA pattern validation

## Analysis Methodology

I'll employ systematic security analysis using:

1. **Static Analysis**: Pattern matching for common vulnerabilities
2. **Configuration Review**: Security setting validation
3. **Dependency Audit**: CVE database cross-referencing
4. **Code Flow Analysis**: Data flow tracking for injection points
5. **Best Practices Validation**: Industry standard compliance checking

Let me begin by identifying your technology stack and customizing the security review approach accordingly.