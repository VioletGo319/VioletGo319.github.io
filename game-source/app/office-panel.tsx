"use client";
import { Castle, ShieldAlert } from "lucide-react";
import { ownPlayer } from "../lib/view";
import { silverAt } from "../lib/economy";
import { OFFICES } from "../lib/board";
import type { PublicGame, Seat } from "../lib/game";
import { HASSLES, hierarchy } from "../lib/offices";

export default function OfficePanel({ game, seat, enabled, isLocal, onMove }: {
  game: PublicGame; seat: Seat; enabled: boolean; isLocal: boolean;
  onMove: (action: string, extra: Record<string, unknown>) => void;
}) {
  const h = game.hassle, relation = hierarchy(game);
  if (!h) {
    if (!relation) return null;
    return <div className="hierarchy-card"><Castle size={18}/><div><b>{relation.department} · 同衙任职</b><p>{game.players[relation.senior].name}（{OFFICES[game.players[relation.senior].pos].name}）为上级，{game.players[relation.junior].name}为下级。</p><small>{seat === relation.senior ? "轮到你时可在「朝堂争锋」发起刁难。" : "保留 2 人情或 2 政绩，可在受到刁难时化解。"}</small></div></div>;
  }
  const senior = game.players[h.senior], junior = game.players[h.junior], mine = seat === h.junior;
  const type = HASSLES.find(t => t.id === h.kind)!;
  const self = ownPlayer(game, seat), favor = self.favor[OFFICES[self.pos].group] || 0;
  const detail = h.kind === "tribute" ? "照办向上级交最多 " + silverAt(senior.pos, 6) + " 两；不足只交现有银两。" : type.detail;
  const respond = (choice: string) => onMove("hassle_response", { hassleId: h.id, choice });
  return <section className="encounter-card hassle-card" aria-label="同衙刁难应对">
    <div className="section-heading"><ShieldAlert size={18}/><span>{h.department} · 同衙风波</span></div>
    <h2>{type.title}</h2><p className="encounter-story">上级{senior.name}向{junior.name}施压。{detail}</p>
    {mine ? <><p className="hassle-handoff">{isLocal ? "请交给" : "现在由"}{junior.name}决定 · {self.coins} 两 / {self.merit} 政绩 / {favor} 本衙人情</p><div className="action-menu">
      <button disabled={!enabled} onClick={() => respond("comply")}><b>依令照办 <small>始终可选</small></b><span>{detail}资源最低为 0，不会出局。</span></button>
      <button disabled={!enabled || favor < 2} onClick={() => respond("favor")}><b>托人斡旋 <small>2 本衙人情</small></b><span>消耗人情，免除这次刁难的全部效果。</span></button>
      <button disabled={!enabled || self.merit < 2} onClick={() => respond("appeal")}><b>据理申诉 <small>2 政绩</small></b><span>取消刁难；上级嫌疑 +2、政绩 −1，让滥权付出代价。</span></button>
    </div></> : <><p className="notice">等待{junior.name}选择应对。你已花 1 政绩、增加 1 嫌疑，处理后继续掷骰。</p>
      <button className="secondary-button" disabled={!enabled} onClick={() => respond("withdraw")}>撤回刁难，继续掷骰</button><p className="strategy-help">撤回不返还成本，本次筹谋和 6 次落子冷却仍已使用。</p></>}
    <p className="fine-print">下级应对不消耗其筹谋次数 · 处理完由上级完成本回合</p>
  </section>;
}
