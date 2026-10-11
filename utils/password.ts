type BunPasswordApi = {
  hash: (password: string) => Promise<string>;
  verify: (password: string, hash: string) => Promise<boolean>;
};

function bunPassword(): BunPasswordApi {
  const runtime = globalThis as { Bun?: { password?: BunPasswordApi } };
  const password = runtime.Bun?.password;
  if (!password) {
    throw new Error('Bun password API is unavailable');
  }
  return password;
}

export async function hashPassword(password: string) {
  return bunPassword().hash(password);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bunPassword().verify(password, passwordHash);
}
