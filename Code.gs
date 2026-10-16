// Research workflow v4. Team codes stay in Script Properties and the private tracker.
const SCHEMAS = {
 Papers:['Paper ID','Project ID','Title','Author and Year','Type','Owner','DOI or Legal Link','Relevance Rationale','Screening Status','Submitted By','Submitted At','Authors','Year','Venue','Drive Link','Screening Notes','Revision'],
 'Literature Review':['Paper ID','Project ID','Author','Year','Research Task','Algorithm or Method','Dataset','Metrics','Result','Limitations','Research Gap','Reviewer','Guide Approval','Review Status','Updated At','Revision'],
 'Research Problems':['Record ID','Project ID','Problem Statement','Motivation','Research Question','Objectives','Scope','Drive Folder','Owner','Guide Approval','Updated At','Revision'],
 'Search Log':['Record ID','Project ID','Query','Search Date','Search URL','Notes','Owner','Updated At','Revision'],
 'Research Gaps':['Record ID','Project ID','Synthesis','Research Gap','Proposed Contribution','Supporting Paper IDs','Owner','Guide Approval','Updated At','Revision'],
 'Methodology':['Record ID','Project ID','Method Scope','System Workflow','Data and Permission Record','Proposed Method','Baseline Methods','Evaluation Plan','Metrics and Success Criteria','Experiment Protocol','Reproducibility and Environment','Contribution Claim','Evidence Folder','Owner','Guide Approval','Guide Feedback','Updated At','Revision','Submission Type','Team Contributors','Source Draft IDs','Final Team Approval','First Submitted At','Comparison Notes'],
 Interactions:['Interaction ID','Project ID','Date','Mode','Participants','Feedback','Action Items','Completion Status','Recorded At','Revision'],
 'Portal Audit':['Timestamp','Project ID','Action','Record ID','Owner','Revision'],
 'Portal Access':['Project ID','Team Access Code','Instructions']
};
function spreadsheet() {
 const id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
 if(!id) throw new Error('Guide must run setupWorkbook first.');
 return SpreadsheetApp.openById(id);
}
function ensureSheet(name) {
 const ss=spreadsheet(),schema=SCHEMAS[name]||[];
 const sheet=ss.getSheetByName(name)||ss.insertSheet(name);
 if(!schema.length)return sheet;
 const headers=sheet.getLastColumn()?sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0]:[];
 schema.forEach(header=>{if(!headers.includes(header))headers.push(header);});
 if(headers.length>sheet.getMaxColumns())sheet.insertColumnsAfter(sheet.getMaxColumns(),headers.length-sheet.getMaxColumns());
 sheet.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold').setWrap(true);
 sheet.setFrozenRows(1);
 if(sheet.getLastRow()<=1)sheet.setColumnWidths(1,headers.length,180);
 return sheet;
}
function setupWorkbook() {
 PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID',SpreadsheetApp.getActive().getId());
 setupResearchWorkflow();
}
function setupResearchWorkflow() {
 Object.keys(SCHEMAS).forEach(ensureSheet);
 const props=PropertiesService.getScriptProperties();
 records('Projects').forEach(project=>{
  const id=project['Project ID'];if(!id)return;
  let code=props.getProperty('TEAM_'+id);
  if(!code){code=Utilities.getUuid().replace(/-/g,'');props.setProperty('TEAM_'+id,code);}
  put('Portal Access','Project ID',id,{'Project ID':id,'Team Access Code':code,'Instructions':'Share this code only with this team. Keep this tracker restricted to guides. Codes identify a team, not an individual.'});
 });
}
function records(name) {
 const s=spreadsheet().getSheetByName(name)||(SCHEMAS[name]?ensureSheet(name):null);if(!s||s.getLastRow()<2)return [];
 const rows=s.getRange(1,1,s.getLastRow(),s.getLastColumn()).getValues(),headers=rows.shift();
 return rows.filter(r=>r[0]!=='').map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]])));
}
function safeCell(value){const text=String(value==null?'':value);return /^[=+@-]/.test(text)?"'"+text:text;}
function put(name,key,id,values){
 const s=spreadsheet().getSheetByName(name)||ensureSheet(name);const headers=s.getRange(1,1,1,s.getLastColumn()).getValues()[0],column=headers.indexOf(key);
 const ids=s.getLastRow()>1?s.getRange(2,column+1,s.getLastRow()-1,1).getValues().flat().map(String):[];
 const index=ids.indexOf(String(id)),row=index<0?s.getLastRow()+1:index+2;
 if(row>s.getMaxRows())s.insertRowAfter(s.getMaxRows());
 Object.keys(values).forEach(h=>{const c=headers.indexOf(h);if(c>=0)s.getRange(row,c+1).setValue(safeCell(values[h]));});
}
function requireFields(p,fields){
 fields.forEach(f=>{if(!String(p[f]||'').trim())throw new Error('Complete '+f+'.');});
 Object.keys(p).forEach(k=>{if(String(p[k]).length>15000)throw new Error('Field too long: '+k);});
}
function requireUrl(value,drive){
 const text=String(value||'');
 if(!text.startsWith('https://')||text.includes(' '))throw new Error('Use a valid HTTPS link.');
 if(drive&&!text.startsWith('https://drive.google.com/'))throw new Error('Use a Google Drive link.');
}
function authorize(r){
 const id=String(r.projectId||''),expected=PropertiesService.getScriptProperties().getProperty('TEAM_'+id);
 if(!expected||String(r.accessCode||'')!==expected)throw new Error('Enter the access code supplied by your guide for this team.');
 return id;
}
function ownerAllowed(id,owner){if(!records('Students').some(r=>r['Project ID']===id&&r.Role==='Student'&&r.Name===owner))throw new Error('Select a student from this team.');}
function selectProject(name,id){return records(name).filter(r=>r['Project ID']===id);}
function loadProject(id){return{papers:selectProject('Papers',id),reviews:selectProject('Literature Review',id),problems:selectProject('Research Problems',id),searches:selectProject('Search Log',id),gaps:selectProject('Research Gaps',id),methodologies:selectProject('Methodology',id),interactions:selectProject('Interactions',id)};}
function doGet(){return jsonResponse({ok:true,version:3,message:'My Capstone Guide API. Team access required for records.'});}
function doPost(e){
 const lock=LockService.getScriptLock();
 try{
  const r=JSON.parse(e.postData.contents),id=authorize(r);
  if(!lock.tryLock(25000))throw new Error('Tracker busy. Retry shortly.');
  if(r.action==='loadProject')return jsonResponse({ok:true,version:3,data:loadProject(id)});
  const record=saveRecord(id,r.action,r.payload||{});SpreadsheetApp.flush();
  return jsonResponse({ok:true,version:3,record:record,data:loadProject(id)});
 }catch(error){return jsonResponse({ok:false,error:error.message});}
 finally{if(lock.hasLock())lock.releaseLock();}
}
function saveRecord(projectId,action,p){
 requireFields(p,['id','owner']);ownerAllowed(projectId,p.owner);
 if(!/^[a-zA-Z0-9_-]{3,100}$/.test(p.id))throw new Error('Invalid record ID.');
 const now=new Date().toISOString();let name,key,row;
 if(action==='saveProblem'){
  requireFields(p,['statement','motivation','question','objectives','scope']);if(p.driveFolder)requireUrl(p.driveFolder,true);
  name='Research Problems';key='Record ID';
  row={'Record ID':p.id,'Problem Statement':p.statement,'Motivation':p.motivation,'Research Question':p.question,'Objectives':p.objectives,'Scope':p.scope,'Drive Folder':p.driveFolder||'','Owner':p.owner,'Guide Approval':'Pending','Updated At':now};
 }else if(action==='saveSearch'){
  requireFields(p,['query','date']);if(!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(p.date))throw new Error('Use a search date.');
  name='Search Log';key='Record ID';row={'Record ID':p.id,'Query':p.query,'Search Date':p.date,'Search URL':'https://scholar.google.com/scholar?q='+encodeURIComponent(p.query),'Notes':p.notes||'','Owner':p.owner,'Updated At':now};
 }else if(action==='savePaper'){
  requireFields(p,['title','authors','year','type','venue','sourceUrl','relevance','screeningNotes']);
  if(!['Journal','Conference'].includes(p.type))throw new Error('Choose Journal or Conference.');
  if(!/^[0-9]{4}$/.test(p.year)||+p.year<1900||+p.year>new Date().getFullYear()+1)throw new Error('Enter a valid publication year.');
  if(!['Screened','Rejected'].includes(p.status))throw new Error('Choose include or exclude.');
  requireUrl(p.sourceUrl);if(p.driveUrl)requireUrl(p.driveUrl,true);
  const canonical=v=>{let value=String(v).toLowerCase().trim();['https://doi.org/','http://doi.org/','https://dx.doi.org/','http://dx.doi.org/'].forEach(prefix=>{if(value.startsWith(prefix))value=value.slice(prefix.length);});return value.endsWith('/')?value.slice(0,-1):value;};
  const duplicate=selectProject('Papers',projectId).find(r=>r['Paper ID']!==p.id&&(canonical(r.Title)===canonical(p.title)||canonical(r['DOI or Legal Link'])===canonical(p.sourceUrl)));
  if(duplicate)throw new Error('This paper is already recorded as '+duplicate['Paper ID']+'. Open it to edit.');
  name='Papers';key='Paper ID';row={'Paper ID':p.id,'Title':p.title,'Author and Year':p.authors+', '+p.year,'Authors':p.authors,'Year':p.year,'Type':p.type,'Venue':p.venue,'Owner':p.owner,'DOI or Legal Link':p.sourceUrl,'Relevance Rationale':p.relevance,'Screening Status':p.status,'Submitted By':p.owner,'Submitted At':now,'Drive Link':p.driveUrl||'','Screening Notes':p.screeningNotes};
 }else if(action==='saveReview'){
  requireFields(p,['paperId','task','algorithm','dataset','metrics','result','limitations','gap']);
  const paper=selectProject('Papers',projectId).find(r=>r['Paper ID']===p.paperId);
  if(!paper||paper['Screening Status']==='Rejected')throw new Error('Save an included paper in this team first.');
  if(!['Reading','Complete'].includes(p.status))throw new Error('Choose Reading or Complete.');
  if(p.id!==p.paperId)throw new Error('Review must use the paper ID.');
  name='Literature Review';key='Paper ID';row={'Paper ID':p.paperId,'Author':paper.Authors||paper['Author and Year'],'Year':paper.Year||'','Research Task':p.task,'Algorithm or Method':p.algorithm,'Dataset':p.dataset,'Metrics':p.metrics,'Result':p.result,'Limitations':p.limitations,'Research Gap':p.gap,'Reviewer':p.owner,'Guide Approval':'Pending','Review Status':p.status,'Updated At':now};
 }else if(action==='saveGap'){
  requireFields(p,['synthesis','gap','contribution','paperIds']);const ids=p.paperIds.split(',').map(s=>s.trim()).filter(Boolean),papers=selectProject('Papers',projectId);
  if(ids.some(id=>!papers.some(r=>r['Paper ID']===id&&r['Screening Status']!=='Rejected')))throw new Error('Use included Paper IDs from this team, separated by commas.');
  name='Research Gaps';key='Record ID';row={'Record ID':p.id,'Synthesis':p.synthesis,'Research Gap':p.gap,'Proposed Contribution':p.contribution,'Supporting Paper IDs':ids.join(', '),'Owner':p.owner,'Guide Approval':'Pending','Updated At':now};
 }else if(action==='saveMethodology'){
  requireFields(p,['scope','workflow','dataRecord','method','baselines','evaluation','metrics','protocol','reproducibility','contribution','evidenceFolder']);
  requireUrl(p.evidenceFolder,true);
  const submissionType=p.submissionType||'Individual Draft';
  if(!['Individual Draft','Final Team Version'].includes(submissionType))throw new Error('Choose an individual draft or final team version.');
  const existingMethods=selectProject('Methodology',projectId);
  const existingMethod=existingMethods.find(r=>String(r['Record ID'])===p.id);
  if(existingMethod&&(existingMethod['Submission Type']||'Individual Draft')!==submissionType)throw new Error('A saved draft cannot change type. Create a new record for the final team version.');
  if(submissionType==='Final Team Version'&&existingMethod&&existingMethod['Final Team Approval']==='Approved')throw new Error('The final team methodology is approved. Ask the guide before changing it.');
  let contributors='',sourceDraftIds='',finalApproval='';
  if(submissionType==='Final Team Version'){
   requireFields(p,['comparison']);
   const teammates=records('Students').filter(r=>r['Project ID']===projectId&&r.Role==='Student').map(r=>r.Name);
   const approved=teammates.map(student=>existingMethods.filter(r=>r.Owner===student&&(r['Submission Type']||'Individual Draft')==='Individual Draft'&&r['Guide Approval']==='Approved').sort((a,b)=>String(b['Updated At']).localeCompare(String(a['Updated At'])))[0]);
   if(teammates.length<2||approved.some(r=>!r))throw new Error('Each team member needs an approved individual methodology draft before the final team version.');
   if(existingMethods.some(r=>r['Submission Type']==='Final Team Version'&&String(r['Record ID'])!==p.id))throw new Error('A final team record already exists. Open and revise that record instead of creating another.');
   contributors=teammates.join(', ');sourceDraftIds=approved.map(r=>r['Record ID']).join(', ');finalApproval='Pending';
  }
  name='Methodology';key='Record ID';row={'Record ID':p.id,'Method Scope':p.scope,'System Workflow':p.workflow,'Data and Permission Record':p.dataRecord,'Proposed Method':p.method,'Baseline Methods':p.baselines,'Evaluation Plan':p.evaluation,'Metrics and Success Criteria':p.metrics,'Experiment Protocol':p.protocol,'Reproducibility and Environment':p.reproducibility,'Contribution Claim':p.contribution,'Evidence Folder':p.evidenceFolder,'Owner':p.owner,'Guide Approval':submissionType==='Individual Draft'?'Pending':'','Submission Type':submissionType,'Team Contributors':contributors,'Source Draft IDs':sourceDraftIds,'Final Team Approval':finalApproval,'First Submitted At':existingMethod&&existingMethod['First Submitted At']||now,'Comparison Notes':submissionType==='Final Team Version'?p.comparison:'','Updated At':now};
 }else if(action==='addInteraction'){
  requireFields(p,['date','mode','feedback','actionItems']);if(!['Online','Offline'].includes(p.mode))throw new Error('Choose Online or Offline.');
  name='Interactions';key='Interaction ID';row={'Interaction ID':p.id,'Date':p.date,'Mode':p.mode,'Participants':records('Students').filter(r=>r['Project ID']===projectId).map(r=>r.Name).join(', '),'Feedback':p.feedback,'Action Items':p.actionItems,'Completion Status':'Pending','Recorded At':now};
 }else throw new Error('Unsupported action. Refresh the portal.');
 const previous=records(name).find(r=>String(r[key])===p.id);
 if(previous&&previous['Project ID']!==projectId)throw new Error('Record belongs to another team.');
 const revision=Number(previous&&previous.Revision||0),volatile=['Submitted At','Updated At','Recorded At','Guide Approval','Guide Feedback','Final Team Approval','First Submitted At'];
 if(previous&&Object.keys(row).filter(k=>!volatile.includes(k)).every(k=>String(previous[k]||'')===String(row[k]||'')))return previous;
 if(revision!==Number(p.revision||0))throw new Error('A teammate changed this record. Reload shared records and open the latest version. Your draft remains on this device.');
 row['Project ID']=projectId;row.Revision=revision+1;put(name,key,p.id,row);
 spreadsheet().getSheetByName('Portal Audit').appendRow([now,projectId,action,p.id,safeCell(p.owner),revision+1]);return row;
}
function jsonResponse(payload){return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);}
