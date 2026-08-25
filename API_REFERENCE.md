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
| `deviceUniqueId` | `string` | **Yes** | Unique hardware or vendor device identifier (UUID/IDFV/Android ID). |
| `appUniqueId` | `string` | **Yes** | Unique application identifier (Bundle ID / Package Name). |
| `pushToken` | `string \| null` | No | Push notification token (e.g., FCM / APNs). Can be omitted or `null`. |

#### Example Request
```json
{
  "deviceUniqueId": "e3b0c442-98fc-1c14-9afb-4c8996fb9242",
  "appUniqueId": "com.brazz.learning",
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
    "deviceUniqueId": "e3b0c442-98fc-1c14-9afb-4c8996fb9242",
    "appUniqueId": "com.brazz.learning",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

##### ❌ `400 Bad Request` - Validation Error
*Triggered when required fields are missing or invalid.*
```json
{
  "success": false,
  "message": "deviceUniqueId is required"
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

### 2. Get Categories

Fetches categories based on the device's authenticated session style (`finance` or `adult` encoded in the JWT token).

- **Method**: `GET`
- **Path**: `/app/categories`
- **Full URL**: `{{BASE_URL}}/app/categories`
- **Auth**: `api-key` header AND `token` (or `Authorization: Bearer <token>`) required

#### Request Headers
```http
api-key: your_api_key_here
token: your_jwt_token_here
```
*or*
```http
api-key: your_api_key_here
Authorization: Bearer your_jwt_token_here
```

#### Responses

##### ✅ `200 OK` - Success (Finance Mode)
```json
{
  "success": true,
  "message": "Categories fetched successfully",
  "data": [
    {
      "_id": "67b73a01001a1b2c3d4e0001",
      "name": "Stock Market Basics",
      "videoCount": 15
    },
    {
      "_id": "67b73a01001a1b2c3d4e0002",
      "name": "Cryptocurrency & Blockchain",
      "videoCount": 12
    },
    {
      "_id": "67b73a01001a1b2c3d4e0003",
      "name": "Personal Finance & Budgeting",
      "videoCount": 20
    }
  ]
}
```

##### ✅ `200 OK` - Success (Adult Mode)
```json
{
  "success": true,
  "message": "Categories fetched successfully",
  "data": [
    {
      "_id": "67b73b02002a1b2c3d4e0001",
      "name": "Trending Videos",
      "videoCount": 28
    },
    {
      "_id": "67b73b02002a1b2c3d4e0002",
      "name": "Top Rated",
      "videoCount": 45
    },
    {
      "_id": "67b73b02002a1b2c3d4e0003",
      "name": "Popular & Featured",
      "videoCount": 36
    }
  ]
}
```

##### ❌ `401 Unauthorized` - Missing or Invalid Token / API Key
```json
{
  "success": false,
  "message": "No token provided, authorization denied"
}
```

---

### 3. Save / Unsave Category

Adds or removes a category to/from the user's selected categories list on the authenticated device.

- **Method**: `POST`
- **Path**: `/app/categories/save`
- **Full URL**: `{{BASE_URL}}/app/categories/save`
- **Auth**: `api-key` header AND `token` (or `Authorization: Bearer <token>`) required

#### Request Headers
```http
Content-Type: application/json
api-key: your_api_key_here
token: your_jwt_token_here
```
*or*
```http
Content-Type: application/json
api-key: your_api_key_here
Authorization: Bearer your_jwt_token_here
```

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `categoryId` | `string` | **Yes** | The category ID to save or remove. |
| `isSave` | `boolean` | **Yes** | `true` to add to selected categories, `false` to remove from selected categories. |

#### Example Request
```json
{
  "categoryId": "67b73a01001a1b2c3d4e0001",
  "isSave": true
}
```

#### Responses

##### ✅ `200 OK` - Success
```json
{
  "success": true,
  "message": "Category saved successfully",
  "data": {
    "deviceId": "67b7381290abcdef12345678",
    "deviceUniqueId": "e3b0c442-98fc-1c14-9afb-4c8996fb9242",
    "appUniqueId": "com.brazz.learning",
    "appStyle": "finance",
    "selectedCategories": [
      "67b73a01001a1b2c3d4e0001"
    ]
  }
}
```

##### ❌ `400 Bad Request` - Validation Error
```json
{
  "success": false,
  "message": "categoryId is required"
}
```

##### ❌ `401 Unauthorized` - Missing or Invalid Token / API Key
```json
{
  "success": false,
  "message": "No token provided, authorization denied"
}
```

---

### 4. Get Selected Categories

Retrieves the currently saved category selections for the authenticated device.

- **Method**: `GET`
- **Path**: `/app/categories/selected`
- **Full URL**: `{{BASE_URL}}/app/categories/selected`
- **Auth**: `api-key` header AND `token` (or `Authorization: Bearer <token>`) required

#### Responses

##### ✅ `200 OK` - Success
```json
{
  "success": true,
  "message": "Selected categories fetched successfully",
  "data": {
    "selectedCategories": [
      "67b73a01001a1b2c3d4e0001",
      "67b73a01001a1b2c3d4e0003"
    ]
  }
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

export async function registerDevice(deviceUniqueId: string, appUniqueId: string, pushToken: string) {
  const response = await fetch(`${API_BASE_URL}/device/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': API_KEY,
    },
    body: JSON.stringify({
      deviceUniqueId,
      appUniqueId,
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

export async function registerDevice(deviceUniqueId: string, appUniqueId: string, pushToken: string) {
  const response = await api.post('/device/register', {
    deviceUniqueId,
    appUniqueId,
    pushToken,
  });

  return response.data;
}
```
