import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import adminRoutes from './admin.routes';

test('playback routes require authenticated ticket issuance and reject legacy admin query credentials', async () => {
  const previousSecret = process.env.JWT_SECRET;
  const previousKey = process.env.API_KEY;
  process.env.JWT_SECRET = 'route-test-signing-secret';
  process.env.API_KEY = 'route-test-api-key';
  const nativeFetch = globalThis.fetch;
  const upstreamRequests: string[] = [];
  const app = express();
  app.use(express.json());
  app.use('/admin', adminRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/admin/reels`;
  try {
    globalThis.fetch = (async (input: URL | string | Request) => {
      upstreamRequests.push(String(input));
      return new Response('video-bytes', { headers: { 'Content-Type': 'video/mp4' } });
    }) as typeof fetch;
    const url = 'https://cdn.pornreels.tv/example.mp4';
    const admin = jwt.sign(
      { type: 'admin', role: 'admin', sub: 'test-admin' },
      process.env.JWT_SECRET,
    );
    const denied = await nativeFetch(`${base}/playback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    assert.equal(denied.status, 401);

    const issued = await nativeFetch(`${base}/playback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': 'route-test-api-key',
        Authorization: `Bearer ${admin}`,
      },
      body: JSON.stringify({ url }),
    });
    assert.equal(issued.status, 200);
    const body = (await issued.json()) as { data: { url: string; ticket: string } };
    const params = new URLSearchParams(body.data);
    const stream = await nativeFetch(`${base}/stream?${params}`);
    assert.equal(stream.status, 200);
    assert.equal(await stream.text(), 'video-bytes');
    assert.deepEqual(upstreamRequests, [url]);
    assert.equal(stream.headers.get('cache-control'), 'private, no-store');

    const legacy = new URLSearchParams({ url, token: admin, apiKey: 'route-test-api-key' });
    assert.equal((await nativeFetch(`${base}/stream?${legacy}`)).status, 401);
    params.set('url', 'https://cdn.pornreels.tv/another.mp4');
    assert.equal((await nativeFetch(`${base}/stream?${params}`)).status, 401);
    assert.equal(upstreamRequests.length, 1);
    const adminAccess = await nativeFetch(`${base.replace('/reels', '')}/stats?appStyle=finance`, {
      headers: { 'api-key': 'route-test-api-key', Authorization: `Bearer ${body.data.ticket}` },
    });
    assert.equal(adminAccess.status, 401);
  } finally {
    globalThis.fetch = nativeFetch;
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
    if (previousKey === undefined) delete process.env.API_KEY;
    else process.env.API_KEY = previousKey;
  }
});
