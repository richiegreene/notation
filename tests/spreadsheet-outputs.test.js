import assert from 'node:assert/strict';
import { getSpreadsheetBoundaryEntry } from '../js/calc/spreadsheet-outputs.js';

const extreme = getSpreadsheetBoundaryEntry(0.2, 'extreme');
assert.equal(extreme.symbol, '`|');
assert.equal(extreme.key, 1);

const high = getSpreadsheetBoundaryEntry(3.5, 'high');
assert.equal(high.symbol, '~|');
assert.equal(high.key, 18);

const ultra = getSpreadsheetBoundaryEntry(7.5, 'ultra');
assert.equal(ultra.symbol, '~~|');
assert.equal(ultra.key, 36);

const medium = getSpreadsheetBoundaryEntry(26, 'medium');
assert.equal(medium.symbol, '|)');
assert.equal(medium.key, 58);

console.log('spreadsheet boundary lookup tests passed');
