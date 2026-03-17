import { runAuthAgent } from "./agents/auth";
import { runScheduleAgent } from "./agents/schedule";
import { runDocumentAgent } from "./agents/document";
import { runChatAgent } from "./agents/chat";

export interface QAResult {
  domain: string;
  result: string;
}

const DOMAIN_MAP: Record<string, () => Promise<QAResult>> = {
  auth: runAuthAgent,
  schedule: runScheduleAgent,
  document: runDocumentAgent,
  chat: runChatAgent,
};

const DOMAIN_LABELS: Record<string, string> = {
  auth:     "🔐 Auth     (인증·토큰)",
  schedule: "📅 Schedule (스케줄 CRUD)",
  document: "📄 Document (문서·S3 업로드)",
  chat:     "💬 Chat     (채팅·STOMP)",
};

function printUsage() {
  console.log(`
Flowre QA 도메인 에이전트

사용법:
  npx ts-node index.ts <도메인>

도메인:
  auth       ${DOMAIN_LABELS.auth}
  schedule   ${DOMAIN_LABELS.schedule}
  document   ${DOMAIN_LABELS.document}
  chat       ${DOMAIN_LABELS.chat}
  all        모든 도메인 순차 실행
  `);
}

function printBanner(domain: string) {
  const width = 56;
  const bar = "─".repeat(width);
  console.log(`\n┌${bar}┐`);
  console.log(`│  Flowre QA Agent — ${DOMAIN_LABELS[domain] ?? domain}`.padEnd(width + 1) + "│");
  console.log(`└${bar}┘\n`);
}

function printSummary(results: QAResult[], elapsedMs: number) {
  const secs = (elapsedMs / 1000).toFixed(1);
  const bar = "═".repeat(56);

  console.log(`\n╔${bar}╗`);
  console.log(`║  QA 에이전트 전체 실행 결과                            ║`);
  console.log(`╚${bar}╝`);

  results.forEach(({ domain, result }) => {
    const label = DOMAIN_LABELS[domain.toLowerCase()] ?? domain;
    const hasError =
      result.toLowerCase().includes("실패") ||
      result.toLowerCase().includes("fail") ||
      result.toLowerCase().includes("error");
    const icon = hasError ? "❌" : "✅";
    console.log(`\n${icon}  ${label}`);

    // 결과 첫 5줄만 요약 출력
    result
      .split("\n")
      .slice(0, 5)
      .forEach((line) => console.log(`   ${line}`));
  });

  console.log(`\n⏱  총 실행 시간: ${secs}초`);
  console.log(`📊 실행 도메인: ${results.length}개\n`);
}

async function main() {
  const domain = process.argv[2]?.toLowerCase();

  if (!domain) {
    printUsage();
    process.exit(0);
  }

  const startTime = Date.now();

  if (domain === "all") {
    // 전체 도메인 순차 실행
    const results: QAResult[] = [];
    const domains = ["auth", "schedule", "document", "chat"];

    for (const d of domains) {
      printBanner(d);
      const result = await DOMAIN_MAP[d]();
      results.push(result);
    }

    printSummary(results, Date.now() - startTime);
  } else if (domain in DOMAIN_MAP) {
    // 단일 도메인 실행
    printBanner(domain);
    const result = await DOMAIN_MAP[domain]();

    console.log("\n" + "─".repeat(56));
    console.log(`✅  ${DOMAIN_LABELS[domain]} 완료`);
    console.log("─".repeat(56));
    console.log(result.result);
  } else {
    console.error(`❌ 알 수 없는 도메인: '${domain}'\n`);
    printUsage();
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("에이전트 실행 중 오류:", err);
  process.exit(1);
});
