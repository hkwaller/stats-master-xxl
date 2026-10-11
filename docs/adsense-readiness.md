# Stats Master: AdSense preparation

No web ad SDK is loaded. Eligibility is in `lib/playam-monetization.ts`, generated from Playam's shared policy. Run `npm run monetization:sync` / `monetization:check` in amalie-games when changing it. Native AdMob, where present, is separate.

Public `/`, `/privacy`, `/terms` and crawler metadata bypass Clerk. Existing game/account authentication and native root rewrites are retained.

Future break: only after final session completion and after displaying results. Use `monetizationBreakReached({ game: 'stats-master', completed: true, phase: 'results', contentSource: ... })`. This is an eligibility predicate, not an ad event or loader. Never fire on a per-question reveal, join, lobby, loading or a timed/drag interaction.

Deployment and a repeat anonymous crawler audit are required; local changes are not a live PASS. Set any production URL override to `https://statsmaster.playam.app`.

Completion implementation references:
- `app/[roomId]/player/[playerId]/page.tsx`
