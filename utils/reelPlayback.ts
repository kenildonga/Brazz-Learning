import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { signingSecret } from './token';

const AUDIENCE = 'admin-reel-stream';

export function playbackTarget(raw: string): URL {
  const target = new URL(raw);
  if (
    target.protocol !== 'https:' ||
    target.host !== 'cdn.pornreels.tv' ||
    target.username ||
    target.password
  )
    throw new Error('Video host is not allowed');
  target.hash = '';
  return target;
}

function fingerprint(target: URL) {
  return createHash('sha256').update(target.href).digest('hex');
}

export function createPlaybackTicket(target: URL) {
  return jwt.sign({ type: 'reel-playback', resource: fingerprint(target) }, signingSecret(), {
    algorithm: 'HS256',
    audience: AUDIENCE,
    expiresIn: '5m',
  });
}

export function verifyPlaybackTicket(ticket: string, target: URL) {
  const decoded = jwt.verify(ticket, signingSecret(), {
    algorithms: ['HS256'],
    audience: AUDIENCE,
  });
  if (
    typeof decoded === 'string' ||
    decoded.type !== 'reel-playback' ||
    decoded.resource !== fingerprint(target)
  )
    throw new Error('Invalid playback ticket');
}
