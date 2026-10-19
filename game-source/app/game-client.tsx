"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Copy, Download, Heart, Home, Link, LoaderCircle, RotateCcw, Share2, ShieldCheck, Sparkles, Users, Wifi, WifiOff, X } from "lucide-react";
import ExpandedBoard from "./expanded-board";
import StrategyPanel from "./strategy-panel";
import EncounterPanel from "./encounter-panel";
import { BOARD_COUNT, GROUPS, HOME_ID, SOURCES } from "../lib/board";
import { actionsAt, addPlayer, FACES, makePlayer, newGame, OFFICES, publicGame, REACTIONS, requestRematch, roll, prepare, resolveEvent, submitDebate, upgradeGame, type Game, type PublicGame, type Seat } from "../lib/game";
import { hasPrepared, rollPreview, type PlanInput } from "../lib/strategy";
import { randomInt, type DebateBid } from "../lib/encounters";

type Snapshot = { code: string; version: number; seat: Seat; game: PublicGame; serverTime: number };
type Session = { code: string; token: string };
type Modal = "rules" | "install" | "invite" | "restore" | "backup" | "leave" | null;
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const STORE = "tongyou-session-v1", LOCAL = "tongyou-local-v1";
function readStore(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
function saveStore(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* The current session remains usable in memory. */ } }
function makeToken() { return Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, "0")).join(""); }
export default function GameClient({ appBase = "/", apiEndpoint = "/api/room", githubEdition = false }: { appBase?: string; apiEndpoint?: string; githubEdition?: boolean } = {}) {
  const [session, setSession] = useState<Session | null>(null);
  const [saved, setSaved] = useState<Session | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [local, setLocal] = useState<Game | null>(null);
  const [savedLocal, setSavedLocal] = useState(false);
  const [tab, setTab] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [partner, setPartner] = useState("");
  const [code, setCode] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [detail, setDetail] = useState<number | null>(null);
  const [recovery, setRecovery] = useState("");
  const [busy, setBusy] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [connection, setConnection] = useState<"connected" | "connecting" | "offline">("connecting");
  const [toast, setToast] = useState("");
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [clock, setClock] = useState(Date.now());
  const [mounted, setMounted] = useState(false);
  const lock = useRef(false), requestId = useRef(0), toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const game: PublicGame | null = local ? publicGame(local) : snapshot?.game ?? null;
  const isLocal = !!local, inGame = !!game;
  const activeSeat: Seat = isLocal && game ? game.event?.seat ?? (game.debate && game.debate.ready[game.turn] ? (1 - game.turn) as Seat : game.turn) : snapshot?.seat ?? 0;
  const canRoll = !!game && game.status === "playing" && !game.event && !game.debate && (isLocal || game.turn === snapshot?.seat);
  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4600);
  }
  useEffect(() => {
    setMounted(true);
    setName(readStore("tongyou-name") ?? "");
    try {
      const old = JSON.parse(readStore(STORE) || "null");
      if (old && /^[A-Z2-9]{8}$/.test(old.code) && /^[a-f0-9]{64}$/.test(old.token)) setSaved(old);
      const localOld = JSON.parse(readStore(LOCAL) || "null");
      setSavedLocal(!!localOld?.players?.length);
    } catch { /* Ignore malformed local preferences. */ }
    const invite = new URLSearchParams(location.hash.slice(1)).get("room");
    if (invite) { setCode(invite.toUpperCase()); setTab("join"); }
    const install = (e: Event) => { e.preventDefault(); setInstallEvent(e as InstallEvent); };
    window.addEventListener("beforeinstallprompt", install);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register(appBase + "sw.js", { scope: appBase }).catch(() => {});
    const tick = setInterval(() => setClock(Date.now()), 1000);
    return () => { clearInterval(tick); window.removeEventListener("beforeinstallprompt", install); };
  }, []);
  useEffect(() => { if (local) { saveStore(LOCAL, local); setSavedLocal(true); } }, [local]);
  useEffect(() => {
    if (!modal && detail === null) return;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLButtonElement>(".close-modal")?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,textarea,a[href],[tabindex="0"]') ?? []);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener("keydown", trap); previous?.focus(); };
  }, [modal, detail]);
  async function api(target: Session, body?: Record<string, unknown>): Promise<Snapshot> {
    const response = await fetch(apiEndpoint + (body ? "" : "?code=" + target.code), {
      method: body ? "POST" : "GET", cache: "no-store",
      credentials: "omit",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + target.token, "X-Tongyou-Rules": "3" },
      ...(body ? { body: JSON.stringify({ ...body, code: target.code }) } : {}),
      signal: AbortSignal.timeout(12000),
    }).catch(() => { throw new Error("联机服务暂时连接不上，请检查网络后重试；也可先同屏试玩。"); });
    const data = await response.json().catch(() => ({ error: "连接中断，请刷新后重试。" })) as Snapshot & { error?: string };
    if (!response.ok) throw new Error(data.error || "暂时无法连接雅间。");
    return data as Snapshot;
  }
  function accept(data: Snapshot) {
    setSnapshot(old => !old || old.code !== data.code || data.version >= old.version ? data : old);
    setClock(data.serverTime);
    setConnection("connected");
  }
  useEffect(() => {
    if (!session) return;
    let stopped = false, fetching = false;
    const pull = async () => {
      if (stopped || fetching || document.visibilityState === "hidden") return;
      fetching = true;
      try { const data = await api(session); if (!stopped) accept(data); }
      catch { if (!stopped) setConnection("offline"); }
      finally { fetching = false; }
    };
    void pull();
    const timer = setInterval(pull, 2400);
    document.addEventListener("visibilitychange", pull);
    window.addEventListener("online", pull);
    return () => { stopped = true; clearInterval(timer); document.removeEventListener("visibilitychange", pull); window.removeEventListener("online", pull); };
  }, [session]);
  async function enter(kind: "create" | "join") {
    if (lock.current) return;
    if (!name.trim()) { notify("先写下你的名字，再入席吧。"); return; }
    lock.current = true; setBusy(true);
    const target: Session = { code: kind === "create" ? "" : code.toUpperCase().replace(/[\s-]/g, ""), token: makeToken() };
    if (kind === "join" && saved?.code === target.code) target.token = saved.token;
    try {
      const data = await api(target, { action: kind, name: name.trim() });
      target.code = data.code;
      saveStore(STORE, target); setSaved(target); setLocal(null); setSnapshot(data); setSession(target); setConnection("connected");
      try { localStorage.setItem("tongyou-name", name.trim()); } catch {}
      history.replaceState(null, "", appBase + "#room=" + target.code);
      if (kind === "create") setModal("invite");
    } catch (error) { notify(error instanceof Error ? error.message : "入席失败，请再试一次。"); }
    finally { lock.current = false; setBusy(false); }
  }
  async function resume(target = saved) {
    if (!target || lock.current) return;
    lock.current = true; setBusy(true);
    try {
      const data = await api(target);
      setLocal(null); setSnapshot(data); setSession(target); setSaved(target);
      saveStore(STORE, target); setConnection("connected"); setModal(null);
      history.replaceState(null, "", appBase + "#room=" + target.code);
    } catch (error) { notify(error instanceof Error ? error.message : "续局失败，请核对密钥。"); }
    finally { lock.current = false; setBusy(false); }
  }
  function startLocal(continueOld = false) {
    try {
      if (continueOld) {
        const old = JSON.parse(readStore(LOCAL) || "null");
        if (old?.players?.length === 2) { setSession(null); setSnapshot(null); setLocal(upgradeGame(old)); return; }
      }
      const first = name.trim() || "朱砂客", second = partner.trim() || "青玉客";
      setLocal(addPlayer(newGame(makePlayer(first)), makePlayer(second)));
      setSession(null); setSnapshot(null); setModal(null);
      history.replaceState(null, "", appBase);
    } catch (error) { notify(error instanceof Error ? error.message : "请核对名字。"); }
  }
  async function move(action: string, extra: Record<string, unknown> = {}) {
    if (lock.current || !game) return;
    lock.current = true; setBusy(true);
    const currentRequest = ++requestId.current;
    if (action === "roll") setRolling(true);
    try {
      if (local) {
        await new Promise(resolve => setTimeout(resolve, action === "roll" ? 650 : 0));
        if (action === "roll") setLocal(roll(local, local.turn, FACES[randomInt(4)], Date.now(), randomInt(1000)));
        if (action === "prepare") setLocal(prepare(local, activeSeat, extra.plan as PlanInput));
        if (action === "event") setLocal(resolveEvent(local, activeSeat, String(extra.eventId), String(extra.choice)));
        if (action === "debate") setLocal(submitDebate(local, activeSeat, String(extra.debateId), extra.bid as DebateBid | null));
        if (action === "rematch") setLocal(requestRematch(requestRematch(local, 0), 1));
      } else if (session && snapshot) {
        const [data] = await Promise.all([api(session, { action, version: snapshot.version, ...extra }),
          new Promise(resolve => setTimeout(resolve, action === "roll" ? 650 : 0))]);
        if (currentRequest === requestId.current) accept(data);
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "连接中断，正在重新同步。");
      if (session) { try { accept(await api(session)); } catch { setConnection("offline"); } }
    } finally { setBusy(false); setRolling(false); lock.current = false; }
  }
  async function copy(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); notify(label); }
    catch { notify("未能自动复制，请长按下方文字复制。"); }
  }
  function inviteLink() { return typeof location === "undefined" || !session ? "" : location.origin + appBase + "#room=" + session.code; }
  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: "来同游一局升官图", text: "棋盘已铺好，就等你了。雅间号：" + session?.code, url: inviteLink() }); return; }
      catch (e) { if (e instanceof Error && e.name === "AbortError") return; }
    }
    await copy(inviteLink(), "邀请链接已复制，发给你的棋友吧。");
  }
  function returnHome() {
    if (lock.current) { notify("请等这一手落定，再回门庭。"); return; }
    setSession(null); setSnapshot(null); setLocal(null); setModal(null); setDetail(null);
    history.replaceState(null, "", appBase);
  }
  const active = game?.players[activeSeat];
  const recentReaction = game?.reactions.find(r => clock - r.at < 7000);
  return <div className="app-shell">
    <header className="site-header">
      <button className="brand" aria-label="返回同游首页" onClick={() => inGame ? setModal("leave") : returnHome()}>
        <span className="brand-seal">同<br/>游</span>
        <span className="brand-name">升官图<small>与君对弈 · 共赴青云</small></span>
      </button>
      <nav aria-label="工具">
        <button className="nav-button" onClick={() => setModal("rules")}><BookOpen size={16}/><span>玩法</span></button>
        <button className="nav-button install-nav" onClick={() => setModal("install")}><Download size={16}/><span>放到桌面</span></button>
      </nav>
    </header>
    <main>
      <div className={"page-intro " + (inGame ? "compact" : "")}>
        <div><p className="eyebrow"><span/> {inGame ? (isLocal ? "同屏双人 · 把手机递给对方" : "天涯若比邻 · 双人雅间") : "一方棋盘 · 两处人间"}</p>
          <h1>{inGame ? "此局，与君同游。" : <>一局升迁，<em>两人同游。</em></>}</h1>
          {!inGame && <p className="intro-copy">从白丁应试，到三公荣归。<br className="mobile-break"/>隔着山海，也能一起掷下这一骰。</p>}</div>
        {inGame ? <div className="room-status">
          <span className={"connection " + (isLocal ? "local" : connection)}>{isLocal ? <Users size={14}/> : connection === "connected" ? <Wifi size={14}/> : <WifiOff size={14}/>}
            {isLocal ? "本机试玩" : connection === "connected" ? "已同步" : connection === "offline" ? "重连中 · 棋局已保留" : "连接中"}</span>
          {!isLocal && <button className="room-code" onClick={() => setModal("invite")}>{session?.code}<Share2 size={13}/></button>}
        </div> : <div className="intro-stamp">闲来<br/>一局</div>}
      </div>
      <div className={"game-layout " + (!inGame ? "lobby-layout" : "")}>
        <section className="board-column" aria-label="升官图棋盘">
          <div className="board-topline"><span>{inGame ? "第 " + game.match + " 局 · 第 " + game.round + " 回合" : "功名 · 地方 · 京官 · 三公"}</span><button onClick={() => setModal("rules")}>馆藏参考与改编说明</button></div>
          <ExpandedBoard game={game} activeSeat={activeSeat} onDetail={setDetail}/>
          {recentReaction && <div className={"board-message seat-" + recentReaction.seat}><Heart size={13}/>{game?.players[recentReaction.seat].name}：{recentReaction.text}</div>}
          {game && <div className="players-grid">{[0, 1].map(seat => {
            const p = game.players[seat], turn = game.status === "playing" && game.turn === seat;
            return <div key={seat} className={"player-card player-" + seat + (turn ? " current" : "")}>
              <div className={"player-avatar seat-" + seat}>{seat === 0 ? "朱" : "青"}</div>
              <div className="player-info"><strong>{p?.name || "静候知己"}{!isLocal && seat === snapshot?.seat && <small>你</small>}</strong>
                <span>{p ? OFFICES[p.pos].name : "分享链接，邀 TA 入席"}{p && <b> · {p.coins} 两</b>}</span>{p && <small className="player-resources">政绩 {p.merit} · 嫌疑 {p.risk}{p.risk >= 3 ? " · 当心查办" : ""}</small>}</div>
              <span className="player-dot" title={p && (isLocal || clock - p.lastSeen < 40000) ? "在线" : "暂离，棋局保留"} data-online={!!p && (isLocal || clock - p.lastSeen < 40000)}/>
              {turn && <div className="turn-label">执骰中</div>}
            </div>;
          })}</div>}
        </section>
        <aside className="play-column">
          {!game ? <section className="lobby-card">
            <div className="card-overline"><span className="small-line"/> 与君相约 <span className="small-line"/></div>
            <h2>落座，开一局。</h2><p className="muted">一人开局，一人赴约。</p>
            <div className="tabs" role="tablist" aria-label="入席方式">
              <button role="tab" aria-selected={tab === "create"} className={tab === "create" ? "selected" : ""} onClick={() => setTab("create")}>创建雅间</button>
              <button role="tab" aria-selected={tab === "join"} className={tab === "join" ? "selected" : ""} onClick={() => setTab("join")}>赴约入席</button>
            </div>
            <form onSubmit={e => { e.preventDefault(); void enter(tab); }}>
              <label htmlFor="player-name">你的名字</label>
              <input id="player-name" value={name} onChange={e => setName(e.target.value)} maxLength={12} placeholder="写个雅号，也可以是真名" autoComplete="nickname" disabled={busy}/>
              {tab === "join" && <><label htmlFor="room-input">8 位雅间号</label><input id="room-input" className="code-input" value={code} onChange={e => setCode(e.target.value.toUpperCase())} autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={10} placeholder="例如 ABCD 2345" disabled={busy}/></>}
              <button className="primary-button" disabled={busy || !mounted} type="submit">{busy ? <LoaderCircle className="spin" size={18}/> : <>{tab === "create" ? "开一间雅间" : "入席，同游"}<ArrowRight size={17}/></>}</button>
            </form>
            <p className="privacy-note"><ShieldCheck size={12}/>每间限两人 · 棋局自动保存</p>
            {githubEdition && <p className="card-footnote">GitHub 网页版 · 与原站共用雅间。<br/>页面能打开但无法入席时，请检查联机服务的网络连接。</p>}
            {saved && <button className="continue-button" disabled={busy} onClick={() => resume()}><RotateCcw size={14}/>继续上次雅间 <span>{saved.code}</span></button>}
            <div className="or-divider"><span/>或先试一局<span/></div>
            <details className="local-options"><summary>同屏双人试玩 <Users size={15}/></summary>
              <label htmlFor="partner-name">第二位棋友</label><input id="partner-name" value={partner} onChange={e => setPartner(e.target.value)} maxLength={12} placeholder="青玉客"/>
              <button className="secondary-button" onClick={() => startLocal()}>开始同屏双人</button>
              {savedLocal && <button className="text-button" onClick={() => startLocal(true)}>继续上次同屏棋局</button>}
            </details>
            <button className="restore-button" onClick={() => setModal("restore")}>换了手机？用续局密钥找回</button>
          </section> : <>
            {game.status === "playing" && <EncounterPanel key={game.event?.id || (game.debate?.id || "last") + ":" + activeSeat} game={game} seat={activeSeat} isLocal={isLocal} enabled={!busy && (isLocal || connection === "connected")} onMove={(action,extra) => void move(action,extra)}/>}
            <section className={"turn-card " + (game.status === "finished" ? "finished-card" : "")}>
              {game.status === "waiting" ? <>
                <span className="pill"><Heart size={12}/> 一席已备</span><h2>好棋，等知己。</h2>
                <p className="muted">把邀请链接发给对方。<br/>TA 入席后，这局就开始了。</p>
                <div className="waiting-code">{session?.code}</div>
                <button className="primary-button" onClick={() => setModal("invite")}><Link size={17}/>邀请另一半</button>
                <p className="card-footnote">不用一直等，回来还在这一局。</p>
              </> : game.status === "finished" ? <>
                <span className="pill"><Sparkles size={12}/> 荣归故里</span><h2>{game.players[game.winner!].name}胜！</h2>
                <p className="muted">这一程青云有你相伴，<br/>下一局，再一起出发。</p>
                <div className="victory-seal">荣<br/>归</div>
                <button className="primary-button" onClick={() => move("rematch")} disabled={busy || (!isLocal && game.rematch.includes(activeSeat))}><RotateCcw size={16}/>{!isLocal && game.rematch.includes(activeSeat) ? "已邀再战，等对方点头" : "再同游一局"}</button>
                {!isLocal && game.rematch.length > 0 && !game.rematch.includes(activeSeat) && <p className="card-footnote">对方已发来再战邀请。</p>}
              </> : <>
                <span className={"pill " + (canRoll ? "" : "quiet")}><span className="tiny-dot"/>{canRoll ? "轮到" + (isLocal ? game.players[game.turn].name : "你") + "了" : "静候 " + game.players[game.turn].name}</span>
                <h2>{game.event ? "先解眼前事。" : game.debate ? "朝堂上，见真章。" : canRoll ? "一掷，赴青云。" : "且饮茶，候佳音。"}</h2>
                <div className={"dice-wrap " + (rolling ? "is-rolling" : "")}><div className={"dice " + (game.lastRoll?.face === "赃" ? "bad-face" : "")}><span>{rolling ? "运" : game.lastRoll?.face || "德"}</span><i/><i/><i/><i/></div></div>
                <p className="last-roll" aria-live="polite">{rolling ? "古骰轻落，静候天意…" : game.lastRoll ? game.players[game.lastRoll.seat].name + "掷出「" + game.lastRoll.face + "」" + (game.lastRoll.reason ? " · " + game.lastRoll.reason + "按「" + game.lastRoll.effectiveFace + "」" : "") : "德才功赃，四面各有机缘"}</p>
                {canRoll && !hasPrepared(game) && <a className="plan-shortcut" href="#strategy">可先筹谋一次：送礼 / 办差 / 朝堂争辩 ↓</a>}
                <button className="primary-button roll-button" disabled={!canRoll || busy || (!isLocal && connection !== "connected")} onClick={() => move("roll")}>{rolling ? <LoaderCircle size={18} className="spin"/> : <><span className="dice-icon">◇</span>{game.event ? "先选择事件应对" : game.debate ? "等待论策揭晓" : canRoll ? hasPrepared(game) ? "筹谋已定 · 掷骰" : "直接掷骰行运" : "等待对方掷骰"}</>}</button>
                <div className="current-office"><span>你执子于{isLocal ? " · " + active?.name : ""}</span><button onClick={() => setDetail(active?.pos ?? 0)}>{OFFICES[active?.pos ?? 0].name}<ChevronRight size={13}/></button></div>
                <div className="outcomes">{FACES.map(face => { const outcome = rollPreview(game, activeSeat, face); return <div key={face}><b className={face === "赃" ? "negative" : ""}>{face}</b><span>{outcome.reason ? outcome.reason + " · " : ""}{outcome.action.label}</span></div>;})}</div>
              </>}
            </section>
            {game.status === "playing" && !game.event && !game.debate && <StrategyPanel game={game} seat={activeSeat} enabled={canRoll && !busy && (isLocal || connection === "connected")} onPlan={plan => void move("prepare",{plan})}/>}
            {!isLocal && game.players.length === 2 && <div className="reactions"><span>飞笺传情</span><div>{REACTIONS.map(text => <button key={text} disabled={busy || connection !== "connected"} onClick={() => move("react", { text })}>{text}</button>)}</div></div>}
            <section className="journal"><div className="journal-heading"><BookOpen size={15}/><h3>此局小记</h3><small>最近 {game.logs.length} 条</small></div><ol aria-live="polite">{game.logs.map(entry => <li key={game.match + "-" + entry.id}><i className={entry.seat === 1 ? "teal" : ""}/><span>{entry.text}</span></li>)}</ol></section>
            {!isLocal && <button className="backup-button" onClick={() => setModal("backup")}><ShieldCheck size={13}/>保存我的续局密钥</button>}
            <button className="back-home" onClick={() => setModal("leave")}><ArrowLeft size={13}/>回到门庭</button>
          </>}
        </aside>
      </div>
      {!inGame && <section className="how-strip"><div><span>壹</span><p><strong>拜主官，谋升迁</strong><small>送礼攒人情，办差积政绩</small></p></div><div><span>贰</span><p><strong>遇风波，共进退</strong><small>文字狱、河患与御史突访</small></p></div><div><span>叁</span><p><strong>朝堂上，试锋芒</strong><small>密封论策，双人同时揭晓</small></p></div></section>}
    </main>
    <footer><span>同游</span>愿隔山海的人，也有一方共同的棋盘。<button onClick={() => setModal("rules")}>参考古代升官图 · 群衙棋盘 · 研究改编</button></footer>
    {toast && <div className="toast" role="status"><Check size={15}/>{toast}</div>}
    {(modal || detail !== null) && <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) { setModal(null); setDetail(null); } }}>
      <dialog open ref={dialogRef} aria-modal="true" className="modal" aria-label={detail !== null ? "官职升降" : modal === "rules" ? "游戏规则" : "同游提示"} onKeyDown={e => { if (e.key === "Escape") { setModal(null); setDetail(null); } }}>
        <button className="close-modal" aria-label="关闭" autoFocus onClick={() => { setModal(null); setDetail(null); }}><X size={20}/></button>
        {detail !== null ? <><p className="eyebrow">{OFFICES[detail].department} · {OFFICES[detail].stage}</p><h2>{OFFICES[detail].name}</h2><p className="muted">{OFFICES[detail].description}</p>{detail === HOME_ID ? <div className="notice">仅在太师位掷出「德」，才能荣归。最先荣归的棋友获胜，银两只作此局纪念。</div> : <div className="office-detail">{FACES.map(face => { const a = actionsAt(detail)[face]; const dest = OFFICES[a.to]; return <div key={face}><b>{face}</b><button onClick={() => setDetail(a.to)}><span>{a.label}</span><small>{a.to === detail ? "原位" : dest.department + " · " + dest.name} {a.tribute ? "向对手收取，上限 " + a.tribute + " 两" : (a.coins >= 0 ? "+" : "") + a.coins + " 两"}</small></button></div>;})}</div>}<div className="evidence-tag">{detail === 0 ? "白丁四项去向：故宫博物院原文可核对" : "逐格升降与银两：本作改编规则"}</div><p className="fine-print">同衙内按本作列序比较高低；不同衙门靠判词跳转，不能用全图编号比较官阶。</p></> :
        modal === "rules" ? <><p className="eyebrow">一卷玩法</p><h2>如何同游？</h2><div className="rules-content">
          <p><strong>全图。</strong>{BOARD_COUNT} 格，{GROUPS.length - 1} 个功名 / 官署分区，加荣归终点。外层是科举和地方衙门，中层是翰林、都察、九卿与六部，中心是内阁与三公。六部在本作分别设署。</p>
          <p><strong>开局。</strong>两人从白丁、100 两银子出发，朱砂先手，轮流执骰。再战轮换先手。白丁逢德到监生、逢才到案首、逢功到童生、逢赃不动。</p>
          <p><strong>掷骰。</strong>「德、才、功、赃」各 25%。按当前格的判词直接跳到指定官职，可能跨衙、外放或入阁。功多数留任；各格均有自己的四项去向。点击官职即可查看，彩色箭头显示当前执子的去向。</p>
          <p><strong>每回合筹谋。</strong>掷骰前可选一次送礼、办差、政绩请荐、赈济、资助、参奏或发起争辩，也可直接掷骰。筹谋后仍需掷骰结束本回合；事件处理不占这次筹谋。政绩上限 8、嫌疑上限 6、每衙人情上限 6，最低均为 0。</p>
          <p><strong>拜谒送礼。</strong>入仕后向本衙主官送清茶（5 两 / 1 人情 / 0 嫌疑）、书画（10 两 / 2 人情 / 1 嫌疑）、珍玩（20 两 / 3 人情 / 2 嫌疑）。投其所好额外 +1 人情；清正主官拒收珍玩且不扣款。满 3 人情，掷「功」原应留任时，消耗 3 人情改按「才」迁职。人情分衙存放；已是本衙主官则拜谒上级。对方占据受礼官位时，银两转给对方，含嫌疑的礼物也使对方嫌疑 +1。功名阶段与三公不设拜谒。</p>
          <p><strong>办差与请荐。</strong>办差通常 +2 政绩、4 两。花 3 政绩请荐，本次掷「功」改按「德」，其余结果不变且不退款，三公不可用。赈济花 8 两，政绩 +1、嫌疑 -2。资助转给对方 10 两，双方各 +1 政绩。原始骰面为「功」额外 +1 政绩；入仕后掷「赃」增加 1 嫌疑。</p>
          <p><strong>考核与查办。</strong>每 6 次落子考核双方：嫌疑 ≥4 优先查办，罚最多 15 两、降一职、人情清空、嫌疑归 1；否则政绩 ≥4，消耗 4 政绩、赏 12 两、按「才」迁职（三公留任）。每期朝局会改变办差收益、送礼嫌疑或举荐成本；两次考核后主官换喜好，各衙人情 -1。对手嫌疑 ≥3 时，可花 2 政绩参奏：对手罚最多 12 两、降一职、人情清空、嫌疑 -3。</p>
          <p><strong>随机遭遇。</strong>每次未荣归的落子后，独立 30% 触发事件；文字狱风波、河患急报、驿站失文、岁末余银、雅集相邀、御史临门各占 5%。先由当事人选择应对，再继续下一位回合。每件事都有无需银两或政绩的选项。文字狱是架空的受牵连情节；对方也可自愿花 8 两援手，双方各 +1 政绩。不设置死亡或永久出局。</p>
          <p><strong>朝堂争辩。</strong>发起后双方暗选「典章 / 民情 / 实务」，投入 0–2 政绩。典章克民情，民情克实务，实务克典章。得分 = 投入 + 克制 2 分 + 本题官署专长 1 分。双方提交才揭晓和扣款；胜者 +2 政绩、10 两，入仕者本衙人情 +1，另一方 +1 政绩；平局各 +1 政绩、4 两。未提交的一方可推辞，不扣双方投入，但发起者的筹谋已用。每间每 6 次落子最多发起一次。</p>
          <p><strong>相逢。</strong>进入新官职时，两人若同衙不同职，低位者向高位者送 10 两；不足则送现有银两。比较该衙内的列序，同职、功名阶段和留任不送礼。这项自动见面礼不增加人情或嫌疑。</p>
          <p><strong>三公。</strong>太保逢德至太傅，太傅逢德至太师，太师再逢德荣归。三公逢才、功、赃留任，并分别向对手索取最多 10、8、5 两；实际索得银两则嫌疑 +1。三公也会被查办：太师退太傅、太傅退太保、太保退内阁大学士。这些金额与结算方式是本作设定。</p>
          <p><strong>胜负。</strong>先荣归者胜。银两最低为 0，不会破产出局；这版不混入四枚普通骰子的对子、穿花等另一套规则。</p>
          <p><strong>手机看图。</strong>全图可放大至 350%，放大后滑动 / 拖动。也可切换「分衙阅读」，选择衙门后逐格查看。搜索官职，或点「定位执子」快速回到棋子。</p>
          <p><strong>远程与续局。</strong>每间两席，自动保存；连续 30 天无操作后过期。双方联网同步，无回合倒计时。换设备时用自己的续局密钥恢复席位。旧版棋局会保留回合、银两并映射到新图的相应官职。</p>
          <div className="notice"><strong>依据与改编边界</strong><p>馆藏资料可核实三层分区、逐格判词、15 种出身与白丁去向；牛津藏本研究记有向上司送见礼。考核、文字狱、廷议提供历史背景，不同图本规则并不一致。送礼提高晋升、人情、主官性情、定期考核数值、随机事件选择和暗选争辩，均为本作原创机制。文字狱情节不复演具体史案；争辩胜负不代表观点在历史上正确。其余逐格升降、125 格规模和银两也是游戏改编，不宣称完整复刻古图。</p></div>
          <div className="sources-list"><h3>查阅资料</h3>{SOURCES.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><strong>{source.title} ↗</strong><span>{source.note}</span></a>)}</div>
        </div></> :
        modal === "install" ? <><p className="eyebrow">随身一方棋盘</p><h2>把同游放到桌面。</h2><p className="muted">以手机网页 App 的形式打开，<br/>点图标就能回到棋盘。</p>
          <div className="install-step"><b>iPhone / iPad</b><p>用 Safari 打开本站 → 轻点「分享」→「添加到主屏幕」→ 开启「作为网页 App 打开」（如有）→ 添加。</p></div>
          <div className="install-step"><b>Android</b><p>用 Chrome 打开本站 → 菜单 →「安装应用」或「添加到主屏幕」。</p></div>
          {installEvent && <button className="primary-button" onClick={async () => { await installEvent.prompt(); const c = await installEvent.userChoice; if (c.outcome === "accepted") { setInstallEvent(null); notify("已添加到桌面。"); } }}>添加同游到桌面<Download size={16}/></button>}
          <div className="notice">远程对局需要网络。若桌面 App 没有显示旧棋局，请在原浏览器复制续局密钥，在这里恢复。</div>
        </> :
        modal === "invite" ? <><p className="eyebrow">把这一席留给 TA</p><h2>邀你，同游一局。</h2><p className="muted">对方打开链接，写下名字就能入席。<br/>雅间号仅交给你要邀请的人。</p><div className="invite-code">{session?.code}</div><p className="share-link">{inviteLink()}</p>
          <button className="primary-button" onClick={share}><Share2 size={17}/>分享邀请</button><button className="secondary-button" onClick={() => copy(inviteLink(), "邀请链接已复制。")}><Copy size={16}/>复制邀请链接</button>
        </> :
        modal === "backup" ? <><p className="eyebrow">留一把回来的钥匙</p><h2>你的续局密钥</h2><p className="muted">换手机、浏览器或桌面 App 时，用它找回你的席位。对方入席用邀请链接，不用这把钥匙。</p><code className="recovery-code">{session?.code + "." + session?.token}</code><button className="primary-button" onClick={() => copy(session?.code + "." + session?.token, "续局密钥已复制，请保存到自己的备忘录。")}><Copy size={16}/>复制并自行保存</button><p className="fine-print">持有此密钥的人可以代你落子，请勿发送给他人。</p></> :
        modal === "restore" ? <><p className="eyebrow">旧局未散，等君归来</p><h2>找回你的席位</h2><label htmlFor="recovery">粘贴自己的续局密钥</label><textarea id="recovery" value={recovery} onChange={e => setRecovery(e.target.value)} placeholder="雅间号.续局密钥" rows={4} spellCheck={false}/><button className="primary-button" disabled={busy} onClick={() => { const [c, t] = recovery.trim().split("."); if (!/^[A-Z2-9]{8}$/.test(c || "") || !/^[a-f0-9]{64}$/.test(t || "")) { notify("密钥格式不正确，请完整复制。"); return; } void resume({ code: c, token: t }); }}>回到棋局<ArrowRight size={16}/></button><p className="fine-print">在旧设备的棋局下方，点「保存我的续局密钥」。</p></> :
        modal === "leave" ? <><p className="eyebrow">暂歇片刻</p><h2>回到门庭？</h2><p className="muted">这一局会保留。回来后，点「继续上次{isLocal ? "同屏棋局" : "雅间"}」即可续玩。</p><button className="primary-button" onClick={returnHome}>保存并返回<ArrowLeft size={16}/></button><button className="secondary-button" onClick={() => setModal(null)}>留在棋盘</button></> : null}
      </dialog>
    </div>}
  </div>;
}
