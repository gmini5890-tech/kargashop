// ==========================================================================
// 🚀 ЧАСТЬ 1: ИНИЦИАЛИЗАЦИЯ И СИСТЕМНЫЙ СТЕЙТ (АВТОРИЗАЦИЯ И ЗАЩИТА)
// ==========================================================================

// 👑 ВПИШИТЕ СЮДА РЕАЛЬНЫЕ TELEGRAM ID ДВУХ АДМИНОВ ЧЕРЕЗ ЗАПЯТУЮ:
const ADMIN_TELEGRAM_IDS = []; 
const tgApp = window.Telegram?.WebApp;

if (tgApp) { 
    tgApp.ready(); 
    tgApp.expand(); 
}

// Данные текущего пользователя (из Telegram или локальная эмуляция для ПК)
let currentUser = {
    id: tgApp?.initDataUnsafe?.user?.id || 999999, 
    username: tgApp?.initDataUnsafe?.user?.username || "local_user",
    name: tgApp?.initDataUnsafe?.user?.first_name || "Покупатель"
};

// Глобальные массивы корзины и базы данных заказов
let cartState = JSON.parse(localStorage.getItem('gayer_cart_session')) || [];
let globalOrdersBase = JSON.parse(localStorage.getItem('gayer_global_orders')) || [];

// Вспомогательные переменные для навигации каталога
let activeTargetProduct = null; 
let navigationHistoryStack = []; 
let currentActivePillTag = 'all';
let isClientHistoryExpanded = false;

// Системное сохранение корзины в память браузера
function saveCartToLocalStorage() { 
    localStorage.setItem('gayer_cart_session', JSON.stringify(cartState)); 
    renderCartScreenDOM(); 
}

// Функция проверки роли пользователя (админ или покупатель)
function isUserAdmin() {
    const isStrictAdmin = ADMIN_TELEGRAM_IDS.includes(Number(currentUser.id));
    return isStrictAdmin || window.location.pathname.includes('admin.html');
}

// 🛡️ ЖЕСТКАЯ ЗАЩИТА ПРИВАТНОГО БОТА (Блокирует экран не-админам только на admin.html)
function verifyPrivateAdminAccess() {
    const isStrictAdmin = ADMIN_TELEGRAM_IDS.includes(Number(currentUser.id));
    const isInsideAdminPage = window.location.pathname.endsWith('admin.html') || window.location.pathname.includes('/admin.html');
    
    if (isInsideAdminPage && !isStrictAdmin) {
        document.body.innerHTML = '<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; width:100vw; background:#000; color:#ef4444; font-family:sans-serif; text-align:center; padding:20px; box-sizing:border-box;"><span style="font-size:50px; margin-bottom:10px;">⛔</span><h1 style="font-size:20px; margin-bottom:8px; font-weight:800; color:#ef4444 !important;">ДОСТУП ЗАПРЕЩЕН</h1><p style="color:#71717a; font-size:13px; max-width:300px; line-height:1.5;">Ваш Telegram ID не зарегистрирован в списке администраторов GayerShop.</p></div>';
        throw new Error("Access denied: User is not an admin.");
    }
}
// ==========================================================================
// 🗂 ЧАСТЬ 2: ЕДИНАЯ БАЗА ДАННЫХ ВСЕХ ЦИФРОВЫХ ТОВАРОВ (ТОВАРЫ МАГАЗИНА)
// ==========================================================================

const dataProducts = {
    tg_subscribers: [
        { id: "tg_sub_30", name: "⭐️ Telegram Подписчики [30 дней без списаний]", price: 0.067, min: 10, countable: true, img: "boostsub30d.png", tag: "tg" },
        { id: "tg_sub_1", name: "⭐️ Telegram Подписчики [1-3 дня без списаний]", price: 0.03, min: 100, countable: true, img: "boostsub3d.png", tag: "tg" },
        { id: "tg_sub_7", name: "⭐️ Telegram Подписчики [7 дней без списаний]", price: 0.042, min: 10, countable: true, img: "boostsub7d.png", tag: "tg" }
    ],
    tg_reactions: [
        { id: "tg_react_pos", name: "Telegram Позитивные Реакции [❤️‍🔥 🔥 💯 🎉]", price: 0.003, min: 50, countable: true, img: "reaction.png", tag: "tg" },
        { id: "tg_react_mix", name: "Telegram Реакция [👍❤️🔥🎉]", price: 0.003, min: 50, countable: true, img: "reaction.png", tag: "tg" },
        { id: "tg_react_emo", name: "Одна любая реакция в телеграмм (выбор эмодзи)", price: 0.004, min: 50, countable: true, img: "reaction3d.png", hasEmojiSelect: true, tag: "tg" }
    ],
    tg_boosts: [
        { id: "tg_boost_3", name: "🚀 Бусты для канала (1-3 дня)", price: 2.2, min: 1, countable: true, img: "boost3d.png", tag: "tg" },
        { id: "tg_boost_7", name: "🚀 Бусты для канала (7 дней)", price: 5.0, min: 1, countable: true, img: "boost7d.png", tag: "tg" },
        { id: "tg_boost_30", name: "🚀 Бусты для канала (30 дней)", price: 22.0, min: 1, countable: true, img: "boost30d.png", tag: "tg" }
    ],
    tg_spamblock: [
        { id: "tg_spam", name: "⚙️ Снятие Spamblock Telegram", price: 90.0, min: 1, countable: false, img: "spamblock.png", tag: "tg" }
    ],
    tiktok: [
        { id: "tt_sub", name: "👥 TikTok Подписчики [Без гарантии⛔️]", price: 1.5, min: 50, countable: true, img: "tiktok_sub.png", tag: "tiktok" },
        { id: "tt_view_no", name: "📥 TikTok Просмотры [Без гарантии ⛔️]", price: 0.001, min: 100, countable: true, img: "tiktok_eye.png", tag: "tiktok" },
        { id: "tt_view_yes", name: "⭐️ TikTok Просмотры [Без списаний]", price: 0.009, min: 100, countable: true, img: "tiktok_eye.png", tag: "tiktok" },
        { id: "tt_like_no", name: "⭐️ TikTok Лайки [Без гарантии⛔️]", price: 0.04, min: 10, countable: true, img: "tiktok_like.png", tag: "tiktok" },
        { id: "tt_like_yes", name: "⭐️ TikTok Лайки {Гарантия 30 дней}", price: 0.09, min: 10, countable: true, img: "tiktok_like.png", tag: "tiktok" },
        { id: "tt_save", name: "TikTok Сохранения [Без списаний ♻️]", price: 0.0019, min: 50, countable: true, img: "tiktok_save.png", tag: "tiktok" },
        { id: "tt_repost", name: "TikTok Репосты", price: 0.03, min: 10, countable: true, img: "tiktok_repost.png", tag: "tiktok" }
    ],
    vk: [
        { id: "vk_votes", name: "🎟 Голоса VK", price: 10.0, min: 1, countable: true, img: "vk.png", tag: "vk" },
        { id: "vk_views", name: "👁 Просмотры VK", price: 0.04, min: 1, countable: true, img: "vk_eye.png", tag: "vk" },
        { id: "vk_likes", name: "❤️ Лайки VK", price: 0.05, min: 1, countable: true, img: "vk_like.png", tag: "vk" },
        { id: "vk_sub", name: "👥 Подписчики VK", price: 0.11, min: 1, countable: true, img: "vk_sub.png", tag: "vk" }
    ],
    ai: [ { id: "ai_gemini", name: "🤖 GOOGLE GEMINI PRO | Подписка на 18 месяцев", price: 69.0, min: 1, countable: false, img: "gemini.png", tag: "soft" } ],
    promo: [
        { id: "p_recom", name: "🥰 📥 КАК ПОПАСТЬ В РЕКОМЕНДАЦИИ В TIKTOK", price: 15.0, min: 1, countable: false, img: "rekom.png", isUniquePromo: true, tag: "soft" },
        { id: "p_mini", name: "🔥 ТИКТОК НАКРУТКА ПАК МИНИМАЛИСТИК", price: 90.0, min: 1, countable: false, img: "minimalistic.png", tag: "soft" }
    ],
    soft: [ { id: "soft_win", name: "💻 АКТИВАЦИЯ WINDOWS 10-11 (ЛЮБАЯ!)", price: 100.0, min: 1, countable: false, img: "windows.png", tag: "soft" } ]
};

const tgFolders = [
    { name: "👥 Подписчики", id: "tg_subscribers" },
    { name: "🔥 Реакции", id: "tg_reactions" },
    { name: "🚀 Бусты", id: "tg_boosts" },
    { name: "⚙️ Снятие Spamblock", id: "tg_spamblock" }
];
// ==========================================================================
// 🚀 ЧАСТЬ 3: НАВИГАЦИЯ, ВКЛАДКИ И СТРУКТУРА КАТАЛОГА
// ==========================================================================

function navigateTabBar(screen, tabNode) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active')); 
    if (tabNode) tabNode.classList.add('active');
    
    const fields = ['screen_welcome', 'screen_catalog', 'screen_cart', 'screen_crm'];
    fields.forEach(f => {
        const el = document.getElementById(f);
        if (el) el.style.display = f === ("screen_" + screen) ? 'block' : 'none';
    });
    
    if (screen === 'catalog') { 
        navigationHistoryStack = []; 
        executeSwitchCatalogDOM('1'); 
    }
    if (screen === 'cart') renderCartScreenDOM(); 
    if (screen === 'crm') renderCrmScreenDOM();
}

function executeCatalogBackNavigation() { 
    if (navigationHistoryStack.length > 0) { 
        let prev = navigationHistoryStack.pop(); 
        executeSwitchCatalogDOM(prev.name, prev.key); 
    } 
}

function openCatalogLevel2(key) { navigationHistoryStack.push({name: '1', key: null}); executeSwitchCatalogDOM('2_social'); }
function openCatalogLevel3(key) { navigationHistoryStack.push({name: '2_social', key: null}); executeSwitchCatalogDOM('3_tg_folders'); }
function openCatalogLevelFinal(keyData) {
    if (['ai', 'promo', 'soft'].includes(keyData)) { 
        navigationHistoryStack.push({name: '1', key: null}); 
    } else { 
        let name = (activeTargetProduct === 'tg') ? '3_tg_folders' : '2_social'; 
        navigationHistoryStack.push({name: name, key: activeTargetProduct}); 
    }
    executeSwitchCatalogDOM('final_products', keyData);
}
// ==========================================================================
// 🚀 ЧАСТЬ 4: ДИНАМИЧЕСКИЙ SWITCH КАТАЛОГА (ОТРИСОВКА ИКОНОК И ТОВАРОВ)
// ==========================================================================

function executeSwitchCatalogDOM(levelName, keyData = null) {
    const lvl1 = document.getElementById('catalog_level_1'); 
    const lvl2 = document.getElementById('catalog_level_2_social');
    const lvl3 = document.getElementById('catalog_level_3_tg_folders'); 
    const lvlFinal = document.getElementById('catalog_level_final_products');
    const backBtn = document.getElementById('customCatalogBackBtn');
    
    if (lvl1) lvl1.style.display = levelName === '1' ? 'flex' : 'none'; 
    if (lvl2) lvl2.style.display = levelName === '2_social' ? 'grid' : 'none';
    if (lvl3) lvl3.style.display = levelName === '3_tg_folders' ? 'flex' : 'none'; 
    if (lvlFinal) lvlFinal.style.display = levelName === 'final_products' ? 'grid' : 'none';
    if (backBtn) backBtn.style.display = levelName === '1' ? 'none' : 'flex';
    
    if (levelName === '2_social') activeTargetProduct = 'social';
    
    if (levelName === '3_tg_folders' && lvl3) {
        activeTargetProduct = 'tg'; 
        lvl3.innerHTML = '';
        tgFolders.forEach(folder => {
            const block = document.createElement('div'); 
            block.className = 'card'; 
            block.style = "padding: 18px; flex-direction: row; justify-content: space-between; align-items: center; font-size: 12px; background: #18181b; margin-bottom: 8px;";
            
            const titleSpan = document.createElement('span');
            titleSpan.innerText = folder.name;
            
            const arrowSpan = document.createElement('span');
            arrowSpan.style.color = '#2563eb';
            arrowSpan.innerText = '→';
            
            block.appendChild(titleSpan);
            block.appendChild(arrowSpan);
            block.onclick = function() { 
                if (folder.id === 'tg_spamblock') openOrderCalculationModal(dataProducts.tg_spamblock[0]); 
                else openCatalogLevelFinal(folder.id); 
            }; 
            lvl3.appendChild(block);
        });
    }
    
    if (levelName === 'final_products' && lvlFinal) {
        lvlFinal.innerHTML = ''; 
        let arr = dataProducts[keyData] || [];
        arr.forEach(prod => {
            const item = document.createElement('div'); 
            item.className = 'card';
            
            const imgBlock = document.createElement('div');
            imgBlock.style = "text-align:center; padding:0; background:#27272a; border-bottom:1px solid rgba(37, 99, 235, 0.15); line-height:0;";
            const img = document.createElement('img');
            img.src = prod.img;
            img.style = "width:100%; height:140px; object-fit:cover; display:block;";
            imgBlock.appendChild(img);
            
            const infoBlock = document.createElement('div');
            infoBlock.className = 'card-info';
            
            const title = document.createElement('div');
            title.className = 'title';
            title.innerText = prod.name;
            
            const priceRow = document.createElement('div');
            priceRow.className = 'price-row';
            const price = document.createElement('div');
            price.className = 'price';
            price.innerText = prod.price + " ₽";
            const badge = document.createElement('div');
            badge.className = 'add-badge';
            badge.innerText = '+';
            
            priceRow.appendChild(price);
            priceRow.appendChild(badge);
            infoBlock.appendChild(title);
            infoBlock.appendChild(priceRow);
            
            item.appendChild(imgBlock);
            item.appendChild(infoBlock);
            item.onclick = function() { openOrderCalculationModal(prod); }; 
            lvlFinal.appendChild(item);
        });
    }
}
// ==========================================================================
// 🚀 ЧАСТЬ 5: ПОИСК, ФИЛЬТРЫ И ЛАЙВ-КАЛЬКУЛЯТОР МОДАЛЬНОГО ОКНА
// ==========================================================================

function handleLiveCatalogSearchAndFilter() {
    let searchQuery = document.getElementById('catalogSearchInput')?.value.toLowerCase().trim() || '';
    if (searchQuery === '') return;
    const lvl1 = document.getElementById('catalog_level_1'); 
    const lvl2 = document.getElementById('catalog_level_2_social');
    const lvl3 = document.getElementById('catalog_level_3_tg_folders'); 
    const lvlFinal = document.getElementById('catalog_level_final_products');
    const backBtn = document.getElementById('customCatalogBackBtn');
    
    if (lvl1) lvl1.style.display = 'none'; 
    if (lvl2) lvl2.style.display = 'none'; 
    if (lvl3) lvl3.style.display = 'none';
    if (lvlFinal) { lvlFinal.style.display = 'grid'; lvlFinal.innerHTML = ''; }
    if (backBtn) backBtn.style.display = 'flex';

    for (let groupKey in dataProducts) {
        let currentGroup = dataProducts[groupKey];
        if (Array.isArray(currentGroup)) {
            currentGroup.forEach(prod => {
                if (prod.name.toLowerCase().includes(searchQuery)) {
                    renderSearchCard(prod, lvlFinal);
                }
            });
        }
    }
}

function renderSearchCard(prod, container) {
    const itemCard = document.createElement('div'); 
    itemCard.className = 'card';
    
    const imgBlock = document.createElement('div');
    imgBlock.style = "text-align:center; padding:0; background:#27272a; border-bottom:1px solid rgba(37, 99, 235, 0.15); line-height:0;";
    const img = document.createElement('img');
    img.src = prod.img;
    img.style = "width:100%; height:140px; object-fit:cover; display:block;";
    imgBlock.appendChild(img);
    
    const infoBlock = document.createElement('div');
    infoBlock.className = 'card-info';
    const title = document.createElement('div');
    title.className = 'title';
    title.innerText = prod.name;
    
    const priceRow = document.createElement('div');
    priceRow.className = 'price-row';
    const price = document.createElement('div');
    price.className = 'price';
    price.innerText = prod.price + " ₽";
    const badge = document.createElement('div');
    badge.className = 'add-badge';
    badge.innerText = '+';
    
    priceRow.appendChild(price);
    priceRow.appendChild(badge);
    infoBlock.appendChild(title);
    infoBlock.appendChild(priceRow);
    
    itemCard.appendChild(imgBlock);
    itemCard.appendChild(infoBlock);
    itemCard.onclick = function() { openOrderCalculationModal(prod); }; 
    container.appendChild(itemCard);
}

function isPromoAlreadyPurchased() {
    globalOrdersBase = JSON.parse(localStorage.getItem('gayer_global_orders')) || [];
    return globalOrdersBase.some(o => o.itemsText && o.itemsText.includes('КАК ПОПАСТЬ В РЕКОМЕНДАЦИИ') && o.status === 'done');
}

function openOrderCalculationModal(prod) { 
    // Если по ошибке передали массив (как ранее со спамблоком), берем первый элемент
    if (Array.isArray(prod)) {
        prod = prod[0];
    }
    if (!prod) return;
    
    activeTargetProduct = prod; 
    document.getElementById('modalTitle').innerText = prod.name; 
    
    // 🚀 ЛОГИКА ДИНАМИЧЕСКОЙ ПОДСТАНОВКИ КАРТИНКИ ТОВАРА:
    const modalImg = document.getElementById('modalProductImg');
    if (modalImg) {
        if (prod.img) {
            modalImg.src = prod.img;          // Подставит "spamblock.png" из базы
            modalImg.style.display = 'block'; // Показывает картинку, если она есть
        } else {
            modalImg.style.display = 'none';  // Полностью скрывает тег, если картинки у товара нет
        }
    }

    const qtyBlock = document.getElementById('quantityBlock'); 
    const qtyInput = document.getElementById('itemQuantity'); 
    const submitBtn = document.getElementById('modalSubmitBtn');
    
    if (qtyInput) qtyInput.disabled = false; 
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = "Добавить в корзину"; }

    if (prod.isUniquePromo) {
        if (qtyBlock) qtyBlock.style.display = 'none'; 
        if (qtyInput) qtyInput.value = 1;
        if (isPromoAlreadyPurchased() && submitBtn) { submitBtn.disabled = true; submitBtn.innerText = "Уже куплено"; }
    } else { 
        if (qtyBlock) qtyBlock.style.display = 'block'; 
        if (qtyInput) qtyInput.value = prod.countable ? prod.min : 1; 
    }
    calculateModalLiveTotal(); 
    const orderModal = document.getElementById('orderModal');
    if (orderModal) orderModal.style.display = 'flex'; 
}


function calculateModalLiveTotal() { 
    if (!activeTargetProduct) return; 
    const qtyInput = document.getElementById('itemQuantity');
    const totalPriceNode = document.getElementById('modalTotalPrice');
    let qty = qtyInput ? (parseInt(qtyInput.value) || 0) : 0; 
    if (totalPriceNode) totalPriceNode.innerText = (activeTargetProduct.price * qty).toFixed(2) + " ₽"; 
}
// ==========================================================================
// 🛒 ЧАСТЬ 6: КОРЗИНА И ИЗМЕНЕНИЕ КОЛИЧЕСТВА ДЛЯ ВСЕХ ТОВАРОВ
// ==========================================================================

function addItemToCartAction() {
    const qtyInput = document.getElementById('itemQuantity');
    let qty = qtyInput ? (parseInt(qtyInput.value) || 1) : 1;
    if (qty <= 0) { alert('Количество должно быть больше 0'); return; }
    if (activeTargetProduct.countable && qty < activeTargetProduct.min) { 
        alert("Минимальное количество для этого товара: " + activeTargetProduct.min); 
        return; 
    }
    
    const emojiSel = document.getElementById('emojiSelector');
    let selectedEmoji = (activeTargetProduct.hasEmojiSelect && emojiSel) ? emojiSel.value : '';
    let finalName = activeTargetProduct.name + (selectedEmoji ? (" [" + selectedEmoji + "]") : '');
    
    cartState.push({ 
        id: activeTargetProduct.id, 
        name: finalName, 
        price: Number(activeTargetProduct.price), 
        qty: Number(qty), 
        countable: activeTargetProduct.countable || false 
    });
    saveCartToLocalStorage(); 
    const orderModal = document.getElementById('orderModal');
    if (orderModal) orderModal.style.display = 'none'; 
    alert('Добавлено в корзину! 🛒');
}

function renderCartScreenDOM() {
    const container = document.getElementById('cartItemsContainer');
    const totalCountNode = document.getElementById('cart_total_qty'); 
    const totalAmountNode = document.getElementById('cart_total_price'); 
    
    if (!container) return; 
    container.innerHTML = '';
    
    if (cartState.length === 0) {
        container.innerHTML = '<div style="color:#71717a; text-align:center; padding: 30px 0;">Корзина пуста 🛒</div>';
        if (totalCountNode) totalCountNode.innerText = '0 шт.';
        if (totalAmountNode) totalAmountNode.innerText = '0.00 ₽';
        return;
    }
    
    let totalQty = 0;
    let totalSum = 0;
    
    cartState.forEach((item, index) => {
        let cost = Number(item.price) * Number(item.qty);
        totalQty += Number(item.qty);
        totalSum += cost;

        const div = document.createElement('div');
        div.className = 'cart-item';
        
        // Кнопка удаления
        const delBtn = document.createElement('div');
        delBtn.className = 'cart-item-delete';
        delBtn.innerText = '×';
        delBtn.onclick = function() { removeCartItem(index); };
        
        // Блок деталей
        const details = document.createElement('div');
        details.className = 'cart-item-details';
        
        const title = document.createElement('div');
        title.className = 'cart-item-title';
        title.innerText = item.name;
        
        const formula = document.createElement('div');
        formula.className = 'cart-item-formula';
        formula.innerText = item.price + " ₽ × " + item.qty + " = " + cost.toFixed(2) + " ₽";
        
        // Блок управления количеством
        const controlBlock = document.createElement('div');
        controlBlock.className = 'cart-control-block';
        
        const btnMinus = document.createElement('button');
        btnMinus.className = 'cart-btn-math';
        btnMinus.innerText = '-';
        btnMinus.onclick = function() { changeQtyInCart(index, -1); };
        
        const inputQty = document.createElement('input');
        inputQty.type = 'number';
        inputQty.className = 'input-qty';
        inputQty.value = Number(item.qty);
        inputQty.onchange = function() { manualChangeQtyInCart(index, this.value); };
        
        const btnPlus = document.createElement('button');
        btnPlus.className = 'cart-btn-math';
        btnPlus.innerText = '+';
        btnPlus.onclick = function() { changeQtyInCart(index, 1); };
        
        controlBlock.appendChild(btnMinus);
        controlBlock.appendChild(inputQty);
        controlBlock.appendChild(btnPlus);
        
        details.appendChild(title);
        details.appendChild(formula);
        details.appendChild(controlBlock);
        
        div.appendChild(delBtn);
        div.appendChild(details);
        container.appendChild(div);
    });
    
    if (totalCountNode) totalCountNode.innerText = totalQty + ' шт.';
    if (totalAmountNode) totalAmountNode.innerText = totalSum.toFixed(2) + ' ₽';
}

function changeQtyInCart(index, change) {
    if (!cartState[index]) return;
    cartState[index].qty = Number(cartState[index].qty) + change;
    if (cartState[index].qty <= 0) { cartState.splice(index, 1); }
    localStorage.setItem('gayer_cart_session', JSON.stringify(cartState));
    renderCartScreenDOM();
}

// Ручное изменение количества в корзине
function manualChangeQtyInCart(index, value) {
    let parsedValue = parseInt(value);
    if (isNaN(parsedValue) || parsedValue <= 0) {
        cartState.splice(index, 1);
    } else {
        cartState[index].qty = parsedValue;
    }
    localStorage.setItem('gayer_cart_session', JSON.stringify(cartState));
    renderCartScreenDOM();
}

function removeCartItem(i) { cartState.splice(i, 1); saveCartToLocalStorage(); }
function clearCart() { cartState = []; saveCartToLocalStorage(); }
// ==========================================================================
// 👑 ЧАСТЬ 7: ОФОРМЛЕНИЕ ЗАКАЗА, МОДУЛЬ CRM И ЖИВЫЕ DOM СЛУШАТЕЛИ
// ==========================================================================

function checkoutAndCreateOrder() {
    cartState = cartState.filter(item => item && item.name && !isNaN(item.price)); 
    if (cartState.length === 0) return;
    
    globalOrdersBase = JSON.parse(localStorage.getItem('gayer_global_orders')) || [];
    let total = 0; 
    let summary = "";
    
    cartState.forEach(item => { 
        let cost = Number(item.price) * Number(item.qty); 
        total += cost; 
        summary += "• " + item.name + " (" + item.qty + " шт.) — " + cost.toFixed(2) + " ₽\n"; 
    });
    
    let id = "GS-" + Math.floor(Math.random() * 90000 + 10000);
    
    globalOrdersBase.unshift({ 
        orderId: id, 
        userId: String(currentUser.id), 
        clientName: currentUser.name, 
        username: currentUser.username, 
        itemsText: summary, 
        totalAmount: total.toFixed(2), 
        status: 'pending', 
        hiddenByAdmin: false,
        hiddenByClient: false,
        dateString: new Date().toLocaleDateString() 
    });
    
    localStorage.setItem('gayer_global_orders', JSON.stringify(globalOrdersBase));
    
    alert("Заказ " + id + " успешно сформирован!");
    cartState = []; 
    saveCartToLocalStorage(); 
    navigateTabBar('crm', document.querySelector('.nav-item:last-child'));
}

function renderCrmScreenDOM() {
    globalOrdersBase = JSON.parse(localStorage.getItem('gayer_global_orders')) || [];
    const container = document.getElementById('crmOrdersContainer'); 
    const pName = document.getElementById('profile_name');
    const pUser = document.getElementById('profile_username');
    
    if (!container) return; 
    container.innerHTML = '';

    if (pName) {
        if (ADMIN_TELEGRAM_IDS.includes(Number(currentUser.id))) {
            pName.innerHTML = currentUser.name + ' <span style="color:#2563eb; font-size:11px; background:rgba(37,99,235,0.15); padding:2px 8px; border-radius:6px; margin-left:6px; border:1px solid rgba(37,99,235,0.3)">ADMIN</span>';
        } else {
            pName.innerText = currentUser.name;
        }
    }
    if (pUser) pUser.innerText = "@" + currentUser.username + " (ID: " + currentUser.id + ")";

    let searchInputVal = document.getElementById('crmSearchInput')?.value?.toLowerCase().trim() || '';

    if (isUserAdmin()) {
        let filteredOrders = globalOrdersBase.filter(o => o.hiddenByAdmin !== true);
        
        if (searchInputVal === '') {
            filteredOrders = filteredOrders.filter(o => o.status !== 'done');
        } else {
            filteredOrders = filteredOrders.filter(o => 
                String(o.userId).toLowerCase().includes(searchInputVal) || 
                String(o.clientName).toLowerCase().includes(searchInputVal) ||
                String(o.orderId).toLowerCase().includes(searchInputVal)
            );
        }

        if (filteredOrders.length === 0) { 
            container.innerHTML = '<div style="color:#71717a; text-align:center; padding:20px; font-size:12px;">Активных заказов нет / Покупатель не найден 📦</div>'; 
            return; 
        }

        filteredOrders.forEach(order => {
            const div = document.createElement('div'); 
            div.className = 'crm-card';
            
            let badgeClass = order.status === 'done' ? 'status-done' : (order.status === 'ready' ? 'status-ready' : 'status-pending');
            let statusBadge = '<span class="crm-status ' + badgeClass + '">' + order.status.toUpperCase() + '</span>';

            let adminButtonText = "Выполнить";
            if (order.status === 'pending') adminButtonText = "⚙️ Подтвердить (в READY)";
            if (order.status === 'ready') adminButtonText = "✅ Завершить заказ";

            let cardHTML = '<div class="crm-meta"><span>№ ' + order.orderId + ' (Клиент: ID ' + order.userId + ')</span>' + statusBadge + '</div>' +
                           '<div class="crm-items">' + order.itemsText + '</div>' +
                           '<div style="font-size:12px; margin-top:4px;">Сумма: ' + order.totalAmount + ' ₽</div>' +
                           '<div class="crm-actions" style="display:flex; gap:8px; margin-top:10px; border-top:1px solid #27272a; padding-top:8px;">';

            if (order.status !== 'done') {
                cardHTML += '<button class="crm-subbtn" style="background:#10b981; flex:1; padding:10px; border-radius:8px; border:none; color:white; font-weight:bold; cursor:pointer;" ' +
                            'onclick="adminUpdateOrderStatus(\'' + order.orderId + '\', \'' + (order.status === 'pending' ? 'ready' : 'done') + '\')">' + adminButtonText + '</button>';
            }

            cardHTML += '<button class="crm-subbtn" style="background:#ef4444; flex:1; padding:10px; border-radius:8px; border:none; color:white; font-weight:bold; cursor:pointer;" ' +
                        'onclick="adminDeleteOrderAction(\'' + order.orderId + '\')">❌ Удалить</button></div>';

            div.innerHTML = cardHTML;
            container.appendChild(div);
        });

    } else {
        let myOrders = globalOrdersBase.filter(o => String(o.userId) === String(currentUser.id) && o.hiddenByClient !== true);

        if (myOrders.length === 0) { 
            container.innerHTML = '<div style="color:#71717a; text-align:center; padding: 20px 0; font-size:12px;">У вас пока нет оформленных заказов 📦</div>'; 
            return; 
        }

        const toggleBtn = document.createElement('button');
        toggleBtn.style = "width:100%; padding:12px; background:#18181b; border:1px solid #27272a; border-radius:12px; color:#fff; font-size:12px; font-weight:bold; cursor:pointer; margin-bottom:12px;";
        toggleBtn.innerText = isClientHistoryExpanded ? "▲ Скрыть историю покупок" : "▼ Показать историю моих покупок";
        toggleBtn.onclick = function() {
            isClientHistoryExpanded = !isClientHistoryExpanded;
            renderCrmScreenDOM();
        };
        container.appendChild(toggleBtn);

        if (!isClientHistoryExpanded) return;

        myOrders.forEach(order => {
            const div = document.createElement('div'); 
            div.className = 'crm-card';
            
            let statusBadge = '';
            if (order.status === 'done') {
                statusBadge = '<span class="crm-status status-done">DONE</span>';
            } else if (order.status === 'ready') {
                statusBadge = '<span class="crm-status" style="background:rgba(37, 99, 235, 0.15); color:#2563eb; border:1px solid rgba(37, 99, 235, 0.3);">READY</span>';
            } else {
                statusBadge = '<span class="crm-status status-pending">PENDING</span>';
            }

            let cardHTML = '<div class="crm-meta"><span>Заказ № ' + order.orderId + '</span>' + statusBadge + '</div>' +
                           '<div class="crm-items" style="color: #e4e4e7; margin: 6px 0; white-space: pre-wrap;">' + order.itemsText + '</div>' +
                           '<div style="font-size:12px; margin-top:4px; display:flex; justify-content:space-between; align-items:center;">' +
                           '<span>Сумма: <b>' + order.totalAmount + ' ₽</b></span>' +
                           '<span style="color:#ef4444; font-size:11px; cursor:pointer; background:rgba(239,68,68,0.1); padding:2px 6px; border-radius:4px; font-weight:bold;" ' +
                           'onclick="clientDeleteOrderAction(\'' + order.orderId + '\')">Удалить</span></div>';

            if (order.status === 'ready') {
                cardHTML += '<div class="crm-actions" style="margin-top:10px;">' +
                            '<button class="crm-subbtn" style="background: #10b981; width:100%; color:white; border:none; padding:8px; border-radius:8px; cursor:pointer; font-weight:bold;" ' +
                            'onclick="adminUpdateOrderStatus(\'' + order.orderId + '\', \'done\')">🛒 Подтвердить получение</button></div>';
            }

            div.innerHTML = cardHTML;
            container.appendChild(div);
        });
    }
}

function adminDeleteOrderAction(orderId) {
    if (!confirm("Убрать заказ из панели администратора? Покупатель продолжит видеть его.")) return;
    globalOrdersBase = JSON.parse(localStorage.getItem('gayer_global_orders')) || [];
    let target = globalOrdersBase.find(o => o.orderId === orderId);
    if (target) {
        target.hiddenByAdmin = true; 
        localStorage.setItem('gayer_global_orders', JSON.stringify(globalOrdersBase));
        renderCrmScreenDOM();
    }
}

function adminUpdateOrderStatus(orderId, newStatus) {
    globalOrdersBase = JSON.parse(localStorage.getItem('gayer_global_orders')) || [];
    let target = globalOrdersBase.find(o => o.orderId === orderId);
    if (target) {
        target.status = newStatus;
        localStorage.setItem('gayer_global_orders', JSON.stringify(globalOrdersBase));
        renderCrmScreenDOM();
        if (newStatus === 'done' && !isUserAdmin()) {
            alert("Заказ " + orderId + " успешно подтвержден! Спасибо за покупку. 🎉");
        }
    }
}

function clientDeleteOrderAction(orderId) {
    if (!confirm("Удалить этот заказ из своей истории? Администратор продолжит видеть его.")) return;
    globalOrdersBase = JSON.parse(localStorage.getItem('gayer_global_orders')) || [];
    let target = globalOrdersBase.find(o => o.orderId === orderId);
    if (target) {
        target.hiddenByClient = true; 
        localStorage.setItem('gayer_global_orders', JSON.stringify(globalOrdersBase));
        renderCrmScreenDOM();
    }
}

function clearCrmDatabase() {
    if (confirm("Вы уверены, что хотите полностью очистить базу данных заказов CRM?")) {
        localStorage.removeItem('gayer_global_orders');
        renderCrmScreenDOM();
    }
}

document.addEventListener("DOMContentLoaded", function() {
    // 🛡️ Защита приватной админки
    verifyPrivateAdminAccess();

    // 🔍 Слушатели для поиска и калькулятора
    const searchInput = document.getElementById("catalogSearchInput");
    if (searchInput) {
        searchInput.addEventListener("input", handleLiveCatalogSearchAndFilter);
    }

    const qtyInput = document.getElementById("itemQuantity");
    if (qtyInput) {
        qtyInput.addEventListener("input", calculateModalLiveTotal);
    }

    const crmSearch = document.getElementById("crmSearchInput");
    if (crmSearch) {
        crmSearch.addEventListener("input", renderCrmScreenDOM);
    }
    
    // 🗂️ Инициализация стартового экрана каталога
    if (document.getElementById("catalog_level_1")) {
        executeSwitchCatalogDOM("1");
    }
    
    // 👑 Инициализация CRM базы
    renderCrmScreenDOM();
});
