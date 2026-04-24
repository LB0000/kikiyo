---
description: "Claude Code の計画に基づいて実装する"
---

# Implement from Claude Code

1. `.ai/handoff-to-cursor.md` を読んでください
2. `AGENTS.md` のプロジェクト規約を確認してください
3. 「計画」セクションのタスクを順番に実装してください
4. 「設計判断」に従ってください
5. 「テスト要件」に基づいてテストを書いてください
6. 全タスク完了後、以下の検証チェーンを実行してください:
   ```bash
   npm run lint && npx tsc --noEmit && npm run build
   ```
   E2E が対象の変更なら追加で:
   ```bash
   SKIP_WEB_SERVER=1 npx playwright test
   ```
7. `/handoff-to-claude` を実行して完了報告してください
