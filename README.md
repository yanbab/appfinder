<p align="center">
  <img src="docs/assets/icon.svg" width="128" height="128" alt="" /><br/>
  <strong>App Finder</strong><br/>
  <small>Applications library for macOS</small>
</p>

### Features

- 5000+ applications and 2000+ fonts available
- One click installs and upgrades
- Uninstall apps cleanly
- Powered by Homebrew, the leading package manager on MacOS
- Runs on macOS 13+

### Screenshot

<img src="docs/assets/shot-light.png" alt="AppFinder light theme screenshot" />


### How it works

AppFinder aggregates official Homebrew cask formulas and installation analytics with structured categories and release dates provided by [CaskFlow](https://github.com/alielsokary/CaskFlow). 
This catalog is indexed locally to enable fast searching and application management directly via Homebrew.

### Installation

- (Download)(https://github.com/yanbab/appfinder/releases/latest/) (MacOS)

**Install via Homebrew**
```
brew install --cask yanbab/tap/appfinder
```

**Install from source**
```
git clone https://github.com/yanbab/appfinder.git
cd appfinder
npm install
npm start
```

### Scripts

```bash
npm run dev     # Start app in dev mode with hot-reload
npm run fetch   # Update apps metadata
npm run build   # Build .app and .dmg
npm run clean   # Delete builds, caches and user config
```

### License

```
MIT License
```