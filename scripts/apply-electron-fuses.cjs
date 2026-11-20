#!/usr/bin/env node
/**
 * electron-builder afterPack hook to flip Electron security fuses
 * on packaged Atrium binaries.
 */

const path = require('path');
const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');

function resolveBinaryPath(context) {
  const { appOutDir, electronPlatformName, packager } = context;
  const productFilename = packager.appInfo.productFilename;

  if (electronPlatformName === 'darwin') {
    return path.join(appOutDir, `${productFilename}.app`);
  }
  if (electronPlatformName === 'win32') {
    return path.join(appOutDir, `${productFilename}.exe`);
  }
  return path.join(appOutDir, packager.executableName || productFilename);
}

module.exports = async function afterPack(context) {
  const { electronPlatformName } = context;
  const binaryPath = resolveBinaryPath(context);
  const supportsEmbeddedAsarIntegrity =
    electronPlatformName === 'win32' || electronPlatformName === 'darwin';

  await flipFuses(binaryPath, {
    version: FuseVersion.V1,
    resetAdHocDarwinSignature: electronPlatformName === 'darwin',
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]:
      supportsEmbeddedAsarIntegrity,
  });

  console.log(
    `[apply-electron-fuses] Hardened Electron fuses on ${binaryPath} (asarIntegrity=${supportsEmbeddedAsarIntegrity})`
  );
};
