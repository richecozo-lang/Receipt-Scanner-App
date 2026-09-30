import { createHash, timingSafeEqual } from 'node:crypto';
const MAX = 3 * 1024 * 1024;
const digest = value => createHash('sha256').update(value).digest();
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({error:'POSTのみ利用できます'});
  }
  const { JINBA_API_KEY, JINBA_FLOW_UUID, APP_ACCESS_PASSWORD } = process.env;
  if (!JINBA_API_KEY || !JINBA_FLOW_UUID || !APP_ACCESS_PASSWORD)
    return res.status(503).json({error:'サーバーの環境変数を設定してください'});
  const auth = req.headers.authorization;
  const supplied = typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!supplied || !timingSafeEqual(digest(supplied), digest(APP_ACCESS_PASSWORD)))
    return res.status(401).json({error:'利用パスワードを確認してください'});
  if (!req.headers['content-type']?.startsWith('application/json'))
    return res.status(415).json({error:'JSON形式で送信してください'});
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); }
    catch { return res.status(400).json({error:'JSON形式が不正です'}); }
  }
  const value = body?.input_base64;
  if (typeof value !== 'string' || !value.length || value.length > 4 * Math.ceil(MAX / 3) ||
      value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value))
    return res.status(400).json({error:'3MB以下の画像を送信してください'});
  const bytes = Buffer.from(value, 'base64');
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const png = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const webp = bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP';
  if (bytes.toString('base64') !== value || bytes.length > MAX || !(jpeg || png || webp))
    return res.status(400).json({error:'JPEG・PNG・WebP画像を送信してください'});
  try {
    const upstream = await fetch('https://flow.jinba.io/api/v1/flows/' + encodeURIComponent(JINBA_FLOW_UUID) + '/run', {
      method:'POST',
      headers:{Authorization:'Bearer ' + JINBA_API_KEY, 'Content-Type':'application/json'},
      body:JSON.stringify({args:[{name:'input_base64',value}],mode:'sync'}),
      signal:AbortSignal.timeout(55000),
      redirect:'error'
    });
    if (!upstream.ok) return res.status(502).json({error:'画像処理サービスでエラーが発生しました'});
    const data = await upstream.json();
    return res.status(200).json({result:data.result ?? {}});
  } catch (error) {
    return res.status(error.name === 'TimeoutError' ? 504 : 502).json({
      error:'画像処理サービスに接続できませんでした。記録先を確認してから再実行してください'
    });
  }
}
