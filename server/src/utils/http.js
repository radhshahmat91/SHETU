export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
// wrap async route handlers so rejected promises reach the error middleware
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const esc = (s = '') => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null));
export const pick = (o = {}, keys = []) => clean(Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]])));
