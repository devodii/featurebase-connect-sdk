/** @type {import('jest').Config} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: ['**/*.test.ts'],
	// node/ is a separate, npm-only package (the published n8n node) with its own jest config.
	testPathIgnorePatterns: ['/node_modules/', '<rootDir>/node/'],
	passWithNoTests: true,
	// marked only ships an ESM build with no "require" export condition, so point jest's
	// CommonJS runtime at its UMD build instead of trying (and failing) to transform ESM.
	moduleNameMapper: {
		'^marked$': '<rootDir>/../../packages/core/node_modules/marked/lib/marked.umd.js',
	},
};
