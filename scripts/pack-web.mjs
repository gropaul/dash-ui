// Packs the Next static export in out/ into dist-web/dash-web-<version>.zip, a
// drop-on-any-static-host bundle (S3 + CloudFront, GitHub Pages, nginx).
// Run `pnpm build:static`, which builds first and then calls this.
import {execFileSync} from 'child_process';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('out');
const distDir = path.resolve('dist-web');

if (!fs.existsSync(path.join(outDir, 'index.html'))) {
    console.error('No static export found in out/index.html - run `pnpm build` first.');
    process.exit(1);
}

const {version} = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const commit = execFileSync('git', ['rev-parse', '--short', 'HEAD']).toString().trim();
const bundleName = `dash-web-${version}`;
const bundleDir = path.join(distDir, bundleName);

fs.rmSync(distDir, {recursive: true, force: true});
fs.mkdirSync(bundleDir, {recursive: true});

// site/ is what gets uploaded; the README stays outside it so it never lands in the bucket
fs.cpSync(outDir, path.join(bundleDir, 'site'), {
    recursive: true,
    filter: (src) => path.basename(src) !== '.DS_Store',
});

const readme = fs.readFileSync('docs/self-hosting.md', 'utf8');
fs.writeFileSync(
    path.join(bundleDir, 'README.md'),
    `${readme}\n---\n\nBundle: \`${bundleName}\` (commit \`${commit}\`)\n`,
);

try {
    execFileSync('zip', ['-r', '-q', `${bundleName}.zip`, bundleName], {cwd: distDir});
} catch (error) {
    console.error(`Could not create the zip archive (is \`zip\` installed?): ${error.message}`);
    console.error(`The unpacked bundle is still available at dist-web/${bundleName}/`);
    process.exit(1);
}

console.log(`Static bundle written to dist-web/${bundleName}.zip`);
