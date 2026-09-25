#!/usr/bin/env node

const categories = [
    {
        "name": "developerTools",
        "displayName": "Developer Tools",
        "icon": "<svg class=\"menu-item-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m8 7-5 5 5 5m8-10 5 5-5 5m-4.5-12-3 14\"></path></svg>",
        "symbolName": "chevron.left.forwardslash.chevron.right"
    },
    {
        "name": "browsers",
        "displayName": "Browsers",
        "icon": "<svg class=\"menu-item-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"></circle><path d=\"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20\"></path></svg>",
        "symbolName": "globe"
    },
    {
        "name": "communication",
        "displayName": "Communication",
        "icon": "<svg class=\"menu-item-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M14 9a2 2 0 0 1-2 2H6l-3 3V4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2z\"></path><path d=\"M18 9h1a2 2 0 0 1 2 2v7l-3-2h-4a2 2 0 0 1-2-2v-1\"></path></svg>",
        "symbolName": "bubble.left.and.bubble.right"
    },
    {
        "name": "productivity",
        "displayName": "Productivity",
        "icon": "<svg class=\"menu-item-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"></circle><path d=\"m8.5 12.5 2.5 2.5 5-5\"></path></svg>",
        "symbolName": "checkmark.circle"
    },
    {
        "name": "utilities",
        "displayName": "Utilities",
        "icon": "<svg class=\"menu-item-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m14.7 6.3 1.6 1.6-9.4 9.4c-.6.6-1.5.6-2.1 0l-.8-.8c-.6-.6-.6-1.5 0-2.1l9.4-9.4 1.3 1.3\"></path><path d=\"M15 3.5 20.5 9l-2.8 2.8-5.5-5.5zm4 15-4-4 2-2 4 4z\"></path></svg>",
        "symbolName": "wrench.and.screwdriver"
    },
    {
        "name": "designGraphics",
        "displayName": "Design & Graphics",
        "icon": "<svg class=\"menu-item-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m14 3 7 7-4 4-7-7z\"></path><path d=\"m6.5 14.5-3 3a2.12 2.12 0 0 0 3 3l3-3z\"></path><path d=\"M10 11 6 15\"></path></svg>",
        "symbolName": "paintbrush"
    },
    {
        "name": "audioMusic",
        "displayName": "Audio & Music",
        "icon": "<svg class=\"menu-item-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9 18V5l12-2v13\"></path><circle cx=\"6\" cy=\"18\" r=\"3\"></circle><circle cx=\"18\" cy=\"16\" r=\"3\"></circle></svg>",
        "symbolName": "music.note"
    },
    {
        "name": "videoMedia",
        "displayName": "Video & Media",
        "icon": "<svg class=\"menu-item-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"4\"></rect><polygon points=\"10 8 16 12 10 16 10 8\" fill=\"currentColor\"></polygon></svg>",
        "symbolName": "play.rectangle"
    },
    {
        "name": "games",
        "displayName": "Games",
        "icon": "<svg class=\"menu-item-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 11h4M8 9v4M15 11h.01M18 13h.01M3.5 15l2-8a3 3 0 0 1 3-2h7a3 3 0 0 1 3 2l2 8a3 3 0 0 1-4 3.5l-2.5-1.5h-4L7.5 18.5A3 3 0 0 1 3.5 15z\"></path></svg>",
        "symbolName": "gamecontroller"
    },
    {
        "name": "securityPrivacy",
        "displayName": "Security & Privacy",
        "icon": "<svg class=\"menu-item-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z\"></path><rect x=\"9.5\" y=\"11\" width=\"5\" height=\"4\" rx=\"1\"></rect><path d=\"M10.5 11V9.5a1.5 1.5 0 0 1 3 0V11\"></path></svg>",
        "symbolName": "lock.shield"
    },
    {
        "name": "financeCrypto",
        "displayName": "Finance & Crypto",
        "icon": "<svg class=\"menu-item-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"18\" y1=\"20\" x2=\"18\" y2=\"10\"></line><line x1=\"12\" y1=\"20\" x2=\"12\" y2=\"4\"></line><line x1=\"6\" y1=\"20\" x2=\"6\" y2=\"14\"></line><line x1=\"3\" y1=\"20\" x2=\"21\" y2=\"20\"></line></svg>",
        "symbolName": "chart.bar"
    },
    {
        "name": "cloudStorage",
        "displayName": "Cloud & Storage",
        "icon": "<svg class=\"menu-item-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M17.5 19H7a5 5 0 0 1-.8-9.94A7 7 0 0 1 20 11.5a4.5 4.5 0 0 1-2.5 7.5z\"></path></svg>",
        "symbolName": "cloud"
    },
    {
        "name": "scienceEducation",
        "displayName": "Science & Education",
        "icon": "<svg class=\"menu-item-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m22 10-10-5L2 10l10 5 10-5z\"></path><path d=\"M6 12.5v5c0 1.5 2.7 3.5 6 3.5s6-2 6-3.5v-5\"></path><path d=\"M22 10v6\"></path></svg>",
        "symbolName": "graduationcap"
    },
    {
        "name": "menuBar",
        "displayName": "Menu Bar",
        "icon": "<svg class=\"menu-item-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"3\"></rect><line x1=\"3\" y1=\"9\" x2=\"21\" y2=\"9\"></line></svg>",
        "symbolName": "menubar.rectangle"
    },
    {
        "name": "officeTools",
        "displayName": "Office Tools",
        "icon": "<svg class=\"menu-item-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"7\" width=\"18\" height=\"13\" rx=\"3\"></rect><path d=\"M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"></path><line x1=\"3\" y1=\"12\" x2=\"21\" y2=\"12\"></line></svg>",
        "symbolName": "briefcase"
    },
    {
        "name": "screensaverWallpaper",
        "displayName": "Screensaver & Wallpaper",
        "icon": "<svg class=\"menu-item-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"3\"></rect><path d=\"m15 10 1.2 2.3L18.5 13.5l-2.3 1.2L15 17l-1.2-2.3L11.5 13.5l2.3-1.2z\"></path></svg>",
        "symbolName": "sparkles.rectangle.stack"
    },
    {
        "name": "ai",
        "displayName": "AI & LLMs",
        "icon": "<svg class=\"menu-item-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m12 3 2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z\"></path><path d=\"m19 17 1 2 2 1-2 1-1 2-1-2-2-1 2-1z\"></path></svg>",
        "symbolName": "sparkles"
    },
    {
        "name": "font",
        "displayName": "Fonts",
        "icon": "<svg class=\"menu-item-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 7V4h12v3M10 4v16\"></path><path d=\"M15 13h5M17.5 13v7\"></path></svg>",
        "symbolName": "textformat"
    },
    {
        "name": "other",
        "displayName": "Other",
        "icon": "<svg class=\"menu-item-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"3\" width=\"7\" height=\"7\" rx=\"2\"></rect><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\" rx=\"2\"></rect><rect x=\"14\" y=\"14\" width=\"7\" height=\"7\" rx=\"2\"></rect><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\" rx=\"2\"></rect></svg>",
        "symbolName": "square.grid.2x2"
    }
];

console.log(JSON.stringify(categories, null, 2));
