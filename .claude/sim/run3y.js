// Carga el catálogo y la biblioteca reales de index.html y corre la simulación en Node.
// Uso: node .claude/sim/run3y.js [salida.json]  → imprime el resumen y guarda el DB simulado (formato de respaldo)
// Guárdalo en el scratchpad, nunca en la carpeta de la app.
const fs=require('fs');
const h=fs.readFileSync(require('path').join(__dirname,'../../index.html'),'utf8');
const a=h.indexOf('// [nombre, porción, kcal, prot, carb, grasa]'), b=h.indexOf('// [nombre, kcal/min, emoji]');
const la=h.indexOf('const LIB=['), lb=h.indexOf('const LGROUPS=');
const {FOODS,LIB_BY}=new Function(h.slice(a,b)+'\n'+h.slice(la,lb)+'\nreturn {FOODS,LIB_BY};')();
const SIM3Y=require('./sim3y.js');
const {DB,daily,stats}=SIM3Y(FOODS,LIB_BY,'2026-10-06');
const at=k=>daily.find(x=>x.k>=k);
const lines=[];
for(const m of ['2023-10-07','2024-01-07','2024-04-07','2024-07-07','2024-10-07','2025-04-07','2025-10-07','2026-04-07','2026-10-06']){
  const x=at(m); const lbs=DB.measures.filter(z=>z.d<=m).slice(-1)[0];
  lines.push(`${m}  peso ${x.W.toFixed(1)}  grasa ${x.Fm.toFixed(1)} kg (${(100*x.Fm/x.W).toFixed(0)}%)  magra ${x.Lm.toFixed(1)}  cintura ${lbs.waist} bíceps ${lbs.bic} pecho ${lbs.chest} pierna ${lbs.leg}`);
}
console.log(lines.join('\n'));
const logged=Object.values(DB.logs);
const kc=logged.map(l=>l.foods.reduce((s,e)=>s+e.kcal,0)).filter(v=>v>0);
const pr=logged.map(l=>l.foods.reduce((s,e)=>s+e.p,0)).filter(v=>v>0);
const cb=logged.map(l=>l.foods.reduce((s,e)=>s+e.c,0)).filter(v=>v>0);
const ft=logged.map(l=>l.foods.reduce((s,e)=>s+e.f,0)).filter(v=>v>0);
const avg=a=>(a.reduce((s,v)=>s+v,0)/a.length).toFixed(0);
console.log('días registrados',logged.length,'de 1096 · kcal prom',avg(kc),'P',avg(pr),'C',avg(cb),'G',avg(ft));
console.log('ingesta real prom',avg(daily.map(x=>x.intake)),'gasto real prom',avg(daily.map(x=>x.tdee)));
console.log('pesajes',DB.weights.length,'medidas',DB.measures.length,'levantamientos',DB.lifts.length,'entrenamientos',stats.trained,'faltó',stats.missed);
console.log('tamaño JSON',(JSON.stringify(DB).length/1024/1024).toFixed(2),'MB');
const ex=[...new Set(DB.lifts.map(l=>l.ex))];
const e1=(kg,r)=>kg*(1+r/30);
for(const n of ex){ const L=DB.lifts.filter(l=>l.ex===n); const f=L[0], z=L[L.length-1];
  const best=l=>Math.max(...l.sets.map(s=>e1(n==='Dominadas'?80+s.kg:s.kg,s.reps)));
  console.log(n.padEnd(36), L.length,'reg ·', f.d, f.sets.map(s=>s.kg+'×'+s.reps).join(','),'→', z.d, z.sets.map(s=>s.kg+'×'+s.reps).join(','));
}
fs.writeFileSync(process.argv[2]||'/tmp/sim3y-db.json',JSON.stringify(DB));
