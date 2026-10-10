// Simulación de 3 años de uso de KalTrack. Corre en Node (para calibrar) y en el navegador (para cargar los datos).
// Necesita: FOODS (catálogo de la app), LIB_BY (biblioteca de ejercicios), endKey ('YYYY-MM-DD' = hoy).
function SIM3Y(FOODS, LIB_BY, endKey, opt={}){
  // ---------- utilidades ----------
  let seed=opt.seed||20231007;
  const rnd=()=>{ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
  const gauss=()=>{ let u=0,v=0; while(!u)u=rnd(); while(!v)v=rnd(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
  const pick=a=>a[Math.floor(rnd()*a.length)];
  const r1=v=>Math.round(v*10)/10;
  const pad=n=>String(n).padStart(2,'0');
  const key=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const [ey,em,ed]=endKey.split('-').map(Number);
  const END=new Date(ey,em-1,ed), NDAYS=1096;
  const dayDate=i=>{ const d=new Date(END); d.setDate(d.getDate()-(NDAYS-1)+i); return d; };
  const F=Object.fromEntries(FOODS.map(f=>[f.n,f]));
  const H=175, W0=100, AGE0=30;

  // ---------- calendario: descansos ----------
  const inRange=(k,a,b)=>k>=a&&k<=b;
  const BREAKS=[['2023-12-23','2024-01-01','navidad'],['2024-07-15','2024-07-21','vacaciones'],['2024-12-23','2025-01-01','navidad'],
    ['2025-02-10','2025-02-16','enfermo'],['2025-04-13','2025-04-20','vacaciones'],['2025-12-23','2026-01-01','navidad'],['2026-07-13','2026-07-19','vacaciones']];
  const breakOf=k=>{ const b=BREAKS.find(([a,z])=>inRange(k,a,z)); return b?b[2]:null; };
  const FEAST={'12-24':1,'12-25':1,'12-31':1,'01-01':1,'09-15':1,'09-16':1,'02-14':0.5,'05-10':0.5};

  // ---------- comida: plantillas [nombre, gramos (si es por 100 g) o porciones] ----------
  const DES=[
    [['Huevo entero',3],['Clara de huevo',3],['Tortilla de maíz',2],['Aguacate',0.5],['Salsa roja o verde',1],['Plátano',1],['Café negro',1]],
    [['Avena cruda',2],['Proteína en polvo',1],['Leche descremada',1],['Plátano',1],['Café negro',1]],
    [['Yogur griego natural 0%',250],['Granola',0.5],['Fresas',1],['Huevo entero',2],['Pan integral',1]],
    [['Huevo entero',2],['Clara de huevo',4],['Pan integral',2],['Queso panela',1],['Papaya',1],['Café con leche',1]]];
  const COM=[
    [['Pechuga de pollo cruda (sin piel)',250],['Arroz blanco crudo',70],['Frijol negro crudo (seco)',35],['Aceite de oliva',1],['Brócoli',1]],
    [['Bistec de res magro (sirloin) crudo',220],['Papa cruda',250],['Lechuga',2],['Tomate',1],['Aceite de oliva',1],['Tortilla de maíz',2]],
    [['Salmón crudo',200],['Arroz integral crudo',70],['Espárragos',1],['Ensalada César',0]].filter(x=>x[1]),
    [['Carne molida de res 90/10 cruda',200],['Pasta seca cruda',80],['Salsa roja o verde',2],['Calabacín',1]],
    [['Tilapia cruda',250],['Arroz blanco crudo',80],['Aguacate',0.5],['Tortilla de maíz',2],['Lechuga',1],['Tomate',1]],
    [['Arrachera cruda',200],['Frijol negro crudo (seco)',40],['Tortilla de maíz',3],['Salsa roja o verde',2],['Cebolla',1]],
    [['Muslo de pollo crudo (sin piel)',250],['Arroz blanco crudo',70],['Ejotes',1],['Aceite de oliva',1]],
    [['Lomo de cerdo crudo',220],['Camote crudo',250],['Brócoli',1],['Aceite de oliva',0.5]]];
  const CEN=[
    [['Pechuga de pavo cruda',150],['Pan integral',2],['Queso panela',2],['Tomate',1],['Lechuga',1],['Aguacate',0.5]],
    [['Huevo entero',3],['Jamón de pavo',1],['Tortilla de harina',1],['Queso Oaxaca',1],['Salsa roja o verde',1]],
    [['Atún en agua (lata)',140],['Tostada horneada',4],['Aguacate',0.5],['Mayonesa',1],['Tomate',1]],
    [['Camarones crudos',200],['Arroz blanco crudo',60],['Aceite de oliva',1],['Pimiento',1]],
    [['Pechuga de pollo cruda (sin piel)',180],['Tortilla de maíz',3],['Queso panela',1],['Salsa roja o verde',2],['Lechuga',1],['Aguacate',0.5]]];
  const SNK=[
    [['Proteína en polvo',1],['Leche descremada',1],['Plátano',1],['Avena cruda',1]],
    [['Yogur griego',1],['Manzana',1],['Granola',0.5]],
    [['Barra de proteína',1],['Naranja',1],['Galleta de arroz',2]],
    [['Queso cottage',1],['Piña',1],['Galleta de arroz',3],['Almendras',0.5]]];
  const FREE=[  // comida libre de fin de semana (reemplaza la cena)
    [['Pizza',3],['Refresco de cola',1]],
    [['Taco al pastor',5],['Cerveza',2]],
    [['Hamburguesa con queso',1],['Papas a la francesa',1],['Refresco light',1]],
    [['Sushi roll',1],['Cerveza',2]],
    [['Enchiladas',1],['Chilaquiles',0.5],['Cerveza',1]]];
  const FIESTA=[[['Tamal',2],['Pozole',1],['Pan dulce',1],['Cerveza',3],['Pastel de chocolate',1],['Vino tinto',1],['Totopos',1]]];
  let uid=0;
  const entry=(name,amt,meal)=>{
    const f=F[name]; if(!f) throw new Error('No existe en el catálogo: '+name);
    const byGrams=f.portion==='100 g';
    const q=byGrams ? amt/f.g : amt;
    return {n:f.n,e:f.e,portion:f.portion,qty:Math.round(q*1000)/1000,meal,fid:f.id,
      kcal:Math.round(f.kcal*q),p:f.p*q,c:f.c*q,f:f.f*q,grams:byGrams?amt:null,unit:f.liquid?'ml':'g',_g:byGrams};
  };
  // arma el día y ajusta los gramos de carne/granos para llegar a la meta del día
  function buildDay(target, free){
    const meals=[['desayuno',pick(DES)],['comida',pick(COM)],['cena',free?pick(FREE):pick(CEN)],['snack',pick(SNK)]];
    let items=[]; meals.forEach(([m,t])=>t.forEach(([n,a])=>items.push([n,a,m])));
    const make=()=>items.map(([n,a,m])=>entry(n,a,m));
    let es=make(), tot=es.reduce((s,e)=>s+e.kcal,0);
    const gk=es.filter(e=>e._g).reduce((s,e)=>s+e.kcal,0);
    if(!free && gk>0){
      const k=Math.min(1.45,Math.max(0.65,(gk+target-tot)/gk));
      items=items.map(([n,a,m])=>[n, F[n].portion==='100 g' ? Math.max(30,Math.round(a*k/5)*5) : a, m]);
      es=make();
    }
    return es;
  }

  // ---------- pesas ----------
  // [nombre, 1RM estimado inicial, ganancia a 3 años, reps mín, reps máx, incremento kg]
  const EXD={
    'Sentadilla con barra':[70,80,5,8,2.5], 'Press de banca con barra':[60,45,5,8,2.5], 'Remo con barra':[55,40,6,10,2.5],
    'Face pull en polea':[25,20,12,15,2.5], 'Curl con barra':[30,18,8,12,2.5], 'Extensión de tríceps en polea':[30,25,10,12,2.5],
    'Peso muerto rumano':[70,70,6,10,2.5], 'Press militar con barra':[38,27,5,8,2.5], 'Jalón al pecho en polea':[55,35,8,12,2.5],
    'Prensa de pierna':[150,150,8,12,5], 'Elevaciones laterales':[8,6,12,15,1], 'Crunch en polea':[35,30,12,15,2.5],
    'Press de hombro con mancuernas':[18,14,8,12,2], 'Curl femoral acostado':[35,25,10,12,5], 'Elevación de talones (pantorrilla)':[80,60,12,15,5],
    'Press inclinado con mancuernas':[22,16,8,12,2], 'Remo sentado en polea':[55,35,8,12,2.5], 'Dominadas':[0,0,5,10,2.5],
    'Peso muerto con barra':[90,90,4,6,2.5], 'Sentadilla búlgara':[12,16,8,12,2], 'Extensión de cuádriceps':[40,40,10,12,5],
    'Hip thrust con barra':[70,90,8,12,5], 'Curl martillo':[14,8,10,12,2]};
  Object.keys(EXD).forEach(n=>{ if(!LIB_BY[n]) throw new Error('No está en la biblioteca: '+n); });
  const DAYS_A=[['Sentadilla con barra','Press de banca con barra','Remo con barra','Face pull en polea','Curl con barra','Extensión de tríceps en polea'],
    ['Peso muerto rumano','Press militar con barra','Jalón al pecho en polea','Prensa de pierna','Elevaciones laterales','Crunch en polea']];
  const DAYS_B={1:['Press de banca con barra','Remo con barra','Press de hombro con mancuernas','Jalón al pecho en polea','Curl con barra','Extensión de tríceps en polea','Face pull en polea'],
    2:['Sentadilla con barra','Peso muerto rumano','Prensa de pierna','Curl femoral acostado','Elevación de talones (pantorrilla)'],
    4:['Press inclinado con mancuernas','Remo sentado en polea','Press militar con barra','Dominadas','Elevaciones laterales','Curl martillo','Face pull en polea'],
    5:['Peso muerto con barra','Sentadilla búlgara','Extensión de cuádriceps','Hip thrust con barra','Crunch en polea']};
  const exState={};  // por ejercicio: peso de trabajo, extra (dominadas), día de inicio
  const roundTo=(v,inc)=>Math.max(inc,Math.round(v/inc)*inc);
  function liftSession(ex, tEff, BW, cap, deload){
    const [s0,g,rmin,rmax,inc]=EXD[ex];
    let st=exState[ex]; if(!st){ st=exState[ex]={t0:tEff}; }
    const tt=tEff-st.t0, tau=420;
    let C;
    if(ex==='Dominadas'){
      // capacidad relativa al peso corporal: empieza en 0.98×BW y llega a ~1.35×BW
      C=BW*(0.98+0.40*(1-Math.exp(-tt/300)))*cap;
      const extra=st.extra||0, load=BW+extra, reps=Math.floor(30*(C/load-1))-1;
      if(reps<1) return null;                      // aún no sale ni una: no se registra
      if(reps>=12) st.extra=extra+2.5;             // ya pasa de 12: la siguiente con peso extra
      const sets=[reps, Math.max(1,reps-2), Math.max(1,reps-3)].map(r=>({kg:extra,reps:r}));
      return sets;
    }
    C=(s0+g*(1-Math.exp(-tt/tau)))*cap;
    if(st.w==null) st.w=roundTo(C/(1+(rmin+1)/30),inc);
    const repsAt=w=>Math.floor(30*(C/w-1))-1;          // deja 1 rep en reserva
    if(deload){                                         // semana ligera: 85% del peso, sin tocar la progresión
      const w=roundTo(st.w*0.85,inc), r=Math.max(1,Math.min(rmin,repsAt(w)));
      return [r,r,r].map(x=>({kg:w,reps:x}));
    }
    let w=st.w, reps=repsAt(w);
    while(reps<rmin-2 && w>inc){ w=roundTo(w-inc,inc); reps=repsAt(w); }   // hoy no sale: baja el peso
    reps=Math.max(1,Math.min(reps,rmax));
    if(reps>=rmax) st.w=roundTo(w+inc,inc);             // doble progresión: llegó al tope → sube peso
    else if(w<st.w && cap>=0.97) st.w=w;                // estaba muy pesado (no fue un mal día): se queda abajo
    const sets=[reps, reps-(rnd()<0.6?1:0), reps-1-(rnd()<0.5?1:0)].map(r=>({kg:w,reps:Math.max(1,r)}));
    return sets;
  }

  // ---------- simulación día por día ----------
  const DB={onboarded:true, goals:{cal:2400,p:180,c:262,f:70,burn:400},
    profile:{weight:W0,target:80,age:AGE0+3,height:H,sex:'m',goalType:'bajar',steps:10000,sleepH:7.5,act:'ligero'},
    customFoods:[],customEx:[],logs:{},weights:[],favs:[],recents:[],celebratedDays:[],measures:[],lifts:[],liftEx:[],exAdd:false};
  let Fm=W0*0.35, Lm=W0-Fm, G=0;
  const F0=Fm, L0=Lm;
  let tEff=0, capMul=1, sessA=0, lastTrain=null, trained=0, missed=0;
  const daily=[];
  for(let i=0;i<NDAYS;i++){
    const d=dayDate(i), k=key(d), dow=d.getDay(), md=k.slice(5), brk=breakOf(k), age=AGE0+i/365;
    const W=Fm+Lm+G;
    // pesaje en la mañana (antes de comer)
    const wFreq = i<90 ? 0.75 : 0.45;
    if(!brk && (i===0 || rnd()<wFreq)) DB.weights.push({d:k,kg:r1(W+gauss()*0.35)});
    // medidas los domingos (y el día 0)
    if(i===0 || (dow===0 && !brk && rnd()<0.85)){
      const dF=F0-Fm, dL=Lm-L0, Wlb=W*2.2046, Flb=Fm*2.2046;
      const waist=(Flb+98.42+0.082*Wlb)/4.15*2.54 + 1.5;
      DB.measures.push({d:k, leg:r1(70-0.30*dF+0.5*dL+gauss()*0.3), bic:r1(50-0.25*dF+0.35*dL+gauss()*0.25),
        chest:r1(120-0.45*dF+0.6*dL+gauss()*0.5), waist:r1(waist+gauss()*0.6)});
    }
    // comida
    const feast=FEAST[md]||0, weekendFree = (dow===6 && rnd()<0.8) || (dow===0 && rnd()<0.2);
    let target=2400+gauss()*70, logged = rnd()>0.035;
    let foods;
    if(feast>=1){ foods=buildDay(2400,false).filter(e=>e.meal!=='cena'); FIESTA[0].forEach(([n,a])=>foods.push(entry(n,a,'cena'))); }
    else if(brk==='vacaciones'){ foods=buildDay(2600,true); foods.push(entry('Cerveza',2,'snack')); logged=rnd()<0.5; }
    else if(brk==='navidad'){ foods=buildDay(2600,rnd()<0.6); logged=rnd()<0.6; }
    else if(brk==='enfermo'){ foods=buildDay(1900,false); }
    else foods=buildDay(target, weekendFree);
    if(feast===0.5) foods.push(entry('Pastel de chocolate',1,'snack'));
    const intake=foods.reduce((s,e)=>s+e.kcal,0) + (logged?0:250);   // sin registrar se come un poco más
    // ejercicio
    const phaseB=i>=182, ex=[];
    const trainDay = phaseB ? [1,2,4,5].includes(dow) : [1,3,5].includes(dow);
    let lifted=false;
    if(trainDay && !brk && i>=2){
      if(rnd()<0.06) missed++;
      else{
        lifted=true;
        if(lastTrain!=null && i-lastTrain>9) capMul=0.95;           // volver de un descanso: un poco más débil
        const deload = Math.floor(trained/(phaseB?4:3))%9===8;       // cada 9 semanas, semana ligera
        const exs = phaseB ? DAYS_B[dow] : DAYS_A[sessA++%2];
        exs.forEach((n,j)=>{
          const cap=capMul*(1+gauss()*0.025)*(rnd()<0.05?0.93:1);
          const sets=liftSession(n,tEff,W,cap,deload); if(!sets) return;
          DB.lifts.push({id:'s'+i+'_'+j, ex:n, d:k, sets});
        });
        ex.push({n:'Pesas / fuerza',e:'🏋️',min:60,kcal:Math.round(5*(W/70)*60)});
        trained++; lastTrain=i;
      }
    }
    const cardioDay = phaseB ? [3,6].includes(dow) : [2,4,6].includes(dow);
    if(cardioDay && !brk && rnd()<0.85){
      const c = phaseB && dow===6 ? ['Bicicleta moderada',7,'🚴',45] : dow===6 ? ['Caminar',4,'🚶',60] : ['Caminar rápido',5,'🚶',40];
      ex.push({n:c[0],e:c[2],min:c[3],kcal:Math.round(c[1]*(W/70)*c[3])});
    }
    if(logged && (foods.length||ex.length)) DB.logs[k]={foods:foods.map(({_g,...e})=>e), ex};
    // ---- fisiología real (independiente de lo que la app estima) ----
    const steps = brk==='enfermo' ? 3000 : brk==='vacaciones' ? 12000 : Math.max(4000, 9500+gauss()*1500);
    const rmr=10*W+6.25*H-5*age+5;
    const exTrue=ex.reduce((s,e)=>s+e.kcal,0)*0.75;
    const adapt=-200*Math.min(1,Math.max(0,(W0-W)/20));   // adaptación metabólica (~7% al bajar 20 kg)
    const tdee=rmr + 0.5*W*steps*0.726/1000 + 0.12*rmr + 0.10*intake + exTrue + adapt;
    const training = !brk && i>=2;
    if(training) tEff++;
    if(capMul<1 && lifted) capMul=Math.min(1,capMul+0.01);
    const dL = training ? (6.5/400)*Math.exp(-tEff/400) : -0.01;
    Lm+=dL;
    Fm+=((intake-tdee)-1500*dL)/7700;
    const Gt = i<3 ? 0 : -0.8;
    G += (Gt-G)*0.3 + (intake>3000 ? 0.5 : 0);
    daily.push({k,W,Fm,Lm,intake,tdee});
  }
  // datos del perfil al final: peso = último pesaje
  DB.profile.weight=DB.weights[DB.weights.length-1].kg;
  // favoritos y recientes como los tendría alguien que usa la app a diario
  const fid=n=>F[n].id;
  DB.favs=['Pechuga de pollo cruda (sin piel)','Huevo entero','Arroz blanco crudo','Tortilla de maíz','Proteína en polvo'].map(fid);
  DB.recents=['Bistec de res magro (sirloin) crudo','Avena cruda','Plátano','Tilapia cruda','Aguacate','Clara de huevo'].map(fid);
  return {DB, daily, stats:{F0,L0,Fend:Fm,Lend:Lm,trained,missed}};
}
if(typeof module!=='undefined') module.exports=SIM3Y;
