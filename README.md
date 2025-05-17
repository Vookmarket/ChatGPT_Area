# 動物病院向けLINEチャットボット＋予約システム 要件定義書

## 1. 目的・背景

動物病院における電話対応負荷を軽減し、飼い主が 24 時間いつでも相談・予約できる環境を提供する。LINE 公式アカウント上のチャットボットが一般的な質問に回答しつつ、Model Context Protocol (MCP) を介して 15 分単位の予約を自動処理することで、来院機会の損失を防ぎ、顧客満足度を向上させる。

## 2. 適用範囲

本要件定義は、単一拠点の動物病院が導入する以下二つのサービスを対象とする。

* LLM API 活用 LINE チャットボットサービス
* MCP 連携予約システム（Google Workspace〈GAS＋Sheets〉実装）

## 3. 用語・略語

| 用語     | 定義                                                            |
| ------ | ------------------------------------------------------------- |
| Host   | LINE チャットボット（Google Apps Script）側プロセス                         |
| Client | Host 内で MCP Server と通信するモジュール                                 |
| Server | MCP Booking Server（Cloud Run）                                 |
| MCP    | Model Context Protocol。Host／Client／Server 3 層モデルの JSON‑RPC 仕様 |
| LLM    | Large Language Model。OpenAI GPT‑4o を使用                        |

## 4. 前提条件

1. 診察枠は **15 分固定**。
2. キャンセルは **いつでも無料**。ペナルティを課さない。
3. 初診・再診の区別はしない。
4. スタッフ用 UI は Google Sheets を直接編集。
5. 多拠点展開は対象外。

## 5. システム構成

```
┌────────────┐ ①Webhook
│ LINE Official │
│  Account      │
└────────────┘
        │
        ▼
[Google Apps Script] ②GPT‑4o API
   (Host + Client)   │
        │③JSON‑RPC (HTTP+SSE)
        ▼
[Cloud Run: MCP Server]
        │
        ▼
Google Sheets
  ├─ slots           予約枠 15 分刻み
  └─ reservations    予約レコード
```

## 6. 機能要件

### 6.1 チャットボット機能 (Host)

| No | 機能        | 詳細                                                  |
| -- | --------- | --------------------------------------------------- |
| 1  | 質問受付      | LINE Webhook で受信し、メッセージを解析                          |
| 2  | LLM 応答生成  | GPT‑4o API にプロンプト送信し、免責文とともに回答                      |
| 3  | 受診勧奨      | 重篤ワード検出時に来院を勧める                                     |
| 4  | 予約インテント検出 | few‑shot プロンプトで JSON {intent,date,time,petInfo} を抽出 |
| 5  | MCP 呼び出し  | listSlots / createBooking などを Client 経由で実行          |
| 6  | キャンセル・変更  | cancelBooking / updateBooking を実行                   |
| 7  | ロギング      | すべての会話と RPC を Sheets（logs）へ保存                       |

### 6.2 予約システム機能 (MCP Server)

| No | RPC 名         | 処理内容                    |
| -- | ------------- | ----------------------- |
| 1  | listSlots     | 指定日の空き枠一覧を返却            |
| 2  | createBooking | 予約作成、`reserved` インクリメント |
| 3  | cancelBooking | 予約取消、`reserved` デクリメント  |
| 4  | updateBooking | 予約変更（旧枠解放→新枠確保）         |

### 6.3 バッチ処理

* **枠生成バッチ** : 毎日 0:00、翌 30 日分の `slots` を再生成 (GAS トリガー)

## 7. データ構造

### 7.1 slots シート

| 列        | 説明               |
| -------- | ---------------- |
| slotId   | `YYYYMMDD-HHMM`  |
| date     | 予約日 (yyyy‑mm‑dd) |
| start    | HH\:MM           |
| end      | HH\:MM           |
| doctor   | 担当獣医師名           |
| capacity | 固定値 1            |
| reserved | 現予約数             |

### 7.2 reservations シート

| 列         | 説明                              |
| --------- | ------------------------------- |
| bookingId | 予約 ID (R‑ランダム)                  |
| slotId    | 紐付け先 slotId                     |
| ownerId   | LINE UserID                     |
| petName   | ペット名                            |
| species   | 種類（犬・猫等）                        |
| status    | confirmed / cancelled / updated |
| createdAt | ISO8601                         |

### 7.3 logs シート

\| time | userId | direction | payload |

## 8. 非機能要件

| 区分       | 要件                                               |
| -------- | ------------------------------------------------ |
| 応答性能     | Webhook 受信から 10 秒以内に返信                           |
| 可用性      | 99.9 % / 月 (Google 基盤依存)                         |
| セキュリティ   | TLS1.2+、Bearer トークン認証、API Key はスクリプトプロパティに格納     |
| スケーラビリティ | Apps Script / Sheets 日次クォータ 70 % を超えたら GCP 移行を検討 |
| バックアップ   | Sheets 版履歴 + 定期エクスポート (Drive)                    |

## 9. MCP インターフェース仕様

* **Transport** : HTTP POST + Server‑Sent Events
* **認証** : `Authorization: Bearer <token>`
* **エラーコード**

  * `SlotUnavailable` (‑32001)
  * `InvalidParams` (‑32602)
  * その他 JSON‑RPC 標準

## 10. 開発・運用環境

| 項目    | 内容                              |
| ----- | ------------------------------- |
| LLM   | OpenAI GPT‑4o API               |
| サーバ   | Cloud Run (Node 18, TypeScript) |
| スクリプト | Google Apps Script (V8)         |
| DB    | Google Sheets                   |
| 認証    | Google OAuth2, Bearer トークン      |

## 11. 移行・拡張計画

1. PoC 完了後、実トラフィック監視
2. クォータ上限逼迫時に Cloud Functions + Cloud SQL へ移行を検討
3. 多拠点対応が必要になった際、テナント ID を追加し MCP Server を拡張

## 12. スケジュール案

| フェーズ | 期間         | 主タスク                   |
| ---- | ---------- | ---------------------- |
| 要件確定 | 〜2025‑05‑末 | 本書合意                   |
| 開発   | 2025‑06    | MCP Server 実装 / GAS 開発 |
| テスト  | 2025‑07    | エンドツーエンド試験、スタッフ教育      |
| 本番運用 | 2025‑08    | リリース・監視開始              |

## 13. リスクと対策

| リスク                | 対策                    |
| ------------------ | --------------------- |
| Apps Script クォータ不足 | 監視し早期に GCP 移行判断       |
| LLM 誤回答            | 人手監視 + プロンプト改善 + 免責表示 |
| シート同時書込衝突          | `LockService` による排他制御 |

## 14. 承認

| 役割    | 氏名 | 日付 | 印 |
| ----- | -- | -- | - |
| 発注者   |    |    |   |
| 開発責任者 |    |    |   |

---

以上
