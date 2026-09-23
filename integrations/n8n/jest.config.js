/** @type {import('jest').Config} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: ['**/*.test.ts'],
	// node/ is a separate, npm-only package (the published n8n node) with its own jest config.
	testPathIgnorePatterns: ['/node_modules/', '<rootDir>/node/'],
	passWithNoTests: true,
};
