/** Error thrown by API interactions; carries a short code for footer display. */
export class UsageError extends Error {
  readonly code: string;
  override name = "UsageError";

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

export async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    throw new UsageError(
      `Network error: ${error instanceof Error ? error.message : String(error)}`,
      "fetch",
    );
  }

  if (!response.ok) {
    throw new UsageError(`API request failed with status ${response.status}`, `http${response.status}`);
  }

  return response;
}

export async function safeParseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    const message = error instanceof SyntaxError ? "empty or malformed response" : String(error);
    throw new UsageError(`API returned invalid JSON (${message})`, "badjson");
  }
}
