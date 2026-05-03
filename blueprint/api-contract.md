# UniHub Workshop — API Contract

This document defines the core HTTP APIs used by the frontend and mobile app. It acts as a human-readable contract and can later be converted into OpenAPI/Swagger if the team wants a machine-readable spec.

## Common API Rules

| Rule | Description |
|---|---|
| Base path | All endpoints are served under `/api` |
| Authentication | JWT access token in `Authorization: Bearer <token>` |
| Content type | JSON for all request and response bodies unless file upload is required |
| Role checks | Enforced by API Gateway and Core API |
| Response style | Successful responses use `{ "success": true, "data": ... }` |
| Error style | Errors use `{ "code": string, "message": string, "details"?: object }` |

## Common Error Response Format

```json
{
  "code": "RATE_LIMITED",
  "message": "Too many requests.",
  "details": {
    "retry_after_seconds": 15
  }
}
```

## Common Success Response Format

```json
{
  "success": true,
  "data": {}
}
```

## 1. Auth API

| Method | Endpoint | Purpose | Roles | Returns |
|---|---|---|---|---|
| POST | `/auth/login` | Sign in and issue tokens | Public | `access_token`, `refresh_token`, `expires_in`, `user { id, full_name, email, role, student_code }` |
| POST | `/auth/refresh` | Refresh access token | Public with refresh token | `access_token`, `expires_in` |
| POST | `/auth/logout` | Revoke current session | Authenticated | `revoked`, `session_id` |
| GET | `/auth/me` | Return current user profile | Authenticated | `id`, `full_name`, `email`, `role`, `student_code`, `last_synced_at` |

### Login Request

```json
{
  "username": "21127001",
  "password": "secret123"
}
```

### Login Response

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "9ad3d0f2-5f2b-4d2d-8b0c-7a0b5be0e9d1",
    "expires_in": 3600,
    "user": {
      "id": "7f3f7e73-0d58-4d0a-9e8c-0db92a50c2f0",
      "full_name": "Nguyen Van A",
      "email": "a@example.com",
      "role": "STUDENT",
      "student_code": "21127001"
    }
  }
}
```

### Refresh Response

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOi...",
    "expires_in": 3600
  }
}
```

### Logout Response

```json
{
  "success": true,
  "data": {
    "revoked": true,
    "session_id": "9ad3d0f2-5f2b-4d2d-8b0c-7a0b5be0e9d1"
  }
}
```

### Me Response

```json
{
  "success": true,
  "data": {
    "id": "7f3f7e73-0d58-4d0a-9e8c-0db92a50c2f0",
    "full_name": "Nguyen Van A",
    "email": "a@example.com",
    "role": "STUDENT",
    "student_code": "21127001",
    "last_synced_at": "2026-04-30T02:00:00Z"
  }
}
```

## 2. Workshop Management API

| Method | Endpoint | Purpose | Roles | Returns |
|---|---|---|---|---|
| GET | `/workshops` | List published workshops | Authenticated | `items[]` with `id`, `title`, `status`, `start_time`, `end_time`, `room { id, name }`, `capacity`, `registered_count`, `remaining_seats`, `price`, plus pagination fields `page`, `page_size`, `total` |
| GET | `/workshops/{id}` | Get workshop details | Authenticated | full workshop object with `description`, `room { id, name, base_capacity }`, `capacity`, `registered_count`, `remaining_seats`, `price`, and `document { status, ai_summary }` |
| POST | `/admin/workshops` | Create workshop | Admin | created workshop object with `id`, `title`, `status`, and `workshop_id`-linked fields |
| PUT | `/admin/workshops/{id}` | Update workshop | Admin | updated workshop object with `id` and `updated=true` |
| DELETE | `/admin/workshops/{id}` | Cancel workshop | Admin | `id`, `status`, and cancellation confirmation |
| POST | `/admin/documents` | Upload workshop PDF | Admin | `document_id`, `workshop_id`, `status` |
| GET | `/admin/documents/{id}` | Check summary status | Admin | `document_id`, `status`, `ai_summary`, `updated_at` |
| GET | `/admin/stats` | View registration statistics | Admin | `total_workshops`, `total_registrations`, and `by_status { PENDING, CONFIRMED, CANCELLED }` |

### Workshop List Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "1f7b8a4a-7f32-4e75-8b1a-4f4d5e0a31ef",
        "title": "AI for Students",
        "status": "PUBLISHED",
        "start_time": "2026-04-30T08:00:00Z",
        "end_time": "2026-04-30T09:30:00Z",
        "room": {
          "id": "4f1d2c7a-6c71-4bca-9fa1-31b0d9960c5e",
          "name": "Hall A"
        },
        "capacity": 60,
        "registered_count": 42,
        "remaining_seats": 18,
        "price": 0
      }
    ],
    "page": 1,
    "page_size": 10,
    "total": 1
  }
}
```

### Workshop Detail Response

```json
{
  "success": true,
  "data": {
    "id": "1f7b8a4a-7f32-4e75-8b1a-4f4d5e0a31ef",
    "title": "AI for Students",
    "description": "Introductory workshop on practical AI tools.",
    "status": "PUBLISHED",
    "start_time": "2026-04-30T08:00:00Z",
    "end_time": "2026-04-30T09:30:00Z",
    "room": {
      "id": "4f1d2c7a-6c71-4bca-9fa1-31b0d9960c5e",
      "name": "Hall A",
      "base_capacity": 80
    },
    "capacity": 60,
    "registered_count": 42,
    "remaining_seats": 18,
    "price": 0,
    "document": {
      "status": "COMPLETED",
      "ai_summary": "This workshop introduces..."
    }
  }
}
```

### Create Workshop Response

```json
{
  "success": true,
  "data": {
    "id": "d1c0be6c-7e4a-4e2d-9d8f-9fd2e0b0c8c1",
    "title": "AI for Students",
    "status": "DRAFT"
  }
}
```

### Update Workshop Response

```json
{
  "success": true,
  "data": {
    "id": "d1c0be6c-7e4a-4e2d-9d8f-9fd2e0b0c8c1",
    "updated": true
  }
}
```

### Cancel Workshop Response

```json
{
  "success": true,
  "data": {
    "id": "d1c0be6c-7e4a-4e2d-9d8f-9fd2e0b0c8c1",
    "status": "CANCELLED"
  }
}
```

### Upload PDF Request

`multipart/form-data` with:

- `file`: PDF file
- `workshop_id`: UUID

### Upload PDF Response

```json
{
  "success": true,
  "data": {
    "document_id": "9d8fd3d7-6cb8-47a2-bf42-7f6d8b50d9e1",
    "status": "PENDING",
    "workshop_id": "1f7b8a4a-7f32-4e75-8b1a-4f4d5e0a31ef"
  }
}
```

### Summary Status Response

```json
{
  "success": true,
  "data": {
    "document_id": "9d8fd3d7-6cb8-47a2-bf42-7f6d8b50d9e1",
    "status": "PROCESSING",
    "ai_summary": null,
    "updated_at": "2026-04-30T09:00:00Z"
  }
}
```

### Stats Response

```json
{
  "success": true,
  "data": {
    "total_workshops": 12,
    "total_registrations": 840,
    "by_status": {
      "PENDING": 12,
      "CONFIRMED": 760,
      "CANCELLED": 68
    }
  }
}
```

## 3. Registration API

| Method | Endpoint | Purpose | Roles | Returns |
|---|---|---|---|---|
| POST | `/registrations` | Register for a workshop | Student | `registration_id`, `status`, `qr_code`, `workshop_id`, `payment_status`, and `remaining_seats` |
| GET | `/registrations/me` | View my registrations | Student | `items[]` with `registration_id`, `workshop { id, title }`, `status`, `qr_code`, `payment_status` |
| GET | `/registrations/{id}` | View one registration | Student, Admin | `registration_id`, `status`, `qr_code`, `workshop { id, title, start_time }`, `payment { status, amount }`, `checkins[]` |

### Registration Request

```json
{
  "workshop_id": "1f7b8a4a-7f32-4e75-8b1a-4f4d5e0a31ef"
}
```

### Registration Success Response

```json
{
  "success": true,
  "data": {
    "registration_id": "b70ca1fa-8f06-4f53-8ad4-4d6f3b38e9f9",
    "status": "CONFIRMED",
    "qr_code": "UNI-REG-2026-000123",
    "workshop_id": "1f7b8a4a-7f32-4e75-8b1a-4f4d5e0a31ef"
  }
}
```

### My Registrations Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "registration_id": "b70ca1fa-8f06-4f53-8ad4-4d6f3b38e9f9",
        "workshop": {
          "id": "1f7b8a4a-7f32-4e75-8b1a-4f4d5e0a31ef",
          "title": "AI for Students"
        },
        "status": "CONFIRMED",
        "qr_code": "UNI-REG-2026-000123"
      }
    ]
  }
}
```

### Registration Detail Response

```json
{
  "success": true,
  "data": {
    "registration_id": "b70ca1fa-8f06-4f53-8ad4-4d6f3b38e9f9",
    "status": "CONFIRMED",
    "qr_code": "UNI-REG-2026-000123",
    "workshop": {
      "id": "1f7b8a4a-7f32-4e75-8b1a-4f4d5e0a31ef",
      "title": "AI for Students",
      "start_time": "2026-04-30T08:00:00Z"
    },
    "payment": {
      "status": "SUCCESS",
      "amount": 100000
    },
    "checkins": [
      {
        "scanned_at": "2026-04-30T08:45:11Z",
        "device_id": "android-6d9f1f0c"
      }
    ]
  }
}
```

### 429 Response

```json
{
  "code": "RATE_LIMITED",
  "message": "Too many requests. Please try again in a few seconds.",
  "details": {
    "retry_after_seconds": 10
  }
}
```

### Sold-Out Response

```json
{
  "code": "WORKSHOP_SOLD_OUT",
  "message": "This workshop is fully booked.",
  "details": {
    "workshop_id": "1f7b8a4a-7f32-4e75-8b1a-4f4d5e0a31ef"
  }
}
```

## 4. Payment API

| Method | Endpoint | Purpose | Roles | Returns |
|---|---|---|---|---|
| POST | `/payments` | Create a payment session | Student | `payment_id`, `status`, `redirect_url`, `provider`, `idempotency_state` |
| POST | `/payments/webhook` | Receive payment gateway callback | Public, signed webhook | `accepted`, `processed`, and optional `payment_id` |
| GET | `/payments/me` | View my payment history | Student | `items[]` with `payment_id`, `registration_id`, `amount`, `provider`, `status`, `transaction_id` |
| GET | `/payments/{id}` | View one payment | Student, Admin | `payment_id`, `registration_id`, `amount`, `provider`, `status`, `transaction_id`, `idempotency_key` |

### Payment Request

```json
{
  "registration_id": "b70ca1fa-8f06-4f53-8ad4-4d6f3b38e9f9",
  "provider": "VNPAY",
  "idempotency_key": "2b0a2c9d-9e6a-4db0-8e74-92b5d2e0c8e1"
}
```

### Payment Pending Response

```json
{
  "success": true,
  "data": {
    "payment_id": "d4f7f1a4-3d4d-4d76-a20f-7f0df3a8dd63",
    "status": "PENDING_PAYMENT",
    "redirect_url": null
  }
}
```

### Payment History Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "payment_id": "d4f7f1a4-3d4d-4d76-a20f-7f0df3a8dd63",
        "registration_id": "b70ca1fa-8f06-4f53-8ad4-4d6f3b38e9f9",
        "amount": 100000,
        "provider": "VNPAY",
        "status": "SUCCESS",
        "transaction_id": "VNPAY-20260430-0001"
      }
    ]
  }
}
```

### Payment Detail Response

```json
{
  "success": true,
  "data": {
    "payment_id": "d4f7f1a4-3d4d-4d76-a20f-7f0df3a8dd63",
    "registration_id": "b70ca1fa-8f06-4f53-8ad4-4d6f3b38e9f9",
    "amount": 100000,
    "provider": "VNPAY",
    "status": "SUCCESS",
    "transaction_id": "VNPAY-20260430-0001",
    "idempotency_key": "2b0a2c9d-9e6a-4db0-8e74-92b5d2e0c8e1"
  }
}
```

### Webhook Acknowledgement

```json
{
  "success": true,
  "data": {
    "accepted": true
  }
}
```

## 5. Notification API

| Method | Endpoint | Purpose | Roles | Returns |
|---|---|---|---|---|
| GET | `/notifications/me` | List my notifications | Student | `items[]` with `id`, `title`, `content`, `type`, `is_read`, `created_at` |
| PATCH | `/notifications/{id}/read` | Mark notification as read | Student | `id`, `is_read` |
| POST | `/admin/notifications/replay` | Re-send failed notifications | Admin | `replayed`, `failed` |

### Notifications Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "2c7d7e55-7a7d-4f4d-8a0e-3f1f6b8f8f11",
        "title": "Registration confirmed",
        "content": "Your workshop registration is confirmed.",
        "type": "EMAIL",
        "is_read": false,
        "created_at": "2026-04-30T08:02:00Z"
      }
    ]
  }
}
```

### Mark Read Response

```json
{
  "success": true,
  "data": {
    "id": "2c7d7e55-7a7d-4f4d-8a0e-3f1f6b8f8f11",
    "is_read": true
  }
}
```

### Replay Notifications Response

```json
{
  "success": true,
  "data": {
    "replayed": 12,
    "failed": 1
  }
}
```

## 6. Check-in API

| Method | Endpoint | Purpose | Roles | Returns |
|---|---|---|---|---|
| POST | `/checkins/sync` | Sync offline or online QR scans | Checker | `accepted`, `duplicates`, `synced_at` |
| GET | `/checkins/me` | View my check-in history | Student | `items[]` with `checkin_id`, `registration_id`, `workshop_title`, `scanned_at`, `device_id` |
| GET | `/admin/checkins` | View check-in statistics | Admin | `total_checkins`, `unique_registrations`, `duplicate_scans` |

### Offline Sync Request

```json
{
  "device_id": "android-6d9f1f0c",
  "scans": [
    {
      "qr_code": "UNI-REG-2026-000123",
      "scanned_at": "2026-04-30T09:15:22Z",
      "offline_sync_id": "d6f0c7df-8e6c-41c1-9d9f-1af1f1a8f00a"
    },
    {
      "qr_code": "UNI-REG-2026-000124",
      "scanned_at": "2026-04-30T09:15:31Z",
      "offline_sync_id": "d6f0c7df-8e6c-41c1-9d9f-1af1f1a8f00b"
    }
  ]
}
```

### Offline Sync Success Response

```json
{
  "success": true,
  "data": {
    "accepted": 2,
    "duplicates": 0,
    "synced_at": "2026-04-30T09:16:05Z"
  }
}
```

### My Check-ins Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "checkin_id": "a1f2e3d4-c5b6-7890-abcd-ef0123456789",
        "registration_id": "b70ca1fa-8f06-4f53-8ad4-4d6f3b38e9f9",
        "workshop_title": "AI for Students",
        "scanned_at": "2026-04-30T08:45:11Z",
        "device_id": "android-6d9f1f0c"
      }
    ]
  }
}
```

### Admin Check-in Stats Response

```json
{
  "success": true,
  "data": {
    "total_checkins": 420,
    "unique_registrations": 400,
    "duplicate_scans": 20
  }
}
```

## 7. CSV Sync API

| Method | Endpoint | Purpose | Roles | Returns |
|---|---|---|---|---|
| POST | `/admin/csv-sync/run` | Trigger manual CSV import | Admin | `job_id`, `status`, `file_name` |
| GET | `/admin/csv-sync-logs` | View import logs | Admin | `items[]` with `log_id`, `file_name`, `status`, `total_rows`, `success_rows`, `error_rows` |

### CSV Run Response

```json
{
  "success": true,
  "data": {
    "job_id": "f4b17dcb-3f74-4f0f-8b5d-6d5c4f10b9af",
    "status": "PROCESSING",
    "file_name": "students_20260430.csv"
  }
}
```

### CSV Logs Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "log_id": "cc8e4f7a-3d4d-4f0c-8c3e-1f5c0f2f9a10",
        "file_name": "students_20260429.csv",
        "status": "SUCCESS",
        "total_rows": 20000,
        "success_rows": 19860,
        "error_rows": 140
      }
    ]
  }
}
```

## 8. Common Error Responses

### Unauthorized

```json
{
  "code": "UNAUTHORIZED",
  "message": "Authentication is required."
}
```

### Forbidden

```json
{
  "code": "FORBIDDEN",
  "message": "You do not have permission to access this resource."
}
```

### Validation Error

```json
{
  "code": "VALIDATION_ERROR",
  "message": "The request payload is invalid.",
  "details": {
    "field": "file",
    "reason": "Only PDF files are allowed"
  }
}
```

### Rate Limited

```json
{
  "code": "RATE_LIMITED",
  "message": "Too many requests. Please try again in a few seconds.",
  "details": {
    "retry_after_seconds": 10
  }
}
```

### Workshop Sold Out

```json
{
  "code": "WORKSHOP_SOLD_OUT",
  "message": "This workshop is fully booked.",
  "details": {
    "workshop_id": "1f7b8a4a-7f32-4e75-8b1a-4f4d5e0a31ef"
  }
}
```

### Payment Pending

```json
{
  "code": "PAYMENT_PENDING",
  "message": "Payment is temporarily unavailable. Please try again later.",
  "details": {
    "payment_id": "d4f7f1a4-3d4d-4d76-a20f-7f0df3a8dd63"
  }
}
```

## 9. Feature to API Mapping

| Spec File | Related APIs |
|---|---|
| `auth.md` | `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me` |
| `workshop-management.md` | `/workshops`, `/workshops/{id}`, `/admin/workshops`, `/admin/documents`, `/admin/documents/{id}`, `/admin/stats` |
| `registration.md` | `/registrations`, `/registrations/me`, `/registrations/{id}` |
| `payment.md` | `/payments`, `/payments/webhook`, `/payments/me`, `/payments/{id}` |
| `notification.md` | `/notifications/me`, `/notifications/{id}/read`, `/admin/notifications/replay` |
| `checkin.md` | `/checkins/sync`, `/checkins/me`, `/admin/checkins` |
| `csv-sync.md` | `/admin/csv-sync/run`, `/admin/csv-sync-logs` |
| `ai-summary.md` | `/admin/documents`, `/admin/documents/{id}` |
