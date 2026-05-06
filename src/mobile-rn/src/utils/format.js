export function vnd(value) {
  return new Intl.NumberFormat("vi-VN").format(Number(value || 0));
}
