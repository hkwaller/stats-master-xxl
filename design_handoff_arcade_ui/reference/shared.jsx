// Shared data, palette, icons, and primitives

const PALETTE = {
  red: '#c8102e',
  redDark: '#9e0c23',
  navy: '#003087',
  navyDark: '#001e55',
  ice: '#dce8ff',
  iceDeep: '#bfd3ff',
  cream: '#f0ede7',
  paper: '#faf7f1',
  black: '#0a0a0f',
};

const MOCK = {
  stats: [
    { k: 'GP', v: 80 },
    { k: 'G',  v: 73 },
    { k: 'A',  v: 135 },
    { k: 'PTS', v: 208, highlight: true },
    { k: 'PIM', v: 52 },
  ],
  choices: ['Connor McDavid', 'Pat LaFontaine', 'Wayne Gretzky', 'Phil Esposito'],
  correctIndex: 2,
  players: [
    { name: 'IcyBlade1801', score: 840, rank: 1, host: true,  boss: true,  streak: 4, avatar: 'IB' },
    { name: 'SlapshotSal', score: 720, rank: 2, host: false, boss: false, streak: 2, avatar: 'SS' },
    { name: 'GoalieGus',   score: 660, rank: 3, host: false, boss: false, streak: 0, avatar: 'GG' },
    { name: 'HatTrickHana', score: 540, rank: 4, host: false, boss: false, streak: 1, avatar: 'HH' },
    { name: 'BluelineBo',  score: 330, rank: 5, host: false, boss: false, streak: 0, avatar: 'BB' },
  ],
  players_me: 'IcyBlade1801',
  question: { num: 4, total: 10, difficulty: 'Easy' },
  hints: [
    { k: 'era', label: 'Era' },
    { k: 'team', label: 'Team' },
    { k: 'pos', label: 'Position' },
  ],
  powerups: [
    { k: 'elim', label: 'Eliminate', n: 2, icon: '✂' },
    { k: 'dbl',  label: 'Double Down', n: 3, icon: '×2' },
    { k: 'frz',  label: 'Freeze', n: 1, icon: '❄' },
    { k: 'rsh',  label: 'Rush',   n: 2, icon: '⚡' },
  ],
};

// Tiny inline icon components used across directions
const Icon = {
  Puck: ({size=18, color='currentColor'}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <ellipse cx="12" cy="8" rx="9" ry="3" fill={color}/>
      <path d="M3 8v7c0 1.7 4 3 9 3s9-1.3 9-3V8" stroke={color} strokeWidth="2"/>
      <ellipse cx="12" cy="8" rx="9" ry="3" stroke={color} strokeWidth="1.5"/>
    </svg>
  ),
  Stick: ({size=18, color='currentColor'}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 4l14 14" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M17 18l4-1-1 4-3-3z" fill={color}/>
    </svg>
  ),
  Trophy: ({size=18, color='currentColor'}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M7 3h10v2h3v3a4 4 0 0 1-4 4h-.3a6 6 0 0 1-4.7 4.9V19h3v2H9v-2h3v-2.1A6 6 0 0 1 7.3 12H7a4 4 0 0 1-4-4V5h3V3h1zm0 4H5v1a2 2 0 0 0 2 2V7zm12 0h-2v3a2 2 0 0 0 2-2V7z"/>
    </svg>
  ),
  Flame: ({size=18, color='currentColor'}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 2s4 4 4 8a4 4 0 0 1-8 0c0-1 .5-1.5 1-2-1 3-2 4-2 6a5 5 0 0 0 10 0c0-5-5-8-5-12z"/>
    </svg>
  ),
  Bolt: ({size=18, color='currentColor'}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/>
    </svg>
  ),
  Snow: ({size=18, color='currentColor'}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" aria-hidden="true">
      <path d="M12 2v20M4 6l16 12M4 18l16-12"/>
    </svg>
  ),
  Scissors: ({size=18, color='currentColor'}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" aria-hidden="true">
      <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
      <path d="M8.5 8 20 20M8.5 16 20 4"/>
    </svg>
  ),
};

// Stat dot-matrix label component used widely
function StatKey({k, bg='#0a0a0f', color='#fff'}) {
  return (
    <span style={{
      display:'inline-block', padding:'2px 6px', background:bg, color,
      font:'700 10px/1 "JetBrains Mono", monospace', letterSpacing:'0.08em',
      borderRadius: 3, textTransform:'uppercase'
    }}>{k}</span>
  );
}

// Player avatar placeholder  -- blocky initials
function AvatarBlock({ initials, bg='#003087', fg='#fff', size=40, style={} }) {
  return (
    <div style={{
      width:size, height:size, background:bg, color:fg,
      display:'grid', placeItems:'center',
      font:'800 ' + (size*0.42) + 'px/1 "Archivo Black"',
      letterSpacing:'-0.02em',
      borderRadius: 6,
      ...style
    }}>{initials}</div>
  );
}

// Halftone dot texture background (inline SVG)
function halftoneBg({ color='#0a0a0f', opacity=0.12, size=6, dot=1.4 }) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><circle cx='${size/2}' cy='${size/2}' r='${dot}' fill='${encodeURIComponent(color)}' opacity='${opacity}'/></svg>`;
  return `url("data:image/svg+xml;utf8,${svg.replace(/#/g,'%23')}")`;
}

// Rink lines SVG backdrop
function RinkLines({ color='#003087', opacity=0.12, style={} }) {
  return (
    <svg viewBox="0 0 1200 600" preserveAspectRatio="none" style={{
      position:'absolute', inset:0, width:'100%', height:'100%', opacity, ...style
    }} aria-hidden="true">
      <rect x="20" y="20" width="1160" height="560" rx="90" ry="90" fill="none" stroke={color} strokeWidth="3"/>
      <line x1="400" y1="20" x2="400" y2="580" stroke={color} strokeWidth="3"/>
      <line x1="800" y1="20" x2="800" y2="580" stroke={color} strokeWidth="3"/>
      <line x1="600" y1="20" x2="600" y2="580" stroke="#c8102e" strokeWidth="4" strokeDasharray="16 10"/>
      <circle cx="600" cy="300" r="70" fill="none" stroke="#c8102e" strokeWidth="3"/>
      <circle cx="600" cy="300" r="4" fill="#c8102e"/>
      <circle cx="200" cy="180" r="40" fill="none" stroke={color} strokeWidth="2.5"/>
      <circle cx="200" cy="420" r="40" fill="none" stroke={color} strokeWidth="2.5"/>
      <circle cx="1000" cy="180" r="40" fill="none" stroke={color} strokeWidth="2.5"/>
      <circle cx="1000" cy="420" r="40" fill="none" stroke={color} strokeWidth="2.5"/>
    </svg>
  );
}

Object.assign(window, { PALETTE, MOCK, Icon, StatKey, AvatarBlock, halftoneBg, RinkLines });
