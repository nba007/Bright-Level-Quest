import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Heart, Pause, Play, RotateCcw } from 'lucide-react';
import World3D from '@/game/World3D';

type Vec = { x: number; z: number };
type Hazard = { x: number; z: number; range: number; speed: number; phase: number };
type LevelSpec = { title: string; subtitle: string; stars: Vec[]; rocks: Vec[]; hazards: Hazard[]; tint: string; difficulty: string };
type SceneMode = 'intro' | 'playing' | 'paused' | 'level' | 'lost' | 'won';

const LEVELS: LevelSpec[] = [
  { title: 'Meadow Morning', subtitle: 'A sunny stroll to get your paws moving.', stars: [{ x: -2.3, z: 1.6 }, { x: 0, z: 0 }, { x: 2.1, z: -1.8 }], rocks: [], hazards: [], tint: '#92c875', difficulty: 'A gentle beginning' },
  { title: 'Fernwood Crossing', subtitle: 'Watch your step around the mossy boulders.', stars: [{ x: -2.8, z: 1.3 }, { x: -1.1, z: -.7 }, { x: 1, z: .8 }, { x: 2.7, z: -1.6 }], rocks: [{ x: -.2, z: 1.1 }, { x: .6, z: -.9 }], hazards: [{ x: 1.35, z: -.2, range: 1.2, speed: 1.4, phase: 0 }], tint: '#80bb78', difficulty: 'A little twisty' },
  { title: 'Tidepool Terrace', subtitle: 'Bouncy crabs patrol the winding island.', stars: [{ x: -2.7, z: 1.8 }, { x: -1.6, z: -.3 }, { x: -.1, z: 1.1 }, { x: 1.3, z: -.6 }, { x: 2.8, z: -1.8 }], rocks: [{ x: -.8, z: 1.1 }, { x: .2, z: -.6 }, { x: 1.8, z: .3 }], hazards: [{ x: -1, z: 1.8, range: 1.05, speed: 1.8, phase: 0 }, { x: 1.7, z: -1.5, range: .9, speed: 1.3, phase: 2 }], tint: '#73ad82', difficulty: 'Mind the movers' },
  { title: 'Cloudcap Summit', subtitle: 'One last zigzag. Pip can do this!', stars: [{ x: -2.8, z: 1.6 }, { x: -2, z: -.2 }, { x: -.7, z: .7 }, { x: .3, z: -1.1 }, { x: 1.7, z: .2 }, { x: 2.7, z: -1.8 }], rocks: [{ x: -1.5, z: 1.2 }, { x: -.3, z: -.5 }, { x: .9, z: .8 }, { x: 2.1, z: -.7 }], hazards: [{ x: -1.1, z: 0, range: 1.1, speed: 2, phase: .5 }, { x: .9, z: -1.7, range: 1.1, speed: 1.7, phase: 2 }, { x: 2, z: 1, range: .85, speed: 2.1, phase: 4 }], tint: '#70a990', difficulty: 'A starry challenge' },
];
const START: Vec = { x: -3.75, z: 3.05 };
const FINISH: Vec = { x: 3.7, z: -3.0 };
const pressed = new Set<string>();
let jumpUntilGlobal = 0;

function Scene({ levelIndex, resetId, mode, onCollect, onHit, onExit, onTouch }: { levelIndex:number; resetId:number; mode:SceneMode; onCollect:()=>void; onHit:()=>void; onExit:()=>void; onTouch:(key:string,down:boolean)=>void }) {
  const gameRef=useRef({player:{...START},stars:LEVELS[levelIndex].stars.map(s=>({...s})),hitUntil:0,elapsed:0,jump:0});
  const callbacks=useRef({onCollect,onHit,onExit});callbacks.current={onCollect,onHit,onExit};
  const [notice,setNotice]=useState('');
  useEffect(()=>{
    gameRef.current={player:{...START},stars:LEVELS[levelIndex].stars.map(s=>({...s})),hitUntil:0,elapsed:0,jump:0};
    setNotice('');
  },[levelIndex,resetId]);
  useEffect(()=>{
    if(mode!=='playing')return;
    let raf=0,last=performance.now(),live=true;
    const tick=(now:number)=>{
      if(!live)return;const dt=Math.min((now-last)/1000,.04);last=now;const g=gameRef.current;g.elapsed+=dt;
      const up=pressed.has('ArrowUp')||pressed.has('KeyW')||pressed.has('touch-up');
      const down=pressed.has('ArrowDown')||pressed.has('KeyS')||pressed.has('touch-down');
      const left=pressed.has('ArrowLeft')||pressed.has('KeyA')||pressed.has('touch-left');
      const right=pressed.has('ArrowRight')||pressed.has('KeyD')||pressed.has('touch-right');
      const len=Math.hypot(Number(right)-Number(left),Number(down)-Number(up))||1, speed=3.3;
      let nx=Math.max(-4.65,Math.min(4.65,g.player.x+(Number(right)-Number(left))/len*speed*dt));
      let nz=Math.max(-3.65,Math.min(3.65,g.player.z+(Number(down)-Number(up))/len*speed*dt));
      const rocks=LEVELS[levelIndex].rocks;
      const blocked=rocks.some(r=>Math.abs(nx-r.x)<.48&&Math.abs(nz-r.z)<.48);
      if(!blocked){g.player.x=nx;g.player.z=nz}
      const jumping=now<jumpUntilGlobal, jump=jumping?Math.sin(Math.PI*(1-(jumpUntilGlobal-now)/620))*.58:0;
      g.jump=jump;
      const level=LEVELS[levelIndex];
      for(let i=g.stars.length-1;i>=0;i--)if(Math.hypot(g.player.x-g.stars[i].x,g.player.z-g.stars[i].z)<.52){g.stars.splice(i,1);callbacks.current.onCollect();setNotice('Star-fruit collected!');window.setTimeout(()=>setNotice(''),900)}
      if(now>g.hitUntil){
        const hit=level.hazards.some(h=>Math.hypot(g.player.x-(h.x+Math.sin(g.elapsed*h.speed+h.phase)*h.range),g.player.z-h.z)<.46);
        if(hit&&!jumping){g.hitUntil=now+1550;g.player={...START};callbacks.current.onHit();setNotice('Oof! Back to the start.');window.setTimeout(()=>setNotice(''),1100)}
      }
      if(g.stars.length===0&&Math.hypot(g.player.x-FINISH.x,g.player.z-FINISH.z)<.7){callbacks.current.onExit()}
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return()=>{live=false;cancelAnimationFrame(raf)};
  },[mode,levelIndex]);
  const keyDown=(e:PointerEvent<HTMLButtonElement>)=>{e.preventDefault();onTouch(e.currentTarget.getAttribute('data-key')||'',true)};
  const keyUp=(e:PointerEvent<HTMLButtonElement>)=>{onTouch(e.currentTarget.getAttribute('data-key')||'',false)};
  return <div className="scene-holder">
    <World3D level={LEVELS[levelIndex]} gameState={gameRef} running={mode==='playing'} />
    <div className="scene-vignette" />
    <div className="scene-label">Pip’s island · {String(levelIndex+1).padStart(2,'0')}</div>
    <div className="scene-tip">{mode==='playing'?'Collect every star-fruit, then find the portal':'Ready when you are'}</div>
    {notice&&mode==='playing'&&<div className="toast-line" role="status" data-testid="status-game-event">{notice}</div>}
    <div className="touch-controls" aria-label="Touch movement controls">
      <button className="touch-pad" data-key="touch-left" aria-label="Move left" data-testid="button-touch-left" onPointerDown={keyDown} onPointerUp={keyUp} onPointerLeave={keyUp}><ArrowLeft size={18}/></button>
      <div style={{display:'flex',flexDirection:'column',gap:5}}>
        <button className="touch-pad" data-key="touch-up" aria-label="Move up" data-testid="button-touch-up" onPointerDown={keyDown} onPointerUp={keyUp} onPointerLeave={keyUp}><ArrowUp size={18}/></button>
        <button className="touch-pad" data-key="touch-down" aria-label="Move down" data-testid="button-touch-down" onPointerDown={keyDown} onPointerUp={keyUp} onPointerLeave={keyUp}><ArrowDown size={18}/></button>
      </div>
      <button className="touch-pad" data-key="touch-right" aria-label="Move right" data-testid="button-touch-right" onPointerDown={keyDown} onPointerUp={keyUp} onPointerLeave={keyUp}><ArrowRight size={18}/></button>
      <button className="touch-pad jump" aria-label="Jump" data-testid="button-touch-jump" onPointerDown={()=>onTouch('Space',true)} onPointerUp={()=>onTouch('Space',false)} onPointerLeave={()=>onTouch('Space',false)}>JUMP</button>
    </div>
  </div>;
}

function App() {
  const [mode,setMode]=useState<SceneMode>('intro');
  const [levelIndex,setLevelIndex]=useState(0);
  const [resetId,setResetId]=useState(0);
  const [stars,setStars]=useState(0);
  const [lives,setLives]=useState(3);
  const collectedRef=useRef(0);
  const level=LEVELS[levelIndex];
  const begin=useCallback(()=>{setLevelIndex(0);setResetId(v=>v+1);setStars(0);setLives(3);collectedRef.current=0;setMode('playing')},[]);
  const resetLevel=useCallback(()=>{setResetId(v=>v+1);collectedRef.current=0;setStars(0);setLives(3);setMode('playing')},[]);
  const onCollect=useCallback(()=>{collectedRef.current+=1;setStars(collectedRef.current)},[]);
  const onHit=useCallback(()=>setLives(v=>Math.max(0,v-1)),[]);
  const onExit=useCallback(()=>setMode(m=>m==='playing'?(levelIndex===LEVELS.length-1?'won':'level'):m),[levelIndex]);
  useEffect(()=>{
    const down=(e:KeyboardEvent)=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();pressed.add(e.code);if(e.code==='Space'&&mode==='playing')jumpUntilGlobal=performance.now()+620};
    const up=(e:KeyboardEvent)=>pressed.delete(e.code);
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);
    return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);pressed.clear()};
  },[mode]);
  useEffect(()=>{if(lives===0&&mode==='playing')setMode('lost')},[lives,mode]);
  const touchJump=useCallback((key:string,down:boolean)=>{
    if(key==='Space'&&down){pressed.add('Space');jumpUntilGlobal=performance.now()+620}
    else if(key==='Space'){pressed.delete('Space')}
    else if(down)pressed.add(key);else pressed.delete(key);
  },[]);
  const advance=()=>{setLevelIndex(i=>i+1);collectedRef.current=0;setStars(0);setMode('playing')};
  const progress=level.stars.length?stars/level.stars.length:0;
  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark" aria-hidden="true"/><span>BRIGHT 3D ADVENTURE</span></div>
      <div className="top-meta"><span className="live-dot"/><span>One little island at a time</span></div>
    </header>
    <div className="game-wrap">
      <section className="play-panel" aria-label="Bright 3D Adventure game">
        <div className="game-head">
          <div className="level-heading"><span className="level-chip">LEVEL {String(levelIndex+1).padStart(2,'0')}</span><div><h2>{level.title}</h2><div className="level-sub">{level.difficulty}</div></div></div>
          <div className="head-stats">
            <div className="stat"><span className="stat-label">Star-fruit</span><span className="stat-value fruit-count" data-testid="text-star-progress">{stars} <span style={{color:'#a0a99c',fontWeight:700}}>/ {level.stars.length}</span></span></div>
            <div className="stat"><span className="stat-label">Pip’s lives</span><span className="stat-value lives" data-testid="text-lives">{Array.from({length:3},(_,i)=><Heart key={i} size={13} fill={i<lives?'#d97869':'#e6ded2'} stroke="none" style={{display:'inline',verticalAlign:'-2px',marginRight:2}}/>)}</span></div>
            {(mode==='playing'||mode==='paused')&&<button className="icon-btn" onClick={()=>setMode(m=>m==='paused'?'playing':m==='playing'?'paused':m)} aria-label={mode==='paused'?'Resume game':'Pause game'} data-testid="button-pause-top">{mode==='paused'?<Play/>:<Pause/>}</button>}
          </div>
        </div>
        <Scene levelIndex={levelIndex} resetId={resetId} mode={mode} onCollect={onCollect} onHit={onHit} onExit={onExit} onTouch={touchJump}/>
        <div className="bottom-bar"><div className="objective"><span className="objective-star"/><span>{stars===level.stars.length?'The portal is open! Find it.':'Collect all the star-fruit to open the portal'}</span></div><span className="control-note">ARROWS / WASD&nbsp; · &nbsp;SPACE TO JUMP</span></div>
        {mode==='intro'&&<div className="game-overlay"><div className="modal-card">
          <div className="modal-kicker">A tiny island quest</div><h1>Bright 3D<br/>Adventure</h1>
          <div className="pip-art" aria-hidden="true"><span className="pip-leaf"/><span className="pip-body"/></div>
          <p>Help Pip gather every star-fruit and find the glowing way home. Four islands are waiting.</p>
          <button className="primary-btn" onClick={begin} data-testid="button-start">Let’s go</button>
          <div className="instructions"><span className="keycap">W A S D</span><span className="keycap">ARROWS</span><span className="keycap">SPACE</span></div>
          <div className="key-help">Move around · Jump over the wiggly critters</div>
        </div></div>}
        {mode==='paused'&&<div className="game-overlay"><div className="modal-card"><div className="modal-kicker">Take your time</div><h2>Adventure paused</h2><p>Pip is right where you left them. Ready to keep exploring?</p><div className="button-row"><button className="primary-btn" onClick={()=>setMode('playing')} data-testid="button-resume">Keep going</button><button className="secondary-btn" onClick={resetLevel} data-testid="button-restart-paused">Start this island over</button></div></div></div>}
        {mode==='level'&&<div className="game-overlay"><div className="modal-card"><div className="modal-kicker">Island {levelIndex+1} complete</div><h2>Lovely exploring!</h2><p>Pip found every star-fruit. The next island has a new little challenge.</p><div className="button-row"><button className="primary-btn" onClick={advance} data-testid="button-continue">Next island</button><button className="secondary-btn" onClick={resetLevel} data-testid="button-replay-level">Play again</button></div></div></div>}
        {mode==='lost'&&<div className="game-overlay"><div className="modal-card"><div className="modal-kicker">A little tumble</div><h2>Let’s try again</h2><p>Pip’s feeling better already. This island will be easier on the second try.</p><div className="button-row"><button className="primary-btn" onClick={resetLevel} data-testid="button-try-again">Try again</button><button className="secondary-btn" onClick={()=>setMode('intro')} data-testid="button-home-lost">Back to beginning</button></div></div></div>}
        {mode==='won'&&<div className="game-overlay"><div className="modal-card"><div className="modal-kicker">All four islands, all star-fruit</div><h2>You did it, Pip!</h2><p>Every last star-fruit is home. You’re a brilliant island explorer.</p><div className="button-row"><button className="primary-btn" onClick={begin} data-testid="button-play-again">Explore again</button></div></div></div>}
      </section>
      <aside className="side-panel">
        <div><h3 className="side-title">Your little quest</h3><h2 className="quest-title">{stars===level.stars.length?'Portal unlocked':'Gather the star-fruit'}</h2><p className="quest-desc">{stars===level.stars.length?'Everything is collected. Head to the bright portal to move on.':level.subtitle}</p>
          <div className="progress-wrap"><div className="progress-label"><span>ISLAND PROGRESS</span><span>{Math.round(progress*100)}%</span></div><div className="progress-track"><div className="progress-fill" style={{width:`${progress*100}%`}}/></div></div>
        </div>
        <div className="divider"/>
        <div><h3 className="side-title">The islands</h3><div className="level-list">{LEVELS.map((item,i)=><div key={item.title} className={`level-row ${i===levelIndex?'active':''} ${i<levelIndex?'done':''}`} data-testid={`row-level-${i+1}`}><span className="level-num">{i<levelIndex?'✓':String(i+1).padStart(2,'0')}</span><div className="level-info"><div className="level-name">{item.title}</div><div className="level-difficulty">{item.difficulty}</div></div>{i<levelIndex&&<span className="level-state">Done</span>}</div>)}</div></div>
        <div className="divider"/>
        <div><div className="controls-title">A few helpful moves</div><div className="control-grid"><div className="control-item"><span className="control-icon">WASD</span>Move Pip</div><div className="control-item"><span className="control-icon">↑↓←→</span>Move Pip</div><div className="control-item"><span className="control-icon">SPACE</span>Jump</div><div className="control-item"><span className="control-icon">TAP</span>Touch pad</div></div></div>
         <div className="side-bottom"><span>MADE FOR CURIOUS EXPLORERS</span><div className="side-actions">{(mode==='playing'||mode==='paused')&&<button className="icon-btn" onClick={()=>setMode(m=>m==='paused'?'playing':m==='playing'?'paused':m)} aria-label={mode==='paused'?'Resume game':'Pause game'} data-testid="button-pause">{mode==='paused'?<Play/>:<Pause/>}</button>}<button className="icon-btn" onClick={resetLevel} aria-label="Restart this island" data-testid="button-restart"><RotateCcw/></button></div></div>
      </aside>
    </div>
  </main>;
}

export default App;
