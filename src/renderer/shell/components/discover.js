// Discover Component Extension
Object.assign(window.shell, {
  currentSlideIndex: 0,
  slideTimer: null,
  featuredItems: [],
  topInstalledItems: [],

  startSlideTimer() {
    this.pauseSlideTimer();
    if (this.featuredItems && this.featuredItems.length > 1) {
      this.slideTimer = setInterval(() => {
        if (this.currentTab === 'discover') {
          this.nextSlide();
        }
      }, 4500);
    }
  },

  pauseSlideTimer() {
    if (this.slideTimer) {
      clearInterval(this.slideTimer);
      this.slideTimer = null;
    }
  },

  nextSlide() {
    if (!this.featuredItems || !this.featuredItems.length) return;
    this.currentSlideIndex = (this.currentSlideIndex + 1) % this.featuredItems.length;
  },

  prevSlide() {
    if (!this.featuredItems || !this.featuredItems.length) return;
    this.currentSlideIndex = (this.currentSlideIndex - 1 + this.featuredItems.length) % this.featuredItems.length;
  },

  updateDiscoverItems() {
    const featuredTokens = ['visual-studio-code', 'figma', 'spotify', 'raycast', 'obsidian', 'zed'];
    this.featuredItems = Object.freeze(this.items.filter(c => featuredTokens.includes(c.token)));
    this.currentSlideIndex = 0;
    this.startSlideTimer();

    // Top Installed (top downloaded items with max 1 per category, must have an icon)
    const sorted = this.items
      .filter(c => c.count > 0 && (c.icon || c.iconUrl) && c.category !== 'font' && !featuredTokens.includes(c.token))
      .sort((a, b) => (b.count || 0) - (a.count || 0));

    const topInstalled = [];
    const seenCategories = new Set();

    for (const item of sorted) {
      const cat = item.category || 'other';
      if (!seenCategories.has(cat)) {
        seenCategories.add(cat);
        topInstalled.push(item);
        if (topInstalled.length >= 6) break;
      }
    }

    this.topInstalledItems = Object.freeze(topInstalled);
  },

  toggleCategories() {
    this.showAllCategories = !this.showAllCategories;
    if (this.showAllCategories) {
      this.$nextTick(() => {
        const el = document.getElementById('apps-container');
        if (el) {
          el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        }
      });
    }
  },

  hexToHsl(hex) {
    let c = (hex || '#007aff').replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const r = parseInt(c.substring(0, 2), 16) / 255;
    const g = parseInt(c.substring(2, 4), 16) / 255;
    const b = parseInt(c.substring(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  },

  getSlideColor(item) {
    const tokenColors = {
      'visual-studio-code': '#0078d7',
      'figma': '#a259ff',
      'spotify': '#1db954',
      'raycast': '#ff6363',
      'obsidian': '#7c3aed',
      'zed': '#0070f3'
    };
    return (item && tokenColors[item.token]) || (this.name2color ? this.name2color(item?.name) : '#007aff');
  },

  getSlideGradient(item) {
    if (!item) return '';
    const color = this.getSlideColor(item);
    const hsl = this.hexToHsl(color);
    const startS = Math.max(45, Math.min(hsl.s, 90));
    const startL = Math.max(28, Math.min(hsl.l, 42));
    const endS = Math.max(35, Math.min(startS - 8, 85));
    const endL = Math.max(12, Math.min(hsl.l - 18, 22));
    return `background: linear-gradient(135deg, hsl(${hsl.h}, ${startS}%, ${startL}%) 0%, hsl(${hsl.h}, ${endS}%, ${endL}%) 100%);`;
  }
});

// Arrow key navigation for Discover slider
window.addEventListener('keydown', (e) => {
  if (window.shell && window.shell.currentTab === 'discover') {
    const target = e.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }
    if (window.shell.showPasswordModal) {
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (window.shell.showInfoPanel) {
        window.shell.closeAppInfo();
      }
      e.preventDefault();
      if (e.key === 'ArrowLeft') {
        window.shell.prevSlide();
      } else {
        window.shell.nextSlide();
      }
    }
  }
});
