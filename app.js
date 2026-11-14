const TYPES=["Motorcycle","Compact","Large","EV"];
const rates={Motorcycle:20,Compact:40,Large:60,EV:50};
const spots=[];
[["Motorcycle",6],["Compact",8],["Large",6],["EV",4]].forEach(([t,n])=>{
    for(let i=1;i<=n;i++){
        spots.push({id:t[0]+i,type:t,ticket:null});
    }
});
let tickets=[],revenue=0,log=[],tid=1,lockOn=true,speed=1,tab="dash",authed=false,chain=Promise.resolve();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rnd=(a,b)=>a+Math.random()*(b-a);
const money=n=>"₹"+n.toLocaleString("en-IN");
function say(msg,cls){
    log.unshift({t:new Date().toLocaleTimeString(),msg,cls:cls||""});
    if(log.length>120)log.pop();
}
function withLock(fn){
    const run=chain.then(fn);
    chain=run.catch(()=>{});
    return run;
}
async function allocate(plate,type,gate){
    const work=async()=>{
        const s=spots.find(x=>x.type===type&&!x.ticket);
        if(!s){say("Gate "+gate+": "+plate+" rejected, no free "+type+" spot","bad");render();return null}
        await sleep(rnd(40,260));
        if(s.ticket){
            const old=tickets.find(x=>x.id===s.ticket);
            say("RACE: "+s.id+" double-booked at Gate "+gate+", "+(old?old.plate:"?")+" evicted","bad");
            if(old)old.void=true;
        }
        const t={id:tid++,plate,type,spot:s.id,gate,inAt:Date.now(),done:false};
        tickets.push(t);
        s.ticket=t.id;
        say("Gate "+gate+": "+plate+" → "+s.id+" (ticket #"+t.id+")","ok");
        render();
        return t;
    };
    return lockOn?withLock(work):work();
}
function mins(t,end){return(end-t.inAt)/1000*speed/60*60}
function fee(t,end){
    const m=mins(t,end||Date.now());
    if(m<=15)return 0;
    return Math.ceil(m/60)*rates[t.type];
}
async function exitCar(id,gate,method){
    const t=tickets.find(x=>x.id===id);
    if(!t||t.done)return;
    const now=Date.now(),f=fee(t,now);
    await withLock(async()=>{
        await sleep(rnd(30,120));
        const s=spots.find(x=>x.id===t.spot);
        if(s&&s.ticket===t.id)s.ticket=null;
        t.done=true;t.fee=f;t.method=method;
        revenue+=f;
        say("Gate "+gate+": #"+t.id+" "+t.plate+" exit, "+Math.round(mins(t,now))+" min, "+money(f)+" via "+method,"ok");
    });
    render();
}
const parked=()=>tickets.filter(t=>!t.done&&!t.void);
function burst(){
    const plates=Array.from({length:12},()=>"PB"+(10+Math.floor(rnd(0,89)))+"-"+Math.floor(rnd(1000,9999)));
    say("Burst: 12 simultaneous entries across gates A/B/C","warn");
    Promise.all(plates.map(p=>{
        const g="ABC"[Math.floor(rnd(0,3))],ty=TYPES[Math.floor(rnd(0,4))];
        return allocate(p,ty,g);
    })).then(render);
}
function exitBurst(){
    const list=parked().slice(0,6);
    say("Burst: "+list.length+" simultaneous exits","warn");
    Promise.all(list.map(t=>exitCar(t.id,"ABC"[Math.floor(rnd(0,3))],["Cash","Credit Card","UPI"][Math.floor(rnd(0,3))])));
}
function setTab(t){tab=t;render()}
function dash(){
    const free=TYPES.map(t=>spots.filter(s=>s.type===t&&!s.ticket).length);
    const occ=spots.filter(s=>s.ticket).length;
    return `<div class="g g4">
    <div class="c"><div class="mu">Occupancy</div><div class="k">${occ}/${spots.length}</div></div>
    <div class="c"><div class="mu">Revenue</div><div class="k">${money(revenue)}</div></div>
    <div class="c"><div class="mu">Parked now</div><div class="k">${parked().length}</div></div>
    <div class="c"><div class="mu">Free by type</div><div class="mu">${TYPES.map((t,i)=>t+" "+free[i]).join(" · ")}</div></div></div>
    <div class="c" style="margin-top:12px"><h2>Spots</h2><div class="spots">${spots.map(s=>{
        const t=tickets.find(x=>x.id===s.ticket);
        return `<div class="s ${s.ticket?"b":""}"><b>${s.id}</b>${t?t.plate:"free"}</div>`}).join("")}</div></div>
    <div class="c t" style="margin-top:12px"><h2>Active tickets</h2><table><tr><th>#</th><th>Plate</th><th>Spot</th><th>Gate</th><th>Min</th><th>Fee now</th></tr>
    ${parked().map(t=>`<tr><td>${t.id}</td><td>${t.plate}</td><td>${t.spot}</td><td>${t.gate}</td><td>${Math.round(mins(t,Date.now()))}</td><td>${money(fee(t))}</td></tr>`).join("")||'<tr><td colspan="6" class="mu">No vehicles</td></tr>'}</table></div>`;
}
function gates(){
    const opts=(a)=>a.map(x=>`<option>${x}</option>`).join("");
    return `<div class="g g2"><div class="c"><h2>Entry check-in</h2>
    <div class="row"><input id="pl" placeholder="Plate e.g. PB08-1234"><select id="ty">${opts(TYPES)}</select><select id="ge">${opts(["A","B","C"])}</select></div>
    <button class="p" onclick="enter()">Check in</button></div>
    <div class="c"><h2>Exit &amp; mock payment</h2>
    <div class="row"><select id="tk">${parked().map(t=>`<option value="${t.id}">#${t.id} ${t.plate} (${money(fee(t))})</option>`).join("")||"<option value=''>none</option>"}</select>
    <select id="xg">${opts(["A","B","C"])}</select><select id="pm">${opts(["Cash","Credit Card","UPI"])}</select></div>
    <button class="p" onclick="leave()">Pay &amp; exit</button></div></div>
    <div class="c" style="margin-top:12px"><h2>Concurrency demo</h2>
    <div class="row"><button class="p" onclick="burst()">Fire 12 parallel entries</button><button onclick="exitBurst()">Fire parallel exits</button>
    <label><input type="checkbox" ${lockOn?"checked":""} onchange="lockOn=this.checked;say('Allocation lock '+(lockOn?'ON (mutex)':'OFF (unsafe, races possible)'),'warn');render()"> Mutex on slot allocation</label>
    <label>Clock <select onchange="speed=+this.value;render()"><option value="1" ${speed==1?"selected":""}>1 s = 1 min</option><option value="10" ${speed==10?"selected":""}>1 s = 10 min</option></select></label></div>
    <div class="mu">Turn the mutex off and fire a burst: reads and writes interleave, so two gates can claim one spot.</div></div>`;
}
function admin(){
    if(!authed)return `<div class="c" style="max-width:340px"><h2>Staff login</h2><div class="row"><input id="pw" type="password" placeholder="Password"><button class="p" onclick="login()">Sign in</button></div><div class="mu">Demo password: admin123</div></div>`;
    return `<div class="c"><h2>Hourly rates (₹)</h2><div class="row">${TYPES.map(t=>`<label>${t} <input type="number" min="0" style="width:80px" value="${rates[t]}" onchange="rates['${t}']=+this.value;say('Rate ${t} set to ₹'+this.value,'warn');render()"></label>`).join("")}</div>
    <div class="mu">First 15 minutes free, then billed per started hour.</div>
    <div class="row" style="margin-top:10px"><button onclick="resetLot()">Reset lot</button><button onclick="authed=false;render()">Sign out</button></div></div>
    <div class="c t" style="margin-top:12px"><h2>Completed</h2><table><tr><th>#</th><th>Plate</th><th>Type</th><th>Fee</th><th>Paid by</th></tr>
    ${tickets.filter(t=>t.done).map(t=>`<tr><td>${t.id}</td><td>${t.plate}</td><td>${t.type}</td><td>${money(t.fee)}</td><td>${t.method}</td></tr>`).join("")||'<tr><td colspan="5" class="mu">None yet</td></tr>'}</table></div>`;
}
function login(){
    if(document.getElementById("pw").value==="admin123"){authed=true;say("Staff signed in","ok")}
    else say("Failed staff login","bad");
    render();
}
function resetLot(){
    spots.forEach(s=>s.ticket=null);tickets=[];revenue=0;log=[];tid=1;say("Lot reset","warn");render();
}
function enter(){
    const p=document.getElementById("pl").value.trim()||"PB"+Math.floor(rnd(10,99))+"-"+Math.floor(rnd(1000,9999));
    allocate(p,document.getElementById("ty").value,document.getElementById("ge").value);
}
function leave(){
    const id=+document.getElementById("tk").value;
    if(id)exitCar(id,document.getElementById("xg").value,document.getElementById("pm").value);
}
function render(){
    const keep=document.activeElement&&document.activeElement.id==="pl";
    if(keep)return;
    document.getElementById("tabs").innerHTML=[["dash","Dashboard"],["gates","Gates"],["admin","Admin"]].map(([k,n])=>`<button class="${tab===k?"on":""}" onclick="setTab('${k}')">${n}</button>`).join("");
    document.getElementById("v").innerHTML=(tab==="dash"?dash():tab==="gates"?gates():admin())+
    `<div class="c" style="margin-top:12px"><h2>Event log</h2><div class="log">${log.map(l=>`<div class="${l.cls}">${l.t}  ${l.msg}</div>`).join("")||'<span class="mu">No events</span>'}</div></div>`;
}
setInterval(()=>{if(tab==="dash")render()},2000);
render();
