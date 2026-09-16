/* Teaching simulation: differential drive + independent Gaussian pose updates.
   Camera pose readings stand in for AprilTag image processing and pose solving. */
(() => {
  const boot = () => document.querySelectorAll("[data-tank-demo], [data-tank-fusion-demo]").forEach(root => {
    if (root.dataset.bound) return;
    root.dataset.bound = "true";
    const get = name => root.querySelector('[data-tank="' + name + '"]');
    const fusion = root.hasAttribute("data-tank-fusion-demo");
    const canvas = get("field"), ctx = canvas.getContext("2d");
    const keys = new Set();
    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
    const wrap = x => Math.atan2(Math.sin(x), Math.cos(x));
    const rand = () => Math.sqrt(-2 * Math.log(Math.max(1e-12, Math.random()))) * Math.cos(2 * Math.PI * Math.random());
    const approach = (v, target, step) => v + clamp(target - v, -step, step);
    const tags = [{x:1,y:0.18},{x:6,y:0.18},{x:11,y:0.18},{x:11.82,y:3.5},
      {x:11,y:6.82},{x:6,y:6.82},{x:1,y:6.82},{x:0.18,y:3.5}];
    const scale = 90, ox = 60, oy = 35, dt = 0.05;
    let s, paused = false, timer = null, seen = [], seenRear = [], lastWeights = "No camera update";
    const active = () => root.closest("section").classList.contains("present") && !document.hidden;
    const stop = () => {
      keys.clear();
      root.querySelectorAll("[data-steer]").forEach(b => b.classList.remove("pressed"));
    };
    function reset() {
      stop();
      s = {x:6,y:3.5,a:-Math.PI/2,ex:6,ey:3.5,ea:-Math.PI/2,
        left:0,right:0,p:0.12,pa:0.003,t:0,biasL:0.12,biasR:0.24};
      seen = []; seenRear = []; lastWeights = "No camera update";
      paused = false; get("pause").textContent = "Pause"; draw(); readout(false);
    }
    function update() {
      const m = +get("motion").value, noise = +get("sensor").value;
      const noiseRear = fusion ? +get("sensor2").value : 0, k = +get("gain").value;
      const drive = (keys.has("up") ? 1 : 0) - (keys.has("down") ? 1 : 0);
      const turn = (keys.has("right") ? 1 : 0) - (keys.has("left") ? 1 : 0);
      s.left = approach(s.left, drive * 1.45 + turn * 0.62, 2 * dt);
      s.right = approach(s.right, drive * 1.45 - turn * 0.62, 2 * dt);
      const moving = Math.abs(s.left) + Math.abs(s.right);
      if (moving > 0.01) {
        s.biasL = clamp(s.biasL + rand()*0.002, 0.04, 0.4);
        s.biasR = clamp(s.biasR + rand()*0.002, 0.04, 0.4);
      }
      const vl = s.left * (1 - m*s.biasL), vr = s.right * (1 - m*s.biasR);
      const v = (vl+vr)/2, w = (vl-vr)/0.6;
      s.a = wrap(s.a + w*dt);
      s.x = clamp(s.x + v*Math.cos(s.a)*dt, 0.28, 11.72);
      s.y = clamp(s.y + v*Math.sin(s.a)*dt, 0.28, 6.72);
      const ev = (s.left+s.right)/2, ew = (s.left-s.right)/0.6;
      s.ea = wrap(s.ea + ew*dt);
      s.ex += ev*Math.cos(s.ea)*dt;
      s.ey += ev*Math.sin(s.ea)*dt;
      // Diffusion plus heading uncertainty grows when dead reckoning.
      s.pa += dt * (0.00015 + m*m*(0.015*moving + 0.01*Math.abs(ew)));
      s.p += dt * (0.005 + m*m*(0.07*moving + 0.025*Math.abs(ew)) + ev*ev*s.pa*0.15);
      const visible = angle => tags.map((tag,i) => ({...tag,i,d:Math.hypot(tag.x-s.x,tag.y-s.y)}))
        .filter(tag => tag.d <= 4.6 && Math.abs(wrap(Math.atan2(tag.y-s.y,tag.x-s.x)-angle)) <= Math.PI/5);
      seen = visible(s.a);
      seenRear = fusion ? visible(wrap(s.a + Math.PI)) : [];
      s.t++;
      const corrected = (seen.length > 0 || seenRear.length > 0) && s.t % 4 === 0;
      if (corrected) {
        // Each camera forms an independent pose observation. Fuse the camera
        // observations by inverse variance, then apply the chosen Kalman gain.
        const observe = (hits, cameraNoise) => {
          if (!hits.length) return null;
          const sigma = cameraNoise / Math.sqrt(hits.length), hSigma = sigma * 0.14;
          return {x:s.x+rand()*sigma,y:s.y+rand()*sigma,a:wrap(s.a+rand()*hSigma),sigma,hSigma};
        };
        const front = observe(seen, noise), rear = observe(seenRear, noiseRear);
        const pf = front ? 1/(front.sigma*front.sigma) : 0;
        const pr = rear ? 1/(rear.sigma*rear.sigma) : 0;
        const total = pf + pr, wf = pf/total, wr = pr/total;
        const mx = (front?.x || 0)*wf + (rear?.x || 0)*wr;
        const my = (front?.y || 0)*wf + (rear?.y || 0)*wr;
        const ma = wrap(s.ea + (front ? wf*wrap(front.a-s.ea) : 0) + (rear ? wr*wrap(rear.a-s.ea) : 0));
        const variance = 1/total, headingVariance = variance*0.14*0.14;
        s.ex += k * (mx-s.ex); s.ey += k * (my-s.ey);
        s.ea = wrap(s.ea + k*wrap(ma-s.ea));
        s.p = (1-k)**2*s.p + k*k*variance;
        s.pa = (1-k)**2*s.pa + k*k*headingVariance;
        lastWeights = fusion ? `Front ${Math.round(wf*100)}% · rear ${Math.round(wr*100)}%` : "Front camera 100%";
      }
      draw(); readout(corrected);
    }
    function readout() {
      get("sight").textContent = seen.length ? seen.map(t => "#" + (t.i+1)).join(", ") : "No tags visible";
      if (fusion) {
        get("sight2").textContent = seenRear.length ? seenRear.map(t => "#" + (t.i+1)).join(", ") : "No tags visible";
        get("weights").textContent = lastWeights;
      }
      get("error").textContent = Math.hypot(s.ex-s.x,s.ey-s.y).toFixed(2) + " m";
      get("sigma").textContent = Math.sqrt(s.p).toFixed(2) + " m";
      const anyCamera = seen.length || seenRear.length;
      get("status").textContent = paused ? "Paused" : anyCamera && +get("gain").value > 0 ? (fusion ? "Wheel prediction + fused camera correction" : "Wheel prediction + camera correction") : "Predicting from wheels only";
    }
    function draw() {
      const X = x => ox+x*scale, Y = y => oy+y*scale;
      ctx.clearRect(0,0,1200,700); ctx.fillStyle="#071321"; ctx.fillRect(0,0,1200,700);
      ctx.save();ctx.beginPath();ctx.rect(ox,oy,1080,630);ctx.clip();
      ctx.strokeStyle="#21354a";ctx.lineWidth=1;
      for(let x=0;x<=12;x++){ctx.beginPath();ctx.moveTo(X(x),oy);ctx.lineTo(X(x),Y(7));ctx.stroke();}
      for(let y=0;y<=7;y++){ctx.beginPath();ctx.moveTo(ox,Y(y));ctx.lineTo(X(12),Y(y));ctx.stroke();}
      // Radial alpha follows exp(-r²/2σ²). Broad beliefs are visibly dimmer.
      const sigma=Math.sqrt(s.p)*scale, cx=X(s.ex), cy=Y(s.ey), r=Math.max(1,3*sigma);
      const gradient=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
      const alpha=Math.min(0.72,0.42/Math.max(0.35,Math.sqrt(s.p)));
      for(let i=0;i<=24;i++){const t=i/24;gradient.addColorStop(t,"rgba(255,166,55,"+(alpha*Math.exp(-4.5*t*t)*(i===24?0:1))+")");}
      ctx.fillStyle=gradient;ctx.fillRect(ox,oy,1080,630);
      ctx.strokeStyle="#ffb957";ctx.lineWidth=2;ctx.setLineDash([8,6]);
      ctx.beginPath();ctx.arc(cx,cy,2.448*sigma,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle="rgba(98,195,255,0.12)";ctx.strokeStyle="#529fc3";
      ctx.beginPath();ctx.moveTo(X(s.x),Y(s.y));ctx.arc(X(s.x),Y(s.y),4.6*scale,s.a-Math.PI/5,s.a+Math.PI/5);ctx.closePath();ctx.fill();ctx.stroke();
      if (fusion) {
        ctx.fillStyle="rgba(181,127,255,0.10)";ctx.strokeStyle="#b57fff";
        ctx.beginPath();ctx.moveTo(X(s.x),Y(s.y));ctx.arc(X(s.x),Y(s.y),4.6*scale,s.a+Math.PI-Math.PI/5,s.a+Math.PI+Math.PI/5);ctx.closePath();ctx.fill();ctx.stroke();
      }
      seen.forEach(tag => {ctx.strokeStyle="#62dfa6";ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(X(s.x),Y(s.y));ctx.lineTo(X(tag.x),Y(tag.y));ctx.stroke();});ctx.setLineDash([]);
      seenRear.forEach(tag => {ctx.strokeStyle="#b57fff";ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(X(s.x),Y(s.y));ctx.lineTo(X(tag.x),Y(tag.y));ctx.stroke();});ctx.setLineDash([]);
      tags.forEach((tag,i) => {
        const x=X(tag.x),y=Y(tag.y),vis=seen.some(t=>t.i===i)||seenRear.some(t=>t.i===i);
        ctx.fillStyle=vis?"#62dfa6":"#fff";ctx.fillRect(x-17,y-17,34,34);
        ctx.fillStyle="#06101c";ctx.fillRect(x-13,y-13,26,26);
        for(let row=0;row<4;row++)for(let col=0;col<4;col++)if(((i+3)*(row+1)+col*3+row*col)%5<2){ctx.fillStyle="#fff";ctx.fillRect(x-9+col*4.5,y-9+row*4.5,4.5,4.5);}
        ctx.font="bold 16px sans-serif";ctx.textAlign="center";ctx.fillStyle=vis?"#62dfa6":"#dce6ef";
        ctx.fillText("#"+(i+1),x,y+(tag.y>6? -25:34));
      });
      ctx.save();ctx.translate(X(s.x),Y(s.y));ctx.rotate(s.a);
      ctx.fillStyle="#9cabb7";ctx.fillRect(-23,-24,46,10);ctx.fillRect(-23,14,46,10);
      ctx.fillStyle="#62dfa6";ctx.fillRect(-22,-14,44,28);
      ctx.fillStyle="#071321";ctx.beginPath();ctx.moveTo(19,0);ctx.lineTo(5,-8);ctx.lineTo(5,8);ctx.closePath();ctx.fill();
      ctx.fillStyle="#62c3ff";ctx.fillRect(21,-7,7,14);ctx.restore();
      ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx-10,cy);ctx.lineTo(cx+10,cy);ctx.moveTo(cx,cy-10);ctx.lineTo(cx,cy+10);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+24*Math.cos(s.ea),cy+24*Math.sin(s.ea));ctx.stroke();
      ctx.restore();
      ctx.strokeStyle="#8199ac";ctx.lineWidth=3;ctx.strokeRect(ox,oy,1080,630);
      ctx.font="18px sans-serif";ctx.fillStyle="#d5e5f2";ctx.textAlign="left";ctx.fillText(`12 m × 7 m field     ${fusion ? "Cameras" : "Camera"}: 72° / 4.6 m`,ox,23);
      if(s.ex<0||s.ex>12||s.ey<0||s.ey>7){ctx.fillStyle="#ffb957";ctx.fillText("Estimate outside field: ("+s.ex.toFixed(1)+", "+s.ey.toFixed(1)+") m",450,23);}
    }
    [["gain","gain-out",""],["sensor","sensor-out"," m"],["motion","motion-out",""]].forEach(([name,out,unit]) => {
      get(name).addEventListener("input",()=>get(out).textContent=(+get(name).value).toFixed(2)+unit);
    });
    if (fusion) get("sensor2").addEventListener("input",()=>get("sensor2-out").textContent=(+get("sensor2").value).toFixed(2)+" m");
    root.querySelectorAll("[data-steer]").forEach(button=>{
      const name=button.dataset.steer;
      button.addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();button.setPointerCapture(e.pointerId);keys.add(name);button.classList.add("pressed");});
      ["pointerup","pointercancel","lostpointercapture"].forEach(event=>button.addEventListener(event,()=>{keys.delete(name);button.classList.remove("pressed");}));
      button.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();});
    });
    const mapping={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",w:"up",s:"down",a:"left",d:"right"};
    for(const type of ["keydown","keyup"])window.addEventListener(type,e=>{
      if(!active() || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
      const key=mapping[e.key];if(!key)return;
      e.preventDefault();e.stopImmediatePropagation();
      if(type==="keydown")keys.add(key);else keys.delete(key);
      root.querySelectorAll("[data-steer]").forEach(b=>b.classList.toggle("pressed",keys.has(b.dataset.steer)));
    },true);
    get("pause").addEventListener("click",()=>{paused=!paused;stop();get("pause").textContent=paused?"Resume":"Pause";readout();});
    get("reset").addEventListener("click",reset);
    window.addEventListener("blur",stop);
    document.addEventListener("visibilitychange",stop);
    reset();
    timer=window.setInterval(()=>{if(!active()){stop();return;}if(!paused)update();},50);
  });
  if (Reveal.isReady()) boot(); else Reveal.on("ready",boot);
})();
