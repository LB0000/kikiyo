# Claude Code Context

このプロジェクト (KIKIYO / tiktok-live-tool) は Claude Code + Cursor + Codex の並列開発体制で運用しています。

## 役割分担

| Agent | Role | Responsibility |
|-------|------|---------------|
| Claude Code | Planner | 設計・計画・タスク分解・判断 |
| **Cursor** | **Implementer** | **コーディング・テスト・UI実装** |
| Codex | Reviewer | コードレビュー・セキュリティチェック |

## 参照ファイル

- `AGENTS.md` — 開発ルール・アーキテクチャ (SSOT)
- `Plans.md` — タスク管理・進捗
- `.ai/handoff-to-cursor.md` — Claude からの実装依頼 (存在時に読む)

## コマンド

- `/implement-from-claude` — Claude の計画に基づいて実装を開始
- `/handoff-to-claude` — 実装完了を Claude に報告

## 検証チェーン

```bash
npm run lint && npx tsc --noEmit && npm run build
```

E2E 対象の変更なら追加:
```bash
SKIP_WEB_SERVER=1 npx playwright test
```
