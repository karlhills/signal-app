const path = require('node:path');
const { execFileSync } = require('node:child_process');

module.exports = async function afterSign(context) {
  if (process.platform !== 'darwin') {
    return;
  }

  const appOutDir = context.appOutDir;
  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);
  const helperPath = path.join(
    appPath,
    'Contents',
    'Resources',
    'app.asar.unpacked',
    'node_modules',
    'active-win',
    'main'
  );

  execFileSync('codesign', ['--force', '--sign', '-', '--identifier', 'com.signal.app', helperPath], {
    stdio: 'inherit'
  });
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' });
};
