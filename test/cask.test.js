const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { generateCask, validateCaskRuby, computeSha256 } = require('../scripts/generate-cask');

const MOCK_ARM_SHA = 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0';
const MOCK_INTEL_SHA = '0fedcba9876543210fedcba9876543210fedcba9876543210fedcba987654321';

test('generateCask generates valid Homebrew Cask Ruby definition with expected fields', () => {
  const code = generateCask({
    version: '0.9.6',
    armSha: MOCK_ARM_SHA,
    intelSha: MOCK_INTEL_SHA
  });

  assert.ok(code.includes('cask "appfinder" do'));
  assert.ok(code.includes('version "0.9.6"'));
  assert.ok(code.includes(`sha256 arm:   "${MOCK_ARM_SHA}",`));
  assert.ok(code.includes(`       intel: "${MOCK_INTEL_SHA}"`));
  assert.ok(code.includes('url "https://github.com/yanbab/appfinder/releases/download/v#{version}/AppFinder-#{version}#{arch.empty? ? "" : "-#{arch}"}.dmg"'));
  assert.ok(code.includes('name "AppFinder"'));
  assert.ok(code.includes('desc "App store for the Homebrew package manager"'));
  assert.ok(code.includes('homepage "https://github.com/yanbab/appfinder"'));
  assert.ok(code.includes('auto_updates true'));
  assert.ok(code.includes('depends_on macos: :ventura'));
  assert.ok(code.includes('app "AppFinder.app"'));
  assert.ok(code.includes('postflight_steps do'));
  assert.ok(code.includes('system_command "xattr"'));
  assert.ok(code.includes('zap trash: ['));
  assert.ok(code.includes('end'));
});

test('validateCaskRuby validates syntax and confirms no syntax errors', () => {
  const code = generateCask({
    version: '0.9.6',
    armSha: MOCK_ARM_SHA,
    intelSha: MOCK_INTEL_SHA
  });

  const result = validateCaskRuby(code);
  assert.equal(result.valid, true);
  assert.equal(result.error, undefined);
});

test('validateCaskRuby catches unclosed quotes / syntax error (e.g. truncated app line)', () => {
  const brokenCode = `cask "appfinder" do
  version "0.9.6"
  sha256 arm:   "${MOCK_ARM_SHA}",
         intel: "${MOCK_INTEL_SHA}"
  app "
`;
  const result = validateCaskRuby(brokenCode);
  assert.equal(result.valid, false);
  assert.ok(result.error.length > 0);
});

test('generateCask rejects invalid or empty SHA256 checksums', () => {
  assert.throws(() => {
    generateCask({
      version: '0.9.6',
      armSha: '',
      intelSha: MOCK_INTEL_SHA
    });
  }, /Invalid ARM64 SHA256/);

  assert.throws(() => {
    generateCask({
      version: '0.9.6',
      armSha: 'not-a-sha',
      intelSha: MOCK_INTEL_SHA
    });
  }, /Invalid ARM64 SHA256/);

  assert.throws(() => {
    generateCask({
      version: '0.9.6',
      armSha: MOCK_ARM_SHA,
      intelSha: ''
    });
  }, /Invalid Intel SHA256/);
});

test('generateCask rejects invalid semantic version format', () => {
  assert.throws(() => {
    generateCask({
      version: 'invalid-version',
      armSha: MOCK_ARM_SHA,
      intelSha: MOCK_INTEL_SHA
    });
  }, /Invalid version format/);
});

test('computeSha256 computes correct checksum for a file and rejects missing/empty files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sha-test-'));
  const testFile = path.join(tmpDir, 'test.bin');
  const emptyFile = path.join(tmpDir, 'empty.bin');

  try {
    fs.writeFileSync(testFile, 'AppFinder test binary content', 'utf8');
    fs.writeFileSync(emptyFile, '', 'utf8');

    const sha = computeSha256(testFile);
    assert.match(sha, /^[a-f0-9]{64}$/);

    assert.throws(() => {
      computeSha256(emptyFile);
    }, /empty/);

    assert.throws(() => {
      computeSha256(path.join(tmpDir, 'nonexistent.dmg'));
    }, /not found/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
