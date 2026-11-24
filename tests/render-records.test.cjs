const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');

const source = fs.readFileSync(path.join(__dirname, '..', 'research.js'), 'utf8');

function loadPortal() {
  const elements = new Map();
  const element = key => {
    if (!elements.has(key)) elements.set(key, { innerHTML: '', textContent: '', value: '', hidden: false, className: '' });
    return elements.get(key);
  };
  const context = vm.createContext({
    window: { CAPSTONE_CONFIG: {} },
    document: { querySelector: element, querySelectorAll: () => [] },
    localStorage: { getItem: () => null },
    sessionStorage: { getItem: () => null },
    crypto: { randomUUID },
    URL,
    Date,
    console,
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','results.js'),'utf8'), context, { filename:'results.js' });
  vm.runInContext(source, context, { filename: 'research.js' });
  return { context, element };
}

for (const teamId of ['SoAI-092', 'LA7187', 'SoAI-424']) {
  const { context, element } = loadPortal();
  context.testTeamId = teamId;
  context.testData = {
    problems: [{ 'Research Question': 'How?', Owner: 'Student', 'Guide Approval': 'Pending' }],
    searches: [{ Query: 'traffic <script>alert(1)</script>', 'Search Date': '2026-10-15', 'Search URL': 'https://scholar.google.com/scholar?q=traffic', Notes: 'Filter journals', Owner: 'Student' }],
    papers: [{ 'Paper ID': 'paper-1', Title: 'A screened paper', Authors: 'A. Author', Year: 2025, Type: 'Journal', Venue: 'Test Journal', 'Screening Status': 'Screened', 'DOI or Legal Link': 'https://doi.org/10.1234/test', 'Drive Link': 'javascript:alert(1)', Owner: 'Student' }],
    reviews: [{ 'Paper ID': 'paper-1', 'Review Status': 'Complete', 'Guide Approval': 'Approved' }],
    gaps: [{ 'Research Gap': 'A test gap', Owner: 'Student', 'Guide Approval': 'Pending' }],
    methodologies: [{ 'Method Scope': 'A test plan', Owner: 'Student', 'Guide Approval': 'Pending' }],
    interactions: [{ Date: '2026-10-15', Mode: 'Offline', Participants: 'Student, Guide', Feedback: 'Discussed the plan', 'Action Items': 'Revise scope' }],
  };
  vm.runInContext('team = teams.find(item => item.id === testTeamId); shared = testData; renderRecords();', context);
  const html = element('#records').innerHTML;
  assert.equal((html.match(/<details\b/g) || []).length, 18, `${teamId}: eleven sections and seven existing cards`);
  assert.equal((html.match(/data-edit=/g) || []).length, 7, `${teamId}: every card remains editable`);
  assert.doesNotMatch(html, /<table\b/i, `${teamId}: no tabular record views`);
  assert.match(html, /Scholar search/);
  assert.match(html, /Open DOI \/ publisher source/);
  assert.match(html, /Discussion and feedback/);
  assert.match(html, /traffic &lt;script&gt;/, `${teamId}: student text is escaped`);
  assert.doesNotMatch(html, /href="javascript:/, `${teamId}: unsafe links are not opened`);
}

console.log('Expandable record views passed for all three teams.');

{
  const { context, element } = loadPortal();
  const original = { documentUrl: 'https://docs.google.com/document/d/team-manuscript-123/edit?usp=sharing', summary: 'Current draft' };
  const payload = context.manuscriptPayload('saveDraft', original);
  assert.equal(payload.documentUrl, 'https://drive.google.com/file/d/team-manuscript-123/view');
  assert.equal(original.documentUrl, 'https://docs.google.com/document/d/team-manuscript-123/edit?usp=sharing', 'Keep the student draft link unchanged');
  assert.equal(context.manuscriptPayload('saveSetup', original), original, 'Do not change links in other forms');
  assert.equal(context.manuscriptPayload('saveDraft', { documentUrl: 'https://docs.google.com/document/u/1/d/team-manuscript-123/edit' }).documentUrl, payload.documentUrl);

  const backend = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8'), backend);
  assert.doesNotThrow(() => backend.requireUrl(payload.documentUrl, true), 'The existing deployed save handler accepts the shared Google Doc resource');
  for (const link of ['https://docs.google.com.evil.example/document/d/id/edit', 'http://docs.google.com/document/d/id/edit', 'https://example.com/document/d/id/edit']) {
    assert.throws(() => backend.requireUrl(context.manuscriptPayload('saveDraft', { documentUrl: link }).documentUrl, true));
  }

  context.manuscriptUrl = payload.documentUrl;
  vm.runInContext("shared.drafts = [{'Document URL': manuscriptUrl}]; renderForm('draft', {id:'next-section', section:'Related work', owner:'Aman Kaushal'});", context);
  assert.match(element('#research-form').innerHTML, /Shared team manuscript link/);
  assert.match(element('#research-form').innerHTML, /team-manuscript-123\/view/, 'Reuse the team document for a new section');
  assert.match(element('#methodology-guidance').innerHTML, /IEEE journal templates/);
  assert.match(element('#methodology-guidance').innerHTML, /Science Citation Index Expanded/);
}

{
  const { context, element } = loadPortal();
  context.testData = {
    problems: [], searches: [], papers: [], reviews: [], gaps: [], interactions: [],
    methodologies: [
      { 'Record ID': 'draft-1', 'Method Scope': 'Student draft', Owner: 'Aman Kaushal', 'Guide Approval': 'Approved' },
      { 'Record ID': 'final-1', 'Method Scope': 'Agreed team method', Owner: 'Vedant Kasaudhan', 'Submission Type': 'Final Team Version', 'Team Contributors': 'Aman Kaushal, Vedant Kasaudhan', 'Source Draft IDs': 'draft-1, draft-2', 'Guide Approval': 'Approved', 'Final Team Approval': 'Pending' },
    ],
  };
  vm.runInContext('shared = testData; connected = true; renderRecords(); updateProgress();', context);
  assert.match(element('#records').innerHTML, /Final team version/);
  assert.match(element('#records').innerHTML, /Awaiting guide review/);
  assert.match(element('#metrics').innerHTML, /Final team version awaiting guide/);
  context.testData.methodologies[1]['Final Team Approval'] = 'Approved';
  vm.runInContext('renderRecords(); updateProgress();', context);
  assert.match(element('#records').innerHTML, /This is the approved method for team implementation/);
  assert.match(element('#metrics').innerHTML, /Final team version approved/);
}
