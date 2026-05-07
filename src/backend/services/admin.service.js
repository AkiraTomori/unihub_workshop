import Workshop from '../models/workshop.model.js';
import Admin from '../models/admin.model.js';

function parseDateFallback(dateString) {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  return parsed;
}

function parseDateInput(value, fallback) {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return fallback;
}

function ensureRoomCapacity(room, totalSeats) {
  if (!room) {
    throw { status: 400, message: 'Room not found' };
  }

  const seats = Number(totalSeats || 0);
  const capacity = Number(room.base_capacity || 0);
  if (seats > capacity) {
    throw {
      status: 400,
      message: `Room capacity must be greater than or equal to workshop seats (${capacity} < ${seats})`,
    };
  }
}

export class AdminService {
  static async createWorkshop(payload) {
    const roomId = payload.room_id || (await Admin.findFirstRoomId());
    if (!roomId) throw { status: 400, message: 'No room configured in database' };
    const room = await Admin.getRoomById(roomId);
    ensureRoomCapacity(room, payload.totalSeats);

    const startTime = parseDateInput(payload.start_time, parseDateFallback(payload.date));
    const endTime = parseDateInput(payload.end_time, new Date(startTime.getTime() + 2 * 60 * 60 * 1000));

    const workshop = await Workshop.create({
      room_id: roomId,
      title: payload.title,
      description: payload.description || null,
      speaker: payload.speaker || null,
      cover_image_url: null,
      start_time: startTime,
      end_time: endTime,
      capacity: Number(payload.totalSeats || 60),
      price: Number(payload.fee || 0),
      status: 'DRAFT',
    });

    return { id: workshop.id, title: workshop.title, status: workshop.status };
  }

  static async listWorkshops(query = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.max(1, Number(query.pageSize) || 10);
    const offset = (page - 1) * pageSize;

    const [total, rows] = await Promise.all([
      Workshop.countAdmin(),
      Workshop.findAdminList({ offset, limit: pageSize }),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.id,
        title: row.title,
        speaker: row.speaker || null,
        room: row.room_name || 'TBD',
        date: row.start_time ? new Date(row.start_time).toLocaleString() : 'TBD',
        seatsLeft: Math.max(0, Number(row.capacity || 0) - Number(row.registered_count || 0)),
        totalSeats: Number(row.capacity || 0),
        fee: Number(row.price || 0),
        status: row.status,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        hasPrevPage: page > 1,
        hasNextPage: page * pageSize < total,
      },
    };
  }

  static async getWorkshopById(workshopId) {
    const workshop = await Workshop.findAnyById(workshopId);
    if (!workshop) throw { status: 404, message: 'Workshop not found' };

    return {
      id: workshop.id,
      title: workshop.title,
      speaker: workshop.speaker || null,
      description: workshop.description || '',
      room_id: workshop.room_id,
      room: workshop.room_name || 'TBD',
      start_time: workshop.start_time,
      end_time: workshop.end_time,
      totalSeats: Number(workshop.capacity || 0),
      fee: Number(workshop.price || 0),
      status: workshop.status,
      deleted_at: workshop.deleted_at,
    };
  }

  static async updateWorkshop(workshopId, payload) {
    const current = await Workshop.findAnyById(workshopId);
    if (!current) throw { status: 404, message: 'Workshop not found' };

    const roomId = payload.room_id || current.room_id;
    const room = await Admin.getRoomById(roomId);
    const seats = payload.totalSeats !== undefined ? payload.totalSeats : current.capacity;
    ensureRoomCapacity(room, seats);

    const updated = await Workshop.update(workshopId, {
      room_id: payload.room_id,
      title: payload.title,
      description: payload.description,
      speaker: payload.speaker,
      start_time: payload.start_time,
      end_time: payload.end_time,
      capacity: payload.totalSeats,
      price: payload.fee,
      status: payload.status,
    });

    if (!updated) throw { status: 404, message: 'Workshop not found' };
    return updated;
  }

  static async cancelWorkshop(workshopId, actorId) {
    const workshop = await Workshop.findById(workshopId);
    if (!workshop) throw { status: 404, message: 'Workshop not found' };

    await Workshop.softDelete(workshopId);
    await Admin.insertWorkshopAuditLog({
      actorId,
      workshopId,
      oldStatus: workshop.status,
      newStatus: 'CANCELLED',
    });

    return { id: workshopId, status: 'CANCELLED' };
  }

  static async listDeletedWorkshops() {
    const rows = await Workshop.findDeletedList();
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      speaker: row.speaker || null,
      room: row.room_name || 'TBD',
      date: row.start_time ? new Date(row.start_time).toLocaleString() : 'TBD',
      deleted_at: row.deleted_at,
      status: row.status,
    }));
  }

  static async restoreWorkshop(workshopId, actorId) {
    const workshop = await Workshop.findAnyById(workshopId);
    if (!workshop || !workshop.deleted_at) {
      throw { status: 404, message: 'Deleted workshop not found' };
    }

    const restored = await Workshop.restore(workshopId);
    await Admin.insertWorkshopAuditLog({
      actorId,
      workshopId,
      oldStatus: workshop.status,
      newStatus: restored?.status || 'DRAFT',
    });

    return restored;
  }

  static async uploadDocument(workshopId, fileName) {
    const workshop = await Workshop.findById(workshopId);
    if (!workshop) throw { status: 404, message: 'Workshop not found' };

    return Admin.upsertDocument(workshopId, fileName);
  }

  static async getAnalytics() {
    return Admin.getWorkshopPublishedAnalytics();
  }

  static async getLatestCsvSync() {
    return Admin.getLatestCsvSync();
  }

  static async listRooms() {
    return Admin.listRooms();
  }
}

export default AdminService;
