/* Autonomous comparison: one wide noisy camera versus three overlapping
   cameras. Each robot steers from its own estimated pose. */
(() => {
  const boot = () => document.querySelectorAll("[data-camera-compare-demo]").forEach(root => {
    if (root.dataset.bound) return;
    root.dataset.bound = "true";
    const get = name => root.querySelector('[data-compare="' + name + '"]');
    const canvases = {single:get("single"), multi:get("multi")};
    const contexts = {single:canvases.single.getContext("2d"), multi:canvases.multi.getContext("2d")};
    const tags = [{x:1,y:.35},{x:6,y:.35},{x:11,y:.35},{x:11.65,y:3.5},{x:11,y:6.65},{x:6,y:6.65},{x:1,y:6.65},{x:.35,y:3.5}];
    const dt=.05, halfFov=Math.PI/5;
    const cameras={single:[{offset:0,half:halfFov+.48}],multi:[{offset:-.48,half:halfFov},{offset:0,half:halfFov},{offset:.48,half:halfFov}]};
    const path=Array.from({length:40},(_,i)=>{const t=2*Math.PI*i/40;return{x:6+3.7*Math.sin(t),y:3.5+2.4*Math.sin(t)*Math.cos(t)};});
    const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
    const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
    const rand=()=>Math.sqrt(-2*Math.log(Math.max(1e-12,Math.random())))*Math.cos(2*Math.PI*Math.random());
    const approach=(v,t,s)=>v+clamp(t-v,-s,s);
    const active=()=>root.closest("section").classList.contains("present")&&!document.hidden;
    let states,paused=false,timer=null;

    function makeState(){
      const a=Math.atan2(path[1].y-path[0].y,path[1].x-path[0].x);
      return {x:path[0].x,y:path[0].y,a,left:0,right:0,biasL:.14,biasR:.25,t:0,waypoint:1,laps:0,ex:path[0].x,ey:path[0].y,ea:a,p:.12,pa:.003,k:0,hk:0,hits:[],samples:[],measurementSigma:null,errors:[]};
    }
    function reset(){states={single:makeState(),multi:makeState()};paused=false;get("pause").textContent="Pause";drawAll();readout();}

    const visible=(s,camera)=>tags.map((tag,i)=>({...tag,i,d:Math.hypot(tag.x-s.x,tag.y-s.y)})).filter(tag=>tag.d<=4.6&&Math.abs(wrap(Math.atan2(tag.y-s.y,tag.x-s.x)-wrap(s.a+camera.offset)))<=camera.half);
    function observe(s,cameraSet,noise){
      const observations=[];let allHits=[];
      cameraSet.forEach(camera=>{const hits=visible(s,camera);allHits=allHits.concat(hits);if(!hits.length)return;const sigma=noise/Math.sqrt(hits.length),headingSigma=sigma*.14;observations.push({x:s.x+rand()*sigma,y:s.y+rand()*sigma,a:wrap(s.a+rand()*headingSigma),variance:sigma*sigma,headingVariance:headingSigma*headingSigma});});
      if(!observations.length)return{measurement:null,variance:null,headingVariance:null,hits:allHits,samples:[]};
      const precision=observations.reduce((sum,o)=>sum+1/o.variance,0),headingPrecision=observations.reduce((sum,o)=>sum+1/o.headingVariance,0);
      const sin=observations.reduce((sum,o)=>sum+Math.sin(o.a)/o.headingVariance,0),cos=observations.reduce((sum,o)=>sum+Math.cos(o.a)/o.headingVariance,0);
      return{measurement:{x:observations.reduce((sum,o)=>sum+o.x/o.variance,0)/precision,y:observations.reduce((sum,o)=>sum+o.y/o.variance,0)/precision,a:Math.atan2(sin,cos)},variance:1/precision,headingVariance:1/headingPrecision,hits:allHits,samples:observations};
    }

    function updateState(s,cameraSet,motion,noise){
      let target=path[s.waypoint],distance=Math.hypot(target.x-s.ex,target.y-s.ey);
      if(distance<.34){s.waypoint=(s.waypoint+1)%path.length;if(s.waypoint===0)s.laps++;target=path[s.waypoint];distance=Math.hypot(target.x-s.ex,target.y-s.ey);}
      const desired=Math.atan2(target.y-s.ey,target.x-s.ex),headingError=wrap(desired-s.ea);
      const drive=clamp(distance*1.15,0,1.8)*clamp(1-Math.abs(headingError)/1.45,.18,1),turn=clamp(headingError*1.6,-1,1);
      s.left=approach(s.left,drive+turn*.62,3.2*dt);s.right=approach(s.right,drive-turn*.62,3.2*dt);
      const moving=Math.abs(s.left)+Math.abs(s.right);if(moving>.01){s.biasL=clamp(s.biasL+rand()*.002,.04,.4);s.biasR=clamp(s.biasR+rand()*.002,.04,.4);}
      const vl=s.left*(1-motion*s.biasL),vr=s.right*(1-motion*s.biasR),v=(vl+vr)/2,w=(vl-vr)/.6;
      s.a=wrap(s.a+w*dt);s.x=clamp(s.x+v*Math.cos(s.a)*dt,.28,11.72);s.y=clamp(s.y+v*Math.sin(s.a)*dt,.28,6.72);
      const ev=(s.left+s.right)/2,ew=(s.left-s.right)/.6;s.ea=wrap(s.ea+ew*dt);s.ex+=ev*Math.cos(s.ea)*dt;s.ey+=ev*Math.sin(s.ea)*dt;
      s.p+=dt*(.005+motion*motion*(.07*moving+.025*Math.abs(ew)));s.pa+=dt*(.00015+motion*motion*(.015*moving+.01*Math.abs(ew)));s.t++;
      const sensed=observe(s,cameraSet,noise);s.hits=sensed.hits;s.samples=sensed.samples;s.measurementSigma=sensed.variance===null?null:Math.sqrt(sensed.variance);
      if(sensed.measurement){s.k=s.p/(s.p+sensed.variance);s.hk=s.pa/(s.pa+sensed.headingVariance);if(s.t%4===0){s.ex+=s.k*(sensed.measurement.x-s.ex);s.ey+=s.k*(sensed.measurement.y-s.ey);s.ea=wrap(s.ea+s.hk*wrap(sensed.measurement.a-s.ea));s.p=(1-s.k)*s.p;s.pa=(1-s.hk)*s.pa;}}else{s.k=0;s.hk=0;}
      s.errors.push(Math.hypot(s.ex-s.x,s.ey-s.y));if(s.errors.length>160)s.errors.shift();
    }
    function update(){const motion=+get("motion").value,noise=+get("noise").value;updateState(states.single,cameras.single,motion,noise);updateState(states.multi,cameras.multi,motion,noise);drawAll();readout();}

    function draw(name){
      const c=canvases[name],ctx=contexts[name],s=states[name],cameraSet=cameras[name],sx=60,ox=50,oy=35,X=x=>ox+x*sx,Y=y=>oy+y*sx;
      ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle="#071321";ctx.fillRect(0,0,c.width,c.height);ctx.save();ctx.beginPath();ctx.rect(ox,oy,720,420);ctx.clip();ctx.strokeStyle="#21354a";ctx.lineWidth=1;
      for(let x=0;x<=12;x++){ctx.beginPath();ctx.moveTo(X(x),oy);ctx.lineTo(X(x),Y(7));ctx.stroke();}for(let y=0;y<=7;y++){ctx.beginPath();ctx.moveTo(ox,Y(y));ctx.lineTo(X(12),Y(y));ctx.stroke();}
      ctx.strokeStyle="rgba(255,255,255,.42)";ctx.lineWidth=2;ctx.setLineDash([7,6]);ctx.beginPath();path.forEach((p,i)=>i?ctx.lineTo(X(p.x),Y(p.y)):ctx.moveTo(X(p.x),Y(p.y)));ctx.closePath();ctx.stroke();ctx.setLineDash([]);
      path.forEach((p,i)=>{ctx.fillStyle=i===s.waypoint?"#ffb957":"rgba(255,255,255,.52)";ctx.beginPath();ctx.arc(X(p.x),Y(p.y),i===s.waypoint?4:2,0,Math.PI*2);ctx.fill();});
      const sigma=Math.sqrt(s.p)*sx,cx=X(s.ex),cy=Y(s.ey),r=Math.max(2,3*sigma),g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,"rgba(255,166,55,.68)");g.addColorStop(.45,"rgba(255,166,55,.20)");g.addColorStop(1,"rgba(255,166,55,0)");ctx.fillStyle=g;ctx.fillRect(ox,oy,720,420);
      cameraSet.forEach((camera,i)=>{ctx.fillStyle=i===0?"rgba(98,195,255,.09)":"rgba(181,127,255,.07)";ctx.strokeStyle=i===0?"#529fc3":"#9c73d6";const a=wrap(s.a+camera.offset);ctx.beginPath();ctx.moveTo(X(s.x),Y(s.y));ctx.arc(X(s.x),Y(s.y),4.6*sx,a-camera.half,a+camera.half);ctx.closePath();ctx.fill();ctx.stroke();});
      tags.forEach((tag,i)=>{const seen=s.hits.some(h=>h.i===i);ctx.fillStyle=seen?"#62dfa6":"#fff";ctx.fillRect(X(tag.x)-9,Y(tag.y)-9,18,18);ctx.fillStyle="#071321";ctx.fillRect(X(tag.x)-6,Y(tag.y)-6,12,12);});
      ctx.save();ctx.translate(X(s.x),Y(s.y));ctx.rotate(s.a);ctx.fillStyle="#62dfa6";ctx.fillRect(-14,-10,28,20);ctx.fillStyle="#071321";ctx.beginPath();ctx.moveTo(13,0);ctx.lineTo(4,-5);ctx.lineTo(4,5);ctx.closePath();ctx.fill();ctx.restore();
      ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx-7,cy);ctx.lineTo(cx+7,cy);ctx.moveTo(cx,cy-7);ctx.lineTo(cx,cy+7);ctx.moveTo(cx,cy);ctx.lineTo(cx+18*Math.cos(s.ea),cy+18*Math.sin(s.ea));ctx.stroke();ctx.restore();ctx.strokeStyle="#8199ac";ctx.lineWidth=2;ctx.strokeRect(ox,oy,720,420);
    }
    const drawAll=()=>{draw("single");draw("multi");};
    function readout(){
      ["single","multi"].forEach(name=>{const s=states[name],rms=Math.sqrt(s.errors.reduce((sum,e)=>sum+e*e,0)/Math.max(1,s.errors.length)),count=s.samples.length;get(name+"-error").textContent=rms.toFixed(2)+" m average error";get(name+"-count").textContent=count+" camera"+(count===1?"":"s")+" contributing";get(name+"-measurement").textContent=s.measurementSigma===null?"measurement σ —":"measurement σ "+s.measurementSigma.toFixed(2)+" m";get(name+"-sigma").textContent="belief σ "+Math.sqrt(s.p).toFixed(2)+" m";});
      get("route-status").textContent=`Single target ${states.single.waypoint+1} · fused target ${states.multi.waypoint+1}`;
    }
    ["noise","motion"].forEach(name=>get(name).addEventListener("input",()=>{get(name+"-out").textContent=(+get(name).value).toFixed(2)+(name==="noise"?" m":"");}));
    get("pause").addEventListener("click",()=>{paused=!paused;get("pause").textContent=paused?"Resume":"Pause";});get("reset").addEventListener("click",reset);
    reset();timer=window.setInterval(()=>{if(active()&&!paused)update();},50);
  });
  boot();if(window.Reveal?.on){Reveal.on("ready",boot);Reveal.on("slidechanged",boot);}
})();
