/** @type {import('jest').Config} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/nodes', '<rootDir>/credentials', '<rootDir>/test'],
	testMatch: ['**/*.test.ts'],
	collectCoverageFrom: ['nodes/**/*.ts', '!nodes/**/*.d.ts'],
	transform: {
		'^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
	},
};
