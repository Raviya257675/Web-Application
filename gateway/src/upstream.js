/** Verify the *existing* Spring JWT using its /api/auth/me endpoint. No second JWT. */
export async function authenticateWithSpring(authorization, backendOrigin, fetchImpl = fetch) {
  if (!/^Bearer [A-Za-z0-9._~-]+$/.test(authorization || '')) {
    return { status: 401, error: 'Sign in to continue' };
  }
  let response;
  try {
    response = await fetchImpl(new URL('/api/auth/me', backendOrigin), {
      headers: { authorization, accept: 'application/json' },
      signal: AbortSignal.timeout(7000),
    });
  } catch {
    return { status: 502, error: 'Spring Boot is unavailable' };
  }
  if (!response.ok) {
    return { status: response.status === 403 ? 403 : 401, error: 'Invalid or expired session' };
  }
  try {
    const json = await response.json();
    if (!json?.success || !json?.data?.id || !json?.data?.role) {
      return { status: 401, error: 'Invalid identity response' };
    }
    return { status: 200, user: json.data };
  } catch {
    return { status: 502, error: 'Invalid response from Spring Boot' };
  }
}
