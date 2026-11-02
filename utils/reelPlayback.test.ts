import assert from 'node:assert/strict';
import { test } from 'node:test';
import jwt from 'jsonwebtoken';
import { createPlaybackTicket, playbackTarget, verifyPlaybackTicket } from './reelPlayback';

test('playback tickets are short-lived and scoped to one video, not an admin session', () => {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'playback-test-secret';
  try {
    const target = playbackTarget('https://cdn.pornreels.tv/one.mp4');
    const ticket = createPlaybackTicket(target);
    assert.doesNotThrow(() => verifyPlaybackTicket(ticket, target));
    assert.throws(() =>
      verifyPlaybackTicket(ticket, playbackTarget('https://cdn.pornreels.tv/two.mp4')),
    );
    const claims = jwt.decode(ticket) as jwt.JwtPayload;
    assert.equal((claims.exp ?? 0) - (claims.iat ?? 0), 300);
    assert.equal(claims.type, 'reel-playback');
    assert.equal(claims.role, undefined);
    const admin = jwt.sign(
      { type: 'admin', role: 'admin', sub: 'admin-id' },
      process.env.JWT_SECRET,
    );
    assert.throws(() => verifyPlaybackTicket(admin, target));
    const expired = jwt.sign(
      { type: 'reel-playback', resource: claims.resource },
      process.env.JWT_SECRET,
      { audience: 'admin-reel-stream', expiresIn: -1 },
    );
    assert.throws(() => verifyPlaybackTicket(expired, target));
  } finally {
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
  }
});

test('playback rejects unapproved hosts, protocols, and URL credentials', () => {
  for (const url of [
    'http://cdn.pornreels.tv/one.mp4',
    'https://evil.example/one.mp4',
    'https://cdn.pornreels.tv.evil.example/one.mp4',
    'https://user:pass@cdn.pornreels.tv/one.mp4',
  ])
    assert.throws(() => playbackTarget(url));
});
