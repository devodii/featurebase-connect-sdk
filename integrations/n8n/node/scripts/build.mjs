import { readdir, readFile, writeFile, stat, mkdir, cp } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import fastGlob from 'fast-glob';
import * as esbuild from 'esbuild';

console.log('🔎 [1/5] Type-checking...');
execSync('npx tsc -p tsconfig.json --noEmit', { stdio: 'inherit' });

console.log('📦 [2/5] Bundling entry points...');
const entryPoints = await fastGlob('{nodes,credentials}/**/*.{node,credentials}.ts');

await esbuild.build({
	entryPoints,
	outdir: 'dist',
	outbase: '.',
	bundle: true,
	platform: 'node',
	format: 'cjs',
	target: 'es2019',
	external: ['n8n-workflow'],
});

console.log('🖼️  [3/5] Copying static files...');
async function copyStaticFiles() {
	const staticFiles = fastGlob.sync(['**/*.{png,svg}', '**/__schema__/**/*.json'], {
		ignore: ['dist', 'node_modules'],
	});
	return Promise.all(
		staticFiles.map(async (filePath) => {
			const destPath = join('dist', filePath);
			await mkdir(dirname(destPath), { recursive: true });
			return cp(filePath, destPath, { recursive: true });
		}),
	);
}
await copyStaticFiles();

console.log('🔍 [4/5] Auto-discovering nodes and credentials...');
async function discoverN8nFiles(dir, suffix, list = []) {
	const files = await readdir(dir);
	for (const file of files) {
		const fullPath = join(dir, file);
		if ((await stat(fullPath)).isDirectory()) {
			await discoverN8nFiles(fullPath, suffix, list);
		} else if (file.endsWith(suffix)) {
			list.push(fullPath.replace(process.cwd() + '/', ''));
		}
	}
	return list;
}

const distPath = join(process.cwd(), 'dist');
const nodes = await discoverN8nFiles(distPath, '.node.js');
const credentials = await discoverN8nFiles(distPath, '.credentials.js');

console.log('📝 [5/5] Injecting manifest into package.json...');
const pkgPath = join(process.cwd(), 'package.json');
const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));

pkg.n8n = {
	...pkg.n8n,
	nodes,
	credentials,
};

await writeFile(pkgPath, JSON.stringify(pkg, null, '\t') + '\n', 'utf8');
console.log('✅ Build pipeline complete! Discovered:', { nodes: nodes.length, credentials: credentials.length });
