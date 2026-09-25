// Pure utilities & formatters for the shell interface

const initialsPalette = [
    '#4a82d2', // Soft Blue
    '#6860b8', // Soft Purple
    '#d65773', // Soft Rose
    '#d95b50', // Soft Coral / Red
    '#dc7c38', // Soft Amber / Orange
    '#2e9e8f', // Soft Teal
    '#3ca860', // Soft Green
    '#748294', // Slate
    '#111111',
    '#555555',
    '#888888',
];

window.ShellUtils = {
    getAppName(item) {
        if (!item) return "";
        let name = item.name || item.token || "";
        if (item.token && item.token.includes("@")) {
            const version = item.token.split("@")[1];
            if (version && !name.toLowerCase().endsWith(`@${version.toLowerCase()}`)) {
                return `${name} @${version}`;
            }
        }
        return name;
    },

    name2initials(name) {
        if (!name) return '';
        const words = name.trim().split(/\s+/).filter(Boolean);
        if (words.length >= 2) {
            const first = words[0].replace(/[^a-zA-Z0-9]/g, '')[0] || words[0][0] || '';
            const second = words[1].replace(/[^a-zA-Z0-9]/g, '')[0] || words[1][0] || '';
            return (first + second).toUpperCase();
        }
        const clean = (words[0] || name.trim()).replace(/[^a-zA-Z0-9]/g, '');
        if (clean.length <= 1) return clean.toUpperCase();
        return clean[0].toUpperCase() + clean[1].toLowerCase();
    },

    name2color(name) {
        if (!name) return initialsPalette[0];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        const index = Math.abs(hash) % initialsPalette.length;
        return initialsPalette[index];
    },

    formatAccentColor(color) {
        if (!color) return '#007aff';
        if (typeof color === 'string') {
            const clean = color.trim().replace(/^#/, '');
            return color.startsWith('rgb') ? color : `#${clean.length === 8 ? clean.slice(0, 6) : clean}`;
        }
        if (typeof color === 'object' && color.r !== undefined) {
            return `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
        }
        return '#007aff';
    },

    formatVersion(v) {
        if (!v) return '?';
        v = String(v).split(',')[0].trim();
        return v.split('-')[0].trim();
    },

    stripAnsi(str) {
        if (!str) return '';
        return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
    },

    async getIconDataUrl(url) {
        if (!url) return null;
        if (url.startsWith('data:')) return url;
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            return null;
        }
    }
};
