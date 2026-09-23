/** @type {import('jest').Config} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/nodes', '<rootDir>/credentials'],
	testMatch: ['**/*.test.ts'],
	collectCoverageFrom: ['nodes/**/*.ts', '!nodes/**/*.d.ts'],
	passWithNoTests: true,
	transform: {
		'^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
	},
};
