import {assert} from '@opvious/stl-errors';
import {range} from '@opvious/stl-utils';

export enum SolutionStatus {
  NO_SOLUTION = 0,
  INFEASIBLE,
  FEASIBLE,
}

export interface Model {
  readonly objective?: Objective;
  readonly variables: ReadonlyArray<Variable>;
  readonly constraints: ReadonlyArray<Constraint>;
}

export interface Objective {
  readonly isMaximization: boolean;
  readonly weights: SparseRow;
  readonly offset?: number;
}

export interface Variable {
  /** Defaults to false. */
  readonly type: VariableType;

  /** Defaults to -infinity. */
  readonly lowerBound?: number;

  /** Defaults to +infinity. */
  readonly upperBound?: number;
}

// https://github.com/ERGO-Code/HiGHS/blob/master/src/lp_data/HConst.h#L87
export enum VariableType {
  CONTINUOUS = 0,
  INTEGER,
  SEMI_CONTINUOUS,
  SEMI_INTEGER,
  IMPLICIT_INTEGER,
}

export interface Constraint {
  readonly weights: SparseRow;

  /** Defaults to -infinity. */
  readonly lowerBound?: number;

  /** Defaults to +infinity. */
  readonly upperBound?: number;
}

export interface SparseRow {
  readonly indices: Int32Array;
  readonly values: Float64Array;
}

export function sparseRow(
  values: Iterable<number>,
  indices?: ReadonlyArray<number>
): SparseRow {
  let size = 0;
  for (const val of values) {
    if (val !== 0) {
      size++;
    }
  }
  const vixs = new Int32Array(size);
  const vals = new Float64Array(size);
  let ix = 0;
  let vix = 0;
  for (const val of values) {
    if (val !== 0) {
      vixs[vix] = indices?.[ix] ?? ix;
      vals[vix] = val;
      vix++;
    }
    ix++;
  }
  return {indices: vixs, values: vals};
}

export interface Solution {
  readonly primal: SolutionValues;
  readonly dual?: SolutionValues;
}

export interface SolutionValues {
  readonly variables: SparseRow;
  readonly constraints: SparseRow;
}
