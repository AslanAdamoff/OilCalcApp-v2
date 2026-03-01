---
description: Read project context before starting any work
---

# Start Workflow

// turbo-all

Before doing ANY work on this project, you MUST:

1. Read the project status file to understand what has already been done:

```
cat PROJECT_STATUS.md
```

1. Check the git log for recent changes:

```
git log --oneline -10
```

1. Only AFTER reading the status file, proceed with the user's request. Do NOT propose implementing features that are already marked as `[x]` completed in PROJECT_STATUS.md.

2. After completing work, UPDATE PROJECT_STATUS.md with:
   - Any new completed items (mark with `[x]`)
   - Any new files created
   - Updated "Last updated" date
   - Any changes to "Next Steps"
