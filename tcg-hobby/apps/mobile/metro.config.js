const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

function escapeForRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function blockFolder(folderPath) {
  const normalized = escapeForRegExp(folderPath.replace(/\\/g, '/'));
  return new RegExp(`^${normalized}(?:/.*)?$`);
}

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.blockList = exclusionList([
  blockFolder(path.resolve(workspaceRoot, 'apps', 'storefront', '.next')),
  blockFolder(path.resolve(workspaceRoot, 'apps', 'admin', '.next')),
]);

module.exports = config;
