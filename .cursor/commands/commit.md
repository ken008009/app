# Commit 提交

帮助创建格式规范的 commit，**commit message 描述部分使用简体中文**。

## 用法

```
/commit
```

或跳过 pre-commit 检查：

```
/commit --no-verify
```

## 执行步骤

1. `git status` 查看暂存区
2. 若无暂存文件，自动 `git add` 所有修改和新文件
3. 除非 `--no-verify`，依次运行：
   - `yarn lint:staged`
   - `yarn tsc:staged`
4. 检查失败时询问是否先修复再继续
5. `git diff` 分析变更内容
6. 若存在多个独立逻辑改动，建议拆分为多个 commit
7. 按 Conventional Commits 格式生成**中文** commit message 并提交

## Commit Message 规范

- 格式：`<type>: <中文描述>`
- type 保持英文小写：`feat` `fix` `refactor` `perf` `chore` `docs` `test` 等
- 描述使用简体中文，祈使语气，第一行 ≤ 72 字符
- 不含 AI 署名

### 示例

```
feat: 添加 Mine Tab 路由与页面
fix: 修复底部 Tab 在 Android 上的点击穿透
refactor: 抽取 Tab 路由公共配置
chore: 调整 Android 构建脚本权限
```

### 拆分示例

- `feat: 添加 tabMine 路由枚举`
- `feat: 注册 Mine Tab 页面组件`
- `chore: 更新 locale 翻译 key`

## 选项

- `--no-verify`：跳过 `lint:staged` 和 `tsc:staged`

## 注意

- 默认对暂存文件跑 pre-commit 检查，失败勿强行提交
- 提交前核对 diff，确保 message 与变更一致
- 已暂存文件则只提交暂存内容；未暂存则自动 stage 全部改动
