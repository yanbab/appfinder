const btnLight = document.getElementById('toggle-light');
const btnDark = document.getElementById('toggle-dark');
const screenshot = document.getElementById('app-screenshot');

function setLightTheme() {
  if (btnLight) btnLight.classList.add('active');
  if (btnDark) btnDark.classList.remove('active');
  if (screenshot) {
    screenshot.src = 'assets/shot-light.png';
    screenshot.alt = 'AppFinder Light Mode Screenshot';
  }
}

function setDarkTheme() {
  if (btnDark) btnDark.classList.add('active');
  if (btnLight) btnLight.classList.remove('active');
  if (screenshot) {
    screenshot.src = 'assets/shot-dark.png';
    screenshot.alt = 'AppFinder Dark Mode Screenshot';
  }
}

if (btnLight) btnLight.addEventListener('click', setLightTheme);
if (btnDark) btnDark.addEventListener('click', setDarkTheme);

// Initial detection of prefers-color-scheme
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
  setDarkTheme();
} else {
  setLightTheme();
}

// Dynamic listener for prefers-color-scheme changes
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    if (event.matches) {
      setDarkTheme();
    } else {
      setLightTheme();
    }
  });
}

// Copy to clipboard functionality
const copyBtn = document.querySelector('.copy-btn');
const copyIcon = document.querySelector('.copy-icon');
const checkIcon = document.querySelector('.check-icon');
const copyText = document.querySelector('.copy-text');
const commandText = 'git clone https://github.com/yanbab/appfinder.git';

if (copyBtn) {
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(commandText);

      // Success state
      copyBtn.classList.add('copied');
      if (copyIcon) copyIcon.style.display = 'none';
      if (checkIcon) checkIcon.style.display = 'inline';
      if (copyText) copyText.textContent = 'Copied!';

      setTimeout(() => {
        copyBtn.classList.remove('copied');
        if (copyIcon) copyIcon.style.display = 'inline';
        if (checkIcon) checkIcon.style.display = 'none';
        if (copyText) copyText.textContent = 'Copy';
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  });
}

// Fetch latest release URLs from GitHub API
async function updateLatestReleaseUrls() {
  try {
    const res = await fetch('https://api.github.com/repos/yanbab/appfinder/releases/latest');
    if (!res.ok) return;
    const release = await res.json();
    if (!release.assets || !Array.isArray(release.assets)) return;

    const armAsset = release.assets.find(a => a.name.includes('arm64') && a.name.endsWith('.dmg'));
    const intelAsset = release.assets.find(a => !a.name.includes('arm64') && a.name.endsWith('.dmg'));

    const armBtn = document.getElementById('download-arm-btn');
    const intelBtn = document.getElementById('download-intel-btn');

    if (armAsset && armBtn) armBtn.href = armAsset.browser_download_url;
    if (intelAsset && intelBtn) intelBtn.href = intelAsset.browser_download_url;
  } catch (err) {
    console.warn('Could not load latest release dynamically:', err);
  }
}

updateLatestReleaseUrls();
