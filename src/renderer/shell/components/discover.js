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
  }
});
