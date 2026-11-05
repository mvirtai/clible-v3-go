---
name: security-review
description: Perform a focused security review for changes touching auth, input handling, queries, APIs, secrets, or dependencies.
---

# Security Review

Use this skill when code changes touch authentication, authorization, input parsing, file handling, queries, network or API boundaries, secrets, or dependencies.

## Review focus

Check the highest-value risks first:
- auth or authz mistakes
- missing validation or unsafe parsing
- injection risks
- secret exposure
- unsafe file or path handling
- resource exhaustion or unbounded memory use
- dependency vulnerabilities
- sensitive data leakage in logs or responses

## Process

1. Scope the review to the changed code and its boundaries.
2. Use repo-native tooling first. Examples:
   - Go: `govulncheck`, `gosec`
   - JS or TS: `npm audit` or project scanners
   - Rust: `cargo audit`
3. Verify security-relevant assumptions in code, not just scanner output.
4. Fix critical or high-severity issues that are clearly in scope when possible.
5. Summarize:
   - findings
   - severity
   - fixes made
   - residual risk or follow-up

## Rules

- Do not claim the code is "secure"; state the scope reviewed.
- If the repo has a security report convention, write or update it there.
- Do not publicly document unpatched exploitable details unless the user explicitly asks.
