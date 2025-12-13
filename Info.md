## Project Overview

This is a static website for "Svlk-Byte Clicker", an incremental/clicker game built with vanilla JavaScript. The site is hosted on GitHub Pages and features a progression system with skins, upgrades, rebirth mechanics, and a shop system.

## Architecture

### Core Structure
- **index.html**: Main game HTML with modal dialogs (shop, skins, settings, admin panel, tutorial)
- **game.js**: All game logic, state management, and UI updates (~1,300 lines)
- **style.css**: Styling with theme support (night/light modes) and responsive design
- **_headers**: Netlify cache control headers (forces no-cache for all resources)

### Game State Management
All game state lives in the `gameData` object (lines 1-26 in game.js). State is:
- Persisted to `localStorage` under key `svlkClickerSave`
- Encrypted for export/import using device-specific telemetry ID (device fingerprint)
- Auto-migrated for backward compatibility with old save formats

Key state properties:
- Currencies: `count`, `coinsPerClick`, `coinsPerSecPermanent`, `coinsPerSecNonPermanent`
- Progression: `upgradeLevel`, `rebirths`, `clickCombo`
- Customization: `equippedSkin`, `unlockedSkins`, `skinsBoughtWithRebirths`
- Shop: `shopItems` (array of `{dbIndex, purchased}`), refreshes every 10 minutes
- Temporary boosts: `tempBoosts` object with timed multipliers

### Data Architecture

**Skins System** (lines 76-94):
- Static array of 17 skins with associated images and sounds
- Two unlock methods: coin cost (`coinCost`) or rebirth cost (`rebirthCost`)
- Rebirth-purchased skins persist through rebirth resets
- Each skin has unique audio file in `Sounds/` directory

**Shop System** (lines 44-74):
- `shopItemsDB`: 29 unique purchasable items with dynamic pricing
- Items use functions for cost calculation: `cost: (gd) => formula`
- Shop displays 4 random items per refresh (10-minute intervals)
- Pagination support (4 items per page)
- Purchase tracking per refresh cycle

**Multipliers & Boosts**:
- Rebirth multiplier: `1 + (rebirths * 0.5)` (50% per rebirth)
- Combo system: builds from rapid clicks, decays after 2s timeout
- Temporary boosts stored with `{multiplier, endTime}` structure

### Anti-Cheat Features
- Autoclicker detection (lines 303-333): detects suspiciously fast/consistent clicks
- Click blocking: 3-second penalty when detected
- Admin panel: protected by code + 24-hour lockout after 3 failed attempts
- Save encryption: XOR cipher keyed to device fingerprint prevents save sharing

### Event Handling Patterns
- Touch and mouse events handled separately for mobile support
- Long-press (5s hold) on coin counter opens admin code modal
- Music can play on press or continuously based on `musicOnPress` setting
- Modal system uses flex display toggling with backdrop blur

## Development Workflow

### Testing Locally
This is a static site. To test:
```pwsh
# Simple HTTP server (Python)
python -m http.server 8000

# Or use any static file server
# Then open http://localhost:8000
```

### Debugging Game State
1. Open browser DevTools Console
2. Access live game state: `gameData`
3. View localStorage: `localStorage.getItem('svlkClickerSave')`
4. Get telemetry ID: `getTelemetryId()`
5. Admin panel access: Hold coin counter for 5 seconds, enter code "AlbertPidor"

### Adding New Skins
1. Add JPG to `Skins/` directory (naming: `<Name>Skin.jpg`)
2. Add MP3 to `Sounds/` directory (naming: `<Name>Skin.mp3`)
3. Add entry to `skins` array in game.js with:
   - `skin`: image path
   - `coinCost` OR `rebirthCost` (not both)
   - `name`: display name with emoji
   - `sound`: audio file path
4. No index updates needed - skins auto-populate in UI

### Adding Shop Items
Add to `shopItemsDB` array (lines 44-74):
- `name`: Display name
- `effect`: Function that modifies `gameData` (e.g., `(gd) => gd.coinsPerClick += 5`)
- `cost`: Number or function returning cost (e.g., `(gd) => Math.floor(50 * Math.pow(1.15, gd.coinsPerClick))`)
- `maxQty`: Maximum purchases allowed per shop refresh

For temporary boosts, use: `activateTempBoost(stat, multiplier, durationInSeconds)`

### Code Organization Principles
- **No build system**: All vanilla JS/CSS/HTML
- **Single responsibility**: Each function in game.js handles one concern
- **Event delegation**: Modal close handlers use querySelectorAll for reusability
- **Defensive coding**: Type checks and null guards in `loadGameData()` for save migration
- **Performance**: Intervals cleared before reassignment to prevent memory leaks

## Key Functions Reference

### Game Loop
- `startCoinsPerSec()`: 1-second interval for passive income
- `updateUI()`: Called after every state change, updates all display elements
- `saveGameData()`: Writes to localStorage (called frequently, not debounced)

### Click Handling
- `handleClickStart/End/Cancel()`: Manages click states and music playback
- `handleActualClick()`: Applies multipliers, detects autoclicker, awards coins
- `detectAutoclicker()`: Returns true if suspicious pattern detected

### Save Management
- `exportSave()`: XOR encrypts with device telemetry ID, outputs base64
- `importSave()`: Decrypts and validates, only works on same device
- `getTelemetryId()`: Generates stable browser fingerprint (32 chars)

### Shop & Skins
- `generateShopItems()`: Selects 4 random items from database
- `updateShopUI()`: Renders current page of shop with purchase state
- `unlockSkin(index)`: Deducts cost, adds to unlocked array
- `equipSkin(index)`: Changes active skin, updates all images/sounds

## Important Constraints

1. **Save Portability**: Saves are device-locked by design. Import only works on export device.
2. **No Package Manager**: This is a dependency-free vanilla JS project.
3. **Asset Loading**: Images/sounds loaded via relative paths. Ensure `Skins/` and `Sounds/` directories exist.
4. **LocalStorage Limits**: Game state is ~5-10KB. Stays well under 5MB browser limits.
5. **Mobile First**: UI built for touch events with `touch-action: manipulation` and no tap highlight.
6. **Cache Headers**: `_headers` file forces no-cache for all resources (Netlify/CF Pages).

## File Naming Conventions
- Skins: `<Name>Skin.jpg` (e.g., `SvetlanaSkin.jpg`)
- Sounds: `<Name>Skin.mp3` (e.g., `SvetlanaSkin.mp3`)
- Modals: Use `Modal` suffix in HTML IDs (e.g., `shopModal`)
- LocalStorage keys: Prefix with `svlk` (e.g., `svlkClickerSave`, `svlkTelemetryId`, `svlkAdminLock`)

## Deployment
This site is intended for GitHub Pages or similar static hosts. No build step required - push to main branch and changes go live.