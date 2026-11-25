export async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/reports${path}`, {
      ...options,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error(
      'Could not reach the API. Check that both local servers are running, then try again.',
    );
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      typeof body?.message === 'string'
        ? body.message
        : 'The request failed. Please try again.',
    );
  }
  return response.json() as Promise<T>;
}
