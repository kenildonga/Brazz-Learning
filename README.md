# Brazz API

Run with Bun. Copy `.env.example` to `.env`, supply a private `JWT_SECRET` and `API_KEY`, then use `bun run dev`. Startup rejects missing or example signing secrets. The browser API key is public configuration, not device or administrator authentication.

## Validation

```sh
bun run typecheck
bun test
bun run build
```

Tests use isolated model stubs rather than a live database; route tests bind a temporary loopback port. They cover session revocation, device ownership and current permissions, join verification, atomic preferences/settings, content-reference locking, ads, finance sources, stream failures, bootstrap validation, and relocated legal-page bundles.

## Rollout

Deploy API, admin, and website together. Existing admin tokens lack the new session version and require a fresh login. Password changes and `seed:admin:reset` revoke all earlier admin tokens. No existing administrator passwords are changed by deployment; rotate any password that came from the old example or fallback.

Content writes do not use MongoDB transactions and work on a standalone server, a replica set, or a sharded cluster. Deletion is rejected while videos still use a category or person. To prevent a racing video save from referencing a row as it is deleted, both sides take a 30-second lease on that row (`referenceLeaseUntil` for saves, `deleteLeaseUntil` for deletes); neither can start while the other is live, and a crashed request's lease expires on its own. A delete that meets a live save lease returns 409 and can be retried after the lease ends.

Mongoose creates the new creation-date and category/person compound indexes from the schemas. Verify their creation and query plans in the target database before increasing traffic. This change does not drop existing indexes or rewrite stored records.

## Device registration

`POST /api/v1/device/register` creates or updates the device identified by `deviceUniqueId` and returns a device token valid for three hours. A new `appUniqueId` resets the device to finance mode unless the same request carries a valid `deepToken` from `POST /api/v1/device/deep-link`, which sets adult mode. The token carries the device's mode, so an admin mode change applies when the app next registers.

## Finance lessons

Finance video create/update requests require `playbackUrl`, an HTTPS media URL. The admin editor includes this field; mobile video detail returns it in the existing `m3u8` field. Existing records without media return an explicit unavailable response instead of playing a demo video. Add real URLs through the admin before making these lessons available to users. No real lesson media was supplied with this repository.

`seed:finance` supplies sample metadata only and preserves any playback URLs already entered. It does not manufacture media or overwrite a real source with a demo.

## Adult playback

Adult video detail returns a signed embed-players playlist URL in `data.video.m3u8`, built from the video's `scrappedSlug` without contacting the upstream site:

```
<PLAYER_BASE_URL>/hls/<token>/index.m3u8
```

The token is an HS256 JWT (`site: "pornhd3x"`, `slug`, `purpose: "hls"`, `iat`, `exp`) signed with `PLAYBACK_JWT_SECRET`. embed-players verifies it with the same secret and returns the stored playlist; segments load directly from the CDN, so the token only gates the playlist request. The URL is valid for `PLAYBACK_TOKEN_TTL_SECONDS` (default four hours, at most twelve); clients should request video detail again for a fresh URL after it expires. Set `PLAYER_BASE_URL` (HTTPS, except localhost) and `PLAYBACK_JWT_SECRET` (32+ characters, different from `JWT_SECRET`, identical in embed-players). Without them, adult video detail returns 500 naming the missing variable; finance playback is unaffected. Videos without a `scrappedSlug` return `m3u8: null`.

## Bootstrap and build

Set a unique `ADMIN_PASSWORD` of at least 12 characters before running `bun run seed:admin` or `bun run seed:admin:reset`. Existing admins are unchanged unless reset is explicitly selected. Keep production credentials out of source files.

`bun run build` embeds all four legal HTML documents in `dist/app.js`; deploy that file and run `bun dist/app.js` with runtime environment variables. No build-machine data directory is needed.
