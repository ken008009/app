# Claude Command: Commit

This command helps you create well-formatted commits with conventional commit messages.

**Language**: The description after `<type>:` MUST be written in **Simplified Chinese (简体中文)**. Keep the type prefix in English (e.g. `feat: 添加用户认证`).

## Usage

To create a commit, just type:
```
/commit
```

Or with options:
```
/commit --no-verify
```

## What This Command Does

1. Checks which files are staged with `git status`
2. If 0 files are staged, automatically adds all modified and new files with `git add`
3. Unless specified with `--no-verify`, runs pre-commit checks on staged files:
   - `yarn lint:staged` to check lint rules (fast, only staged .ts/.tsx files)
   - `yarn tsc:staged` to check TypeScript errors
4. If checks fail, asks whether to proceed or fix issues first
5. Performs a `git diff` to understand what changes are being committed
6. Analyzes the diff to determine if multiple distinct logical changes are present
7. If multiple distinct changes are detected, suggests breaking the commit into multiple smaller commits
8. For each commit (or the single commit if not split), creates a commit message using conventional commit format

## Best Practices for Commits

- **Verify before committing**: Ensure code is linted, builds correctly, and documentation is updated
- **Atomic commits**: Each commit should contain related changes that serve a single purpose
- **Split large changes**: If changes touch multiple concerns, split them into separate commits
- **Conventional commit format**: Use the format `<type>: <description>` where type is one of:
  - `feat`: A new feature
  - `fix`: A bug fix
  - `docs`: Documentation changes
  - `style`: Code style changes (formatting, etc)
  - `refactor`: Code changes that neither fix bugs nor add features
  - `perf`: Performance improvements
  - `test`: Adding or fixing tests
  - `chore`: Changes to the build process, tools, etc.
- **Simplified Chinese description**: Write the message body in 简体中文 (e.g., `feat: 添加用户认证` not `feat: add user auth`)
- **Present tense, imperative mood**: Use command-style Chinese (e.g., "添加" not "添加了")
- **Concise first line**: Keep the first line under 72 characters
  - `feat`: New feature
  - `fix`: Bug fix
  - `docs`: Documentation
  - `style`: Formatting/style
  - `refactor`: Code refactoring
  - `perf`: Performance improvements
  - `test`: Tests
  - `chore`: Tooling, configuration
  - `ci`: CI/CD improvements
  - `revert`: Reverting changes
  - `test`: Add a failing test
  - `fix`: Fix compiler/linter warnings
  - `fix`: Fix security issues
  - `chore`: Add or update contributors
  - `refactor`: Move or rename resources
  - `refactor`: Make architectural changes
  - `chore`: Merge branches
  - `chore`: Add or update compiled files or packages
  - `chore`: Add a dependency
  - `chore`: Remove a dependency
  - `chore`: Add or update seed files
  - `chore`: Improve developer experience
  - `feat`: Add or update code related to multithreading or concurrency
  - `feat`: Improve SEO
  - `feat`: Add or update types
  - `feat`: Add or update text and literals
  - `feat`: Internationalization and localization
  - `feat`: Add or update business logic
  - `feat`: Work on responsive design
  - `feat`: Improve user experience / usability
  - `fix`: Simple fix for a non-critical issue
  - `fix`: Catch errors
  - `fix`: Update code due to external API changes
  - `fix`: Remove code or files
  - `style`: Improve structure/format of the code
  - `fix`: Critical hotfix
  - `chore`: Begin a project
  - `chore`: Release/Version tags
  - `wip`: Work in progress
  - `fix`: Fix CI build
  - `chore`: Pin dependencies to specific versions
  - `ci`: Add or update CI build system
  - `feat`: Add or update analytics or tracking code
  - `fix`: Fix typos
  - `revert`: Revert changes
  - `chore`: Add or update license
  - `feat`: Introduce breaking changes
  - `assets`: Add or update assets
  - `feat`: Improve accessibility
  - `docs`: Add or update comments in source code
  - `db`: Perform database related changes
  - `feat`: Add or update logs
  - `fix`: Remove logs
  - `test`: Mock things
  - `feat`: Add or update an easter egg
  - `chore`: Add or update .gitignore file
  - `test`: Add or update snapshots
  - `experiment`: Perform experiments
  - `feat`: Add, update, or remove feature flags
  - `ui`: Add or update animations and transitions
  - `refactor`: Remove dead code
  - `feat`: Add or update code related to validation
  - `feat`: Improve offline support

## Guidelines for Splitting Commits

When analyzing the diff, consider splitting commits based on these criteria:

1. **Different concerns**: Changes to unrelated parts of the codebase
2. **Different types of changes**: Mixing features, fixes, refactoring, etc.
3. **File patterns**: Changes to different types of files (e.g., source code vs documentation)
4. **Logical grouping**: Changes that would be easier to understand or review separately
5. **Size**: Very large changes that would be clearer if broken down

## Examples

Good commit messages (简体中文):
- feat: 添加用户认证系统
- fix: 修复渲染进程内存泄漏
- docs: 更新 API 文档新增端点说明
- refactor: 简化解析器错误处理逻辑
- fix: 修复组件文件 lint 警告
- chore: 改进开发者工具链配置
- feat: 实现交易校验业务逻辑
- fix: 修复头部样式不一致问题
- fix: 修复认证流程严重安全漏洞
- style: 重组组件结构提升可读性
- fix: 移除已废弃的旧代码
- feat: 添加用户注册表单输入校验
- fix: 修复 CI 流水线测试失败
- feat: 添加用户行为分析埋点
- fix: 加强认证密码强度要求
- feat: 改进表单无障碍读屏支持

Example of splitting commits:
- First commit: feat: 添加 solc 新版本类型定义
- Second commit: docs: 更新 solc 新版本文档
- Third commit: chore: 更新 package.json 依赖
- Fourth commit: feat: 添加新 API 端点类型定义
- Fifth commit: feat: 改进 worker 线程并发处理
- Sixth commit: fix: 修复新代码 lint 问题
- Seventh commit: test: 添加 solc 新版本单元测试
- Eighth commit: fix: 更新存在安全漏洞的依赖

## Command Options

- `--no-verify`: Skip running the pre-commit checks (lint:staged, tsc:staged)

## Important Notes

- By default, pre-commit checks (`yarn lint:staged` and `yarn tsc:staged`) will run on staged files
- These checks are fast:
  - `lint:staged`: Lints only staged .ts/.tsx files using oxlint
  - `tsc:staged`: Full project type-check using tsgo (10x faster than standard tsc)
- If checks fail, you'll be asked if you want to proceed with the commit anyway or fix the issues first
- If specific files are already staged, the command will only commit those files
- If no files are staged, it will automatically stage all modified and new files
- The commit message will be constructed based on the changes detected
- Before committing, the command will review the diff to identify if multiple commits would be more appropriate
- If suggesting multiple commits, it will help you stage and commit the changes separately
- Always reviews the commit diff to ensure the message matches the changes
