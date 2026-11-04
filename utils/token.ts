export function signingSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret?.trim() || secret === 'default_secret' || secret === 'your_jwt_secret_key_here') {
    throw new Error('Set JWT_SECRET to a private signing secret');
  }
  return secret;
}
