/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Savor
 *
 * This file is part of Savor.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 */
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