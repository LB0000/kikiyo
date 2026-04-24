---
description: "実装完了を Claude Code に報告する"
---

# Handoff to Claude Code

`.ai/handoff-from-cursor.md` に以下を書き込んでください:

```markdown
---
type: implementation_complete
from: cursor
created_at: {現在日時 ISO8601}
---

# 実装完了報告

## 完了タスク
- [x] {タスク1}
- [x] {タスク2}

## 変更ファイル
- {ファイル1}: {変更内容}
- {ファイル2}: {変更内容}

## 検証結果
- `npm run lint`: PASS / FAIL
- `npx tsc --noEmit`: PASS / FAIL
- `npm run build`: PASS / FAIL
- E2E (該当時): PASS / FAIL / SKIP

## 懸念事項・未完了
- {あれば記載}
```

書き込み後、Claude Code で `/cursor-bridge pickup` を実行してもらってください。
