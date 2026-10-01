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
    const settled = Array.from({ length: bins }, () => []);
    const falling = [];
    const low = 4;
    const high = 6;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let total = 0;
    let paused = false;
    let scaleMax = 25;
    let blockHeight = 10;

    const active = () => root.closest("section")?.classList.contains("present") && !document.hidden;
    const xPercent = (bin) => 5 + (bin + 0.5) * 90 / bins;
    const floorY = () => (chart.clientHeight || 400) - 54;
    const plotHeight = () => floorY() - 100;
    const targetTop = (bin) => floorY() - (counts[bin] + 1) * blockHeight;

    const redrawStacks = () => {
      settled.forEach((column) => column.forEach((element, level) => {
        element.style.top = `${floorY() - (level + 1) * blockHeight}px`;
        element.style.height = `${blockHeight}px`;
        element.style.borderWidth = blockHeight < 3 ? "0" : "1px";
      }));
    };

    const updateScale = () => {
      const tallest = Math.max(...counts);
      const nextMax = Math.max(25, Math.ceil((tallest + 2) / 5) * 5);
      if (nextMax === scaleMax) return false;
      scaleMax = nextMax;
      blockHeight = plotHeight() / scaleMax;
      get("scale-max").textContent = String(scaleMax);
      get("axis-top").textContent = String(scaleMax);
      get("axis-mid").textContent = String(Math.round(scaleMax / 2));
      redrawStacks();
      return true;
    };

    const settle = (block) => {
      block.element.classList.remove("falling");
      settled[block.bin].push(block.element);
      counts[block.bin] += 1;
      if (!updateScale()) {
        block.element.style.top = `${floorY() - counts[block.bin] * blockHeight}px`;
        block.element.style.height = `${blockHeight}px`;
        block.element.style.borderWidth = blockHeight < 3 ? "0" : "1px";
      }
    };

    const sample = () => {
      if (!active() || paused) return;
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
      element.style.height = `${Math.max(6, blockHeight)}px`;
      get("blocks").appendChild(element);
      const block = { element, bin, y: 73, velocity: 0 };
      if (reducedMotion.matches) settle(block);
      else falling.push(block);
    };

    const reset = () => {
      counts.fill(0);
      settled.forEach((column) => { column.length = 0; });
      falling.length = 0;
      get("blocks").replaceChildren();
      get("dot").style.left = "50%";
      get("reading").textContent = "—";
      get("count").textContent = "0";
      get("status").textContent = "Collecting readings";
      total = 0;
      paused = false;
      pauseButton.textContent = "Pause";
      scaleMax = 25;
      blockHeight = plotHeight() / scaleMax;
      get("scale-max").textContent = String(scaleMax);
      get("axis-top").textContent = String(scaleMax);
      get("axis-mid").textContent = String(Math.round(scaleMax / 2));
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
