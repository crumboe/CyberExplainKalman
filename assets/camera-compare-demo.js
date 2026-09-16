/* Side-by-side teaching simulation: one noisy camera versus three partially
   overlapping cameras. Both filters receive the same wheel prediction. */
(() => {
  const boot = () => document.querySelectorAll("[data-camera-compare-demo]").forEach(root => {
    if (root.dataset.bound) return;
    root.dataset.bound = "true";
    const get = name => root.querySelector('[data-compare="' + name + '"]');
    const canvases = {single:get("single"), multi:get("multi")};
    const contexts = {single:canvases.single.getContext("2d"), multi:canvases.multi.getContext("2d")};
    const tags = [{x:1,y:.35},{x:6,y:.35},{x:11,y:.35},{x:11.65,y:3.5},{x:11,y:6.65},{x:6,y:6.65},{x:1,y:6.65},{x:.35,y:3.5}];
    const dt=.05;
    const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
    const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
    const rand=()=>Math.sqrt(-2*Math.log(Math.max(1e-12,Math.random())))*Math.cos(2*Math.PI*Math.random());
    const approach=(v,t,s)=>v+clamp(t-v,-s,s);
    const active=()=>root.closest("section").classList.contains("present")&&!document.hidden;
    const path=Array.from({length:40},(_,i)=>{const t=2*Math.PI*i/40;return{x:6+3.7*Math.sin(t),y:3.5+2.4*Math.sin(t)*Math.cos(t)};});
    let truth, filters, paused=false, timer=null;

    const visible = (angle, x, y) => tags.map((tag,i)=>({...tag,i,d:Math.hypot(tag.x-x,tag.y-y)}))
      .filter(tag=>tag.d<=4.6&&Math.abs(wrap(Math.atan2(tag.y-y,tag.x-x)-angle))<=Math.PI/5);

    function reset(){
      const startAngle=Math.atan2(path[1].y-path[0].y,path[1].x-path[0].x);
      truth={x:path[0].x,y:path[0].y,a:startAngle,left:0,right:0,biasL:.14,biasR:.25,t:0,waypoint:1,laps:0};
      filters={single:{ex:truth.x,ey:truth.y,ea:truth.a,p:.12,pa:.003,k:0,hk:0,hits:[],samples:[],fused:null,measurementSigma:null,errors:[]},multi:{ex:truth.x,ey:truth.y,ea:truth.a,p:.12,pa:.003,k:0,hk:0,hits:[],samples:[],fused:null,measurementSigma:null,errors:[]}};
      paused=false;get("pause").textContent="Pause";drawAll();readout();
    }

    function observe(cameraAngles, noise){
      const observations=[];let allHits=[];
      cameraAngles.forEach(offset=>{
        const hits=visible(wrap(truth.a+offset),truth.x,truth.y);allHits=allHits.concat(hits);
        if(!hits.length)return;
        const sigma=noise/Math.sqrt(hits.length);
        const headingSigma=sigma*.14;
        observations.push({x:truth.x+rand()*sigma,y:truth.y+rand()*sigma,a:wrap(truth.a+rand()*headingSigma),variance:sigma*sigma,headingVariance:headingSigma*headingSigma});
      });
      if(!observations.length)return {measurement:null,variance:null,headingVariance:null,hits:allHits,samples:[]};
      const precision=observations.reduce((sum,o)=>sum+1/o.variance,0);
      const headingPrecision=observations.reduce((sum,o)=>sum+1/o.headingVariance,0);
      const sin=observations.reduce((sum,o)=>sum+Math.sin(o.a)/o.headingVariance,0),cos=observations.reduce((sum,o)=>sum+Math.cos(o.a)/o.headingVariance,0);
      return {measurement:{x:observations.reduce((sum,o)=>sum+o.x/o.variance,0)/precision,y:observations.reduce((sum,o)=>sum+o.y/o.variance,0)/precision,a:Math.atan2(sin,cos)},variance:1/precision,headingVariance:1/headingPrecision,hits:allHits,samples:observations};
    }

    function update(){
      const motion=+get("motion").value, noise=+get("noise").value;
      let target=path[truth.waypoint],distance=Math.hypot(target.x-truth.x,target.y-truth.y);
      if(distance<.34){truth.waypoint=(truth.waypoint+1)%path.length;if(truth.waypoint===0)truth.laps++;target=path[truth.waypoint];distance=Math.hypot(target.x-truth.x,target.y-truth.y);}
      const desired=Math.atan2(target.y-truth.y,target.x-truth.x),headingError=wrap(desired-truth.a);
      const drive=clamp(distance*.9,0,1.25)*clamp(1-Math.abs(headingError)/1.35,.12,1);
      const turn=clamp(headingError*1.45,-1,1);
      truth.left=approach(truth.left,drive+turn*.62,2*dt);
      truth.right=approach(truth.right,drive-turn*.62,2*dt);
      const moving=Math.abs(truth.left)+Math.abs(truth.right);
      if(moving>.01){truth.biasL=clamp(truth.biasL+rand()*.002,.04,.4);truth.biasR=clamp(truth.biasR+rand()*.002,.04,.4);}
      const vl=truth.left*(1-motion*truth.biasL),vr=truth.right*(1-motion*truth.biasR);
      const v=(vl+vr)/2,w=(vl-vr)/.6;
      truth.a=wrap(truth.a+w*dt);truth.x=clamp(truth.x+v*Math.cos(truth.a)*dt,.28,11.72);truth.y=clamp(truth.y+v*Math.sin(truth.a)*dt,.28,6.72);
      const ev=(truth.left+truth.right)/2,ew=(truth.left-truth.right)/.6;
      truth.t++;
      [["single",[0]],["multi",[-.48,0,.48]]].forEach(([name,angles])=>{
        const f=filters[name];f.ea=wrap(f.ea+ew*dt);f.ex+=ev*Math.cos(f.ea)*dt;f.ey+=ev*Math.sin(f.ea)*dt;
        f.p+=dt*(.005+motion*motion*(.07*moving+.025*Math.abs(ew)));
        f.pa+=dt*(.00015+motion*motion*(.015*moving+.01*Math.abs(ew)));
        const sensed=observe(angles,noise);f.hits=sensed.hits;f.samples=sensed.samples;f.fused=sensed.measurement;f.measurementSigma=sensed.variance===null?null:Math.sqrt(sensed.variance);
        if(sensed.measurement){f.k=f.p/(f.p+sensed.variance);f.hk=f.pa/(f.pa+sensed.headingVariance);if(truth.t%4===0){f.ex+=f.k*(sensed.measurement.x-f.ex);f.ey+=f.k*(sensed.measurement.y-f.ey);f.ea=wrap(f.ea+f.hk*wrap(sensed.measurement.a-f.ea));f.p=(1-f.k)*f.p;f.pa=(1-f.hk)*f.pa;}}
        else {f.k=0;f.hk=0;}
        f.errors.push(Math.hypot(f.ex-truth.x,f.ey-truth.y));if(f.errors.length>160)f.errors.shift();
      });
      drawAll();readout();
    }

    function draw(name,angles){
      const c=canvases[name],ctx=contexts[name],f=filters[name],sx=60,sy=60,ox=50,oy=35;
      const X=x=>ox+x*sx,Y=y=>oy+y*sy;
      ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle="#071321";ctx.fillRect(0,0,c.width,c.height);
      ctx.save();ctx.beginPath();ctx.rect(ox,oy,720,420);ctx.clip();ctx.strokeStyle="#21354a";ctx.lineWidth=1;
      for(let x=0;x<=12;x++){ctx.beginPath();ctx.moveTo(X(x),oy);ctx.lineTo(X(x),Y(7));ctx.stroke();}
      for(let y=0;y<=7;y++){ctx.beginPath();ctx.moveTo(ox,Y(y));ctx.lineTo(X(12),Y(y));ctx.stroke();}
      ctx.strokeStyle="rgba(255,255,255,.42)";ctx.lineWidth=2;ctx.setLineDash([7,6]);ctx.beginPath();path.forEach((point,i)=>{if(i===0)ctx.moveTo(X(point.x),Y(point.y));else ctx.lineTo(X(point.x),Y(point.y));});ctx.closePath();ctx.stroke();ctx.setLineDash([]);
      path.forEach((point,i)=>{ctx.fillStyle=i===truth.waypoint?"#ffb957":"rgba(255,255,255,.52)";ctx.beginPath();ctx.arc(X(point.x),Y(point.y),i===truth.waypoint?4:2,0,Math.PI*2);ctx.fill();});
      const sigma=Math.sqrt(f.p)*sx,cx=X(f.ex),cy=Y(f.ey),r=Math.max(2,3*sigma),g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
      g.addColorStop(0,"rgba(255,166,55,.68)");g.addColorStop(.45,"rgba(255,166,55,.20)");g.addColorStop(1,"rgba(255,166,55,0)");ctx.fillStyle=g;ctx.fillRect(ox,oy,720,420);
      angles.forEach((offset,i)=>{ctx.fillStyle=i===0?"rgba(98,195,255,.09)":"rgba(181,127,255,.07)";ctx.strokeStyle=i===0?"#529fc3":"#9c73d6";const a=wrap(truth.a+offset);ctx.beginPath();ctx.moveTo(X(truth.x),Y(truth.y));ctx.arc(X(truth.x),Y(truth.y),4.6*sx,a-Math.PI/5,a+Math.PI/5);ctx.closePath();ctx.fill();ctx.stroke();});
      tags.forEach((tag,i)=>{const seen=f.hits.some(h=>h.i===i);ctx.fillStyle=seen?"#62dfa6":"#fff";ctx.fillRect(X(tag.x)-9,Y(tag.y)-9,18,18);ctx.fillStyle="#071321";ctx.fillRect(X(tag.x)-6,Y(tag.y)-6,12,12);});
      ctx.save();ctx.translate(X(truth.x),Y(truth.y));ctx.rotate(truth.a);ctx.fillStyle="#62dfa6";ctx.fillRect(-14,-10,28,20);ctx.fillStyle="#071321";ctx.beginPath();ctx.moveTo(13,0);ctx.lineTo(4,-5);ctx.lineTo(4,5);ctx.closePath();ctx.fill();ctx.restore();
      ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx-7,cy);ctx.lineTo(cx+7,cy);ctx.moveTo(cx,cy-7);ctx.lineTo(cx,cy+7);ctx.moveTo(cx,cy);ctx.lineTo(cx+18*Math.cos(f.ea),cy+18*Math.sin(f.ea));ctx.stroke();ctx.restore();ctx.strokeStyle="#8199ac";ctx.lineWidth=2;ctx.strokeRect(ox,oy,720,420);
    }
    const drawAll=()=>{draw("single",[0]);draw("multi",[-.48,0,.48]);};
    function readout(){
      ["single","multi"].forEach(name=>{const f=filters[name],rms=Math.sqrt(f.errors.reduce((sum,e)=>sum+e*e,0)/Math.max(1,f.errors.length)),cameraCount=f.samples.length;get(name+"-error").textContent=rms.toFixed(2)+" m average error";get(name+"-count").textContent=cameraCount+" camera"+(cameraCount===1?"":"s")+" contributing";get(name+"-measurement").textContent=f.measurementSigma===null?"measurement σ —":"measurement σ "+f.measurementSigma.toFixed(2)+" m";get(name+"-sigma").textContent="belief σ "+Math.sqrt(f.p).toFixed(2)+" m";});
      get("route-status").textContent=`Target waypoint ${truth.waypoint+1} of ${path.length}${truth.laps?` · lap ${truth.laps+1}`:""}`;
    }
    ["noise","motion"].forEach(name=>get(name).addEventListener("input",()=>{get(name+"-out").textContent=(+get(name).value).toFixed(2)+(name==="noise"?" m":"");}));
    get("pause").addEventListener("click",()=>{paused=!paused;get("pause").textContent=paused?"Resume":"Pause";});
    get("reset").addEventListener("click",reset);
    reset();timer=window.setInterval(()=>{if(!active())return;if(!paused)update();},50);
  });
  boot();if(window.Reveal?.on){Reveal.on("ready",boot);Reveal.on("slidechanged",boot);}
})();
