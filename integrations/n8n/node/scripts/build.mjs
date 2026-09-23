import { readdir, readFile, writeFile, rename, stat, mkdir, cp } from 'node:fs/promises';
import { join, basename, extname, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import fastGlob from 'fast-glob';

console.log('🔨 [1/5] Compiling TypeScript...');
execSync('npx tsc -p tsconfig.json', { stdio: 'inherit' });

console.log('🖼️  [2/5] Copying static files...');
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
		} else if (file.endsWith('.js') || file.endsWith('.d.ts')) {
			let content = await readFile(fullPath, 'utf8');

			// Rewrite local imports/requires to point at the renamed PascalCase files
			content = content.replace(/((?:require\(|from\s+)['"]\.\.?\/)([^'"]+)(['"]\)?)/g, (match, prefix, importPath, suffix) => {
				const pathParts = importPath.split('/');
				const newPath = pathParts.map((part) => toPascalCase(part)).join('/');
				return `${prefix}${newPath}${suffix}`;
			});

			await writeFile(fullPath, content, 'utf8');

			// Rename file (e.g. 'featurebase-trigger.node.js' -> 'FeaturebaseTrigger.node.js')
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

console.log('🔄 [3/5] Normalizing n8n PascalCase conventions...');
await walkAndProcess(join(process.cwd(), 'dist'));

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
