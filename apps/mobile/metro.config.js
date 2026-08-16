// Metro debe ver los paquetes del monorepo que están fuera de `apps/mobile`.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Vigila todo el monorepo para recargar cuando cambie `packages/shared`.
config.watchFolders = [workspaceRoot];

// Resuelve dependencias tanto locales como hoisted en la raíz.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
