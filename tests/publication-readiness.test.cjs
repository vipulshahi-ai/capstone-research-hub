const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const data={
 'Publication Readiness':[],
 'Paper Draft Tracker':[],
 Papers:[
  {'Paper ID':'p-1','Project ID':'SoAI-424','Screening Status':'Screened'},
  {'Paper ID':'p-2','Project ID':'SoAI-424','Screening Status':'Screened'},
  {'Paper ID':'p-3','Project ID':'SoAI-424','Screening Status':'Screened'}
 ],
 Students:[{Name:'Aman Kaushal','Project ID':'SoAI-424',Role:'Student'},{Name:'Vedant Kasaudhan','Project ID':'SoAI-424',Role:'Student'}]
};
const audit=[];
const ctx=vm.createContext({console});
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','Code.gs'),'utf8'),ctx);
ctx.records=name=>data[name]||[];
ctx.put=(name,key,id,row)=>{const i=data[name].findIndex(r=>r[key]===id);if(i<0)data[name].push({...row});else data[name][i]={...data[name][i],...row};};
ctx.spreadsheet=()=>({getSheetByName:()=>({appendRow:row=>audit.push(row)})});

const publication={
 id:'publication-plan',owner:'Aman Kaushal',status:'Ready for guide review',title:'Timestamp-aware semantic retrieval',keywords:'video learning, retrieval',contribution:'Test semantic segmentation against fixed chunks.',closestPaperIds:'p-1, p-2, p-3',novelty:'Measures segmentation and retrieval separately.',boundaries:'No learning-gain claim without a learner study.',ethics:'Only permitted transcripts and annotations.',dataRecord:'Frozen video list and transcript licences.',codeUrl:'https://github.com/example/repo/commit/test',environment:'Pinned versions, seed 42 and saved configuration.',evidenceUrl:'https://drive.google.com/drive/folders/test',authors:'Aman: implementation; Vedant: annotation and evaluation.',venuePlan:'Shortlist after results.'
};
const saved=ctx.saveRecord('SoAI-424','savePublication',publication);
assert.equal(saved['Guide Approval'],'Pending');
assert.equal(saved['Novelty Check'],'Not checked');
assert.equal(saved['Reproducibility Check'],'Not checked');
assert.ok(saved['First Submitted At']);
assert.throws(()=>ctx.saveRecord('SoAI-424','savePublication',{...publication,id:'duplicate-plan'}),/already has/i);
assert.throws(()=>ctx.saveRecord('SoAI-424','savePublication',{...publication,revision:1,closestPaperIds:'p-1, p-2'}),/at least three/i);

const draft={id:'draft-intro',owner:'Vedant Kasaudhan',section:'Introduction and problem',workStatus:'Ready for guide review',documentUrl:'https://drive.google.com/document/d/test',evidenceUrl:'https://drive.google.com/drive/folders/test',summary:'Problem and contribution are linked to the approved evidence.'};
assert.equal(ctx.saveRecord('SoAI-424','saveDraft',draft)['Paper Section'],'Introduction and problem');
assert.throws(()=>ctx.saveRecord('SoAI-424','saveDraft',{...draft,id:'duplicate-section'}),/already has/i);

console.log('Publication readiness and paper-draft validation passed.');
