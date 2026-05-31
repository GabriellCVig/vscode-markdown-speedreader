import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: 'test/browser',
	// Match only .ts specs so any stray compiled .js siblings (from an editor
	// tsc watch) aren't collected as duplicate tests.
	testMatch: '**/*.spec.ts',
	fullyParallel: true,
	reporter: 'list',
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	]
});
