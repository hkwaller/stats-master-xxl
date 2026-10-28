# Stats Master monetization

The web app currently has no payment integration, checkout, billing portal, or
paid-entitlement system. In-app purchases are planned for a future integration.
No purchase buttons or paid plans are offered in the current app.

Web advertising is disabled by the shared `WEB_ADS_ENABLED` policy in
`lib/playam-monetization.ts`. See `docs/adsense-readiness.md` for the separate
web-advertising preparation and eligibility rules.

When in-app purchases are implemented, add purchase verification and restoration
along with the product UI and any resulting room entitlements.
