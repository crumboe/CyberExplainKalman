/* A fixed distance measured repeatedly with several small, independent errors.
   The summed errors approximate a bell-shaped distribution. */
(() => {
  const boot = () => document.querySelectorAll("[data-sensor-noise-demo]").forEach((root) => {
    if (root.dataset.bound) return;
    root.dataset.bound = "true";

    const get = (name) => root.querySelector(`[data-noise="${name}"]`);
    const chart = root.querySelector(".noise-chart");
    const pauseButton = root.querySelector('[data-noise-action="pause"]');
    const resetButton = root.querySelector('[data-noise-action="reset"]');
    const bins = 41;
    const counts = Array(bins).fill(0);
    const falling = [];
    const low = 4;
    const high = 6;
    const blockHeight = 10;
    const maxStack = 22;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let total = 0;
    let paused = false;
    let full = false;

    const active = () => root.closest("section")?.classList.contains("present") && !document.hidden;
    const xPercent = (bin) => 5 + (bin + 0.5) * 90 / bins;
    const floorTop = () => chart.clientHeight - 54 - blockHeight;
    const targetTop = (bin) => floorTop() - counts[bin] * blockHeight;

    const settle = (block) => {
      block.element.style.top = `${targetTop(block.bin)}px`;
      block.element.classList.remove("falling");
      counts[block.bin] += 1;
      if (counts[block.bin] >= maxStack && !full) {
        full = true;
        get("status").textContent = "Pile reached the top — reset to watch again";
        pauseButton.disabled = true;
      }
    };

    const sample = () => {
      if (!active() || paused || full) return;
      // Twelve small independent timing errors have a sum close to Gaussian.
      let error = 0;
      for (let i = 0; i < 12; i += 1) error += Math.random() - 0.5;
      const rawReading = 5 + 0.30 * error;
      const bin = Math.max(0, Math.min(bins - 1, Math.floor((rawReading - low) / (high - low) * bins)));
      const reading = low + (bin + 0.5) * (high - low) / bins;
      const left = `${xPercent(bin)}%`;

      get("dot").style.left = left;
      get("reading").textContent = `${reading.toFixed(2)} m`;
      get("count").textContent = String(++total);

      const element = document.createElement("span");
      element.className = "noise-block falling";
      element.style.left = left;
      element.style.top = "73px";
      get("blocks").appendChild(element);
      const block = { element, bin, y: 73, velocity: 0 };
      if (reducedMotion.matches) settle(block);
      else falling.push(block);
    };

    const reset = () => {
      counts.fill(0);
      falling.length = 0;
      get("blocks").replaceChildren();
      get("dot").style.left = "50%";
      get("reading").textContent = "—";
      get("count").textContent = "0";
      get("status").textContent = "Collecting readings";
      total = 0;
      paused = false;
      full = false;
      pauseButton.disabled = false;
      pauseButton.textContent = "Pause";
    };

    const stepGravity = () => {
      if (!active() || paused) return;
      const dt = 0.016;
      for (let i = falling.length - 1; i >= 0; i -= 1) {
        const block = falling[i];
        block.velocity += 1800 * dt;
        block.y += block.velocity * dt;
        if (block.y >= targetTop(block.bin)) {
          settle(block);
          falling.splice(i, 1);
        } else {
          block.element.style.top = `${block.y}px`;
        }
      }
    };

    pauseButton.addEventListener("click", (event) => {
      event.stopPropagation();
      paused = !paused;
      pauseButton.textContent = paused ? "Resume" : "Pause";
      get("status").textContent = paused ? "Paused" : "Collecting readings";
    });
    resetButton.addEventListener("click", (event) => {
      event.stopPropagation();
      reset();
    });

    reset();
    window.setInterval(sample, 65);
    window.setInterval(stepGravity, 16);
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  if (window.Reveal?.on) window.Reveal.on("ready", boot);
})();
