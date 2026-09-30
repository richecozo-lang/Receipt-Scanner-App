# 領収書スキャナー
ブラウザ → /api/receipt → Jinba Flow → スプレッドシート

## 必須の準備
以前のHTMLに含まれていたJinba APIキーをJinba側で失効して再発行してください。過去のGit履歴・既存デプロイからはキーが消えません。旧公開ページは停止／更新してください。

## Vercelの設定
1. このリポジトリをImport。Framework PresetはOther、Build Command・Output Directoryは未指定。
2. Settings → Environment Variablesで以下を登録：
   - JINBA_API_KEY：再発行したキー
   - JINBA_FLOW_UUID：使用するフローUUID（Jinbaで確認）
   - APP_ACCESS_PASSWORD：32文字以上を目安とするランダムな利用パスワード
3. 使用環境（Production等）に設定し、デプロイ／再デプロイ。
4. HTTPSのVercel URLを開き、利用パスワードと領収書1枚で記録先まで確認。

キー・パスワードはGitHubやチャットに貼らず、Vercelへ直接入力してください。公開用環境変数には入れないでください。
GitHub PagesやHTMLを直接開く方法ではサーバーAPIが動きません。

## 動作と制限
JPEG・PNG・WebP、3MB以下。Jinba APIキーはサーバーの環境変数だけに保存します。
利用パスワードは入力欄からAuthorizationヘッダーへ渡し、localStorageやCookieには保存しません。Jinbaのキーとは別の値です。
設定不足・パスワード不一致ではJinbaを実行しません。画像・キー・パスワードはログ出力しません。結果表示はtextContentを使用します。
画像はJinbaへ送信され、フローの記録先に保存されます。
タイムアウト時も記録が完了している可能性があります。再送前に記録先を確認してください。
個人利用向けの共有パスワード方式で、ユーザー別ログイン・分散レート制限は未実装です。公開運用ではVercel Firewall等の制限も設定してください。

## 検証
Node.js 22以降で `npm test`。テストは模擬APIを使い、本物のJinbaへアクセスしません。
実接続は環境変数登録後に別途確認が必要です。
