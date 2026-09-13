import { RequestError } from "./request-error.js";

export interface SafeErrorDetails {
  name: string;
  code?: number | string;
  message?: string;
}

/** Extracts diagnostic error metadata without serializing SDK requests, entities, or raw payloads. */
export function safeErrorDetails(error: unknown): SafeErrorDetails {
  if (!(error instanceof Error)) return { name: "UnknownError" };
  const candidateName = error.name || error.constructor.name;
  const details: SafeErrorDetails = {
    name: /^[A-Za-z][A-Za-z0-9]{0,63}Error$/.test(candidateName) ? candidateName : "Error",
  };
  if (error instanceof RequestError) details.message = error.message;
  if (!("code" in error)) return details;
  if (typeof error.code === "number") details.code = error.code;
  else if (typeof error.code === "string" && /^[A-Z][A-Z0-9_]{0,99}$/.test(error.code)) {
    details.code = error.code;
  }
  if (
    "errorMessage" in error &&
    typeof error.errorMessage === "string" &&
    /^[A-Z][A-Z0-9_]{0,99}$/.test(error.errorMessage)
  ) {
    details.message = error.errorMessage;
  }
  return details;
}
