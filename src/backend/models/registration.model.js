import { randomUUID } from 'crypto';
import db from '../config/db.js';

export class Registration {
  static async findWorkshopById(workshopId, trx = db) {
    return trx('workshops')
      .where({ id: workshopId })
      .whereNull('deleted_at')
      .first();
  }

  static async findRoomById(roomId, trx = db) {
    return trx('rooms').where({ id: roomId }).first();
  }

  static async findActiveRegistration(userId, workshopId, trx = db) {
    return trx('registrations')
      .where({ user_id: userId, workshop_id: workshopId })
      .whereNot('status', 'CANCELLED')
      .first();
  }

  static async createRegistration(trx, registrationData) {
    await trx('registrations').insert(registrationData);
  }

  static async countActivePendingPaymentRegistrations(workshopId, trx = db) {
    const row = await trx('registrations')
      .where({ workshop_id: workshopId, status: 'PENDING_PAYMENT' })
      .where((query) => {
        query.whereNull('expires_at').orWhere('expires_at', '>', trx.fn.now());
      })
      .count('* as total')
      .first();

    return Number(row?.total || 0);
  }

  static async incrementWorkshopRegisteredCount(workshopId, trx = db) {
    await trx('workshops').where({ id: workshopId }).increment('registered_count', 1);
  }

  static async listMyRegistrations(userId) {
    return db('registrations as r')
      .join('workshops as w', 'r.workshop_id', 'w.id')
      .where('r.user_id', userId)
      .whereNot('r.status', 'CANCELLED')
      .select(
        'r.id',
        'r.workshop_id',
        'r.status',
        db.raw("CASE WHEN r.status = 'CONFIRMED' THEN r.qr_code ELSE NULL END as qr_code"),
        'w.title as workshop_title',
        'w.start_time as workshop_date'
      )
      .orderBy('r.created_at', 'desc');
  }

  static async findById(registrationId) {
    return db('registrations as r')
      .join('workshops as w', 'r.workshop_id', 'w.id')
      .join('users as u', 'r.user_id', 'u.id')
      .leftJoin('payments as p', 'r.id', 'p.registration_id')
      .where('r.id', registrationId)
      .select(
        'r.id as registration_id',
        'r.user_id',
        'r.workshop_id',
        'r.status',
        'r.expires_at',
        db.raw("CASE WHEN r.status = 'CONFIRMED' THEN r.qr_code ELSE NULL END as qr_code"),
        'r.created_at as registration_created_at',
        'r.updated_at as registration_updated_at',
        'w.title as workshop_title',
        'w.start_time as workshop_start_time',
        'p.id as payment_id',
        'p.amount as payment_amount',
        'p.provider as payment_provider',
        'p.status as payment_status',
        'p.transaction_id as payment_transaction_id',
        'p.idempotency_key as payment_idempotency_key'
      )
      .first();
  }

  static async findRegistrationForCheckout(userId, registrationId, trx = db) {
    return trx('registrations as r')
      .join('workshops as w', 'r.workshop_id', 'w.id')
      .where('r.id', registrationId)
      .where('r.user_id', userId)
      .select(
        'r.id',
        'r.user_id',
        'r.workshop_id',
        'r.status as registration_status',
        'r.qr_code',
        'w.title as workshop_title',
        'w.price',
        'w.registered_count'
      )
      .first();
  }

  static async enqueueRegistrationSideEffects(trx, {
    userId,
    recipient,
    subject,
    content,
    registrationId,
    workshopId,
    workshopTitle,
    workshopStartTime,
    workshopSpeaker,
    workshopRoomName,
    qrCode,
  }) {
    const notificationId = randomUUID();
    const occurredAt = new Date().toISOString();

    await trx('outbox_events').insert({
      id: randomUUID(),
      aggregate_id: registrationId,
      event_type: 'NotificationRequested',
      payload: {
        event_id: randomUUID(),
        event_type: 'NotificationRequested',
        occurred_at: occurredAt,
        aggregate_id: notificationId,
        correlation_id: registrationId,
        trace_id: `registration-${registrationId}`,
        payload: {
          notification_id: notificationId,
          user_id: userId,
          channel: 'EMAIL',
          template: 'registration-confirmed',
          subject,
          recipient,
          content,
          registration_id: registrationId,
          workshop_id: workshopId,
          workshop_title: workshopTitle,
          workshop_start_time: workshopStartTime || null,
          workshop_speaker: workshopSpeaker || null,
          workshop_room_name: workshopRoomName || null,
          qr_code: qrCode,
        },
      },
      status: 'PENDING',
    });

    await trx('notifications').insert({
      id: notificationId,
      user_id: userId,
      channel: 'EMAIL',
      template: 'registration-confirmed',
      subject,
      content,
      recipient,
      status: 'PENDING',
    });

    return { notificationId };
  }

  static async enqueueWorkshopCancellation(trx, {
    userId,
    recipient,
    subject,
    content,
    registrationId,
    workshopId,
    workshopTitle,
    workshopStartTime,
    workshopSpeaker,
    workshopRoomName,
    reason,
  }) {
    const notificationId = randomUUID();
    const occurredAt = new Date().toISOString();

    await trx('outbox_events').insert({
      id: randomUUID(),
      aggregate_id: registrationId,
      event_type: 'NotificationRequested',
      payload: {
        event_id: randomUUID(),
        event_type: 'NotificationRequested',
        occurred_at: occurredAt,
        aggregate_id: notificationId,
        correlation_id: registrationId,
        trace_id: `registration-${registrationId}`,
        payload: {
          notification_id: notificationId,
          user_id: userId,
          channel: 'EMAIL',
          template: 'workshop-cancelled',
          subject,
          recipient,
          content,
          registration_id: registrationId,
          workshop_id: workshopId,
          workshop_title: workshopTitle,
          workshop_start_time: workshopStartTime || null,
          workshop_speaker: workshopSpeaker || null,
          workshop_room_name: workshopRoomName || null,
          reason: reason || null,
        },
      },
      status: 'PENDING',
    });

    await trx('notifications').insert({
      id: notificationId,
      user_id: userId,
      channel: 'EMAIL',
      template: 'workshop-cancelled',
      subject,
      content,
      recipient,
      status: 'PENDING',
    });

    return { notificationId };
  }

  static async listByWorkshop(workshopId, trx = db) {
    return trx('registrations as r')
      .join('users as u', 'r.user_id', 'u.id')
      .leftJoin('payments as p', 'r.id', 'p.registration_id')
      .where('r.workshop_id', workshopId)
      .whereNot('r.status', 'CANCELLED')
      .select(
        'r.id',
        'r.user_id',
        'r.status',
        'r.created_at',
        'u.full_name',
        'u.email',
        'u.student_code',
        'p.id as payment_id',
        'p.status as payment_status'
      )
      .orderBy('r.created_at', 'desc');
  }
}

export default Registration;
