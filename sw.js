// KalTrack service worker — red primero con respaldo en caché (offline total tras la primera visita)
const CACHE = 'kaltrack-v2';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
// fotos de la biblioteca de ejercicios: se guardan para verlas sin señal en el gym (si alguna falla, no bloquea la instalación)
const EX_IMGS = ['./ex/Ab_Crunch_Machine-0.jpg','./ex/Ab_Crunch_Machine-1.jpg','./ex/Barbell_Bench_Press_-_Medium_Grip-0.jpg','./ex/Barbell_Bench_Press_-_Medium_Grip-1.jpg','./ex/Barbell_Curl-0.jpg','./ex/Barbell_Curl-1.jpg','./ex/Barbell_Deadlift-0.jpg','./ex/Barbell_Deadlift-1.jpg','./ex/Barbell_Full_Squat-0.jpg','./ex/Barbell_Full_Squat-1.jpg','./ex/Barbell_Hip_Thrust-0.jpg','./ex/Barbell_Hip_Thrust-1.jpg','./ex/Barbell_Incline_Bench_Press_-_Medium_Grip-0.jpg','./ex/Barbell_Incline_Bench_Press_-_Medium_Grip-1.jpg','./ex/Bench_Dips-0.jpg','./ex/Bench_Dips-1.jpg','./ex/Bent-Arm_Dumbbell_Pullover-0.jpg','./ex/Bent-Arm_Dumbbell_Pullover-1.jpg','./ex/Bent_Over_Barbell_Row-0.jpg','./ex/Bent_Over_Barbell_Row-1.jpg','./ex/Butterfly-0.jpg','./ex/Butterfly-1.jpg','./ex/Cable_Crossover-0.jpg','./ex/Cable_Crossover-1.jpg','./ex/Cable_Crunch-0.jpg','./ex/Cable_Crunch-1.jpg','./ex/Dips_-_Chest_Version-0.jpg','./ex/Dips_-_Chest_Version-1.jpg','./ex/Dumbbell_Bench_Press-0.jpg','./ex/Dumbbell_Bench_Press-1.jpg','./ex/Dumbbell_Bicep_Curl-0.jpg','./ex/Dumbbell_Bicep_Curl-1.jpg','./ex/Dumbbell_Flyes-0.jpg','./ex/Dumbbell_Flyes-1.jpg','./ex/Dumbbell_Lunges-0.jpg','./ex/Dumbbell_Lunges-1.jpg','./ex/Dumbbell_Shoulder_Press-0.jpg','./ex/Dumbbell_Shoulder_Press-1.jpg','./ex/Dumbbell_Shrug-0.jpg','./ex/Dumbbell_Shrug-1.jpg','./ex/EZ-Bar_Skullcrusher-0.jpg','./ex/EZ-Bar_Skullcrusher-1.jpg','./ex/Face_Pull-0.jpg','./ex/Face_Pull-1.jpg','./ex/Front_Dumbbell_Raise-0.jpg','./ex/Front_Dumbbell_Raise-1.jpg','./ex/Goblet_Squat-0.jpg','./ex/Goblet_Squat-1.jpg','./ex/Hack_Squat-0.jpg','./ex/Hack_Squat-1.jpg','./ex/Hammer_Curls-0.jpg','./ex/Hammer_Curls-1.jpg','./ex/Hanging_Leg_Raise-0.jpg','./ex/Hanging_Leg_Raise-1.jpg','./ex/Incline_Dumbbell_Press-0.jpg','./ex/Incline_Dumbbell_Press-1.jpg','./ex/Leg_Extensions-0.jpg','./ex/Leg_Extensions-1.jpg','./ex/Leg_Press-0.jpg','./ex/Leg_Press-1.jpg','./ex/Leverage_Chest_Press-0.jpg','./ex/Leverage_Chest_Press-1.jpg','./ex/Leverage_High_Row-0.jpg','./ex/Leverage_High_Row-1.jpg','./ex/Lying_Leg_Curls-0.jpg','./ex/Lying_Leg_Curls-1.jpg','./ex/Machine_Shoulder_Military_Press-0.jpg','./ex/Machine_Shoulder_Military_Press-1.jpg','./ex/One-Arm_Dumbbell_Row-0.jpg','./ex/One-Arm_Dumbbell_Row-1.jpg','./ex/One-Legged_Cable_Kickback-0.jpg','./ex/One-Legged_Cable_Kickback-1.jpg','./ex/Preacher_Curl-0.jpg','./ex/Preacher_Curl-1.jpg','./ex/Pullups-0.jpg','./ex/Pullups-1.jpg','./ex/Pushups-0.jpg','./ex/Pushups-1.jpg','./ex/Romanian_Deadlift-0.jpg','./ex/Romanian_Deadlift-1.jpg','./ex/Seated_Bent-Over_Rear_Delt_Raise-0.jpg','./ex/Seated_Bent-Over_Rear_Delt_Raise-1.jpg','./ex/Seated_Cable_Rows-0.jpg','./ex/Seated_Cable_Rows-1.jpg','./ex/Seated_Leg_Curl-0.jpg','./ex/Seated_Leg_Curl-1.jpg','./ex/Side_Lateral_Raise-0.jpg','./ex/Side_Lateral_Raise-1.jpg','./ex/Split_Squat_with_Dumbbells-0.jpg','./ex/Split_Squat_with_Dumbbells-1.jpg','./ex/Standing_Biceps_Cable_Curl-0.jpg','./ex/Standing_Biceps_Cable_Curl-1.jpg','./ex/Standing_Calf_Raises-0.jpg','./ex/Standing_Calf_Raises-1.jpg','./ex/Standing_Dumbbell_Triceps_Extension-0.jpg','./ex/Standing_Dumbbell_Triceps_Extension-1.jpg','./ex/Standing_Military_Press-0.jpg','./ex/Standing_Military_Press-1.jpg','./ex/Thigh_Abductor-0.jpg','./ex/Thigh_Abductor-1.jpg','./ex/Thigh_Adductor-0.jpg','./ex/Thigh_Adductor-1.jpg','./ex/Tricep_Dumbbell_Kickback-0.jpg','./ex/Tricep_Dumbbell_Kickback-1.jpg','./ex/Triceps_Pushdown-0.jpg','./ex/Triceps_Pushdown-1.jpg','./ex/Wide-Grip_Lat_Pulldown-0.jpg','./ex/Wide-Grip_Lat_Pulldown-1.jpg'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS).then(() => Promise.allSettled(EX_IMGS.map(u => c.add(u)))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return r;
      })
      .catch(() =>
        caches.match(e.request, { ignoreSearch: true })
          .then(m => m || caches.match('./index.html'))
      )
  );
});
