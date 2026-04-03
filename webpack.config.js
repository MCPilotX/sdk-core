/**
 * Complete Webpack Configuration - Specifically designed to solve ES module import issues for @mcpilotx/sdk-core
 */

const path = require('path');
const { ProvidePlugin } = require('webpack');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const isDevelopment = !isProduction;
  
  return {
    // ==================== Basic Configuration ====================
    mode: isProduction ? 'production' : 'development',
    
    // Entry files - adjust according to your library
    entry: {
      'mcpilot-sdk': './src/index.ts',           // Main entry
      'mcpilot-sdk.min': './src/index.ts',       // Minified version
    },
    
    // ==================== Output Configuration ====================
    output: {
      path: path.resolve(__dirname, 'dist-webpack'),
      filename: '[name].js',
      
      // Key: Enable ES module output
      module: true,
      library: {
        type: 'module',  // Output as ES module
      },
      
      // Library global variable name (if UMD is needed)
      libraryTarget: 'module',
      
      // Clean old files
      clean: true,
      
      // Public path
      publicPath: '/',
    },
    
    // ==================== Experimental Features ====================
    experiments: {
      outputModule: true,  // Must be enabled: supports ES module output
    },
    
    // ==================== Resolve Configuration ====================
    resolve: {
      // Extension resolution order
      extensions: [
        '.ts', '.tsx',
        '.js', '.jsx',
        '.mjs', '.cjs',
        '.json'
      ],
      
      // Extension aliases - solves .js file misidentification issues
      extensionAlias: {
        '.js': ['.js', '.ts'],
        '.cjs': ['.cjs'],
        '.mjs': ['.mjs'],
      },
      
      // Alias configuration - key: ensures correct SDK path resolution
      alias: {
        // Main alias: points to built files
        '@mcpilotx/sdk-core': path.resolve(__dirname, 'dist/index.js'),
        
        // Or point to source files (during development)
        // '@mcpilotx/sdk-core': path.resolve(__dirname, 'src'),
        
        // Common path aliases
        '@': path.resolve(__dirname, 'src'),
        '@core': path.resolve(__dirname, 'src/core'),
        '@mcp': path.resolve(__dirname, 'src/mcp'),
        '@runtime': path.resolve(__dirname, 'src/runtime'),
        '@ai': path.resolve(__dirname, 'src/ai'),
        '@daemon': path.resolve(__dirname, 'src/daemon'),
      },
      
      // Fallback configuration - handles Node.js core modules
      fallback: {
        "path": require.resolve("path-browserify"),
        "fs": false,           // Don't bundle fs module
        "os": false,           // Don't bundle os module
        "crypto": false,       // Don't bundle crypto module
        "stream": false,       // Don't bundle stream module
        "util": false,         // Don't bundle util module
        "buffer": false,       // Don't bundle buffer module
        "process": false,      // Don't bundle process module
      },
    },
    
    // ==================== Module Rules ====================
    module: {
      rules: [
        // ========== TypeScript Rules ==========
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                // Use project's tsconfig
                configFile: 'tsconfig.json',
                // Only transpile, no type checking (faster builds)
                transpileOnly: isDevelopment,
                // Enable ES modules
                compilerOptions: {
                  module: 'ESNext',
                  moduleResolution: 'bundler',
                  target: 'ES2022',
                  declaration: false,
                  declarationMap: false,
                  sourceMap: isDevelopment,
                },
              },
            },
          ],
        },
        
        // ========== JavaScript Rules ==========
        {
          test: /\.jsx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  modules: false,  // Preserve ES module syntax
                  targets: {
                    esmodules: true,  // Target ES module environments
                  },
                  // Import polyfills as needed
                  useBuiltIns: 'usage',
                  corejs: { version: 3, proposals: true },
                }],
              ],
              plugins: [
                // Add required Babel plugins
                '@babel/plugin-proposal-class-properties',
                '@babel/plugin-proposal-optional-chaining',
                '@babel/plugin-proposal-nullish-coalescing-operator',
              ],
              cacheDirectory: true,  // Enable caching
              cacheCompression: false,
            },
          },
        },
        
        // ========== Special Handling: @mcpilotx/sdk-core Package ==========
        // This is a key rule: ensures SDK package is correctly transformed
        {
          test: /[\\/]node_modules[\\/]@mcpilotx[\\/]sdk-core[\\/]/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  modules: 'commonjs',  // Key: convert ES modules to CommonJS
                  targets: {
                    node: 'current',    // Current Node.js version
                  },
                  // Don't import polyfills (avoid duplication)
                  useBuiltIns: false,
                  corejs: false,
                }],
              ],
              // Only transform syntax, not module system
              plugins: [
                // Ensure export/import syntax is correctly handled
                '@babel/plugin-transform-modules-commonjs',
              ],
            },
          },
        },
        
        // ========== Other File Types ==========
        {
          test: /\.json$/,
          type: 'json',
        },
        
        {
          test: /\.(txt|md)$/,
          type: 'asset/source',
        },
      ],
    },
    
    // ==================== Plugin Configuration ====================
    plugins: [
      // Automatically provide global variables
      new ProvidePlugin({
        // If SDK needs certain global variables, provide them here
        // Buffer: ['buffer', 'Buffer'],
        // process: 'process/browser',
      }),
    ],
    
    // ==================== Optimization Configuration ====================
    optimization: {
      minimize: isProduction,
      
      // Module ID generation strategy
      moduleIds: 'deterministic',
      
      // Runtime chunk
      runtimeChunk: false,
      
      // Code splitting configuration
      splitChunks: false,  // Library projects typically don't need code splitting
      
      // Minimizer configuration
      minimizer: [],
    },
    
    // ==================== Development Tools ====================
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    
    // ==================== Target Environment ====================
    target: 'node',  // Because SDK is primarily for Node.js use
    
    // ==================== External Dependencies ====================
    // Key: avoid bundling certain dependencies, let users install them themselves
    externals: {
      // Node.js core modules
      'fs': 'commonjs fs',
      'path': 'commonjs path',
      'os': 'commonjs os',
      'crypto': 'commonjs crypto',
      'stream': 'commonjs stream',
      'util': 'commonjs util',
      'buffer': 'commonjs buffer',
      'process': 'commonjs process',
      'events': 'commonjs events',
      'child_process': 'commonjs child_process',
      
      // External dependencies
      'dockerode': 'commonjs dockerode',
      'dotenv': 'commonjs dotenv',
      'uuid': 'commonjs uuid',
      'zod': 'commonjs zod',
      
      // Optional dependencies
      '@xenova/transformers': 'commonjs @xenova/transformers',
      'onnxruntime-node': 'commonjs onnxruntime-node',
    },
    
    // ==================== Development Server ====================
    devServer: {
      static: {
        directory: path.join(__dirname, 'public'),
      },
      port: 3000,
      hot: true,
      open: false,
      compress: true,
      historyApiFallback: true,
      client: {
        overlay: {
          errors: true,
          warnings: false,
        },
        progress: true,
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
      },
    },
    
    // ==================== Performance Hints ====================
    performance: {
      hints: isProduction ? 'warning' : false,
      maxAssetSize: 1024 * 1024,      // 1MB
      maxEntrypointSize: 1024 * 1024, // 1MB
    },
    
    // ==================== Statistics ====================
    stats: {
      colors: true,
      modules: false,
      children: false,
      chunks: false,
      chunkModules: false,
      entrypoints: false,
      assets: isDevelopment,
      warningsFilter: /export .* was not found in/,
    },
    
    // ==================== Cache Configuration ====================
    cache: {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
    },
    
    // ==================== Watch Options ====================
    watchOptions: {
      aggregateTimeout: 300,
      poll: 1000,
      ignored: /node_modules/,
    },
  };
};

// ==================== Usage Instructions ====================
/*
How to use this configuration:

1. Install dependencies:
   npm install --save-dev webpack webpack-cli webpack-dev-server
   npm install --save-dev babel-loader @babel/core @babel/preset-env
   npm install --save-dev ts-loader typescript
   npm install --save-dev path-browserify

2. Add to package.json scripts:
   "scripts": {
     "build:webpack": "webpack --config webpack-complete.config.js --mode production",
     "build:webpack:dev": "webpack --config webpack-complete.config.js --mode development",
     "dev:webpack": "webpack serve --config webpack-complete.config.js --mode development"
   }

3. Run build:
   npm run build:webpack

4. Output files:
   dist-webpack/
   ├── mcpilot-sdk.js      # Development version
   ├── mcpilot-sdk.js.map  # Source map
   ├── mcpilot-sdk.min.js  # Production version
   └── mcpilot-sdk.min.js.map

5. Other developers usage:
   // Can import directly
   import { mcpilot } from 'your-package';
   
   // Or use CommonJS
   const { mcpilot } = require('your-package');

Key features:
1. ✅ Outputs ES module format, supports modern import syntax
2. ✅ Special handling for @mcpilotx/sdk-core package, solves ES module issues
3. ✅ Externalizes dependencies, avoids duplicate bundling
4. ✅ Complete development and production configuration
5. ✅ Source map support for easy debugging
6. ✅ Caching and performance optimization
*/
