import type { Config } from "./config.js";
import { getAccessToken } from "./auth.js";

/**
 * NH Open API REST 호출 공통 래퍼.
 *   - 토큰 자동 발급/캐시
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
  const token = await getAccessToken(config);
  const url = `${config.baseUrl}${path}`;

  const headers: Record<string, string> = {
    "x-client-id": config.appKey,
    "x-client-secret": config.appSecret,
    authorization: `Bearer ${token}`,
    "content-type": "application/json; charset=UTF-8",
  };
  if (cts) headers["cts"] = cts;

  const body = JSON.stringify({ Input_0: input });

  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers, body });
  } catch (e) {
    throw new Error(
      `API 호출 실패 (네트워크). ${config.baseUrl} 접근 가능한 환경인지 확인하세요. 원인: ${String(e)}`
    );
  }

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`API 호출 실패 (HTTP ${res.status}) ${path}: ${text.slice(0, 800)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    // JSON 이 아니면 원문 반환
    return { raw: text };
  }
}
