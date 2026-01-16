const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { appBuilderPath } = require('app-builder-bin');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

function main() {
  const repoRoot = path.resolve(__dirname, '..', '..', '..');
  const assetsDir = path.join(repoRoot, 'assets');
  const iconset = path.join(assetsDir, 'icon.iconset');
  const sourcePng = path.join(assetsDir, 'icon-dots-1024.png');

  run(appBuilderPath, [
    'icon',
    '--input',
    sourcePng,
    '--fallback-input',
    iconset,
    '--format',
    'icns',
    '--out',
    assetsDir,
    '--root',
    repoRoot
  ]);
  run(appBuilderPath, [
    'icon',
    '--input',
    sourcePng,
    '--fallback-input',
    iconset,
    '--format',
    'ico',
    '--out',
    assetsDir,
    '--root',
    repoRoot
  ]);

  if (process.platform === 'darwin') {
    run('sips', ['-z', '512', '512', sourcePng, '--out', path.join(assetsDir, 'icon.png')]);
  } else {
    console.warn('[signal] Skipping icon.png regeneration (requires macOS sips).');
  }
}

main();
