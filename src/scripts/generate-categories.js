#!/usr/bin/env node

const categories = [
    {
        "name": "developerTools",
        "displayName": "Developer Tools",
        "icon": "<svg class=\"menu-item-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9\"></path><path d=\"M17.64 15 22 10.64\"></path><path d=\"m20.91 3.26-1.25-1.25a2 2 0 0 0-2.83 0l-1.8 1.8 4.08 4.08 1.8-1.8a2 2 0 0 0 0-2.83Z\"></path></svg>",
        "symbolName": "hammer"
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
        "icon": "<svg class=\"menu-item-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M7.9 20A9 9 0 1 0 4 16.1L2 22Z\"></path></svg>",
        "symbolName": "message"
    },
    {
        "name": "productivity",
        "displayName": "Productivity",
        "icon": "<svg class=\"menu-item-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\" ry=\"1\"></rect><path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\"></path><path d=\"m9 14 2 2 4-4\"></path></svg>",
        "symbolName": "checklist"
    },
    {
        "name": "utilities",
        "displayName": "Utilities",
        "icon": "<svg class=\"menu-item-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z\"></path><circle cx=\"12\" cy=\"12\" r=\"3\"></circle></svg>",
        "symbolName": "gearshape.2"
    },
    {
        "name": "designGraphics",
        "displayName": "Design & Graphics",
        "icon": "<svg class=\"menu-item-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"13.5\" cy=\"6.5\" r=\".5\" fill=\"currentColor\"></circle><circle cx=\"17.5\" cy=\"10.5\" r=\".5\" fill=\"currentColor\"></circle><circle cx=\"8.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\"></circle><circle cx=\"6.5\" cy=\"12.5\" r=\".5\" fill=\"currentColor\"></circle><path d=\"M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z\"></path></svg>",
        "symbolName": "paintpalette"
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
        "icon": "<svg class=\"menu-item-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"></rect><path d=\"M7 3v18\"></path><path d=\"M17 3v18\"></path><path d=\"M3 7.5h4\"></path><path d=\"M3 12h18\"></path><path d=\"M3 16.5h4\"></path><path d=\"M17 16.5h4\"></path><path d=\"M17 7.5h4\"></path></svg>",
        "symbolName": "film"
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
        "icon": "<svg class=\"menu-item-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect width=\"20\" height=\"14\" x=\"2\" y=\"5\" rx=\"2\"></rect><line x1=\"2\" x2=\"22\" y1=\"10\" y2=\"10\"></line><rect x=\"5\" y=\"13\" width=\"4\" height=\"3\" rx=\"0.5\"></rect><line x1=\"12\" x2=\"18\" y1=\"14.5\" y2=\"14.5\"></line></svg>",
        "symbolName": "creditcard"
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
        "icon": "<svg class=\"menu-item-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z\"></path><polyline points=\"14 2 14 8 20 8\"></polyline><line x1=\"16\" x2=\"8\" y1=\"13\" y2=\"13\"></line><line x1=\"16\" x2=\"8\" y1=\"17\" y2=\"17\"></line><line x1=\"10\" x2=\"8\" y1=\"9\" y2=\"9\"></line></svg>",
        "symbolName": "doc.text"
    },
    {
        "name": "screensaverWallpaper",
        "displayName": "Screensaver & Wallpaper",
        "icon": "<svg class=\"menu-item-icon\" width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M18 22H4a2 2 0 0 1-2-2V6\"></path><path d=\"m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18\"></path><circle cx=\"12\" cy=\"8\" r=\"2\"></circle><rect width=\"16\" height=\"16\" x=\"6\" y=\"2\" rx=\"2\"></rect></svg>",
        "symbolName": "photo.stack"
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
