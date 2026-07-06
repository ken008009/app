## Create Git Branch, Commit, Push

### Overview
Prepare a new git branch, capture your work in a commit, and push it to the remote repository.

### Steps
1. **Check status**
   - Run `git status` to review pending changes.
2. **Create and switch branch**
   - Execute `git checkout -b <branch-name>` to create a descriptive branch.
3. **Stage changes**
   - Add specific files with `git add <path>` or stage everything with `git add .`.
4. **Commit work**
   - Commit with a clear message: `git commit -m "<message>"`.
5. **Push branch**
   - Push upstream: `git push -u origin <branch-name>`.
6. **Verify**
   - Confirm the branch exists on remote via `git status` or repository UI.

### Tips
- Commit message 格式：`<type>: <中文描述>`（如 `feat: 添加 Mine Tab`），描述使用简体中文，祈使语气。
- Replace placeholders (`<branch-name>`, `<message>`) with real values.
