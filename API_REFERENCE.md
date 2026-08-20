# Brazz Learning - Frontend API Reference

This document provides API specifications, headers, request/response formats, and status codes for frontend and mobile developers integrating with the backend.

---

## 🌐 Base URL & Configuration

| Environment | Base URL |
| :--- | :--- |
| **Local Development** | `http://localhost:5000/api/v1` |
| **Production** | `https://<your-domain>/api/v1` |

> [!NOTE]
> All endpoints are prefixed with `/api/v1`.

---

## 🔐 Authentication & Headers

The API uses two layers of security:

### 1. API Key Authentication (Client Identification)
Every client request must include the static application API key in the headers.

| Header | Type | Description |
| :--- | :--- | :--- |
| `api-key` | `string` | **Required.** Your application's client API key. |
| `Content-Type` | `string` | **Required** for POST/PUT requests: `application/json` |

### 2. Device JWT Authentication (Authorized Requests)
For protected endpoints requiring device authentication, pass the JWT received from the registration endpoint using either header:

| Header | Type | Format |
| :--- | :--- | :--- |
| `Authorization` | `string` | `Bearer <token>` |
| `token` | `string` | `<token>` |

---

## 📡 API Endpoints

### 1. Register / Sync Device

Registers a new device or updates the push notification token for an existing device. Returns a JWT session token.

- **Method**: `POST`
- **Path**: `/device/register`
- **Full URL**: `{{BASE_URL}}/device/register`
- **Auth**: `api-key` header required

#### Request Headers
```http
Content-Type: application/json
api-key: your_api_key_here
```

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `deviceUnieqId` | `string` | **Yes** | Unique hardware or vendor device identifier (UUID/IDFV/Android ID). |
| `pushToken` | `string` | **Yes** | Push notification token (e.g., FCM / APNs). |

#### Example Request
```json
{
  "deviceUnieqId": "e3b0c442-98fc-1c14-9afb-4c8996fb9242",
  "pushToken": "fcm_token_example_abc123xyz"
}
```

#### Responses

##### ✅ `200 OK` - Success
```json
{
  "success": true,
  "message": "Device registered successfully",
  "data": {
    "deviceId": "67b7381290abcdef12345678",
    "deviceUnieqId": "e3b0c442-98fc-1c14-9afb-4c8996fb9242",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

##### ❌ `400 Bad Request` - Validation Error
*Triggered when required fields are missing or invalid.*
```json
{
  "success": false,
  "message": "deviceUnieqId is required"
}
```

##### ❌ `401 Unauthorized` - Invalid or Missing API Key
```json
{
  "success": false,
  "message": "No API key provided, authorization denied"
}
```
*or*
```json
{
  "success": false,
  "message": "Invalid API key"
}
```

##### ❌ `500 Internal Server Error` - Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Standard Response Format

All API responses follow a consistent JSON envelope:

### Success Response
```json
{
  "success": true,
  "message": "Human-readable success message",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Human-readable error description"
}
```

---

## 🛠️ Frontend Integration Examples

### JavaScript / TypeScript (Fetch API)

```typescript
const API_BASE_URL = 'http://localhost:5000/api/v1';
const API_KEY = 'your_api_key_here';

export async function registerDevice(deviceUnieqId: string, pushToken: string) {
  const response = await fetch(`${API_BASE_URL}/device/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': API_KEY,
    },
    body: JSON.stringify({
      deviceUnieqId,
      pushToken,
    }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Failed to register device');
  }

  // Save the JWT token in local storage / secure storage
  const { token, deviceId } = result.data;
  return { token, deviceId };
}
```

### Axios Example

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'api-key': 'your_api_key_here',
  },
});

export async function registerDevice(deviceUnieqId: string, pushToken: string) {
  const response = await api.post('/device/register', {
    deviceUnieqId,
    pushToken,
  });

  return response.data;
}
```
