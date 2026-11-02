// The landing kit's behaviour: the install box, the window's views, the README's table of contents.
// The same file for every app; everything it needs is in the HTML the builder writes.
(() => {
  // the install box: tabs, and a copy button on each line
  for (const box of document.querySelectorAll("[data-install]")) {
    const pick = (os) => {
      box.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.os === os));
      box.querySelectorAll(".line").forEach((l) => (l.hidden = l.dataset.os !== os));
    };
    box.querySelectorAll(".tabs button").forEach((b) => (b.onclick = () => pick(b.dataset.os)));
    box.querySelectorAll("[data-copy]").forEach((b) => (b.onclick = async () => {
      try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = "Copied"; }
      catch { b.textContent = "Select it"; }
      setTimeout(() => (b.textContent = "Copy"), 1400);
    }));
  }

  // the windows: you pick a view, its prompt types itself, the view changes under it; a film plays from its start
  // when its view is shown and stops when another is; the number keys drive the window on screen
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, still ? 0 : ms));
  const seen = new Map();
  for (const win of document.querySelectorAll(".window")) {
    const segs = [...win.querySelectorAll(".seg")];
    const views = [...win.querySelectorAll(".view")];
    const ask = win.querySelector(".ask"), txt = ask.querySelector(".txt");
    const working = win.dataset.working || "Working…";
    let current = segs[0]?.dataset.view;
    const show = (id) => views.forEach((v) => {
      const on = v.dataset.view === id;
      v.classList.toggle("on", on);
      const film = v.querySelector("video");
      if (!film) return;
      if (on) { try { film.currentTime = 0; } catch {} film.play().catch(() => {}); } else film.pause();
    });
    // a click during the animation takes over: the newer choice wins, none is lost
    let turn = 0;
    async function go(id) {
      if (id === current) return;
      const mine = ++turn; current = id;
      const stale = () => mine !== turn;
      segs.forEach((s) => s.classList.toggle("on", s.dataset.view === id));
      const prompt = segs.find((s) => s.dataset.view === id)?.dataset.ask || "";
      if (prompt && !still && getComputedStyle(ask).display !== "none") {
        const r = ask.getBoundingClientRect();
        if (r.top < 0 || r.bottom > innerHeight) ask.scrollIntoView({ behavior: "smooth", block: "center" });
        txt.innerHTML = '<span class="cur"></span>';
        ask.classList.add("show");
        await sleep(200); if (stale()) return;
        const per = Math.min(45, 1100 / prompt.length);   // a long command types in about a second
        for (let i = 1; i <= prompt.length; i++) {
          txt.textContent = prompt.slice(0, i);
          txt.insertAdjacentHTML("beforeend", '<span class="cur"></span>');
          await sleep(per * (0.6 + Math.random() * 0.8)); if (stale()) return;
        }
        await sleep(300); if (stale()) return;
        txt.innerHTML = "";
        const w = document.createElement("span"); w.className = "work"; w.textContent = "✻ " + working; txt.append(w);
        await sleep(650); if (stale()) return;
        show(id);
        await sleep(400); if (stale()) return;
        ask.classList.remove("show");
      } else show(id);
    }
    segs.forEach((s) => (s.onclick = () => go(s.dataset.view)));
    seen.set(win, { visible: false, go, segs });
    new IntersectionObserver(([e]) => {
      seen.get(win).visible = e.isIntersecting;
      const film = win.querySelector(".view.on video");   // a film plays only while it is on screen
      if (film) { if (e.isIntersecting) film.play().catch(() => {}); else film.pause(); }
    }, { threshold: 0.35 }).observe(win.querySelector(".frame"));
  }
  // number keys only for a window on screen, so they never pull you back up
  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea/i.test(e.target.tagName)) return;
    for (const w of seen.values()) {
      const s = w.segs[+e.key - 1];
      if (s && w.visible) { w.go(s.dataset.view); break; }
    }
  });

  // the table of contents follows the section you are reading
  const links = [...document.querySelectorAll(".toc a")];
  if (links.length) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) links.forEach((l) => l.classList.toggle("on", l.hash === "#" + e.target.id));
    }, { rootMargin: "-35% 0px -60% 0px" });
    document.querySelectorAll(".md section").forEach((s) => io.observe(s));
  }
})();
