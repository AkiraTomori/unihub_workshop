import db from '../config/db.js';

export class Workshop {
  static buildPublicQuery() {
    return db('workshops as w')
      .join('rooms as r', 'w.room_id', 'r.id')
      .leftJoin('documents as d', 'w.id', 'd.workshop_id')
      .whereNull('w.deleted_at')
      .andWhere('w.status', 'PUBLISHED');
  }

  static buildAdminQuery() {
    return db('workshops as w')
      .join('rooms as r', 'w.room_id', 'r.id')
      .leftJoin('documents as d', 'w.id', 'd.workshop_id');
  }

  static buildAdminActiveQuery() {
    return this.buildAdminQuery().whereNull('w.deleted_at');
  }

  static async countPublished() {
    const result = await db('workshops')
      .whereNull('deleted_at')
      .andWhere('status', 'PUBLISHED')
      .countDistinct({ total: 'id' })
      .first();

    return Number(result?.total || 0);
  }

  static async findPublishedList({ offset, limit }) {
    return this.buildPublicQuery()
      .select(
        'w.id',
        'w.speaker',
        'w.title',
        'w.description',
        'w.cover_image_url',
        'w.status',
        'w.start_time',
        'w.end_time',
        'w.capacity',
        'w.registered_count',
        'w.price',
        'r.id as room_id',
        'r.name as room_name'
      )
      .orderBy('w.start_time', 'asc')
      .limit(limit)
      .offset(offset);
  }

  static async findPublishedById(id) {
    return this.buildPublicQuery()
      .where('w.id', id)
      .select(
        'w.id',
        'w.speaker',
        'w.title',
        'w.description',
        'w.cover_image_url',
        'w.status',
        'w.start_time',
        'w.end_time',
        'w.capacity',
        'w.registered_count',
        'w.price',
        'w.created_at',
        'w.updated_at',
        'r.id as room_id',
        'r.name as room_name',
        'r.map_image_url as room_map_image_url',
        'r.base_capacity as room_base_capacity',
        'd.process_status as document_status',
        'd.ai_summary'
      )
      .first();
  }

  static async findById(id) {
    return this.buildAdminActiveQuery()
      .where('w.id', id)
      .select(
        'w.id',
        'w.speaker',
        'w.title',
        'w.description',
        'w.cover_image_url',
        'w.status',
        'w.start_time',
        'w.end_time',
        'w.capacity',
        'w.registered_count',
        'w.price',
        'w.deleted_at',
        'w.created_at',
        'w.updated_at',
        'r.id as room_id',
        'r.name as room_name',
        'r.base_capacity as room_base_capacity',
        'd.process_status as document_status',
        'd.ai_summary'
      )
      .first();
  }

  static async findAnyById(id) {
    return this.buildAdminQuery()
      .where('w.id', id)
      .select(
        'w.id',
        'w.speaker',
        'w.title',
        'w.description',
        'w.cover_image_url',
        'w.status',
        'w.start_time',
        'w.end_time',
        'w.capacity',
        'w.registered_count',
        'w.price',
        'w.deleted_at',
        'w.created_at',
        'w.updated_at',
        'r.id as room_id',
        'r.name as room_name',
        'r.base_capacity as room_base_capacity',
        'd.process_status as document_status',
        'd.ai_summary'
      )
      .first();
  }

  static async findAdminList({ offset, limit } = {}) {
    let query = this.buildAdminActiveQuery()
      .select(
        'w.id',
        'w.speaker',
        'w.title',
        'w.description',
        'w.cover_image_url',
        'w.status',
        'w.start_time',
        'w.end_time',
        'w.capacity',
        'w.registered_count',
        'w.price',
        'w.deleted_at',
        'w.created_at',
        'w.updated_at',
        'r.id as room_id',
        'r.name as room_name',
        'r.base_capacity as room_base_capacity',
        'd.process_status as document_status',
        'd.ai_summary'
      )
      .orderBy('w.start_time', 'desc');

    if (typeof limit === 'number') query = query.limit(limit);
    if (typeof offset === 'number') query = query.offset(offset);

    return query;
  }

  static async countAdmin() {
    const result = await db('workshops')
      .whereNull('deleted_at')
      .countDistinct({ total: 'id' })
      .first();

    return Number(result?.total || 0);
  }

  static async findDeletedList() {
    return this.buildAdminQuery()
      .whereNotNull('w.deleted_at')
      .select(
        'w.id',
        'w.speaker',
        'w.title',
        'w.description',
        'w.cover_image_url',
        'w.status',
        'w.start_time',
        'w.end_time',
        'w.capacity',
        'w.registered_count',
        'w.price',
        'w.deleted_at',
        'w.created_at',
        'w.updated_at',
        'r.id as room_id',
        'r.name as room_name',
        'r.base_capacity as room_base_capacity',
        'd.process_status as document_status',
        'd.ai_summary'
      )
      .orderBy('w.deleted_at', 'desc');
  }

  static async create(workshopData) {
    const [{ id }] = await db('workshops')
      .insert({
        room_id: workshopData.room_id,
        title: workshopData.title,
        description: workshopData.description || null,
        speaker: workshopData.speaker || null,
        cover_image_url: workshopData.cover_image_url || null,
        start_time: workshopData.start_time,
        end_time: workshopData.end_time,
        capacity: workshopData.capacity,
        registered_count: 0,
        price: workshopData.price || 0,
        status: workshopData.status || 'DRAFT',
      })
      .returning(['id']);

    return this.findById(id);
  }

  static async update(id, workshopData) {
    const updateData = {};

    if (workshopData.room_id !== undefined) updateData.room_id = workshopData.room_id;
    if (workshopData.speaker !== undefined) updateData.speaker = workshopData.speaker;
    if (workshopData.title !== undefined) updateData.title = workshopData.title;
    if (workshopData.description !== undefined) updateData.description = workshopData.description;
    if (workshopData.cover_image_url !== undefined) updateData.cover_image_url = workshopData.cover_image_url;
    if (workshopData.start_time !== undefined) updateData.start_time = workshopData.start_time;
    if (workshopData.end_time !== undefined) updateData.end_time = workshopData.end_time;
    if (workshopData.capacity !== undefined) updateData.capacity = workshopData.capacity;
    if (workshopData.price !== undefined) updateData.price = workshopData.price;
    if (workshopData.status !== undefined) updateData.status = workshopData.status;

    updateData.updated_at = db.fn.now();

    const affectedRows = await db('workshops')
      .where('id', id)
      .whereNull('deleted_at')
      .update(updateData);

    if (!affectedRows) {
      return null;
    }

    return this.findById(id);
  }

  static async softDelete(id) {
    const affectedRows = await db('workshops')
      .where('id', id)
      .whereNull('deleted_at')
      .update({
        status: 'CANCELLED',
        deleted_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

    if (!affectedRows) {
      return null;
    }

    return this.findAnyById(id);
  }

  static async restore(id) {
    const affectedRows = await db('workshops')
      .where('id', id)
      .whereNotNull('deleted_at')
      .update({
        deleted_at: null,
        status: 'DRAFT',
        updated_at: db.fn.now(),
      });

    if (!affectedRows) {
      return null;
    }

    return this.findById(id);
  }

  static async getAnalytics() {
    const [workshopsResult, registrationsResult] = await Promise.all([
      db('workshops')
        .whereNull('deleted_at')
        .countDistinct({ total_workshops: 'id' })
        .first(),
      db('registrations as r')
        .join('workshops as w', 'r.workshop_id', 'w.id')
        .whereNull('w.deleted_at')
        .select(
          db.raw('COUNT(*)::int as total_registrations'),
          db.raw(`SUM(CASE WHEN r.status = 'PENDING_PAYMENT' THEN 1 ELSE 0 END)::int as pending`),
          db.raw(`SUM(CASE WHEN r.status = 'CONFIRMED' THEN 1 ELSE 0 END)::int as confirmed`),
          db.raw(`SUM(CASE WHEN r.status = 'CANCELLED' THEN 1 ELSE 0 END)::int as cancelled`)
        )
        .first(),
    ]);

    return {
      total_workshops: Number(workshopsResult?.total_workshops || 0),
      total_registrations: Number(registrationsResult?.total_registrations || 0),
      by_status: {
        PENDING: Number(registrationsResult?.pending || 0),
        CONFIRMED: Number(registrationsResult?.confirmed || 0),
        CANCELLED: Number(registrationsResult?.cancelled || 0),
      },
    };
  }
}

export default Workshop;