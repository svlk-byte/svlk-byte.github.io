// Game Data Structure
const gameData = {
    count: 0,
    coinsPerClick: 1,
    coinsPerSec: 0,
    upgradeLevel: 0,
    upgradeCost: 10,
    rebirths: 0,
    rebirthCost: 1000000,
    clickCombo: 0,
    comboBoost: 1,
    totalClicks: 0,
    totalCoinsEarned: 0,
    equippedSkin: 0,
    unlockedSkins: [0],
    tempBoosts: {},
    shopItems: [],
    shopPage: 0,
    skinsPage: 0,
    lastShopRefresh: Date.now(),
    shopRefreshInterval: 600000, // 10 minutes
    theme: 'night',
    hasSeenTutorial: false // NEW: Track if tutorial was shown
};

// Game Constants
const MAX_COMBO_CLICKS = 100;
const MAX_MULTIPLIER = 3;
const ITEMS_PER_PAGE = 4;
const SHOP_ITEM_COUNT = 5;

// Add these with other game variables
let clickTimes = [];
let clicksBlocked = false;
let blockEndTime = 0;
let clickIntervals = [];
let humanClickPattern = [];
let lastClickTime = 0;

// Shop Items Database
const shopItemsDB = [
    { name: "+1 Coin Per Click", effect: (gd) => gd.coinsPerClick++, cost: (gd) => Math.floor(50 * Math.pow(1.15, gd.coinsPerClick)), maxQty: 100 },
    { name: "+1 Coin/sec", effect: (gd) => gd.coinsPerSec++, cost: (gd) => Math.floor(75 * Math.pow(1.2, gd.coinsPerSec)), maxQty: 150 },
    { name: "+5 Coins Per Click", effect: (gd) => gd.coinsPerClick += 5, cost: (gd) => Math.floor(200 * Math.pow(1.25, gd.coinsPerClick / 5)), maxQty: 50 },
    { name: "+10% Combo Boost", effect: (gd) => gd.comboBoost += 0.1, cost: (gd) => Math.floor(1000 * Math.pow(1.3, gd.comboBoost * 10)), maxQty: 20 },
    { name: "Half Upgrade Cost", effect: (gd) => gd.upgradeCost = Math.max(10, Math.floor(gd.upgradeCost / 2)), cost: (gd) => gd.upgradeCost * 5, maxQty: 10 },
    { name: "Instant 10k Coins", effect: (gd) => gd.count += 10000, cost: () => 7500, maxQty: 5 },
    { name: "Double Coins/sec (5min)", effect: (gd) => activateTempBoost('coinsPerSec', 2, 300), cost: () => 20000, maxQty: 3 },
    { name: "+5 Coin/sec", effect: (gd) => gd.coinsPerSec += 5, cost: (gd) => Math.floor(500 * Math.pow(1.25, gd.coinsPerSec / 5)), maxQty: 75 },
    { name: "Triple Coins Per Click (10min)", effect: (gd) => activateTempBoost('coinsPerClick', 3, 600), cost: () => 50000, maxQty: 2 },
    { name: "Instant 100k Coins", effect: (gd) => gd.count += 100000, cost: () => 75000, maxQty: 5 },
    { name: "+20% Rebirth Bonus", effect: (gd) => gd.rebirths += Math.floor(gd.rebirths * 0.2), cost: (gd) => gd.rebirthCost / 3, maxQty: 5 },
    { name: "Reduce Rebirth Cost by 10%", effect: (gd) => gd.rebirthCost = Math.floor(gd.rebirthCost * 0.9), cost: (gd) => gd.rebirthCost / 2, maxQty: 15 },
    { name: "+25 Coins Per Click", effect: (gd) => gd.coinsPerClick += 25, cost: (gd) => Math.floor(5000 * Math.pow(1.3, gd.coinsPerClick / 25)), maxQty: 25 },
    { name: "Permanent +2 Coins/sec", effect: (gd) => gd.coinsPerSec += 2, cost: (gd) => 10000 * Math.pow(1.2, gd.coinsPerSec / 2), maxQty: 50 },
    { name: "Instant 1M Coins", effect: (gd) => gd.count += 1000000, cost: () => 500000, maxQty: 3 },
    { name: "+50 Coins Per Click", effect: (gd) => gd.coinsPerClick += 50, cost: (gd) => Math.floor(25000 * Math.pow(1.35, gd.coinsPerClick / 50)), maxQty: 15 },
    { name: "Quad Coins/sec (15min)", effect: (gd) => activateTempBoost('coinsPerSec', 4, 900), cost: () => 1000000, maxQty: 2 },
    { name: "Reduce Upgrade Cost by 20%", effect: (gd) => gd.upgradeCost = Math.max(10, Math.floor(gd.upgradeCost * 0.8)), cost: (gd) => gd.upgradeCost * 8, maxQty: 5 },
    { name: "Permanent +1% Click Efficiency", effect: (gd) => gd.coinsPerClick *= 1.01, cost: (gd) => 50000 * Math.pow(1.25, gd.coinsPerClick), maxQty: 25 },
    { name: "+10 Coin/sec", effect: (gd) => gd.coinsPerSec += 10, cost: (gd) => Math.floor(10000 * Math.pow(1.3, gd.coinsPerSec / 10)), maxQty: 30 },
    { name: "Instant 5M Coins", effect: (gd) => gd.count += 5000000, cost: () => 2500000, maxQty: 2 },
    { name: "Double Coins Per Click (20min)", effect: (gd) => activateTempBoost('coinsPerClick', 2, 1200), cost: () => 1500000, maxQty: 3 },
    { name: "+100 Coins Per Click", effect: (gd) => gd.coinsPerClick += 100, cost: (gd) => Math.floor(100000 * Math.pow(1.4, gd.coinsPerClick / 100)), maxQty: 10 },
    { name: "Permanent +5% Combo Boost", effect: (gd) => gd.comboBoost += 0.05, cost: (gd) => 75000 * Math.pow(1.35, gd.comboBoost * 20), maxQty: 15 },
    { name: "Instant 10M Coins", effect: (gd) => gd.count += 10000000, cost: () => 5000000, maxQty: 2 },
    { name: "+25 Coin/sec", effect: (gd) => gd.coinsPerSec += 25, cost: (gd) => Math.floor(50000 * Math.pow(1.35, gd.coinsPerSec / 25)), maxQty: 20 },
    { name: "Reduce Rebirth Cost by 25%", effect: (gd) => gd.rebirthCost = Math.floor(gd.rebirthCost * 0.75), cost: (gd) => gd.rebirthCost, maxQty: 5 },
    { name: "Permanent +10 Coins/sec", effect: (gd) => gd.coinsPerSec += 10, cost: (gd) => 250000 * Math.pow(1.3, gd.coinsPerSec / 10), maxQty: 15 },
    { name: "Quintuple Coins/sec (30min)", effect: (gd) => activateTempBoost('coinsPerSec', 5, 1800), cost: () => 10000000, maxQty: 1 },
];

// Skins Database
const skins = [
    { skin: "Skins/SvetlanaSkin.jpg", cost: 0, name: "🔢Svetlana (Free)", sound: "Sounds/SvetlanaSkin.mp3" },
    { skin: "Skins/LeshaSkin.jpg", cost: 1, name: "😍Lesha (1)", sound: "Sounds/LeshaSkin.mp3" },
    { skin: "Skins/RomanSkin.jpg", cost: 10000, name: "👨‍❤️‍👨Roman (10000)", sound: "Sounds/RomanSkin.mp3" },
    { skin: "Skins/ElenaSkin.jpg", cost: 30000, name: "🦛Elena (30000)", sound: "Sounds/ElenaSkin.mp3" },
    { skin: "Skins/KirillSkin.jpg", cost: 50000, name: "🪨Kirill (50000)", sound: "Sounds/KirillSkin.mp3" },
    { skin: "Skins/MatveiSkin.jpg", cost: 75000, name: "🍖Matvei (75000)", sound: "Sounds/MatveiSkin.mp3" },
    { skin: "Skins/FilipinkoSkin.jpg", cost: 100000, name: "🎨Fillipinko (100000)", sound: "Sounds/FilipinkoSkin.mp3" },
    { skin: "Skins/SobakaSkin.jpg", cost: 130000, name: "🐻Sobaka (130000)", sound: "Sounds/SobakaSkin.mp3" },
    { skin: "Skins/KotSkin.jpg", cost: 175000, name: "🦁Kot (175000)", sound: "Sounds/KotSkin.mp3" },
    { skin: "Skins/DuraSkin.jpg", cost: 200000, name: "📑Dura (200000)", sound: "Sounds/DuraSkin.mp3" },
];

// Game Variables
let comboTimeout;
let coinsPerSecInterval;
let adminHoldTimeout;
let isAdminHold = false;
let isClickInProgress = false; // NEW: Prevent multiple clicks
let clickStartTime = 0; // NEW: Track when click started

// DOM Elements
const elements = {
    coinCounter: document.getElementById('coinCounter'),
    comboCounter: document.getElementById('comboCounter'),
    mainClicker: document.getElementById('mainClicker'),
    upgradeBtn: document.getElementById('upgradeBtn'),
    upgradeCost: document.getElementById('upgradeCost'),
    upgradeLevel: document.getElementById('upgradeLevel'),
    rebirthBtn: document.getElementById('rebirthBtn'),
    rebirthCost: document.getElementById('rebirthCost'),
    rebirthLevel: document.getElementById('rebirthLevel'),
    clickFeedback: document.getElementById('clickFeedback'),
    shopModal: document.getElementById('shopModal'),
    skinsModal: document.getElementById('skinsModal'),
    settingsModal: document.getElementById('settingsModal'),
    adminModal: document.getElementById('adminModal'),
    shopItems: document.getElementById('shopItems'),
    skinsContainer: document.getElementById('skinsContainer'),
    themeSelect: document.getElementById('themeSelect'),
    exportSaveText: document.getElementById('exportSaveText'),
    importSaveText: document.getElementById('importSaveText'),
    exportSave: document.getElementById('exportSave'),
    importSave: document.getElementById('importSave'),
    resetGame: document.getElementById('resetGame'),
    shopTimer: document.getElementById('shopTimer'),
    refreshShop: document.getElementById('refreshShop'),
    shopPrev: document.getElementById('shopPrev'),
    shopNext: document.getElementById('shopNext'),
    shopPage: document.getElementById('shopPage'),
    skinsPrev: document.getElementById('skinsPrev'),
    skinsNext: document.getElementById('skinsNext'),
    skinsPage: document.getElementById('skinsPage'),
    tutorialOverlay: document.getElementById('tutorialOverlay'),
    adminContainer: document.getElementById('adminContainer'),
    clickSound: document.getElementById('clickSound')
};

// Initialize Game
function initGame() {
    loadGameData();
    setupEventListeners();
    setupSound();
    updateAllButtonImages(); // NEW: Initialize all button images
    startCoinsPerSec();
    updateShopTimer();
    generateShopItems();
    updateUI();
    setupAdminPanel();
    
    // Show tutorial only for new players who haven't seen it
    if (!gameData.hasSeenTutorial) {
        showTutorial();
        gameData.hasSeenTutorial = true;
        saveGameData();
    }
}

// Setup Event Listeners - FIXED FOR CLICK ON RELEASE
function setupEventListeners() {
    // Main clicker - FIXED: Click on release
    elements.mainClicker.addEventListener('mousedown', handleClickStart);
    elements.mainClicker.addEventListener('touchstart', handleClickStart, { passive: true });
    
    elements.mainClicker.addEventListener('mouseup', handleClickEnd);
    elements.mainClicker.addEventListener('touchend', handleClickEnd);
    elements.mainClicker.addEventListener('mouseleave', handleClickCancel);
    
    // Prevent context menu on long press
    elements.mainClicker.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Upgrade button
    elements.upgradeBtn.addEventListener('click', handleUpgrade);
    elements.upgradeBtn.addEventListener('touchstart', handleUpgrade, { passive: true });
    
    // Rebirth button
    elements.rebirthBtn.addEventListener('click', handleRebirth);
    elements.rebirthBtn.addEventListener('touchstart', handleRebirth, { passive: true });
    
    // Menu buttons
    document.getElementById('shopBtn').addEventListener('click', () => showModal('shopModal'));
    document.getElementById('skinsBtn').addEventListener('click', () => {
        showModal('skinsModal');
        updateSkinsUI();
    });
    document.getElementById('settingsBtn').addEventListener('click', () => showModal('settingsModal'));
    
    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });
    
    // Click outside modal to close
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Settings
    elements.themeSelect.addEventListener('change', handleThemeChange);
    elements.exportSave.addEventListener('click', exportSave);
    elements.importSave.addEventListener('click', importSave);
    elements.resetGame.addEventListener('click', resetGame);
    elements.refreshShop.addEventListener('click', forceShopRefresh);
    
    // Pagination
    elements.shopPrev.addEventListener('click', () => changeShopPage(-1));
    elements.shopNext.addEventListener('click', () => changeShopPage(1));
    elements.skinsPrev.addEventListener('click', () => changeSkinsPage(-1));
    elements.skinsNext.addEventListener('click', () => changeSkinsPage(1));
    
    // Admin panel activation (hold coin counter for 5 seconds)
    elements.coinCounter.addEventListener('mousedown', startAdminHold);
    elements.coinCounter.addEventListener('touchstart', startAdminHold);
    elements.coinCounter.addEventListener('mouseup', cancelAdminHold);
    elements.coinCounter.addEventListener('touchend', cancelAdminHold);
    elements.coinCounter.addEventListener('mouseleave', cancelAdminHold);
    
    // Tutorial
    document.querySelectorAll('.tutorial-next').forEach(btn => {
        btn.addEventListener('click', nextTutorialStep);
    });
}

// NEW: Click handling for click-on-release
function handleClickStart(e) {
    e.preventDefault();
    if (!isClickInProgress) {
        isClickInProgress = true;
        clickStartTime = Date.now();
        
        // Visual feedback on press
        elements.mainClicker.style.transform = 'scale(0.98)';
    }
}

function handleClickEnd(e) {
    if (!isClickInProgress) return;
    
    e.preventDefault();
    isClickInProgress = false;
    
    // Calculate click duration (for future features)
    const clickDuration = Date.now() - clickStartTime;
    
    // Only register as click if it was a short press (not a hold)
    if (clickDuration < 500) {
        handleActualClick();
    }
    
    // Reset visual feedback
    elements.mainClicker.style.transform = 'scale(1)';
}

function handleClickCancel() {
    if (isClickInProgress) {
        isClickInProgress = false;
        elements.mainClicker.style.transform = 'scale(1)';
    }
}

// Enhanced Autoclicker Detection
const AUTO_CLICK_DETECTION = {
    // Fast detection (catches obvious autoclickers immediately)
    MIN_INTERVAL: 40, // 40ms minimum humanly possible (anything faster is autoclicker)
    MAX_CONSECUTIVE_FAST: 3, // 3 clicks faster than 40ms triggers immediate block
    
    // Pattern detection (catches sophisticated autoclickers)
    PATTERN_WINDOW: 15, // Look at last 15 clicks
    INTERVAL_TOLERANCE: 8, // 8ms tolerance for pattern detection
    REQUIRED_CONSISTENCY: 0.85, // 85% of intervals must match pattern
    
    // Human behavior modeling (prevents false positives)
    HUMAN_VARIABILITY_MIN: 20, // Minimum variation for human clicks
    HUMAN_VARIABILITY_MAX: 300, // Maximum variation for human clicks
    HUMAN_ACCELERATION_LIMIT: 0.7, // Max speedup factor between consecutive clicks
    HUMAN_DECELERATION_LIMIT: 1.5, // Max slowdown factor between consecutive clicks
    
    // Statistical detection
    SAMPLE_SIZE: 25, // Number of clicks to analyze
    STDEV_THRESHOLD: 5, // Maximum standard deviation for autoclicker
    MEAN_THRESHOLD: 60, // Mean interval below this is suspicious
    
    // Grace periods (allow burst clicking)
    BURST_ALLOWANCE: 5, // Allow 5 fast clicks in a row
    BURST_COOLDOWN: 2000, // 2 seconds between bursts
    lastBurstTime: 0
};

function detectAutoclicker() {
    const now = Date.now();
    
    // Store click time
    if (lastClickTime > 0) {
        const interval = now - lastClickTime;
        clickTimes.push(now);
        clickIntervals.push(interval);
        
        // Keep arrays manageable
        if (clickTimes.length > 50) {
            clickTimes.shift();
            clickIntervals.shift();
        }
        if (clickIntervals.length > AUTO_CLICK_DETECTION.SAMPLE_SIZE) {
            clickIntervals.shift();
        }
    }
    lastClickTime = now;
    
    // Need minimum data to analyze
    if (clickIntervals.length < 5) return false;
    
    // === DETECTION METHOD 1: Instant Speed Check ===
    // Immediate block for impossibly fast clicking
    const recentIntervals = clickIntervals.slice(-AUTO_CLICK_DETECTION.MAX_CONSECUTIVE_FAST);
    if (recentIntervals.length >= AUTO_CLICK_DETECTION.MAX_CONSECUTIVE_FAST) {
        const allTooFast = recentIntervals.every(interval => interval < AUTO_CLICK_DETECTION.MIN_INTERVAL);
        if (allTooFast) {
            // Check if this is within burst allowance
            if (now - AUTO_CLICK_DETECTION.lastBurstTime > AUTO_CLICK_DETECTION.BURST_COOLDOWN) {
                blockClicksFor3sec();
                return true;
            }
        }
    }
    
    // === DETECTION METHOD 2: Perfect Consistency ===
    // Autoclickers have near-perfect timing
    if (clickIntervals.length >= AUTO_CLICK_DETECTION.PATTERN_WINDOW) {
        const sample = clickIntervals.slice(-AUTO_CLICK_DETECTION.PATTERN_WINDOW);
        const mean = sample.reduce((a, b) => a + b) / sample.length;
        
        // Calculate consistency (percentage of intervals within tolerance)
        const consistentCount = sample.filter(interval => 
            Math.abs(interval - mean) <= AUTO_CLICK_DETECTION.INTERVAL_TOLERANCE
        ).length;
        
        const consistencyRatio = consistentCount / sample.length;
        
        if (consistencyRatio >= AUTO_CLICK_DETECTION.REQUIRED_CONSISTENCY && mean < 150) {
            // Too consistent for a human, especially at high speeds
            blockClicksFor3sec();
            return true;
        }
    }
    
    // === DETECTION METHOD 3: Statistical Analysis ===
    if (clickIntervals.length >= AUTO_CLICK_DETECTION.SAMPLE_SIZE) {
        const sample = clickIntervals.slice(-AUTO_CLICK_DETECTION.SAMPLE_SIZE);
        const mean = sample.reduce((a, b) => a + b) / sample.length;
        
        // Calculate standard deviation
        const squaredDiffs = sample.map(value => Math.pow(value - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b) / sample.length;
        const stdev = Math.sqrt(avgSquaredDiff);
        
        // Autoclickers have very low standard deviation
        if (stdev < AUTO_CLICK_DETECTION.STDEV_THRESHOLD && mean < AUTO_CLICK_DETECTION.MEAN_THRESHOLD) {
            blockClicksFor3sec();
            return true;
        }
    }
    
    // === DETECTION METHOD 4: Human Pattern Validation ===
    // Humans can't maintain perfect acceleration/deceleration patterns
    if (clickIntervals.length >= 8) {
        const recent = clickIntervals.slice(-8);
        
        // Check for unnatural acceleration patterns
        let unnaturalPatterns = 0;
        for (let i = 1; i < recent.length - 1; i++) {
            const ratio = recent[i] / recent[i-1];
            
            // Humans don't have perfectly consistent acceleration/deceleration
            if (ratio < AUTO_CLICK_DETECTION.HUMAN_ACCELERATION_LIMIT || 
                ratio > AUTO_CLICK_DETECTION.HUMAN_DECELERATION_LIMIT) {
                unnaturalPatterns++;
            }
        }
        
        // If more than half the patterns look unnatural
        if (unnaturalPatterns > recent.length / 2) {
            blockClicksFor3sec();
            return true;
        }
    }
    
    // === DETECTION METHOD 5: Variability Check ===
    // Humans have natural variability in click timing
    if (clickIntervals.length >= 10) {
        const recent = clickIntervals.slice(-10);
        const minInterval = Math.min(...recent);
        const maxInterval = Math.max(...recent);
        const variability = maxInterval - minInterval;
        
        // If variability is too low for the speed range, it's suspicious
        const avgInterval = recent.reduce((a, b) => a + b) / recent.length;
        
        if (avgInterval < 100 && variability < AUTO_CLICK_DETECTION.HUMAN_VARIABILITY_MIN) {
            // Too consistent at high speed
            blockClicksFor3sec();
            return true;
        }
        
        if (avgInterval < 200 && variability < AUTO_CLICK_DETECTION.HUMAN_VARIABILITY_MIN * 1.5) {
            // Too consistent at medium speed
            blockClicksFor3sec();
            return true;
        }
    }
    
    // === BURST HANDLING ===
    // Allow occasional bursts of fast clicking
    const fastClicks = clickIntervals.filter(interval => interval < 60).length;
    if (fastClicks > AUTO_CLICK_DETECTION.BURST_ALLOWANCE * 2) {
        // Check time since last burst
        if (now - AUTO_CLICK_DETECTION.lastBurstTime < AUTO_CLICK_DETECTION.BURST_COOLDOWN) {
            // Too many bursts too close together
            blockClicksFor3sec();
            return true;
        } else {
            // Record burst time and allow it
            AUTO_CLICK_DETECTION.lastBurstTime = now;
            
            // Clear some history to prevent cascade detection
            clickIntervals = clickIntervals.slice(-5);
            clickTimes = clickTimes.slice(-5);
        }
    }
    
    return false;
}

function blockClicksFor3sec() {
    clicksBlocked = true;
    blockEndTime = Date.now() + 3000;
    
    // Clear detection data to prevent re-triggering immediately
    clickTimes = [];
    clickIntervals = [];
    lastClickTime = 0;
    
    // Auto-unblock after 3 seconds
    setTimeout(() => {
        clicksBlocked = false;
        // Add a small grace period after unblock
        setTimeout(() => {
            clickTimes = [];
            clickIntervals = [];
            lastClickTime = 0;
        }, 1000);
    }, 3000);
}

function handleActualClick() {
    // Check if clicks are currently blocked
    if (clicksBlocked) {
        return; // Do nothing if blocked
    }
    
    // Enhanced autoclicker detection
    if (detectAutoclicker()) {
        return; // Don't process this click if autoclicker detected
    }
    
    // Rest of your existing click handling code...
    let coinsEarned = gameData.coinsPerClick;
    
    // Apply rebirth multiplier
    const rebirthMultiplier = 1 + (gameData.rebirths * 0.5);
    coinsEarned *= rebirthMultiplier;
    
    // Apply combo multiplier
    updateCombo();
    const comboMultiplier = getComboMultiplier();
    coinsEarned *= comboMultiplier;
    
    // Apply temporary boosts
    if (gameData.tempBoosts.coinsPerClick) {
        coinsEarned *= gameData.tempBoosts.coinsPerClick.multiplier;
    }
    
    // Round to nearest integer
    coinsEarned = Math.floor(coinsEarned);
    
    // Update game data
    gameData.count += coinsEarned;
    gameData.totalClicks++;
    gameData.totalCoinsEarned += coinsEarned;
    
    // Play sound
    playClickSound();
    
    // Show feedback
    showClickFeedback(coinsEarned);
    
    // Update UI
    updateUI();
    saveGameData();
}

// Setup Sound
function setupSound() {
    elements.clickSound.volume = 0.3;
    updateSound();
}

// Update Sound based on current skin
function updateSound() {
    const currentSkin = skins[gameData.equippedSkin];
    if (currentSkin && currentSkin.sound) {
        elements.clickSound.src = currentSkin.sound;
        elements.clickSound.load();
    }
}

// FIXED: Function to update all button images dynamically
function updateAllButtonImages() {
    const currentSkin = skins[gameData.equippedSkin];
    
    if (!currentSkin) return;
    
    // Update main clicker button background
    elements.mainClicker.style.backgroundImage = `url('${currentSkin.skin}')`;
    
    // Update upgrade button image
    const upgradeImg = elements.upgradeBtn.querySelector('img');
    if (upgradeImg) {
        upgradeImg.src = currentSkin.skin;
    }
    
    // Update rebirth button image
    const rebirthImg = elements.rebirthBtn.querySelector('img');
    if (rebirthImg) {
        rebirthImg.src = currentSkin.skin;
    }
}

// Play Click Sound
function playClickSound() {
    if (elements.clickSound.paused) {
        elements.clickSound.play().catch(e => console.log("Audio play failed:", e));
    } else {
        elements.clickSound.currentTime = 0;
    }
}

// Show Click Feedback
function showClickFeedback(amount) {
    const feedback = document.createElement('div');
    feedback.className = 'click-feedback';
    feedback.textContent = `+${formatNumber(amount)}`;
    feedback.style.left = `${Math.random() * 60 + 20}%`;
    feedback.style.top = `${Math.random() * 40 + 30}%`;
    
    elements.clickFeedback.appendChild(feedback);
    
    setTimeout(() => {
        feedback.remove();
    }, 1000);
}

// Handle Upgrade
function handleUpgrade(e) {
    e.preventDefault();
    if (gameData.count >= gameData.upgradeCost) {
        gameData.count -= gameData.upgradeCost;
        gameData.upgradeLevel++;
        gameData.coinsPerClick++;
        
        // Increase upgrade cost
        gameData.upgradeCost = Math.floor(10 * Math.pow(gameData.upgradeLevel, 2)) || 10;
        
        updateUI();
        saveGameData();
        
        // Visual feedback
        elements.upgradeBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            elements.upgradeBtn.style.transform = 'scale(1)';
        }, 100);
    }
}

// Handle Rebirth
function handleRebirth(e) {
    e.preventDefault();
    if (gameData.count >= gameData.rebirthCost) {
        gameData.count = 0;
        gameData.coinsPerClick = 1;
        gameData.upgradeLevel = 0;
        gameData.upgradeCost = 10;
        gameData.rebirths++;
        
        // Increase rebirth cost
        gameData.rebirthCost = Math.floor(1000000 * Math.pow(2, gameData.rebirths));
        
        updateUI();
        saveGameData();
        
        // Visual feedback
        elements.rebirthBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            elements.rebirthBtn.style.transform = 'scale(1)';
        }, 100);
    }
}

// Combo System
function updateCombo() {
    gameData.clickCombo = Math.min(gameData.clickCombo + 1, MAX_COMBO_CLICKS);
    clearTimeout(comboTimeout);
    comboTimeout = setTimeout(() => {
        gameData.clickCombo = 0;
        saveGameData();
        updateUI();
    }, 2000);
}

function getComboMultiplier() {
    return Math.min(Math.floor(gameData.clickCombo / (MAX_COMBO_CLICKS / (MAX_MULTIPLIER - 1))) + 1, MAX_MULTIPLIER) * gameData.comboBoost;
}

// Temporary Boosts
function activateTempBoost(stat, multiplier, duration) {
    gameData.tempBoosts[stat] = {
        multiplier: multiplier,
        endTime: Date.now() + (duration * 1000)
    };
    
    setTimeout(() => {
        delete gameData.tempBoosts[stat];
        updateUI();
        saveGameData();
    }, duration * 1000);
    
    updateUI();
    saveGameData();
}

// Shop Functions
function generateShopItems() {
    const now = Date.now();
    
    // Refresh shop if needed
    if (now - gameData.lastShopRefresh >= gameData.shopRefreshInterval || !gameData.shopItems.length) {
        gameData.shopItems = [];
        gameData.lastShopRefresh = now;
        
        // Select random shop items
        const availableItems = [...shopItemsDB];
        for (let i = 0; i < SHOP_ITEM_COUNT && availableItems.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * availableItems.length);
            const item = availableItems[randomIndex];
            
            gameData.shopItems.push({
                ...item,
                purchased: 0
            });
            
            availableItems.splice(randomIndex, 1);
        }
        
        saveGameData();
    }
    
    updateShopUI();
}

function updateShopUI() {
    const startIndex = gameData.shopPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageItems = gameData.shopItems.slice(startIndex, endIndex);
    
    elements.shopItems.innerHTML = '';
    
    pageItems.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'shop-item';
        
        const actualCost = typeof item.cost === 'function' ? item.cost(gameData) : item.cost;
        const canAfford = gameData.count >= actualCost;
        const canPurchase = item.purchased < item.maxQty;
        
        itemElement.innerHTML = `
            <div class="shop-item-info">
                <div class="shop-item-name">${item.name}</div>
                <div class="shop-item-cost">Cost: ${formatNumber(actualCost)}</div>
                <div class="shop-item-qty">Purchased: ${item.purchased}/${item.maxQty}</div>
            </div>
            <button class="buy-btn" ${!canAfford || !canPurchase ? 'disabled' : ''}>
                ${canPurchase ? 'BUY' : 'SOLD OUT'}
            </button>
        `;
        
        const buyBtn = itemElement.querySelector('.buy-btn');
        if (canPurchase) {
            buyBtn.addEventListener('click', () => buyShopItem(startIndex + index));
        }
        
        elements.shopItems.appendChild(itemElement);
    });
    
    // Update pagination
    elements.shopPage.textContent = `Page ${gameData.shopPage + 1}`;
    elements.shopPrev.disabled = gameData.shopPage === 0;
    elements.shopNext.disabled = endIndex >= gameData.shopItems.length;
}

function buyShopItem(index) {
    const item = gameData.shopItems[index];
    const actualCost = typeof item.cost === 'function' ? item.cost(gameData) : item.cost;
    
    if (gameData.count >= actualCost && item.purchased < item.maxQty) {
        gameData.count -= actualCost;
        item.effect(gameData);
        item.purchased++;
        
        updateUI();
        updateShopUI();
        saveGameData();
    }
}

function forceShopRefresh() {
    if (gameData.count >= 1000) {
        gameData.count -= 1000;
        gameData.lastShopRefresh = 0; // Force refresh
        generateShopItems();
        updateUI();
        saveGameData();
    }
}

function updateShopTimer() {
    const now = Date.now();
    const timeUntilRefresh = gameData.shopRefreshInterval - (now - gameData.lastShopRefresh);
    
    if (timeUntilRefresh <= 0) {
        generateShopItems();
        elements.shopTimer.textContent = 'Refreshing...';
    } else {
        const minutes = Math.floor(timeUntilRefresh / 60000);
        const seconds = Math.floor((timeUntilRefresh % 60000) / 1000);
        elements.shopTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

function changeShopPage(delta) {
    const newPage = gameData.shopPage + delta;
    const maxPage = Math.ceil(gameData.shopItems.length / ITEMS_PER_PAGE) - 1;
    
    if (newPage >= 0 && newPage <= maxPage) {
        gameData.shopPage = newPage;
        updateShopUI();
    }
}

// Skins Functions
function updateSkinsUI() {
    const startIndex = gameData.skinsPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const pageSkins = skins.slice(startIndex, endIndex);
    
    elements.skinsContainer.innerHTML = '';
    
    pageSkins.forEach((skin, index) => {
        const skinIndex = startIndex + index;
        const skinElement = document.createElement('div');
        skinElement.className = `skin-item ${skinIndex === gameData.equippedSkin ? 'equipped' : ''} ${gameData.unlockedSkins.includes(skinIndex) ? '' : 'locked'}`;
        
        skinElement.innerHTML = `
            <img src="${skin.skin}" alt="${skin.name}" class="skin-image">
            <div class="skin-name">${skin.name}</div>
            <div class="skin-cost">${skin.cost === 0 ? 'FREE' : formatNumber(skin.cost)}</div>
        `;
        
        if (gameData.unlockedSkins.includes(skinIndex)) {
            skinElement.addEventListener('click', () => equipSkin(skinIndex));
        } else {
            skinElement.addEventListener('click', () => unlockSkin(skinIndex));
        }
        
        elements.skinsContainer.appendChild(skinElement);
    });
    
    // Update pagination
    elements.skinsPage.textContent = `Page ${gameData.skinsPage + 1}`;
    elements.skinsPrev.disabled = gameData.skinsPage === 0;
    elements.skinsNext.disabled = endIndex >= skins.length;
}

function equipSkin(index) {
    if (gameData.unlockedSkins.includes(index)) {
        gameData.equippedSkin = index;
        updateAllButtonImages(); // FIXED: Update all button images
        updateSound();
        updateSkinsUI();
        saveGameData();
    }
}

function unlockSkin(index) {
    const skin = skins[index];
    if (gameData.count >= skin.cost) {
        gameData.count -= skin.cost;
        gameData.unlockedSkins.push(index);
        equipSkin(index);
        updateUI();
        saveGameData();
    }
}

function changeSkinsPage(delta) {
    const newPage = gameData.skinsPage + delta;
    const maxPage = Math.ceil(skins.length / ITEMS_PER_PAGE) - 1;
    
    if (newPage >= 0 && newPage <= maxPage) {
        gameData.skinsPage = newPage;
        updateSkinsUI();
    }
}

// Update UI
function updateUI() {
    // Format numbers with commas
    elements.coinCounter.textContent = formatNumber(gameData.count);
    elements.comboCounter.textContent = `Combo: ${gameData.clickCombo}x${getComboMultiplier().toFixed(1)}`;
    
    // Update upgrade button
    elements.upgradeCost.textContent = `Cost: ${formatNumber(gameData.upgradeCost)}`;
    elements.upgradeLevel.textContent = `Level: ${gameData.upgradeLevel}`;
    elements.upgradeBtn.disabled = gameData.count < gameData.upgradeCost;
    
    // Update rebirth button
    elements.rebirthCost.textContent = `Cost: ${formatNumber(gameData.rebirthCost)}`;
    elements.rebirthLevel.textContent = `Rebirths: ${gameData.rebirths}`;
    elements.rebirthBtn.disabled = gameData.count < gameData.rebirthCost;
    
    // Update other UI elements
    updateShopTimer();
    updateShopUI();
}

// Format Numbers
function formatNumber(num, decimals = 2) {
    if (num === null || num === undefined || !isFinite(num)) return '0';
    if (num < 1000) return Math.floor(num).toString();

    const suffixes = [
        '', 'K', 'M', 'B', 'T',
        'Qa', 'Qi', 'Sx', 'Sp', 'Oc',
        'N', 'D', 'Ud', 'Dd', 'Td',
        'Qd', 'Qt', 'Sd', 'Ud', 'Dd', // reuse creatively
        'Vt', 'Uv', 'Dv', 'Tv', 'Qtv', 'Qiv'
    ];

    const tier = Math.log10(Math.abs(num)) / 3 | 0;
    if (tier == 0) return Math.floor(num).toString();

    const suffix = suffixes[tier] || `e${tier * 3}`;
    const scaled = num / Math.pow(10, tier * 3);

    return scaled.toFixed(decimals).replace(/\.0+$/, '') + suffix;
}

// Start Coins Per Second
function startCoinsPerSec() {
    if (coinsPerSecInterval) clearInterval(coinsPerSecInterval);
    
    coinsPerSecInterval = setInterval(() => {
        if (gameData.coinsPerSec > 0) {
            let coinsEarned = gameData.coinsPerSec;
            
            // Apply rebirth multiplier
            const rebirthMultiplier = 1 + (gameData.rebirths * 0.5);
            coinsEarned *= rebirthMultiplier;
            
            // Apply temporary boosts
            if (gameData.tempBoosts.coinsPerSec) {
                coinsEarned *= gameData.tempBoosts.coinsPerSec.multiplier;
            }
            
            gameData.count += Math.floor(coinsEarned);
            gameData.totalCoinsEarned += Math.floor(coinsEarned);
            
            updateUI();
            saveGameData();
        }
    }, 1000);
}

// Show Modal
function showModal(modalId) {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    
    document.getElementById(modalId).style.display = 'flex';
}

// Theme Handling
function handleThemeChange() {
    const theme = elements.themeSelect.value;
    document.body.className = theme + '-theme';
    gameData.theme = theme;
    saveGameData();
}

// Save System - FIXED: Includes hasSeenTutorial
function saveGameData() {
    localStorage.setItem('svlkClickerSave', JSON.stringify(gameData));
}

function loadGameData() {
    const saved = localStorage.getItem('svlkClickerSave');
    if (saved) {
        try {
            const loaded = JSON.parse(saved);
            Object.assign(gameData, loaded);
            
            // Backward compatibility: Add hasSeenTutorial if missing
            if (gameData.hasSeenTutorial === undefined) {
                gameData.hasSeenTutorial = true; // Old players have seen tutorial
            }
            
            // Apply theme
            document.body.className = gameData.theme + '-theme';
            elements.themeSelect.value = gameData.theme;
            
        } catch (error) {
            console.error("Error loading save data:", error);
            // Keep default gameData
        }
    }
}

function exportSave() {
    const saveData = JSON.stringify(gameData);
    elements.exportSaveText.value = btoa(saveData);
}

function importSave() {
    try {
        const saveData = atob(elements.importSaveText.value);
        const loaded = JSON.parse(saveData);
        Object.assign(gameData, loaded);
        
        // Apply theme
        document.body.className = gameData.theme + '-theme';
        elements.themeSelect.value = gameData.theme;
        
        // Update images and UI
        updateAllButtonImages();
        updateSound();
        
        updateUI();
        generateShopItems();
        saveGameData();
        alert('Save imported successfully!');
    } catch (error) {
        alert('Invalid save data!');
    }
}

function resetGame() {
    if (confirm('Are you sure you want to reset the game? All progress will be lost!')) {
        localStorage.removeItem('svlkClickerSave');
        location.reload();
    }
}

// Admin Panel
function startAdminHold() {
    adminHoldTimeout = setTimeout(() => {
        isAdminHold = true;
        showModal('adminModal');
    }, 5000);
}

function cancelAdminHold() {
    clearTimeout(adminHoldTimeout);
}

function setupAdminPanel() {
    const adminFields = [
        { id: 'adminCoins', placeholder: 'Coins', setter: (val) => gameData.count = Number(val) },
        { id: 'adminCoinsPerClick', placeholder: 'Coins Per Click', setter: (val) => gameData.coinsPerClick = Number(val) },
        { id: 'adminUpgrades', placeholder: 'Upgrade Level', setter: (val) => gameData.upgradeLevel = Number(val) },
        { id: 'adminUpgradeCost', placeholder: 'Upgrade Cost', setter: (val) => gameData.upgradeCost = Number(val) },
        { id: 'adminRebirths', placeholder: 'Rebirths', setter: (val) => gameData.rebirths = Number(val) },
        { id: 'adminRebirthCost', placeholder: 'Rebirth Cost', setter: (val) => gameData.rebirthCost = Number(val) },
        { id: 'adminComboBoost', placeholder: 'Combo Boost', setter: (val) => gameData.comboBoost = Number(val) },
        { id: 'adminCoinsPerSec', placeholder: 'Coins/sec', setter: (val) => gameData.coinsPerSec = Number(val) },
    ];
    
    adminFields.forEach(field => {
        const fieldElement = document.createElement('div');
        fieldElement.className = 'admin-field';
        
        fieldElement.innerHTML = `
            <input type="number" id="${field.id}" placeholder="${field.placeholder}">
            <button class="admin-set-btn">Set</button>
        `;
        
        const setBtn = fieldElement.querySelector('.admin-set-btn');
        const input = fieldElement.querySelector('input');
        
        setBtn.addEventListener('click', () => {
            field.setter(input.value);
            updateUI();
            saveGameData();
            input.value = '';
        });
        
        elements.adminContainer.appendChild(fieldElement);
    });
    
    // Add utility buttons
    const utilityButtons = [
        { id: 'unlockAllSkins', text: 'Unlock All Skins', action: () => {
            gameData.unlockedSkins = Array.from({ length: skins.length }, (_, i) => i);
            updateAllButtonImages();
            saveGameData();
        }},
        { id: 'forceShopRefresh', text: 'Force Shop Refresh', action: () => {
            gameData.lastShopRefresh = 0;
            generateShopItems();
        }},
        { id: 'give1MCoins', text: 'Give 1M Coins', action: () => {
            gameData.count += 1000000;
            updateUI();
            saveGameData();
        }},
        { id: 'resetTempBoosts', text: 'Reset Temp Boosts', action: () => {
            gameData.tempBoosts = {};
            saveGameData();
        }}
    ];
    
    utilityButtons.forEach(button => {
        const buttonElement = document.createElement('div');
        buttonElement.className = 'admin-field';
        
        buttonElement.innerHTML = `<button class="admin-action-btn">${button.text}</button>`;
        
        buttonElement.querySelector('button').addEventListener('click', button.action);
        
        elements.adminContainer.appendChild(buttonElement);
    });
}

// Tutorial - FIXED: Only shows for new players
function showTutorial() {
    elements.tutorialOverlay.style.display = 'flex';
    document.getElementById('tutorialStep1').style.display = 'block';
}

function nextTutorialStep() {
    const steps = document.querySelectorAll('.tutorial-step');
    let currentStep = -1;
    
    steps.forEach((step, index) => {
        if (step.style.display === 'block') {
            currentStep = index;
            step.style.display = 'none';
        }
    });
    
    if (currentStep < steps.length - 1) {
        steps[currentStep + 1].style.display = 'block';
    } else {
        elements.tutorialOverlay.style.display = 'none';
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', initGame);

// Auto-save every 30 seconds
setInterval(saveGameData, 30000);
