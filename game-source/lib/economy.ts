import { economyAt } from "./board";
export { economyAt } from "./board";
export function silverAt(pos: number, base: number) { return base * economyAt(pos).multiplier; }
export function moneyText(text: string, pos: number) {
  return text.replace(/(\d+)\s*两/g, (_, n) => silverAt(pos, Number(n)) + " 两")
    .replace(/银两\s*\+(\d+)/g, (_, n) => "银两 +" + silverAt(pos, Number(n)));
}
