import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// .env 를 "패키지 루트"(dist/ 의 상위)에서 로드합니다.
// 이렇게 하면 Claude Desktop 이 어느 위치에서 실행하든 nhplug-mcp/.env 를 찾습니다.
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });
// 현재 작업 폴더에 .env 가 있으면 그것도 병합(있을 때만)
dotenv.config();

export interface Config {
  appKey: string;
  appSecret: string;
  baseUrl: string;
  enableTrading: boolean;
  defaultAccount: string;
}

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `환경변수 ${name} 가 설정되지 않았습니다. nhplug-mcp/.env 또는 MCP 설정의 env 에 값을 넣어주세요.`
    );
  }
  return value.trim();
}

export function loadConfig(): Config {
  const enable = (process.env.NHPLUG_ENABLE_TRADING ?? "false").trim().toLowerCase();
  return {
    // NHPLUG_ 접두 변수를 우선 사용하되, 접두 없는 APP_KEY/APP_SECRET 도 허용
    appKey: required("NHPLUG_APP_KEY", process.env.NHPLUG_APP_KEY ?? process.env.APP_KEY),
    appSecret: required(
      "NHPLUG_APP_SECRET",
      process.env.NHPLUG_APP_SECRET ?? process.env.APP_SECRET
    ),
    baseUrl: (process.env.NHPLUG_BASE_URL ?? "https://devapi.nhplug.com:8443").trim(),
    enableTrading: enable === "true" || enable === "1" || enable === "yes",
    defaultAccount: (process.env.NHPLUG_DEFAULT_ACCOUNT ?? "").trim(),
  };
}
