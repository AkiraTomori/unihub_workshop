import Workshop from '../models/workshop.model.js';

export class WorkshopService {
  static async listPublished(query = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = 10;
    const offset = (page - 1) * pageSize;

    const [total, rows] = await Promise.all([
      Workshop.countPublished(),
      Workshop.findPublishedList({ offset, limit: pageSize }),
    ]);

    const items = rows.map((row) => ({
      id: row.id,
      speaker: row.speaker || null,
      title: row.title,
      description: row.description,
      cover_image_url: row.cover_image_url,
      room: row.room_name || 'TBD',
      date_text: row.start_time ? new Date(row.start_time).toLocaleString() : 'TBD',
      seats_left: Math.max(0, Number(row.capacity || 0) - Number(row.registered_count || 0)),
      total_seats: Number(row.capacity || 0),
      fee: Number(row.price || 0),
      status: row.status,
      summary_status: row.summary_status || 'PENDING',
      summary: row.summary || '',
    }));

    const totalPages = Math.max(1, Math.ceil(Number(total || 0) / pageSize));

    return {
      data: items,
      pagination: {
        page,
        pageSize,
        total: Number(total || 0),
        totalPages,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
      },
    };
  }

  static async getPublishedDetail(workshopId) {
    const row = await Workshop.findPublishedById(workshopId);
    if (!row) {
      throw { status: 404, message: 'Workshop not found' };
    }

    const speaker = row.description?.startsWith('Speaker:')
      ? row.description.replace('Speaker:', '').trim()
      : (row.speaker || 'TBD');

    return {
      id: row.id,
      title: row.title,
      description: row.description || '',
      speaker,
      room: row.room_name || 'TBD',
      room_map_image_url: row.room_map_image_url || '',
      start_time: row.start_time,
      end_time: row.end_time,
      seats_left: Math.max(0, Number(row.capacity || 0) - Number(row.registered_count || 0)),
      total_seats: Number(row.capacity || 0),
      fee: Number(row.price || 0),
      status: row.status,
      summary_status: row.document_status || 'PENDING',
      summary: row.ai_summary || '',
    };
  }
}

export default WorkshopService;
