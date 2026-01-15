// 메뉴 데이터 저장 변수
let menuData = [];
let isSpinning = false;
let history = [];
let historyCounter = 0;
let favorites = new Set();
let lastSelectedMenus = [];

// DOM 요소
const spinBtn = document.getElementById('spinBtn');
const historyList = document.getElementById('historyList');
const menuCountEl = document.getElementById('menuCount');
const probToggleBtn = document.getElementById('probToggle');
const probDetails = document.getElementById('probDetails');
const favoritesList = document.getElementById('favoritesList');
const favoritesCount = document.getElementById('favoritesCount');
const slotFavoriteButtons = document.querySelectorAll('.favorite-button[data-slot]');
const reels = [
    document.getElementById('reel1'),
    document.getElementById('reel2'),
    document.getElementById('reel3')
];

// 초기화
document.addEventListener('DOMContentLoaded', async () => {
    await loadMenuData();
    spinBtn.addEventListener('click', spin);
    if (probToggleBtn && probDetails) {
        probToggleBtn.addEventListener('click', toggleProbabilityDetails);
    }
    slotFavoriteButtons.forEach((button) => {
        button.addEventListener('click', handleSlotFavoriteClick);
    });
    historyList.addEventListener('click', handleHistoryFavoriteClick);
    loadHistory();
    loadFavorites();
});

function toggleProbabilityDetails() {
    const isExpanded = probToggleBtn.getAttribute('aria-expanded') === 'true';
    const nextState = !isExpanded;

    probToggleBtn.setAttribute('aria-expanded', String(nextState));
    probDetails.hidden = !nextState;
}

function loadFavorites() {
    const saved = localStorage.getItem('favoriteMenus');
    if (!saved) {
        renderFavorites();
        return;
    }

    try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
            favorites = new Set(parsed);
        }
    } catch (error) {
        console.error('즐겨찾기 로드 실패:', error);
    }

    renderFavorites();
}

function saveFavorites() {
    localStorage.setItem('favoriteMenus', JSON.stringify([...favorites]));
}

function toggleFavorite(menuName) {
    if (!menuName) return;

    if (favorites.has(menuName)) {
        favorites.delete(menuName);
    } else {
        favorites.add(menuName);
    }

    saveFavorites();
    renderFavorites();
    updateSlotFavoriteButtons();
    renderHistory(false);
}

function isFavorite(menuName) {
    return favorites.has(menuName);
}

function handleSlotFavoriteClick(event) {
    const slotIndex = Number(event.currentTarget.dataset.slot);
    const targetMenu = lastSelectedMenus[slotIndex];
    if (!targetMenu) return;

    toggleFavorite(targetMenu);
}

function handleHistoryFavoriteClick(event) {
    const button = event.target.closest('.history-favorite-button');
    if (!button) return;

    const menuName = button.dataset.menu;
    toggleFavorite(menuName);
}

// 메뉴 데이터 로드
async function loadMenuData() {
    try {
        const response = await fetch('menu_data.json');
        const data = await response.json();
        menuData = data.메뉴 || data.menu || [];
        menuCountEl.textContent = menuData.length.toLocaleString();
        console.log(`${menuData.length}개의 메뉴를 로드했습니다.`);
    } catch (error) {
        console.error('메뉴 데이터 로드 실패:', error);
        // 폴백: menu_data.js 시도
        try {
            const script = document.createElement('script');
            script.src = 'menu_data.js';
            document.head.appendChild(script);
            script.onload = () => {
                if (typeof menuList !== 'undefined') {
                    menuData = menuList;
                    menuCountEl.textContent = menuData.length.toLocaleString();
                }
            };
        } catch (e) {
            console.error('menu_data.js 로드도 실패:', e);
        }
    }
}

// 랜덤 메뉴 선택 (중복 없이 3개)
function getRandomMenus(count = 3) {
    if (menuData.length < count) {
        return menuData.slice(0, count);
    }

    const shuffled = [...menuData].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

// 스핀 애니메이션
async function spin() {
    if (isSpinning || menuData.length === 0) return;

    isSpinning = true;
    spinBtn.disabled = true;
    spinBtn.classList.add('spinning');
    spinBtn.querySelector('.button-text').textContent = '🎰 추천 중...';

    const selectedMenus = getRandomMenus(3);

    // 각 릴에 대해 슬롯 애니메이션 실행
    const spinPromises = reels.map((reel, index) => {
        return spinReel(reel, selectedMenus[index], index);
    });

    await Promise.all(spinPromises);

    // 결과 처리
    lastSelectedMenus = [...selectedMenus];
    updateSlotFavoriteButtons();
    addToHistory(selectedMenus);

    isSpinning = false;
    spinBtn.disabled = false;
    spinBtn.classList.remove('spinning');
    spinBtn.querySelector('.button-text').textContent = '🎰 다시 추천받기!';
}

// 개별 릴 스핀 애니메이션
function spinReel(reel, finalMenu, delayIndex) {
    return new Promise((resolve) => {
        const spinDuration = 2000 + (delayIndex * 500); // 각 릴마다 딜레이
        const intervalTime = 50; // 50ms마다 메뉴 변경
        const totalIterations = Math.floor(spinDuration / intervalTime);

        let iteration = 0;

        // 스핀 사운드 효과 없이 시각적 효과만
        const interval = setInterval(() => {
            iteration++;

            // 랜덤 메뉴 표시 (점점 느려짐)
            const randomMenu = menuData[Math.floor(Math.random() * menuData.length)];
            reel.innerHTML = `<div class="slot-item"><span class="slot-item-text">${randomMenu}</span></div>`;

            // 속도 점점 감소
            const progress = iteration / totalIterations;
            if (progress > 0.8) {
                clearInterval(interval);

                // 마지막 몇 번의 느린 스핀
                slowFinish(reel, finalMenu, resolve);
            }
        }, intervalTime);
    });
}

// 느린 마무리 애니메이션
function slowFinish(reel, finalMenu, resolve) {
    const slowSpins = 5;
    let count = 0;

    const slowInterval = setInterval(() => {
        count++;

        if (count < slowSpins) {
            const randomMenu = menuData[Math.floor(Math.random() * menuData.length)];
            reel.innerHTML = `<div class="slot-item"><span class="slot-item-text">${randomMenu}</span></div>`;
        } else {
            clearInterval(slowInterval);
            // 최종 결과 표시
            reel.innerHTML = `<div class="slot-item final"><span class="slot-item-text">${finalMenu}</span></div>`;
            resolve();
        }
    }, 150 + (count * 50)); // 점점 느려짐
}

// 히스토리에 추가
function addToHistory(menus) {
    historyCounter++;
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const historyItem = {
        id: historyCounter,
        menus: menus,
        time: timeString
    };

    history.unshift(historyItem);

    // 최대 10개만 유지
    if (history.length > 10) {
        history.pop();
    }

    // 로컬 스토리지에 저장
    saveHistory();

    // UI 업데이트 (애니메이션 효과 적용, 새로 추가된 메뉴 전달)
    renderHistory(true, menus);
}

// 히스토리 렌더링
function renderHistory(animateNew = false, newMenus = []) {
    if (history.length === 0) {
        historyList.innerHTML = '<p class="history-empty">아직 추천받은 메뉴가 없습니다.</p>';
        return;
    }

    // 새로 추가된 메뉴 세트 (중복 비교용)
    const newMenuSet = new Set(newMenus);

    historyList.innerHTML = history.map((item, index) => {
        // 첫 번째 항목(새로 추가된 항목)은 중복 체크 건너뜀
        const isNewEntry = index === 0 && animateNew;

        return `
        <div class="history-item ${isNewEntry ? 'new-entry' : ''}">
            <div class="history-number">${item.id}</div>
            <div class="history-menus">
                ${item.menus.map(menu => {
            // 새로 추가된 항목이 아니고, 새 메뉴와 중복되는 경우 표시
            const isDuplicate = !isNewEntry && newMenuSet.has(menu);
            const isSaved = isFavorite(menu);
            return `
                <span class="history-menu-tag ${isDuplicate ? 'duplicate' : ''}">
                    <span class="history-menu-name">${menu}</span>
                    <button class="history-favorite-button ${isSaved ? 'active' : ''}" data-menu="${menu}"
                        type="button" aria-label="${menu} 즐겨찾기">
                        ${isSaved ? '★' : '☆'}
                    </button>
                </span>
            `;
        }).join('')}
            </div>
            <div class="history-time">${item.time}</div>
        </div>
    `;
    }).join('');
}

function renderFavorites() {
    const favoriteItems = [...favorites];
    favoritesCount.textContent = favoriteItems.length.toString();

    if (favoriteItems.length === 0) {
        favoritesList.innerHTML = '<p class="favorites-empty">즐겨찾기한 메뉴가 없습니다.</p>';
        return;
    }

    favoritesList.innerHTML = favoriteItems.map((menu) => {
        return `
            <div class="favorite-item">
                <span class="favorite-name">${menu}</span>
                <button class="favorite-remove" type="button" data-menu="${menu}" aria-label="${menu} 즐겨찾기 해제">
                    ★
                </button>
            </div>
        `;
    }).join('');

    favoritesList.querySelectorAll('.favorite-remove').forEach((button) => {
        button.addEventListener('click', () => {
            toggleFavorite(button.dataset.menu);
        });
    });
}

function updateSlotFavoriteButtons() {
    slotFavoriteButtons.forEach((button) => {
        const slotIndex = Number(button.dataset.slot);
        const menuName = lastSelectedMenus[slotIndex];
        const isSaved = menuName ? isFavorite(menuName) : false;

        button.classList.toggle('active', isSaved);
        button.querySelector('.favorite-icon').textContent = isSaved ? '★' : '☆';
        button.setAttribute('aria-label', menuName ? `${menuName} 즐겨찾기` : '추천 결과 즐겨찾기');
    });
}

// 히스토리 로컬 스토리지 저장
function saveHistory() {
    localStorage.setItem('menuHistory', JSON.stringify(history));
    localStorage.setItem('menuHistoryCounter', historyCounter.toString());
}

// 히스토리 로컬 스토리지에서 로드
function loadHistory() {
    const saved = localStorage.getItem('menuHistory');
    const savedCounter = localStorage.getItem('menuHistoryCounter');

    if (saved) {
        history = JSON.parse(saved);
        historyCounter = parseInt(savedCounter) || 0;
        renderHistory(false);
    }
}
