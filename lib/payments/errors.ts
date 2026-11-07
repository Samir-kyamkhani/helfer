type ProviderErrorPayload = {
  statusCode?: number;
  error?: {
    code?: string;
    description?: string;
    reason?: string;
  };
};

export type ProviderFailure = {
  message: string;
  statusCode?: number;
  code?: string;
};

/**
 * Payment provider SDKs (notably Razorpay) throw plain objects shaped like
 * `{ statusCode, error: { code, description } }` instead of `Error` instances.
 * Extract the human-readable provider message so routes can surface it.
 */
export function providerFailure(error: unknown): ProviderFailure | null {
  if (!error || typeof error !== "object" || error instanceof Error) return null;
  const payload = error as ProviderErrorPayload;
  const provider = payload.error;
  if (!provider || typeof provider !== "object") return null;
  const description = typeof provider.description === "string" ? provider.description.trim() : "";
  const reason = typeof provider.reason === "string" ? provider.reason.trim() : "";
  const code = typeof provider.code === "string" ? provider.code : undefined;
  const message = description || reason || code;
  if (!message) return null;
  return {
    message,
    statusCode: typeof payload.statusCode === "number" ? payload.statusCode : undefined,
    code,
  };
}

export function billingErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  return providerFailure(error)?.message ?? fallback;
}
