import { utilities } from 'appium-ios-device';
import IOSDeploy from './ios-deploy';
import log from './logger';
import { SAFARI_BUNDLE_ID } from './app-utils';


async function getConnectedDevices () {
  return await utilities.getConnectedDevices();
}

async function getOSVersion (udid) {
  return await utilities.getOSVersion(udid);
}

async function resetRealDevice (device, opts) {
  const { bundleId, fullReset } = opts;
  if (!bundleId) {
    return;
  }

  if (bundleId === SAFARI_BUNDLE_ID) {
    log.debug('Reset requested. About to terminate Safari');
    await device.terminateApp(bundleId);
    return;
  }

  if (!fullReset) {
    return;
  }

  log.debug(`Reset: fullReset requested. Will try to uninstall the app '${bundleId}'.`);
  if (!await device.isAppInstalled(bundleId)) {
    log.debug('Reset: app not installed. No need to uninstall');
    return;
  }
  try {
    await device.remove(bundleId);
  } catch (err) {
    log.error(`Reset: could not remove '${bundleId}' from device: ${err.message}`);
    throw err;
  }
  log.debug(`Reset: removed '${bundleId}'`);
}

async function runRealDeviceReset (device, opts) {
  if (!opts.noReset || opts.fullReset) {
    log.debug('Reset: running ios real device reset flow');
    if (!opts.noReset) {
      await resetRealDevice(device, opts);
    }
  } else {
    log.debug('Reset: fullReset not set. Leaving as is');
  }
}

/**
 * @typedef {Object} InstallOptions
 *
 * @property {boolean} [skipUninstall] Whether to skip app uninstall before installing it
 * @property {'serial'|'parallel'|'ios-deploy'} [strategy='serial'] One of possible install strategies ('serial', 'parallel', 'ios-deploy')
 * @property {number} [timeout] App install timeout
 */

/**
 * @param {IOSDeploy} device The device instance
 * @param {string} [app] The app to the path
 * @param {string} [bundleId] The bundle id to ensure it is already installed and uninstall it
 * @param {InstallOptions} [opts]
 */
async function installToRealDevice (device, app, bundleId, opts) {
  if (!device.udid || !app) {
    log.debug('No device id or app, not installing to real device.');
    return;
  }

  const {
    skipUninstall,
    strategy,
    timeout,
  } = opts ?? {};

  if (!skipUninstall && bundleId && await device.isAppInstalled(bundleId)) {
    log.debug(`Reset requested. Removing app with id '${bundleId}' from the device`);
    await device.remove(bundleId);
  }
  log.debug(`Installing '${app}' on device with UUID '${device.udid}'...`);
  await device.install(app, timeout, strategy);
  log.debug('The app has been installed successfully.');
}

function getRealDeviceObj (udid) {
  log.debug(`Creating iDevice object with udid '${udid}'`);
  return new IOSDeploy(udid);
}

export { getConnectedDevices, getOSVersion, runRealDeviceReset, installToRealDevice,
  getRealDeviceObj };
