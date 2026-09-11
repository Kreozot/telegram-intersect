/** Describes an unsuccessful application API response while preserving its HTTP status for control flow. */
export class ApiError extends Error {
  /** Creates a safe browser error without retaining the rejected request body. */
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Sends protected same-origin requests; never persists keys or Telegram login inputs in browser storage. */
export async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-Intersect-Request": "1" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data: unknown = await response.json();
  if (!response.ok)
    throw new ApiError(
      typeof data === "object" && data !== null && "error" in data
        ? String(data.error)
        : "Request failed.",
      response.status,
    );
  return data as T;
}
