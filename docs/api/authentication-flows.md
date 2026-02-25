# PatrolManager Authentication Flows

This document describes the authentication flows supported by the PatrolManager API, including detailed diagrams and implementation guidance.

## Table of Contents

- [Overview](#overview)
- [Mobile Login Flow (JWT)](#mobile-login-flow-jwt)
- [Web Login Flow (Session)](#web-login-flow-session)
- [Token Refresh Flow](#token-refresh-flow)
- [Password Reset Flow](#password-reset-flow)
- [Logout Flow](#logout-flow)
- [Security Considerations](#security-considerations)

---

## Overview

PatrolManager supports two authentication methods optimized for different client types:

| Method | Client Type | Token Type | Token Storage |
|--------|-------------|------------|---------------|
| **JWT** | Mobile (Android) | Bearer Token | Encrypted local storage |
| **Session** | Web Admin Panel | Session Cookie | HttpOnly cookie |

### Authentication Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PatrolManager Auth                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐         ┌──────────────────┐                       │
│  │   Mobile    │         │  Web Admin Panel │                        │
│  │   (JWT)     │         │   (Session)      │                        │
│  └──────┬──────┘         └────────┬─────────┘                       │
│         │                         │                                  │
│         │ JWT Token               │ Session Cookie                  │
│         │                         │                                  │
│         ▼                         ▼                                  │
│  ┌──────────────────────────────────────────┐                       │
│  │         Authentication Service           │                       │
│  │  ┌────────────┐        ┌──────────────┐  │                       │
│  │  │ JWT Strategy │      │Session Strategy│ │                       │
│  │  └────────────┘        └──────────────┘  │                       │
│  └──────────────────────────────────────────┘                       │
│         │                         │                                  │
│         └─────────────┬───────────┘                                  │
│                       ▼                                              │
│              ┌────────────────┐                                      │
│              │ User Repository │                                      │
│              │  (PostgreSQL)   │                                      │
│              └────────────────┘                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Mobile Login Flow (JWT)

The JWT authentication flow is designed for mobile clients (Android Guard App).

### Flow Diagram

```
┌──────────┐                              ┌──────────────────┐
│  Mobile  │                              │   API Server     │
│   App    │                              │  (Express.js)    │
└────┬─────┘                              └────────┬─────────┘
     │                                              │
     │ 1. POST /auth/login                          │
     │    { email, password, clientType: "mobile" } │
     ├─────────────────────────────────────────────>│
     │                                              │
     │                                    2. Validate credentials
     │                                    3. Generate JWT pair
     │                                              │
     │ 4. Response:                                 │
     │    { token, refreshToken, user }             │
     │<─────────────────────────────────────────────┤
     │                                              │
     │ 5. Store tokens securely                     │
     │    (Android Keystore)                        │
     │                                              │
     │ 6. Use JWT in Authorization header           │
     │    for subsequent requests                   │
     │                                              │
```

### Step-by-Step Process

#### Step 1: Login Request

```http
POST /api/v1/auth/login HTTP/1.1
Host: api.patrolmanager.com
Content-Type: application/json

{
  "email": "john.doe@patrolmanager.com",
  "password": "SecurePass123",
  "clientType": "mobile",
  "deviceId": "android_a1b2c3d4"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | User's email address |
| `password` | string | Yes | User's password |
| `clientType` | string | Yes | Must be `"mobile"` |
| `deviceId` | string | No | Unique device identifier |

#### Step 2: Server Processing

1. **Validate Request**
   - Check required fields
   - Validate email format
   - Verify clientType is "mobile"

2. **Authenticate User**
   - Find user by email
   - Compare password hash
   - Check account status (active/suspended)

3. **Generate Tokens**

   **Access Token:**
   ```json
   {
     "sub": "550e8400-e29b-41d4-a716-446655440000",
     "email": "john.doe@patrolmanager.com",
     "role": "guard",
     "iat": 1708694400,
     "exp": 1708698000,
     "iss": "patrolmanager.com"
   }
   ```

   **Refresh Token:**
   ```json
   {
     "sub": "550e8400-e29b-41d4-a716-446655440000",
     "type": "refresh",
     "iat": 1708694400,
     "exp": 1708780800,
     "jti": "unique-refresh-token-id"
   }
   ```

4. **Store Refresh Token**
   - Save in database (hashed)
   - Link to device ID
   - Set expiration (7 days)

#### Step 3: Login Response

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.doe@patrolmanager.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "guard",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

#### Step 4: Client-Side Token Storage

**Android Implementation:**

```kotlin
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey

class TokenManager(context: Context) {

    private val keyAlias = "PatrolManagerTokenKey"
    private val sharedPrefs = context.getSharedPreferences(
        "AuthPrefs", Context.MODE_PRIVATE
    )

    fun storeTokens(accessToken: String, refreshToken: String) {
        // Encrypt and store access token
        val encryptedAccess = encryptToken(accessToken)
        sharedPrefs.edit()
            .putString("access_token", encryptedAccess)
            .apply()

        // Store refresh token (separate from access)
        sharedPrefs.edit()
            .putString("refresh_token", refreshToken)
            .apply()
    }

    fun getAccessToken(): String? {
        val encrypted = sharedPrefs.getString("access_token", null)
        return encrypted?.let { decryptToken(it) }
    }

    fun getRefreshToken(): String? {
        return sharedPrefs.getString("refresh_token", null)
    }

    private fun encryptToken(token: String): String {
        // Use Android Keystore for encryption
        val key = getOrCreateKey()
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key)
        val encrypted = cipher.doFinal(token.toByteArray())
        return android.util.Base64.encodeToString(encrypted, android.util.Base64.DEFAULT)
    }

    private fun decryptToken(encrypted: String): String {
        val key = getOrCreateKey()
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key)
        val decoded = android.util.Base64.decode(encrypted, android.util.Base64.DEFAULT)
        val decrypted = cipher.doFinal(decoded)
        return String(decrypted)
    }

    private fun getOrCreateKey(): SecretKey {
        val keyStore = KeyStore.getInstance("AndroidKeyStore")
        keyStore.load(null)

        if (!keyStore.containsAlias(keyAlias)) {
            val keyGenerator = KeyGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore"
            )
            val keyGenSpec = KeyGenParameterSpec.Builder(
                keyAlias,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setUserAuthenticationRequired(false)
                .build()
            keyGenerator.init(keyGenSpec)
            return keyGenerator.generateKey()
        }

        return (keyStore.getEntry(keyAlias, null) as KeyStore.SecretKeyEntry).secretKey
    }
}
```

#### Step 5: Using the Token

```kotlin
fun makeAuthenticatedRequest() {
    val tokenManager = TokenManager(context)
    val accessToken = tokenManager.getAccessToken()

    val request = Request.Builder()
        .url("https://api.patrolmanager.com/api/v1/auth/me")
        .addHeader("Authorization", "Bearer $accessToken")
        .build()

    okHttpClient.newCall(request).enqueue(object : Callback {
        override fun onFailure(call: Call, e: IOException) {
            // Handle error
        }

        override fun onResponse(call: Call, response: Response) {
            if (response.code == 401) {
                // Token expired - refresh it
                refreshTokenAndRetry()
            } else {
                // Process response
            }
        }
    })
}
```

---

## Web Login Flow (Session)

The session-based authentication flow is designed for the web admin panel.

### Flow Diagram

```
┌──────────────┐                            ┌──────────────────┐
│ Web Browser  │                            │   API Server     │
│   (Admin)    │                            │  (Express.js)    │
└──────┬───────┘                            └────────┬─────────┘
       │                                              │
       │ 1. POST /auth/login                          │
       │    { email, password, clientType: "web" }    │
       ├─────────────────────────────────────────────>│
       │                                              │
       │                                    2. Validate credentials
       │                                    3. Create session
       │                                              │
       │ 4. Response with Set-Cookie header:          │
       │    Set-Cookie: connect.sid=...; HttpOnly     │
       │<─────────────────────────────────────────────┤
       │                                              │
       │ 5. Browser stores cookie automatically       │
       │                                              │
       │ 6. Subsequent requests include cookie        │
       ├─────────────────────────────────────────────>│
       │                                              │
```

### Step-by-Step Process

#### Step 1: Login Request

```http
POST /api/v1/auth/login HTTP/1.1
Host: api.patrolmanager.com
Content-Type: application/json

{
  "email": "admin@patrolmanager.com",
  "password": "AdminPass123",
  "clientType": "web"
}
```

#### Step 2: Server Processing

1. **Validate Request**
   - Check required fields
   - Verify clientType is "web"

2. **Authenticate User**
   - Find user by email
   - Compare password hash
   - Check account status

3. **Create Session**
   - Generate session ID
   - Store session data in database
   - Link session to user

#### Step 3: Login Response

```http
HTTP/1.1 200 OK
Content-Type: application/json
Set-Cookie: connect.sid=s%3A...; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400

{
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "admin@patrolmanager.com",
      "firstName": "Admin",
      "lastName": "User",
      "role": "admin",
      "status": "active"
    }
  }
}
```

**Cookie Attributes:**

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `HttpOnly` | - | Prevents JavaScript access (XSS protection) |
| `Secure` | - | Only sent over HTTPS |
| `SameSite` | `Strict` | CSRF protection |
| `Max-Age` | `86400` | 24 hour expiration |
| `Path` | `/` | Available for all paths |

#### Step 4: Using the Session

The browser automatically includes the session cookie with subsequent requests:

```http
GET /api/v1/users HTTP/1.1
Host: api.patrolmanager.com
Cookie: connect.sid=s%3A...
```

---

## Token Refresh Flow

When the JWT access token expires (1 hour), the client must refresh it using the refresh token.

### Flow Diagram

```
┌──────────┐                              ┌──────────────────┐
│  Mobile  │                              │   API Server     │
│   App    │                              │  (Express.js)    │
└────┬─────┘                              └────────┬─────────┘
     │                                              │
     │ 1. API Request with expired token            │
     ├─────────────────────────────────────────────>│
     │                                              │
     │ 2. Response: 401 Unauthorized                │
     │<─────────────────────────────────────────────┤
     │                                              │
     │ 3. POST /auth/refresh                        │
     │    { refreshToken }                          │
     ├─────────────────────────────────────────────>│
     │                                              │
     │                                    4. Validate refresh token
     │                                    5. Generate new access token
     │                                    6. Rotate refresh token
     │                                              │
     │ 7. Response:                                 │
     │    { token, refreshToken, expiresIn }        │
     │<─────────────────────────────────────────────┤
     │                                              │
     │ 8. Store new tokens                          │
     │ 9. Retry original request                    │
     │                                              │
```

### Implementation

**Kotlin Example:**

```kotlin
class AuthInterceptor(private val tokenManager: TokenManager) : Interceptor {

    @Synchronized
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val response = chain.proceed(originalRequest)

        // If 401, try to refresh token
        if (response.code == 401 && originalRequest.header("Authorization") != null) {
            response.close()

            return try {
                refreshTokensAndRetry(chain, originalRequest)
            } catch (e: Exception) {
                // Refresh failed - logout user
                logoutUser()
                throw e
            }
        }

        return response
    }

    private fun refreshTokensAndRetry(
        chain: Interceptor.Chain,
        originalRequest: Request
    ): Response {
        // Refresh the token
        val refreshToken = tokenManager.getRefreshToken()
            ?: throw IllegalStateException("No refresh token available")

        val refreshRequest = Request.Builder()
            .url("${API_BASE_URL}/auth/refresh")
            .post(
                "{\"refreshToken\":\"$refreshToken\"}"
                    .toRequestBody("application/json".toMediaType())
            )
            .build()

        val refreshResponse = okHttpClient.newCall(refreshRequest).execute()

        if (!refreshResponse.isSuccessful) {
            throw IOException("Token refresh failed")
        }

        val refreshData = Json.decodeFromString<RefreshResponse>(
            refreshResponse.body?.string() ?: ""
        )

        // Store new tokens
        tokenManager.storeTokens(
            refreshData.token,
            refreshData.refreshToken
        )

        // Retry original request with new token
        val newRequest = originalRequest.newBuilder()
            .header("Authorization", "Bearer ${refreshData.token}")
            .build()

        return chain.proceed(newRequest)
    }

    private fun logoutUser() {
        tokenManager.clearTokens()
        // Navigate to login screen
    }
}
```

### Refresh Token Response

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

---

## Password Reset Flow

### Flow Diagram

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐
│     User    │    │   API Server     │    │   Email Server  │
└──────┬──────┘    └────────┬─────────┘    └────────┬────────┘
       │                     │                       │
       │ 1. POST /auth/forgot-password              │
       │    { email }                               │
       ├────────────────────>│                       │
       │                     │ 2. Generate token     │
       │                     │ 3. Send email         │
       │                     ├──────────────────────>│
       │                     │                       │
       │                     │    4. Email with link │
       │                     │<──────────────────────┤
       │                     │                       │
       │ 5. User clicks link                         │
       │    (opens reset page)                       │
       │                     │                       │
       │ 6. POST /auth/reset-password                │
       │    { token, newPassword }                   │
       ├────────────────────>│                       │
       │                     │ 7. Validate token     │
       │                     │ 8. Update password    │
       │                     │ 9. Invalidate token   │
       │                     │                       │
       │ 10. Response: Success                       │
       │<────────────────────┤                       │
       │                     │                       │
       │ 11. User can now login                      │
       │                     │                       │
```

### Step-by-Step Process

#### Step 1: Request Password Reset

```http
POST /api/v1/auth/forgot-password HTTP/1.1
Host: api.patrolmanager.com
Content-Type: application/json

{
  "email": "john.doe@patrolmanager.com"
}
```

**Response:**

```http
HTTP/1.1 200 OK

{
  "message": "If an account exists with this email, a password reset link will be sent"
}
```

**Security Note:** The response is always the same, regardless of whether the email exists. This prevents email enumeration attacks.

#### Step 2: Email Received

The user receives an email with a reset link:

```
Subject: Reset Your PatrolManager Password

Hello John,

You requested to reset your password. Click the link below to reset it:

https://admin.patrolmanager.com/reset-password?token=abc123def456...

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

Thanks,
PatrolManager Team
```

#### Step 3: Reset Password

```http
POST /api/v1/auth/reset-password HTTP/1.1
Host: api.patrolmanager.com
Content-Type: application/json

{
  "token": "abc123def456...",
  "password": "NewSecurePass123"
}
```

**Response:**

```http
HTTP/1.1 200 OK

{
  "message": "Password reset successfully"
}
```

---

## Logout Flow

### JWT Logout (Mobile)

```http
POST /api/v1/auth/logout HTTP/1.1
Host: api.patrolmanager.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Client Implementation:**

```kotlin
fun logout() {
    val tokenManager = TokenManager(context)
    val accessToken = tokenManager.getAccessToken()
    val refreshToken = tokenManager.getRefreshToken()

    val request = Request.Builder()
        .url("${API_BASE_URL}/auth/logout")
        .post(
            """{"refreshToken":"$refreshToken"}"""
                .toRequestBody("application/json".toMediaType())
        )
        .addHeader("Authorization", "Bearer $accessToken")
        .build()

    okHttpClient.newCall(request).execute()

    // Clear local tokens
    tokenManager.clearTokens()

    // Navigate to login screen
    navigateToLogin()
}
```

### Session Logout (Web)

```http
POST /api/v1/auth/logout HTTP/1.1
Host: api.patrolmanager.com
Cookie: connect.sid=s%3A...
```

**Response:**

```http
HTTP/1.1 200 OK
Set-Cookie: connect.sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT

{
  "message": "Logged out successfully"
}
```

---

## Security Considerations

### Token Storage

| Storage Method | Security | Notes |
|----------------|----------|-------|
| **Android Keystore** | High | Recommended for mobile |
| **iOS Keychain** | High | Recommended for iOS |
| **Encrypted SharedPreferences** | Medium | Acceptable if key is properly protected |
| **localStorage (web)** | Low | Vulnerable to XSS |
| **HttpOnly Cookie** | High | Recommended for web |

### Token Lifetimes

| Token Type | Lifetime | Rotation |
|------------|----------|----------|
| **Access Token (JWT)** | 1 hour | Refresh when expired |
| **Refresh Token** | 7 days | Rotate on refresh |
| **Session Cookie** | 24 hours | Extend on activity |
| **Password Reset Token** | 1 hour | Single use |

### Best Practices

1. **Always use HTTPS** in production
2. **Validate token expiration** before each request
3. **Implement refresh token rotation** on every refresh
4. **Store tokens securely** using platform-specific secure storage
5. **Clear tokens on logout** from both client and server
6. **Use device binding** for refresh tokens when possible
7. **Monitor for suspicious activity** (multiple failed logins, etc.)
8. **Implement rate limiting** on auth endpoints
9. **Log security events** (login, logout, password changes)
10. **Use strong password requirements** and check against common passwords

---

## Additional Resources

- [API Usage Guide](./usage-guide.md)
- [Error Reference](./error-reference.md)
- [OpenAPI Specification](./openapi.yaml)
- [Swagger UI](http://localhost:3000/api-docs)
