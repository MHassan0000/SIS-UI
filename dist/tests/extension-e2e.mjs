// Actual unpacked MV3 extension test. SIS responses are synthetic, never a real account.
// Only explicitly requested public timetable URLs may reach the network in --live-public mode.
import { readFile, mkdtemp, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {chromium}=await import(pathToFileURL(process.env.STUDIO_PLAYWRIGHT || 'C:/Windows/System32/node_modules/playwright-core/index.mjs').href);
const executablePath=process.env.STUDIO_CHROMIUM || 'C:/Users/ALPHA TECH/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const profile=await mkdtemp(path.join(tmpdir(),'sis-studio-e2e-'));
const output=path.join(root,'tests','output');await mkdir(output,{recursive:true});
const extension=path.join(root,'cui-interface'),live=process.argv.includes('--live-public');
const fixture=(await readFile(path.join(root,'tests/browser.html'),'utf8')).replace(/<script[\s\S]*?<\/script>/g,'').replace(/<link[^>]*>/g,'').replace('</head>','<meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:20px;font:14px system-ui}.content_area{max-width:1240px;margin:auto}</style></head>');
const times=['08:30','09:00','09:30','10:00','10:30'];
const timetable=(kind,who)=>`<p>Fall 2026 Timetable v. 2026-09-27</p><input id="whoInput" value="${who}"><table class="grid"><thead><tr>${times.slice(0,-1).map((t,i)=>`<th class="ptime"><div>${t}</div><div>${times[i+1]}</div></th>`).join('')}</tr></thead><tbody>${['Mo','Tu','We','Th','Fr','Sa','Su'].map(d=>`<tr><td class="daycol">${d}</td><td class="slot"><div class="blk"><span class="code">TST101</span><span class="room">A-2</span></div></td><td class="slot" colspan="2"></td><td class="slot">${kind==='class'?'<div class="blk"><span class="code">TST102</span><span class="room">A-3</span></div>':''}</td></tr>`).join('')}</tbody></table>`;
let context;const passed=[],requests=[],errors=[];let offline=false;
const check=(value,name)=>{assert.ok(value,name);passed.push(name);console.log('PASS '+name);};
try{
  context=await chromium.launchPersistentContext(profile,{executablePath,headless:true,ignoreDefaultArgs:['--disable-extensions'],args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`],viewport:{width:1440,height:1000}});
  context.on('serviceworker',worker=>worker.on('console',m=>{if(m.type()==='error')errors.push(m.text());}));
  context.on('requestfailed',request=>{if(request.url().startsWith('https://sfs.cuilahore.edu.pk/') && !offline)console.log('PUBLIC FETCH FAILED '+request.failure()?.errorText);});
  await context.route('**/*',async route=>{
    const url=new URL(route.request().url());requests.push({host:url.host,path:url.pathname});
    if(url.host==='lhr-sis.comsats.edu.pk')return route.fulfill({status:200,contentType:'text/html',body:/Login/.test(url.pathname)?'<html><body><button id="LoginSubmit">Sign in</button></body></html>':fixture});
    if(url.host==='sfs.cuilahore.edu.pk'){
      if(offline)return route.abort();if(live)return route.continue();
      const who=url.searchParams.get('Who');return route.fulfill({status:200,contentType:'text/html',body:who?timetable(url.searchParams.get('Kind'),who):'<script>const all = ["A-2","A-3","C-5","FA24-BSE-A"];<\/script>'});
    }
    return route.abort();
  });
  const worker=context.serviceWorkers()[0] || await context.waitForEvent('serviceworker',{timeout:20000});
  check(worker.url().endsWith('/companion-worker.js'),'Packaged MV3 worker actually loads');
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('https://lhr-sis.comsats.edu.pk/Courses/Index');
  const host=page.locator('#sis-studio-companion');await host.waitFor();
  check(await host.count()===1,'Manifest injects content scripts into the supported origin');
  await host.getByRole('button',{name:'GPA & CGPA',exact:true}).click();
  check(await host.locator('.row').count()===2,'Real isolated content script prefills synthetic course credits');
  await host.getByLabel('Applicable grading policy',{exact:true}).selectOption('current');
  await host.getByLabel('Expected grade',{exact:true}).nth(0).selectOption('A');
  await host.getByLabel('Expected grade',{exact:true}).nth(1).selectOption('B');
  check(await host.locator('.metric strong').first().innerText()==='3.43','Installed GPA UI calculates weighted 24/7');
  await host.getByRole('tab',{name:'Attendance',exact:true}).click();
  await host.getByLabel('Present so far',{exact:true}).fill('18');await host.getByLabel('Classes recorded',{exact:true}).fill('24');
  check((await host.locator('.panel').innerText()).includes('next 6 consecutive'),'Installed attendance recovery calculation works');
  await host.getByRole('tab',{name:'GPA & CGPA',exact:true}).click();
  check(await host.locator('.metric strong').first().innerText()==='3.43','Scenario survives tool navigation');
  await host.getByLabel('Current CGPA',{exact:true}).fill('3.24');await host.getByLabel('Previous GPA credits',{exact:true}).fill('74');await host.getByLabel('Upcoming credits',{exact:true}).fill('18');await host.getByLabel('Target CGPA',{exact:true}).fill('3.4');
  check((await host.locator('.panel').innerText()).includes('not achievable'),'Installed target planner rejects impossible 4.0578 requirement');
  await host.getByRole('tab',{name:'Marks planner',exact:true}).click();
  for(const [label,value] of [['Obtained marks','42'],['Maximum marks','50'],['Overall course weight (%)','50'],['Target aggregate (%)','79.5']])await host.getByLabel(label,{exact:true}).fill(value);
  check((await host.locator('.panel output').innerText()).includes('75.00%'),'Installed remaining-assessment tool calculates correct minimum');
  await host.getByRole('tab',{name:'Room finder',exact:true}).click();
  await host.getByLabel('Day (Pakistan time)',{exact:true}).selectOption('Mo');await host.getByLabel('Start time',{exact:true}).fill(live?'13:00':'09:00');await host.getByLabel('Available for at least',{exact:true}).selectOption('30');
  if(live)await host.getByLabel('Building / room group',{exact:true}).selectOption('C');
  await host.getByRole('button',{name:'Search official timetable',exact:true}).click();
  try { await host.locator('.room-grid .card').first().waitFor({timeout:45000}); }
  catch(error){console.log('ROOM STATUS '+await host.locator('[role=status]').innerText());console.log('PUBLIC REQUESTS '+JSON.stringify(requests.filter(r=>r.host==='sfs.cuilahore.edu.pk')));throw error;}
  await host.getByRole('button',{name:'Search official timetable',exact:true}).waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.querySelector('#sis-studio-companion').shadowRoot.querySelector('.panel .primary').disabled,{},{timeout:90000});
  const roomText=await host.locator('.room-grid').innerText();
  check(roomText.includes('No scheduled class') && !roomText.includes('Availability unknown'),'Extension-to-worker-to-timetable requests succeed');
  if(live){const c5=host.locator('.room-grid .card').filter({has:page.getByRole('heading',{name:'C-5',exact:true})});check((await c5.innerText()).includes('13:30'),'Live official C-5 schedule agrees with Monday 13:00 gap');}
  await host.getByLabel('Day (Pakistan time)',{exact:true}).selectOption('Tu');check(await host.locator('.room-grid .card').count()===0,'Changing room filters clears stale availability');
  await host.getByRole('tab',{name:'My timetable',exact:true}).click();await host.getByLabel('Class section',{exact:true}).fill('FA24-BSE-A');await host.getByLabel('Day (Pakistan time)',{exact:true}).selectOption('Mo');await host.getByRole('button',{name:'Load class timetable',exact:true}).click();
  await host.locator('.timeline').waitFor({timeout:45000});check((await host.locator('.timeline').innerText()).includes('Study break'),'Installed class timetable produces a study gap');
  await host.locator('.timeline').getByRole('button',{name:'Find a room',exact:true}).first().click();
  check(await host.getByLabel('Start time',{exact:true}).inputValue()===(live?'13:00':'09:00'),'Study-gap action transfers exact start to room finder');
  // Actual preference storage, worker lifetime and main-script subscription.
  const prefs=async value=>worker.evaluate(async value=>{const key='sisStudio.ui.v1';const old=(await chrome.storage.local.get(key))[key]||{};await chrome.storage.local.set({[key]:{...old,...value}});},value);
  await prefs({enabled:true,companion:true,theme:'dark'});await page.waitForFunction(()=>document.body.dataset.sisStudioTheme==='dark');
  await host.screenshot({path:path.join(output,`companion-dark-${live?'live':'fixture'}.png`)});
  check(await host.locator('.bar').evaluate(e=>getComputedStyle(e).backgroundImage)!=='none','Companion has a distinct banner in dark mode');
  await prefs({theme:'light'});await page.waitForFunction(()=>document.body.dataset.sisStudioTheme==='light');await page.setViewportSize({width:390,height:844});
  await host.screenshot({path:path.join(output,'companion-light-mobile.png')});
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Installed companion fits 390px mobile width');
  await prefs({companion:false});await host.waitFor({state:'detached'});check(await page.locator('.studio-overview').count()===1,'Companion can turn off while Level 2 stays enabled');
  await prefs({companion:true});await host.waitFor();await page.reload();await host.waitFor();check(await page.locator('#sis-studio-companion').count()===1,'Preference persistence and page reload do not duplicate tools');
  await prefs({enabled:false});await host.waitFor({state:'detached'});check(await page.locator('[data-sis-studio-owned=feature]').count()===0,'Interface OFF restores original page');
  await prefs({enabled:true});await host.waitFor();await page.keyboard.press('Control+k');await host.getByRole('dialog').waitFor();await page.keyboard.press('Escape');check(await host.locator('dialog').evaluate(e=>!e.open),'Command palette opens and Escape dismisses it');
  // Fresh uncached public name during an outage must not yield a free room.
  offline=true;await host.getByRole('button',{name:'Find a room',exact:true}).click();
  await host.getByLabel('Start time',{exact:true}).fill('08:30');await host.getByLabel('Available for at least',{exact:true}).selectOption('30');await host.getByLabel('Building / room group',{exact:true}).selectOption(live?'A':'C');
  await host.getByRole('button',{name:'Search official timetable',exact:true}).click();await host.locator('.room-grid .card').first().waitFor({timeout:20000});
  check((await host.locator('.room-grid').innerText()).includes('Availability unknown'),'Actual worker outage is presented as unknown availability');
  await page.goto('https://lhr-sis.comsats.edu.pk/Login/Index');check(await host.count()===0,'Companion is absent after logout/login-page navigation');
  check(!requests.some(r=>r.host.includes('supabase.co')),'Companion test sends no academic data to Supabase');check(errors.length===0,`No browser runtime errors (${errors.join('; ')})`);
  console.log(JSON.stringify({passed:passed.length,mode:live?'live public timetable':'synthetic public timetable',publicRequests:requests.filter(r=>r.host==='sfs.cuilahore.edu.pk').length}));
}finally{
  await context?.close();
  const resolved=path.resolve(profile);if(!resolved.startsWith(path.resolve(tmpdir())+path.sep) || !path.basename(resolved).startsWith('sis-studio-e2e-'))throw Error('Unexpected temporary profile path');
  await rm(resolved,{recursive:true,force:true,maxRetries:3});
}
