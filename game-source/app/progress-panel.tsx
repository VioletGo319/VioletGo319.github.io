"use client";
import { ArrowUpRight, Coins, ShieldAlert, Sparkles } from "lucide-react";
import { FACES, OFFICES, actionsAt } from "../lib/board";
import type { PublicGame, Seat } from "../lib/game";
import { currentEdict, reviewPreview, riskBand, rollPreview, turnsToReview } from "../lib/strategy";

export function ResourceBar({ label, value, max, tone, hint }: {
  label: string; value: number; max: number; tone: string; hint?: string;
}) {
  return <div className={"resource-bar tone-" + tone}>
    <div className="resource-bar-label"><span>{label}</span><b>{value}<small> / {max}</small></b></div>
    <div className="segmented-meter" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-valuetext={value + " / " + max}>
      {Array.from({ length: max }, (_, i) => <i key={i} className={i < value ? "filled" : ""}/>)}</div>
    {hint && <small className="meter-hint">{hint}</small>}
  </div>;
}
export default function ProgressPanel({ game, seat, onDetail }: { game: PublicGame; seat: Seat; onDetail: (id: number) => void }) {
  const p = game.players[seat], office = OFFICES[p.pos], favor = p.favor[office.group] || 0;
  const edict = currentEdict(game), band = riskBand(p.risk), review = reviewPreview(game, seat);
  const outcomes = FACES.map(face => ({ face, ...rollPreview(game, seat, face) }));
  const helped = outcomes.filter(o => o.effectiveFace !== o.face).length;
  const noFavor = ["origin", "court", "home"].includes(office.group);
  return <section className="progress-panel" aria-label="仕途与升迁预览">
    <header className="progress-heading"><div><span className="eyebrow">仕途盘算 · {p.name}</span><h3>{office.name}<span className={"risk-badge " + band.level}>{band.label}</span></h3></div><div className="silver-balance"><Coins size={16}/><strong>{p.coins}</strong><span>两</span></div></header>
    <div className="career-meters">
      <ResourceBar label="政绩" value={p.merit} max={8} tone="merit" hint={office.group === "court" ? "可用于考绩领赏 · 三公不助升" : p.merit >= 4 ? "已达擢升门槛 · 触发耗 2" : "再攒 " + (4-p.merit) + " 点可擢升"}/>
      <ResourceBar label="本衙人情" value={favor} max={6} tone="favor" hint={noFavor ? "此阶段不设人情举荐" : favor >= edict.favorCost ? "已达举荐门槛 · 触发耗 " + edict.favorCost : "还差 " + (edict.favorCost-favor) + " 点可举荐"}/>
      <ResourceBar label="嫌疑" value={p.risk} max={6} tone={p.risk >= 3 ? "risk" : "calm"} hint={p.risk < 3 ? "距举荐受阻还有 " + (3-p.risk) + " 点" : "先降嫌疑，再谋升迁"}/>
    </div>
    <div className="promotion-keys"><span><b>政绩 ≥4</b>功 → 才</span><span><b>人情 ≥{edict.favorCost}</b>才 → 德</span><span><b>两项兼备</b>功 → 德</span></div>
    <p className="promotion-condition">嫌疑低于 3、三公以外生效；政绩助力耗 2 政绩，人情助力耗 {edict.favorCost} 本衙人情，合荐两项都耗。去向未变不扣资源。</p>
    <div className="route-heading"><h4><ArrowUpRight size={15}/>本次骰面去向</h4><span>{p.risk >= 4 ? "3 面停升" : helped ? helped + " 面获助力 · " + helped*25 + "% 骰面" : "四面各 25%"}</span></div>
    <div className="route-cards">{outcomes.map(o => {
      const changed = o.effectiveFace !== o.face, dest = OFFICES[o.action.to], base = actionsAt(p.pos)[o.face];
      const cost = [o.meritCost ? o.meritCost + " 政绩" : "", o.favorCost ? o.favorCost + " 人情" : ""].filter(Boolean).join(" + ");
      return <button key={o.face} className={"route-card " + (o.blocked ? "blocked" : changed ? "boosted" : "") + (o.face === "赃" ? " negative-route" : "")} onClick={() => onDetail(o.action.to)} aria-label={o.face + "，概率四分之一，" + o.action.label + (o.reason ? "，" + o.reason : "")}>
        <div className="route-card-top"><b>{o.face}{changed && <em>→{o.effectiveFace}</em>}</b><small>25%</small></div>
        <strong>{o.action.to === p.pos ? "留任 · " : ""}{dest.name}</strong><span>{o.reason || o.action.label}</span>
        {changed && <small className="original-route">原判：{OFFICES[base.to].name}</small>}
        <small className="route-cost">{o.blocked ? "本次无赏银" : cost ? "触发才扣 " + cost : o.reason === "政绩请荐" ? "筹谋时已付 3 政绩" : "无需额外政绩 / 人情"}</small>
      </button>;
    })}</div>
    <p className="route-disclaimer">预测第一步落子；之后仍可能相逢、考核或遇事。「获助力」表示判词改变，骰面概率始终各 25%。</p>
    <div className={"review-forecast " + review.kind}>
      <div className="review-count"><strong>{turnsToReview(game)}</strong><small>次落子后考核</small></div>
      <div><h4>{review.kind === "penalty" || review.kind === "warning" ? <ShieldAlert size={15}/> : <Sparkles size={15}/>}当前预估 · {review.title}</h4><p>{review.detail}</p><small>按当前资源计算；下一次落子或遭遇后会更新。{game.strategy.era % 2 === 1 ? "本次考核后另有主官轮调，各衙人情再 −1。" : ""}</small></div>
    </div>
    <div className="suspicion-track" aria-label="嫌疑惩罚阶梯">{[["0–2", "正常", p.risk < 3], ["3", "封举荐", p.risk === 3], ["4–5", "停升 · 降一职", p.risk >= 4 && p.risk < 6], ["6", "重罚 · 降两职", p.risk === 6]].map(([n, label, active]) => <div key={String(n)} className={active ? "active" : ""}><b>{n}</b><span>{label}</span>{active && <i>当前</i>}</div>)}</div>
    {p.risk >= 3 && <p className="risk-remedy"><ShieldAlert size={14}/><span>{band.detail} 到「办差经营」选择闭门自省：0 两、嫌疑 −2、政绩 −1，最低为 0。</span></p>}
  </section>;
}
