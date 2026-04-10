#!/usr/bin/env node

/**
 * Project organization utility script
 * For maintaining clean project structure
 */

const fs = require('fs');
const path = require('path');

console.log('=== Project Organization Tool ===\n');

// Check directory structure
const directories = [
  'tests/unit',
  'tests/integration', 
  'tests/e2e',
  'tests/root',
  'scripts/analysis',
  'scripts/build',
  'scripts/utilities',
  'scripts/ci',
  'docs/api',
  'docs/architecture',
  'docs/plans',
  'docs/guides',
  'docs/reports',
  'config',
  'tools'
];

console.log('Checking directory structure...');
directories.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`✓ ${dir}`);
  } else {
    console.log(`✗ ${dir} (not found)`);
  }
});

// Check root directory cleanliness
console.log('\nChecking root directory cleanliness...');
const rootFiles = fs.readdirSync('.');
const allowedRootFiles = [
  '.gitignore', '.env', '.env.example', 'LICENSE', 'README.md',
  'README-intentorch-refactor.md', 'README-dingtalk-workflow.md',
  'package.json', 'package-lock.json', 'tsconfig.json',
  'jest.config.js', 'jest.config.enhanced.js',
  'jest.config.backup.js', 'eslint.config.js', 'babel.config.cjs',
  'test-config.json', '.git', '.github', '.npm-docs-temp', 'node_modules',
  'coverage', 'dist', 'docs', 'examples', 'scripts', 'src', 'tests',
  'tests-backup', 'config', 'tools'
];

const unexpectedFiles = rootFiles.filter(file => !allowedRootFiles.includes(file));
if (unexpectedFiles.length > 0) {
  console.log('Unexpected files in root directory:');
  unexpectedFiles.forEach(file => {
    console.log(`  - ${file}`);
  });
} else {
  console.log('✓ Root directory is clean');
}

// Check test file organization
console.log('\nChecking test file organization...');
const testCategories = {
  'unit': ['unit tests', 'module tests'],
  'integration': ['integration tests', 'component interaction'],
  'e2e': ['end-to-end', 'full workflow'],
  'root': ['temporary tests', 'experimental tests']
};

Object.entries(testCategories).forEach(([category, keywords]) => {
  const categoryPath = path.join('tests', category);
  if (fs.existsSync(categoryPath)) {
    const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.test.ts') || f.endsWith('.test.js'));
    console.log(`${category}: ${files.length} test files`);
  }
});

// Recommendations
console.log('\n=== Organization Recommendations ===');
console.log('1. Run regularly: npm run organize');
console.log('2. Test categorization:');
console.log('   - Unit tests: tests/unit/');
console.log('   - Integration tests: tests/integration/');
console.log('   - End-to-end tests: tests/e2e/');
console.log('   - Temporary tests: tests/root/');
console.log('3. Script categorization:');
console.log('   - Build scripts: scripts/build/');
console.log('   - Analysis scripts: scripts/analysis/');
console.log('   - Utility scripts: scripts/utilities/');
console.log('   - CI/CD scripts: scripts/ci/');
console.log('4. Documentation categorization:');
console.log('   - API docs: docs/api/');
console.log('   - Architecture docs: docs/architecture/');
console.log('   - Plan docs: docs/plans/');
console.log('   - Guide docs: docs/guides/');
console.log('   - Report docs: docs/reports/');

console.log('\n=== Complete ===');
