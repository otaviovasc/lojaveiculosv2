import { describe, expect, it } from "vitest";
import {
  findCiWorkflowViolations,
  findDependabotActionsViolations,
  requiredCiActions,
} from "./ci-workflow-rules.mjs";

describe("CI workflow security rules", () => {
  it("accepts least-privilege CI with immutable actions", () => {
    expect(findCiWorkflowViolations(validWorkflow())).toEqual([]);
  });

  it("rejects mutable action tags", () => {
    const source = validWorkflow().replace(
      requiredCiActions[1].ref,
      requiredCiActions[1].version,
    );

    expect(findCiWorkflowViolations(source)).toContain(
      "line 16: action must use a full commit SHA",
    );
  });

  it("rejects broad token permissions and persisted checkout credentials", () => {
    const source = validWorkflow()
      .replace("contents: read", "contents: write")
      .replace("persist-credentials: false", "persist-credentials: true");

    expect(findCiWorkflowViolations(source)).toEqual(
      expect.arrayContaining([
        "CI must grant only contents: read to GITHUB_TOKEN",
        "checkout credentials must not persist after the checkout step",
      ]),
    );
  });

  it("rejects job-level permission overrides", () => {
    const source = validWorkflow().replace(
      "    runs-on: ubuntu-24.04",
      "    permissions:\n      contents: write\n    runs-on: ubuntu-24.04",
    );

    expect(findCiWorkflowViolations(source)).toContain(
      "CI must grant only contents: read to GITHUB_TOKEN",
    );
  });

  it("requires a pinned runner and bounded timeout for every job", () => {
    const source = `${validWorkflow()}\n  unsafe:\n    runs-on: ubuntu-latest\n    steps: []\n`;

    expect(findCiWorkflowViolations(source)).toEqual(
      expect.arrayContaining([
        "every CI runner image must be pinned to ubuntu-24.04",
        "every CI job must set timeout-minutes between 1 and 30",
      ]),
    );
  });

  it("rejects privileged pull request execution", () => {
    const source = validWorkflow().replace(
      "pull_request:",
      "pull_request_target:",
    );

    expect(findCiWorkflowViolations(source)).toContain(
      "CI must not run untrusted code through pull_request_target",
    );
  });
});

describe("Dependabot GitHub Actions rules", () => {
  it("accepts weekly action updates from the workflow directory", () => {
    expect(
      findDependabotActionsViolations(`version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"`),
    ).toEqual([]);
  });

  it("rejects missing or disabled action updates", () => {
    expect(
      findDependabotActionsViolations(`version: 1
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: monthly`),
    ).toEqual([
      "Dependabot configuration must use version 2",
      "Dependabot must monitor the github-actions ecosystem",
    ]);
  });
});

function validWorkflow() {
  const [checkout, pnpm, node] = requiredCiActions;
  return `name: CI
on:
  pull_request:
permissions:
  contents: read
jobs:
  validate:
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - name: Checkout
        uses: ${checkout.name}@${checkout.ref} # ${checkout.version}
        with:
          persist-credentials: false
      - name: Setup pnpm
        uses: ${pnpm.name}@${pnpm.ref} # ${pnpm.version}
      - name: Setup Node
        uses: ${node.name}@${node.ref} # ${node.version}
      - name: Install
        run: pnpm install --frozen-lockfile
`;
}
