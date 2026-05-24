export const ruleCatalog = [
  {
    id: "awi.untrusted-prompt-to-agent",
    title: "Untrusted GitHub event content reaches an agent prompt",
    remediation:
      "Avoid sending raw issue, pull request, review, discussion, or comment text directly to an agent. Gate execution on trusted labels or approvals, use read-only permissions, and provide the untrusted text as quoted context with explicit tool restrictions.",
    references: [
      "https://github.blog/ai-and-ml/generative-ai/under-the-hood-security-architecture-of-github-agentic-workflows/",
      "https://arxiv.org/abs/2605.07135"
    ]
  },
  {
    id: "awi.agent-output-to-privileged-step",
    title: "Agent output flows into a privileged follow-up step",
    remediation:
      "Do not execute or evaluate agent-generated text. Require a human review boundary before shell execution, GitHub API mutation, or privileged artifact handoff.",
    references: ["https://arxiv.org/abs/2605.07135"]
  }
] as const;

export const defaultAgentActionPatterns = [
  /anthropic.*claude.*code/i,
  /claude.*code.*action/i,
  /github.*copilot/i,
  /openai.*codex/i,
  /google.*gemini/i,
  /aider/i,
  /opencode/i,
  /cursor/i
];

export const agentCliPatterns = [
  /\bclaude\b/i,
  /\bcodex\b/i,
  /\bgemini\b/i,
  /\baider\b/i,
  /\bopencode\b/i,
  /\bcopilot\b/i
];

export const untrustedExpressionPatterns = [
  /github\.event\.issue\.(body|title)/i,
  /github\.event\.pull_request\.(body|title)/i,
  /github\.event\.comment\.body/i,
  /github\.event\.review\.body/i,
  /github\.event\.discussion\.(body|title)/i,
  /\$GITHUB_EVENT_PATH/i,
  /GITHUB_EVENT_PATH/i,
  /gh\s+(issue|pr|api|discussion)/i,
  /api\.github\.com\/repos\/.+\/(issues|pulls|comments|discussions)/i
];

export const promptInputNames = ["prompt", "instruction", "instructions", "task", "message", "body", "query", "input"];
