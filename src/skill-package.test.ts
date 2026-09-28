import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Command } from 'commander';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildProgram } from './cli/program.js';
import { loadEnvFile, readCredentials } from './config/config.js';

/**
 * Stage E7: skill package. SKILL.md and references/ against the real CLI, packing into
 * bybit.skill and install.sh. No network: install.sh gets a locally packed file.
 */

const ROOT = join(import.meta.dirname, '..');
const SKILL_DIR = join(ROOT, 'skills/bybit');
const read = (path: string) => readFileSync(path, 'utf8');

const skillMd = () => read(join(SKILL_DIR, 'SKILL.md'));
const referenceFiles = () => readdirSync(join(SKILL_DIR, 'references')).filter((f) => f.endsWith('.md'));
const references = () => referenceFiles().map((f) => read(join(SKILL_DIR, 'references', f))).join('\n');

/** Full names of leaf commands: "portfolio", "opt chain", "session status". */
function commandNames(cmd: Command, prefix = ''): string[] {
  return cmd.commands.flatMap((c) => {
    const name = `${prefix}${c.name()}`;
    return c.commands.length > 0 ? commandNames(c, `${name} `) : [name];
  });
}

/** Every APP_* code mentioned in production sources, including the CLI error boundary. */
function errorCodes(): string[] {
  const files = readdirSync(join(ROOT, 'src'), { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.startsWith('fixtures'));
  const codes = files.flatMap((f) => read(join(ROOT, 'src', f)).match(/\bAPP_[A-Z_]+\b/g) ?? []);
  return [...new Set(codes)].sort();
}

/** Text of a references section whose heading is the command in backticks, up to the next heading of that level. */
function referenceSection(text: string, command: string): string | undefined {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.startsWith('## ') && l.includes(`\`${command}\``));
  if (start < 0) return undefined;
  const end = lines.findIndex((l, i) => i > start && l.startsWith('## '));
  return lines.slice(start, end < 0 ? undefined : end).join('\n');
}

function pack(outFile: string): void {
  execFileSync('uv', ['run', 'scripts/pack-skill.py', outFile], { cwd: ROOT, stdio: 'pipe' });
}

function zipEntries(file: string): string[] {
  return execFileSync('unzip', ['-Z1', file], { encoding: 'utf8' }).split('\n').filter(Boolean).sort();
}

describe('SKILL.md', () => {
  it('SKILL.md frontmatter', () => {
    const match = skillMd().match(/^---\n([\s\S]*?)\n---\n/);
    expect(match).not.toBeNull();
    const front = match![1]!;
    expect(front).toMatch(/^name: bybit$/m);
    const description = front.match(/^description: (.+)$/m)?.[1] ?? '';
    expect(description.length).toBeGreaterThan(0);
    expect(description.length).toBeLessThanOrEqual(1024);
    expect(description).toMatch(/read-only/i);
  });

  it('every CLI command is listed in SKILL.md', () => {
    const names = commandNames(buildProgram());
    expect(names).toContain('opt chain');
    expect(names).toContain('session status');
    const text = skillMd();
    for (const name of names) expect(text, name).toMatch(new RegExp('`' + name + '[` ]'));
  });

  it('every error code is explained', () => {
    const codes = errorCodes();
    expect(codes).toContain('APP_KEY_MISSING');
    expect(codes).toContain('APP_UNEXPECTED');
    const text = skillMd();
    for (const code of codes) expect(text, code).toContain(code);
  });

  it('trade requests are refused', () => {
    const text = skillMd();
    expect(text).toMatch(/только на чтение/);
    expect(text).toMatch(/сделк/);
    expect(text).toMatch(/вежливо откажи и объясни: скилл работает только на чтение/);
  });

  it('key file is never read', () => {
    const text = skillMd();
    expect(text).toContain('~/.config/bybit/.env');
    expect(text).toMatch(/не читай/i);
  });

  it('connection failure hints VPN/DNS', () => {
    const text = skillMd();
    expect(text).toContain('APP_UNAVAILABLE');
    expect(text).toContain('VPN');
    expect(text).toContain('1.1.1.1');
  });
});

describe('references', () => {
  it('references cover every command', () => {
    const text = references();
    for (const name of commandNames(buildProgram())) {
      const section = referenceSection(text, name);
      expect(section, name).toBeDefined();
      expect(section, name).toMatch(/Расчётн/);
    }
  });

  it('references links resolve', () => {
    const text = skillMd();
    const linked = [...text.matchAll(/references\/([\w.-]+\.md)/g)].map((m) => m[1]!);
    const files = referenceFiles();
    expect(files.length).toBeGreaterThan(0);
    for (const f of linked) expect(files, f).toContain(f);
    for (const f of files) expect(linked, f).toContain(f);
  });

  it('references mention plan notes', () => {
    const text = references();
    for (const term of ['BBSOL', 'BYUSDT', 'bid1Price', 'price24hPcnt', 'PERPETUAL', 'deliveryTime', 'вег', 'тет']) {
      expect(text, term).toContain(term);
    }
  });
});

describe('packing', () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'bybit-pack-'));
    pack(join(dir, 'a.skill'));
    pack(join(dir, 'b.skill'));
  }, 60_000);

  it('package contains only runtime files', () => {
    const expected = ['bybit/SKILL.md', 'bybit/scripts/bybit.cjs', ...referenceFiles().map((f) => `bybit/references/${f}`)];
    expect(zipEntries(join(dir, 'a.skill'))).toEqual(expected.sort());
  });

  it('package is deterministic', () => {
    expect(readFileSync(join(dir, 'a.skill')).equals(readFileSync(join(dir, 'b.skill')))).toBe(true);
  });

  it('committed package matches current skill files', () => {
    expect(readFileSync(join(ROOT, 'bybit.skill')).equals(readFileSync(join(dir, 'a.skill'))), 'run npm run pack').toBe(true);
  });
});

describe('install.sh', () => {
  let pkg: string;
  beforeAll(() => {
    pkg = join(mkdtempSync(join(tmpdir(), 'bybit-pkg-')), 'bybit.skill');
    pack(pkg);
  }, 60_000);

  function install(home: string): void {
    execFileSync('bash', [join(ROOT, 'install.sh')], {
      env: { PATH: process.env.PATH, HOME: home, BYBIT_SKILL_FILE: pkg },
      stdio: 'pipe',
    });
  }

  it('install.sh installs into both dirs', () => {
    const home = mkdtempSync(join(tmpdir(), 'bybit-home-'));
    install(home);
    for (const base of ['.claude/skills/bybit', '.agents/skills/bybit']) {
      expect(read(join(home, base, 'SKILL.md'))).toBe(skillMd());
      expect(existsSync(join(home, base, 'scripts/bybit.cjs')), base).toBe(true);
    }
  });

  it('install.sh creates env template', () => {
    const home = mkdtempSync(join(tmpdir(), 'bybit-home-'));
    install(home);
    const envFile = join(home, '.config/bybit/.env');
    expect(statSync(envFile).mode & 0o777).toBe(0o600);
    const template = read(envFile);
    expect(template).toMatch(/^BYBIT_API_KEY=$/m);
    expect(template).toMatch(/^BYBIT_API_SECRET=$/m);

    const empty: NodeJS.ProcessEnv = {};
    loadEnvFile(envFile, empty);
    expect(readCredentials(empty)).toBeUndefined();

    const filledFile = join(home, 'filled.env');
    writeFileSync(filledFile, template.replace(/^BYBIT_API_KEY=$/m, 'BYBIT_API_KEY=k1').replace(/^BYBIT_API_SECRET=$/m, 'BYBIT_API_SECRET=s1'));
    const filled: NodeJS.ProcessEnv = {};
    loadEnvFile(filledFile, filled);
    expect(readCredentials(filled)).toEqual({ apiKey: 'k1', apiSecret: 's1' });
  });

  it('install.sh keeps existing env', () => {
    const home = mkdtempSync(join(tmpdir(), 'bybit-home-'));
    mkdirSync(join(home, '.config/bybit'), { recursive: true });
    const envFile = join(home, '.config/bybit/.env');
    writeFileSync(envFile, 'BYBIT_API_KEY=mine\nBYBIT_API_SECRET=secret\n');
    install(home);
    expect(read(envFile)).toBe('BYBIT_API_KEY=mine\nBYBIT_API_SECRET=secret\n');
  });

  it('install.sh reinstalls cleanly', () => {
    const home = mkdtempSync(join(tmpdir(), 'bybit-home-'));
    install(home);
    const bases = ['.claude/skills/bybit', '.agents/skills/bybit'];
    for (const base of bases) writeFileSync(join(home, base, 'references/old.md'), 'old');
    install(home);
    for (const base of bases) {
      expect(existsSync(join(home, base, 'references/old.md')), base).toBe(false);
      expect(existsSync(join(home, base, 'SKILL.md')), base).toBe(true);
    }
  });
});

describe('release', () => {
  it('CLI version matches package.json and CHANGELOG', () => {
    const version = (JSON.parse(read(join(ROOT, 'package.json'))) as { version: string }).version;
    expect(buildProgram().version()).toBe(version);
    const firstEntry = read(join(ROOT, 'CHANGELOG.md')).match(/^## (\S+)/m)?.[1];
    expect(firstEntry).toBe(version);
  });

  it('bundle keeps Cyrillic readable', () => {
    const script = (JSON.parse(read(join(ROOT, 'package.json'))) as { scripts: { build: string } }).scripts.build;
    const outFile = join(mkdtempSync(join(tmpdir(), 'bybit-build-')), 'bybit.cjs');
    const args = script.replace(/^esbuild /, '').replace(/--outfile=\S+/, `--outfile=${outFile}`).split(' ');
    execFileSync(join(ROOT, 'node_modules/.bin/esbuild'), args, { cwd: ROOT, stdio: 'pipe' });
    expect(read(outFile)).toContain('Ключ API не настроен');
  }, 60_000);

  it('README documents install and key file', () => {
    const text = read(join(ROOT, 'README.md'));
    expect(text).toContain('https://raw.githubusercontent.com/AndreyK503/bybit-skill/main/install.sh');
    expect(text).toContain('~/.config/bybit/.env');
  });
});
