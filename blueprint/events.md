# UniHub Workshop — Event Catalog

This document defines the RabbitMQ events used by the modular monolith and background workers. It prevents mismatches between the Core API and the workers by standardizing exchange names, queue names, routing keys, and payload shapes.

## Message Broker Conventions

| Item | Convention |
|---|---|
| Broker | RabbitMQ |
| Exchange type | Topic exchange |
| Main exchange | `unihub.events` |
| Outbox exchange | `unihub.outbox` |
| Dead-letter exchange | `unihub.dlx` |
| Message format | JSON |
| Shared metadata | `event_id`, `event_type`, `occurred_at`, `aggregate_id`, `correlation_id`, `trace_id` |

## Common Event Envelope

All events follow the same envelope structure.

```json
{
  "event_id": "6c4a6c9d-3d49-4d7d-a2c2-1a48a3d4f111",
  "event_type": "RegistrationConfirmed",
  "occurred_at": "2026-04-30T09:05:21Z",
  "aggregate_id": "b70ca1fa-8f06-4f53-8ad4-4d6f3b38e9f9",
  "correlation_id": "c0a8012e-2c36-4e1e-a6e5-5a2d7ce9b001",
  "trace_id": "trace-20260430-00001",
  "payload": {}
}
```

## Event Catalog

| Event | Exchange | Routing Key | Queue(s) | Producer | Consumer(s) |
|---|---|---|---|---|---|
| DocumentUploaded | `unihub.events` | `document.uploaded` | `ai.worker.queue` | Core API | AI Worker |
| RegistrationConfirmed | `unihub.events` | `registration.confirmed` | `notification.worker.queue` | Core API | Notification Worker |
| NotificationRequested | `unihub.events` | `notification.requested` | `notification.worker.queue` | Core API / Payment API | Notification Worker |
| PaymentSucceeded | `unihub.events` | `payment.succeeded` | `notification.worker.queue` | Payment API | Notification Worker |
| PaymentFailed | `unihub.events` | `payment.failed` | `notification.worker.queue` | Payment API | Notification Worker |
| CsvSyncCompleted | `unihub.events` | `csv.sync.completed` | `admin.audit.queue` | CSV Worker | Core API / Admin monitoring |
| CheckinBatchSynced | `unihub.events` | `checkin.batch.synced` | `audit.queue` | Check-in API | Core API / Audit processing |

## Event Definitions

### 1. DocumentUploaded

Purpose: notify the AI Worker that a workshop PDF has been uploaded and needs summarization.

```json
{
  "event_id": "6c4a6c9d-3d49-4d7d-a2c2-1a48a3d4f111",
  "event_type": "DocumentUploaded",
  "occurred_at": "2026-04-30T09:05:21Z",
  "aggregate_id": "9d8fd3d7-6cb8-47a2-bf42-7f6d8b50d9e1",
  "correlation_id": "c0a8012e-2c36-4e1e-a6e5-5a2d7ce9b001",
  "trace_id": "trace-20260430-00001",
  "payload": {
    "document_id": "9d8fd3d7-6cb8-47a2-bf42-7f6d8b50d9e1",
    "workshop_id": "1f7b8a4a-7f32-4e75-8b1a-4f4d5e0a31ef",
    "pdf_url": "https://storage.example.com/docs/workshop-a.pdf",
    "file_name": "workshop-a.pdf",
    "file_size_bytes": 5242880,
    "uploaded_by": "7f3f7e73-0d58-4d0a-9e8c-0db92a50c2f0"
  }
}
```

### 2. RegistrationConfirmed

Purpose: notify downstream services that a registration has been confirmed after successful payment.

```json
{
  "event_id": "7a7b8c9d-3d49-4d7d-a2c2-1a48a3d4f222",
  "event_type": "RegistrationConfirmed",
  "occurred_at": "2026-04-30T09:12:44Z",
  "aggregate_id": "b70ca1fa-8f06-4f53-8ad4-4d6f3b38e9f9",
  "correlation_id": "c0a8012e-2c36-4e1e-a6e5-5a2d7ce9b001",
  "trace_id": "trace-20260430-00002",
  "payload": {
    "registration_id": "b70ca1fa-8f06-4f53-8ad4-4d6f3b38e9f9",
    "user_id": "7f3f7e73-0d58-4d0a-9e8c-0db92a50c2f0",
    "workshop_id": "1f7b8a4a-7f32-4e75-8b1a-4f4d5e0a31ef",
    "status": "CONFIRMED",
    "qr_code": "UNI-REG-2026-000123",
    "confirmed_at": "2026-04-30T09:12:44Z"
  }
}
```

### 3. NotificationRequested

Purpose: request the Notification Worker to send a message to a recipient using the correct channel and template.

```json
{
  "event_id": "8b8c9d0e-3d49-4d7d-a2c2-1a48a3d4f777",
  "event_type": "NotificationRequested",
  "occurred_at": "2026-04-30T09:12:45Z",
  "aggregate_id": "b70ca1fa-8f06-4f53-8ad4-4d6f3b38e9f9",
  "correlation_id": "c0a8012e-2c36-4e1e-a6e5-5a2d7ce9b001",
  "trace_id": "trace-20260430-00002",
  "payload": {
    "notification_id": "2c7d7e55-7a7d-4f4d-8a0e-3f1f6b8f8f11",
    "user_id": "7f3f7e73-0d58-4d0a-9e8c-0db92a50c2f0",
    "channel": "EMAIL",
    "template": "registration-confirmed",
    "subject": "Registration confirmed",
    "recipient": "a@example.com",
    "reference_type": "REGISTRATION",
    "reference_id": "b70ca1fa-8f06-4f53-8ad4-4d6f3b38e9f9"
  }
}
```

### 4. PaymentSucceeded

Purpose: notify the system that a payment transaction has completed successfully.

```json
{
  "event_id": "8a8b9c0d-3d49-4d7d-a2c2-1a48a3d4f333",
  "event_type": "PaymentSucceeded",
  "occurred_at": "2026-04-30T09:12:41Z",
  "aggregate_id": "d4f7f1a4-3d4d-4d76-a20f-7f0df3a8dd63",
  "correlation_id": "c0a8012e-2c36-4e1e-a6e5-5a2d7ce9b001",
  "trace_id": "trace-20260430-00002",
  "payload": {
    "payment_id": "d4f7f1a4-3d4d-4d76-a20f-7f0df3a8dd63",
    "registration_id": "b70ca1fa-8f06-4f53-8ad4-4d6f3b38e9f9",
    "amount": 100000,
    "provider": "VNPAY",
    "transaction_id": "VNPAY-20260430-0001",
    "status": "SUCCESS"
  }
}
```

### 5. PaymentFailed

Purpose: notify the application that a payment attempt failed or was cancelled.

```json
{
  "event_id": "9a9bac1d-3d49-4d7d-a2c2-1a48a3d4f444",
  "event_type": "PaymentFailed",
  "occurred_at": "2026-04-30T09:13:02Z",
  "aggregate_id": "d4f7f1a4-3d4d-4d76-a20f-7f0df3a8dd63",
  "correlation_id": "c0a8012e-2c36-4e1e-a6e5-5a2d7ce9b001",
  "trace_id": "trace-20260430-00003",
  "payload": {
    "payment_id": "d4f7f1a4-3d4d-4d76-a20f-7f0df3a8dd63",
    "registration_id": "b70ca1fa-8f06-4f53-8ad4-4d6f3b38e9f9",
    "provider": "VNPAY",
    "status": "FAILED",
    "failure_reason": "TIMEOUT"
  }
}
```

### 6. CsvSyncCompleted

Purpose: record the result of a nightly legacy CSV import.

```json
{
  "event_id": "aaabac2d-3d49-4d7d-a2c2-1a48a3d4f555",
  "event_type": "CsvSyncCompleted",
  "occurred_at": "2026-04-30T02:15:00Z",
  "aggregate_id": "cc8e4f7a-3d4d-4f0c-8c3e-1f5c0f2f9a10",
  "correlation_id": "csv-20260430-nightly",
  "trace_id": "trace-20260430-00004",
  "payload": {
    "csv_sync_log_id": "cc8e4f7a-3d4d-4f0c-8c3e-1f5c0f2f9a10",
    "file_name": "students_20260429.csv",
    "status": "SUCCESS",
    "total_rows": 20000,
    "success_rows": 19860,
    "error_rows": 140
  }
}
```

### 7. CheckinBatchSynced

Purpose: notify audit or downstream processing that a mobile batch of check-ins has been synchronized.

```json
{
  "event_id": "bbbcad3d-3d49-4d7d-a2c2-1a48a3d4f666",
  "event_type": "CheckinBatchSynced",
  "occurred_at": "2026-04-30T09:16:05Z",
  "aggregate_id": "android-6d9f1f0c",
  "correlation_id": "checkin-batch-20260430-001",
  "trace_id": "trace-20260430-00005",
  "payload": {
    "device_id": "android-6d9f1f0c",
    "accepted": 2,
    "duplicates": 0,
    "synced_at": "2026-04-30T09:16:05Z"
  }
}
```

## Notes for Implementation

- Core API should publish business events via the outbox table.
- Workers must be idempotent because RabbitMQ may redeliver messages.
- Consumers should ignore already-processed `event_id` values when possible.
- The `payload` object should contain only the data required by the consumer, not the entire database row.
