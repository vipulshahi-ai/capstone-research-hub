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
  assert.equal((html.match(/<details\b/g) || []).length, 14, `${teamId}: seven sections and seven cards`);
  assert.equal((html.match(/data-edit=/g) || []).length, 7, `${teamId}: every card remains editable`);
  assert.doesNotMatch(html, /<table\b/i, `${teamId}: no tabular record views`);
  assert.match(html, /Scholar search/);
  assert.match(html, /Open DOI \/ publisher source/);
  assert.match(html, /Discussion and feedback/);
  assert.match(html, /traffic &lt;script&gt;/, `${teamId}: student text is escaped`);
  assert.doesNotMatch(html, /href="javascript:/, `${teamId}: unsafe links are not opened`);
}

console.log('Expandable record views passed for all three teams.');
