/** An error with an HTTP status and a message that is safe to show to the user. */
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const fail = (c, status, message) => c.json({ ok: false, error: message }, status);
