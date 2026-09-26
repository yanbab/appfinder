<p align="center">
  <img src="data/icon.svg" width="64" height="64" alt="App Finder Logo" />
</p>

<h1 align="center">App Finder</h1>

<p align="center">
  <strong>Applications library for macOS</strong>
</p>

<p align="center">
  <a href="https://github.com/yanbab/appfinder/actions/workflows/release.yml"><img src="https://github.com/yanbab/appfinder/actions/workflows/release.yml/badge.svg" alt="Release"></a>
  <a href="https://github.com/yanbab/appfinder/releases"><img src="https://img.shields.io/github/v/release/yanbab/appfinder" alt="Latest Release"></a>
  <a href="https://github.com/yanbab/appfinder/blob/main/package.json"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/platform-macOS%2013%2B-blue?logo=apple" alt="Platform: macOS 13+">
</p>

### Features

- 5000+ applications and 2000+ fonts available
- One click installs and upgrades
- Uninstall apps cleanly
- Powered by Homebrew, the leading package manager on MacOS
- Runs on macOS 13+

### Install from source

```bash
git clone https://github.com/yanbab/appfinder.git
cd appfinder
npm install
npm start
```

### Scripts

```bash
npm run fetch   # Update apps metadata
npm run build   # Build .app and .dmg
npm run clean   # Delete builds, caches and user config
```

### License

MIT License
