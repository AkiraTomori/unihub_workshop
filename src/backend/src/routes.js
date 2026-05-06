import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authRequired, requireRole, signQrCode, signToken, verifyQrCode } from "./auth.js";
import { db, query } from "./supabase.js";

const router = Router();
const paymentCircuit = {
  state: "CLOSED",
  failureCount: 0,
  openedUntilMs: 0
};

router.get("/health", (_, res) => res.json({ ok: true }));

router.post("/auth/login", async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8)
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid payload" });

    const result = await query("select * from app_users where email = $1 limit 1", [parsed.data.email.toLowerCase()]);
    const user = result.rows[0];
    if (!user || !user.password_hash) return res.status(401).json({ message: "Invalid email or password" });
    const passwordMatched = await bcrypt.compare(parsed.data.password, user.password_hash);
    if (!passwordMatched) return res.status(401).json({ message: "Invalid email or password" });
    return res.json({ token: signToken(user), user: { id: user.id, role: user.role, fullName: user.full_name } });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/workshops", authRequired, async (req, res) => {
  try {
    const schema = z.object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(10)
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ message: "Invalid pagination query" });
    const { page, pageSize } = parsed.data;
    const offset = (page - 1) * pageSize;

    const [countResult, dataResult] = await Promise.all([
      query("select count(*)::int as total from workshops"),
      query("select * from workshops order by created_at desc limit $1 offset $2", [pageSize, offset])
    ]);

    const total = countResult.rows[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return res.json({
      data: dataResult.rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/registrations", authRequired, requireRole("STUDENT"), async (req, res) => {
  const client = await db.connect();
  try {
    const schema = z.object({ workshopId: z.string().uuid() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid payload" });

    await client.query("begin");
    const duplicateCheck = await client.query(
      "select id, status, qr_code from registrations where workshop_id = $1::uuid and student_id = $2::uuid limit 1",
      [parsed.data.workshopId, req.user.sub]
    );
    if (duplicateCheck.rows[0]) {
      await client.query("rollback");
      return res.status(409).json({ message: "Student already registered for this workshop" });
    }

    const workshopResult = await client.query("select id, title, seats_left, fee from workshops where id = $1::uuid for update", [
      parsed.data.workshopId
    ]);
    const workshop = workshopResult.rows[0];
    if (!workshop) {
      await client.query("rollback");
      return res.status(404).json({ message: "Workshop not found" });
    }
    if (workshop.seats_left <= 0) {
      await client.query("rollback");
      return res.status(409).json({ message: "Workshop sold out" });
    }

    await client.query("update workshops set seats_left = seats_left - 1 where id = $1::uuid", [parsed.data.workshopId]);
    const status = Number(workshop.fee) > 0 ? "PENDING_PAYMENT" : "CONFIRMED";
    const insertResult = await client.query(
      `
      insert into registrations(workshop_id, student_id, status, qr_code)
      values ($1::uuid, $2::uuid, $3::text, $4::text)
      returning *
      `,
      [parsed.data.workshopId, req.user.sub, status, ""]
    );
    const registration = insertResult.rows[0];

    let qrCode = null;
    if (status === "CONFIRMED") {
      qrCode = signQrCode({
        registrationId: registration.id,
        workshopId: registration.workshop_id,
        studentId: registration.student_id
      });
      await client.query("update registrations set qr_code = $1 where id = $2::uuid", [qrCode, registration.id]);
      await client.query(
        `
        insert into outbox_events(event_type, aggregate_id, payload, status)
        values ('REGISTRATION_CONFIRMED', $1::uuid, $2::jsonb, 'PENDING')
        `,
        [
          registration.id,
          JSON.stringify({
            registrationId: registration.id,
            workshopId: registration.workshop_id,
            studentId: registration.student_id,
            workshopTitle: workshop.title,
            qrCode
          })
        ]
      );
    }

    await client.query("commit");
    return res.json({
      id: registration.id,
      workshop_id: registration.workshop_id,
      student_id: registration.student_id,
      status,
      requires_payment: status === "PENDING_PAYMENT",
      qr_code: qrCode
    });
  } catch (error) {
    await client.query("rollback");
    return res.status(400).json({ message: error.message });
  } finally {
    client.release();
  }
});

router.get("/registrations/me", authRequired, requireRole("STUDENT"), async (req, res) => {
  try {
    const result = await query(
      `
      select
        r.id,
        r.workshop_id,
        r.student_id,
        r.status,
        r.qr_code,
        r.created_at,
        w.title as workshop_title,
        w.date_text as workshop_date
      from registrations r
      join workshops w on w.id = r.workshop_id
      where r.student_id = $1::uuid
      order by r.created_at desc
      `,
      [req.user.sub]
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/notifications/me", authRequired, requireRole("STUDENT"), async (req, res) => {
  try {
    const result = await query(
      `
      select id, title, message, channel, status, created_at
      from notifications
      where user_id = $1::uuid
      order by created_at desc
      limit 30
      `,
      [req.user.sub]
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/payments/checkout", authRequired, requireRole("STUDENT"), async (req, res) => {
  const now = Date.now();
  try {
    const schema = z.object({
      registrationId: z.string().uuid(),
      idempotencyKey: z.string().min(8),
      simulateResult: z.enum(["success", "timeout", "failure"]).optional()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid payload" });

    if (paymentCircuit.state === "OPEN" && paymentCircuit.openedUntilMs > now) {
      return res.status(202).json({
        status: "PENDING_PAYMENT",
        circuitState: "OPEN",
        message: "Payment provider is temporarily unavailable. Please retry later."
      });
    }
    if (paymentCircuit.state === "OPEN" && paymentCircuit.openedUntilMs <= now) {
      paymentCircuit.state = "HALF_OPEN";
    }

    const existingPayment = await query("select id, status, registration_id from payments where idempotency_key = $1::text limit 1", [
      parsed.data.idempotencyKey
    ]);
    if (existingPayment.rows[0]) {
      const regResult = await query("select id, status, qr_code from registrations where id = $1::uuid", [
        existingPayment.rows[0].registration_id
      ]);
      const reg = regResult.rows[0];
      return res.json({
        status: reg?.status ?? "PENDING_PAYMENT",
        reused: true,
        paymentId: existingPayment.rows[0].id,
        qrCode: reg?.qr_code || null
      });
    }

    const registrationResult = await query(
      `
      select r.id, r.status, r.qr_code, r.workshop_id, r.student_id, w.fee, w.title
      from registrations r
      join workshops w on w.id = r.workshop_id
      where r.id = $1::uuid and r.student_id = $2::uuid
      limit 1
      `,
      [parsed.data.registrationId, req.user.sub]
    );
    const registration = registrationResult.rows[0];
    if (!registration) return res.status(404).json({ message: "Registration not found" });
    if (registration.status === "CONFIRMED") {
      return res.json({
        status: "CONFIRMED",
        reused: true,
        qrCode: registration.qr_code || null
      });
    }

    const mode = parsed.data.simulateResult || "success";
    const providerSuccess = mode === "success";
    const paymentStatus = providerSuccess ? "SUCCESS" : "PENDING";
    const amount = Number(registration.fee || 0);

    const paymentResult = await query(
      `
      insert into payments (registration_id, student_id, idempotency_key, amount, status)
      values ($1::uuid, $2::uuid, $3::text, $4::int, $5::text)
      returning id, status
      `,
      [parsed.data.registrationId, req.user.sub, parsed.data.idempotencyKey, amount, paymentStatus]
    );

    if (!providerSuccess) {
      paymentCircuit.failureCount += 1;
      if (paymentCircuit.failureCount >= 3) {
        paymentCircuit.state = "OPEN";
        paymentCircuit.openedUntilMs = now + 30000;
      }
      return res.status(202).json({
        status: "PENDING_PAYMENT",
        circuitState: paymentCircuit.state,
        paymentId: paymentResult.rows[0].id,
        message: "Payment timeout/failure. Registration remains pending."
      });
    }

    paymentCircuit.failureCount = 0;
    paymentCircuit.state = "CLOSED";

    const qrCode = signQrCode({
      registrationId: registration.id,
      workshopId: registration.workshop_id,
      studentId: registration.student_id
    });
    await query("update registrations set status = 'CONFIRMED', qr_code = $1 where id = $2::uuid", [qrCode, registration.id]);
    await query(
      `
      insert into outbox_events(event_type, aggregate_id, payload, status)
      values ('REGISTRATION_CONFIRMED', $1::uuid, $2::jsonb, 'PENDING')
      `,
      [
        registration.id,
        JSON.stringify({
          registrationId: registration.id,
          workshopId: registration.workshop_id,
          studentId: registration.student_id,
          workshopTitle: registration.title,
          qrCode
        })
      ]
    );

    return res.json({
      status: "CONFIRMED",
      paymentId: paymentResult.rows[0].id,
      qrCode
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.post("/checkins/sync", authRequired, requireRole("CHECKER"), async (req, res) => {
  try {
    const schema = z.object({
      items: z.array(
        z.object({
          registrationId: z.string().uuid().optional().nullable(),
          qrCode: z.string().optional(),
          offlineSyncId: z.string().min(3),
          checkedInAt: z.string()
        })
      )
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid payload" });

    for (const item of parsed.data.items) {
      let resolvedRegistrationId = item.registrationId ?? null;
      if (!resolvedRegistrationId && item.qrCode) {
        const decoded = verifyQrCode(item.qrCode);
        if (!decoded || decoded.type !== "CHECKIN_QR") {
          throw new Error("Invalid QR code in sync payload");
        }
        resolvedRegistrationId = decoded.registrationId;
      }

      await query(
        `
        insert into checkins (registration_id, checker_id, offline_sync_id, checked_in_at)
        values ($1::uuid, $2::uuid, $3::text, $4::timestamptz)
        on conflict (offline_sync_id) do update
        set checked_in_at = excluded.checked_in_at
        `,
        [resolvedRegistrationId, req.user.sub, item.offlineSyncId, item.checkedInAt]
      );
    }
    return res.json({ synced: parsed.data.items.length });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/checkins/scan", authRequired, requireRole("CHECKER"), async (req, res) => {
  try {
    const schema = z.object({ qrCode: z.string().min(20) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid payload" });

    const decoded = verifyQrCode(parsed.data.qrCode);
    if (!decoded || decoded.type !== "CHECKIN_QR") {
      return res.status(400).json({ message: "Invalid QR code" });
    }

    const registrationResult = await query(
      `
      select r.id, r.student_id, r.workshop_id, r.status, w.title as workshop_title, u.full_name as student_name
      from registrations r
      join workshops w on w.id = r.workshop_id
      join app_users u on u.id = r.student_id
      where r.id = $1::uuid
      `,
      [decoded.registrationId]
    );
    const registration = registrationResult.rows[0];
    if (!registration) return res.status(404).json({ message: "Registration not found" });

    const existingCheckin = await query("select id, checked_in_at from checkins where registration_id = $1::uuid limit 1", [
      registration.id
    ]);
    if (existingCheckin.rows[0]) {
      return res.json({
        alreadyCheckedIn: true,
        registrationId: registration.id,
        studentName: registration.student_name,
        workshopTitle: registration.workshop_title,
        checkedInAt: existingCheckin.rows[0].checked_in_at
      });
    }

    const offlineSyncId = `scan-${registration.id}-${Date.now()}`;
    await query(
      "insert into checkins (registration_id, checker_id, offline_sync_id, checked_in_at) values ($1::uuid, $2::uuid, $3::text, now())",
      [registration.id, req.user.sub, offlineSyncId]
    );

    return res.json({
      alreadyCheckedIn: false,
      registrationId: registration.id,
      studentName: registration.student_name,
      workshopTitle: registration.workshop_title
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.post("/admin/workshops", authRequired, requireRole("ADMIN"), async (req, res) => {
  try {
    const schema = z.object({
      title: z.string().min(2),
      speaker: z.string().default("TBD"),
      room: z.string().default("TBD"),
      date: z.string().default("TBD"),
      totalSeats: z.number().int().positive().default(60),
      fee: z.number().int().nonnegative().default(0)
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid payload" });

    const result = await query(
      `
      insert into workshops (title, speaker, room, date_text, total_seats, seats_left, fee, status, summary_status)
      values ($1, $2, $3, $4, $5, $5, $6, 'ACTIVE', 'PENDING')
      returning *
      `,
      [parsed.data.title, parsed.data.speaker, parsed.data.room, parsed.data.date, parsed.data.totalSeats, parsed.data.fee]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.patch("/admin/workshops/:id/cancel", authRequired, requireRole("ADMIN"), async (req, res) => {
  try {
    const result = await query("update workshops set status = 'CANCELLED' where id = $1::uuid returning *", [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: "Workshop not found" });
    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/admin/documents", authRequired, requireRole("ADMIN"), async (req, res) => {
  try {
    const schema = z.object({ workshopId: z.string().uuid(), fileName: z.string().min(3) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid payload" });
    const result = await query(
      "insert into documents (workshop_id, file_name, status) values ($1::uuid, $2::text, 'PENDING') returning *",
      [parsed.data.workshopId, parsed.data.fileName]
    );
    return res.status(202).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/admin/analytics", authRequired, requireRole("ADMIN"), async (_, res) => {
  try {
    const result = await query(`
      select
        count(*) filter (where status = 'ACTIVE')::int as "activeCount",
        coalesce(sum(seats_left), 0)::int as "seatsLeft",
        count(*) filter (where summary_status = 'COMPLETED')::int as "aiCompleted"
      from workshops
    `);
    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get("/admin/csv-sync/latest", authRequired, requireRole("ADMIN"), async (_, res) => {
  try {
    const result = await query("select * from csv_sync_logs order by ran_at desc limit 1");
    if (!result.rows[0]) return res.status(404).json({ message: "No CSV sync logs yet" });
    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
