// Resume un respaldo de KalTrack en ~60 líneas para el agente kaltrack-coach (así no lee el JSON completo).
// Uso: node .claude/coach/analizar.mjs [ruta.json]
//   sin ruta: toma el kaltrack-respaldo-*.json más nuevo de respaldos/, Descargas, Escritorio o iCloud Drive.
// Solo lee: no modifica el respaldo ni manda nada a ningún lado.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'), HOME=os.homedir();
const ICLOUD=path.join(HOME,'Library/Mobile Documents/com~apple~CloudDocs');
const DIRS=[path.join(ROOT,'respaldos'), path.join(HOME,'Downloads'), path.join(HOME,'Desktop'), ICLOUD, path.join(ICLOUD,'Downloads')];

function newest(){
  let best=null;
  for(const d of DIRS){ let names; try{ names=fs.readdirSync(d); }catch{ continue; }
    for(const n of names) if(/^kaltrack-respaldo-.*\.json$/i.test(n)){
      const p=path.join(d,n), t=fs.statSync(p).mtimeMs; if(!best||t>best.t) best={p,t}; } }
  return best?.p;
}
const file=process.argv[2]||newest();
if(!file){
  console.log('NO HAY RESPALDO. El usuario debe exportarlo: KalTrack → Ajustes → Datos → Exportar, y mandarlo a la Mac '
    +'(AirDrop, o Guardar en Archivos → iCloud Drive). Busqué kaltrack-respaldo-*.json en:\n'+DIRS.join('\n'));
  process.exit(1);
}
const DB=JSON.parse(fs.readFileSync(file,'utf8'));

// biblioteca de ejercicios de la app: grupo muscular y parte del peso corporal que se carga
let LIB_BY={};
try{ const h=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  LIB_BY=new Function(h.slice(h.indexOf('const LIB=['), h.indexOf('const LGROUPS='))+'\nreturn LIB_BY;')(); }
catch{ console.log('(aviso: no pude leer la biblioteca de index.html: sin grupos ni carga de peso corporal)'); }

const N=k=>Date.UTC(+k.slice(0,4), +k.slice(5,7)-1, +k.slice(8,10))/864e5;   // fecha → número de día
const K=n=>new Date(n*864e5).toISOString().slice(0,10);
const r1=v=>Math.round(v*10)/10, r0=Math.round, sg=v=>(v>0?'+':'')+v, f2=v=>sg(+v.toFixed(2));
const avg=a=>a.length ? a.reduce((s,v)=>s+v,0)/a.length : NaN;
const sum=(a,f)=>a.reduce((s,x)=>s+(+f(x)||0),0);
const byD=(a,b)=>a.d<b.d?-1:a.d>b.d?1:0;
function slope(pts){   // regresión lineal: kg por día
  if(pts.length<3) return null;
  const mx=avg(pts.map(p=>p[0])), my=avg(pts.map(p=>p[1])); let sxy=0, sxx=0;
  for(const [x,y] of pts){ sxy+=(x-mx)*(y-my); sxx+=(x-mx)**2; }
  return sxx ? sxy/sxx : null;
}

const P=DB.profile||{}, G=DB.goals||{}, logs=DB.logs||{};
const W=(DB.weights||[]).slice().sort(byD), M=(DB.measures||[]).slice().sort(byD), L=(DB.lifts||[]).slice().sort(byD);
const fromName=(path.basename(file).match(/\d{4}-\d{2}-\d{2}/)||[])[0];
const END=[fromName, ...Object.keys(logs), ...W.map(x=>x.d), ...L.map(x=>x.d)].filter(Boolean).sort().at(-1)
  || new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);   // respaldo vacío: hoy
const E=N(END), days=(a,b)=>{ const o=[]; for(let n=E-b; n<=E-a; n++) o.push(K(n)); return o; };   // de hace b a hace a días
const ago=k=>E-N(k);
function weightOn(k){ let lo=0, hi=W.length-1, w=null;
  while(lo<=hi){ const m=(lo+hi)>>1; if(W[m].d<=k){ w=W[m].kg; lo=m+1; } else hi=m-1; }
  return w ?? W[0]?.kg ?? P.weight ?? 70; }
const wNow=weightOn(END), cal=G.cal||0;
const out=[], add=s=>out.push(s), S=[]; let stalled=[0,0];

// ---------- perfil ----------
add(`== RESPALDO ${path.basename(file)} · datos hasta ${END} ==`);
add(`Perfil: ${P.sex==='f'?'mujer':'hombre'} ${P.age??'?'} a, ${P.height??'?'} cm, objetivo ${P.goalType||'bajar'}, actividad ${P.act||'?'}, `
  +`${P.steps??10000} pasos, sueño ${P.sleepH??7.5} h, peso meta ${P.target??'—'}`);
add(`Metas: ${cal} kcal · P ${G.p} · C ${G.c} · G ${G.f} g · ejercicio ${G.burn} kcal · el ejercicio ${DB.exAdd?'SÍ':'no'} suma a restantes`);

// ---------- comida ----------
const day=k=>{ const l=logs[k], f=l?.foods||[];
  return {k, n:f.length, kcal:sum(f,x=>x.kcal), p:sum(f,x=>x.p), c:sum(f,x=>x.c), f:sum(f,x=>x.f), burn:sum(l?.ex||[],x=>x.kcal)}; };
const full=d=>d.n>0 && d.kcal>=0.5*cal;   // menos de la mitad de la meta = casi seguro un día sin terminar de registrar
const bmr=P.height&&P.age ? 10*wNow+6.25*P.height-5*P.age+(P.sex==='f'?-161:5) : null;
add('\n-- COMIDA (días completos = registró ≥50% de su meta; hoy no cuenta) --');
for(const n of [7,28]){
  const D=days(1,n).map(day), reg=D.filter(d=>d.n>0), ok=D.filter(full);
  if(!reg.length){ add(`Últimos ${n} d: sin registros`); continue; }
  const a=f=>r0(avg(ok.map(f)));
  add(`Últimos ${n} d: registró ${reg.length}/${n} (${reg.length-ok.length} incompletos) · kcal ${a(d=>d.kcal)} · P ${a(d=>d.p)} g `
    +`(${r1(avg(ok.map(d=>d.p))/wNow)} g/kg) · C ${a(d=>d.c)} · G ${a(d=>d.f)} · en meta ±10%: ${ok.filter(d=>Math.abs(d.kcal-cal)<=0.1*cal).length}/${ok.length}`
    +` · proteína ≥90%: ${ok.filter(d=>d.p>=0.9*G.p).length}/${ok.length} · ejercicio ${r0(avg(D.map(d=>d.burn)))} kcal/d`);
}
const D56=days(1,56).map(day).filter(full), dow=d=>new Date(N(d.k)*864e5).getUTCDay(), fin=D56.filter(d=>[0,6].includes(dow(d)));
if(fin.length>=3) add(`Fin de semana vs entre semana (8 sem): ${r0(avg(fin.map(d=>d.kcal)))} vs ${r0(avg(D56.filter(d=>![0,6].includes(dow(d))).map(d=>d.kcal)))} kcal`);
const F28=days(1,28).flatMap(k=>logs[k]?.foods||[]);
if(F28.length){
  const top={}; F28.forEach(x=>{ top[x.n]=(top[x.n]||0)+(+x.kcal||0); });
  const tot=sum(F28,x=>x.kcal);
  add(`Pesado en gramos: ${Math.round(100*F28.filter(x=>x.grams!=null).length/F28.length)}% de ${F28.length} registros (el resto por porción)`);
  add('Más calorías (28 d): '+Object.entries(top).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([n,v])=>`${n} ${r0(100*v/tot)}%`).join(' · '));
}
const badCustom=(DB.customFoods||[]).filter(f=>f.kcal>20 && Math.abs(f.kcal-(4*f.p+4*f.c+9*f.f))/f.kcal>0.2);
if(badCustom.length) add(`Alimentos propios con kcal que no cuadran con sus macros (>20%): ${badCustom.slice(0,5).map(f=>`${f.n} (${f.kcal} vs ${r0(4*f.p+4*f.c+9*f.f)})`).join(' · ')}`);

// ---------- peso ----------
add('\n-- PESO --');
let pace28=null;
if(!W.length) add('Sin pesajes');
else{
  const w0=W[0], wl=W.at(-1);
  add(`Inicio ${w0.kg} (${w0.d}) → último ${wl.kg} (${wl.d}, hace ${ago(wl.d)} d) · total ${sg(r1(wl.kg-w0.kg))} kg · pesajes en 28 d: ${W.filter(x=>ago(x.d)<28).length}`);
  const rate=(a,b)=>{ const s=slope(W.filter(x=>ago(x.d)>=a && ago(x.d)<b).map(x=>[N(x.d),x.kg])); return s==null?null:s*7; };
  pace28=rate(0,28);
  const fmtR=v=>v==null?'—':`${f2(v)} kg/sem (${f2(100*v/wNow)}%)`;
  add(`Ritmo: 4 sem ${fmtR(pace28)} · 4 sem anteriores ${fmtR(rate(28,56))} · 12 sem ${fmtR(rate(0,84))}`);
  const wk=[]; for(let i=11;i>=0;i--){ const v=W.filter(x=>ago(x.d)>=7*i && ago(x.d)<7*i+7).map(x=>x.kg); wk.push(v.length?r1(avg(v)):'—'); }
  add('Promedio por semana (12 sem, vieja→nueva): '+wk.join(' '));
}

// ---------- balance real: lo que come vs cómo cambia su peso ----------
add('\n-- BALANCE REAL (7,700 kcal ≈ 1 kg) --');
for(const n of [28,56]){
  const ok=days(1,n).map(day).filter(full), pts=W.filter(x=>ago(x.d)<n).map(x=>[N(x.d),x.kg]), s=slope(pts);
  if(ok.length<0.6*n || pts.length<6 || s==null){ add(`${n} d: datos insuficientes (${ok.length} días completos, ${pts.length} pesajes)`); continue; }
  const eat=avg(ok.map(d=>d.kcal)), tdee=eat-s*7700;
  add(`${n} d: come ${r0(eat)} · peso ${f2(s*7)} kg/sem → mantenimiento observado ≈ ${r0(tdee)} kcal/d, ${tdee>eat?'déficit':'superávit'} real ≈ ${r0(Math.abs(tdee-eat))}`);
}
if(bmr){
  const ok=days(1,28).map(day).filter(full), eat=avg(ok.map(d=>d.kcal))||cal, burn=avg(days(1,28).map(day).map(d=>d.burn))||0;
  const km=(P.steps??10000)*P.height*(P.sex==='f'?0.413:0.415)/1e5;
  add(`Estimado de la app (fórmula): basal ${r0(bmr)} + pasos ${r0(0.5*wNow*km)} + digestión ${r0(0.1*eat)} + ejercicio ${r0(burn)} = ${r0(bmr+0.5*wNow*km+0.1*eat+burn)} kcal/d`);
}

// ---------- medidas ----------
add('\n-- MEDIDAS --');
if(!M.length) add('Sin medidas');
else{
  const last=M.at(-1), NAMES={waist:'Cintura', bic:'Bíceps', chest:'Pecho', leg:'Pierna'};
  add(`${M.length} mediciones, última ${last.d} (hace ${ago(last.d)} d)`);
  add(Object.entries(NAMES).map(([k,n])=>{ const pts=M.filter(x=>x[k]!=null); if(!pts.length) return null;
    const cur=pts.at(-1), old=pts.filter(x=>ago(x.d)>=28).at(-1);
    return `${n} ${cur[k]} (${sg(r1(cur[k]-pts[0][k]))} desde ${pts[0].d}${old?`; ${sg(r1(cur[k]-old[k]))} en ~4 sem`:''})`; }).filter(Boolean).join(' · '));
  if(last.waist&&P.height) add(`Cintura/altura: ${(last.waist/P.height).toFixed(2)} (sano < 0.50)`);
}

// ---------- fuerza ----------
add('\n-- FUERZA (1RM estimado con Epley; peso corporal = parte de su peso de ese día + extra) --');
if(!L.length) add('Sin registros de pesas');
else{
  const bw=ex=>LIB_BY[ex]?.bw, load=(ex,s,d)=>bw(ex) ? weightOn(d)*LIB_BY[ex].bwf+(+s.kg||0) : +s.kg;
  const valid=(ex,s)=>s.reps>0 && (bw(ex) || s.kg>0), e1=(kg,r)=>r===1?kg:kg*(1+r/30);
  const fmtSet=(ex,s)=>bw(ex) ? `${+s.kg?'+'+s.kg:'PC'}×${s.reps}` : `${s.kg}×${s.reps}`;
  const days28=new Set(L.filter(x=>ago(x.d)<28).map(x=>x.d));
  add(`Días de pesas: ${days28.size} en 4 sem (${r1(days28.size/4)}/sem) · último ${L.at(-1).d}`);
  const by={}; L.forEach(l=>(by[l.ex]=by[l.ex]||[]).push(l));
  const groups={}, flags=[], rows=[];
  for(const [ex,ls] of Object.entries(by)){
    let best=0, bestD=null;
    const sess=ls.map((l,i)=>{ const S=(l.sets||[]).filter(s=>valid(ex,s)), b=Math.max(0,...S.map(s=>e1(load(ex,s,l.d),s.reps)));
      const top=S.slice().sort((a,c)=>e1(load(ex,c,l.d),c.reps)-e1(load(ex,a,l.d),a.reps))[0];
      if(ago(l.d)<28) groups[LIB_BY[ex]?.g||'Otros']=(groups[LIB_BY[ex]?.g||'Otros']||0)+S.length;
      // volver de una descarga no cuenta: solo un salto de >15% sobre su récord de siempre
      if(i>=3 && b>best*1.15 && ago(l.d)<56) flags.push(`${ex} ${l.d}: ${r0(100*(b/best-1))}% arriba de su récord de golpe`);
      if(S.some(s=>s.reps>30 || (!bw(ex) && s.kg>300))) flags.push(`${ex} ${l.d}: serie rara (${S.map(s=>fmtSet(ex,s)).join(', ')})`);
      if(b>best){ best=b; bestD=l.d; }
      return {d:l.d, b, top}; });
    const last=sess.at(-1); if(ago(last.d)>=56) continue;   // solo lo que entrena ahora
    const m4=Math.max(0,...sess.filter(s=>ago(s.d)<28).map(s=>s.b)), p4=Math.max(0,...sess.filter(s=>ago(s.d)>=28&&ago(s.d)<56).map(s=>s.b));
    stalled[1]++; if(sess.length>=3 && bestD!==last.d && ago(bestD)>=14) stalled[0]++;
    const sincePR=ago(bestD), st= bestD===last.d ? 'RÉCORD' : (sess.length>=3 && sincePR>=14 ? `ESTANCADO ${r0(sincePR/7)} sem` : `a ${r0(100*last.b/best)}% del récord`);
    rows.push(`${ex} (${LIB_BY[ex]?.g||'propio'}): ${sess.length} reg · último ${last.d} ${last.top?fmtSet(ex,last.top):''} · 1RM ${r1(best)} (${bestD})`
      +` · 4 sem ${m4?r1(m4):'—'} vs previas ${p4?r1(p4):'—'}${m4&&p4?` (${sg(r1(100*(m4/p4-1)))}%)`:''} · ${st}`);
  }
  rows.forEach(add);
  add('Series válidas por semana (4 sem): '+Object.entries(groups).sort((a,b)=>b[1]-a[1]).map(([g,v])=>`${g} ${r1(v/4)}`).join(' · '));
  if(flags.length) add('Posibles errores de captura: '+flags.slice(-6).join(' | '));
}

// ---------- señales para el coach (hechos, no consejos) ----------
const ok28=days(1,28).map(day), full28=ok28.filter(full), eat28=avg(full28.map(d=>d.kcal)), p28=avg(full28.map(d=>d.p));
if(full28.length && ok28.filter(d=>d.n>0).length-full28.length>4) S.push(`${ok28.filter(d=>d.n>0).length-full28.length} días incompletos en 28: los promedios pueden estar inflados`);
if(ok28.filter(d=>d.n>0).length<20) S.push(`solo ${ok28.filter(d=>d.n>0).length}/28 días registrados`);
if(full28.length && p28/wNow<1.6) S.push(`proteína ${r1(p28/wNow)} g/kg (< 1.6)`);
if(bmr && full28.length && eat28<bmr) S.push(`come ${r0(eat28)} kcal, menos que su basal (${r0(bmr)})`);
if(pace28!=null && -pace28/wNow>0.01) S.push(`baja ${r1(-100*pace28/wNow)}%/sem (>1%: riesgo de perder músculo)`);
if(pace28!=null && (P.goalType||'bajar')==='bajar' && pace28>-0.1 && W.filter(x=>ago(x.d)<28).length>=8) S.push('meseta: menos de 0.1 kg/sem en 4 semanas');
if(W.filter(x=>ago(x.d)<28).length<4) S.push('menos de 4 pesajes en 28 d: la tendencia no es confiable');
if(M.length && ago(M.at(-1).d)>14) S.push(`medidas atrasadas (${ago(M.at(-1).d)} d)`);
if(stalled[0]) S.push(`${stalled[0]} de ${stalled[1]} ejercicios activos llevan 2+ semanas sin récord`);
add('\n-- SEÑALES --\n'+(S.length?S.map(s=>'• '+s).join('\n'):'• nada fuera de lo normal'));

console.log(out.join('\n'));
