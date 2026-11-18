const fs = require('fs');
const path = require('path');
const crypto = require('crypto').webcrypto;

// Mock Window & DOM Environment
class MockElement {
  constructor(id) {
    this.id = id;
    this.value = '';
    this.innerText = '';
    this.innerHTML = '';
    this.className = '';
    this.style = { display: 'block', transform: '' };
    this.disabled = false;
    this.children = [];
    this.listeners = {};
    this.checked = false;
  }

  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  click() {
    if (this.listeners['click']) {
      this.listeners['click'].forEach(fn => fn({ target: this }));
    }
  }

  change(val) {
    this.checked = val;
    if (this.listeners['change']) {
      this.listeners['change'].forEach(fn => fn({ target: this }));
    }
  }

  classList = {
    add: (c) => { if (!this.className.includes(c)) this.className += ' ' + c; },
    remove: (c) => { this.className = this.className.replace(new RegExp('\\b' + c + '\\b', 'g'), '').trim(); },
    contains: (c) => this.className.includes(c)
  };

  setAttribute(k, v) { this[k] = v; }
  getAttribute(k) { return this[k]; }
  getBoundingClientRect() { return { left: 0, top: 0, right: 100, bottom: 50, width: 100, height: 50 }; }
  getTotalLength() { return 200; }
  getPointAtLength(l) { return { x: l, y: 50 }; }
  insertBefore(child) { this.children.unshift(child); }
  appendChild(child) { this.children.push(child); }
}

const domElements = {};
function getOrCreateEl(id) {
  if (!domElements[id]) domElements[id] = new MockElement(id);
  return domElements[id];
}

global.window = global;
global.window.crypto = crypto;
global.window.addEventListener = () => {};
global.performance = { now: () => Date.now() };
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);

global.document = {
  getElementById: (id) => getOrCreateEl(id),
  querySelectorAll: () => [],
  addEventListener: () => {},
  createElement: (tag) => new MockElement(tag)
};

const baseDir = 'C:\\Users\\NIKITA SHARAD PAWAR\\.gemini\\antigravity\\scratch\\mitm-attack-simulator\\js\\';

eval(fs.readFileSync(baseDir + 'crypto-manager.js', 'utf8'));
eval(fs.readFileSync(baseDir + 'state-machine.js', 'utf8'));
eval(fs.readFileSync(baseDir + 'animation-engine.js', 'utf8'));
eval(fs.readFileSync(baseDir + 'simulator-controller.js', 'utf8'));
eval(fs.readFileSync(baseDir + 'evaluation-tests.js', 'utf8'));

async function runTestSuite() {
  console.log('>>> Initializing Simulator Controller...');
  await window.simulatorController.init();
  window.evaluationTestRunner.init();

  console.log('\n--- EXECUTING TEST 1: Normal MITM Attack ---');
  const t1 = await window.evaluationTestRunner.runTest1();
  console.log('Test 1 Result:', t1 ? 'PASS' : 'FAIL');

  console.log('\n--- EXECUTING TEST 2: No Modification Attack ---');
  const t2 = await window.evaluationTestRunner.runTest2();
  console.log('Test 2 Result:', t2 ? 'PASS' : 'FAIL');

  console.log('\n--- EXECUTING TEST 3: Secure Communication (Tamper Detection) ---');
  const t3 = await window.evaluationTestRunner.runTest3();
  console.log('Test 3 Result:', t3 ? 'PASS' : 'FAIL');

  console.log('\n--- EXECUTING TEST 4: Reset Verification ---');
  const t4 = await window.evaluationTestRunner.runTest4();
  console.log('Test 4 Result:', t4 ? 'PASS' : 'FAIL');

  console.log('\n=======================================');
  console.log('FINAL EVALUATION SUITE RESULT:');
  console.log(`TEST 1 (Normal Attack):        ${t1 ? 'PASS [EXCELLENT]' : 'FAIL'}`);
  console.log(`TEST 2 (No Modification):      ${t2 ? 'PASS [EXCELLENT]' : 'FAIL'}`);
  console.log(`TEST 3 (AES-GCM Auth Failure): ${t3 ? 'PASS [EXCELLENT]' : 'FAIL'}`);
  console.log(`TEST 4 (Full System Reset):    ${t4 ? 'PASS [EXCELLENT]' : 'FAIL'}`);
  console.log('=======================================');

  if (t1 && t2 && t3 && t4) {
    console.log('>>> ALL 4 COLLEGE EVALUATION TESTS PASSED PERFECTLY! <<<');
    process.exit(0);
  } else {
    console.error('>>> SOME TESTS FAILED <<<');
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
