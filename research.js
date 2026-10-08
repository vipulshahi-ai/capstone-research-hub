/* Shared research workflow. Drafts stay local; confirmed records come from Sheets. */
const API=(window.CAPSTONE_CONFIG||{}).apiUrl||'https://script.google.com/macros/s/AKfycbx0OZPzIwgfNCkqVyfSg9wJqBN_dM2AzS2CD8sea0ZwpkrMgA3OY0CJrF8flbCJG2WMHw/exec';
const teams=[{id:'SoAI-092',title:'Face Recognition Attendance',students:['Prakriti Kumari','Prakriti Singh']},{id:'LA7187',title:'Traffic Control with Agentic AI',students:['Manthan Mehra','Ayush Mehta']},{id:'SoAI-424',title:'Smart Video Learning Assistant',students:['Aman Kaushal','Vedant Kasaudhan']}];
const field=(key,label,column,type='textarea',required=true,options=[])=>({key,label,column,type,required,options});
const definitions={
 problem:{title:'1 · Identify the problem',action:'saveProblem',collection:'problems',idColumn:'Record ID',help:'Describe a specific, testable problem. Agree scope with your guide before building. Save the shared Drive folder here; share PDFs only when their licence permits.',fields:[field('statement','Problem statement','Problem Statement'),field('motivation','Who faces this problem, and why does it matter?','Motivation'),field('question','Research question','Research Question'),field('objectives','Measurable objectives','Objectives'),field('scope','Scope and exclusions','Scope'),field('driveFolder','Team Drive folder link','Drive Folder','url',false)]},
 search:{title:'2 · Search and record',action:'saveSearch',collection:'searches',idColumn:'Record ID',help:'Combine task, method and evaluation keywords. Open Google Scholar, inspect results, then record what you found. Check publisher pages to verify venue and publication type.',fields:[field('query','Search query / keywords','Query','text'),field('date','Search date','Search Date','date'),field('notes','Filters, useful results and next search','Notes','textarea',false)]},
 paper:{title:'3 · Screen and organise papers',action:'savePaper',collection:'papers',idColumn:'Paper ID',help:'Read the title and abstract before downloading. Record include/exclude and the reason. Included papers count towards 30 journals + 10 conferences; excluded papers remain in the screening record. Add a legally shared Drive PDF link when available.',fields:[field('title','Paper title','Title','text'),field('authors','Author names','Authors','text'),field('year','Publication year','Year','number'),field('type','Publication type','Type','select',true,['Journal','Conference']),field('venue','Journal or conference name','Venue','text'),field('sourceUrl','DOI / publisher / legal source URL','DOI or Legal Link','url'),field('relevance','Relevance to our research question','Relevance Rationale'),field('screeningNotes','Title and abstract screening / decision reason','Screening Notes'),field('status','Screening decision','Screening Status','select',true,[['Screened','Include'],['Rejected','Exclude']]),field('driveUrl','Shared Drive PDF link (optional)','Drive Link','url',false)]},
 review:{title:'4 · Read and build the literature review',action:'saveReview',collection:'reviews',idColumn:'Paper ID',help:'Use your own words. Include metric values and test conditions in Results. Use “Not reported” when a paper does not provide a detail. Reading saves an in-progress review; Complete means every field has been checked against the paper.',fields:[field('paperId','Included paper','Paper ID','paper'),field('task','Research task / objective','Research Task'),field('algorithm','Algorithm or method','Algorithm or Method'),field('dataset','Dataset, size and train/test split','Dataset'),field('metrics','Evaluation metrics','Metrics'),field('result','Results with values and experimental context','Result'),field('limitations','Limitations and threats to validity','Limitations'),field('gap','Relevance / unresolved gap for our project','Research Gap'),field('status','Reading status','Review Status','select',true,['Reading','Complete'])]},
 gap:{title:'5 · Synthesize related work and identify the gap',action:'saveGap',collection:'gaps',idColumn:'Record ID',help:'Group studies by approach, compare findings, and explain the gap supported by the evidence. Cite Paper IDs. This feeds the related-work section and methodology due 14 October.',fields:[field('synthesis','Related-work synthesis: agreements, differences, trends','Synthesis'),field('gap','Evidence-backed research gap','Research Gap'),field('contribution','Proposed contribution and how to evaluate it','Proposed Contribution'),field('paperIds','Supporting Paper IDs, separated by commas','Supporting Paper IDs','text')]},
 interaction:{title:'Record guide interaction',action:'addInteraction',collection:'interactions',idColumn:'Interaction ID',help:'Record online or offline discussion and concrete next actions. Guide approval is recorded by the guide in the tracker.',fields:[field('date','Meeting date','Date','date'),field('mode','Mode','Mode','select',true,['Online','Offline']),field('feedback','Discussion and feedback','Feedback'),field('actionItems','Next actions, owners and due dates','Action Items')]}
};
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function readJSON(key,fallback){try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}}
let team=teams.find(t=>t.id===readJSON('capstone-research-hub-v2',{}).activeProjectId)||teams[0];
const emptyData=()=>({papers:[],reviews:[],problems:[],searches:[],gaps:[],interactions:[]});
let shared=emptyData(),connected=false,busy=false,activeKind='problem';
let drafts=readJSON('capstone-research-drafts-v3',{});
const dateToday=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
const draftKey=kind=>team.id+':'+kind;
const safeURL=value=>{try{const u=new URL(value);return u.protocol==='https:'?u.href:'';}catch{return '';}};
const link=(url,label)=>safeURL(url)?`<a href="${esc(safeURL(url))}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`:esc(label);
function guideDecision(row){
 const approval=String(row?.['Guide Approval']||'Pending').trim();
 if(approval==='Approved')return {approval,tone:'approved',label:'Approved'};
 if(approval==='Revise')return {approval,tone:'revise',label:'Revision required'};
 if(approval==='Superseded')return {approval,tone:'superseded',label:'Superseded'};
 return {approval:'Pending',tone:'pending',label:'Awaiting guide review'};
}
function guideFlag(row){
 const decision=guideDecision(row),icon=decision.tone==='approved'||decision.tone==='revise'?'●':decision.tone==='superseded'?'—':'○';
 return `<span class="guide-flag guide-flag-${decision.tone}"><span aria-hidden="true">${icon}</span>${esc(decision.label)}</span>`;
}
function guideFeedback(row,recordLabel='review'){
 const decision=guideDecision(row);
 if(decision.tone==='superseded'){
  const note=String(row?.['Guide Feedback']||'This earlier record is retained for history only. Work from the latest submitted version.');
  return `<div class="guide-feedback guide-feedback-superseded"><strong>Guide note</strong><p>${esc(note)}</p><small>This historical draft cannot be resubmitted.</small></div>`;
 }
 if(decision.tone!=='revise')return '—';
 const feedback=String(row?.['Guide Feedback']||`Please open this ${recordLabel}, make the requested corrections, then save to resubmit it for guide review.`);
 return `<div class="guide-feedback"><strong>Guide feedback</strong><p>${esc(feedback)}</p><small>Update this ${recordLabel}, then save to resubmit.</small></div>`;
}
function showGuideNotice(row,recordLabel='review'){
 const notice=$('#guide-notice');if(!notice)return;
 if(!row){notice.hidden=true;notice.className='';notice.innerHTML='';return;}
 const decision=guideDecision(row);
 const feedback=String(row['Guide Feedback']||'');
 notice.hidden=false;notice.className=`guide-notice guide-notice-${decision.tone}`;
 if(decision.tone==='revise')notice.innerHTML=`<strong>🔴 Revision required</strong><p>${esc(feedback||`Please correct this ${recordLabel} before resubmitting it for guide approval.`)}</p><p class="helper">Make the corrections below and choose <strong>Save to Google Sheets</strong> to resubmit this ${recordLabel} for guide approval.</p>`;
 else if(decision.tone==='superseded')notice.innerHTML=`<strong>— Superseded</strong><p>${esc(feedback||'This earlier record is retained for history. Please work from the latest submitted version.')}</p>`;
 else if(decision.tone==='approved')notice.innerHTML=`<strong>🟢 Guide approved</strong><p>This ${recordLabel} has passed the current guide check.</p>`;
 else notice.innerHTML=`<strong>◌ Awaiting guide review</strong><p>Your latest saved ${recordLabel} is awaiting the guide’s decision.</p>`;
}
function saveDraft(kind,data){drafts[draftKey(kind)]=data;localStorage.setItem('capstone-research-drafts-v3',JSON.stringify(drafts));}
document.querySelector('main').innerHTML=`
 <section class="project-card"><div class="project-switch"><div><p class="eyebrow">THREE TEAMS · ONE GUIDED WORKFLOW</p><h2 id="team-title"></h2></div><label>Active project<select id="team-selector">${teams.map(t=>`<option value="${t.id}">${t.id} · ${esc(t.title)}</option>`).join('')}</select></label></div>
 <p>Deadline: 7 October 2026 · Problem statement, 40 reviews, organised sources and a research-gap summary.</p>
 <form id="connect-form" class="connect-row"><label>Team access code<input id="access-code" type="password" autocomplete="off" required placeholder="Ask your guide for your team code"></label><button>Load shared records</button><button id="lock-team" type="button" class="secondary">Lock session</button></form><p id="connection-message" role="status">Enter your team code to load and save shared records. Form drafts stay on this device.</p></section>
 <section class="metrics" id="metrics" aria-label="Confirmed shared progress"></section>
 <section class="panel" style="margin-bottom:18px"><h2>Your next steps</h2><p id="next-step"></p><div id="assignments"></div><p class="helper">Confirm the problem and screen sources → read and review → compare evidence and agree the gap. Each student targets 15 journals + 5 conferences. Quality and relevance matter; discuss any shortfall with your guide.</p></section>
 <nav id="steps" aria-label="Research steps">${Object.entries(definitions).map(([k,d])=>`<button type="button" data-step="${k}" class="secondary">${esc(d.title)}</button>`).join('')}</nav>
 <section class="panel" id="editor-panel"><h2 id="form-title"></h2><p id="form-help" class="helper"></p><div id="guide-notice" hidden></div><form id="research-form"></form><p id="save-message" role="status"></p></section>
 <section class="panel" style="margin-top:18px"><div class="section-heading"><h2>Team research records</h2><button id="export-review" type="button" class="secondary">Export literature review CSV</button></div><p class="helper">Only confirmed Google Sheets records appear below. Red entries need revision; green entries are approved; grey problem statements are retained historical drafts.</p><div id="records"></div></section>
 <section class="panel" style="margin-top:18px"><h2>University milestones</h2><p>7 Oct: problem and literature review · 14 Oct: methodology · 10 Nov: result analysis · 25 Nov: conclusion and first draft · 5 Dec: presentation, viva and TRL/submission status.</p><p class="helper">Use 15–31 October for implementation and experiments. Begin writing methods and related work while building.</p></section>`;
const legacy=readJSON('capstone-research-hub-v2',{});
function setMessage(id,text){$(id).textContent=text;}
function updateProgress(){
 $('#team-title').textContent=team.title;$('#team-selector').value=team.id;
 const papers=shared.papers.filter(p=>p['Screening Status']!=='Rejected'),completed=shared.reviews.filter(r=>r['Review Status']==='Complete'&&papers.some(p=>p['Paper ID']===r['Paper ID']));
 const metrics=[['Included journals',papers.filter(p=>p.Type==='Journal').length+' / 30'],['Included conferences',papers.filter(p=>p.Type==='Conference').length+' / 10'],['Completed reviews',completed.length+' / 40'],['Drive links',papers.filter(p=>safeURL(p['Drive Link'])).length+' / '+papers.length]];
 $('#metrics').innerHTML=metrics.map(([label,value])=>`<article><span>${label}</span><strong>${connected?value:'—'}</strong></article>`).join('');
 $('#next-step').textContent=!connected?'Load your team records to see current progress.':!shared.problems.length?'Start with a problem statement and agree it with your guide.':papers.length<40?'Screen relevant sources, then review included papers in small batches.':completed.length<40?'Complete the remaining reviews and compare results.':'Draft the research-gap synthesis and request guide review.';
 $('#assignments').innerHTML=team.students.map(owner=>`<p><strong>${esc(owner)}</strong> · ${connected?papers.filter(p=>p.Owner===owner).length:0}/20 included papers · 15 journals + 5 conferences target</p>`).join('');
}
function renderForm(kind,data){
 activeKind=kind;showGuideNotice(null);const d=definitions[kind];data=data||drafts[draftKey(kind)]||{id:crypto.randomUUID(),revision:0,owner:team.students[0],date:dateToday()};
 $('#form-title').textContent=d.title;$('#form-help').textContent=d.help;
 $('#research-form').innerHTML=`<input name="id" type="hidden" value="${esc(data.id||crypto.randomUUID())}"><input name="revision" type="hidden" value="${esc(data.revision||0)}"><div class="form-grid">${d.fields.map(f=>{
  const value=data[f.key]??'';let control;
  if(f.type==='select'||f.type==='paper'){
   const opts=f.type==='paper'?[['','Select an included paper'],...shared.papers.filter(p=>p['Screening Status']!=='Rejected').map(p=>[p['Paper ID'],p.Title])]:f.options.map(o=>Array.isArray(o)?o:[o,o]);
   control=`<select name="${f.key}" ${f.required?'required':''}>${opts.map(([v,l])=>`<option value="${esc(v)}" ${v===value?'selected':''}>${esc(l)}</option>`).join('')}</select>`;
  }else if(f.type==='textarea')control=`<textarea name="${f.key}" rows="3" maxlength="15000" ${f.required?'required':''}>${esc(value)}</textarea>`;
  else control=`<input name="${f.key}" type="${f.type}" value="${esc(value)}" ${f.type==='number'?'min="1900" max="'+(new Date().getFullYear()+1)+'"':''} ${f.type==='url'?'placeholder="https://..."':''} ${f.required?'required':''}>`;
  return `<label class="${f.type==='textarea'?'wide':''}">${esc(f.label)}${control}</label>`;
 }).join('')}<label>Recorded by<select name="owner">${team.students.map(s=>`<option ${s===data.owner?'selected':''}>${esc(s)}</option>`).join('')}</select></label></div>
 <div class="form-actions"><button type="submit" ${busy?'disabled':''}>Save to Google Sheets</button><button type="button" id="save-draft" class="secondary">Save draft on this device</button><button type="button" id="new-record" class="secondary">New record</button>${kind==='search'?'<a id="scholar-link" target="_blank" rel="noopener noreferrer">Open Google Scholar</a>':''}</div>`;
 $('#save-draft').onclick=()=>{saveDraft(kind,formData());setMessage('#save-message','Draft saved on this device; not submitted to Sheets.');};
 $('#new-record').onclick=()=>{renderForm(kind,{id:crypto.randomUUID(),revision:0,owner:team.students[0],date:dateToday()});setMessage('#save-message','New record. Previous saved draft is retained until you start typing.');};
 $('#research-form').oninput=()=>{saveDraft(kind,formData());if(kind==='search')updateScholar();};
 if(kind==='review')$('#research-form [name=paperId]').onchange=e=>{
  const existing=shared.reviews.find(r=>r['Paper ID']===e.target.value);
  if(existing)openRecord('review',existing);else{const p={id:e.target.value,paperId:e.target.value,revision:0,owner:team.students[0]};renderForm(kind,p);saveDraft(kind,p);}
 };
 if(kind==='search')updateScholar();document.querySelectorAll('[data-step]').forEach(b=>b.setAttribute('aria-current',b.dataset.step===kind?'step':'false'));
}
function updateScholar(){$('#scholar-link').href='https://scholar.google.com/scholar?q='+encodeURIComponent($('#research-form [name=query]').value);}
function formData(){const p=Object.fromEntries(new FormData($('#research-form')));if(activeKind==='review')p.id=p.paperId;return p;}
function openRecord(kind,row){
 const d=definitions[kind],data={id:row[d.idColumn],revision:row.Revision||0,owner:row.Owner||row.Reviewer||row['Submitted By']||team.students[0]};d.fields.forEach(f=>{data[f.key]=String(row[f.column]??'');if(f.type==='date')data[f.key]=data[f.key].slice(0,10);});
 if(kind==='paper'){data.authors=data.authors||row['Author and Year'];if(!['Screened','Rejected'].includes(data.status))data.status='Screened';}
 const isGuided=kind==='review'||kind==='problem',recordLabel=kind==='problem'?'problem statement':'review';
 renderForm(kind,data);if(isGuided)showGuideNotice(row,recordLabel);setMessage('#save-message',isGuided&&row['Guide Approval']==='Revise'?`Update the ${recordLabel} and save to resubmit it for guide review.`:'Editing a shared record. Guide approval: '+(row['Guide Approval']||'not applicable'));$('#editor-panel').scrollIntoView({behavior:'smooth'});
}
function previewText(value,limit=175){const text=String(value??'').replace(/\s+/g,' ').trim();return text.length>limit?text.slice(0,limit-1).trimEnd()+'…':text||'Problem statement not recorded';}
function displayDate(value){const date=new Date(value);return Number.isNaN(date.valueOf())?'':date.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});}
function problemCard(row,index){
 const decision=guideDecision(row),owner=row.Owner||'Team member',updated=displayDate(row['Updated At']);
 const fields=[
  ['Problem statement',row['Problem Statement']],['Who faces this problem, and why?',row.Motivation],['Research question',row['Research Question']],['Measurable objectives',row.Objectives],['Scope and exclusions',row.Scope]
 ];
 const drive=row['Drive Folder']?link(row['Drive Folder'],'Open team Drive folder'):'';
 const feedback=['revise','superseded'].includes(decision.tone)?guideFeedback(row,'problem statement'):'';
 const action=decision.tone==='superseded'?'':`<div class="review-card-actions"><button class="secondary" type="button" data-edit="problem" data-index="${index}">${decision.tone==='revise'?'Revise &amp; resubmit':'Open problem statement'}</button></div>`;
 return `<details class="review-card problem-card review-card-${decision.tone}"><summary><span class="review-title"><strong>${esc(previewText(row['Research Question']||row['Problem Statement']))}</strong><small>${esc(owner)} · Problem statement${updated?` · updated ${esc(updated)}`:''}</small></span><span class="review-summary-tags"><span class="review-chip review-chip-problem">Problem statement</span>${guideFlag(row)}</span></summary><div class="review-card-body"><div class="review-card-meta"><span>Submitted by: ${esc(owner)}</span>${updated?`<span>Last updated: ${esc(updated)}</span>`:''}${drive?`<span>${drive}</span>`:''}</div><div class="review-detail-grid">${fields.map(([label,value])=>`<section><h4>${esc(label)}</h4><p>${esc(value||'Not recorded yet.')}</p></section>`).join('')}</div>${feedback}${action}</div></details>`;
}
function reviewCard(row,index){
 const paper=shared.papers.find(item=>item['Paper ID']===row['Paper ID'])||{},decision=guideDecision(row);
 const title=paper.Title||`Paper ${row['Paper ID']||index+1}`;
 const author=row.Author||paper['Author and Year']||'Author not recorded';
 const reviewStatus=row['Review Status']||'Reading';
 const fields=[
  ['Research task',row['Research Task']],['Algorithm or method',row['Algorithm or Method']],['Dataset',row.Dataset],['Metrics',row.Metrics],['Results',row.Result],['Limitations',row.Limitations],['Relevance / research gap',row['Research Gap']]
 ];
 const sources=[paper['DOI or Legal Link']?link(paper['DOI or Legal Link'],'Open DOI / publisher source'):'' ,paper['Drive Link']?link(paper['Drive Link'],'Open Drive copy'):'' ].filter(Boolean).join(' · ');
 return `<details class="review-card review-card-${decision.tone}"><summary><span class="review-title"><strong>${esc(title)}</strong><small>${esc(author)}${row.Year?` · ${esc(row.Year)}`:''}</small></span><span class="review-summary-tags"><span class="review-chip review-chip-${reviewStatus==='Complete'?'complete':'reading'}">${esc(reviewStatus)}</span>${guideFlag(row)}</span></summary><div class="review-card-body"><div class="review-card-meta"><span>Paper ID: ${esc(row['Paper ID']||'—')}</span>${row.Reviewer?`<span>Reviewed by: ${esc(row.Reviewer)}</span>`:''}${sources?`<span>${sources}</span>`:''}</div><div class="review-detail-grid">${fields.map(([label,value])=>`<section><h4>${esc(label)}</h4><p>${esc(value||'Not recorded yet.')}</p></section>`).join('')}</div>${decision.tone==='revise'?guideFeedback(row):''}<div class="review-card-actions"><button class="secondary" type="button" data-edit="review" data-index="${index}">${decision.tone==='revise'?'Revise &amp; resubmit':'Open review'}</button></div></div></details>`;
}
function renderRecords(){
 const groups=[['problem',['Problem Statement','Research Question','Guide Approval']],['search',['Query','Search Date','Search URL']],['paper',['Paper ID','Title','Type','Owner','Screening Status','DOI or Legal Link','Drive Link']],['review',['Paper ID','Author','Year','Algorithm or Method','Dataset','Metrics','Result','Limitations','Review Status','Guide Approval','Guide Feedback']],['gap',['Synthesis','Research Gap','Proposed Contribution','Supporting Paper IDs','Guide Approval']],['interaction',['Date','Mode','Feedback','Action Items']]];
 const cell=(column,row)=>{if(column==='Guide Approval')return guideFlag(row);if(column==='Guide Feedback')return guideFeedback(row);return column.includes('Link')||column==='Search URL'?link(row[column],row[column]?'Open link':'—'):esc(row[column]||'—');};
 $('#records').innerHTML=groups.map(([kind,columns])=>{const rows=shared[definitions[kind].collection];if(kind==='problem')return `<details open><summary>${esc(definitions[kind].title)} (${rows.length})</summary><p class="helper review-list-help">Open each problem statement to read its full scope and guide decision. Green is approved, red needs revision, yellow is awaiting review, and grey is a retained historical draft.</p><div class="review-list">${rows.length?rows.map(problemCard).join(''):'<p>No shared records yet.</p>'}</div></details>`;if(kind==='review')return `<details open><summary>${esc(definitions[kind].title)} (${rows.length})</summary><p class="helper review-list-help">Select a paper to view its full evidence. Green is approved, red needs revision, and yellow is awaiting review or still being read.</p><div class="review-list">${rows.length?rows.map(reviewCard).join(''):'<p>No shared records yet.</p>'}</div></details>`;return `<details ${kind==='paper'?'open':''}><summary>${esc(definitions[kind].title)} (${rows.length})</summary><div class="table-wrap"><table><thead><tr>${columns.map(c=>`<th>${esc(c)}</th>`).join('')}<th>Action</th></tr></thead><tbody>${rows.length?rows.map((r,i)=>`<tr>${columns.map(c=>`<td>${cell(c,r)}</td>`).join('')}<td><button class="secondary" type="button" data-edit="${kind}" data-index="${i}">${kind==='review'&&r['Guide Approval']==='Revise'?'Revise &amp; resubmit':'Open'}</button></td></tr>`).join(''):`<tr><td colspan="${columns.length+1}">No shared records yet.</td></tr>`}</tbody></table></div></details>`;}).join('');
 const old=(legacy.papers||[]).filter(p=>p.projectId===team.id);
 if(old.length)$('#records').insertAdjacentHTML('beforeend',`<details><summary>Earlier browser drafts (${old.length})</summary><p>Check shared records for duplicates before submitting.</p>${old.map((p,i)=>`<p>${esc(p.title)} <button data-legacy="${i}" type="button">Review old draft</button></p>`).join('')}</details>`);
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openRecord(b.dataset.edit,shared[definitions[b.dataset.edit].collection][Number(b.dataset.index)]));
 document.querySelectorAll('[data-legacy]').forEach(b=>b.onclick=()=>{const p=old[Number(b.dataset.legacy)];renderForm('paper',{...p,id:crypto.randomUUID(),authors:p.authorYear,status:'Screened',revision:0});});
}
async function request(action,payload,projectId=team.id){
 const accessCode=sessionStorage.getItem('capstone-code:'+projectId)||'';if(!accessCode)throw new Error('Enter your team access code and load shared records first.');
 const response=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,projectId,accessCode,payload}),signal:AbortSignal.timeout(60000)});
 const result=await response.json();if(!result.ok)throw new Error(result.error||'Could not save.');if(result.version!==3)throw new Error('Backend needs the research-workflow update.');return result;
}
function setBusy(value){busy=value;document.querySelectorAll('button,input,select,textarea').forEach(b=>b.disabled=value);}
$('#connect-form').onsubmit=async e=>{
 e.preventDefault();sessionStorage.setItem('capstone-code:'+team.id,$('#access-code').value.trim());setBusy(true);setMessage('#connection-message','Loading shared team records…');
 try{const r=await request('loadProject');shared=r.data;connected=true;updateProgress();renderRecords();renderForm(activeKind);setMessage('#connection-message','Connected. Displaying confirmed records from Google Sheets.');}
 catch(error){connected=false;updateProgress();setMessage('#connection-message',error.message);}finally{setBusy(false);}
};
$('#research-form').onsubmit=async e=>{
 e.preventDefault();const kind=activeKind,p=formData(),projectId=team.id;saveDraft(kind,p);setBusy(true);setMessage('#save-message','Saving and waiting for confirmation…');
 try{const r=await request(definitions[kind].action,p,projectId);shared=r.data;connected=true;p.revision=r.record.Revision;saveDraft(kind,p);updateProgress();renderRecords();renderForm(kind,p);if(kind==='review'||kind==='problem'){const collection=shared[definitions[kind].collection],idColumn=definitions[kind].idColumn,record=collection.find(row=>row[idColumn]===p.id);showGuideNotice(record,kind==='problem'?'problem statement':'review');}setMessage('#save-message','Saved and confirmed in Google Sheets.');setMessage('#connection-message','Connected. Shared records are up to date.');}
 catch(error){setMessage('#save-message','Draft retained on this device. Save not confirmed: '+error.message);}finally{setBusy(false);}
};
$('#team-selector').onchange=e=>{team=teams.find(t=>t.id===e.target.value);shared=emptyData();connected=false;$('#access-code').value=sessionStorage.getItem('capstone-code:'+team.id)||'';setMessage('#connection-message','Load this team’s shared records.');setMessage('#save-message','');updateProgress();renderRecords();renderForm('problem');};
$('#lock-team').onclick=()=>{sessionStorage.removeItem('capstone-code:'+team.id);$('#access-code').value='';shared=emptyData();connected=false;updateProgress();renderRecords();setMessage('#connection-message','Session locked. Local form drafts remain on this device.');};
document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{renderForm(b.dataset.step);setMessage('#save-message','');});
$('#export-review').onclick=()=>{
 const columns=['Paper ID','Project ID','Author','Year','Research Task','Algorithm or Method','Dataset','Metrics','Result','Limitations','Research Gap','Reviewer','Review Status','Guide Approval','Guide Feedback'];
 const cell=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';
 const csv=[columns,...shared.reviews.map(r=>columns.map(c=>r[c]))].map(r=>r.map(cell).join(',')).join('\r\n'),url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=team.id+'-literature-review.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('#access-code').value=sessionStorage.getItem('capstone-code:'+team.id)||'';updateProgress();renderRecords();renderForm('problem');
