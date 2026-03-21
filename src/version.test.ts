import { describe, it, expect } from 'vitest';
import { VERSION } from './version.js';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('version', () => {
  it('should export a version string', () => {
    expect(VERSION).toBeDefined();
    expect(typeof VERSION).toBe('string');
  });

  it('should be a valid semver format', () => {
    const semverRegex = /^\d+\.\d+\.\d+$/;
    expect(VERSION).toMatch(semverRegex);
  });

  it('should match package.json version', () => {
    const pkgPath = join(process.cwd(), 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    expect(VERSION).toBe(pkg.version);
  });
});