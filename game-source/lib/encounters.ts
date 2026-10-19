/** Fictional encounters and a simultaneous-choice strategy duel, not historical rules. */
export const EVENTS = [
  { id: "literary", title: "文字狱风波", tag: "笔祸骤起", story: "旧日一篇诗文被断章取义，你也被牵连。如何保全自己、查清来龙去脉？此为架空遭遇，不对应真实案件。", choices: [
    { id: "defend", title: "据理申辩", detail: "花 2 政绩整理证据，保住官职，嫌疑 -1。", merit: 2, coins: 0 },
    { id: "appeal", title: "查证原稿", detail: "花 10 两寻回原稿，澄清误会，保住官职。", merit: 0, coins: 10 },
    { id: "withdraw", title: "暂避风波", detail: "不花银两，降一职；不会出局。", merit: 0, coins: 0 },
  ] },
  { id: "flood", title: "河患急报", tag: "民生之急", story: "连日大雨，河堤告急。衙门催你拿出赈济方案。", choices: [
    { id: "fund", title: "出资赈灾", detail: "花 10 两，政绩 +3。", merit: 0, coins: 10 },
    { id: "organize", title: "亲赴堤岸", detail: "不花银两，政绩 +1。", merit: 0, coins: 0 },
    { id: "pocket", title: "虚报赈款", detail: "银两 +12，嫌疑 +2。", merit: 0, coins: 0 },
  ] },
  { id: "letter", title: "驿站失文", tag: "急件失踪", story: "一封需要你签押的公文遗落驿站。是出钱追回，还是亲自补录？", choices: [
    { id: "retrieve", title: "遣人追索", detail: "花 6 两，政绩 +2。", merit: 0, coins: 6 },
    { id: "rewrite", title: "连夜补录", detail: "政绩 +1。", merit: 0, coins: 0 },
    { id: "blame", title: "虚报差费", detail: "银两 +8，嫌疑 +1。", merit: 0, coins: 0 },
  ] },
  { id: "surplus", title: "岁末余银", tag: "意外结余", story: "衙门盘点后发下一笔额外赏银，你准备如何使用？", choices: [
    { id: "keep", title: "依例领赏", detail: "银两 +10。", merit: 0, coins: 0 },
    { id: "donate", title: "捐予乡学", detail: "政绩 +2、嫌疑 -1。", merit: 0, coins: 0 },
    { id: "skim", title: "另领一份", detail: "银两 +18、嫌疑 +2。", merit: 0, coins: 0 },
  ] },
  { id: "banquet", title: "雅集相邀", tag: "高朋满座", story: "一场雅集递来请柬。席间可以结识同僚，也可与知己一同献策。", choices: [
    { id: "visit", title: "备礼赴宴", detail: "花 5 两，本衙人情 +2；尚未入仕或已居三公则政绩 +1。", merit: 0, coins: 5 },
    { id: "verse", title: "以文会友", detail: "政绩 +2。", merit: 0, coins: 0 },
    { id: "together", title: "携知己献策", detail: "双方各得 1 政绩、4 两。", merit: 0, coins: 0 },
  ] },
  { id: "inspection", title: "御史临门", tag: "突击查核", story: "御史突然来查往来账册。你可以主动补充证据，也可接受当场查核。", choices: [
    { id: "records", title: "呈交案牍", detail: "花 1 政绩，嫌疑 -2。", merit: 1, coins: 0 },
    { id: "check", title: "自请复查", detail: "花 8 两，嫌疑 -2。", merit: 0, coins: 8 },
    { id: "wait", title: "接受查核", detail: "嫌疑 3–5：罚最多 16 两、降一职、政绩 −2、清空人情，嫌疑降至 2；嫌疑 6：罚最多 30 两、降两职、政绩 −4，嫌疑降至 3；低于 3 则赏 6 两、政绩 +1。", merit: 0, coins: 0 },
  ] },
] as const;
export type EventId = typeof EVENTS[number]["id"];
export function eventDefinition(id: EventId) { return EVENTS.find(e => e.id === id)!; }
export const STANCES = [
  { id: "precedent", title: "援引典章", short: "典章", beats: "people", detail: "以章程约束民情之说，克制「陈说民情」。" },
  { id: "people", title: "陈说民情", short: "民情", beats: "practical", detail: "以民生代价追问实务，克制「核算实务」。" },
  { id: "practical", title: "核算实务", short: "实务", beats: "precedent", detail: "以成效反问旧例，克制「援引典章」。" },
] as const;
export type StanceId = typeof STANCES[number]["id"];
export type DebateBid = { stance: StanceId; stake: number };
export const TOPICS = [
  { title: "河患治策", question: "水患当前，应优先修堤、迁民，还是分洪？", expert: ["works", "province", "county"], lines: ["治水有章，先明责属，再调夫役。", "堤可再筑，流离之家不可久候。", "先勘河势、核工费，再定最急一段。"] },
  { title: "粮价骤涨", question: "粮价上涨，仓储、赈济与商运如何取舍？", expert: ["revenue", "finance", "prefecture"], lines: ["仓储出纳皆有定例，不可因急废法。", "一日之迟，可能就是一家断炊。", "核库存、疏运道，方能平抑粮价。"] },
  { title: "选才之道", question: "选拔官员，应更重科名、民望，还是办事成绩？", expert: ["personnel", "hanlin", "rites"], lines: ["取士有程，才能使寒门有路可循。", "百姓称道的实绩，不应埋没于文牍。", "以试办之成效验才，空言不能治事。"] },
  { title: "边防议饷", question: "边地告急，如何兼顾守备、军饷与农时？", expert: ["war", "cabinet", "state"], lines: ["调兵发饷，须循节制与成法。", "军需若尽压农户，边民更难安定。", "先算运程与耗损，守备才有凭据。"] },
] as const;
export function randomInt(max: number) {
  const limit = Math.floor(0x100000000 / max) * max;
  let n: number;
  do { n = crypto.getRandomValues(new Uint32Array(1))[0]; } while (n >= limit);
  return n % max;
}
