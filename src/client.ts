import type { Config } from "./config.js";
import { getAccessToken, clearTokenCache } from "./auth.js";

/**
 * 토큰 무효 신호만 좁게 판별한다(재발급 후 재시도 대상).
 * IGW40043("유효하지 않은 token") 또는 HTTP 401 만 해당.
 * 일반 400(예: IGW40024 market_cd 오류)은 재시도하지 않는다.
 */
function isInvalidTokenError(status: number, body: string): boolean {
  if (status === 401) return true;
  return body.includes("IGW40043") || /유효하지\s*않은\s*token/i.test(body);
}

/**
 * NH Open API REST 호출 공통 래퍼.
 *   - 토큰 자동 발급/캐시
 *   - 토큰이 무효(IGW40043/401)면 재발급 후 1회 재시도
 *   - 헤더(x-client-id, x-client-secret, Authorization) 자동 세팅
 *   - 요청 본문을 { Input_0: input } 봉투로 감쌈
 *   - cts(연속조회 키)가 있으면 헤더에 세팅
 * 반환은 서버 원본 JSON(Output_0/Output_1/rsp_cd/message 등)을 그대로 넘김.
 */
export async function callRest(
  config: Config,
  path: string,
  input: Record<string, unknown>,
  cts?: string
): Promise<any> {
  const url = `${config.baseUrl}${path}`;
  const body = JSON.stringify({ Input_0: input });
  let lastText = "";
  let lastStatus = 0;

  for (let attempt = 0; attempt < 2; attempt++) {
    // 2번째 시도는 강제 재발급(force=true)
    const token = await getAccessToken(config, attempt === 1);

    const headers: Record<string, string> = {
      "x-client-id": config.appKey,
      "x-client-secret": config.appSecret,
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=UTF-8",
    };
    if (cts) headers["cts"] = cts;

    let res: Response;
    try {
      res = await fetch(url, { method: "POST", headers, body });
    } catch (e) {
      throw new Error(
        `API 호출 실패 (네트워크). ${config.baseUrl} 접근 가능한 환경인지 확인하세요. 원인: ${String(e)}`
      );
    }

    lastText = await res.text();
    lastStatus = res.status;

    if (res.ok) {
      try {
        return JSON.parse(lastText);
      } catch {
        return { raw: lastText };
      }
    }

    // 토큰 무효면 캐시 비우고 1회 재시도, 그 외 오류는 즉시 중단
    if (attempt === 0 && isInvalidTokenError(res.status, lastText)) {
      clearTokenCache();
      continue;
    }
    break;
  }

  throw new Error(`API 호출 실패 (HTTP ${lastStatus}) ${path}: ${lastText.slice(0, 800)}`);
}
