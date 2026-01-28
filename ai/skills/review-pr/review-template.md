# Review Output Template

Use this structure for all PR reviews.

## Output Format

```markdown
## Context

**PR:** #<number> - <title>
**Author:** <author>
**Base:** <baseRefName> <- **Head:** <headRefName>
**Files changed:** <count> (+<additions>/-<deletions>)
**Review type:** <Direct Reviewer | Team Reviewer | Codeowner>

### Goals
[What this PR is trying to accomplish - from description and linked issues]

### Linked Issues
- #<issue> - <title>: <brief context>

---

## Strengths

[What's well done - be specific with file:line references]

- <file>:<line> - <what's good and why>

---

## Issues

### Critical (Must Fix)
[Bugs, security issues, data loss risks, broken functionality]

1. **<Issue title>**
   - File: `<file>:<line>`
   - What: <description of the problem>
   - Why: <why this matters>
   - Fix: <how to fix it>

### Important (Should Fix)
[Architecture problems, missing features, poor error handling, test gaps]

1. **<Issue title>**
   - File: `<file>:<line>`
   - What: <description>
   - Why: <impact>
   - Fix: <suggestion>

### Minor (Nice to Have)
[Code style, optimization opportunities, documentation improvements]

1. **<Issue title>**
   - File: `<file>:<line>`
   - What: <description>

---

## Codeowner Section
<!-- Only include this section for codeowner reviews -->

**Owned files changed:**
- `<file>` - <summary of changes>

**Implications for owned code:**
[Analysis of how changes affect the owned codebase]

**Backward compatibility:**
[Any concerns about breaking changes]

---

## Recommendations

[Improvements beyond fixing issues - architecture, patterns, future considerations]

---

## Assessment

**Ready to approve?** [Yes / No / With fixes]

**Reasoning:** [1-2 sentence technical assessment]

---

## Existing Feedback
<!-- Note any existing comments that were considered -->
[Summary of existing review comments you've accounted for]
```

## Review Checklist

Use this checklist internally when reviewing:

### Code Quality
- [ ] Clean separation of concerns?
- [ ] Proper error handling?
- [ ] Type safety (if applicable)?
- [ ] DRY principle followed?
- [ ] Edge cases handled?

### Architecture
- [ ] Sound design decisions?
- [ ] Scalability considerations?
- [ ] Performance implications?
- [ ] Security concerns?

### Testing
- [ ] Tests actually test logic (not just mocks)?
- [ ] Edge cases covered?
- [ ] Integration tests where needed?
- [ ] All tests passing?

### Requirements
- [ ] All requirements from linked issues met?
- [ ] Implementation matches spec?
- [ ] No scope creep?
- [ ] Breaking changes documented?

### Production Readiness
- [ ] Migration strategy (if schema changes)?
- [ ] Backward compatibility considered?
- [ ] Documentation complete?
- [ ] No obvious bugs?

## Review Rules

**DO:**
- Categorize by actual severity (not everything is Critical)
- Be specific (file:line, not vague)
- Explain WHY issues matter
- Acknowledge strengths
- Give a clear verdict
- Consider existing review comments

**DON'T:**
- Say "looks good" without actually checking
- Mark nitpicks as Critical
- Give feedback on code you didn't review
- Be vague ("improve error handling" - say WHERE and HOW)
- Avoid giving a clear verdict
- Duplicate feedback already given by others
