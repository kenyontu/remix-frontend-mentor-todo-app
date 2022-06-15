/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  serverBuildTarget: 'netlify',
  server: './server.js',
  ignoredRouteFiles: ['**/.*'],
  devServerPort: 8002,
  // appDirectory: "app",
  // assetsBuildDirectory: "public/build",
  // serverBuildPath: ".netlify/functions-internal/server.js",
  // publicPath: "/build/",
  serverDependenciesToBundle: [
    'react-dnd',
    'react-dnd-html5-backend',
    'dnd-core',
    '@react-dnd/invariant',
    '@react-dnd/shallowequal',
    '@react-dnd/asap',
    'nanoid',
  ],
}
