// @vitest-environment node
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

const workflow = readFileSync(
  new URL("../.github/workflows/create-dev-pr.yml", import.meta.url),
  "utf8",
);
const script = workflow
  .slice(workflow.indexOf("          set -euo pipefail"))
  .split("\n")
  .map((line) => line.replace(/^ {10}/, ""))
  .join("\n");

function run(event: string, mode = "current") {
  const fixture = `
gh() {
  echo "gh $*" >&2
  if [[ "$1" == api ]]; then
    if [[ "$2" == */git/ref/heads/dev ]]; then
      if [[ "$MODE" == stale ]]; then echo newer; else echo tested; fi
    elif [[ "$*" == *ahead_by* ]]; then echo 1
    elif [[ "$MODE" == unchanged ]]; then echo 0
    else echo 1; fi
  elif [[ "$2" == list ]]; then echo 2
  elif [[ "$2" == view ]]; then
    if [[ "$MODE" == changed ]]; then head=newer; else head=tested; fi
    if [[ "$MODE" == closed ]]; then state=CLOSED; else state=OPEN; fi
    if [[ "$MODE" == fork ]]; then fork=true; else fork=false; fi
    if [[ "$MODE" == unstable ]]; then merge_state=UNSTABLE; else merge_state=CLEAN; fi
    printf '{"state":"%s","baseRefName":"main","headRefName":"dev","headRefOid":"%s","isCrossRepository":%s,"mergeStateStatus":"%s"}' "$state" "$head" "$fork" "$merge_state"
  elif [[ "$2" == merge ]]; then
    if [[ "$MODE" == policy ]]; then echo "permission denied" >&2; return 1; fi
    echo "merge requested"
  fi
}
`;
  return spawnSync("bash", ["-c", fixture + script], {
    encoding: "utf8",
    env: {
      ...process.env,
      CI_EVENT: event,
      CI_PR_NUMBER: "2",
      GH_REPO: "example/blog",
      TESTED_SHA: "tested",
      MODE: mode,
    },
  });
}
it("creates or reuses a PR after push CI without requesting a merge", () => {
  const result = run("push");
  expect(result.status).toBe(0);
  expect(result.stderr).toContain("gh pr list");
  expect(result.stderr).not.toContain("gh pr merge");
  expect(result.stdout).toContain("ready for PR CI");
});
it("requests a merge of the tested head only after successful PR CI", () => {
  const result = run("pull_request");
  expect(result.status).toBe(0);
  expect(result.stderr).toContain(
    "gh pr merge 2 --repo example/blog --auto --merge --match-head-commit tested",
  );
  expect(result.stderr).not.toContain("gh pr create");
});
it.each(["stale", "changed", "closed", "fork"])(
  "never merges a %s PR or run",
  (mode) => {
    const result = run("pull_request", mode);
    expect(result.status).toBe(0);
    expect(result.stderr).not.toContain("gh pr merge");
  },
);
it("skips synchronization pushes without content changes", () => {
  const result = run("push", "unchanged");
  expect(result.status).toBe(0);
  expect(result.stderr).not.toContain("gh pr list");
});
it("keeps policy errors visible without retries or bypasses", () => {
  const result = run("pull_request", "policy");
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("permission denied");
  expect(result.stderr.match(/gh pr merge/g)).toHaveLength(1);
});
it("accepts only successful same-repository dev push or dev-to-main PR CI", () => {
  expect(workflow).toContain(
    "github.event.workflow_run.conclusion == 'success'",
  );
  expect(workflow).toContain(
    "github.event.workflow_run.pull_requests[0].base.ref == 'main'",
  );
  expect(workflow).toContain(
    "github.event.workflow_run.pull_requests[0].head.ref == 'dev'",
  );
  expect(workflow).toContain(
    "github.event.workflow_run.head_repository.full_name == github.repository",
  );
});

it("reports remaining non-passing statuses without calling auto-merge", () => {
  const result = run("pull_request", "unstable");
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("gh pr checks");
  expect(result.stderr).not.toContain("gh pr merge");
});
