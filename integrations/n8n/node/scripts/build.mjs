import { readdir, readFile, writeFile, rename, stat, mkdir, cp } from 'node:fs/promises';
import { join, basename, extname, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import fastGlob from 'fast-glob';
import * as esbuild from 'esbuild';

console.log('🔎 [1/6] Type-checking...');
execSync('npx tsc -p tsconfig.json --noEmit', { stdio: 'inherit' });

// n8n community node packages cannot declare runtime dependencies (they get bundled
// into the n8n instance itself and can conflict with it or other nodes). So this
// bundles @featurebase-connect-sdk/core and its own deps (zod, marked, html-to-text,
// @zodios/core) directly into each entry file. Only n8n-workflow stays external,
// since n8n's runtime provides it.
console.log('📦 [2/6] Bundling entry points...');
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

console.log('🖼️  [3/6] Copying static files...');
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

// Converts kebab-case to PascalCase
const toPascalCase = (str) =>
	str
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join('');

async function walkAndProcess(dir) {
	const files = await readdir(dir);

	for (const file of files) {
		const fullPath = join(dir, file);
		const fileStat = await stat(fullPath);

		if (fileStat.isDirectory()) {
			// Rename directory if it's kebab-case (e.g., 'featurebase-trigger' -> 'FeaturebaseTrigger')
			const newDirName = toPascalCase(file);
			const newDirPath = join(dir, newDirName);
			if (fullPath !== newDirPath) {
				await rename(fullPath, newDirPath);
				await walkAndProcess(newDirPath);
			} else {
				await walkAndProcess(fullPath);
			}
		} else if (file.endsWith('.js')) {
			// Each entry file is a self-contained esbuild bundle (no local require()
			// calls survive bundling), so only the filename itself needs renaming.
			// e.g. 'featurebase-trigger.node.js' -> 'FeaturebaseTrigger.node.js'
			const [baseName, ...suffixes] = basename(file, extname(file)).split('.');
			const newBaseName = toPascalCase(baseName);
			const newFileName = [newBaseName, ...suffixes].join('.') + extname(file);
			const newPath = join(dir, newFileName);

			if (fullPath !== newPath) {
				await rename(fullPath, newPath);
			}
		}
	}
}

console.log('🔄 [4/6] Normalizing n8n PascalCase conventions...');
await walkAndProcess(join(process.cwd(), 'dist'));

console.log('🔍 [5/6] Auto-discovering nodes and credentials...');
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

console.log('📝 [6/6] Injecting manifest into package.json...');
const pkgPath = join(process.cwd(), 'package.json');
const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));

pkg.n8n = {
	...pkg.n8n,
	nodes,
	credentials,
};

await writeFile(pkgPath, JSON.stringify(pkg, null, '\t') + '\n', 'utf8');
console.log('✅ Build pipeline complete! Discovered:', { nodes: nodes.length, credentials: credentials.length });
