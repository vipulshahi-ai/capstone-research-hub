const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8');
let writes = 0;
const properties = {
  getProperty: name => ({ 'TEAM_SoAI-424': 'student-team-code', GUIDE_READ_CODE: 'test-guide-code' })[name] || null,
};
const lock = { tryLock: () => true, hasLock: () => true, releaseLock: () => {} };
const context = vm.createContext({
  PropertiesService: { getScriptProperties: () => properties },
  LockService: { getScriptLock: () => lock },
  SpreadsheetApp: { flush: () => {} },
  ContentService: {
    MimeType: { JSON: 'application/json' },
    createTextOutput: value => ({ value, setMimeType() { return this; } }),
  },
});
vm.runInContext(source, context, { filename: 'Code.gs' });
context.loadProject = () => ({ papers: [{ Title: 'Visible to guide' }] });
context.saveRecord = () => { writes += 1; return { Revision: 1 }; };

function call(action, accessCode) {
  const response = context.doPost({ postData: { contents: JSON.stringify({ action, projectId: 'SoAI-424', accessCode }) } });
  return JSON.parse(response.value);
}

assert.equal(call('loadProject', 'test-guide-code').readOnly, true);
assert.equal(call('loadProject', 'student-team-code').readOnly, false);
assert.match(call('saveProblem', 'test-guide-code').error, /read-only/i);
assert.equal(writes, 0, 'guide key must not write through any action');
assert.equal(call('saveProblem', 'student-team-code').ok, true);
assert.equal(writes, 1, 'team code retains its original write capability');
assert.equal(call('loadProject', 'wrong-code').ok, false);
console.log('Guide read-only access and team write boundaries passed.');
