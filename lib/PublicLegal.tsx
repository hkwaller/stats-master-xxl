import type { ReactNode } from 'react'
const styles = { maxWidth: 760, margin: '0 auto', padding: '48px 24px', lineHeight: 1.7 }
export function PublicLegal({ title, children }: { title: string; children: ReactNode }) {
  return <main style={styles}><a href="/">Back to the game</a><h1>{title}</h1>{children}<footer style={{ marginTop: 40, display: 'flex', flexWrap: 'wrap', gap: 20 }}><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="https://playam.app">A game from Playam</a></footer></main>
}
export function WebAdvertisingPrivacy() {
  return <section><h2>Web advertising and the Playam platform</h2><p>This website does not currently serve advertising. Selected Playam games may introduce web advertising in the future. Before that happens, this policy will be updated with the actual providers, information used and consent choices. The web version and native apps may use different services; any native app advertising is described separately in the game's privacy policy.</p><p>See the <a href="https://playam.app/privacy">Playam platform privacy policy</a>. Contact Amalies Utviklingsfabrikk / Playam at <a href="mailto:info@amaliesutviklingsfabrikk.no">info@amaliesutviklingsfabrikk.no</a>.</p></section>
}
