import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authRequired, requireRole, signQrCode, signToken, verifyQrCode } from "./auth.js";
import { query } from "./supabase.js";

const router = Router();

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
  try {
    const schema = z.object({ workshopId: z.string().uuid() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid payload" });
    const result = await query("select register_workshop($1::uuid, $2::uuid) as data", [parsed.data.workshopId, req.user.sub]);
    const registration = result.rows[0].data;
    const qrCode = signQrCode({
      registrationId: registration.id,
      workshopId: registration.workshop_id,
      studentId: registration.student_id
    });
    await query("update registrations set qr_code = $1 where id = $2::uuid", [qrCode, registration.id]);
    return res.json({ ...registration, qr_code: qrCode });
  } catch (error) {
    return res.status(400).json({ message: error.message });
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

router.post("/payments/checkout", authRequired, requireRole("STUDENT"), async (req, res) => {
  try {
    const schema = z.object({
      registrationId: z.string().uuid(),
      idempotencyKey: z.string().min(8)
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid payload" });

    const result = await query("select process_payment($1::uuid, $2::uuid, $3::text) as data", [
      parsed.data.registrationId,
      req.user.sub,
      parsed.data.idempotencyKey
    ]);
    return res.json(result.rows[0].data);
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
