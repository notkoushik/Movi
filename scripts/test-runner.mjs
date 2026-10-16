import { spawn } from "node:child_process";

const suites = [
  { name: "TypeScript Strict Typecheck", cmd: "npm", args: ["run", "typecheck"] },
  { name: "PostgreSQL & Fastify Backend API (26 tests)", cmd: "npm", args: ["run", "test:api"] },
  { name: "Full Atelier Customer & Admin E2E (8 flows)", cmd: "npm", args: ["run", "test:e2e"] },
];

console.log("\n" + "=".repeat(70));
console.log("  ⚡ MOVI ATELIER MASTER TEST SUITE RUNNER");
console.log("=".repeat(70) + "\n");

function runCommand(suite) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    console.log(`▶ Executing: ${suite.name}...`);

    const isWindows = process.platform === "win32";
    const executable = isWindows && suite.cmd === "npm" ? "npm.cmd" : suite.cmd;

    const child = spawn(executable, suite.args, {
      stdio: "inherit",
      shell: isWindows,
    });

    child.on("close", (code) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      resolve({
        name: suite.name,
        passed: code === 0,
        code,
        elapsed: `${elapsed}s`,
      });
    });

    child.on("error", (err) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      resolve({
        name: suite.name,
        passed: false,
        error: err.message,
        elapsed: `${elapsed}s`,
      });
    });
  });
}

async function main() {
  const overallStart = Date.now();
  const results = [];

  for (const suite of suites) {
    const res = await runCommand(suite);
    results.push(res);
    console.log("");
  }

  const totalElapsed = ((Date.now() - overallStart) / 1000).toFixed(2);

  console.log("=".repeat(70));
  console.log("  📊 MASTER TEST RESULTS SUMMARY");
  console.log("=".repeat(70));

  let allPassed = true;
  for (const r of results) {
    const status = r.passed ? "✔ PASS" : "✖ FAIL";
    if (!r.passed) allPassed = false;
    console.log(`  ${status.padEnd(8)} | ${r.elapsed.padStart(7)} | ${r.name}`);
  }

  console.log("-".repeat(70));
  console.log(`  Total Test Time: ${totalElapsed}s`);
  console.log(`  Status: ${allPassed ? "✨ ALL SUITES PASSED (100% HEALTHY)" : "⚠️ SUITE FAILURES DETECTED"}`);
  console.log("=".repeat(70) + "\n");

  if (!allPassed) {
    process.exit(1);
  }
}

main();
