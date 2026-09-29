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
	// marked only ships an ESM build with no "require" export condition, so point jest's
	// CommonJS runtime at its UMD build instead of trying (and failing) to transform ESM.
	moduleNameMapper: {
		'^marked$': '<rootDir>/node_modules/@featurebase-connect-sdk/core/node_modules/marked/lib/marked.umd.js',
	},
};
