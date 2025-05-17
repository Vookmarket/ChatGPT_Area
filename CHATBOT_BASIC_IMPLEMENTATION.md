# チャットボット基本実装ドキュメント

本書では、動物病院向けLINEチャットボット＋予約システムにおける「チャットボットの基本実装」について、要件と開発手順をまとめます。

## 1. 詳細要件

### 1.1 機能要件（Host側）
- LINE Webhook経由でメッセージを受信し、ユーザーIDと内容を取得する
- GPT‑4o APIを呼び出して回答を生成し、免責文を添えて返信する
- "重篤ワード" が含まれる場合は来院を勧める
- few‑shotプロンプトで予約インテント(JSON `{intent,date,time,petInfo}`)を抽出する
- MCP Server を呼び出し `listSlots` や `createBooking` を実行する
- `cancelBooking` や `updateBooking` の処理も行う
- 会話内容とRPC結果を Google Sheets の `logs` シートに保存する

### 1.2 非機能要件（抜粋）
- Webhook 受信から **10 秒以内** に応答する
- 基本的なセキュリティは **Bearer トークン認証** で実装する

### 1.3 データシート構造
- **slots** シート: `slotId` / `date` / `start` / `end` / `doctor` / `capacity` / `reserved`
- **reservations** シート: `bookingId` / `slotId` / `ownerId` / `petName` / `species` / `status` / `createdAt`
- **logs** シート: `time` / `userId` / `direction` / `payload`

## 2. 開発手順

### 2.1 環境準備
1. LINE公式アカウントを新規作成し、チャネルシークレットとアクセストークンを控える
2. Google Sheetsに `slots`・`reservations`・`logs` の3シートを用意し、URLを控える
3. Google Apps ScriptプロジェクトをV8ランタイムで作成し、トークンやシートIDをスクリプトプロパティに保存する
4. Webアプリとしてデプロイし、URLをLINEのWebhookエンドポイントに登録する
5. 必要に応じて時間主導トリガーを設定し、予約枠自動生成関数を実行する
6. テストメッセージ送信でWebhook動作と `logs` 書き込みを確認する

### 2.2 チャットボット実装
1. Webhookハンドラを実装してメッセージ内容を取得する
2. GPT‑4o APIからの回答に免責文を付与して返信する
3. 会話内容とAPI結果を `logs` シートへ保存する
4. 重篤ワード判定や予約インテント抽出ロジックを組み込む
5. MCP Server を利用して `listSlots` / `createBooking` などを呼び出す
6. `cancelBooking` や `updateBooking` の処理をハンドラ内で行う

### 2.3 予約API実装以降
1. MCP Server 側に `listSlots`・`createBooking`・`cancelBooking` などのエンドポイントを実装
2. UIテストとして自分のLINEで動作確認し、予約データがSheetsに保存されることを検証
3. 毎日0時に翌30日分の `slots` を再生成するトリガーを設定
4. 使い方と運用上の注意点を README へ追記して簡易マニュアルとする

---
以上が「チャットボットの基本実装」に関する要件と開発手順です。これらを順に実施することで、LINE上で相談受付と予約管理を行う基本機能を備えたチャットボットを構築できます。
