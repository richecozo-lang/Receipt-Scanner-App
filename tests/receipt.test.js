import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import handler from '../api/receipt.js';
test('authentication, validation and upstream handling', async () => {
  process.env.JINBA_API_KEY='dummy-api';
  process.env.JINBA_FLOW_UUID='dummy-flow';
  process.env.APP_ACCESS_PASSWORD='dummy-password';
  const original = globalThis.fetch;
  let calls=0;
  globalThis.fetch=async (url, options) => {
    calls++;
    assert.equal(options.headers.Authorization,'Bearer dummy-api');
    assert.equal(JSON.parse(options.body).mode,'sync');
    return {ok:true,json:async()=>({result:{output:'{}'},debug:'private'})};
  };
  async function run(overrides={}) {
    const req={method:'POST',headers:{authorization:'Bearer dummy-password','content-type':'application/json'},body:{input_base64:Buffer.from([255,216,255,0]).toString('base64')},...overrides};
    const res={setHeader(){},status(s){this.code=s;return this},json(v){this.body=v;return this}};
    await handler(req,res);return res;
  }
  try {
    assert.equal((await run({method:'GET'})).code,405);
    assert.equal((await run({headers:{authorization:'Bearer wrong'}})).code,401);
    assert.equal((await run({body:null})).code,400);
    assert.equal((await run({body:{input_base64:'YWJjZA=='}})).code,400);
    assert.equal((await run({body:{input_base64:'A'.repeat(4194308)}})).code,400);
    assert.equal(calls,0);
    const ok=await run();assert.equal(ok.code,200);assert.deepEqual(ok.body,{result:{output:'{}'}});
    globalThis.fetch=async()=>({ok:false,status:401});
    assert.equal((await run()).code,502);
    globalThis.fetch=async()=>{throw Object.assign(new Error('secret'),{name:'TimeoutError'})};
    const timeout=await run();assert.equal(timeout.code,504);assert.ok(!JSON.stringify(timeout.body).includes('secret'));
    delete process.env.APP_ACCESS_PASSWORD;
    assert.equal((await run()).code,503);
  } finally {globalThis.fetch=original;}
});
test('browser never contains Jinba credentials or interprets results as HTML',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.ok(!html.includes('API_KEY'));
  assert.ok(!html.includes('flow.jinba.io'));
  assert.ok(!html.includes('innerHTML'));
  assert.ok(html.includes("fetch('/api/receipt'"));
  const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.doesNotThrow(()=>new Function(script));
});
