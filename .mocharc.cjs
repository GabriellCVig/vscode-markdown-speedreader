process.env.TS_NODE_PROJECT = 'tsconfig.unit.json';
process.env.TS_NODE_TRANSPILE_ONLY = 'true';

module.exports = {
	spec: ['src/unit/**/*.test.ts'],
	require: ['ts-node/register'],
	timeout: 5000
};
