#!/usr/bin/env node
// 도메인(정본)에서 openapi.json 을 specs/ 로 당겨온다 — 번들 새로고침.
//
// 정본: https://www.nhplug.com/openapi-docs/<자산>/openapi.json
//
// 사용:
//   node scripts/sync_specs.mjs                  # specs/ 에 이미 있는 자산만 최신화
//   node scripts/sync_specs.mjs krstock gbstock  # 지정 자산 받기(신규 추가 가능)
//
// ⚠️ 받은 뒤 반드시 MCP call_api 로 라이브 검증(현재가·잔고 A/B) 후 커밋할 것.
//    (도메인 재생성이 회귀할 수 있으므로 번들은 검증 게이트를 거쳐 반영)

import { readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = "https://www.nhplug.com/openapi-docs";
const __dirname = dirname(fileURLToPath(import.meta.url));
const SPEC_DIR = join(__dirname, "..", "specs");

function existingDomains() {
  try {
    return readdirSync(SPEC_DIR)
      .filter((f) => f.endsWith(".openapi.json"))
      .map((f) => f.replace(/\.openapi\.json$/, ""));
  } catch {
    return [];
  }
}

async function fetchSpec(domain) {
  const url = `${BASE}/${domain}/openapi.json`;
  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    console.error(`  ✗ ${domain}: 네트워크 실패 — ${String(e)}`);
    return false;
  }
  if (!res.ok) {
    console.error(`  ✗ ${domain}: HTTP ${res.status}`);
    return false;
  }
  const text = await res.text();
  let opCount;
  try {
    const doc = JSON.parse(text);
    opCount = Object.keys(doc.paths ?? {}).filter((p) => !p.includes("#") && doc.paths[p].post).length;
  } catch {
    console.error(`  ✗ ${domain}: JSON 파싱 실패 — 저장하지 않음`);
    return false;
  }
  writeFileSync(join(SPEC_DIR, `${domain}.openapi.json`), text);
  console.log(`  ✓ ${domain}.openapi.json (${text.length.toLocaleString()} bytes · ${opCount} ops)`);
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const domains = args.length ? args : existingDomains();
  if (domains.length === 0) {
    console.error("specs/ 에 자산이 없습니다. 예: node scripts/sync_specs.mjs krstock gbstock");
    process.exit(1);
  }
  console.log(`도메인에서 스펙 동기화: ${domains.join(", ")}`);
  let ok = true;
  for (const d of domains) ok = (await fetchSpec(d)) && ok;
  console.log(
    ok
      ? "\n완료 ✅  ⚠️ 커밋 전 MCP call_api 로 라이브 검증(현재가·잔고 A/B)을 반드시 거치세요."
      : "\n일부 실패 ✗  네트워크·자산명·URL 을 확인하세요."
  );
  process.exit(ok ? 0 : 1);
}

main();
