# NH투자증권 Open API — Local MCP Server

NH투자증권 Open API 를 **Claude Desktop** 등 MCP 클라이언트에서 바로 사용할 수 있게 해주는 로컬 MCP 서버입니다. 국내주식(krstock) 자산군의 시세·조회·주문 API 를 Claude 가 도구로 호출합니다.

- 인증 · 토큰 발급 · 헤더 · `Input_0` 봉투 처리를 서버가 자동으로 대신합니다.
- 131개 엔드포인트를 몇 개의 **메타 도구**로 노출해, 도구가 많아 성능이 떨어지는 문제를 피합니다.
- 주문(거래) API 는 **기본 비활성**이며, 명시적으로 켠 경우에만 사용됩니다.

> 현재 버전은 **국내주식(krstock)** 자산군만 포함한 MVP 입니다. 다른 자산군은 `specs/` 폴더에 openapi.json 을 추가하면 확장됩니다(맨 아래 참고).

---

## 1. 사전 요건

1. **Node.js 18 이상** — [nodejs.org](https://nodejs.org) 에서 설치. (`node -v` 로 확인. `npx` 는 Node 에 포함)
2. **NH투자증권 Open API 앱키/시크릿** — 포털 [www.nhplug.com](https://www.nhplug.com/intro) 에서 발급.
3. **Git** — 방법 A(npx github)·방법 B(clone) 모두 필요. [git-scm.com](https://git-scm.com) 에서 설치. (`git --version` 으로 확인)
4. **API 서버 네트워크 접근** — 이 MCP 는 당신 PC 에서 `*.nhplug.com` API 서버로 직접 연결합니다. 사내망 등에서만 접근 가능한 환경이라면, MCP 를 실행하는 PC 도 그 네트워크에 있어야 합니다.

---

## 2. 설치 및 실행

### 방법 A — npx로 GitHub에서 바로 실행 (권장, 설치 불필요)

별도 다운로드·빌드 없이 Claude 설정 한 줄이면 됩니다. 고객용 설정에 아래 `command`/`args` 를 씁니다(전체 설정은 3번).

```json
"command": "npx",
"args": ["-y", "github:plug-support/nhplug-mcp"]
```

> **첫 실행 예열(권장):** npx 는 첫 실행 때 GitHub 에서 받아 빌드하느라 1분 정도 걸립니다. Claude 가 기다리다 실패하지 않도록, 터미널에서 한 번 미리 실행해 두면 좋습니다:
> ```powershell
> npx -y github:plug-support/nhplug-mcp
> ```
> `[nhplug-mcp] 시작됨 ...` 로그가 뜨면 `Ctrl + C` 로 종료. 이후 Claude 실행이 빨라집니다.
>
> **업데이트 반영:** npx 는 받은 코드를 캐시합니다. 새 버전을 받으려면 `npm cache clean --force` 후 Claude 재시작.

### 방법 B — git clone 후 로컬 빌드

```bash
git clone https://github.com/plug-support/nhplug-mcp.git
cd nhplug-mcp
npm install
npm run build
```

빌드가 끝나면 `dist/index.js` 가 생성됩니다. 이 경로를 Claude 설정에 `"command": "node", "args": ["<경로>/dist/index.js"]` 로 등록합니다.

---

## 3. Claude Desktop 연결

Claude Desktop 설정 파일 `claude_desktop_config.json` 을 엽니다.

- **가장 쉬운 방법**: Claude Desktop → **설정(Settings)** → **개발자(Developer)** → **Edit Config** 버튼.
- 직접 열기 — **Windows**: `%APPDATA%\Claude\claude_desktop_config.json` · **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

아래 내용을 붙여넣습니다. (방법 A · GitHub npx 기준)

```json
{
  "mcpServers": {
    "nhplug": {
      "command": "npx",
      "args": ["-y", "github:plug-support/nhplug-mcp"],
      "env": {
        "NHPLUG_APP_KEY": "발급받은_APP_KEY",
        "NHPLUG_APP_SECRET": "발급받은_APP_SECRET",
        "NHPLUG_BASE_URL": "https://devmoapi.nhplug.com:8443",
        "NHPLUG_ENABLE_TRADING": "false"
      }
    }
  }
}
```

저장 후 **Claude Desktop 을 완전히 종료(트레이 포함)했다가 다시 실행**하면 `nhplug` 도구가 나타납니다.

> **JSON 주의:** 항목 사이엔 콤마(`,`), 마지막 항목 뒤엔 콤마 없음. Windows 경로의 `\` 는 `\\` 로 두 개씩. 이미 다른 서버가 있으면 `"nhplug": { ... }` 블록만 `mcpServers` 안에 추가하세요.
>
> 방법 B(로컬 빌드)를 쓰면 `command` 를 `"node"`, `args` 를 `["C:\\경로\\nhplug-mcp\\dist\\index.js"]` 로 바꾸면 됩니다. 키는 설정의 `env` 대신 저장소 폴더의 `.env` 파일(`.env.example` 참고)로 넣어도 됩니다.

---

## 4. 환경변수

| 변수 | 필수 | 설명 |
|---|---|---|
| `NHPLUG_APP_KEY` | ✅ | 발급받은 앱키 |
| `NHPLUG_APP_SECRET` | ✅ | 발급받은 앱시크릿 |
| `NHPLUG_BASE_URL` | | REST Base URL. 기본값 `https://devmoapi.nhplug.com:8443` (개발 모의투자) |
| `NHPLUG_ENABLE_TRADING` | | `true` 일 때만 주문(거래) 도구 노출. 기본 `false` |
| `NHPLUG_DEFAULT_ACCOUNT` | | 잔고/주문 단축 도구에서 계좌번호 생략 시 사용 |

### 접속 환경(Base URL)

| 환경 | URL |
|---|---|
| 개발 모의투자 (테스트 권장) | `https://devmoapi.nhplug.com:8443` |
| 개발 실거래 | `https://devapi.nhplug.com:8443` |
| 운영 모의투자 | `https://moapi.nhplug.com:8443` |
| 운영 실거래 | `https://api.nhplug.com:8443` |

---

## 5. 제공 도구

| 도구 | 종류 | 설명 |
|---|---|---|
| `list_apis` | 메타 | 호출 가능한 API 목록. domain/category/keyword 필터. 여기서 operationId 를 찾습니다. |
| `describe_api` | 메타 | 특정 operationId 의 입력 필드(Input_0) 스키마 조회. |
| `call_api` | 메타 | operationId + 입력값으로 실제 호출. 131개 엔드포인트 전부 커버. |
| `get_stock_price` | 단축 | 국내주식 현재가 (종목코드만 입력). |
| `get_stock_balance` | 단축 | 국내주식 계좌 잔고. |
| `list_accounts` | 단축 | 보유 계좌 목록 조회 (잔고·주문 전 계좌번호 확보용, `POST /n2/acctinfo`). |

**동작 흐름(메타 도구):** `list_apis` 로 원하는 API 를 찾고 → `describe_api` 로 입력값을 확인한 뒤 → `call_api` 로 호출합니다. 자주 쓰는 현재가·잔고는 단축 도구로 한 번에 호출할 수 있습니다.

### 사용 예시 프롬프트

- "삼성전자(005930) 현재가 알려줘" → `get_stock_price`
- "국내주식 시세 관련 API 목록 보여줘" → `list_apis`
- "krstockQuoteCurrentDaily 는 어떤 입력이 필요해?" → `describe_api`
- "내 계좌 목록 보여줘" → `list_accounts`
- "내 계좌 20101036881 잔고 조회해줘" → `get_stock_balance`

---

## 6. 주문(거래) 활성화 ⚠️

주문 API(매수/매도/정정/취소)는 **실제 자산이 오가는 기능**이라 기본적으로 **숨겨져 있습니다.** 활성화하려면:

1. `NHPLUG_ENABLE_TRADING=true` 로 설정하고 Claude Desktop 재시작.
2. 반드시 **모의투자 환경(`devmoapi`/`moapi`)** 에서 충분히 검증 후 사용하세요.
3. 실거래 환경에서는 Claude 가 주문을 실행하기 전에 사람이 직접 확인하는 절차를 권장합니다.

비활성 상태에서는 주문 도구가 `list_apis` 에도 표시되지 않고, `call_api` 로 시도해도 거부됩니다.

---

## 7. 연결 검증 (self-test)

Claude 에 붙이기 전에, API 서버 접근·인증이 정상인지 로컬에서 먼저 확인할 수 있습니다.

```bash
# .env 에 APP_KEY / APP_SECRET / BASE_URL 을 채운 뒤
node scripts/selftest.mjs
```

토큰 발급 → 삼성전자 현재가 조회까지 성공하면 `전체 검증 통과 ✅` 가 출력됩니다.

---

## 8. 문제 해결

| 증상 | 원인 / 해결 |
|---|---|
| `환경변수 NHPLUG_APP_KEY 가 설정되지 않았습니다` | 설정의 `env` 또는 `.env` 에 키 누락 |
| `토큰 발급 요청 실패 (네트워크)` | API 서버에 접근 불가. 사내망/방화벽/URL 확인 |
| `토큰 발급 실패 (HTTP 401/403)` | 앱키·시크릿 오류 또는 해당 환경 미허용 |
| Claude 에 도구가 안 보임 | 설정 저장 후 Claude Desktop **완전 종료 후 재시작** |
| 주문 도구가 안 보임 | 의도된 동작. `NHPLUG_ENABLE_TRADING=true` 필요 |

로그는 표준오류(stderr)로 출력됩니다: `[nhplug-mcp] 시작됨 · baseUrl=... · trading=...`

---

## 9. 자산군 확장

다른 자산군을 추가하려면 해당 `openapi.json` 을 `specs/` 폴더에 `<도메인>.openapi.json` 이름으로 넣고 다시 빌드하면 됩니다. 예:

```
specs/
  krstock.openapi.json   ← 현재 포함
  gbstock.openapi.json   ← 추가 시 해외주식 자동 노출
  krfuture.openapi.json  ← 추가 시 국내파생 자동 노출
```

메타 도구(`list_apis`/`describe_api`/`call_api`)는 코드 수정 없이 새 자산군을 자동 인식합니다. (단축 도구는 자산군별로 추가 구현 가능)

---

## 라이선스

MIT. 문의: apisupport@nhsec.com
