import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Shuffle, Plus, X, Trash2, RefreshCcw, Download } from "lucide-react";

const DEFAULT_PLAYERS = ["Joachim", "Edis", "Amalie", "Åshild"];

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function uniquePush(list, name) {
  const exists = list.some((n) => n.trim().toLowerCase() === name.trim().toLowerCase());
  return exists ? list : [...list, name.trim()];
}

function GlassButton({ icon: Icon, children, onClick, disabled, accent = false, size = "md", className = "" }) {
  const sizeCls = size === "lg" ? "px-5 py-3 text-base" : size === "sm" ? "px-3 py-2 text-sm" : "px-4 py-2";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group inline-flex items-center gap-2 rounded-2xl ${sizeCls} select-none transition-all 
        ${accent ? "bg-gradient-to-r from-cyan-400/30 via-indigo-400/30 to-fuchsia-400/30" : "bg-white/10"}
        backdrop-blur-xl border border-white/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_10px_30px_-10px_rgba(0,0,0,0.45)]
        hover:scale-[1.015] hover:bg-white/15 active:scale-[0.99]
        disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {Icon && (
        <span className="grid place-items-center bg-white/20 rounded-xl p-1 shadow-inner">
          <Icon className="w-4 h-4" />
        </span>
      )}
      <span className="font-medium tracking-wide drop-shadow-sm">{children}</span>
    </button>
  );
}

function PlayerChip({ name, onRemove }) {
  return (
    <motion.div
      layout
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xl shadow-sm"
    >
      <span className="font-semibold text-sm">{name}</span>
      <button
        aria-label={`Remove ${name}`}
        onClick={onRemove}
        className="p-1 rounded-lg hover:bg-white/20 active:scale-95 transition"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

function NameReel({ active, target, pool, delay = 0 }) {
  const [display, setDisplay] = useState("");
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Clear any previous timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!active) {
      // Stopped: show the target (or placeholder)
      setDisplay(target || "—");
      return;
    }

    // Active spin: rapidly cycle through pool, but be defensive if pool is empty
    timeoutRef.current = setTimeout(() => {
      if (!pool || pool.length === 0) {
        setDisplay("—");
        return;
      }
      intervalRef.current = setInterval(() => {
        const i = Math.floor(Math.random() * pool.length);
        setDisplay(pool[i]);
      }, 80);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [active, pool, target, delay]);

  return (
    <div className="relative w-full">
      <div className="w-full text-center text-base sm:text-lg font-semibold tracking-wide px-3 py-2 rounded-xl bg-white/20 border border-white/30 backdrop-blur-xl shadow-inner overflow-hidden">
        <motion.span
          key={active ? "spinning" : `reveal-${target}`}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="inline-block"
        >
          {display || "—"}
        </motion.span>
      </div>
    </div>
  );
}

function TeamCard({ index, names, reveal, playersPool, palette = "blue" }) {
  const colors =
    palette === "red"
      ? "from-rose-400/30 via-orange-400/30 to-amber-400/30"
      : "from-cyan-400/30 via-blue-400/30 to-indigo-400/30";

  return (
    <motion.div
      layout
      className={`relative rounded-3xl p-4 sm:p-5 bg-gradient-to-br ${colors} border border-white/20 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_20px_60px_-20px_rgba(0,0,0,0.5)]`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-widest opacity-80">Team {index + 1}</div>
        <div className="text-[10px] px-2 py-1 rounded-full bg-white/20 border border-white/30">2v2</div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <NameReel active={!reveal} target={names?.[0]} pool={playersPool} delay={100} />
        <NameReel active={!reveal} target={names?.[1]} pool={playersPool} delay={260} />
      </div>
    </motion.div>
  );
}

export default function FoosballTeamPicker() {
  const [players, setPlayers] = useState(DEFAULT_PLAYERS);
  const [name, setName] = useState("");

  // Animation state
  const [isDrawing, setIsDrawing] = useState(false);
  const [revealIndex, setRevealIndex] = useState(-1);
  const [teams, setTeams] = useState([]);
  const [waiting, setWaiting] = useState([]);

  const canDraw = players.length >= 2;

  const bubbles = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      s: Math.random() * 24 + 12,
      o: Math.random() * 0.35 + 0.12,
    }));
  }, []);

  // Refs to track timeouts/intervals so we can clear them on re-run/unmount
  const stageTimeoutRef = useRef(null);
  const stepIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      // clean up on unmount
      if (stageTimeoutRef.current) clearTimeout(stageTimeoutRef.current);
      if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
    };
  }, []);

  function addPlayer() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPlayers((prev) => uniquePush(prev, trimmed));
    setName("");
  }

  function removePlayer(n) {
    setPlayers((prev) => prev.filter((p) => p !== n));
  }

  function clearAll() {
    setPlayers([]);
  }

  function restoreDefaults() {
    setPlayers(DEFAULT_PLAYERS);
  }

  function clearTimers() {
    if (stageTimeoutRef.current) {
      clearTimeout(stageTimeoutRef.current);
      stageTimeoutRef.current = null;
    }
    if (stepIntervalRef.current) {
      clearInterval(stepIntervalRef.current);
      stepIntervalRef.current = null;
    }
  }

  function drawTeams() {
    if (!canDraw) return;

    // Clear any running timers from a previous draw
    clearTimers();

    const order = shuffleArray(players);
    const pairs = chunk(order.slice(0, Math.floor(order.length / 2) * 2), 2);
    const extras = order.slice(Math.floor(order.length / 2) * 2);

    setTeams(pairs);
    setWaiting(extras);

    setIsDrawing(true);
    setRevealIndex(-1);

    const total = pairs.length;
    const spinMs = Math.min(1800, 800 + total * 250);

    // stage 1: global spin then reveal first team
    stageTimeoutRef.current = setTimeout(() => {
      setRevealIndex(0);
      // stage 2: reveal subsequent teams one by one
      let i = 0;
      stepIntervalRef.current = setInterval(() => {
        i++;
        if (i >= total) {
          clearTimers();
          setIsDrawing(false);
          return;
        }
        setRevealIndex(i);
      }, 900);
    }, spinMs);
  }

  function onKeyDown(e) {
    if (e.key === "Enter") addPlayer();
  }

  // Toast for feedback
  const [toast, setToast] = useState({ visible: false, message: "" });
  function showToast(msg, ms = 1800) {
    setToast({ visible: true, message: msg });
    setTimeout(() => setToast({ visible: false, message: "" }), ms);
  }

  // Fallback copy implementation
  function fallbackCopyTextToClipboard(text) {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      // Avoid scrolling to bottom
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      document.body.appendChild(textArea);
      textArea.select();
      textArea.setSelectionRange(0, textArea.value.length);

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      return false;
    }
  }

  // Export current teams to clipboard with robust handling; also offer a download fallback
  async function copyTeams() {
    const lines = [
      "Foosball teams:",
      ...teams.map((t, i) => `Team ${i + 1}: ${t.join(" + ")}`),
      waiting.length ? `Waiting: ${waiting.join(", ")}` : "",
    ].filter(Boolean);
    const text = lines.join("\n");

    // Try Clipboard API first
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(text);
        showToast("Copied to clipboard");
        return;
      } catch (err) {
        // fall through to fallback methods
        // Common reason: permissions policy blocks clipboard (NotAllowedError)
      }
    }

    // Try legacy document.execCommand
    const fallbackSuccess = fallbackCopyTextToClipboard(text);
    if (fallbackSuccess) {
      showToast("Copied (fallback)");
      return;
    }

    // Final fallback: open prompt with the text (user can manually copy)
    try {
      // some environments (iframes) may even block prompt; guard with try-catch
      window.prompt("Copy the teams below (Ctrl/Cmd+C)", text);
      showToast("Opened prompt to copy manually");
    } catch (err) {
      showToast("Unable to copy — please select & copy manually");
    }
  }

  // Download teams as a .txt file
  function downloadTeams() {
    const lines = [
      "Foosball teams:",
      ...teams.map((t, i) => `Team ${i + 1}: ${t.join(" + ")}`),
      waiting.length ? `Waiting: ${waiting.join(", ")}` : "",
    ].filter(Boolean);
    const text = lines.join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "foosball-teams.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Downloaded teams.txt");
  }

  // Small self-test to exercise core logic (adds one test case)
  function runSelfTest() {
    // Test case 1: default 4 players
    setPlayers(["A", "B", "C", "D"]);
    setTimeout(() => {
      drawTeams();
      showToast("Self-test: ran draw with 4 players");
    }, 120);
  }

  const paletteFor = (idx) => (idx % 2 === 0 ? "blue" : "red");

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-900 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -inset-[20%] opacity-[0.85]" style={{
          background:
            "radial-gradient(1200px 800px at 20% 10%, rgba(0,255,255,0.20), transparent 60%)," +
            "radial-gradient(1100px 700px at 80% 10%, rgba(0,128,255,0.18), transparent 62%)," +
            "radial-gradient(1000px 800px at 30% 90%, rgba(255,0,128,0.16), transparent 55%)," +
            "radial-gradient(900px 700px at 80% 85%, rgba(255,200,0,0.12), transparent 50%)",
        }} />
        {bubbles.map((b) => (
          <motion.div
            key={b.id}
            className="absolute rounded-full bg-white"
            style={{ width: b.s, height: b.s, left: `${b.x}%`, top: `${b.y}%`, opacity: b.o }}
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 6 + (b.id % 5), repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight drop-shadow-lg">
              Foosball Team Picker
            </h1>
            <p className="text-sm sm:text-base opacity-80 mt-1">A neutral, foosball-themed picker with liquid-glass vibes.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <GlassButton icon={RefreshCcw} onClick={drawTeams} disabled={!canDraw} accent size="lg">
              Draw Teams
            </GlassButton>
            <GlassButton icon={Shuffle} onClick={() => setPlayers(shuffleArray(players))}>
              Shuffle Names
            </GlassButton>
            {/* <GlassButton icon={Download} onClick={copyTeams}>
              Copy Result
            </GlassButton> */}
            {/* <GlassButton icon={Download} onClick={downloadTeams}>
              Download .txt
            </GlassButton> */}
          </div>
        </header>

        <section className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-3xl p-5 bg-white/10 border border-white/20 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_30px_80px_-40px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="grid place-items-center w-9 h-9 rounded-2xl bg-white/20 border border-white/20">
                  <Users className="w-5 h-5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold">Players</h2>
              </div>
              <div className="flex gap-2">
                <GlassButton icon={Trash2} onClick={clearAll} size="sm">
                  Remove all
                </GlassButton>
                <GlassButton icon={RefreshCcw} onClick={restoreDefaults} size="sm">
                  Restore defaults
                </GlassButton>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <AnimatePresence initial={false}>
                {players.map((p) => (
                  <PlayerChip key={p} name={p} onRemove={() => removePlayer(p)} />
                ))}
              </AnimatePresence>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Add player name"
                  className="w-full px-4 py-3 rounded-2xl bg-white/15 border border-white/20 placeholder-white/70 outline-none focus:ring-2 focus:ring-cyan-300/50"
                />
              </div>
              <GlassButton icon={Plus} onClick={addPlayer} accent>
                Add
              </GlassButton>
            </div>

            <p className="mt-3 text-xs opacity-75">
              Tip: Works with any number of people. We'll make as many 2-person teams as possible; if there’s an odd one out, they’ll wait.
            </p>
          </div>

          <div className="rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-emerald-400/20 via-teal-400/20 to-cyan-400/20 border border-white/20 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_30px_80px_-40px_rgba(0,0,0,0.6)]">
            <div className="relative aspect-[4/3] max-h-[280px] w-full mx-auto overflow-hidden rounded-2xl bg-emerald-900/40 border border-white/20">
              <div className="absolute inset-0">
                <div className="absolute inset-2 rounded-xl border-2 border-white/30" />
                <div className="absolute left-1/2 top-2 bottom-2 w-[2px] bg-white/30" />
                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-24 border-2 border-white/30 rounded-r-full" />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-24 border-2 border-white/30 rounded-l-full" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-2 border-white/30" />
              </div>

              <AnimatePresence>
                {isDrawing && (
                  <motion.div
                    key="ball"
                    initial={{ x: -40, y: 0, scale: 0.9, rotate: 0, opacity: 0.9 }}
                    animate={{ x: [-40, 0, 40, 0, 40, 0], y: [0, -8, 0, -6, 0, -4], rotate: [0, 180, 360, 540, 720, 900], opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2.2, ease: "easeInOut" }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-[0_6px_20px_rgba(255,255,255,0.6)] border-2 border-white/50"
                  />
                )}
              </AnimatePresence>

              {Array.from({ length: 6 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute h-1 w-11 bg-white/50 rounded-full"
                  style={{ top: `${15 + i * 12}%` }}
                  animate={{ x: ["-6%", "6%", "-6%"] }}
                  transition={{ duration: 5 + (i % 3), repeat: Infinity, ease: "easeInOut", delay: i * 0.1 }}
                />
              ))}
            </div>
            <div className="mt-3 text-xs opacity-80">Press <span className="font-semibold">Draw Teams</span> to spin & reveal. First two teams are the current match.</div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 space-y-4">
            <div className="rounded-3xl p-5 bg-white/10 border border-white/20 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_30px_80px_-40px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-bold">Current Match</h3>
                <div className="text-xs opacity-75">Best of luck 🍀</div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <TeamCard index={0} names={teams[0] || []} reveal={revealIndex >= 0} playersPool={players} palette="blue" />
                <TeamCard index={1} names={teams[1] || []} reveal={revealIndex >= 1} playersPool={players} palette="red" />
              </div>
              {(!teams[0] || !teams[1]) && (
                <p className="mt-3 text-sm opacity-80">Add more players to form two full teams for the main table.</p>
              )}
            </div>

            {/* <div className="rounded-3xl p-5 bg-white/10 border border-white/20 backdrop-blur-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-bold">More Teams / Queue</h3>
                <div className="text-xs opacity-75">Auto-generated in pairs of two</div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.slice(2).map((t, i) => (
                  <TeamCard key={`q-${i}`} index={i + 2} names={t} reveal={revealIndex >= i + 2} playersPool={players} palette={paletteFor(i + 2)} />
                ))}
                {teams.length <= 2 && (
                  <div className="rounded-3xl min-h-[120px] grid place-items-center border border-dashed border-white/30 text-sm opacity-70">No extra teams yet — add more players.</div>
                )}
              </div>

              {waiting.length > 0 && (
                <div className="mt-4 text-sm opacity-85"><span className="font-semibold">Waiting:</span> {waiting.join(", ")}</div>
              )}
            </div> */}
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl p-5 bg-white/10 border border-white/20 backdrop-blur-2xl">
              <h3 className="text-lg sm:text-xl font-bold mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <GlassButton icon={RefreshCcw} onClick={drawTeams} accent>
                  Draw Now
                </GlassButton>
                <GlassButton icon={Shuffle} onClick={() => setPlayers(shuffleArray(players))}>
                  Shuffle Names
                </GlassButton>
                <GlassButton icon={Trash2} onClick={clearAll}>Remove All</GlassButton>
                <GlassButton onClick={restoreDefaults}>Restore Defaults</GlassButton>
                <GlassButton onClick={runSelfTest}>Run Self-test</GlassButton>
                <GlassButton onClick={() => { setPlayers(DEFAULT_PLAYERS); showToast('Defaults loaded'); }}>Load Defaults</GlassButton>
              </div>
              <p className="text-xs opacity-75 mt-3">Pro tip: Add friends or guests. The picker will make as many 2‑person teams as possible.</p>
            </div>

            <div className="rounded-3xl p-5 bg-white/10 border border-white/20 backdrop-blur-2xl">
              <h3 className="text-lg sm:text-xl font-bold mb-3">About the Draw</h3>
              <ul className="text-sm space-y-2 opacity-90 list-disc pl-5">
                <li>Neutral randomization using a Fisher‑Yates shuffle.</li>
                <li>Suspenseful reveal: global spin then team‑by‑team stop.</li>
                <li>Designed for one‑hand use on iPhone 14 Pro and scales to big screens.</li>
                <li>Copy results to share in chat with one tap (fallbacks applied if clipboard is blocked).</li>
              </ul>
            </div>
          </div>
        </section>

        <footer className="mt-10 text-center text-xs opacity-70">Built for daily 2v2 foosball — enjoy fair, fresh teams ⚽</footer>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast.visible && (
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            className="fixed left-1/2 -translate-x-1/2 bottom-8 z-50 rounded-xl px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20"
          >
            <div className="text-sm">{toast.message}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
