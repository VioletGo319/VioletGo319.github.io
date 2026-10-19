"use client";
import { useRef, useState } from "react";
import { Crosshair, Minus, Plus, Search, Maximize2, Route, X } from "lucide-react";
import { BOARD_COUNT, BOARD_HEIGHT, BOARD_WIDTH, FACES, GROUPS, HOME_ID, OFFICES, actionsAt, officeCenter, officeRect } from "../lib/board";
import type { PublicGame, Seat } from "../lib/game";
import { exclusiveOffice, OFFICE_SCOPE } from "../lib/offices";
import { rollPreview } from "../lib/strategy";
const colors = { 德:"#a6372b", 才:"#386d66", 功:"#987232", 赃:"#726a65" };
function Official({ x, y }: { x:number;y:number }) {
  return <g transform={"translate("+x+","+y+")"} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
    <path d="M-13-37h26v9h-26zM-25-32h12m26 0h12M-10-28c-3 13 0 21 10 23 10-2 13-10 10-23M-10-9l-11 9-13 42 13 5 6-25-4 52h38l-4-52 6 25 13-5L21 0 10-9M-9-8L0 11 9-8M-15 24l30 10M15 24l-30 10M-5 12h10v18H-5zM-19 74h38M-15 75v6H-5v-6M5 75v6h10v-6"/>
    <path d="M-9-21h4m10 0h4M-3-12h6M-11 46l22 0M-10 57l20 0M-25 4l14 8M25 4l-14 8" opacity=".6"/>
  </g>;
}
export default function ExpandedBoard({ game, activeSeat, onDetail }: {game:PublicGame|null;activeSeat:Seat;onDetail:(id:number)=>void}) {
  const [zoom,setZoom]=useState(1),[mode,setMode]=useState<"map"|"read">("map"),[showRoutes,setShowRoutes]=useState(true);
  const [groupKey,setGroupKey]=useState("origin"),[query,setQuery]=useState("");
  const viewport=useRef<HTMLDivElement>(null);
  const drag=useRef<{x:number;y:number;left:number;top:number}|null>(null),moved=useRef(false);
  const pos=game?.players[activeSeat]?.pos??0;
  const source=officeCenter(pos), actions=game ? Object.fromEntries(FACES.map(f=>[f,rollPreview(game,activeSeat,f).action])) as ReturnType<typeof actionsAt> : actionsAt(pos);
  function centerAt(x:number,y:number,z:number) {
    setMode("map");setZoom(z);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const el=viewport.current;if(!el)return;
      el.scrollTo({left:x/BOARD_WIDTH*el.scrollWidth-el.clientWidth/2,top:y/BOARD_HEIGHT*el.scrollHeight-el.clientHeight/2,behavior:"smooth"});
    }));
  }
  function focusOffice(id:number) { const p=officeCenter(id);setGroupKey(OFFICES[id].group);centerAt(p.x,p.y,2.5); }
  function zoomBy(delta:number) {
    const el=viewport.current;if(!el)return;
    const x=(el.scrollLeft+el.clientWidth/2)/el.scrollWidth*BOARD_WIDTH;
    const y=(el.scrollTop+el.clientHeight/2)/el.scrollHeight*BOARD_HEIGHT;
    centerAt(x,y,Math.min(3.5,Math.max(1,zoom+delta)));
  }
  const group=GROUPS.find(g=>g.key===groupKey)??GROUPS[0];
  const matches=query.trim()?OFFICES.filter(o=>(o.department+o.name).includes(query.trim())).slice(0,12):[];
  return <div className="expanded-board">
    <div className="atlas-heading"><div><span className="atlas-title">升官全图</span><span className="edition-seal">群衙本</span></div><span>{BOARD_COUNT} 格 · 三层分区</span></div>
    <details className="occupation-legend"><summary>高位有主 · 占位规则</summary><p>{OFFICE_SCOPE}这些格位一职一人；被占时退至下一低位。地方官及其余低阶职位可同格，地方双方不算同衙。</p></details>
    <div className="atlas-toolbar">
      <div className="atlas-tabs"><button className={mode==="map"?"selected":""} onClick={()=>setMode("map")}>全图</button><button className={mode==="read"?"selected":""} onClick={()=>setMode("read")}>分衙阅读</button></div>
      <button onClick={()=>{setZoom(1);setMode("map");viewport.current?.scrollTo(0,0);}} title="适应全图" aria-label="适应全图"><Maximize2 size={15}/></button>
      <button onClick={()=>zoomBy(-.5)} disabled={mode!=="map"||zoom<=1} aria-label="缩小棋盘"><Minus size={15}/></button>
      <span className="zoom-label">{Math.round(zoom*100)}%</span>
      <button onClick={()=>zoomBy(.5)} disabled={mode!=="map"||zoom>=3.5} aria-label="放大棋盘"><Plus size={15}/></button>
      <button className={showRoutes?"active-tool":""} onClick={()=>setShowRoutes(!showRoutes)} aria-label="显示当前官职的升降路线" aria-pressed={showRoutes}><Route size={15}/></button>
    </div>
    <div className="atlas-find"><div><Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="查官职，如知县、吏部、太师" aria-label="搜索棋盘官职"/>{query&&<button aria-label="清除搜索" onClick={()=>setQuery("")}><X size={13}/></button>}</div><select value={groupKey} aria-label="选择衙门分区" onChange={e=>{setGroupKey(e.target.value);if(mode==="map"){const g=GROUPS.find(g=>g.key===e.target.value)!;centerAt(g.x+g.w/2,g.y+g.h/2,1.8);}}}>{GROUPS.map(g=><option key={g.key} value={g.key}>{g.name}</option>)}</select></div>
    {query&&<div className="atlas-results">{matches.length?matches.map(o=><button key={o.id} onClick={()=>{focusOffice(o.id);setQuery("");onDetail(o.id);}}><span>{o.name}</span><small>{o.department}</small></button>):<p>未找到这个官职，试试衙门名。</p>}</div>}
    {mode==="map"?<div ref={viewport} className={"atlas-viewport "+(zoom>1?"zoomed":"")} onPointerDown={e=>{
      moved.current=false;
      if(e.pointerType==="mouse"&&e.button===0&&zoom>1&&viewport.current){drag.current={x:e.clientX,y:e.clientY,left:viewport.current.scrollLeft,top:viewport.current.scrollTop};}
    }} onPointerMove={e=>{if(!drag.current||!viewport.current)return;const dx=e.clientX-drag.current.x,dy=e.clientY-drag.current.y;if(Math.abs(dx)+Math.abs(dy)>6)moved.current=true;viewport.current.scrollLeft=drag.current.left-dx;viewport.current.scrollTop=drag.current.top-dy;}}
    onPointerUp={()=>{drag.current=null;}} onPointerLeave={()=>{drag.current=null;}}
    onClickCapture={e=>{if(moved.current){e.preventDefault();e.stopPropagation();moved.current=false;}}}>
      <div className="atlas-canvas" style={{width:(zoom*100)+"%"}}>
        <svg viewBox={"-10 -10 "+(BOARD_WIDTH+20)+" "+(BOARD_HEIGHT+20)} className="full-board" role="group" aria-label="125格三层升官图，点击各官职查看判词">
          <defs>
            <pattern id="fine-paper" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="3" cy="7" r=".5" fill="#b0875d" opacity=".13"/><circle cx="9" cy="2" r=".4" fill="#b0875d" opacity=".15"/></pattern>
            {FACES.map(f=><marker key={f} id={"arrow-"+f} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill={colors[f]}/></marker>)}
          </defs>
          <rect x="-8" y="-8" width={BOARD_WIDTH+16} height={BOARD_HEIGHT+16} fill="#f7efdd" stroke="#a94f38" strokeWidth="3"/>
          <rect width={BOARD_WIDTH} height={BOARD_HEIGHT} fill="url(#fine-paper)"/>
          {GROUPS.map(g=><g key={g.key} className={"map-group "+g.layer}>
            <rect x={g.x} y={g.y} width={g.w} height={g.h} fill={g.layer==="middle"?"#f5ead535":g.layer==="center"?"#eedcc04d":"transparent"} stroke="#ab6047" strokeWidth="1.6"/>
            {g.key!=="home"&&<><rect x={g.x} y={g.y} width={g.w} height="28" fill="#a9412c" fillOpacity={g.layer==="origin"?.15:.09}/>
              <text x={g.x+g.w/2} y={g.y+19} textAnchor="middle" className="group-label">{g.name}</text></>}
          </g>)}
          {OFFICES.map(o=>{
            const r=officeRect(o.id),a=actionsAt(o.id),players=game?.players.map((p,seat)=>({...p,seat})).filter(p=>p.pos===o.id)||[];
            const occupied=exclusiveOffice(o.id)&&players.length>0;
            const isCourt=o.group==="court",isHome=o.id===HOME_ID;
            const compact=r.h<52, narrow=r.w<78,vertical=!compact&&(narrow||r.h>r.w*1.25);
            const here=pos===o.id, dest=showRoutes&&FACES.some(f=>actions[f].to===o.id&&o.id!==pos);
            return <g key={o.id} className={"map-office "+(here?"selected ":"")+(game?.lastRoll?.to===o.id?"landed ":"")+(isCourt?"court-office ":"")} role="button" tabIndex={0} aria-label={o.department+" "+o.name+(occupied?"，在任："+players[0].name+"，此位独占":"，"+(exclusiveOffice(o.id)?"独占空位":"允许同格"))+"，查看四种判词"} onClick={()=>onDetail(o.id)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onDetail(o.id);}}}>
              <rect x={r.x+.8} y={r.y+.8} width={r.w-1.6} height={r.h-1.6} fill={here?"#e5c99680":occupied?"#c5866940":players.length?"#cfb6864d":dest?"#dfe8d944":"transparent"} stroke={here?"#8b4931":occupied?"#a3392c":"#bb896d"} strokeWidth={here?3:occupied?2.5:.8}/>
              {isHome?<><text x={r.x+r.w/2} y={r.y+27} className="home-label" textAnchor="middle">荣 归 故 里</text><text x={r.x+r.w/2} y={r.y+46} textAnchor="middle" className="home-subtitle">唯太师逢德 · 功成归乡</text></>:
              isCourt?<><text x={r.x+r.w/2} y={r.y+36} textAnchor="middle" className="court-name">{o.name}</text><g style={{color:"#a24731"}}><Official x={r.x+r.w/2} y={r.y+108}/></g><text x={r.x+r.w/2} y={r.y+211} textAnchor="middle" className="court-rule">德 · {a.德.short}</text><text x={r.x+r.w/2} y={r.y+233} textAnchor="middle" className="court-rule muted-rule">才功赃 · 索贿留任</text></>:
              compact?<><text x={r.x+8} y={r.y+r.h/2+5} className="compact-name">{o.name}</text><text x={r.x+r.w-(occupied?32:7)} y={r.y+r.h/2+4} textAnchor="end" className="compact-rules">{occupied?"高位在任":"德↑ 才↗ 功留"}</text></>:
              vertical?<><text x={r.x+r.w/2} y={r.y+14} className="vertical-name" style={{writingMode:"vertical-rl",fontSize:o.group==="cabinet"?17:Math.min(21,(r.h-60)/o.name.length-1),letterSpacing:1}}>{o.name}</text>{o.group==="cabinet"?<text x={r.x+r.w/2} y={r.y+r.h-8} textAnchor="middle" className="micro-rule">点看判词</text>:FACES.map((f,i)=><text key={f} x={r.x+5} y={r.y+r.h-40+i*10} className="micro-rule">{f}·{a[f].short.length>5?a[f].short.slice(0,4)+"…":a[f].short}</text>)}</>:
              <><text x={r.x+r.w/2} y={r.y+Math.min(28,r.h*.38)} textAnchor="middle" className="horizontal-name">{o.name}</text>{FACES.map((f,i)=><text key={f} x={r.x+8+(i%2)*(r.w/2)} y={r.y+r.h-21+Math.floor(i/2)*12} className="micro-rule">{f}·{a[f].short.length>5?a[f].short.slice(0,4)+"…":a[f].short}</text>)}</>}
              {occupied&&!compact&&<g aria-hidden="true"><rect x={r.x+3} y={r.y+3} width="16" height="15" rx="2" fill="#a3392c"/><text x={r.x+11} y={r.y+14} textAnchor="middle" style={{fill:"#fff7e7",fontSize:10}}>占</text></g>}
              {players.map((p,i)=><g key={p.seat} transform={"translate("+(r.x+r.w-13-i*25)+","+(r.y+14)+")"} className="map-token"><circle r="12" fill={p.seat===0?"#a3392c":"#386d66"} stroke="#fff6df" strokeWidth="2"/><text textAnchor="middle" y="4" fill="#fff6df" fontSize="11">{p.seat===0?"朱":"青"}</text></g>)}
            </g>;
          })}
          {showRoutes&&pos!==HOME_ID&&FACES.map((face,i)=>{
            const target=actions[face].to;if(target===pos)return null;
            const dest=officeCenter(target),dx=dest.x-source.x,dy=dest.y-source.y;
            const midx=(source.x+dest.x)/2-dy*.12*(i%2?1:-1),midy=(source.y+dest.y)/2+dx*.12*(i%2?1:-1);
            const d="M"+source.x+","+source.y+" Q"+midx+","+midy+" "+dest.x+","+dest.y;
            const preview = game ? rollPreview(game, activeSeat, face) : null;
            const boosted = preview && preview.effectiveFace !== face;
            return <g key={face} pointerEvents="none" opacity=".9" className={boosted ? "boosted-route" : ""}><title>{face + (boosted ? "→" + preview.effectiveFace + " · " + preview.reason : "")}</title><path d={d} stroke="#fbf3e2" strokeWidth="6" fill="none"/><path d={d} stroke={colors[face]} strokeWidth={boosted ? 4.5 : 2.7} strokeDasharray={face==="赃"?"8 5":undefined} fill="none" markerEnd={"url(#arrow-"+face+")"}/><circle cx={dest.x} cy={dest.y} r={boosted ? 17 : 11} fill={colors[face]}/><text className="route-label" x={dest.x} y={dest.y+4} textAnchor="middle" fill="white" fontSize={boosted ? "10" : "12"}>{boosted ? face + "→" + preview.effectiveFace : face}</text></g>;
          })}
        </svg>
      </div>
    </div>:<div className="department-reader">
      <div className="reader-heading"><h3>{group.name}</h3><span>{group.ids.length} 个格位</span></div><p>{group.description}</p>
      <div className="reader-cells">{group.ids.map(id=>{const o=OFFICES[id],a=actionsAt(id);return <button key={id} className={id===pos?"here":""} onClick={()=>onDetail(id)}><strong>{o.name}{exclusiveOffice(id)&&<small className="reader-exclusive">独占</small>}{game?.players.filter(p=>p.pos===id).map((p,i)=><i key={i}>{p.name}</i>)}</strong><div>{FACES.map(f=><span key={f}><b style={{color:colors[f]}}>{f}</b>{a[f].label}</span>)}</div></button>;})}</div>
    </div>}
    <div className="atlas-bottom"><span>{mode==="map"?(zoom===1?"全图总览 · 放大或切换「分衙阅读」":"滑动 / 拖动棋盘 · 点官职看判词"):"逐格判词 · 点击查看去向与依据"}</span><button onClick={()=>focusOffice(pos)}><Crosshair size={13}/>{game?"定位执子":"定位白丁"}</button></div>
    {game&&<div className="position-strip">{game.players.map((p,seat)=><button key={seat} onClick={()=>focusOffice(p.pos)}><i className={"legend "+(seat===1?"teal":"red")}/><span>{p.name}</span><strong>{OFFICES[p.pos].department} · {OFFICES[p.pos].name}</strong><Crosshair size={12}/></button>)}</div>}
  </div>;
}
