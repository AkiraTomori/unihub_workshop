import { db } from "./supabase.js";

const TARGET_EVENT = "REGISTRATION_CONFIRMED";

async function processEvent(client, event) {
  const payload = event.payload || {};
  const userId = payload.studentId;
  const workshopTitle = payload.workshopTitle || "Workshop";
  const qrCode = payload.qrCode || "N/A";

  if (!userId) {
    throw new Error("Missing studentId in outbox payload");
  }

  const title = "Registration Confirmed";
  const message = `You are confirmed for ${workshopTitle}. QR: ${qrCode.slice(0, 14)}...`;

  await client.query(
    `
    insert into notifications (user_id, title, message, channel, status, outbox_event_id)
    values ($1::uuid, $2::text, $3::text, 'IN_APP', 'SENT', $4::uuid)
    on conflict (outbox_event_id, channel) do nothing
    `,
    [userId, title, message, event.id]
  );

  await client.query(
    `
    insert into notifications (user_id, title, message, channel, status, outbox_event_id)
    values ($1::uuid, $2::text, $3::text, 'EMAIL', 'SENT', $4::uuid)
    on conflict (outbox_event_id, channel) do nothing
    `,
    [userId, title, `Email delivery queued for ${workshopTitle}.`, event.id]
  );
}

export async function runNotificationWorkerBatch(batchSize = 20) {
  const client = await db.connect();
  try {
    await client.query("begin");
    const result = await client.query(
      `
      select id, payload
      from outbox_events
      where status = 'PENDING' and event_type = $1
      order by created_at asc
      limit $2
      for update skip locked
      `,
      [TARGET_EVENT, batchSize]
    );

    for (const event of result.rows) {
      try {
        await processEvent(client, event);
        await client.query(
          "update outbox_events set status = 'PUBLISHED', published_at = now(), last_error = null where id = $1::uuid",
          [event.id]
        );
      } catch (error) {
        await client.query(
          `
          update outbox_events
          set retry_count = retry_count + 1,
              last_error = $2::text,
              status = case when retry_count + 1 >= 5 then 'FAILED' else 'PENDING' end
          where id = $1::uuid
          `,
          [event.id, String(error.message || error)]
        );
      }
    }

    await client.query("commit");
    return result.rows.length;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export function startNotificationWorker({ intervalMs = 5000 } = {}) {
  const timer = setInterval(() => {
    runNotificationWorkerBatch().catch((error) => {
      console.error("Notification worker batch failed:", error);
    });
  }, intervalMs);
  return () => clearInterval(timer);
}
