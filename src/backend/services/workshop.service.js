import db from '../config/db.js';

export class WorkshopService {
  static async listPublished({ page = 1, pageSize = 10 }) {
    const safePage = Math.max(1, Number(page) || 1);
    const safePageSize = Math.min(50, Math.max(1, Number(pageSize) || 10));
    const offset = (safePage - 1) * safePageSize;

    const [{ total }] = await db('workshops')
      .where({ status: 'PUBLISHED' })
      .whereNull('deleted_at')
      .count('* as total');

    const rows = await db('workshops as w')
      .leftJoin('rooms as r', 'w.room_id', 'r.id')
      .leftJoin('documents as d', 'd.workshop_id', 'w.id')
      .where('w.status', 'PUBLISHED')
      .whereNull('w.deleted_at')
      .select(
        'w.id',
        'w.title',
        'w.description',
        'w.start_time',
        'w.end_time',
        'w.capacity',
        'w.registered_count',
        'w.price',
        'w.status',
        'r.name as room_name',
        'd.process_status as summary_status',
        'd.ai_summary as summary'
      )
      .orderBy('w.start_time', 'asc')
      .limit(safePageSize)
      .offset(offset);

    const items = rows.map((row) => ({
      id: row.id,
      title: row.title,
      speaker: 'TBD',
      room: row.room_name || 'TBD',
      date_text: row.start_time ? new Date(row.start_time).toLocaleString() : 'TBD',
      seats_left: Math.max(0, Number(row.capacity || 0) - Number(row.registered_count || 0)),
      total_seats: Number(row.capacity || 0),
      fee: Number(row.price || 0),
      status: row.status,
      summary_status: row.summary_status || 'PENDING',
      summary: row.summary || '',
    }));

    const totalNum = Number(total || 0);
    const totalPages = Math.max(1, Math.ceil(totalNum / safePageSize));

    return {
      data: items,
      pagination: {
        page: safePage,
        pageSize: safePageSize,
        total: totalNum,
        totalPages,
        hasPrevPage: safePage > 1,
        hasNextPage: safePage < totalPages,
      },
    };
  }
}

export default WorkshopService;
