import test from 'node:test';
import assert from 'node:assert/strict';
import {executivePdf} from '../server/executive-pdf.js';
test('executive PDF is well-formed and escapes user-controlled strings',()=>{
 const pdf=executivePdf({organization:{name:'Acme (Test) \\ Security'},generatedAt:'2026-11-09',assets:[],assessments:[],remediations:[]});
 const str=pdf.toString('ascii');
 assert.ok(str.startsWith('%PDF-1.4'));
 assert.ok(str.includes('xref\n0 6\n'));
 assert.ok(str.includes('%%EOF'));
 assert.ok(str.includes('Acme \\(Test\\) \\\\ Security'));
 assert.ok(str.includes('Not assessed'));
});
