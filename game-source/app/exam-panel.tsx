"use client";
import { Crown, LockKeyhole, ScrollText } from "lucide-react";
import type { PublicGame } from "../lib/game";
import { DEGREES, degreeInfo, EXAM_POINTS, EXAM_ROUNDS } from "../lib/scholar";

export default function ExamPanel({game}:{game:PublicGame}) {
  const e=game.exam;if(!e)return null;
  const own=e.seat===game.viewer, result=e.result?degreeInfo(e.result):null;
  if(!own)return <section className="exam-panel exam-spectator"><ScrollText size={35} strokeWidth={1}/><span className="exam-kicker">金殿传胪</span><h2>{game.players[e.seat].name}<br/>{result?"金榜题名":"正在殿试"}</h2><p>{result?result.rank+" · "+result.title:"已完成 "+e.completed+" / 3 轮，静候金榜。"}</p><span className="exam-private"><LockKeyhole size={12}/>学识、骰面与得分只由本人查看</span></section>;
  const faces=e.faces??[], points=faces.reduce((n,f)=>n+EXAM_POINTS[f],0), knowledge=e.learning??0;
  return <section className={"exam-panel "+(result?"exam-awarded":"")}>
    <div className="exam-heading"><span className="exam-kicker">{result?"金榜题名 · 功名永存":"会试中式 · 御前应试"}</span><Crown size={23} strokeWidth={1.3}/></div>
    <div className="exam-title"><h2>{result?result.title:"一卷文章，叩问青云。"}</h2><p>{result?result.rank:"连掷三轮，以学识与临场表现定科甲。"}</p></div>
    <div className="exam-rounds">{EXAM_ROUNDS.map((round,i)=><div key={round} className={faces[i]?"done":i===faces.length?"next":""}><small>{i+1} · {round}</small><b>{faces[i]||"待"}</b><span>{faces[i]?"+"+EXAM_POINTS[faces[i]]+" 分":"待掷骰"}</span></div>)}</div>
    <div className="exam-score"><div><small>入场学识</small><b>{knowledge}</b></div><span>＋</span><div><small>三轮表现</small><b>{points}</b></div><span>＝</span><div><small>{result?"殿试总评":"当前累计"}</small><b>{knowledge+points}<em>/ 21</em></b></div></div>
    <div className="exam-ranks">{DEGREES.map((d,i)=><div key={d.id} className={e.result===d.id?"awarded":""}><b>{d.title}</b><span>{d.min}–{i===DEGREES.length-1?21:DEGREES[i+1].min-1} 分</span></div>)}</div>
    <p className="exam-note">{result?"科甲永久保留。点下方掷骰，沿原判词授官；赃只候铨，不降科甲。":"学识已锁定；德 3 分、才 2 分、功 1 分、赃 0 分。点下方完成本轮。"}</p>
  </section>;
}
