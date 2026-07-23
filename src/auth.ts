import type { Config } from "./config.js";

interface TokenState {
  token: string;
  // epoch(ms) 이후에는 만료로 간주하고 재발급
  expiresAt: number;
}

let cached: TokenState | null = null;

/**
 * 접근 토큰 발급. NH Open API 규약:
 *   POST {BASE_URL}/oauth2/token
 *   query: appkey, appsecretkey, grant_type=client_credentials, scope=oob
 *   content-type: application/x-www-form-urlencoded
 *   → { access_token, expires_in?, ... }
 * 발급된 토큰은 만료 전까지 메모리에 캐시합니다.
 */
export async function getAccessToken(config: Config): Promise<string> {
  const now = Date.now();
  if (cached && cached.expiresAt > now + 30_000) {
    return cached.token;
  }

  const url = new URL(`${config.authUrl}/oauth2/token`);
  url.searchParams.set("appkey", config.appKey);
  url.searchParams.set("appsecretkey", config.appSecret);
  url.searchParams.set("grant_type", "client_credentials");
  url.searchParams.set("scope", "oob");

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
  } catch (e) {
    throw new Error(
      `토큰 발급 요청 실패 (네트워크). 인증 서버(${config.authUrl}, 운영 전용)에 접근 가능한 환경인지 확인하세요. 원인: ${String(e)}`
    );
  }

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`토큰 발급 실패 (HTTP ${res.status}): ${text.slice(0, 500)}`);
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`토큰 응답이 JSON 이 아닙니다: ${text.slice(0, 300)}`);
  }

  const token: string | undefined = data.access_token ?? data.accessToken;
  if (!token) {
    throw new Error(`토큰 응답에 access_token 이 없습니다: ${text.slice(0, 300)}`);
  }

  // expires_in(초) 이 오면 사용, 없으면 보수적으로 10분 캐시
  const expiresInSec = Number(data.expires_in ?? data.expiresIn ?? 600);
  cached = {
    token,
    expiresAt: now + (Number.isFinite(expiresInSec) ? expiresInSec : 600) * 1000,
  };
  return token;
}

/** 테스트/디버그용: 토큰 캐시 강제 초기화 */
export function clearTokenCache(): void {
  cached = null;
}
