/* Result-analysis workflow: evidence per student, one shared conclusion. */
const RESULT_TYPES=['Experiment Evidence','Individual Analysis','Final Team Synthesis'];
const resultField=(key,label,column,type='textarea',required=true,options=[])=>({key,label,column,type,required,options});
const RESULT_DEFINITION={title:'7 · Analyse results · due 10 Nov',action:'saveResult',collection:'results',idColumn:'Record ID',help:'Start with pilot evidence. Each student records their own work and analysis; the team submits one combined conclusion. Save In progress while working, then choose Submit for guide review. A valid experiment can show no improvement.',fields:[
 resultField('recordType','What are you recording?','Record Type','select',true,RESULT_TYPES),
 resultField('title','Short title: test or finding','Title','text'),
 resultField('workStatus','Submission status','Work Status','select',true,[['In progress','In progress — save your work'],['Submitted','Submit for guide review']]),
 resultField('methodologyId','Final team methodology followed','Methodology ID','methodology',false),
 resultField('stage','Experiment stage','Stage','select',true,['Pilot','Final']),
 resultField('execution','Experiment outcome','Execution Outcome','select',true,['Measured results','Failed or blocked']),
 resultField('question','Research question or objective tested','Research Question'),
 resultField('dataRecord','Test data, sample size, split and permissions','Data and Test Set'),
 resultField('controls','Baseline and proposed method: what was kept the same?','Comparison and Controls'),
 resultField('protocol','How to repeat this test: settings, seeds and environment','Protocol and Configuration'),
 resultField('sample','Independent test units, repeats and aggregation','Sample and Repeats'),
 resultField('projectData','Project data checks','Project Data Checks'),
 resultField('projectEvaluation','Project evaluation checks','Project Evaluation Checks'),
 resultField('projectValidity','Project validity checks','Project Validity Checks'),
 resultField('linkedIds','Evidence records used in this analysis','Linked Experiment IDs','records',false),
 resultField('contribution','What I personally implemented, tested or analysed','Individual Contribution'),
 resultField('findings','What do the results mean? Explain numbers and comparisons.','Findings'),
 resultField('failures','Failure cases, unsuccessful runs and unexpected findings','Failure Cases'),
 resultField('limitations','Limitations and changes from the approved plan','Limitations'),
 resultField('claimOutcome','What does the evidence support?','Claim Outcome','select',true,['Inconclusive','Supported within tested scope','Mixed evidence','Not supported']),
 resultField('evidenceUrl','Evidence folder: raw outputs, tables, figures and logs','Evidence URL','url'),
 resultField('codeUrl','Code version / commit / reproducibility file link','Code URL','url',false),
 resultField('teamCheck','Team confirmation','Team Confirmation','select',false,['Not yet','Both members reviewed this synthesis']),
 resultField('changes','Changes made since guide feedback (for resubmission)','Changes Since Review','textarea',false)
]};
const RESULT_PROJECTS={
 'SoAI-092':{
  lead:'Face Recognition Attendance: measure verification, attendance controls and response time within the approved scope.',
  fields:{projectData:'Participants and attempts: consent, enrolled/unknown users, calibration/test separation',projectEvaluation:'Threshold and error counts: genuine/impostor attempts, false accepts/rejects, duplicate tests',projectValidity:'Lighting/pose cases, response-time conditions and scope of spoofing claims'},
  hints:['Keep biometric files restricted. Link anonymised counts and permitted evidence; do not publish face images.','Choose the threshold on calibration data. Report denominators for every rate and keep repeated images from the same person identifiable as repeated tests.','Report unknown-face rejection and duplicate-attendance control separately. Photo/video attacks remain excluded unless an approved scope change adds and evaluates liveness.'],
  metrics:['False acceptance rate','False rejection rate','Unknown-face rejection rate','Verification accuracy','Duplicate attendance prevented','Response time']
 },
 'LA7187':{
  lead:'Traffic Control: compare the forecast-driven lane policy with B1, B2 and B3 on the same SUMO scenarios.',
  fields:{projectData:'Corridor, demand scenarios, evaluation/calibration/training seeds and warm-up period',projectEvaluation:'Forecast horizon, B1/B2/B3 settings, lane-clearance rules, switches and violations',projectValidity:'Paired seed results, uncertainty, zero-demand MAPE handling and simulation limits'},
  hints:['The individual drafts specify a 1 km corridor, five scenarios, 10 evaluation seeds and a 15-minute forecast. The approved final team plan determines the actual protocol.','Keep every scenario, including cases where the baseline wins. Link per-seed results; do not treat each simulation time step as an independent run.','Report traffic-control gains separately from forecast MAE/RMSE. Report clearance, aborted switches and safety-rule violations, including zero counts.'],
  metrics:['Average delay','Travel time','Mean queue length','Maximum queue length','Throughput','Congestion duration','Switches per hour','Unnecessary switches','Safety-rule violations','Forecast MAE','Forecast RMSE','Forecast MAPE']
 },
 'SoAI-424':{
  lead:'Video Learning Assistant: evaluate segmentation and timestamp retrieval separately against fixed-length chunks.',
  fields:{projectData:'Videos, development/test split, transcript permissions and frozen annotations/queries',projectEvaluation:'Boundary matching rule, retrieval hit rule, fixed-length baseline and frozen settings',projectValidity:'Per-video results, annotation agreement, segment-length effects and small-sample limits'},
  hints:['The submitted drafts differ in detail. Agree one final method first. Aman’s draft proposes 3 development and 7 test videos; confirm the final sample before testing.','Report Boundary F1, Pk/WindowDiff and retrieval Recall@1, Recall@3/MRR under the agreed rules. Keep per-video results, not only an overall mean.','Report annotation agreement, segment lengths and random-ranking references where specified. Notes/quizzes remain secondary; do not claim measured learning gains without a learner study.'],
  metrics:['Boundary F1','Pk','WindowDiff','Recall@1','Recall@3','MRR','Timestamp error','Retrieval response time','Mean segment length']
 }
};
function resultFields(data){
 const type=data.recordType||RESULT_TYPES[0],experiment=type===RESULT_TYPES[0];
 const onlyExperiment=['stage','execution','dataRecord','controls','protocol','sample','projectData','projectEvaluation','projectValidity','codeUrl'];
 return RESULT_DEFINITION.fields.filter(f=>!(onlyExperiment.includes(f.key)&&!experiment)&&!(f.key==='linkedIds'&&experiment)&&!(f.key==='contribution'&&type!=='Individual Analysis')&&!(f.key==='teamCheck'&&type!=='Final Team Synthesis')).map(f=>({...f,label:RESULT_PROJECTS[team.id].fields[f.key]||f.label,required:['recordType','title','workStatus'].includes(f.key)||(data.workStatus==='Submitted'&&f.required)}));
}
function resultGuidance(data={}){
 const config=RESULT_PROJECTS[team.id],final=shared.methodologies.find(r=>r['Submission Type']==='Final Team Version'&&r['Final Team Approval']==='Approved');
 return `<p class="eyebrow">RESULT ANALYSIS · 10 NOVEMBER 2026</p><h3>${esc(config.lead)}</h3><p>${final?'Approved final method available. Select it below.':'Save preparation and pilot work as In progress. The team still needs an approved Final Team Version before formal result submissions.'}</p><ol>${config.hints.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><p class="helper">Suggested checkpoints: pilot by 31 Oct → main experiments by 6 Nov → analysis and corrections on 7–9 Nov → submit by 10 Nov, 11:59 pm IST. These are internal checkpoints, not extra university deadlines.</p><p class="helper">Experiment evidence → one analysis from each student → one final team synthesis. Guide approval checks the evidence; a negative result can still be good research.</p>`;
}
function readMetrics(value){try{const list=typeof value==='string'?JSON.parse(value||'[]'):value;return Array.isArray(list)?list:[];}catch{return [];}}
function metricChange(m){
 if(m.baseline===''||m.proposed===''||!Number.isFinite(Number(m.baseline))||!Number.isFinite(Number(m.proposed)))return null;
 const b=Number(m.baseline),p=Number(m.proposed),delta=p-b;
 return {delta,improvement:b===0?null:(m.direction==='Lower is better'?b-p:p-b)/Math.abs(b)*100};
}
function metricEditor(value){
 const metrics=readMetrics(value);if(!metrics.length)metrics.push({});
 return `<fieldset class="result-metrics"><legend>Measured comparisons</legend><p class="helper">One card per metric × baseline × test scenario. Use the same unit and test sample for both values. Leave this empty for a failed/blocked run. Raw evidence must support each value.</p><datalist id="metric-options">${RESULT_PROJECTS[team.id].metrics.map(x=>`<option value="${esc(x)}">`).join('')}</datalist><div id="metric-rows">${metrics.map(metricEditorRow).join('')}</div><button id="add-metric" type="button" class="secondary">Add metric comparison</button></fieldset>`;
}
function metricEditorRow(m={},index=0){
 const input=(key,label,type='text')=>`<label>${label}<input data-metric-key="${key}" type="${type}" ${type==='number'?'step="any"':''} ${key==='metric'?'list="metric-options"':''} value="${esc(m[key]??'')}"></label>`;
 return `<div class="metric-entry" data-metric-row><div class="form-grid">${input('metric','Metric')}${input('unit','Unit (e.g. seconds, %, 0–1)')}${input('scenario','Scenario / video / test subset')}${input('baselineName','Baseline name')}<label>Desired direction<select data-metric-key="direction">${['Higher is better','Lower is better'].map(v=>`<option ${m.direction===v?'selected':''}>${v}</option>`).join('')}</select></label>${input('baseline','Baseline value','number')}${input('proposed','Proposed-method value','number')}${input('uncertainty','Variation / confidence interval / reason unavailable')}</div><button type="button" class="secondary remove-metric">Remove this comparison</button></div>`;
}
function bindMetricEditor(){
 const add=$('#add-metric');if(!add)return;
 const bind=()=>document.querySelectorAll('.remove-metric').forEach(b=>b.onclick=()=>{b.closest('[data-metric-row]').remove();saveDraft('result',formData());});
 add.onclick=()=>{$('#metric-rows').insertAdjacentHTML('beforeend',metricEditorRow());bind();};bind();
}
function metricsFromForm(){return Array.from(document.querySelectorAll('[data-metric-row]')).map(row=>Object.fromEntries(Array.from(row.querySelectorAll('[data-metric-key]')).map(i=>[i.dataset.metricKey,i.value]))).filter(m=>['metric','unit','baselineName','baseline','proposed','scenario','uncertainty'].some(k=>String(m[k]||'').trim()));}
function resultMetricCards(row){return readMetrics(row['Metric Data']).map(m=>{const change=metricChange(m);return `<section class="metric-result"><h4>${esc(m.metric)} · ${esc(m.scenario)}</h4><p>${esc(m.baselineName)}: <strong>${esc(m.baseline)}</strong> → proposed: <strong>${esc(m.proposed)}</strong> ${esc(m.unit)}</p><p class="helper">${esc(m.direction)}${change?` · Difference: ${change.delta.toFixed(3)} ${esc(m.unit)} · Relative improvement: ${change.improvement===null?'not defined (zero baseline)':change.improvement.toFixed(2)+'%'}`:''}</p><p>${esc(m.uncertainty||'Uncertainty not yet recorded.')}</p></section>`;}).join('');}
function resultSourcesChanged(row){
 let refs;try{refs=JSON.parse(row['Source Revisions']||'{}');}catch{return true;}
 return Object.entries(refs).some(([id,rev])=>{const source=[...shared.methodologies,...(shared.results||[])].find(r=>r['Record ID']===id);return !source||String(source.Revision)!==String(rev);});
}
function resultCard(row,index){
 const decision=guideDecision(row),type=row['Record Type']||'Result record',stale=resultSourcesChanged(row);
 const fields=RESULT_DEFINITION.fields.filter(f=>row[f.column]&&!['recordType','title','workStatus','evidenceUrl','codeUrl','methodologyId'].includes(f.key)).map(f=>[RESULT_PROJECTS[team.id].fields[f.key]||f.label,row[f.column]]);
 const feedback=row['Guide Feedback']?`<div class="guide-feedback"><strong>${decision.tone==='pending'?'Previous guide feedback — latest revision awaits review':'Guide feedback'}</strong><p>${esc(row['Guide Feedback'])}</p></div>`:'';
 return `<details class="review-card review-card-${stale?'revise':decision.tone}"><summary><span class="review-title"><strong>${esc(row.Title)}</strong><small>${esc(row.Owner)} · ${esc(type)} · revision ${esc(row.Revision)}</small></span><span class="review-summary-tags">${stale?'<span class="guide-flag guide-flag-revise">Source updated — recheck</span>':guideFlag(row)}</span></summary><div class="review-card-body"><div class="review-card-meta"><span>Record: ${esc(row['Record ID'])}</span><span>Method: ${esc(row['Methodology ID']||'Not linked yet')}</span><span>First submitted: ${esc(row['First Submitted At']?displayDate(row['First Submitted At']):'Not submitted')}</span>${row['Evidence URL']?link(row['Evidence URL'],'Open result evidence'):''}${row['Code URL']?link(row['Code URL'],'Open code / reproducibility record'):''}</div>${stale?'<p class="result-warning">A linked methodology or result has changed. Recheck the analysis and resubmit against the current evidence.</p>':''}${recordDetails(fields)}<div class="result-comparisons">${resultMetricCards(row)}</div>${feedback}${row['Guide Reviewer']?`<p class="helper">Reviewed by ${esc(row['Guide Reviewer'])} · ${esc(row['Reviewed At']||'')}</p>`:''}<div class="review-card-actions"><button type="button" class="secondary" data-edit="result" data-index="${index}">${decision.tone==='revise'?'Revise & resubmit':'Open result record'}</button></div></div></details>`;
}
function resultProgress(){
 const rows=shared.results||[];
 return team.students.map(owner=>{const mine=rows.filter(r=>r.Owner===owner&&r['Record Type']!=='Final Team Synthesis'),submitted=mine.filter(r=>r['Work Status']==='Submitted'),analysis=mine.find(r=>r['Record Type']==='Individual Analysis');return `<div><strong>${esc(owner)}</strong><p>${submitted.filter(r=>r['Record Type']==='Experiment Evidence').length} experiment records submitted · ${submitted.filter(r=>r['Guide Approval']==='Approved'&&!resultSourcesChanged(r)).length} records approved</p><p>Individual analysis: ${analysis?esc(guideDecision(analysis).label):'Not started'}</p></div>`;}).join('');
}
function exportResultReport(){
 const rows=shared.results||[],html=`<!doctype html><meta charset="utf-8"><title>${esc(team.id)} result analysis</title><style>body{font:16px/1.6 Arial;max-width:1000px;margin:32px auto;padding:24px;color:#231b1b}h1,h2,h3{color:#8b2520}section{break-inside:avoid;margin:16px 0;border:1px solid #ddd;padding:16px}p{white-space:pre-wrap;overflow-wrap:anywhere}button{padding:12px}@media print{button{display:none}}</style><button onclick="window.print()">Print / save PDF</button><h1>${esc(team.id)} · ${esc(team.title)}</h1><p>Result analysis · exported ${esc(new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}))} IST. Recorded contributions are self-reported and require guide verification.</p>${rows.map(r=>`<section><h2>${esc(r.Title)}</h2><p>${esc(r['Record Type'])} · ${esc(r.Owner)} · ${esc(guideDecision(r).label)}${resultSourcesChanged(r)?' · Source updated — recheck':''}</p>${RESULT_DEFINITION.fields.filter(f=>r[f.column]).map(f=>`<h3>${esc(f.label)}</h3><p>${esc(r[f.column])}</p>`).join('')}${resultMetricCards(r)}<h3>Guide feedback</h3><p>${esc(r['Guide Feedback']||'No feedback recorded.')}</p></section>`).join('')}`;
 const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=team.id+'-result-analysis.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
