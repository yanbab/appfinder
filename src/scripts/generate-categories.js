#!/usr/bin/env node
//
// Generate Categories
//
// Generates the category definitions list (data/categories.json) with
// SF symbols and display names for sidebar and filtering.

const categories = [
  {
    "name": "developerTools",
    "displayName": "Developer Tools",
    "symbolName": "hammer"
  },
  {
    "name": "browsers",
    "displayName": "Browsers",
    "symbolName": "globe"
  },
  {
    "name": "communication",
    "displayName": "Communication",
    "symbolName": "message"
  },
  {
    "name": "productivity",
    "displayName": "Productivity",
    "symbolName": "checklist"
  },
  {
    "name": "utilities",
    "displayName": "Utilities",
    "symbolName": "gearshape.2"
  },
  {
    "name": "designGraphics",
    "displayName": "Design & Graphics",
    "symbolName": "paintpalette"
  },
  {
    "name": "audioMusic",
    "displayName": "Audio & Music",
    "symbolName": "music.note"
  },
  {
    "name": "videoMedia",
    "displayName": "Video & Media",
    "symbolName": "film"
  },
  {
    "name": "games",
    "displayName": "Games",
    "symbolName": "gamecontroller"
  },
  {
    "name": "securityPrivacy",
    "displayName": "Security & Privacy",
    "symbolName": "lock.shield"
  },
  {
    "name": "financeCrypto",
    "displayName": "Finance & Crypto",
    "symbolName": "creditcard"
  },
  {
    "name": "cloudStorage",
    "displayName": "Cloud & Storage",
    "symbolName": "cloud"
  },
  {
    "name": "scienceEducation",
    "displayName": "Science & Education",
    "symbolName": "graduationcap"
  },
  {
    "name": "menuBar",
    "displayName": "Menu Bar",
    "symbolName": "menubar.rectangle"
  },
  {
    "name": "officeTools",
    "displayName": "Office Tools",
    "symbolName": "doc.text"
  },
  {
    "name": "screensaverWallpaper",
    "displayName": "Screensaver & Wallpaper",
    "symbolName": "photo.stack"
  },
  {
    "name": "ai",
    "displayName": "AI & LLMs",
    "symbolName": "sparkles"
  },
  {
    "name": "font",
    "displayName": "Fonts",
    "symbolName": "textformat"
  },
  {
    "name": "other",
    "displayName": "Other",
    "symbolName": "square.grid.2x2"
  }
];

console.log(JSON.stringify(categories, null, 2));
