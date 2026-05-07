import Workshop from '../models/workshop.model.js';
import Admin from '../models/admin.model.js';

function parseDateFallback(dateString) {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  return parsed;
}

export class AdminService {
  static async createWorkshop(payload) {
    const roomId = await Admin.findFirstRoomId();
    if (!roomId) throw { status: 400, message: 'No room configured in database' };

    const startTime = parseDateFallback(payload.date);
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

    const workshop = await Workshop.create({
      room_id: roomId,
      title: payload.title,
      description: payload.speaker ? `Speaker: ${payload.speaker}` : 'Workshop created from admin UI',
      cover_image_url: null,
      start_time: startTime,
      end_time: endTime,
      capacity: Number(payload.totalSeats || 60),
      price: Number(payload.fee || 0),
      status: 'DRAFT',
    });

    return { id: workshop.id, title: workshop.title, status: workshop.status };
  }

  static async cancelWorkshop(workshopId, actorId) {
    const workshop = await Workshop.findById(workshopId);
    if (!workshop) throw { status: 404, message: 'Workshop not found' };

    await Workshop.update(workshopId, { status: 'CANCELLED' });
    await Admin.insertWorkshopAuditLog({
      actorId,
      workshopId,
      oldStatus: workshop.status,
      newStatus: 'CANCELLED',
    });
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
}

export default AdminService;
