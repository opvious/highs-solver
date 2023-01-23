import * as sut from '../src/common';

describe('sparse row', () => {
  test.each([
    [
      [2, 0, 3],
      undefined,
      {indices: new Int32Array([0, 2]), values: new Float64Array([2, 3])},
    ],
    [
      [0, 0],
      undefined,
      {indices: new Int32Array(), values: new Float64Array()},
    ],
    [
      [1, 10, 0],
      [5, 2, 7],
      {indices: new Int32Array([5, 2]), values: new Float64Array([1, 10])},
    ],
  ])('(%j, %j) => %j', (vals, ixs, want) => {
    expect(sut.sparseRow(vals, ixs)).toEqual(want);
  });
});
