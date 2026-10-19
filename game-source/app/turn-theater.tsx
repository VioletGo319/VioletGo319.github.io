"use client";
import { useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
import type { PublicGame } from "../lib/game";
import { OFFICES } from "../lib/board";
import { degreeInfo } from "../lib/scholar";

type Moment={title:string;subtitle:string;seal:string;tone:"gold"|"jade"|"red";deltas:{label:string;value:number;good:boolean}[]};
// Compare only the viewer's projection. Initial loads and other players' rolls
// never produce a private reward animation, including during hotseat handoffs.
export function personalMoment(previous:PublicGame|null,next:PublicGame):Moment|null {
  if(!previous||previous.match!==next.match||previous.viewer!==next.viewer)return null;
  const a=previous.self,b=next.self;
  const deltas=[{label:"银两",value:b.coins-a.coins,good:b.coins>a.coins},{label:"学识",value:b.learning-a.learning,good:b.learning>a.learning},{label:"政绩",value:b.merit-a.merit,good:b.merit>a.merit},{label:"嫌疑",value:b.risk-a.risk,good:b.risk<a.risk}].filter(d=>d.value!==0);
  const favor=Object.values(b.favor).reduce((s,v)=>s+v,0)-Object.values(a.favor).reduce((s,v)=>s+v,0);
  if(favor)deltas.push({label:"人情",value:favor,good:favor>0});
  const ownRoll=next.lastRoll?.seat===next.viewer&&next.lastRoll.at!==previous.lastRoll?.at;
  const exam=next.exam?.seat===next.viewer&&next.exam.completed!==(previous.exam?.completed??0);
  if(b.degree&&b.degree!==a.degree)return{title:degreeInfo(b.degree).title,subtitle:"金榜题名 · 功名已定",seal:"榜",tone:"gold",deltas};
  if(b.intrigue.completed>a.intrigue.completed)return{title:"委托告成",subtitle:b.intrigue.notice,seal:"赏",tone:"gold",deltas};
  if(b.pos!==a.pos)return{title:(ownRoll?"骰定官途 · ":"官途有变 · ")+OFFICES[b.pos].name,subtitle:OFFICES[a.pos].name+" → "+OFFICES[b.pos].department+" · "+OFFICES[b.pos].name,seal:ownRoll?next.lastRoll!.face:"迁",tone:b.risk>a.risk?"red":"gold",deltas};
  if(exam)return{title:"殿试 · 第 "+next.exam!.completed+" 轮",subtitle:"此轮落定，继续作答。",seal:next.exam!.faces?.at(-1)||"试",tone:"gold",deltas};
  if(ownRoll)return{title:"留任 · "+OFFICES[b.pos].name,subtitle:next.lastRoll!.reason||"棋已落定，下一手另有天地。",seal:next.lastRoll!.face,tone:next.lastRoll!.face==="赃"?"red":"jade",deltas};
  if(deltas.length){const loss=deltas.every(d=>!d.good);return{title:b.risk>a.risk?"风声渐起":b.learning>a.learning?"学有所成":b.risk<a.risk?"清誉渐复":loss?"府中有变":"此策已成",subtitle:"私账已记 · 仅你可见",seal:b.learning>a.learning?"学":b.risk>a.risk?"察":loss?"记":"成",tone:b.risk>a.risk||loss?"red":"jade",deltas};}
  return null;
}
export default function TurnTheater({game,rolling}:{game:PublicGame;rolling:boolean}) {
  const previous=useRef<PublicGame|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [moment,setMoment]=useState<(Moment&{id:number})|null>(null),serial=useRef(0);
  useEffect(()=>{const next=personalMoment(previous.current,game);previous.current=game;if(!next)return;if(timer.current)clearTimeout(timer.current);setMoment({...next,id:++serial.current});timer.current=setTimeout(()=>setMoment(null),4200);},[game]);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  if(rolling)return <div className="turn-theater rolling-theater" role="status"><div className="dice-halo"><div className="theater-die"><span>德</span><span>才</span><span>功</span><span>赃</span></div></div><p>一掷之间，官途将启。</p></div>;
  if(!moment)return null;
  return <div key={moment.id} className={"turn-theater result-theater result-"+moment.tone}><section className="moment-scroll" role="status"><button className="moment-dismiss" onClick={()=>setMoment(null)} aria-label="收起本次结果"><X size={14}/></button><span className="moment-seal">{moment.seal}</span><div className="moment-copy"><span><Sparkles size={11}/> 此刻 · 你的官途</span><h3>{moment.title}</h3><p>{moment.subtitle}</p><div className="moment-deltas">{moment.deltas.map(d=><b key={d.label} className={d.good?"gain":"cost"}>{d.label} {d.value>0?"+":""}{d.value}</b>)}</div></div></section></div>;
}
