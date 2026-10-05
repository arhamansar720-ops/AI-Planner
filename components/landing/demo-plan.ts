/**
 * A plan in the exact NDJSON shape the model streams. The landing page's
 * live demo feeds it line by line through the real PlanAssembler, so what
 * visitors see is the product's own canvas, not a mock-up.
 */
export const DEMO_PROMPT = "Train me for my first half marathon in 16 weeks. I can run four days a week.";

export const DEMO_LINES = [
  {"type":"meta","title":"First Half Marathon","description":"A 16-week build from easy miles to race day, with one long run a week and a taper before the start line.","objective":"Finish a half marathon comfortably in 16 weeks.","priority":"high","durationDays":112,"assumptions":["You can run 20 minutes without stopping today","Four running days a week, two rest days"],"priorities":["Consistency over speed","Grow the long run gradually"],"constraints":{"dailyMinutes":45,"blockedWeekdays":[]}},
  {"type":"phase","key":"p1","title":"Base","summary":"Build an easy aerobic habit.","startDay":0,"endDay":27},
  {"type":"task","key":"t1","phase":"p1","title":"Pick a race and register","description":"Choose a half marathon about 16 weeks out and sign up.","priority":"high","startDay":0,"durationDays":3,"estimatedMinutes":30,"dependsOn":[],"subtasks":[]},
  {"type":"task","key":"t2","phase":"p1","title":"Get fitted for running shoes","description":"Visit a running store for a gait check.","priority":"medium","startDay":2,"durationDays":5,"estimatedMinutes":60,"dependsOn":[],"subtasks":[]},
  {"type":"task","key":"t3","phase":"p1","title":"Run four easy 25-minute sessions a week","description":"Conversational pace, every week of the phase.","priority":"high","startDay":3,"durationDays":24,"estimatedMinutes":400,"dependsOn":["t2"],"subtasks":[]},
  {"type":"task","key":"t4","phase":"p1","title":"Set a long-run day","description":"Block Saturday mornings for the long run.","priority":"medium","startDay":5,"durationDays":2,"estimatedMinutes":15,"dependsOn":[],"subtasks":[]},
  {"type":"phase","key":"p2","title":"Build","summary":"Add distance and one quality session.","startDay":28,"endDay":69},
  {"type":"task","key":"t5","phase":"p2","title":"Grow the long run to 8 miles","description":"Add one mile every other week.","priority":"high","startDay":28,"durationDays":42,"estimatedMinutes":600,"dependsOn":["t3"],"subtasks":[]},
  {"type":"task","key":"t6","phase":"p2","title":"Add a weekly tempo run","description":"20 minutes at comfortably hard pace.","priority":"medium","startDay":35,"durationDays":35,"estimatedMinutes":300,"dependsOn":["t3"],"subtasks":[]},
  {"type":"task","key":"t7","phase":"p2","title":"Practice race-day fueling","description":"Try gels on long runs over 75 minutes.","priority":"low","startDay":49,"durationDays":21,"estimatedMinutes":60,"dependsOn":["t5"],"subtasks":[]},
  {"type":"phase","key":"p3","title":"Peak","summary":"Reach race distance with confidence.","startDay":70,"endDay":97},
  {"type":"task","key":"t8","phase":"p3","title":"Run a 10-mile long run","description":"Your longest run before the race.","priority":"high","startDay":84,"durationDays":7,"estimatedMinutes":120,"dependsOn":["t5"],"subtasks":[]},
  {"type":"task","key":"t9","phase":"p3","title":"Do a 5K time trial","description":"Calibrates your race pace.","priority":"medium","startDay":75,"durationDays":5,"estimatedMinutes":45,"dependsOn":["t6"],"subtasks":[]},
  {"type":"task","key":"t10","phase":"p3","title":"Plan race-day logistics","description":"Travel, bib pickup, kit and breakfast.","priority":"medium","startDay":90,"durationDays":7,"estimatedMinutes":45,"dependsOn":["t1"],"subtasks":[]},
  {"type":"phase","key":"p4","title":"Taper & race","summary":"Arrive fresh and run your race.","startDay":98,"endDay":111},
  {"type":"task","key":"t11","phase":"p4","title":"Cut weekly mileage by 40%","description":"Keep two short runs at race pace.","priority":"high","startDay":98,"durationDays":10,"estimatedMinutes":180,"dependsOn":["t8"],"subtasks":[]},
  {"type":"task","key":"t12","phase":"p4","title":"Run the half marathon","description":"Start slower than you think.","priority":"high","startDay":110,"durationDays":1,"estimatedMinutes":150,"dependsOn":["t11","t10"],"subtasks":[]},
  {"type":"milestone","key":"m1","phase":"p1","title":"Running 4× a week","description":"","day":27},
  {"type":"milestone","key":"m2","phase":"p2","title":"8-mile long run","description":"","day":69},
  {"type":"milestone","key":"m3","phase":"p3","title":"10 miles done","description":"","day":90},
  {"type":"milestone","key":"m4","phase":"p4","title":"Race day","description":"","day":110},
  {"type":"next","actions":["Pick your race today.","Book a shoe fitting this week.","Run 25 easy minutes on Monday."]},
].map((line) => JSON.stringify(line));
