// Research workflow v5. Team codes stay in Script Properties and the private tracker.
const SCHEMAS = {
 Papers:['Paper ID','Project ID','Title','Author and Year','Type','Owner','DOI or Legal Link','Relevance Rationale','Screening Status','Submitted By','Submitted At','Authors','Year','Venue','Drive Link','Screening Notes','Revision'],
 'Literature Review':['Paper ID','Project ID','Author','Year','Research Task','Algorithm or Method','Dataset','Metrics','Result','Limitations','Research Gap','Reviewer','Guide Approval','Review Status','Updated At','Revision'],
 'Research Problems':['Record ID','Project ID','Problem Statement','Motivation','Research Question','Objectives','Scope','Drive Folder','Owner','Guide Approval','Updated At','Revision'],
 'Search Log':['Record ID','Project ID','Query','Search Date','Search URL','Notes','Owner','Updated At','Revision'],
 'Research Gaps':['Record ID','Project ID','Synthesis','Research Gap','Proposed Contribution','Supporting Paper IDs','Owner','Guide Approval','Updated At','Revision'],
 'Methodology':['Record ID','Project ID','Method Scope','System Workflow','Data and Permission Record','Proposed Method','Baseline Methods','Evaluation Plan','Metrics and Success Criteria','Experiment Protocol','Reproducibility and Environment','Contribution Claim','Evidence Folder','Owner','Guide Approval','Guide Feedback','Updated At','Revision','Submission Type','Team Contributors','Source Draft IDs','Final Team Approval','First Submitted At','Comparison Notes'],
 Interactions:['Interaction ID','Project ID','Date','Mode','Participants','Feedback','Action Items','Completion Status','Recorded At','Revision'],
 'Portal Audit':['Timestamp','Project ID','Action','Record ID','Owner','Revision'],
 'Portal Access':['Project ID','Team Access Code','Instructions'],
 'Result Analysis':['Record ID','Project ID','Record Type','Title','Owner','Methodology ID','Methodology Revision','Stage','Execution Outcome','Work Status','Research Question','Data and Test Set','Comparison and Controls','Protocol and Configuration','Sample and Repeats','Project Data Checks','Project Evaluation Checks','Project Validity Checks','Linked Experiment IDs','Individual Contribution','Findings','Failure Cases','Limitations','Claim Outcome','Evidence URL','Code URL','Team Confirmation','Changes Since Review','Metric Data','Source Revisions','Guide Approval','Guide Feedback','Guide Reviewer','Reviewed At','First Saved At','First Submitted At','Updated At','Revision'],
 'Result Metrics':['Timestamp','Project ID','Record ID','Revision','Owner','Scenario','Metric','Unit','Direction','Baseline Name','Baseline Value','Proposed Value','Difference','Relative Improvement Percent','Uncertainty'],
 'Result History':['Timestamp','Project ID','Record ID','Revision','Event','Actor','Snapshot']
 ,'Project Setup':['Record ID','Project ID','Setup Status','Final Methodology ID','Repository URL','Setup Checkpoint URL','README and Run Instructions','Dependency / Environment File','Configuration and Fixed Seed','Evidence Archive URL','Implementation Roles','Owner','Guide Approval','Repository Check','Guide Feedback','Guide Reviewer','Reviewed At','First Saved At','First Submitted At','Updated At','Revision']
 ,'Publication Readiness':['Record ID','Project ID','Readiness Status','Working Paper Title','Keywords','Contribution Claim','Closest Paper IDs','Novelty Comparison','Claim Boundaries','Ethics, Consent and Permissions','Data and Licence Record','Code Version URL','Environment, Seeds and Reproduction Steps','Evidence Archive URL','Author Order and Contributions','Venue Plan','Guide Approval','Novelty Check','Reproducibility Check','Guide Feedback','Guide Reviewer','Reviewed At','First Saved At','First Submitted At','Updated At','Revision']
 ,'Paper Draft Tracker':['Record ID','Project ID','Paper Section','Work Status','Document URL','Evidence URL','Section Summary','Owner','Guide Approval','Guide Feedback','Guide Reviewer','Reviewed At','First Saved At','First Submitted At','Updated At','Revision']
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
 setupPublicationReviewControls();
 const props=PropertiesService.getScriptProperties();
 records('Projects').forEach(project=>{
  const id=project['Project ID'];if(!id)return;
  let code=props.getProperty('TEAM_'+id);
  if(!code){code=Utilities.getUuid().replace(/-/g,'');props.setProperty('TEAM_'+id,code);}
  put('Portal Access','Project ID',id,{'Project ID':id,'Team Access Code':code,'Instructions':'Share this code only with this team. Keep this tracker restricted to guides. Codes identify a team, not an individual.'});
 });
}
function setupPublicationReviewControls(){
 const apply=(sheetName,header,choices)=>{
  const sheet=spreadsheet().getSheetByName(sheetName);
  if(!sheet||sheet.getMaxRows()<2)return;
  const headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0],column=headers.indexOf(header);
  if(column<0)return;
  const rule=SpreadsheetApp.newDataValidation().requireValueInList(choices,true).setAllowInvalid(false).build();
  sheet.getRange(2,column+1,sheet.getMaxRows()-1,1).setDataValidation(rule);
 };
 apply('Publication Readiness','Guide Approval',['Pending','Approved','Revise']);
 apply('Publication Readiness','Novelty Check',['Not checked','Clear','Needs revision']);
 apply('Publication Readiness','Reproducibility Check',['Not checked','Links checked','Sample reproduced','Needs revision']);
 apply('Project Setup','Guide Approval',['Pending','Approved','Revise']);
 apply('Project Setup','Repository Check',['Not checked','Links checked','Sample reproduced','Needs revision']);
 apply('Paper Draft Tracker','Guide Approval',['Pending','Approved','Revise']);
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
 const id=String(r.projectId||''),props=PropertiesService.getScriptProperties(),expected=props.getProperty('TEAM_'+id),code=String(r.accessCode||'');
 if(!expected)throw new Error('Choose a valid project.');
 if(code===expected)return {projectId:id,readOnly:false};
 const guideCode=props.getProperty('GUIDE_READ_CODE');
 if(guideCode&&code===guideCode)return {projectId:id,readOnly:true};
 throw new Error('Enter the access code supplied by your guide for this team.');
}
function ownerAllowed(id,owner){if(!records('Students').some(r=>r['Project ID']===id&&r.Role==='Student'&&r.Name===owner))throw new Error('Select a student from this team.');}
function selectProject(name,id){return records(name).filter(r=>r['Project ID']===id);}
function loadProject(id){return{papers:selectProject('Papers',id),reviews:selectProject('Literature Review',id),problems:selectProject('Research Problems',id),searches:selectProject('Search Log',id),gaps:selectProject('Research Gaps',id),methodologies:selectProject('Methodology',id),setups:selectProject('Project Setup',id),results:selectProject('Result Analysis',id),publications:selectProject('Publication Readiness',id),drafts:selectProject('Paper Draft Tracker',id),interactions:selectProject('Interactions',id)};}
function doGet(){return jsonResponse({ok:true,version:3,message:'My Capstone Guide API. Team access required for records.'});}
function doPost(e){
 const lock=LockService.getScriptLock();
 try{
  const r=JSON.parse(e.postData.contents),access=authorize(r),id=access.projectId;
  if(!lock.tryLock(25000))throw new Error('Tracker busy. Retry shortly.');
  if(r.action==='loadProject')return jsonResponse({ok:true,version:3,capabilities:['results-v1'],readOnly:access.readOnly,data:loadProject(id)});
  if(access.readOnly)throw new Error('Guide access is read-only. Use the guide tracker for approval and feedback.');
  const record=saveRecord(id,r.action,r.payload||{});SpreadsheetApp.flush();
  return jsonResponse({ok:true,version:3,capabilities:['results-v1'],record:record,data:loadProject(id)});
 }catch(error){return jsonResponse({ok:false,error:error.message});}
 finally{if(lock.hasLock())lock.releaseLock();}
}
function saveRecord(projectId,action,p){
 requireFields(p,['id','owner']);ownerAllowed(projectId,p.owner);
 if(!/^[a-zA-Z0-9_-]{3,100}$/.test(p.id))throw new Error('Invalid record ID.');
 if(action==='saveResult')return saveResultRecord(projectId,p);
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
 }else if(action==='saveSetup'){
  if(!['In progress','Ready for guide review'].includes(p.status))throw new Error('Choose an appropriate setup status.');
  const setupExisting=selectProject('Project Setup',projectId).find(r=>String(r['Record ID'])===String(p.id));
  const existing=selectProject('Project Setup',projectId).find(r=>String(r['Record ID'])!==String(p.id));
  if(existing)throw new Error('This team already has a reproducible-workspace record. Open and update that record.');
  const ready=p.status==='Ready for guide review';
  const method=selectProject('Methodology',projectId).find(r=>String(r['Record ID'])===String(p.methodologyId)&&r['Submission Type']==='Final Team Version');
  if(p.methodologyId&&!method)throw new Error('Choose an existing Final Team Version of the methodology.');
  if(ready&&(!method||method['Final Team Approval']!=='Approved'))throw new Error('Choose the approved Final Team Version of the methodology before guide review.');
  if(ready)requireFields(p,['methodologyId','repositoryUrl','checkpointUrl','readme','environmentFile','configuration','evidenceUrl','roles']);
  if(p.repositoryUrl){requireUrl(p.repositoryUrl);if(!p.repositoryUrl.startsWith('https://github.com/'))throw new Error('Use the team GitHub repository link.');}
  if(p.checkpointUrl){requireUrl(p.checkpointUrl);if(!p.checkpointUrl.startsWith('https://github.com/')||!/\/commit\/|\/releases\/tag\//.test(p.checkpointUrl))throw new Error('Use the exact GitHub commit or release URL for this checkpoint.');}
  if(p.evidenceUrl)requireUrl(p.evidenceUrl,true);
  name='Project Setup';key='Record ID';row={'Record ID':p.id,'Setup Status':p.status,'Final Methodology ID':p.methodologyId||'','Repository URL':p.repositoryUrl||'','Setup Checkpoint URL':p.checkpointUrl||'','README and Run Instructions':p.readme||'','Dependency / Environment File':p.environmentFile||'','Configuration and Fixed Seed':p.configuration||'','Evidence Archive URL':p.evidenceUrl||'','Implementation Roles':p.roles||'','Owner':p.owner,'Guide Approval':'Pending','Repository Check':setupExisting&&setupExisting['Repository Check']||'Not checked','Guide Feedback':setupExisting&&setupExisting['Guide Feedback']||'','Guide Reviewer':'','Reviewed At':'','First Saved At':setupExisting&&setupExisting['First Saved At']||now,'First Submitted At':setupExisting&&setupExisting['First Submitted At']||(ready?now:''),'Updated At':now};
 }else if(action==='savePublication'){
  if(!['In progress','Ready for guide review'].includes(p.status))throw new Error('Choose an appropriate readiness status.');
  const publicationExisting=selectProject('Publication Readiness',projectId).find(r=>String(r['Record ID'])===String(p.id));
  const existing=selectProject('Publication Readiness',projectId).find(r=>String(r['Record ID'])!==String(p.id));
  if(existing)throw new Error('This team already has a publication-readiness record. Open and update that record.');
  const ready=p.status==='Ready for guide review';
  if(ready)requireFields(p,['title','keywords','contribution','closestPaperIds','novelty','boundaries','ethics','dataRecord','environment','evidenceUrl','authors','venuePlan']);
  const paperIds=String(p.closestPaperIds||'').split(',').map(v=>v.trim()).filter(Boolean),papers=selectProject('Papers',projectId).filter(r=>r['Screening Status']!=='Rejected');
  if(paperIds.length&&paperIds.some(id=>!papers.some(r=>String(r['Paper ID'])===id)))throw new Error('Use included Paper IDs from this team for the closest-paper comparison.');
  if(ready&&paperIds.length<3)throw new Error('Compare with at least three included Paper IDs before guide review.');
  if(p.codeUrl)requireUrl(p.codeUrl);if(p.evidenceUrl)requireUrl(p.evidenceUrl,true);
  name='Publication Readiness';key='Record ID';row={'Record ID':p.id,'Readiness Status':p.status,'Working Paper Title':p.title||'','Keywords':p.keywords||'','Contribution Claim':p.contribution||'','Closest Paper IDs':paperIds.join(', '),'Novelty Comparison':p.novelty||'','Claim Boundaries':p.boundaries||'','Ethics, Consent and Permissions':p.ethics||'','Data and Licence Record':p.dataRecord||'','Code Version URL':p.codeUrl||'','Environment, Seeds and Reproduction Steps':p.environment||'','Evidence Archive URL':p.evidenceUrl||'','Author Order and Contributions':p.authors||'','Venue Plan':p.venuePlan||'','Guide Approval':'Pending','Novelty Check':publicationExisting&&publicationExisting['Novelty Check']||'Not checked','Reproducibility Check':publicationExisting&&publicationExisting['Reproducibility Check']||'Not checked','Guide Feedback':publicationExisting&&publicationExisting['Guide Feedback']||'','Guide Reviewer':'','Reviewed At':'','First Saved At':publicationExisting&&publicationExisting['First Saved At']||now,'First Submitted At':publicationExisting&&publicationExisting['First Submitted At']||(ready?now:''),'Updated At':now};
 }else if(action==='saveDraft'){
  const sections=['Title, keywords and authors','Abstract','Introduction and problem','Related work','Methodology','Results','Discussion and limitations','Conclusion and future work','Declarations and submission checklist'];
  if(!sections.includes(p.section)||!['In progress','Ready for guide review'].includes(p.workStatus))throw new Error('Choose a paper section and work status.');
  const draftExisting=selectProject('Paper Draft Tracker',projectId).find(r=>String(r['Record ID'])===String(p.id));
  const existing=selectProject('Paper Draft Tracker',projectId).find(r=>String(r['Record ID'])!==String(p.id)&&r['Paper Section']===p.section);
  if(existing)throw new Error('This paper section already has a tracker record. Open and update that record.');
  const ready=p.workStatus==='Ready for guide review';
  if(ready)requireFields(p,['documentUrl','summary']);
  if(p.documentUrl)requireUrl(p.documentUrl,true);if(p.evidenceUrl)requireUrl(p.evidenceUrl);
  name='Paper Draft Tracker';key='Record ID';row={'Record ID':p.id,'Paper Section':p.section,'Work Status':p.workStatus,'Document URL':p.documentUrl||'','Evidence URL':p.evidenceUrl||'','Section Summary':p.summary||'','Owner':p.owner,'Guide Approval':'Pending','Guide Feedback':draftExisting&&draftExisting['Guide Feedback']||'','Guide Reviewer':'','Reviewed At':'','First Saved At':draftExisting&&draftExisting['First Saved At']||now,'First Submitted At':draftExisting&&draftExisting['First Submitted At']||(ready?now:''),'Updated At':now};
 }else if(action==='addInteraction'){
  requireFields(p,['date','mode','feedback','actionItems']);if(!['Online','Offline'].includes(p.mode))throw new Error('Choose Online or Offline.');
  name='Interactions';key='Interaction ID';row={'Interaction ID':p.id,'Date':p.date,'Mode':p.mode,'Participants':records('Students').filter(r=>r['Project ID']===projectId).map(r=>r.Name).join(', '),'Feedback':p.feedback,'Action Items':p.actionItems,'Completion Status':'Pending','Recorded At':now};
 }else throw new Error('Unsupported action. Refresh the portal.');
 const previous=records(name).find(r=>String(r[key])===p.id);
 if(previous&&previous['Project ID']!==projectId)throw new Error('Record belongs to another team.');
 const revision=Number(previous&&previous.Revision||0),volatile=['Submitted At','Updated At','Recorded At','Guide Approval','Guide Feedback','Final Team Approval','First Submitted At','Novelty Check','Reproducibility Check','Repository Check','Guide Reviewer','Reviewed At'];
 if(previous&&Object.keys(row).filter(k=>!volatile.includes(k)).every(k=>String(previous[k]||'')===String(row[k]||'')))return previous;
 if(revision!==Number(p.revision||0))throw new Error('A teammate changed this record. Reload shared records and open the latest version. Your draft remains on this device.');
 row['Project ID']=projectId;row.Revision=revision+1;put(name,key,p.id,row);
 spreadsheet().getSheetByName('Portal Audit').appendRow([now,projectId,action,p.id,safeCell(p.owner),revision+1]);return row;
}
function jsonResponse(payload){return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);}

function setupResultsWorkflow(){
 ['Result Analysis','Result Metrics','Result History'].forEach(name=>{
  const s=ensureSheet(name),n=SCHEMAS[name].length;
  s.getRange(1,1,1,n).setBackground('#b0322c').setFontColor('#ffffff').setFontWeight('bold').setWrap(true);
  s.setRowHeight(1,48);s.setColumnWidths(1,n,190);s.setFrozenRows(1);
 });
 const sheet=spreadsheet().getSheetByName('Result Analysis'),headers=SCHEMAS['Result Analysis'];
 const validation=SpreadsheetApp.newDataValidation().requireValueInList(['Pending','Approved','Revise'],true).setAllowInvalid(false).build();
 sheet.getRange(2,headers.indexOf('Guide Approval')+1,sheet.getMaxRows()-1,1).setDataValidation(validation);
 ['SoAI-092','LA7187','SoAI-424'].forEach(id=>{
  const name=id+' Results',s=spreadsheet().getSheetByName(name)||spreadsheet().insertSheet(name);
  if(s.getMaxColumns()<headers.length)s.insertColumnsAfter(s.getMaxColumns(),headers.length-s.getMaxColumns());
  s.getRange(1,1,1,headers.length).setValues([headers]).setBackground('#b0322c').setFontColor('#ffffff').setFontWeight('bold').setWrap(true);
  s.getRange('A2').setFormula('=IFERROR(FILTER(\'Result Analysis\'!A2:AL,\'Result Analysis\'!B2:B="'+id+'"),"")');
  s.setFrozenRows(1);s.setRowHeight(1,48);s.setColumnWidths(1,headers.length,190);
 });
 if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='captureResultGuideEdit'))ScriptApp.newTrigger('captureResultGuideEdit').forSpreadsheet(spreadsheet()).onEdit().create();
}
function resultHistory(row,event,actor){
 spreadsheet().getSheetByName('Result History').appendRow([new Date().toISOString(),row['Project ID'],row['Record ID'],row.Revision,event,safeCell(actor||''),JSON.stringify(row)]);
}
function captureResultGuideEdit(e){
 if(!e||!e.range||e.range.getSheet().getName()!=='Result Analysis'||e.range.getLastRow()<2)return;
 const s=e.range.getSheet(),headers=s.getRange(1,1,1,s.getLastColumn()).getValues()[0],watched=['Guide Approval','Guide Feedback','Guide Reviewer'];
 if(!headers.slice(e.range.getColumn()-1,e.range.getLastColumn()).some(h=>watched.includes(h)))return;
 const lock=LockService.getScriptLock();if(!lock.tryLock(25000))throw new Error('Guide history is busy. Retry the guide edit.');
 try{
  for(let n=Math.max(2,e.range.getRow());n<=e.range.getLastRow();n++){
   const values=s.getRange(n,1,1,headers.length).getValues()[0],row=Object.fromEntries(headers.map((h,i)=>[h,values[i]]));if(!row['Record ID'])continue;
   row['Reviewed At']=new Date().toISOString();s.getRange(n,headers.indexOf('Reviewed At')+1).setValue(row['Reviewed At']);
   resultHistory(row,'Guide edit',row['Guide Reviewer']||'Guide');
  }
 }finally{lock.releaseLock();}
}
function validatedResultMetrics(value,strict){
 let list;try{list=JSON.parse(value||'[]');}catch{throw new Error('Metric comparisons are unreadable. Reopen this record.');}
 if(!Array.isArray(list)||list.length>40)throw new Error('Use at most 40 metric comparisons per evidence record.');
 return list.map(m=>{
  if(!strict)return Object.fromEntries(['metric','unit','scenario','baselineName','direction','baseline','proposed','uncertainty'].map(k=>[k,String(m[k]??'')]));
  requireFields(m,['metric','unit','scenario','baselineName','direction']);
  if(!['Higher is better','Lower is better'].includes(m.direction))throw new Error('Choose the metric direction.');
  if(m.baseline===''||m.proposed===''||m.baseline==null||m.proposed==null||!Number.isFinite(Number(m.baseline))||!Number.isFinite(Number(m.proposed)))throw new Error('Enter numeric baseline and proposed values, or remove the unfinished metric comparison.');
  return {metric:String(m.metric),unit:String(m.unit),scenario:String(m.scenario),baselineName:String(m.baselineName),direction:m.direction,baseline:Number(m.baseline),proposed:Number(m.proposed),uncertainty:String(m.uncertainty||'')};
 });
}
function saveResultRecord(projectId,p){
 requireFields(p,['recordType','title','workStatus']);
 const types=['Experiment Evidence','Individual Analysis','Final Team Synthesis'];
 if(!types.includes(p.recordType)||!['In progress','Submitted'].includes(p.workStatus))throw new Error('Choose a valid result type and status.');
 const rows=records('Result Analysis'),previous=rows.find(r=>String(r['Record ID'])===p.id),teamRows=rows.filter(r=>r['Project ID']===projectId);
 if(previous&&previous['Project ID']!==projectId)throw new Error('Record belongs to another team.');
 if(previous&&(previous.Owner!==p.owner||previous['Record Type']!==p.recordType))throw new Error('A saved result keeps its student and record type. Open the correct record.');
 if(p.recordType!=='Experiment Evidence'&&teamRows.some(r=>r['Record ID']!==p.id&&r['Record Type']===p.recordType&&(p.recordType==='Final Team Synthesis'||r.Owner===p.owner)))throw new Error('This analysis already exists. Open and revise the existing record.');
 const experiment=p.recordType==='Experiment Evidence',submitted=p.workStatus==='Submitted';
 if(experiment&&(!['Pilot','Final'].includes(p.stage)||!['Measured results','Failed or blocked'].includes(p.execution)))throw new Error('Choose the experiment stage and outcome.');
 const method=selectProject('Methodology',projectId).find(r=>r['Record ID']===p.methodologyId&&r['Submission Type']==='Final Team Version');
 if(p.methodologyId&&!method)throw new Error('Choose a final methodology from this team.');
 if(submitted&&(!method||method['Final Team Approval']!=='Approved'))throw new Error('An approved Final Team Version of the methodology is required. Save In progress until it is approved.');
 const setup=selectProject('Project Setup',projectId)[0];
 if(submitted&&(!setup||setup['Setup Status']!=='Ready for guide review'))throw new Error('Complete Step 7 and mark the reproducible workspace Ready for guide review before submitting result analysis.');
 if(p.evidenceUrl)requireUrl(p.evidenceUrl);if(p.codeUrl)requireUrl(p.codeUrl);
 const metrics=experiment?validatedResultMetrics(p.metrics,submitted):[],linkedIds=String(p.linkedIds||'').split(',').map(x=>x.trim()).filter(Boolean),sources={};
 if(method)sources[method['Record ID']]=method.Revision;
 const linked=linkedIds.map(id=>teamRows.find(r=>r['Record ID']===id&&r['Record Type']==='Experiment Evidence'));
 if(linked.some(r=>!r))throw new Error('Choose experiment evidence from this team.');
 if(p.recordType==='Individual Analysis'&&linked.some(r=>r.Owner!==p.owner))throw new Error('Link your own experiment records. Describe collaboration in your contribution.');
 linked.forEach(r=>sources[r['Record ID']]=r.Revision);
 if(submitted){
  requireFields(p,['question','findings','failures','limitations','claimOutcome','evidenceUrl']);
  if(!['Inconclusive','Supported within tested scope','Mixed evidence','Not supported'].includes(p.claimOutcome))throw new Error('Choose what the evidence supports.');
  if(previous&&previous['Guide Approval']==='Revise')requireFields(p,['changes']);
  if(experiment){
   requireFields(p,['dataRecord','controls','protocol','sample','projectData','projectEvaluation','projectValidity']);
   if(p.execution==='Measured results'&&!metrics.length)throw new Error('Add at least one measured comparison, or choose Failed or blocked.');
   if(p.execution==='Failed or blocked'&&p.claimOutcome==='Supported within tested scope')throw new Error('A failed or blocked run cannot support a positive performance claim.');
   if(metrics.some(m=>!m.uncertainty.trim()))throw new Error('For each metric, describe variation/uncertainty or explain why it is unavailable.');
  }else{
   if(!linked.length)throw new Error('Select the experiment evidence supporting this analysis.');
   if(linked.some(r=>r['Work Status']!=='Submitted'||r['Methodology ID']!==p.methodologyId||Number(r['Methodology Revision'])!==Number(method.Revision)))throw new Error('Submit current experiment evidence under this final methodology first.');
   if(p.recordType==='Individual Analysis')requireFields(p,['contribution']);
   else{
    if(p.teamCheck!=='Both members reviewed this synthesis')throw new Error('Both members must review the final synthesis before submission.');
    if(linked.some(r=>r.Stage!=='Final'))throw new Error('The final team synthesis must reference final experiments; keep pilot conclusions in individual analyses.');
    const students=records('Students').filter(r=>r['Project ID']===projectId&&r.Role==='Student').map(r=>r.Name);
    students.forEach(student=>{
     const analysis=teamRows.find(r=>r.Owner===student&&r['Record Type']==='Individual Analysis'&&r['Work Status']==='Submitted'&&r['Methodology ID']===p.methodologyId&&Number(r['Methodology Revision'])===Number(method.Revision));
     if(!analysis)throw new Error(student+' must submit an individual analysis under the final methodology first.');
     let refs;try{refs=JSON.parse(analysis['Source Revisions']||'{}');}catch{throw new Error('Reopen and resubmit '+student+'’s analysis.');}
     if(Object.entries(refs).some(([id,rev])=>{const source=id===method['Record ID']?method:teamRows.find(r=>r['Record ID']===id);return !source||String(source.Revision)!==String(rev);}))throw new Error(student+'’s analysis refers to older evidence. Update it before the team synthesis.');
     sources[analysis['Record ID']]=analysis.Revision;
    });
   }
  }
 }
 const now=new Date().toISOString(),map={question:'Research Question',dataRecord:'Data and Test Set',controls:'Comparison and Controls',protocol:'Protocol and Configuration',sample:'Sample and Repeats',projectData:'Project Data Checks',projectEvaluation:'Project Evaluation Checks',projectValidity:'Project Validity Checks',contribution:'Individual Contribution',findings:'Findings',failures:'Failure Cases',limitations:'Limitations',claimOutcome:'Claim Outcome',evidenceUrl:'Evidence URL',codeUrl:'Code URL',teamCheck:'Team Confirmation',changes:'Changes Since Review'};
 const row={'Record ID':p.id,'Project ID':projectId,'Record Type':p.recordType,'Title':p.title,'Owner':p.owner,'Methodology ID':p.methodologyId||'','Methodology Revision':method?method.Revision:'','Stage':experiment?p.stage:'','Execution Outcome':experiment?p.execution:'','Work Status':p.workStatus,'Linked Experiment IDs':linkedIds.join(', '),'Metric Data':JSON.stringify(metrics),'Source Revisions':JSON.stringify(sources)};
 Object.entries(map).forEach(([k,h])=>row[h]=p[k]||'');
 if(JSON.stringify(row).length>40000)throw new Error('This record is too long. Put detailed outputs in the evidence folder and shorten the explanation.');
 const revision=Number(previous&&previous.Revision||0);
 if(previous&&Object.keys(row).every(k=>String(previous[k]??'')===String(row[k]??'')))return previous;
 if(revision!==Number(p.revision||0))throw new Error('This record changed. Reload shared records and open its latest version.');
 row['Guide Approval']='Pending';row['Guide Feedback']=previous&&previous['Guide Feedback']||'';row['Guide Reviewer']='';row['Reviewed At']='';row['First Saved At']=previous&&previous['First Saved At']||now;row['First Submitted At']=previous&&previous['First Submitted At']||(submitted?now:'');row['Updated At']=now;row.Revision=revision+1;
 if(previous)resultHistory(previous,'Before student revision',p.owner);
 put('Result Analysis','Record ID',p.id,row);
 const measured=metrics.filter(m=>m.metric&&m.unit&&m.scenario&&m.baselineName&&m.baseline!==''&&m.proposed!==''&&Number.isFinite(Number(m.baseline))&&Number.isFinite(Number(m.proposed)));
 if(measured.length){const s=spreadsheet().getSheetByName('Result Metrics'),values=measured.map(m=>{const b=Number(m.baseline),v=Number(m.proposed);return [now,projectId,p.id,row.Revision,safeCell(p.owner),safeCell(m.scenario),safeCell(m.metric),safeCell(m.unit),m.direction,safeCell(m.baselineName),b,v,v-b,b===0?'':(m.direction==='Lower is better'?b-v:v-b)/Math.abs(b)*100,safeCell(m.uncertainty)];});if(s.getLastRow()+values.length>s.getMaxRows())s.insertRowsAfter(s.getMaxRows(),values.length);s.getRange(s.getLastRow()+1,1,values.length,15).setValues(values);}
 resultHistory(row,submitted?'Student submission':'Progress saved',p.owner);
 spreadsheet().getSheetByName('Portal Audit').appendRow([now,projectId,'saveResult',p.id,safeCell(p.owner),row.Revision]);return row;
}
