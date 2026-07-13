import assert from 'node:assert/strict';
import { getSagittalBoundaryEntry } from '../js/calc/sagittal-outputs.js';

const extreme = getSagittalBoundaryEntry(0.2, 'extreme');
assert.equal(extreme.symbol, '`|');
assert.equal(extreme.key, 1);

const high = getSagittalBoundaryEntry(3.5, 'high');
assert.equal(high.symbol, '~|');
assert.equal(high.key, 18);

const ultra = getSagittalBoundaryEntry(7.5, 'ultra');
assert.equal(ultra.symbol, '~~|');
assert.equal(ultra.key, 36);

const medium = getSagittalBoundaryEntry(26, 'medium');
assert.equal(medium.symbol, '|)');
assert.equal(medium.key, 58);

console.log('sagittal boundary lookup tests passed');
