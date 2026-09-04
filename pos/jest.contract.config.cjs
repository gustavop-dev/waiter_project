// Contract tests: run against the real Odoo from the compose. Node env, same transform as unit tests.
const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
module.exports = createJestConfig({
  testEnvironment: 'node',
  testMatch: ['<rootDir>/**/__contract__/**/*.contract.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testTimeout: 30_000,
});
