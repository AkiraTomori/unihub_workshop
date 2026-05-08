import { randomUUID } from 'crypto';
import db from '../config/db.js';

export class Registration {
  static async findWorkshopById(workshopId, trx = db) {
    return trx('workshops')
      .where({ id: workshopId })
      .whereNull('deleted_at')
      .first();
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
        'r.qr_code',
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
        'r.qr_code',
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

  static async enqueueRegistrationSideEffects(trx, userId, registrationId, workshopTitle) {
    await trx('outbox_events').insert({
      id: randomUUID(),
      aggregate_id: registrationId,
      event_type: 'registration.confirmed',
      payload: JSON.stringify({ registrationId }),
      status: 'PENDING',
    });

    await trx('notifications').insert({
      id: randomUUID(),
      user_id: userId,
      channel: 'IN_APP',
      template: 'registration_confirm',
      subject: 'Registration Confirmed',
      content: `Your registration is confirmed for ${workshopTitle}.`,
      recipient: '',
      status: 'PENDING',
    });
  }

  static async listByWorkshop(workshopId) {
    return db('registrations as r')
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