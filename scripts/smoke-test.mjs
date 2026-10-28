import assert from 'node:assert/strict';
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
async function post(path, body) {
  const response = await fetch(base + path, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  return {status: response.status, body: await response.json()};
}
const forecast = Array.from({length:7}, (_,i) => ({date:`2026-10-${String(20+i).padStart(2,'0')}`,temperatureMinC:20,temperatureMaxC:34,rainfallMm:0,humidityMeanPercent:45,windMaxKmh:15,et0Mm:4}));
const input = {crop:'wheat',growthStage:'mid',waterAvailability:'limited',forecast};
let result = await post('/api/assess',input);
assert.equal(result.status,200); assert.equal(result.body.data.heat.level,'high'); assert.equal(result.body.data.heat.hotDays.length,7); assert.equal(result.body.data.water.level,'high'); assert.equal(result.body.data.water.et0Mm,28); assert.ok(result.body.data.sources.length);
result = await post('/api/assess',{...input,crop:'tomato',waterAvailability:'unknown'});
assert.equal(result.body.data.heat.level,'low'); assert.equal(result.body.data.water.level,'unknown');
result = await post('/api/assess',{...input,forecast:forecast.slice(1)}); assert.equal(result.status,400);
result = await post('/api/assess',{...input,forecast:[forecast[0],...forecast.slice(0,6)]}); assert.equal(result.status,400);
result = await post('/api/assess',{...input,crop:'olive'}); assert.equal(result.status,400);
result = await post('/api/advice',{assessmentInput:input,language:'xx'}); assert.equal(result.status,400);
result = await post('/api/advice',{assessmentInput:input,language:'fr'});
assert.ok([200,503,502].includes(result.status));
if(result.status === 503) assert.equal(result.body.error.code,'AI_NOT_CONFIGURED');
assert.equal((await fetch(base+'/api/weather?latitude=999&longitude=0')).status,400);
assert.equal((await fetch(base+'/api/weather?latitude=33&latitude=34&longitude=0')).status,400);
const weather = await fetch(base+'/api/weather?latitude=33.8935&longitude=-5.5473');
assert.equal(weather.status,200); const days=(await weather.json()).data.days; assert.equal(days.length,7); assert.ok(days.every(d=>Number.isFinite(d.et0Mm)));
console.log('Passed: live weather, crop-specific screening, unknown water, malformed inputs, dates, advice configuration, coordinate validation.');
