"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, LockKeyhole } from "lucide-react";
import type { PublicGame } from "../lib/game";
import { OFFICES } from "../lib/board";
import { hierarchy } from "../lib/offices";
import { networkAt } from "../lib/mansion";
import { leaderAt } from "../lib/strategy";

export default function NetworkPanel({ game, onVisit }: { game: PublicGame; onVisit: () => void }) {
  const contacts=networkAt(game), [page,setPage]=useState(0), [selected,setSelected]=useState("");
  const pages=Math.max(1,Math.ceil(contacts.length/4)), current=Math.min(page,pages-1), visible=contacts.slice(current*4,current*4+4);
  const target=contacts.find(c=>c.key===selected) ?? visible[0], leader=leaderAt(game,game.viewer), relation=hierarchy(game);
  const points=[[64,53],[296,53],[64,183],[296,183]];
  return <section className="network-panel" aria-label="我的关系势力网">
    <div className="room-section-title"><h2>关系 · 势力</h2><span><LockKeyhole size={12}/>仅你可见</span></div>
    <div className="network-summary"><span>往来 <b>{contacts.filter(c=>c.favor>0).length}</b> 衙</span><span>人情达标 <b>{contacts.filter(c=>c.ready).length}</b> 衙</span><small>本衙人情才用于当前举荐</small></div>
    <svg className="relationship-map" viewBox="0 0 360 240" role="group" aria-label="点选官署查看你的人情往来">
      <circle cx="180" cy="117" r="90" fill="none" stroke="currentColor" strokeDasharray="2 7" opacity=".16"/>
      {visible.map((c,i)=>{const [x,y]=points[i];return <g key={c.key}>
        <path d={`M180 117 Q${x} 117 ${x} ${y}`} fill="none" stroke={c.ready?"#497b68":"#b39a77"} strokeWidth={1+c.favor*.6} strokeDasharray={c.favor?undefined:"4 5"}/>
        <g role="button" tabIndex={0} aria-label={c.name+"，你的人情 "+c.favor+" / 6"} onClick={()=>setSelected(c.key)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setSelected(c.key);}}} className={target?.key===c.key?"selected":""}>
          <rect x={x-51} y={y-26} width="102" height="54" rx="13" fill="#fcf7ea" stroke={target?.key===c.key?"#a3392c":"#cab693"} strokeWidth={target?.key===c.key?2:1}/>
          <text x={x} y={y-5} textAnchor="middle">{c.name}</text><text className="network-value" x={x} y={y+15} textAnchor="middle">{c.favor} / 6 · {c.current?"本衙":c.ready?"交情深厚":"旧衙往来"}</text>
        </g></g>;})}
      <circle cx="180" cy="117" r="34" fill={game.viewer===0?"#963c2f":"#386d66"}/><circle cx="180" cy="117" r="29" fill="none" stroke="#e4d1a9" strokeWidth=".8"/>
      <text x="180" y="113" textAnchor="middle" className="network-self">{[...game.self.name].slice(0,4).join("")}</text><text x="180" y="132" textAnchor="middle" className="network-self-sub">我的府邸</text>
      {!contacts.length&&<text x="180" y="208" textAnchor="middle" className="network-value">入仕拜谒后，人情连线将在这里展开</text>}
    </svg>
    <div className="network-focus">{target ? <><div><b>{target.name} · {target.favor>=target.threshold?"可供举荐":"尚待经营"}</b><span>{target.current && leader ? leader.office.name+" · "+leader.personality.name : "旧衙人情保留，回到该衙后可用。"}</span><small>{game.self.risk>=3 ? "你当前嫌疑过高，先自省再谋举荐。" : "举荐需 "+target.threshold+" 人情；主官轮调会使各衙人情衰减。"}</small></div>{target.current&&leader&&<button onClick={onVisit}>去拜谒 ↗</button>}</> : <p>你的关系网尚未展开。先办差、取功名，再入仕结交主官。</p>}</div>
    <div className="network-pagination"><button disabled={current===0} onClick={()=>setPage(current-1)} aria-label="上一组关系"><ChevronLeft size={16}/></button><span>{current+1} / {pages}</span><button disabled={current===pages-1} onClick={()=>setPage(current+1)} aria-label="下一组关系"><ChevronRight size={16}/></button></div>
    <p className="network-rival">{relation ? "公开关系：你与"+game.players[1-game.viewer].name+"同在"+relation.department+"，你是"+(relation.senior===game.viewer?"上级，可施压":"下级，可申辩")+"。" : "与知己各自经营；地方官不成立玩家间上下级。"} 对方的关系网保密。</p>
  </section>;
}
