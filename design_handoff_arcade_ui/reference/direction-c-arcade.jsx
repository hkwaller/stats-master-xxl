// DIRECTION C — "ARCADE"
// Ice-rink arcade. Chunky, playful, bright. Rink markings, mascot, Zamboni
// transitions, penalty box as a feature. Soft ice gradients + bold pops.

const Cclr = {
  ice: '#eaf2ff',
  ice2: '#d3e3ff',
  ink: '#0a1535',
  navy: '#003087',
  red: '#e32437',
  redSoft:'#ffd6dc',
  yellow:'#ffcf33',
  green: '#2cc66b',
  cream: '#fdfaf1',
  shadow: 'rgba(0,24,60,0.18)',
};

function iceBg() {
  return {
    background:`
      radial-gradient(ellipse at 20% 0%, #fff 0%, transparent 45%),
      radial-gradient(ellipse at 90% 100%, ${Cclr.ice2} 0%, transparent 50%),
      linear-gradient(180deg, #f4f8ff 0%, ${Cclr.ice} 60%, ${Cclr.ice2} 100%)
    `
  };
}

function CMascot({ size=60, mood='happy' }) {
  // A cute puck mascot. Simple shapes only.
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <ellipse cx="50" cy="82" rx="30" ry="5" fill={Cclr.ink} opacity="0.18"/>
      <ellipse cx="50" cy="22" rx="36" ry="10" fill={Cclr.ink}/>
      <path d="M14 22v45c0 6 16 11 36 11s36-5 36-11V22" fill={Cclr.ink}/>
      <ellipse cx="50" cy="22" rx="36" ry="10" fill="#222b4a"/>
      {/* face */}
      <circle cx="38" cy="50" r="4" fill="#fff"/>
      <circle cx="62" cy="50" r="4" fill="#fff"/>
      <circle cx="38" cy="50" r="1.8" fill={Cclr.ink}/>
      <circle cx="62" cy="50" r="1.8" fill={Cclr.ink}/>
      <circle cx="28" cy="58" r="3" fill={Cclr.red} opacity="0.6"/>
      <circle cx="72" cy="58" r="3" fill={Cclr.red} opacity="0.6"/>
      {mood==='happy'
        ? <path d="M42 62 Q50 70 58 62" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        : <path d="M42 66 Q50 60 58 66" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round"/>}
    </svg>
  );
}

function CBrand({ small=false }) {
  const s = small ? 0.75 : 1;
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:10 }}>
      <CMascot size={small ? 34 : 46}/>
      <div>
        <div style={{ font:`900 ${28*s}px/0.9 "Bungee", "Archivo Black"`, color:Cclr.ink, letterSpacing:'-0.01em' }}>
          STATS<span style={{ color:Cclr.red }}>!</span>MASTER
        </div>
        <div style={{ font:`700 ${9*s}px/1 "JetBrains Mono"`, letterSpacing:'0.28em', color:Cclr.navy, marginTop:3 }}>ICE · TRIVIA · ARCADE</div>
      </div>
    </div>
  );
}

// Puffy/3D-style button
function CBtn({ children, variant='red', size='md', style={}, ...p }) {
  const variants = {
    red:   { bg:Cclr.red,   fg:'#fff', shadow:'#a21726' },
    navy:  { bg:Cclr.navy,  fg:'#fff', shadow:'#001e55' },
    white: { bg:'#fff',     fg:Cclr.ink, shadow:Cclr.ice2 },
    yellow:{ bg:Cclr.yellow,fg:Cclr.ink, shadow:'#c89a14' },
  };
  const sz = size==='lg' ? { pad:'18px 28px', fs:17, r:14 } : size==='sm' ? { pad:'8px 14px', fs:11, r:10 } : { pad:'14px 20px', fs:14, r:12 };
  const v = variants[variant];
  return (
    <button style={{
      background: `linear-gradient(180deg, ${v.bg} 0%, ${v.bg} 60%, ${v.shadow} 100%)`,
      color: v.fg, border:`2px solid ${Cclr.ink}`, borderRadius:sz.r,
      padding: sz.pad, cursor:'pointer',
      font:`900 ${sz.fs}px/1 "Archivo Black", sans-serif`, letterSpacing:'0.06em', textTransform:'uppercase',
      boxShadow:`0 4px 0 ${v.shadow}, 0 6px 14px rgba(0,0,0,0.15)`,
      transform:'translateY(0)', transition:'transform 0.1s',
      ...style,
    }} {...p}>{children}</button>
  );
}

// Rink background element
function RinkBg({ opacity=0.18 }) {
  return (
    <svg viewBox="0 0 1280 500" preserveAspectRatio="none" style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity }} aria-hidden="true">
      <rect x="30" y="30" width="1220" height="440" rx="120" ry="120" fill="none" stroke={Cclr.navy} strokeWidth="4"/>
      <line x1="430" y1="30" x2="430" y2="470" stroke={Cclr.navy} strokeWidth="4"/>
      <line x1="850" y1="30" x2="850" y2="470" stroke={Cclr.navy} strokeWidth="4"/>
      <line x1="640" y1="30" x2="640" y2="470" stroke={Cclr.red} strokeWidth="5" strokeDasharray="20 12"/>
      <circle cx="640" cy="250" r="90" fill="none" stroke={Cclr.red} strokeWidth="4"/>
      <circle cx="640" cy="250" r="5" fill={Cclr.red}/>
      <circle cx="220" cy="140" r="50" fill="none" stroke={Cclr.navy} strokeWidth="3"/>
      <circle cx="220" cy="360" r="50" fill="none" stroke={Cclr.navy} strokeWidth="3"/>
      <circle cx="1060" cy="140" r="50" fill="none" stroke={Cclr.navy} strokeWidth="3"/>
      <circle cx="1060" cy="360" r="50" fill="none" stroke={Cclr.navy} strokeWidth="3"/>
    </svg>
  );
}

// ── C · LANDING ──────────────────────────────────────────────────────────────
function CLanding() {
  return (
    <div style={{ ...iceBg(), color:Cclr.ink, fontFamily:'"Space Grotesk"', position:'relative', overflow:'hidden' }}>
      {/* Top nav */}
      <div style={{ padding:'18px 36px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'relative', zIndex:2 }}>
        <CBrand/>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div style={{ background:'#fff', border:`2px solid ${Cclr.ink}`, borderRadius:99, padding:'6px 14px', display:'inline-flex', alignItems:'center', gap:8, boxShadow:`0 3px 0 ${Cclr.ink}22` }}>
            <span style={{ width:8, height:8, background:Cclr.green, borderRadius:'50%' }}/>
            <span style={{ font:'800 11px/1 "Archivo Black"', letterSpacing:'0.14em' }}>1,284 PLAYING</span>
          </div>
          <CBtn variant="white" size="sm">SIGN IN</CBtn>
        </div>
      </div>

      {/* Hero */}
      <div style={{ position:'relative', padding:'40px 40px 80px' }}>
        <RinkBg opacity={0.15}/>
        {/* floating stickers */}
        <div style={{ position:'absolute', top:30, right:56, transform:'rotate(12deg)', background:Cclr.yellow, border:`2px solid ${Cclr.ink}`, padding:'8px 14px', borderRadius:12, font:'900 13px/1 "Archivo Black"', letterSpacing:'0.1em', boxShadow:`0 4px 0 ${Cclr.ink}` }}>POWER PLAY ⚡</div>
        <div style={{ position:'absolute', top:190, left:20, transform:'rotate(-8deg)', background:'#fff', border:`2px solid ${Cclr.ink}`, padding:'8px 14px', borderRadius:12, font:'900 12px/1 "Archivo Black"', letterSpacing:'0.1em', boxShadow:`0 4px 0 ${Cclr.ink}` }}>STREAKS ×4 <span style={{color:Cclr.red}}>🔥</span></div>

        <div style={{ position:'relative', display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:40, alignItems:'center', zIndex:2 }}>
          <div>
            <div style={{ display:'inline-block', background:Cclr.red, color:'#fff', padding:'8px 16px', borderRadius:99, border:`2px solid ${Cclr.ink}`, font:'900 12px/1 "Archivo Black"', letterSpacing:'0.2em', boxShadow:`0 4px 0 ${Cclr.ink}`, marginBottom:22 }}>
              🏒 MULTIPLAYER · 2–8 PLAYERS
            </div>
            <h1 style={{
              font:'900 108px/0.9 "Bungee"', margin:0, color:Cclr.ink, letterSpacing:'-0.01em'
            }}>
              <span style={{color:Cclr.navy}}>FIVE</span> STATS.<br/>
              <span style={{color:Cclr.red}}>ONE</span> LEGEND.<br/>
              <span style={{ display:'inline-block', transform:'rotate(-2deg)', background:Cclr.yellow, padding:'4px 14px', border:`3px solid ${Cclr.ink}`, borderRadius:16, boxShadow:`0 6px 0 ${Cclr.ink}` }}>GO!</span>
            </h1>
            <p style={{ font:'500 18px/1.5 "Space Grotesk"', color:Cclr.ink, opacity:0.85, maxWidth:500, marginTop:24 }}>
              The couch-co-op hockey trivia game your group chat has been begging for. Buzz in, build streaks, dodge the penalty box.
            </p>
            <div style={{ display:'flex', gap:12, marginTop:28 }}>
              <CBtn variant="red" size="lg">🎮 CREATE GAME</CBtn>
              <CBtn variant="white" size="lg">JOIN WITH CODE</CBtn>
            </div>
          </div>

          {/* Preview cluster */}
          <div style={{ position:'relative', height:440 }}>
            {/* Stat card floating */}
            <div style={{
              position:'absolute', top:20, left:20, transform:'rotate(-4deg)',
              background:'#fff', border:`3px solid ${Cclr.ink}`, borderRadius:18, padding:18, width:300,
              boxShadow:`0 10px 0 ${Cclr.ink}22, 10px 12px 30px ${Cclr.shadow}`,
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={{ font:'900 11px/1 "Archivo Black"', letterSpacing:'0.22em', color:Cclr.red }}>⭐ DAILY · EXPERT</div>
                <div style={{ font:'900 18px/1 "Bungee"', color:Cclr.navy }}>:08</div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6 }}>
                {MOCK.stats.map(s=>(
                  <div key={s.k} style={{
                    background: s.highlight ? Cclr.red : Cclr.ice, color: s.highlight ? '#fff' : Cclr.ink,
                    border:`2px solid ${Cclr.ink}`, borderRadius:8, padding:'8px 4px',
                    display:'flex', flexDirection:'column', alignItems:'center',
                  }}>
                    <div style={{ font:'800 9px/1 "Archivo Black"', letterSpacing:'0.18em', opacity:0.9 }}>{s.k}</div>
                    <div style={{ font:'900 20px/1 "Bungee"', marginTop:4 }}>{s.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:12, display:'grid', gap:6 }}>
                {MOCK.choices.slice(0,2).map((c,i)=>(
                  <div key={c} style={{ background: i===0?Cclr.navy:'#fff', color: i===0?'#fff':Cclr.ink, border:`2px solid ${Cclr.ink}`, borderRadius:10, padding:'10px 12px', font:'800 13px/1 "Archivo Black"', display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ background:i===0?'#fff':Cclr.ink, color:i===0?Cclr.navy:'#fff', width:22, height:22, borderRadius:6, display:'grid', placeItems:'center', font:'900 11px/1 "Archivo Black"' }}>{String.fromCharCode(65+i)}</span>
                    {c}
                  </div>
                ))}
              </div>
            </div>

            {/* Scoreboard mini */}
            <div style={{
              position:'absolute', bottom:10, right:10, transform:'rotate(4deg)',
              background:Cclr.ink, color:'#fff', borderRadius:16, padding:16, width:280,
              border:`3px solid ${Cclr.ink}`, boxShadow:`10px 12px 30px ${Cclr.shadow}`,
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={{ font:'900 11px/1 "Archivo Black"', letterSpacing:'0.22em', color:Cclr.yellow }}>★ STANDINGS</div>
                <div style={{ font:'800 10px/1 "JetBrains Mono"', letterSpacing:'0.18em', opacity:0.7 }}>Q 4/10</div>
              </div>
              {MOCK.players.slice(0,3).map((p,i)=>(
                <div key={p.name} style={{ display:'grid', gridTemplateColumns:'auto auto 1fr auto', gap:8, alignItems:'center', padding:'6px 0', borderBottom: i<2 ? '1px dashed #ffffff22' : 'none' }}>
                  <span style={{ font:'900 14px/1 "Bungee"', color: i===0?Cclr.yellow:i===1?Cclr.ice:'#aab3cf' }}>{i+1}</span>
                  <AvatarBlock initials={p.avatar} bg={i===0?Cclr.red:Cclr.navy} size={24}/>
                  <span style={{ font:'800 12px/1 "Archivo Black"' }}>{p.name}</span>
                  <span style={{ font:'900 14px/1 "Bungee"', color:'#fff' }}>{p.score}</span>
                </div>
              ))}
            </div>

            {/* Power play puck */}
            <div style={{
              position:'absolute', top:150, right:30, width:120, height:120,
              background:`radial-gradient(circle, ${Cclr.yellow}, #f0b512)`, borderRadius:'50%',
              border:`4px solid ${Cclr.ink}`, display:'grid', placeItems:'center',
              boxShadow:`0 8px 0 ${Cclr.ink}, 0 12px 30px ${Cclr.shadow}`,
              transform:'rotate(-8deg)'
            }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ font:'900 30px/1 "Bungee"', color:Cclr.ink }}>2×</div>
                <div style={{ font:'900 9px/1 "Archivo Black"', letterSpacing:'0.16em', color:Cclr.ink }}>POWER PLAY</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Strip: features */}
      <div style={{ padding:'40px', background:'#fff', borderTop:`4px solid ${Cclr.ink}`, borderBottom:`4px solid ${Cclr.ink}` }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:18 }}>
          {[
            { emoji:'🏒', t:'Stat blitz', d:'Five stats, four names, twelve seconds. Go.', c:Cclr.red },
            { emoji:'🔥', t:'Streak combos', d:'Answer fast, rack up a combo, earn foil bonuses.', c:Cclr.yellow },
            { emoji:'⚡', t:'Power plays', d:'Random 2× windows that flip the leaderboard.', c:Cclr.navy },
            { emoji:'🚫', t:'Penalty box', d:'Wrong answer in boss mode? Sit two rounds out.', c:Cclr.ink },
          ].map(f=>(
            <div key={f.t} style={{ background:Cclr.cream, border:`2px solid ${Cclr.ink}`, borderRadius:16, padding:18, boxShadow:`0 5px 0 ${Cclr.ink}` }}>
              <div style={{ width:46, height:46, background:f.c, color:'#fff', borderRadius:12, border:`2px solid ${Cclr.ink}`, display:'grid', placeItems:'center', font:'900 22px/1 "Archivo Black"' }}>{f.emoji}</div>
              <div style={{ font:'900 22px/1 "Bungee"', marginTop:12 }}>{f.t}</div>
              <div style={{ font:'500 13px/1.5 "Space Grotesk"', color:'#35415f', marginTop:6 }}>{f.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── C · SETUP ────────────────────────────────────────────────────────────────
function CSetup() {
  const [mode, setMode] = React.useState('Classic');
  const [qty, setQty] = React.useState(10);
  const [diff, setDiff] = React.useState(new Set(['Easy','Medium']));
  const toggle = (k) => { const n = new Set(diff); n.has(k) ? n.delete(k) : n.add(k); setDiff(n); };
  return (
    <div style={{ ...iceBg(), fontFamily:'"Space Grotesk"', minHeight:720 }}>
      <div style={{ padding:'18px 36px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <CBrand small/>
        <CBtn variant="white" size="sm" style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ width:8, height:8, background:Cclr.green, borderRadius:'50%' }}/>
          ROOM · DQKVDS
        </CBtn>
      </div>

      <div style={{ padding:'20px 36px 40px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:18 }}>
          <div>
            <div style={{ display:'inline-block', background:Cclr.yellow, border:`2px solid ${Cclr.ink}`, borderRadius:99, padding:'4px 14px', font:'900 11px/1 "Archivo Black"', letterSpacing:'0.22em', boxShadow:`0 3px 0 ${Cclr.ink}` }}>STEP 1 OF 2</div>
            <h2 style={{ font:'900 60px/0.9 "Bungee"', margin:'14px 0 0', color:Cclr.ink }}>Set up the <span style={{color:Cclr.red}}>game</span></h2>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <CBtn variant="white">◁ BACK</CBtn>
            <CBtn variant="red">CONTINUE ▸</CBtn>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1.1fr 0.9fr', gap:18 }}>
          {/* MODE */}
          <div style={{ background:'#fff', border:`3px solid ${Cclr.ink}`, borderRadius:18, padding:20, boxShadow:`0 8px 0 ${Cclr.ink}` }}>
            <CSectionTitle icon="🎮" label="Game Mode"/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:14 }}>
              {[
                { k:'Classic', d:'Guess the player from one season', color:Cclr.red, emoji:'🏒' },
                { k:'Career', d:'Seasons revealed one by one', color:Cclr.navy, emoji:'📈' },
                { k:'Head-to-Head', d:'Which line belongs to this player?', color:Cclr.yellow, emoji:'🤼' },
                { k:'Higher/Lower', d:'Did they score more or less?', color:Cclr.green, emoji:'⚖️' },
              ].map(m=>{
                const on = mode===m.k;
                return (
                  <button key={m.k} onClick={()=>setMode(m.k)} style={{
                    background: on ? m.color : '#fff', color: on ? (m.color===Cclr.yellow?Cclr.ink:'#fff') : Cclr.ink,
                    border:`2.5px solid ${Cclr.ink}`, borderRadius:14, padding:'16px', cursor:'pointer',
                    boxShadow: on ? `0 5px 0 ${Cclr.ink}` : `0 3px 0 ${Cclr.ink}44`,
                    textAlign:'left',
                  }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                      <div style={{ width:36, height:36, background: on ? '#fff' : m.color, borderRadius:10, border:`2px solid ${Cclr.ink}`, display:'grid', placeItems:'center', fontSize:18 }}>{m.emoji}</div>
                      <div style={{ width:22, height:22, borderRadius:'50%', border:`2px solid ${on ? '#fff' : Cclr.ink}`, background: on ? '#fff' : 'transparent' }}>{on && <div style={{ width:10, height:10, margin:'4px', borderRadius:'50%', background: m.color }}/>}</div>
                    </div>
                    <div style={{ font:'900 18px/1 "Bungee"' }}>{m.k}</div>
                    <div style={{ font:'500 12px/1.4 "Space Grotesk"', opacity:0.85, marginTop:6 }}>{m.d}</div>
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop:18 }}>
              <CSectionTitle icon="✍️" label="Answer Mode"/>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:12 }}>
                <div style={{ background:Cclr.red, color:'#fff', border:`2.5px solid ${Cclr.ink}`, borderRadius:14, padding:'14px 16px', boxShadow:`0 4px 0 ${Cclr.ink}`, font:'900 14px/1 "Bungee"' }}>● MULTIPLE CHOICE</div>
                <div style={{ background:'#fff', color:Cclr.ink, border:`2.5px solid ${Cclr.ink}`, borderRadius:14, padding:'14px 16px', font:'900 14px/1 "Bungee"' }}>○ FREE TEXT</div>
              </div>
            </div>
          </div>

          {/* RIGHT: Questions + Difficulty */}
          <div style={{ display:'grid', gap:18 }}>
            <div style={{ background:'#fff', border:`3px solid ${Cclr.ink}`, borderRadius:18, padding:20, boxShadow:`0 8px 0 ${Cclr.ink}` }}>
              <CSectionTitle icon="🎯" label="Questions"/>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginTop:14 }}>
                {[5,10,15,20].map(n => (
                  <button key={n} onClick={()=>setQty(n)} style={{
                    background: qty===n ? Cclr.navy : Cclr.ice, color: qty===n?'#fff':Cclr.ink,
                    border:`2.5px solid ${Cclr.ink}`, borderRadius:14, padding:'16px 0', cursor:'pointer',
                    boxShadow: qty===n ? `0 4px 0 ${Cclr.ink}` : `0 2px 0 ${Cclr.ink}44`,
                    font:'900 34px/1 "Bungee"',
                  }}>{n}</button>
                ))}
              </div>
            </div>

            <div style={{ background:'#fff', border:`3px solid ${Cclr.ink}`, borderRadius:18, padding:20, boxShadow:`0 8px 0 ${Cclr.ink}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <CSectionTitle icon="🔥" label="Difficulty"/>
                <span style={{ background:Cclr.red, color:'#fff', border:`2px solid ${Cclr.ink}`, borderRadius:99, padding:'4px 12px', font:'900 10px/1 "Archivo Black"', letterSpacing:'0.18em' }}>POOL · 94</span>
              </div>
              <div style={{ display:'grid', gap:8, marginTop:14 }}>
                {[
                  { k:'Easy', r:'140+', d:'Legends', c:Cclr.green, e:'🏆' },
                  { k:'Medium', r:'120–139', d:'All-time greats', c:Cclr.navy, e:'⭐' },
                  { k:'Hard', r:'100–119', d:'Excellent scorers', c:Cclr.red, e:'🔥' },
                  { k:'Expert', r:'70–99', d:'Solid contributors', c:Cclr.ink, e:'💀' },
                ].map(d=>{
                  const on = diff.has(d.k);
                  return (
                    <button key={d.k} onClick={()=>toggle(d.k)} style={{
                      background: on ? '#fff' : Cclr.ice, borderRadius:12,
                      border:`2.5px solid ${on ? d.c : Cclr.ink+'55'}`, padding:'12px 14px', cursor:'pointer',
                      display:'grid', gridTemplateColumns:'auto 1fr auto', gap:12, alignItems:'center',
                      textAlign:'left',
                    }}>
                      <div style={{ width:38, height:38, background:d.c, color:'#fff', borderRadius:10, border:`2px solid ${Cclr.ink}`, display:'grid', placeItems:'center', fontSize:18 }}>{d.e}</div>
                      <div>
                        <div style={{ font:'900 16px/1 "Bungee"' }}>{d.k} <span style={{ color:d.c, fontSize:12 }}>· {d.r}</span></div>
                        <div style={{ font:'500 11px/1.3 "Space Grotesk"', color:'#35415f', marginTop:3 }}>{d.d}</div>
                      </div>
                      <div style={{ width:26, height:26, borderRadius:8, border:`2px solid ${Cclr.ink}`, background: on?d.c:'#fff', color:'#fff', display:'grid', placeItems:'center', font:'900 12px/1 "Archivo Black"' }}>{on?'✓':''}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CSectionTitle({ icon, label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <span style={{ fontSize:18 }}>{icon}</span>
      <span style={{ font:'900 16px/1 "Bungee"' }}>{label}</span>
    </div>
  );
}

// ── C · LOBBY ────────────────────────────────────────────────────────────────
function CLobby() {
  return (
    <div style={{ ...iceBg(), fontFamily:'"Space Grotesk"' }}>
      <div style={{ padding:'18px 36px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <CBrand small/>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ background:Cclr.red, color:'#fff', border:`2px solid ${Cclr.ink}`, borderRadius:99, padding:'6px 14px', font:'900 11px/1 "Archivo Black"', letterSpacing:'0.2em', boxShadow:`0 3px 0 ${Cclr.ink}` }}>● WAITING TO START</div>
        </div>
      </div>

      <div style={{ padding:'20px 36px 40px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:18 }}>
          <div>
            <div style={{ display:'inline-block', background:Cclr.yellow, border:`2px solid ${Cclr.ink}`, borderRadius:99, padding:'4px 14px', font:'900 11px/1 "Archivo Black"', letterSpacing:'0.22em', boxShadow:`0 3px 0 ${Cclr.ink}` }}>STEP 2 OF 2</div>
            <h2 style={{ font:'900 56px/0.9 "Bungee"', margin:'14px 0 0' }}>Lobby <span style={{color:Cclr.red}}>·</span> DQK<span style={{color:Cclr.red}}>VDS</span></h2>
          </div>
          <CBtn variant="red" size="lg" style={{ fontSize:18 }}>🎮 DROP THE PUCK</CBtn>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'0.8fr 1.2fr', gap:18 }}>
          <div style={{ background:'#fff', border:`3px solid ${Cclr.ink}`, borderRadius:18, padding:20, boxShadow:`0 8px 0 ${Cclr.ink}` }}>
            <CSectionTitle icon="📲" label="Invite friends"/>
            <div style={{ marginTop:14, background:Cclr.ice, border:`2.5px solid ${Cclr.ink}`, borderRadius:14, padding:16, textAlign:'center' }}>
              <div style={{ width:170, height:170, background:'#fff', padding:10, border:`2px solid ${Cclr.ink}`, borderRadius:10, margin:'0 auto' }}>
                <svg viewBox="0 0 21 21" width="100%" height="100%" style={{ imageRendering:'pixelated', shapeRendering:'crispEdges' }}>
                  {Array.from({length:21}).map((_,y)=>Array.from({length:21}).map((_,x)=>{
                    const on = (((x*7+y*13+((x*y)%5))%3)===0) || (x<3&&y<3) || (x>17&&y<3) || (x<3&&y>17);
                    return on ? <rect key={x+'-'+y} x={x} y={y} width="1" height="1" fill={Cclr.ink}/> : null;
                  }))}
                  <rect x="2" y="2" width="3" height="3" fill={Cclr.red}/>
                </svg>
              </div>
              <div style={{ font:'900 32px/1 "Bungee"', marginTop:14, letterSpacing:'0.08em' }}>DQKVDS</div>
              <div style={{ font:'500 11px/1.3 "JetBrains Mono"', color:'#35415f', marginTop:6 }}>statsmaster.site/DQKVDS</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:12 }}>
              <CBtn variant="navy" size="sm">⎘ COPY LINK</CBtn>
              <CBtn variant="white" size="sm">SHARE</CBtn>
            </div>

            <div style={{ marginTop:16, background:Cclr.cream, border:`2px solid ${Cclr.ink}`, borderRadius:12, padding:14 }}>
              <div style={{ font:'900 11px/1 "Archivo Black"', letterSpacing:'0.22em', color:Cclr.navy, marginBottom:8 }}>⚙ MATCH SETTINGS</div>
              {[['Mode','Classic'],['Questions','10'],['Difficulty','Easy · Medium'],['Reveal','All at once']].map(([k,v])=>(
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', font:'600 13px/1 "Space Grotesk"' }}>
                  <span style={{ color:'#35415f' }}>{k}</span><span style={{ fontWeight:800 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <CSectionTitle icon="👥" label={`Players · ${MOCK.players.length}/8`}/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:14 }}>
              {MOCK.players.map(p => (
                <div key={p.name} style={{
                  background: p.host ? Cclr.navy : '#fff', color: p.host ? '#fff' : Cclr.ink,
                  border:`3px solid ${Cclr.ink}`, borderRadius:16, padding:14,
                  boxShadow:`0 5px 0 ${Cclr.ink}`,
                  display:'flex', gap:14, alignItems:'center', position:'relative',
                }}>
                  <AvatarBlock initials={p.avatar} bg={p.host ? Cclr.red : Cclr.navy} fg="#fff" size={48} style={{ border:`2px solid ${Cclr.ink}`, borderRadius:12 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ font:'900 16px/1 "Bungee"' }}>{p.name}</div>
                    <div style={{ font:'700 11px/1 "JetBrains Mono"', letterSpacing:'0.18em', opacity:0.8, marginTop:5 }}>{p.score} pts · rank #{p.rank}</div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {p.host && <span style={{ background:Cclr.red, color:'#fff', padding:'3px 8px', font:'900 9px/1 "Archivo Black"', letterSpacing:'0.18em', borderRadius:6, border:`1.5px solid ${Cclr.ink}` }}>HOST</span>}
                    {p.boss && <span style={{ background:Cclr.yellow, color:Cclr.ink, padding:'3px 8px', font:'900 9px/1 "Archivo Black"', letterSpacing:'0.18em', borderRadius:6, border:`1.5px solid ${Cclr.ink}` }}>👑 BOSS</span>}
                  </div>
                </div>
              ))}
              {Array.from({length:3}).map((_,i)=>(
                <div key={i} style={{
                  background:'transparent', border:`3px dashed ${Cclr.ink}44`, borderRadius:16, padding:18,
                  display:'grid', placeItems:'center', color:'#5a6c8f', font:'900 14px/1 "Bungee"', minHeight:86,
                }}>+ WAITING…</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── C · GAME ─────────────────────────────────────────────────────────────────
function CGame() {
  return (
    <div style={{ ...iceBg(), fontFamily:'"Space Grotesk"', minHeight:760, position:'relative', overflow:'hidden' }}>
      <RinkBg opacity={0.1}/>

      {/* Scoreboard strip */}
      <div style={{
        position:'relative', background:Cclr.ink, color:'#fff', padding:'14px 24px',
        display:'grid', gridTemplateColumns:'auto 1fr auto', gap:20, alignItems:'center',
        borderBottom:`4px solid ${Cclr.red}`,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <CMascot size={36}/>
          <div>
            <div style={{ font:'900 18px/1 "Bungee"' }}>STATS!MASTER</div>
            <div style={{ font:'700 9px/1 "JetBrains Mono"', letterSpacing:'0.2em', color:'#aab3cf' }}>ARCADE MODE</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
          {MOCK.players.map((p,i) => {
            const me = p.name===MOCK.players_me;
            return (
              <div key={p.name} style={{
                background: me ? Cclr.red : '#1c2744',
                border:`2px solid ${me ? '#fff' : '#2b3a63'}`, borderRadius:10, padding:'6px 10px',
                display:'flex', alignItems:'center', gap:8,
              }}>
                <AvatarBlock initials={p.avatar} bg={me?'#fff':Cclr.navy} fg={me?Cclr.red:'#fff'} size={22}/>
                <div>
                  <div style={{ font:'800 10px/1 "Archivo Black"' }}>#{p.rank} {p.name.slice(0,9)}</div>
                  <div style={{ font:'900 13px/1 "Bungee"', color:'#fff' }}>{p.score}</div>
                </div>
                {p.streak>1 && <span style={{ font:'900 11px/1 "Bungee"', color:Cclr.yellow, marginLeft:4 }}>×{p.streak}</span>}
              </div>
            );
          })}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ background:Cclr.yellow, color:Cclr.ink, border:`2px solid #fff`, borderRadius:10, padding:'6px 12px', font:'900 13px/1 "Bungee"' }}>⚡ 2× POWER PLAY · 0:14</div>
        </div>
      </div>

      <div style={{ position:'relative', padding:'28px 36px' }}>
        {/* Question bar + clock */}
        <div style={{ display:'grid', gridTemplateColumns:'auto 1fr auto', gap:18, alignItems:'center', marginBottom:22 }}>
          <div style={{ background:'#fff', border:`3px solid ${Cclr.ink}`, borderRadius:16, padding:'10px 18px', boxShadow:`0 4px 0 ${Cclr.ink}`, display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ background:Cclr.red, color:'#fff', border:`2px solid ${Cclr.ink}`, borderRadius:8, padding:'4px 10px', font:'900 12px/1 "Archivo Black"', letterSpacing:'0.16em' }}>Q {MOCK.question.num}/{MOCK.question.total}</span>
            <span style={{ font:'900 20px/1 "Bungee"' }}>WHO'S THIS?</span>
            <span style={{ background:Cclr.ice, border:`2px solid ${Cclr.ink}`, borderRadius:8, padding:'4px 10px', font:'900 11px/1 "Archivo Black"', letterSpacing:'0.18em', color:Cclr.navy }}>EASY</span>
          </div>
          <div style={{ display:'flex', justifyContent:'center' }}>
            {/* Streak booster */}
            <div style={{
              background:'#fff', border:`3px solid ${Cclr.ink}`, borderRadius:99, padding:'8px 16px', display:'flex', alignItems:'center', gap:10,
              boxShadow:`0 4px 0 ${Cclr.ink}`,
              position:'relative',
            }}>
              <span style={{ fontSize:18 }}>🔥</span>
              <span style={{ font:'900 12px/1 "Archivo Black"', letterSpacing:'0.16em' }}>COMBO</span>
              <span style={{ font:'900 24px/1 "Bungee"', color:Cclr.red }}>×4</span>
              <span style={{ font:'700 10px/1 "JetBrains Mono"', letterSpacing:'0.16em', color:'#35415f' }}>ON FIRE</span>
            </div>
          </div>
          <div style={{ position:'relative', width:100, height:100 }}>
            <svg width="100" height="100" style={{ transform:'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="44" stroke={Cclr.ice2} strokeWidth="8" fill="#fff"/>
              <circle cx="50" cy="50" r="44" stroke={Cclr.red} strokeWidth="8" fill="none" strokeDasharray={2*Math.PI*44} strokeDashoffset={2*Math.PI*44*0.34} strokeLinecap="round"/>
            </svg>
            <div style={{ position:'absolute', inset:0, display:'grid', placeItems:'center', font:'900 40px/1 "Bungee"', color:Cclr.red }}>8</div>
          </div>
        </div>

        {/* Stat tiles — jumbotron LED inside puffy arcade shell */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14 }}>
          {MOCK.stats.map(s => {
            const panelBg = s.highlight ? Cclr.red : Cclr.navy;
            const glow   = s.highlight ? '#ffe4e8' : '#dce8ff';
            const ledColor = s.highlight ? '#ffe4e8' : '#dce8ff';
            const dotColor = s.highlight ? '#ffbcc5' : '#6b8bff';
            const ledSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'><circle cx='4' cy='4' r='1.1' fill='${encodeURIComponent(dotColor)}' opacity='0.38'/></svg>`.replace(/#/g,'%23');
            return (
              <div key={s.k} style={{
                background:'#fff', border:`3px solid ${Cclr.ink}`, borderRadius:16,
                boxShadow:`0 6px 0 ${Cclr.ink}`,
                padding:8, position:'relative', overflow:'hidden',
              }}>
                {s.highlight && <div style={{ position:'absolute', top:-6, right:-6, zIndex:3, background:Cclr.yellow, color:Cclr.ink, border:`2px solid ${Cclr.ink}`, borderRadius:8, padding:'2px 6px', font:'900 10px/1 "Archivo Black"', transform:'rotate(10deg)' }}>HOT!</div>}
                {/* Inner jumbotron panel */}
                <div style={{
                  background: `linear-gradient(180deg, ${panelBg} 0%, ${panelBg} 70%, rgba(0,0,0,0.35) 100%)`,
                  border:`2px solid ${Cclr.ink}`,
                  borderRadius:10, padding:'14px 8px 10px',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:8,
                  position:'relative', overflow:'hidden',
                  boxShadow:`inset 0 2px 0 rgba(255,255,255,0.18), inset 0 -10px 20px rgba(0,0,0,0.25)`,
                }}>
                  {/* dot-matrix overlay */}
                  <div style={{ position:'absolute', inset:0, backgroundImage:`url("data:image/svg+xml;utf8,${ledSvg}")`, backgroundSize:'8px 8px', mixBlendMode:'screen', opacity:0.55 }}/>
                  {/* LED key chip */}
                  <div style={{
                    position:'relative', zIndex:1,
                    background:'rgba(0,0,0,0.28)', color: ledColor,
                    padding:'3px 10px', borderRadius:4,
                    font:'900 11px/1 "Archivo Black"', letterSpacing:'0.28em',
                    border:`1px solid ${ledColor}44`,
                  }}>{s.k}</div>
                  {/* LED number */}
                  <div style={{
                    position:'relative', zIndex:1,
                    font:`900 54px/0.9 "VT323", "JetBrains Mono", monospace`,
                    color: ledColor, letterSpacing:'0.06em',
                    fontVariantNumeric:'tabular-nums',
                    textShadow:`0 0 8px ${glow}, 0 0 18px ${glow}cc, 0 0 32px ${glow}88`,
                  }}>{s.v}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Choices */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:20 }}>
          {MOCK.choices.map((c,i) => {
            const sel = i===2;
            const elim = i===1;
            const colors = [Cclr.red, Cclr.navy, Cclr.green, Cclr.yellow];
            const bg = sel ? Cclr.navy : elim ? '#d9d9e6' : '#fff';
            return (
              <button key={c} disabled={elim} style={{
                background: bg, color: sel ? '#fff' : Cclr.ink,
                border:`3px solid ${Cclr.ink}`, borderRadius:16, padding:'16px 18px',
                boxShadow: sel ? `0 6px 0 ${Cclr.ink}` : `0 5px 0 ${Cclr.ink}`,
                textAlign:'left', cursor: elim ? 'not-allowed' : 'pointer',
                opacity: elim ? 0.5 : 1, position:'relative', display:'flex', alignItems:'center', gap:14,
              }}>
                <div style={{
                  width:48, height:48, background: colors[i], color:'#fff',
                  border:`2.5px solid ${Cclr.ink}`, borderRadius:12, display:'grid', placeItems:'center',
                  font:'900 22px/1 "Bungee"'
                }}>{String.fromCharCode(65+i)}</div>
                <div style={{ flex:1 }}>
                  <div style={{ font:'900 22px/1 "Bungee"' }}>{c}</div>
                  <div style={{ font:'700 11px/1 "JetBrains Mono"', letterSpacing:'0.16em', opacity:0.7, marginTop:4 }}>
                    {i===0?'EDM · C · 1997–':i===1?'✂ ELIMINATED':i===2?'🎯 YOUR PICK':'BOS · C · 1963–81'}
                  </div>
                </div>
                {sel && <span style={{ background:Cclr.yellow, color:Cclr.ink, border:`2px solid ${Cclr.ink}`, borderRadius:8, padding:'4px 10px', font:'900 10px/1 "Archivo Black"', letterSpacing:'0.18em', transform:'rotate(4deg)' }}>LOCKED ✓</span>}
                {elim && <span style={{ fontSize:22 }}>✂</span>}
              </button>
            );
          })}
        </div>

        {/* Bottom row: powerups | penalty box | hints */}
        <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr 1fr', gap:14, marginTop:20 }}>
          {/* Powerups */}
          <div style={{ background:'#fff', border:`3px solid ${Cclr.ink}`, borderRadius:16, padding:14, boxShadow:`0 5px 0 ${Cclr.ink}` }}>
            <div style={{ font:'900 14px/1 "Bungee"', marginBottom:10 }}>⚡ Powerups</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
              {MOCK.powerups.map((p,i) => {
                const active = p.k==='dbl';
                const bgs = [Cclr.red, Cclr.yellow, Cclr.navy, Cclr.green];
                return (
                  <button key={p.k} style={{
                    background: active ? bgs[i] : '#fff', color: active ? (bgs[i]===Cclr.yellow?Cclr.ink:'#fff') : Cclr.ink,
                    border:`2.5px solid ${Cclr.ink}`, borderRadius:12, padding:'10px 6px', cursor:'pointer',
                    display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                    boxShadow: active ? `0 4px 0 ${Cclr.ink}` : `0 2px 0 ${Cclr.ink}44`,
                    position:'relative',
                  }}>
                    <span style={{ position:'absolute', top:-8, right:-8, background:Cclr.red, color:'#fff', width:22, height:22, borderRadius:'50%', font:'900 11px/1 "Bungee"', display:'grid', placeItems:'center', border:`2px solid ${Cclr.ink}` }}>{p.n}</span>
                    <span style={{ font:'900 22px/1 "Bungee"' }}>{p.icon}</span>
                    <span style={{ font:'900 10px/1 "Archivo Black"', letterSpacing:'0.1em' }}>{p.label.toUpperCase()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Penalty box */}
          <div style={{ background:Cclr.ink, color:'#fff', border:`3px solid ${Cclr.ink}`, borderRadius:16, padding:14, boxShadow:`0 5px 0 ${Cclr.red}`, position:'relative', overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <span style={{ background:Cclr.red, color:'#fff', padding:'3px 8px', borderRadius:6, font:'900 10px/1 "Archivo Black"', letterSpacing:'0.2em' }}>🚫 PENALTY BOX</span>
              <span style={{ font:'900 12px/1 "Bungee"', color:Cclr.yellow }}>02:00</span>
            </div>
            {/* Bars of a penalty box */}
            <div style={{ position:'relative', background:'#1c2744', border:`2px solid ${Cclr.red}`, borderRadius:10, padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ position:'absolute', inset:0, backgroundImage:`repeating-linear-gradient(90deg, transparent 0 14px, ${Cclr.red}66 14px 16px)`, borderRadius:10, pointerEvents:'none' }}/>
              <AvatarBlock initials="BB" bg={Cclr.red} size={36} style={{ border:`2px solid #fff`, position:'relative', zIndex:1 }}/>
              <div style={{ position:'relative', zIndex:1 }}>
                <div style={{ font:'900 13px/1 "Bungee"' }}>BluelineBo</div>
                <div style={{ font:'700 10px/1 "JetBrains Mono"', letterSpacing:'0.14em', color:'#aab3cf' }}>WRONG ANSWER · 2 ROUNDS</div>
              </div>
            </div>
          </div>

          {/* Hints + Rink toast */}
          <div style={{ background:'#fff', border:`3px solid ${Cclr.ink}`, borderRadius:16, padding:14, boxShadow:`0 5px 0 ${Cclr.ink}` }}>
            <div style={{ font:'900 14px/1 "Bungee"', marginBottom:10 }}>💡 Hints <span style={{font:'700 9px/1 "JetBrains Mono"', letterSpacing:'0.18em', color:'#5a6c8f'}}>· SHARED</span></div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {MOCK.hints.map(h => (
                <button key={h.k} style={{ background:Cclr.ice, color:Cclr.ink, border:`2px solid ${Cclr.ink}`, borderRadius:99, padding:'6px 12px', font:'900 11px/1 "Archivo Black"', letterSpacing:'0.14em', cursor:'pointer' }}>+ {h.label.toUpperCase()}</button>
              ))}
            </div>
            <div style={{ marginTop:12, background:Cclr.yellow, border:`2px solid ${Cclr.ink}`, borderRadius:10, padding:'8px 10px', font:'900 11px/1 "Archivo Black"', letterSpacing:'0.12em' }}>🚜 ZAMBONI INCOMING · NEXT Q IN 0:08</div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CLanding, CSetup, CLobby, CGame });
