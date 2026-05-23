import client from 'prom-client';

export const registrationCounter = new client.Counter({
  name: 'unihub_registrations_total',
  help: 'Tổng số lượt đăng ký workshop thành công',
  labelNames: ['workshop_id'],
});
