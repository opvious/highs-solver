import {readFile} from 'fs/promises';
import path from 'path';
import {withFile} from 'tmp-promise';
import {AsyncOrSync} from 'ts-essentials';
import util from 'util';

import * as sut from '../';

test('vendor version', () => {
  expect(sut.solverVersion()).toMatch(/v.+/);
});

describe('solver', () => {
  describe('sets and gets option', () => {
    const solver = new sut.Solver();
    test.each([
      ['time_limit', 123],
      ['ranging', 'on'],
      ['run_crossover', 'choose'],
      ['random_seed', 1234],
      ['mip_rel_gap', 0.1],
    ])('%s', (name, val) => {
      solver.setOption(name, val);
      expect(solver.getOption(name)).toEqual(val);
    });
  });

  test('handles no model case', async () => {
    await withSolver(async (solver) => {
      expect(solver.getModelStatus()).toEqual(0);
      expect(solver.getInfo()).toMatchObject({
        basis_validity: 0,
      });
      expect(solver.getSolution()).toMatchObject({
        isValueValid: false,
        isDualValid: false,
      });
    });
  });

  test('solves from object', async () => {
    await withSolver(async (solver) => {
      solver.passModel({
        columnCount: 1,
        rowCount: 1,
        isMaximization: true,
        offset: 0,
        columnLowerBounds: new Float64Array([0]),
        columnUpperBounds: new Float64Array([2]),
        rowLowerBounds: new Float64Array([0]),
        rowUpperBounds: new Float64Array([1]),
        costs: new Float64Array([1]),
        matrix: {
          isColumnOriented: false,
          starts: new Int32Array([0]),
          indices: new Int32Array([0]),
          values: new Float64Array([1]),
        },
        integrality: new Int32Array([]),
      });
      await p(solver, 'run');
      expect(solver.getModelStatus()).toEqual(7); // Optimal
      expect(solver.getInfo()).toMatchObject({
        basis_validity: 1,
        primal_solution_status: 2, // Feasible
        dual_solution_status: 2, // Feasible
        objective_function_value: 1,
      });
      expect(cloneSolution(solver.getSolution())).toEqual({
        isValueValid: true,
        isDualValid: true,
        columnValues: new Float64Array([1]),
        columnDualValues: new Float64Array([-0]),
        rowValues: new Float64Array([1]),
        rowDualValues: new Float64Array([1]),
      });
    });
  });

  test('solves reading LP file', async () => {
    await withSolver(async (solver) => {
      await p(solver, 'readModel', resourcePath('simple.lp'));
      await p(solver, 'run');
      const sol = solver.getSolution();
      expect(cloneSolution(sol)).toEqual({
        isValueValid: true,
        isDualValid: true,
        columnValues: new Float64Array([17.5, 1, 16.5, 2]),
        columnDualValues: new Float64Array([-0, -0, -0, -8.75]),
        rowValues: new Float64Array([20, 30, 0]),
        rowDualValues: new Float64Array([1.5, 2.5, 10.5]),
      });
    });
  });

  test('solves reading MPS file', async () => {
    await withSolver(async (solver) => {
      await p(solver, 'readModel', resourcePath('unbounded.mps'));
      await p(solver, 'run');
      expect(solver.getModelStatus()).toEqual(10); // Unbounded
      await withFile(async (res) => {
        await p(solver, 'writeSolution', res.path, 0);
        const sol = await readFile(res.path, 'utf8');
        expect(sol).toContain('Unbounded');
      });
    });
  });

  test('throws reading missing file', async () => {
    await withSolver(async (solver) => {
      try {
        await p(solver, 'readModel', resourcePath('missing.mps'));
        fail();
      } catch (err) {
        expect(err.message).toMatch(/Read model failed/);
      }
    });
  });

  test('clears solution', async () => {
    await withSolver(async (solver) => {
      await p(solver, 'readModel', resourcePath('simple.lp'));
      await p(solver, 'run');
      expect(solver.getSolution()).toMatchObject({
        isValueValid: true,
        isDualValid: true,
      });
      solver.clearSolver();
      expect(solver.getSolution()).toMatchObject({
        isValueValid: false,
        isDualValid: false,
      });
    });
  });

  test('writes model', async () => {
    await withSolver(async (solver) => {
      await p(solver, 'readModel', resourcePath('simple.lp'));
      await withFile(async (res) => {
        await p(solver, 'writeModel', res.path);
        const data = await readFile(res.path, 'utf8');
        expect(data).toContain('c1');
      }, {postfix: '.mps'});
    });
  });
});

function cloneSolution(sol: sut.Solution): sut.Solution {
  return {
    ...sol,
    columnValues: new Float64Array(sol.columnValues),
    columnDualValues: new Float64Array(sol.columnDualValues),
    rowValues: new Float64Array(sol.rowValues),
    rowDualValues: new Float64Array(sol.rowDualValues),
  };
}

function withSolver(
  fn: (solver: sut.Solver) => AsyncOrSync<void>
): Promise<void> {
  return withFile(async (res) => {
    const solver = new sut.Solver();
    solver.setOption('log_file', res.path);
    solver.setOption('log_to_console', false);
    await fn(solver);
  });
}

/** Executes a callback-based async method and returns a matching promise. */
function p<M extends keyof sut.Solver>(
  solver: sut.Solver,
  method: M,
  ...args: sut.Solver[M] extends (
    ...args: [...infer A, (err: Error) => void]
  ) => void
    ? A
    : never
): Promise<void> {
  return util.promisify(solver[method]).bind(solver)(...args);
}

function resourcePath(fn: string): string {
  return path.join(__dirname, 'resources', fn);
}

function fail(): void {
  throw new Error('Unexpected call');
}
