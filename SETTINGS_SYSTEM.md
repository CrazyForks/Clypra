# Settings System Documentation

## Overview

The Clypra settings system provides a customizable user experience with theme selection and font family options. Settings are persisted to localStorage and automatically applied on app startup.

## Features

### 1. Theme Selection (4 Themes)

| Theme        | Description        | Colors                                       |
| ------------ | ------------------ | -------------------------------------------- |
| **Dark**     | Classic dark theme | Deep blacks with purple accent (#6c63ff)     |
| **Midnight** | Deep blue tones    | Navy blues with bright blue accent (#5b8fff) |
| **Ocean**    | Cool cyan accents  | Dark teals with cyan accent (#00d4ff)        |
| **Forest**   | Natural green hues | Dark greens with green accent (#4ade80)      |

Each theme includes:

- Background colors (bg, surface, surface-raised)
- Border colors
- Accent color
- Text colors (primary, muted)

### 2. Font Family Selection (4 Fonts)

| Font          | Description         | Use Case                      |
| ------------- | ------------------- | ----------------------------- |
| **Inter**     | Modern and clean    | Default, best for UI          |
| **System**    | Native system font  | Performance, native feel      |
| **Monospace** | Code-style font     | Technical, developer-friendly |
| **Serif**     | Classic and elegant | Traditional, readable         |

## Architecture

### Store: `src/store/settingsStore.ts`

```typescript
interface SettingsStore {
  theme: Theme;
  fontFamily: FontFamily;
  setTheme: (theme: Theme) => void;
  setFontFamily: (fontFamily: FontFamily) => void;
}
```

**Key Features:**

- Uses Zustand with persist middleware
- Saves to localStorage as `clypra-settings`
- Auto-applies settings on app load via `onRehydrateStorage`
- CSS custom properties updated in real-time

### Component: `src/components/ui/SettingsModal.tsx`

**Features:**

- Grid layout for theme selection with visual previews
- List layout for font selection with font samples
- Check icons indicate current selection
- Hover states for better UX
- Instant preview on selection

### UI Integration

**Settings Button Location:** TopBar (right side, before Export button)

**Modal Trigger:**

1. Click Settings icon in TopBar
2. Modal opens with current settings pre-selected
3. Changes apply immediately
4. Close modal to return to editor

## Usage

### Opening Settings

```typescript
import { useUIStore } from "../../store/uiStore";

const { toggleSettingsModal } = useUIStore();

// Open settings
toggleSettingsModal();
```

### Accessing Current Settings

```typescript
import { useSettingsStore } from "../../store/settingsStore";

const { theme, fontFamily } = useSettingsStore();

console.log(`Current theme: ${theme}`);
console.log(`Current font: ${fontFamily}`);
```

### Programmatically Changing Settings

```typescript
import { useSettingsStore } from "../../store/settingsStore";

const { setTheme, setFontFamily } = useSettingsStore();

// Change theme
setTheme("ocean");

// Change font
setFontFamily("mono");
```

## Technical Details

### Theme Application

Themes are applied by updating CSS custom properties on the document root:

```typescript
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const themeColors = themes[theme];

  Object.entries(themeColors).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
}
```

### Font Application

Fonts are applied by updating the `--font-sans` CSS variable and body font-family:

```typescript
function applyFontFamily(fontFamily: FontFamily) {
  const root = document.documentElement;
  root.style.setProperty("--font-sans", fontFamilies[fontFamily]);
  document.body.style.fontFamily = fontFamilies[fontFamily];
}
```

### Persistence

Settings are automatically saved to localStorage using Zustand's persist middleware:

```typescript
persist(
  (set) => ({
    /* store implementation */
  }),
  {
    name: "clypra-settings",
    onRehydrateStorage: () => (state) => {
      if (state) {
        applyTheme(state.theme);
        applyFontFamily(state.fontFamily);
      }
    },
  },
);
```

## Extending the System

### Adding a New Theme

1. Add theme to `Theme` type in `settingsStore.ts`:

```typescript
export type Theme = "dark" | "midnight" | "ocean" | "forest" | "sunset";
```

2. Define theme colors in `themes` object:

```typescript
const themes: Record<Theme, Record<string, string>> = {
  // ... existing themes
  sunset: {
    "--color-bg": "#1a0f0a",
    "--color-surface": "#2a1810",
    "--color-surface-raised": "#3a2418",
    "--color-border": "#4a3020",
    "--color-accent": "#ff6b35",
    "--color-text-primary": "#fff5f0",
    "--color-text-muted": "#8a6a5a",
  },
};
```

3. Add theme option to `SettingsModal.tsx`:

```typescript
const themes = [
  // ... existing themes
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm orange tones",
    preview: "linear-gradient(135deg, #1a0f0a 0%, #2a1810 50%, #3a2418 100%)",
  },
];
```

### Adding a New Font

1. Add font to `FontFamily` type:

```typescript
export type FontFamily = "inter" | "system" | "mono" | "serif" | "comic";
```

2. Define font family in `fontFamilies` object:

```typescript
const fontFamilies: Record<FontFamily, string> = {
  // ... existing fonts
  comic: '"Comic Sans MS", "Comic Sans", cursive',
};
```

3. Add font option to `SettingsModal.tsx`:

```typescript
const fonts = [
  // ... existing fonts
  {
    id: "comic",
    name: "Comic",
    description: "Fun and casual",
    sample: "Comic Font",
  },
];
```

### Adding New Settings Categories

To add new settings (e.g., language, playback quality):

1. Extend `SettingsStore` interface
2. Add state and setters
3. Add new section to `SettingsModal.tsx`
4. Implement persistence logic

## Files Modified/Created

### Created:

- `src/store/settingsStore.ts` - Settings state management
- `src/components/ui/SettingsModal.tsx` - Settings UI component
- `SETTINGS_SYSTEM.md` - This documentation

### Modified:

- `src/store/uiStore.ts` - Added `showSettingsModal` state
- `src/components/editor/TopBar.tsx` - Added Settings button
- `src/components/screens/EditorScreen.tsx` - Integrated SettingsModal

## Future Enhancements

Potential additions to the settings system:

1. **Appearance Settings**
   - Timeline zoom level
   - Waveform display style
   - Grid snapping preferences

2. **Playback Settings**
   - Default playback quality
   - Audio output device
   - Playback speed presets

3. **Export Settings**
   - Default export format
   - Default resolution
   - Default codec preferences

4. **Keyboard Shortcuts**
   - Customizable shortcuts
   - Preset configurations
   - Import/export shortcuts

5. **Workspace Settings**
   - Panel layout preferences
   - Auto-save interval
   - Project templates

## Testing

To test the settings system:

1. ✅ Open settings modal via TopBar button
2. ✅ Select each theme and verify colors change
3. ✅ Select each font and verify text changes
4. ✅ Close and reopen app - settings should persist
5. ✅ Check localStorage for `clypra-settings` key
6. ✅ Verify modal closes on backdrop click
7. ✅ Verify modal closes on X button click
8. ✅ Check hover states on theme/font options
9. ✅ Verify check icons appear on selected options
10. ✅ Test keyboard navigation (accessibility)
