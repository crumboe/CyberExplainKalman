(() => {
  const boot = () => document.querySelectorAll("[data-auto-gain-demo]").forEach(root => {
    if (root.dataset.bound) return;
    root.dataset.bound = "true";
    const get = name => root.querySelector('[data-auto="' + name + '"]');
    let posteriorVariance = 0.08;

    const render = () => {
      const speed = Number(get("speed").value);
      const turn = Number(get("turn").value);
      const cameraSigma = Number(get("camera").value);
      const q = 0.002 + 0.018 * Math.abs(speed) + 0.00008 * Math.abs(turn);
      const r = cameraSigma * cameraSigma;
      const prior = posteriorVariance + q;
      const k = prior / (prior + r);
      posteriorVariance = (1 - k) * prior;

      get("speed-out").textContent = speed.toFixed(2) + " m/s";
      get("turn-out").textContent = turn.toFixed(0) + "°/s";
      get("camera-out").textContent = cameraSigma.toFixed(2) + " m";
      get("q").textContent = q.toFixed(3) + " m²";
      get("r").textContent = r.toFixed(3) + " m²";
      get("p-prior").textContent = prior.toFixed(3);
      get("k").textContent = k.toFixed(2);
      get("motion-pct").textContent = Math.round((1-k)*100) + "%";
      get("camera-pct").textContent = Math.round(k*100) + "%";
      get("trust-motion").style.width = ((1-k)*100) + "%";
      get("trust-camera").style.width = (k*100) + "%";
      get("motion-disk").style.setProperty("--spread", Math.min(150, 35 + Math.sqrt(prior)*95) + "px");
      get("camera-disk").style.setProperty("--spread", Math.min(150, 35 + cameraSigma*70) + "px");
    };

    ["speed", "turn", "camera"].forEach(name => get(name).addEventListener("input", render));
    get("reset").addEventListener("click", () => { posteriorVariance = 0.08; render(); });
    render();
    window.setInterval(() => {
      if (!document.hidden && root.closest("section").classList.contains("present")) render();
    }, 250);
  });
  if (Reveal.isReady()) boot(); else Reveal.on("ready", boot);
})();
