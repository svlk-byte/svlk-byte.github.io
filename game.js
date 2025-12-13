const gameData = {
    count: 0,
    coinsPerClick: 1,
    coinsPerSecPermanent: 0,
    coinsPerSecNonPermanent: 0,
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
    shopRefreshInterval: 600000,
    theme: 'night',
    hasSeenTutorial: false
};

const MAX_COMBO_CLICKS = 100;
const MAX_MULTIPLIER = 3;
const ITEMS_PER_PAGE = 4;
const SHOP_ITEM_COUNT = 4;

let clickTimes = [];
let clicksBlocked = false;
let blockEndTime = 0;

let adminCodeAttempts = 0;
const ADMIN_CODE = "AlbertPidor";
const MAX_ATTEMPTS = 3;
const ADMIN_LOCK_DURATION = 24 * 60 * 60 * 1000;
let adminCodeLocked = false;
let adminCodeLockUntil = 0;

const shopItemsDB = [
    { name: "+1 Coin Per Click", effect: (gd) => gd.coinsPerClick++, cost: (gd) => Math.floor(50 * Math.pow(1.15, gd.coinsPerClick)), maxQty: 100 },
    { name: "+1 Coin/sec", effect: (gd) => gd.coinsPerSecNonPermanent++, cost: (gd) => Math.floor(75 * Math.pow(1.2, gd.coinsPerSecNonPermanent)), maxQty: 150 },
    { name: "+5 Coins Per Click", effect: (gd) => gd.coinsPerClick += 5, cost: (gd) => Math.floor(200 * Math.pow(1.25, gd.coinsPerClick / 5)), maxQty: 50 },
    { name: "+10% Combo Boost", effect: (gd) => gd.comboBoost += 0.1, cost: (gd) => Math.floor(1000 * Math.pow(1.3, gd.comboBoost * 10)), maxQty: 20 },
    { name: "Half Upgrade Cost", effect: (gd) => gd.upgradeCost = Math.max(10, Math.floor(gd.upgradeCost / 2)), cost: (gd) => gd.upgradeCost * 5, maxQty: 10 },
    { name: "Instant 10k Coins", effect: (gd) => gd.count += 10000, cost: () => 7500, maxQty: 5 },
    { name: "Double Coins/sec (5min)", effect: (gd) => activateTempBoost('coinsPerSec', 2, 300), cost: () => 20000, maxQty: 3 },
    { name: "+5 Coin/sec", effect: (gd) => gd.coinsPerSecNonPermanent += 5, cost: (gd) => Math.floor(500 * Math.pow(1.25, gd.coinsPerSecNonPermanent / 5)), maxQty: 75 },
    { name: "Triple Coins Per Click (10min)", effect: (gd) => activateTempBoost('coinsPerClick', 3, 600), cost: () => 50000, maxQty: 2 },
    { name: "Instant 100k Coins", effect: (gd) => gd.count += 100000, cost: () => 75000, maxQty: 5 },
    { name: "+20% Rebirth Bonus", effect: (gd) => gd.rebirths += Math.floor(gd.rebirths * 0.2), cost: (gd) => gd.rebirthCost / 3, maxQty: 5 },
    { name: "Reduce Rebirth Cost by 10%", effect: (gd) => gd.rebirthCost = Math.floor(gd.rebirthCost * 0.9), cost: (gd) => gd.rebirthCost / 2, maxQty: 15 },
    { name: "+25 Coins Per Click", effect: (gd) => gd.coinsPerClick += 25, cost: (gd) => Math.floor(5000 * Math.pow(1.3, gd.coinsPerClick / 25)), maxQty: 25 },
    { name: "Permanent +2 Coins/sec", effect: (gd) => gd.coinsPerSecPermanent += 2, cost: (gd) => 10000 * Math.pow(1.2, gd.coinsPerSecPermanent / 2), maxQty: 50 },
    { name: "Instant 1M Coins", effect: (gd) => gd.count += 1000000, cost: () => 500000, maxQty: 3 },
    { name: "+50 Coins Per Click", effect: (gd) => gd.coinsPerClick += 50, cost: (gd) => Math.floor(25000 * Math.pow(1.35, gd.coinsPerClick / 50)), maxQty: 15 },
    { name: "Quad Coins/sec (15min)", effect: (gd) => activateTempBoost('coinsPerSec', 4, 900), cost: () => 1000000, maxQty: 2 },
    { name: "Reduce Upgrade Cost by 20%", effect: (gd) => gd.upgradeCost = Math.max(10, Math.floor(gd.upgradeCost * 0.8)), cost: (gd) => gd.upgradeCost * 8, maxQty: 5 },
    { name: "Permanent +1% Click Efficiency", effect: (gd) => gd.coinsPerClick *= 1.01, cost: (gd) => 50000 * Math.pow(1.25, gd.coinsPerClick), maxQty: 25 },
    { name: "+10 Coin/sec", effect: (gd) => gd.coinsPerSecNonPermanent += 10, cost: (gd) => Math.floor(10000 * Math.pow(1.3, gd.coinsPerSecNonPermanent / 10)), maxQty: 30 },
    { name: "Instant 5M Coins", effect: (gd) => gd.count += 5000000, cost: () => 2500000, maxQty: 2 },
    { name: "Double Coins Per Click (20min)", effect: (gd) => activateTempBoost('coinsPerClick', 2, 1200), cost: () => 1500000, maxQty: 3 },
    { name: "+100 Coins Per Click", effect: (gd) => gd.coinsPerClick += 100, cost: (gd) => Math.floor(100000 * Math.pow(1.4, gd.coinsPerClick / 100)), maxQty: 10 },
    { name: "Permanent +5% Combo Boost", effect: (gd) => gd.comboBoost += 0.05, cost: (gd) => 75000 * Math.pow(1.35, gd.comboBoost * 20), maxQty: 15 },
    { name: "Instant 10M Coins", effect: (gd) => gd.count += 10000000, cost: () => 5000000, maxQty: 2 },
    { name: "+25 Coin/sec", effect: (gd) => gd.coinsPerSecNonPermanent += 25, cost: (gd) => Math.floor(50000 * Math.pow(1.35, gd.coinsPerSecNonPermanent / 25)), maxQty: 20 },
    { name: "Reduce Rebirth Cost by 25%", effect: (gd) => gd.rebirthCost = Math.floor(gd.rebirthCost * 0.75), cost: (gd) => gd.rebirthCost, maxQty: 5 },
    { name: "Permanent +10 Coins/sec", effect: (gd) => gd.coinsPerSecPermanent += 10, cost: (gd) => 250000 * Math.pow(1.3, gd.coinsPerSecPermanent / 10), maxQty: 15 },
    { name: "Quintuple Coins/sec (30min)", effect: (gd) => activateTempBoost('coinsPerSec', 5, 1800), cost: () => 10000000, maxQty: 1 },
];

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

let comboTimeout;
let coinsPerSecInterval;
let autoSaveInterval;
let adminHoldTimeout;
let isAdminHold = false;
let isClickInProgress = false;
let clickStartTime = 0;

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

function initGame() {
    loadGameData();
    loadAdminLockState();
    setupEventListeners();
    setupAdminCodeListeners();
    setupSound();
    updateAllButtonImages();
    startCoinsPerSec();
    updateShopTimer();
    generateShopItems();
    updateUI();
    setupAdminPanel();

    if (!gameData.hasSeenTutorial) {
        showTutorial();
        gameData.hasSeenTutorial = true;
        saveGameData();
    }
}

function setupEventListeners() {
    elements.mainClicker.addEventListener('mousedown', handleClickStart);
    elements.mainClicker.addEventListener('touchstart', handleClickStart, { passive: true });

    elements.mainClicker.addEventListener('mouseup', handleClickEnd);
    elements.mainClicker.addEventListener('touchend', handleClickEnd);
    elements.mainClicker.addEventListener('mouseleave', handleClickCancel);

    elements.mainClicker.addEventListener('contextmenu', (e) => e.preventDefault());

    elements.upgradeBtn.addEventListener('click', handleUpgrade);
    elements.upgradeBtn.addEventListener('touchstart', handleUpgrade, { passive: true });

    elements.rebirthBtn.addEventListener('click', handleRebirth);
    elements.rebirthBtn.addEventListener('touchstart', handleRebirth, { passive: true });

    document.getElementById('shopBtn').addEventListener('click', () => showModal('shopModal'));
    document.getElementById('skinsBtn').addEventListener('click', () => {
        showModal('skinsModal');
        updateSkinsUI();
    });
    document.getElementById('settingsBtn').addEventListener('click', () => showModal('settingsModal'));

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    elements.themeSelect.addEventListener('change', handleThemeChange);
    elements.exportSave.addEventListener('click', exportSave);
    elements.importSave.addEventListener('click', importSave);
    elements.resetGame.addEventListener('click', resetGame);
    elements.refreshShop.addEventListener('click', forceShopRefresh);

    elements.shopPrev.addEventListener('click', () => changeShopPage(-1));
    elements.shopNext.addEventListener('click', () => changeShopPage(1));
    elements.skinsPrev.addEventListener('click', () => changeSkinsPage(-1));
    elements.skinsNext.addEventListener('click', () => changeSkinsPage(1));

    document.querySelectorAll('.tutorial-next').forEach(btn => {
        btn.addEventListener('click', nextTutorialStep);
    });
}

function handleClickStart(e) {
    if (e.type === 'touchstart') {
        e.preventDefault();
    }
    if (!isClickInProgress) {
        isClickInProgress = true;
        clickStartTime = Date.now();

        elements.mainClicker.style.transform = 'scale(0.98)';
    }
}

function handleClickEnd(e) {
    if (!isClickInProgress) return;

    if (e.type === 'touchend') {
        e.preventDefault();
    };
    isClickInProgress = false;

    const clickDuration = Date.now() - clickStartTime;

    if (clickDuration < 500) {
        handleActualClick();
    }

    elements.mainClicker.style.transform = 'scale(1)';
}

function handleClickCancel() {
    if (isClickInProgress) {
        isClickInProgress = false;
        elements.mainClicker.style.transform = 'scale(1)';
    }
}

const CLICK_THRESHOLD = 5;
const TIME_THRESHOLD = 1000;
const MIN_INTERVAL = 50;
const CONSISTENT_THRESHOLD = 20;
const INTERVAL_TOLERANCE = 5;

function detectAutoclicker() {
    const now = Date.now();
    clickTimes.push(now);

    if (clickTimes.length > Math.max(CLICK_THRESHOLD, CONSISTENT_THRESHOLD)) {
        clickTimes.shift();
    }

    if (clickTimes.length >= CLICK_THRESHOLD) {
        const timeSpan = clickTimes[clickTimes.length - 1] - clickTimes[clickTimes.length - CLICK_THRESHOLD];
        if (timeSpan < TIME_THRESHOLD && (timeSpan / (CLICK_THRESHOLD - 1)) < MIN_INTERVAL) {
            blockClicksFor3sec();
            return true;
        }
    }

    if (clickTimes.length >= CONSISTENT_THRESHOLD) {
        const intervals = clickTimes.slice(-CONSISTENT_THRESHOLD).map((t, i, arr) =>
            i > 0 ? t - arr[i - 1] : null
        ).slice(1);

        const avg = intervals.reduce((a, b) => a + b) / intervals.length;

        if (intervals.every(i => Math.abs(i - avg) <= INTERVAL_TOLERANCE)) {
            blockClicksFor3sec();
            return true;
        }
    }

    return false;
}

function blockClicksFor3sec() {
    clicksBlocked = true;
    blockEndTime = Date.now() + 3000;

    setTimeout(() => {
        clicksBlocked = false;
        clickTimes = [];
    }, 3000);
}

function handleActualClick() {
    if (clicksBlocked) {
        return;
    }

    if (detectAutoclicker()) {
        return;
    }

    let coinsEarned = gameData.coinsPerClick;

    const rebirthMultiplier = 1 + (gameData.rebirths * 0.5);
    coinsEarned *= rebirthMultiplier;

    updateCombo();
    const comboMultiplier = getComboMultiplier();
    coinsEarned *= comboMultiplier;

    if (gameData.tempBoosts.coinsPerClick) {
        coinsEarned *= gameData.tempBoosts.coinsPerClick.multiplier;
    }

    coinsEarned = Math.floor(coinsEarned);

    gameData.count += coinsEarned;
    gameData.totalClicks++;
    gameData.totalCoinsEarned += coinsEarned;

    playClickSound();

    showClickFeedback(coinsEarned);

    updateUI();
    saveGameData();
}

function setupSound() {
    elements.clickSound.volume = 0.3;
    updateSound();
}

function updateSound() {
    const currentSkin = skins[gameData.equippedSkin];
    if (currentSkin && currentSkin.sound) {
        elements.clickSound.src = currentSkin.sound;
        elements.clickSound.load();
    }
}

function updateAllButtonImages() {
    const currentSkin = skins[gameData.equippedSkin];

    if (!currentSkin) return;

    elements.mainClicker.style.backgroundImage = `url('${currentSkin.skin}')`;

    const upgradeImg = elements.upgradeBtn.querySelector('img');
    if (upgradeImg) {
        upgradeImg.src = currentSkin.skin;
    }

    const rebirthImg = elements.rebirthBtn.querySelector('img');
    if (rebirthImg) {
        rebirthImg.src = currentSkin.skin;
    }
}

function playClickSound() {
    if (elements.clickSound.paused) {
        elements.clickSound.play().catch(e => console.log("Audio play failed:", e));
    } else {
        elements.clickSound.currentTime = 0;
    }
}

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

function handleUpgrade(e) {
    e.preventDefault();
    if (gameData.count >= gameData.upgradeCost) {
        gameData.count -= gameData.upgradeCost;
        gameData.upgradeLevel++;
        gameData.coinsPerClick++;

        gameData.upgradeCost = Math.floor(10 * Math.pow(gameData.upgradeLevel, 2)) || 10;

        updateUI();
        saveGameData();

        elements.upgradeBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            elements.upgradeBtn.style.transform = 'scale(1)';
        }, 100);
    }
}

function handleRebirth(e) {
    e.preventDefault();
    if (gameData.count >= gameData.rebirthCost) {
        gameData.count = 0;
        gameData.coinsPerClick = 1;
        gameData.upgradeLevel = 0;
        gameData.upgradeCost = 10;
        gameData.coinsPerSecNonPermanent = 0;
        gameData.rebirths++;

        gameData.rebirthCost = Math.floor(1000000 * Math.pow(2, gameData.rebirths));

        updateUI();
        saveGameData();

        elements.rebirthBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            elements.rebirthBtn.style.transform = 'scale(1)';
        }, 100);
    }
}

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

function generateShopItems() {
    const now = Date.now();

    if (now - gameData.lastShopRefresh >= gameData.shopRefreshInterval || !gameData.shopItems.length) {
        gameData.shopItems = [];
        gameData.lastShopRefresh = now;

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
        gameData.lastShopRefresh = 0;
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

    elements.skinsPage.textContent = `Page ${gameData.skinsPage + 1}`;
    elements.skinsPrev.disabled = gameData.skinsPage === 0;
    elements.skinsNext.disabled = endIndex >= skins.length;
}

function equipSkin(index) {
    if (gameData.unlockedSkins.includes(index)) {
        gameData.equippedSkin = index;
        updateAllButtonImages();
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

function updateUI() {
    elements.coinCounter.textContent = formatNumber(gameData.count);
    elements.comboCounter.textContent = `Combo: ${gameData.clickCombo}x${getComboMultiplier().toFixed(1)}`;

    elements.upgradeCost.textContent = `Cost: ${formatNumber(gameData.upgradeCost)}`;
    elements.upgradeLevel.textContent = `Level: ${formatNumber(gameData.upgradeLevel)}`;
    elements.upgradeBtn.disabled = gameData.count < gameData.upgradeCost;

    elements.rebirthCost.textContent = `Cost: ${formatNumber(gameData.rebirthCost)}`;
    elements.rebirthLevel.textContent = `Rebirths: ${formatNumber(gameData.rebirths)}`;
    elements.rebirthBtn.disabled = gameData.count < gameData.rebirthCost;

    updateShopTimer();
    updateShopUI();
}

function formatNumber(num, decimals = 2) {
    if (num === null || num === undefined || !isFinite(num)) return '0';
    if (num < 1000) return Math.floor(num).toString();

    const suffixes = [
        '', 'K', 'M', 'B', 'T',
        'Qa', 'Qi', 'Sx', 'Sp', 'Oc',
        'N', 'D', 'Ud', 'Dd', 'Td',
        'Qd', 'Qt', 'Sd', 'Ud', 'Dd',
        'Vt', 'Uv', 'Dv', 'Tv', 'Qtv', 'Qiv'
    ];

    const tier = Math.log10(Math.abs(num)) / 3 | 0;
    if (tier == 0) return Math.floor(num).toString();

    const suffix = suffixes[tier] || `e${tier * 3}`;
    const scaled = num / Math.pow(10, tier * 3);

    return scaled.toFixed(decimals).replace(/\.0+$/, '') + suffix;
}

function startCoinsPerSec() {
    if (coinsPerSecInterval) clearInterval(coinsPerSecInterval);

    coinsPerSecInterval = setInterval(() => {
        const totalCPS = gameData.coinsPerSecPermanent + gameData.coinsPerSecNonPermanent;
        
        if (totalCPS > 0) {
            let coinsEarned = totalCPS;

            const rebirthMultiplier = 1 + (gameData.rebirths * 0.5);
            coinsEarned *= rebirthMultiplier;

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

function showModal(modalId) {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });

    document.getElementById(modalId).style.display = 'flex';
}

function handleThemeChange() {
    const theme = elements.themeSelect.value;
    document.body.className = theme + '-theme';
    gameData.theme = theme;
    saveGameData();
}

function saveGameData() {
    localStorage.setItem('svlkClickerSave', JSON.stringify(gameData));
}

function getInitialGameData() {
    return {
        count: 0,
        coinsPerClick: 1,
        coinsPerSecPermanent: 0,
        coinsPerSecNonPermanent: 0,
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
        shopRefreshInterval: 600000,
        theme: 'night',
        hasSeenTutorial: false
    };
}

function loadGameData() {
    const saved = localStorage.getItem('svlkClickerSave');
    if (saved) {
        try {
            const loaded = JSON.parse(saved);

            if (loaded.coinsPerSec !== undefined && loaded.coinsPerSecPermanent === undefined) {
                loaded.coinsPerSecNonPermanent = loaded.coinsPerSec || 0;
                loaded.coinsPerSecPermanent = 0;

                delete loaded.coinsPerSec;
            }
            
            if (loaded.coinsPerSecPermanent === undefined) {
                loaded.coinsPerSecPermanent = 0;
            }
            if (loaded.coinsPerSecNonPermanent === undefined) {
                loaded.coinsPerSecNonPermanent = 0;
            }
            
            const initialData = getInitialGameData();
            Object.keys(gameData).forEach(key => {
                delete gameData[key];
            });
            Object.assign(gameData, initialData, loaded);

            if (gameData.hasSeenTutorial === undefined) {
                gameData.hasSeenTutorial = true;
            }

            document.body.className = gameData.theme + '-theme';
            elements.themeSelect.value = gameData.theme;

        } catch (error) {
            console.error("Error loading save data:", error);

            const initialData = getInitialGameData();
            Object.keys(gameData).forEach(key => {
                delete gameData[key];
            });
            Object.assign(gameData, initialData);
        }
    } else {
        const initialData = getInitialGameData();
        Object.keys(gameData).forEach(key => {
            delete gameData[key];
        });
        Object.assign(gameData, initialData);
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

        document.body.className = gameData.theme + '-theme';
        elements.themeSelect.value = gameData.theme;

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
        if (autoSaveInterval) {
            clearInterval(autoSaveInterval);
        }
        
        const initialData = getInitialGameData();
        Object.keys(gameData).forEach(key => {
            delete gameData[key];
        });
        Object.assign(gameData, initialData);
        
        localStorage.removeItem('svlkClickerSave');
        
        saveGameData();
        
        setTimeout(() => {
            location.reload();
        }, 50);
    }
}

function saveAdminLockState() {
    const lockState = {
        locked: adminCodeLocked,
        lockUntil: adminCodeLockUntil
    };
    localStorage.setItem('svlkAdminLock', JSON.stringify(lockState));
}

function loadAdminLockState() {
    const saved = localStorage.getItem('svlkAdminLock');
    if (saved) {
        try {
            const lockState = JSON.parse(saved);
            const now = Date.now();
            
            if (lockState.lockUntil && now < lockState.lockUntil) {
                adminCodeLocked = lockState.locked;
                adminCodeLockUntil = lockState.lockUntil;
            } else {
                adminCodeLocked = false;
                adminCodeLockUntil = 0;
                saveAdminLockState();
            }
        } catch (error) {
            console.error("Error loading admin lock state:", error);
        }
    }
}

function setupAdminCodeListeners() {
    elements.coinCounter.addEventListener('mousedown', startAdminCodeHold);
    elements.coinCounter.addEventListener('touchstart', startAdminCodeHold);
    elements.coinCounter.addEventListener('mouseup', cancelAdminCodeHold);
    elements.coinCounter.addEventListener('touchend', cancelAdminCodeHold);
    elements.coinCounter.addEventListener('mouseleave', cancelAdminCodeHold);

    document.getElementById('submitAdminCode').addEventListener('click', submitAdminCode);
    document.getElementById('adminCodeInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitAdminCode();
        }
    });

    document.querySelector('#adminCodeModal .close-modal').addEventListener('click', () => {
        document.getElementById('adminCodeModal').style.display = 'none';
        resetCodeInput();
    });
}

function startAdminCodeHold() {
    loadAdminLockState();
    
    adminHoldTimeout = setTimeout(() => {
        if (!adminCodeLocked || Date.now() > adminCodeLockUntil) {
            showAdminCodeModal();
        }
    }, 5000);
}

function cancelAdminCodeHold() {
    clearTimeout(adminHoldTimeout);
}

function showAdminCodeModal() {
    loadAdminLockState();
    
    if (adminCodeLocked && Date.now() < adminCodeLockUntil) {
        const remainingTime = Math.ceil((adminCodeLockUntil - Date.now()) / 1000);
        const hours = Math.floor(remainingTime / 3600);
        const minutes = Math.floor((remainingTime % 3600) / 60);
        const seconds = remainingTime % 60;
        alert(`Admin access locked. Try again in ${hours}h ${minutes}m ${seconds}s.`);
        return;
    }

    document.getElementById('adminCodeModal').style.display = 'flex';
    document.getElementById('adminCodeInput').focus();
    document.getElementById('codeError').textContent = '';
}

function submitAdminCode() {
    const codeInput = document.getElementById('adminCodeInput');
    const errorElement = document.getElementById('codeError');
    const enteredCode = codeInput.value;

    loadAdminLockState();

    if (adminCodeLocked && Date.now() < adminCodeLockUntil) {
        const remainingTime = Math.ceil((adminCodeLockUntil - Date.now()) / 1000);
        const hours = Math.floor(remainingTime / 3600);
        const minutes = Math.floor((remainingTime % 3600) / 60);
        const seconds = remainingTime % 60;
        errorElement.textContent = `Locked. Try again in ${hours}h ${minutes}m ${seconds}s.`;
        return;
    }

    if (enteredCode === ADMIN_CODE) {
        adminCodeAttempts = 0;
        adminCodeLocked = false;
        adminCodeLockUntil = 0;
        saveAdminLockState();
        document.getElementById('adminCodeModal').style.display = 'none';
        resetCodeInput();
        showModal('adminModal');
    } else {
        adminCodeAttempts++;
        errorElement.textContent = `Incorrect code. Attempts: ${adminCodeAttempts}/${MAX_ATTEMPTS}`;

        codeInput.classList.add('vibrate');
        setTimeout(() => {
            codeInput.classList.remove('vibrate');
        }, 300);

        codeInput.value = '';
        codeInput.focus();

        if (adminCodeAttempts >= MAX_ATTEMPTS) {
            adminCodeLocked = true;
            adminCodeLockUntil = Date.now() + ADMIN_LOCK_DURATION;
            saveAdminLockState();
            const hours = Math.floor(ADMIN_LOCK_DURATION / (1000 * 60 * 60));
            errorElement.textContent = `Too many attempts! Locked for ${hours} hours.`;
            codeInput.disabled = true;
        }
    }
}

function resetCodeInput() {
    document.getElementById('adminCodeInput').value = '';
    document.getElementById('codeError').textContent = '';
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
        { id: 'adminCoinsPerSecPermanent', placeholder: 'Coins/sec (Permanent)', setter: (val) => gameData.coinsPerSecPermanent = Number(val) },
        { id: 'adminCoinsPerSecNonPermanent', placeholder: 'Coins/sec (Non-Permanent)', setter: (val) => gameData.coinsPerSecNonPermanent = Number(val) },
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

    const utilityButtons = [
        {
            id: 'unlockAllSkins', text: 'Unlock All Skins', action: () => {
                gameData.unlockedSkins = Array.from({ length: skins.length }, (_, i) => i);
                updateAllButtonImages();
                saveGameData();
            }
        },
        {
            id: 'forceShopRefresh', text: 'Force Shop Refresh', action: () => {
                gameData.lastShopRefresh = 0;
                generateShopItems();
            }
        },
        {
            id: 'give1MCoins', text: 'Give 1M Coins', action: () => {
                gameData.count += 1000000;
                updateUI();
                saveGameData();
            }
        },
        {
            id: 'resetTempBoosts', text: 'Reset Temp Boosts', action: () => {
                gameData.tempBoosts = {};
                saveGameData();
            }
        }
    ];

    utilityButtons.forEach(button => {
        const buttonElement = document.createElement('div');
        buttonElement.className = 'admin-field';

        buttonElement.innerHTML = `<button class="admin-action-btn">${button.text}</button>`;

        buttonElement.querySelector('button').addEventListener('click', button.action);

        elements.adminContainer.appendChild(buttonElement);
    });
}

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

document.addEventListener('DOMContentLoaded', initGame);

autoSaveInterval = setInterval(saveGameData, 30000);
