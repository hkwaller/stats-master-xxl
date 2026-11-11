# Stats Master rooms

PartyServer runs the game on Cloudflare Workers, with one SQLite Durable Object per
six-character room code. The server validates actions, applies the game rules,
persists JSON state in atomic chunks, and broadcasts a snapshot to all authorized sockets.

## Local development

1. `npm install`
2. Generate a secret with `openssl rand -hex 32`. Set the same `PARTY_SECRET` in
   `.env.local` and `party/.dev.vars`. Both files are ignored by git.
3. Set `NEXT_PUBLIC_PARTY_HOST=localhost:1999` in `.env.local`.
4. Run `npm run party:dev` and `npm run dev` in separate terminals.

Create a host room on localhost, then join from 127.0.0.1 in a second tab to get a
separate guest identity. The server binds each action to the persistent guest UUID
already used by the game. Clerk sign-in does not replace that identity.

Each reconnect fetches a fresh HMAC-SHA256 ticket from `/api/party-auth`. The Worker
checks the room, signature, and expiry before routing and again on connection.
Connection attachments preserve identity through hibernation. Room state survives
reloads and Worker restarts; sockets receive authoritative state on every reconnect.
A round index and game session reject queued actions from an earlier round/game.
Controls apply the shared reducer optimistically; every server snapshot replaces
the local projection. Random elimination choices wait for the server, which also
provides the authoritative scores and timing.

A room expires 24 hours after its last state change. Expiration closes its sockets
and deletes its state. A reused code starts a new room.

## Verification

- `npm test` — reducer, ticket/endpoint, and existing game/UI regressions
- `node scripts/test-party-integration.mjs` — real socket games against the local Worker
- Restart the Worker, then `node scripts/test-party-integration.mjs --restore` to verify large-career persistence
- `npx tsc --noEmit -p .`
- `npm run party:check`
- `npm run build`
- `npx wrangler deploy --dry-run --config party/wrangler.jsonc --outdir /tmp/stats-master-party`

Play classic, career, head-to-head, and higher/lower. Check host-only view and
host-as-player, boss controls, hints/powerups, scoring, pause/resume, skip, and
rematch. Reload a player and host mid-round. On a real phone, lock the screen for
30 seconds and switch apps; the player should return to the same seat.

## Deployment

1. `npx wrangler login` using the intended Cloudflare account.
2. `npm run party:deploy` deploys `stats-master-party`.
3. `npx wrangler secret put PARTY_SECRET --config party/wrangler.jsonc` — use the
   same secret as the Next.js environment.
4. In Vercel, set `PARTY_SECRET` and
   `NEXT_PUBLIC_PARTY_HOST=stats-master-party.playam.workers.dev` for the preview.
5. Test the preview on a real phone, including reconnects, before deploying production.
6. Set the same production variables before the production deployment.

The production web deployment switches the room backend. This repository has no
Capacitor shell or bundled native game to update.

## Automatic deployment from Vercel

`vercel.json` runs `npm run vercel-build`. For production deployments
(`VERCEL_ENV=production`), this checks the Worker types, builds Next.js, and then
runs `npm run party:deploy`. Any failure stops the build, preventing that frontend
deployment from going live. Preview and local builds never deploy the Worker.
The normal `npm run build` command only builds Next.js.

Before enabling this on a Vercel project, add these **Production-only** variables:

- `CLOUDFLARE_API_TOKEN`: a secret API token with Workers deployment permissions
  for the Cloudflare account hosting `stats-master-party`.
- `CLOUDFLARE_ACCOUNT_ID`: that Cloudflare account's ID.

Keep the existing `NEXT_PUBLIC_PARTY_HOST` and matching `PARTY_SECRET` settings.
The build does not change the Worker's secrets or its host. Missing deployment
credentials fail production builds immediately instead of silently skipping the Worker.

The Worker becomes live before Vercel finishes publishing the frontend. Keep
Worker changes compatible with existing clients and active rooms. Vercel
rollbacks do not roll back Cloudflare; redeploy the corresponding Worker separately.

Production rebuilds redeploy the Worker even when its source is unchanged.
Avoid overlapping production releases: an older build finishing later could
otherwise deploy its Worker after a newer release.
