// App shell - tabs, direction toggle, frame layout

const DIRECTIONS = [
  {
    id: 'A',
    name: 'Broadcast',
    tagline: 'Arena scoreboard · LED dot-matrix · jumbotron energy',
    bg: '#07080c',
    fg: '#fff',
    bar: '#10131a',
  },
  {
    id: 'B',
    name: 'Collector',
    tagline: 'Trading-card foils · halftone zine · warm paper',
    bg: '#f4efe3',
    fg: '#141010',
    bar: '#141010',
  },
  {
    id: 'C',
    name: 'Arcade',
    tagline: 'Ice-rink arcade · playful chunk · mascot + streaks',
    bg: '#eaf2ff',
    fg: '#0a1535',
    bar: '#0a1535',
  },
]
const SCREENS = [
  { id: 'landing', label: 'Landing' },
  { id: 'setup', label: 'Setup' },
  { id: 'lobby', label: 'Lobby' },
  { id: 'game', label: 'Game' },
]

function Frame({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          font: '700 11px/1 "JetBrains Mono", monospace',
          letterSpacing: '0.22em',
          color: '#666',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div className="frame">{children}</div>
    </div>
  )
}

function DirectionBlock({ dir }) {
  const byId = {
    A: { landing: ALanding, setup: ASetup, lobby: ALobby, game: AGame },
    B: { landing: BLanding, setup: BSetup, lobby: BLobby, game: BGame },
    C: { landing: CLanding, setup: CSetup, lobby: CLobby, game: CGame },
  }
  const components = byId[dir.id]
  return (
    <div
      data-screen-label={`${dir.id} ${dir.name}`}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}
    >
      <div
        className="direction-heading"
        style={{ background: dir.bar, color: dir.id === 'B' ? '#f4efe3' : '#fff', width: 1280 }}
      >
        <span className="eyebrow">Direction {dir.id}</span>
        <h2 style={{ color: dir.id === 'A' ? '#ff2a44' : dir.id === 'B' ? '#c8102e' : '#e32437' }}>
          {dir.name}.
        </h2>
        <p>{dir.tagline}</p>
      </div>
      <Frame label={`${dir.id} · Landing`}>{React.createElement(components.landing)}</Frame>
      <div className="frame-row">
        <Frame label={`${dir.id} · Setup`}>{React.createElement(components.setup)}</Frame>
      </div>
      <div className="frame-row">
        <Frame label={`${dir.id} · Lobby`}>{React.createElement(components.lobby)}</Frame>
      </div>
      <Frame label={`${dir.id} · Game`}>{React.createElement(components.game)}</Frame>
    </div>
  )
}

function App() {
  const [view, setView] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sm-view')) || { dir: 'A' }
    } catch {
      return { dir: 'A' }
    }
  })
  const [editMode, setEditMode] = React.useState(false)

  React.useEffect(() => {
    localStorage.setItem('sm-view', JSON.stringify(view))
  }, [view])

  // Tweaks host protocol
  React.useEffect(() => {
    const handler = (e) => {
      if (!e.data || typeof e.data !== 'object') return
      if (e.data.type === '__activate_edit_mode') setEditMode(true)
      if (e.data.type === '__deactivate_edit_mode') setEditMode(false)
    }
    window.addEventListener('message', handler)
    try {
      window.parent.postMessage({ type: '__edit_mode_available' }, '*')
    } catch {}
    return () => window.removeEventListener('message', handler)
  }, [])

  // Wire the tweaks panel DOM (outside React)
  React.useEffect(() => {
    const tw = document.getElementById('tweaks')
    if (!tw) return
    tw.classList.toggle('show', editMode)
    const dirSel = document.getElementById('tw-dir')
    const scrSel = document.getElementById('tw-screen')
    dirSel.value = view.dir
    const onDir = () => setView((v) => ({ ...v, dir: dirSel.value }))
    const onScr = () => {
      const dirBlock = document.querySelector(`[data-screen-label^="${view.dir}"]`)
      if (dirBlock) {
        const frames = dirBlock.querySelectorAll('.frame')
        const idx = { landing: 0, setup: 1, lobby: 2, game: 3 }[scrSel.value] ?? 0
        const target = frames[idx]
        if (target) target.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    }
    dirSel.addEventListener('change', onDir)
    scrSel.addEventListener('change', onScr)
    return () => {
      dirSel.removeEventListener('change', onDir)
      scrSel.removeEventListener('change', onScr)
    }
  }, [editMode, view.dir])

  // Top nav
  React.useEffect(() => {
    const nav = document.getElementById('nav')
    if (!nav) return
    nav.innerHTML = ''
    DIRECTIONS.forEach((d) => {
      const b = document.createElement('button')
      b.textContent = `${d.id} · ${d.name}`
      b.className = view.dir === d.id ? 'active' : ''
      b.onclick = () => {
        setView((v) => ({ ...v, dir: d.id }))
        setTimeout(() => {
          const block = document.querySelector(`[data-screen-label^="${d.id}"]`)
          block && block.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 50)
      }
      nav.appendChild(b)
    })
    const sep = document.createElement('div')
    sep.className = 'sep'
    nav.appendChild(sep)
    SCREENS.forEach((s) => {
      const b = document.createElement('button')
      b.textContent = s.label
      b.onclick = () => {
        const block = document.querySelector(`[data-screen-label^="${view.dir}"]`)
        if (!block) return
        const frames = block.querySelectorAll('.frame')
        const idx = SCREENS.findIndex((x) => x.id === s.id)
        const target = frames[idx]
        target && target.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
      nav.appendChild(b)
    })
  }, [view.dir])

  return (
    <div className="frame-host">
      {DIRECTIONS.map((d) => (
        <DirectionBlock key={d.id} dir={d} />
      ))}
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(<App />)
