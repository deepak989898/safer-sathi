type TokenProvider = () => Promise<string>;

let tokenProvider: TokenProvider | null = null;

export function setAuthTokenProvider(provider: TokenProvider | null): void {
  tokenProvider = provider;
}

export async function resolveAuthAccessToken(): Promise<string> {
  if (tokenProvider) {
    return tokenProvider();
  }

  const { getFirebaseIdToken } = await import("@/lib/auth/firebase-id-token");
  return getFirebaseIdToken();
}
