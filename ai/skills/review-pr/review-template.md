# Review Comment Guidelines

Guidelines for writing PR review comments. Used internally during Step 5-6 of the review skill.

## Comment Quality Rules

**DO:**
- Be specific — reference exact file:line, function names, variable names
- Explain WHY something matters, not just what's wrong
- Suggest a concrete fix or ask a clarifying question
- Prefix minor style/naming issues with "nit:"
- Keep comments concise — one paragraph max unless the issue is complex
- Consider existing review comments to avoid duplicating feedback
- Acknowledge strengths in the review body when warranted

**DON'T:**
- Be vague ("improve error handling" — say WHERE and HOW)
- Mark nitpicks as critical
- Comment on code you didn't actually review or understand
- Be unnecessarily harsh — ask questions when intent is unclear
- Add comments that don't require action or response

## Severity Levels

Use these consistently:

| Severity | When to use | Examples |
|----------|-------------|---------|
| **Critical** | Bugs, security issues, data loss, broken functionality | Missing auth check, SQL injection, race condition causing data corruption |
| **Important** | Missing validation, breaking changes, test gaps, wrong behavior | Removed error code clients depend on, unhandled error path |
| **Nit** | Style, naming, docs, minor improvements | Stale docstring, could use a helper function |

## Review Event Selection

- **APPROVE** — No critical or important issues. Nits only, or no comments at all.
- **COMMENT** — Has important issues or questions that need answers, but not blocking.
- **REQUEST_CHANGES** — Has critical issues that must be fixed before merge.

## Internal Checklist

Use this internally when analyzing the PR (don't include in output):

### Code Quality
- Clean separation of concerns?
- Proper error handling?
- Type safety (if applicable)?
- DRY principle followed?
- Edge cases handled?

### Architecture
- Sound design decisions?
- Scalability considerations?
- Performance implications?
- Security concerns?

### Testing
- Tests actually test logic (not just mocks)?
- Edge cases covered?
- Integration tests where needed?

### Production Readiness
- Migration strategy (if schema changes)?
- Backward compatibility considered?
- Breaking changes documented?
