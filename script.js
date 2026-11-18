/* =========================================================================
   КЛЮЧИ — агентство недвижимости (Омск). Клиентское приложение.

   ВАЖНО ДЛЯ РАЗРАБОТЧИКА, КОТОРЫЙ БУДЕТ ПЕРЕНОСИТЬ ЭТОТ САЙТ НА ПРОДАКШН:
   Этот файл реализует полноценный, рабочий фронтенд: каталог с фильтрами,
   избранное, калькулятор ипотеки, формы заявок и админ-панель. Так как
   у среды сборки нет доступа к серверу/базе данных, в качестве хранилища
   используется window.storage (если сайт открыт внутри Claude) с откатом
   на оперативную память (если сайт открыт как обычный html-файл). Это
   позволяет всему реально работать уже сейчас, но для боевого запуска
   нужно заменить объект Store (см. ниже) на реальные запросы к вашему
   серверу/БД, а вход в админ-панель — на настоящую серверную авторизацию
   (сейчас это простая проверка пароля на клиенте, см. ADMIN_PASSWORD —
   её легко обойти через консоль браузера, это ТОЛЬКО демонстрационная
   защита интерфейса).
   ========================================================================= */
'use strict';

const ADMIN_PASSWORD = 'kluchi2026'; // демо-пароль админ-панели, замените на реальную авторизацию

/* ===================== ХРАНИЛИЩЕ (window.storage + откат в память) ===================== */
const _mem = Object.create(null);
const Store = {
  async get(key, shared=false){
    if (typeof window.storage !== 'undefined' && window.storage){
      try { const r = await window.storage.get(key, shared); return r ? r.value : null; }
      catch(e){ return null; }
    }
    const k = (shared?'s:':'p:') + key;
    return Object.prototype.hasOwnProperty.call(_mem, k) ? _mem[k] : null;
  },
  async set(key, value, shared=false){
    if (typeof window.storage !== 'undefined' && window.storage){
      try { await window.storage.set(key, value, shared); return true; }
      catch(e){ return false; }
    }
    const k = (shared?'s:':'p:') + key;
    _mem[k] = value;
    return true;
  }
};
async function loadJSON(key, shared, fallback){
  try { const raw = await Store.get(key, shared); return raw ? JSON.parse(raw) : fallback; }
  catch(e){ return fallback; }
}
async function saveJSON(key, value, shared){
  try { return await Store.set(key, JSON.stringify(value), shared); }
  catch(e){ return false; }
}

/* ===================== УТИЛИТЫ ===================== */
const qs = (sel, root) => (root||document).querySelector(sel);
const qsa = (sel, root) => Array.from((root||document).querySelectorAll(sel));
function escapeHTML(str){
  if (str===null || str===undefined) return '';
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
function nl2br(str){ return escapeHTML(str).replace(/\n/g,'<br>'); }
function formatPrice(n){
  if (n===null || n===undefined || isNaN(n)) return '—';
  return Math.round(n).toLocaleString('ru-RU') + ' ₽';
}
function formatPriceMonth(n){ return formatPrice(n) + '/мес.'; }
function formatArea(n){
  if (n===null || n===undefined) return '—';
  return n.toLocaleString('ru-RU',{maximumFractionDigits:1}) + ' м²';
}
function pluralRu(n, forms){
  const abs = Math.abs(n) % 100;
  const n1 = abs % 10;
  if (abs>10 && abs<20) return forms[2];
  if (n1>1 && n1<5) return forms[1];
  if (n1===1) return forms[0];
  return forms[2];
}
function roomsLabel(rooms){
  if (rooms===0) return 'Студия';
  if (rooms===null || rooms===undefined) return '—';
  return rooms + '-комн.';
}
function uid(prefix){ return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function isValidPhone(v){
  const digits = String(v||'').replace(/\D/g,'');
  return digits.length===11 && (digits[0]==='7' || digits[0]==='8');
}
function isValidName(v){ return String(v||'').trim().length>=2; }
function timeAgoDays(dateStr){
  const d = new Date(dateStr), now=new Date();
  return Math.floor((now-d)/(1000*60*60*24));
}
function debounce(fn, ms){ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); }; }
function escapeAttr(s){ return escapeHTML(s); }

/* ===================== ИКОНКИ (инлайн SVG, без внешних библиотек) ===================== */
const IconPaths = {
  house: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 9.7V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.7"/>',
  building: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h.01M15 16h.01" stroke-width="2.2"/>',
  key: '<circle cx="8" cy="12" r="4.3"/><path d="M12.3 12H21M16.3 12v3M19.6 12v2"/>',
  briefcase: '<rect x="2.5" y="7" width="19" height="13" rx="2"/><path d="M8 7V5.5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2V7"/>',
  tree: '<path d="M12 2 6.5 11h3L5 18h6M12 2l5.5 9h-3L19 18h-6M12 14v7"/>',
  mapPin: '<path d="M12 21.5s7-7.2 7-12.2A7 7 0 0 0 5 9.3C5 14.3 12 21.5 12 21.5z"/><circle cx="12" cy="9.3" r="2.6"/>',
  phone: '<path d="M21.5 16.9v2.9a2 2 0 0 1-2.2 2 19.3 19.3 0 0 1-8.4-3 19 19 0 0 1-5.8-5.8 19.3 19.3 0 0 1-3-8.5A2 2 0 0 1 4.1 2.5h2.9a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.4 2.1l-1.2 1.2a15.5 15.5 0 0 0 5.8 5.8l1.2-1.2a2 2 0 0 1 2.1-.4c.8.3 1.7.6 2.6.7a2 2 0 0 1 1.7 2z"/>',
  mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="m3 7 9 6 9-6"/>',
  heart: '<path d="M12 20.5s-7-4.2-9.3-8.4C.9 8.8 2.4 5.3 5.8 4.8c2-.3 3.9.6 4.9 2.1C11.7 5.3 13.6 4.4 15.6 4.7c3.4.5 4.9 4 3.1 7.4C16.5 16.3 12 20.5 12 20.5z"/>',
  search: '<circle cx="11" cy="11" r="7.2"/><line x1="21" y1="21" x2="16.4" y2="16.4"/>',
  sliders: '<line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="7" cy="18" r="2"/>',
  menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  chevDown: '<polyline points="6 9 12 15 18 9"/>',
  chevLeft: '<polyline points="15 18 9 12 15 6"/>',
  chevRight: '<polyline points="9 18 15 12 9 6"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  arrowRight: '<line x1="4" y1="12" x2="20" y2="12"/><polyline points="13 5 20 12 13 19"/>',
  grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="1"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1"/>',
  list: '<line x1="9" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="9" y1="18" x2="21" y2="18"/><line x1="4" y1="6" x2="4.01" y2="6"/><line x1="4" y1="12" x2="4.01" y2="12"/><line x1="4" y1="18" x2="4.01" y2="18"/>',
  calculator: '<rect x="4.5" y="2.5" width="15" height="19" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="12" x2="8.01" y2="12"/><line x1="12" y1="12" x2="12.01" y2="12"/><line x1="16" y1="12" x2="16.01" y2="12"/><line x1="8" y1="16" x2="8.01" y2="16"/><line x1="12" y1="16" x2="12.01" y2="16"/><line x1="16" y1="16" x2="16.01" y2="16"/>',
  shield: '<path d="M12 2.5 4.5 5.5v6c0 5 3.3 8.2 7.5 10 4.2-1.8 7.5-5 7.5-10v-6z"/>',
  camera: '<rect x="2.5" y="6" width="19" height="14" rx="2"/><circle cx="12" cy="13" r="3.8"/><path d="M8 6l1.4-2h5.2L16 6"/>',
  ruler: '<rect x="2.5" y="7.5" width="19" height="9" rx="1"/><line x1="7" y1="7.5" x2="7" y2="11"/><line x1="11" y1="7.5" x2="11" y2="11"/><line x1="15" y1="7.5" x2="15" y2="11"/><line x1="19" y1="7.5" x2="19" y2="11"/>',
  layers: '<polygon points="12 3 3 8 12 13 21 8 12 3"/><polyline points="3 13 12 18 21 13"/><polyline points="3 17.5 12 22 21 17.5"/>',
  landmark: '<line x1="3" y1="21" x2="21" y2="21"/><line x1="5" y1="21" x2="5" y2="10"/><line x1="19" y1="21" x2="19" y2="10"/><polygon points="12 2 21 8 3 8"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><circle cx="17" cy="9" r="2.6"/><path d="M15 19c0-2.3 1-4 3-4.6"/>',
  badgeCheck: '<path d="m9 12 2 2 4-4"/><path d="M12 2.5 14 4l2.5-.6 1.2 2.2 2.3.9-.3 2.5 1.6 1.9-1.6 1.9.3 2.5-2.3.9-1.2 2.2L14 20l-2 1.5L10 20l-2.5.6-1.2-2.2-2.3-.9.3-2.5L2.7 13l1.6-1.9-.3-2.5 2.3-.9L7.5 5.4 10 6z"/>',
  send: '<line x1="21" y1="3" x2="11" y2="13"/><polygon points="21 3 14.5 21 11 13 3 9.5 21 3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0-1 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  eye: '<path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 5.2A10.6 10.6 0 0 1 12 5c7 0 10.5 7 10.5 7a13.2 13.2 0 0 1-3 3.8M6.6 6.6C3.7 8.5 1.5 12 1.5 12s3.5 7 10.5 7a10.6 10.6 0 0 0 4.1-.8"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  info: '<circle cx="12" cy="12" r="9.5"/><line x1="12" y1="11" x2="12" y2="16.5"/><line x1="12" y1="7.3" x2="12" y2="7.4"/>',
  star: '<polygon points="12 2.5 15.1 9 22.3 9.6 16.9 14.3 18.5 21.4 12 17.6 5.5 21.4 7.1 14.3 1.7 9.6 8.9 9 12 2.5"/>',
};
function icon(name, cls, size){
  cls = cls || ''; size = size || 20;
  return '<svg viewBox="0 0 24 24" width="'+size+'" height="'+size+'" class="'+cls+'" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(IconPaths[name]||'')+'</svg>';
}

/* Заглушки фотографий объектов (SVG + градиент вместо реальных снимков) */
const PH_PALETTES = [
  ['#2B3A52','#1B2430'], ['#33404F','#1E2733'], ['#3C3324','#201A10'],
  ['#273B36','#16211E'], ['#3A2E3C','#1E1822'], ['#2F3B2A','#1A2116'],
];
const PH_ICON_BY_CAT = { apartment:'house', house:'house', 'new-building':'building', commercial:'briefcase', land:'tree', dacha:'tree' };
function phTile(category, seedIndex, label){
  const pal = PH_PALETTES[Math.abs(seedIndex)%PH_PALETTES.length];
  const ic = PH_ICON_BY_CAT[category] || 'house';
  return '<div class="ph-tile" style="--ph-a:'+pal[0]+';--ph-b:'+pal[1]+'" data-ph-label="'+escapeAttr(label||'')+'"><span class="ph-icon-wrap">'+icon(ic,'',46)+'</span></div>';
}

/* ===================== СПРАВОЧНИКИ ===================== */
const DISTRICTS = ['Кировский','Ленинский','Октябрьский','Советский','Центральный'];
const CATEGORY_LABELS = { apartment:'Квартира', house:'Дом', 'new-building':'Новостройка', commercial:'Коммерческая недвижимость', land:'Земельный участок', dacha:'Дача' };
const CATEGORY_LABELS_PL = { apartment:'Квартиры', house:'Дома', 'new-building':'Новостройки', commercial:'Коммерческая недвижимость', land:'Земельные участки', dacha:'Дачи' };
const DEAL_LABELS = { sale:'Продажа', rent:'Аренда' };
const BUILDING_TYPE_LABELS = { brick:'Кирпичный', monolith:'Монолитный', panel:'Панельный', block:'Блочный', wood:'Деревянный/брус', aerocrete:'Газобетон' };
const CONDITION_LABELS = { euro:'Евроремонт', good:'Хорошее состояние', 'needs-repair':'Требует ремонта', furnished:'С мебелью', rough:'Черновая отделка' };
const COMMERCIAL_TYPE_LABELS = { office:'Офис', retail:'Торговое помещение', production:'Производственное помещение', warehouse:'Складское помещение', building:'Здание', business:'Готовый бизнес' };
const LEAD_TYPE_LABELS = { consultation:'Консультация', buy:'Купить недвижимость', sell:'Продать недвижимость', mortgage:'Помощь с ипотекой', 'object-details':'Подробности об объекте', callback:'Обратный звонок' };
const LEAD_STATUS_LABELS = { new:'Новая', 'in-progress':'В работе', done:'Завершена' };

const DISTRICT_COORDS = {
  'Центральный': [54.9893, 73.3682],
  'Кировский': [54.9430, 73.2990],
  'Ленинский': [54.9320, 73.3990],
  'Октябрьский': [55.0050, 73.4350],
  'Советский': [55.0480, 73.3300],
};
function jitterCoord(base, i){ return [ base[0] + ((i%7)-3)*0.004, base[1] + ((i%5)-2)*0.005 ]; }

/* ===================== ДЕМО-ДАННЫЕ ОБЪЕКТОВ ===================== */
/* Это демонстрационный каталог. Все объекты, адреса и цены — примеры,
   которые сотрудник заменяет реальными через раздел «Админ-панель». */
const SEED_PROPERTIES = [
  {id:'apt-01', category:'apartment', dealType:'sale', title:'Студия в новом доме', price:3450000, district:'Центральный', street:'ул. Гагарина', house:'14', rooms:0, area:28, kitchen:6, floor:5, floors:9, buildingType:'monolith', condition:'euro', description:'Светлая студия с отделкой под ключ в десяти минутах ходьбы от центра. Панорамное окно, продуманная планировка, развитая инфраструктура двора.', photos:6, published:true, createdAt:'2026-11-05', lat:0,lng:0},
  {id:'apt-02', category:'apartment', dealType:'sale', title:'1-комнатная квартира у парка', price:3980000, district:'Советский', street:'ул. Крупской', house:'19', rooms:1, area:34.5, kitchen:8, floor:3, floors:10, buildingType:'brick', condition:'good', description:'Уютная однокомнатная квартира рядом с парковой зоной. Хорошее состояние, остаётся встроенная кухня.', photos:7, published:true, createdAt:'2026-10-28', lat:0,lng:0},
  {id:'apt-03', category:'apartment', dealType:'sale', title:'2-комнатная квартира с евроремонтом', price:5600000, district:'Кировский', street:'ул. Малунцева', house:'8', rooms:2, area:52, kitchen:9, floor:7, floors:16, buildingType:'monolith', condition:'euro', description:'Квартира с качественным евроремонтом и мебелью. Высокий этаж, вид на реку, закрытый двор.', photos:8, published:true, createdAt:'2026-11-08', lat:0,lng:0},
  {id:'apt-04', category:'apartment', dealType:'sale', title:'2-комнатная квартира, требует ремонта', price:3900000, district:'Ленинский', street:'ул. Жукова', house:'21', rooms:2, area:48, kitchen:7, floor:2, floors:5, buildingType:'panel', condition:'needs-repair', description:'Просторная квартира в кирпичном доме под ремонт по своему вкусу. Удачная планировка, тихий двор.', photos:5, published:true, createdAt:'2026-10-02', lat:0,lng:0},
  {id:'apt-05', category:'apartment', dealType:'sale', title:'3-комнатная квартира у школы', price:7200000, district:'Октябрьский', street:'ул. Багратиона', house:'10', rooms:3, area:71, kitchen:10, floor:4, floors:9, buildingType:'brick', condition:'good', description:'Семейная квартира рядом со школой и детским садом. Большая кухня-гостиная, застеклённая лоджия.', photos:9, published:true, createdAt:'2026-11-01', lat:0,lng:0},
  {id:'apt-06', category:'apartment', dealType:'rent', title:'3-комнатная квартира с мебелью', price:38000, district:'Центральный', street:'ул. Ленина', house:'25', rooms:3, area:68, kitchen:9, floor:6, floors:6, buildingType:'brick', condition:'furnished', description:'Полностью меблированная квартира в центре города. Вся техника, готова к заселению.', photos:7, published:true, createdAt:'2026-11-09', lat:0,lng:0},
  {id:'apt-07', category:'apartment', dealType:'rent', title:'1-комнатная квартира в аренду', price:22000, district:'Советский', street:'ул. Лукашевича', house:'16', rooms:1, area:33, kitchen:7, floor:9, floors:12, buildingType:'monolith', condition:'euro', description:'Современная студия с евроремонтом для долгосрочной аренды. Рядом остановка и супермаркет.', photos:6, published:true, createdAt:'2026-11-07', lat:0,lng:0},
  {id:'apt-08', category:'apartment', dealType:'sale', title:'4-комнатная квартира, большая площадь', price:9500000, district:'Кировский', street:'ул. 70 лет Октября', house:'45', rooms:4, area:96, kitchen:14, floor:3, floors:5, buildingType:'brick', condition:'good', description:'Просторная квартира для большой семьи с кухней-гостиной и двумя санузлами.', photos:8, published:true, createdAt:'2026-09-30', lat:0,lng:0},

  {id:'hse-01', category:'house', dealType:'sale', title:'Дом с участком в тихом переулке', price:8900000, district:'Ленинский', street:'ул. Садовая', house:'5', rooms:4, area:120, kitchen:16, floor:null, floors:1, buildingType:'brick', condition:'good', description:'Одноэтажный дом с собственным участком 6 соток. Баня, гараж, все коммуникации централизованные.', photos:9, published:true, createdAt:'2026-10-20', lat:0,lng:0},
  {id:'hse-02', category:'house', dealType:'sale', title:'Двухэтажный дом с евроремонтом', price:12500000, district:'Советский', street:'ул. Полевая', house:'12', rooms:5, area:160, kitchen:20, floor:null, floors:2, buildingType:'aerocrete', condition:'euro', description:'Новый дом из газобетона с качественной отделкой. Участок 10 соток, ландшафтный дизайн.', photos:10, published:true, createdAt:'2026-11-04', lat:0,lng:0},
  {id:'hse-03', category:'house', dealType:'sale', title:'Дом под ремонт у реки', price:5400000, district:'Кировский', street:'ул. Речная', house:'3', rooms:3, area:90, kitchen:12, floor:null, floors:1, buildingType:'wood', condition:'needs-repair', description:'Крепкий бревенчатый дом в живописном месте у реки. Требуется косметический ремонт.', photos:6, published:true, createdAt:'2026-09-25', lat:0,lng:0},
  {id:'hse-04', category:'house', dealType:'sale', title:'Дом повышенной комфортности', price:18000000, district:'Октябрьский', street:'ул. Нефтяников', house:'44', rooms:6, area:210, kitchen:24, floor:null, floors:2, buildingType:'brick', condition:'euro', description:'Просторный дом с кинозалом, сауной и гаражом на два автомобиля. Охраняемый посёлок.', photos:11, published:true, createdAt:'2026-11-06', lat:0,lng:0},

  {id:'newb-01', category:'new-building', complexId:'cplx-01', dealType:'sale', title:'Студия в ЖК «Северный квартал»', price:3250000, district:'Советский', street:'ул. Губкина', house:'3 (стр.)', rooms:0, area:24, kitchen:6, floor:3, floors:17, buildingType:'monolith', condition:'rough', description:'Студия с черновой отделкой в строящемся жилом комплексе. Сдача дома — 4 квартал 2026 года.', photos:6, published:true, createdAt:'2026-11-03', lat:0,lng:0},
  {id:'newb-02', category:'new-building', complexId:'cplx-01', dealType:'sale', title:'2-комнатная квартира в ЖК «Северный квартал»', price:5100000, district:'Советский', street:'ул. Губкина', house:'3 (стр.)', rooms:2, area:54, kitchen:10, floor:9, floors:17, buildingType:'monolith', condition:'rough', description:'Квартира с видом на парковую зону в новом жилом комплексе с закрытой территорией.', photos:7, published:true, createdAt:'2026-11-02', lat:0,lng:0},
  {id:'newb-03', category:'new-building', complexId:'cplx-02', dealType:'sale', title:'1-комнатная квартира в ЖК «Иртышские берега»', price:4400000, district:'Центральный', street:'наб. Иртыша', house:'7 (стр.)', rooms:1, area:38, kitchen:9, floor:5, floors:12, buildingType:'monolith', condition:'rough', description:'Квартира с видом на набережную в клубном доме у реки. Подземный паркинг.', photos:7, published:true, createdAt:'2026-10-30', lat:0,lng:0},
  {id:'newb-04', category:'new-building', complexId:'cplx-03', dealType:'sale', title:'2-комнатная квартира в ЖК «Парковый»', price:4950000, district:'Кировский', street:'ул. Заозёрная', house:'10', rooms:2, area:50, kitchen:9, floor:2, floors:9, buildingType:'panel', condition:'good', description:'Готовая квартира в сданном доме с предчистовой отделкой, рядом парк и школа.', photos:6, published:true, createdAt:'2026-10-15', lat:0,lng:0},
  {id:'newb-05', category:'new-building', complexId:'cplx-04', dealType:'sale', title:'1-комнатная квартира в ЖК «Горизонт»', price:4150000, district:'Октябрьский', street:'ул. Малиновского', house:'9 (стр.)', rooms:1, area:40, kitchen:9, floor:7, floors:14, buildingType:'monolith', condition:'rough', description:'Компактная и функциональная планировка, сдача дома — 1 квартал 2026 года.', photos:6, published:true, createdAt:'2026-10-22', lat:0,lng:0},

  {id:'com-01', category:'commercial', commercialType:'office', dealType:'sale', title:'Офисное помещение в бизнес-центре', price:9800000, district:'Центральный', street:'ул. Орджоникидзе', house:'15', rooms:null, area:85, kitchen:null, floor:2, floors:5, buildingType:'monolith', condition:'euro', description:'Офис открытой планировки с отдельным санузлом и переговорной. Охраняемая парковка.', photos:6, published:true, createdAt:'2026-11-01', lat:0,lng:0},
  {id:'com-02', category:'commercial', commercialType:'retail', dealType:'rent', title:'Торговое помещение на красной линии', price:150000, district:'Кировский', street:'ул. Красный Путь', house:'101', rooms:null, area:140, kitchen:null, floor:1, floors:5, buildingType:'brick', condition:'good', description:'Торговый зал с витринными окнами на первой линии с высоким пешеходным трафиком.', photos:5, published:true, createdAt:'2026-10-27', lat:0,lng:0},
  {id:'com-03', category:'commercial', commercialType:'production', dealType:'sale', title:'Производственное помещение', price:32000000, district:'Советский', street:'ул. Семиреченская', house:'10', rooms:null, area:850, kitchen:null, floor:1, floors:1, buildingType:'block', condition:'good', description:'Отапливаемое производственное помещение с кран-балкой и отдельным въездом для грузового транспорта.', photos:7, published:true, createdAt:'2026-10-11', lat:0,lng:0},
  {id:'com-04', category:'commercial', commercialType:'warehouse', dealType:'sale', title:'Складской комплекс', price:21000000, district:'Ленинский', street:'ул. Авиационная', house:'5', rooms:null, area:600, kitchen:null, floor:1, floors:1, buildingType:'block', condition:'good', description:'Складское помещение с пандусом и офисным блоком. Удобный подъезд для фур.', photos:6, published:true, createdAt:'2026-09-28', lat:0,lng:0},
  {id:'com-05', category:'commercial', commercialType:'building', dealType:'sale', title:'Отдельно стоящее здание', price:48000000, district:'Центральный', street:'ул. Гусарова', house:'4', rooms:null, area:450, kitchen:null, floor:null, floors:3, buildingType:'brick', condition:'good', description:'Здание свободного назначения с отдельным входом и парковкой. Подходит под офис или клинику.', photos:8, published:true, createdAt:'2026-11-04', lat:0,lng:0},
  {id:'com-06', category:'commercial', commercialType:'business', dealType:'sale', title:'Готовый бизнес — кофейня', price:6500000, district:'Ленинский', street:'ул. Мира', house:'58', rooms:null, area:95, kitchen:null, floor:1, floors:5, buildingType:'brick', condition:'furnished', description:'Действующая кофейня с оборудованием и постоянным потоком клиентов. Передача «под ключ».', photos:7, published:true, createdAt:'2026-10-18', lat:0,lng:0},

  {id:'land-01', category:'land', dealType:'sale', title:'Участок 8 соток под ИЖС', price:1450000, district:'Кировский', street:'СНТ «Сибиряк»', house:'—', rooms:null, area:800, kitchen:null, floor:null, floors:null, buildingType:null, condition:null, description:'Ровный участок прямоугольной формы, электричество по границе. Удобный подъезд круглый год.', photos:4, published:true, createdAt:'2026-10-24', lat:0,lng:0},
  {id:'land-02', category:'land', dealType:'sale', title:'Участок 12 соток, ЛПХ', price:980000, district:'Советский', street:'д. Усть-Логатово', house:'—', rooms:null, area:1200, kitchen:null, floor:null, floors:null, buildingType:null, condition:null, description:'Участок для личного подсобного хозяйства рядом с лесом. Скважина на соседнем участке.', photos:3, published:true, createdAt:'2026-09-29', lat:0,lng:0},
  {id:'land-03', category:'land', dealType:'sale', title:'Участок 15 соток под коммерцию', price:3200000, district:'Ленинский', street:'Объездная дорога', house:'—', rooms:null, area:1500, kitchen:null, floor:null, floors:null, buildingType:null, condition:null, description:'Участок с хорошей транспортной доступностью, подходит под автосервис или склад.', photos:4, published:true, createdAt:'2026-11-05', lat:0,lng:0},

  {id:'dch-01', category:'dacha', dealType:'sale', title:'Дача с садом', price:1650000, district:'Кировский', street:'СНТ «Мичуринец»', house:'—', rooms:2, area:40, kitchen:8, floor:null, floors:1, buildingType:'wood', condition:'good', description:'Аккуратный дачный домик с ухоженным садом и плодовыми деревьями. Летний водопровод.', photos:5, published:true, createdAt:'2026-10-09', lat:0,lng:0},
  {id:'dch-02', category:'dacha', dealType:'sale', title:'Дача с баней', price:2300000, district:'Советский', street:'СНТ «Урожай»', house:'—', rooms:3, area:55, kitchen:9, floor:null, floors:1, buildingType:'wood', condition:'euro', description:'Дом для круглогодичного проживания с баней и участком 8 соток. Готов к заселению.', photos:6, published:true, createdAt:'2026-11-07', lat:0,lng:0},
];
SEED_PROPERTIES.forEach((p,i)=>{ const c = jitterCoord(DISTRICT_COORDS[p.district]||DISTRICT_COORDS['Центральный'], i); p.lat=c[0]; p.lng=c[1]; });

const SEED_NEW_BUILDINGS = [
  {id:'cplx-01', name:'ЖК «Северный квартал»', district:'Советский', street:'ул. Губкина', developer:'ОмскДомСтрой', completion:'4 кв. 2026', status:'Строится', minPrice:3250000, photos:7,
    layouts:[{rooms:0,area:24,priceFrom:3250000},{rooms:1,area:36,priceFrom:3850000},{rooms:2,area:54,priceFrom:5100000}],
    description:'Комплекс из трёх монолитных домов с закрытым двором без машин, подземным паркингом и собственным детским садом.'},
  {id:'cplx-02', name:'ЖК «Иртышские берега»', district:'Центральный', street:'наб. Иртыша', developer:'БерегДевелопмент', completion:'2 кв. 2027', status:'Строится', minPrice:4100000, photos:8,
    layouts:[{rooms:1,area:38,priceFrom:4400000},{rooms:2,area:61,priceFrom:6700000},{rooms:3,area:84,priceFrom:8950000}],
    description:'Клубный дом с видом на набережную, панорамным остеклением и благоустроенной прогулочной зоной вдоль реки.'},
  {id:'cplx-03', name:'ЖК «Парковый»', district:'Кировский', street:'ул. Заозёрная', developer:'СтройИнвест-Омск', completion:'Сдан', status:'Сдан', minPrice:3600000, photos:6,
    layouts:[{rooms:1,area:35,priceFrom:3800000},{rooms:2,area:50,priceFrom:4950000}],
    description:'Сданный жилой комплекс рядом с парком. Собственная территория с детскими и спортивными площадками.'},
  {id:'cplx-04', name:'ЖК «Горизонт»', district:'Октябрьский', street:'ул. Малиновского', developer:'Горизонт Строй', completion:'1 кв. 2026', status:'Строится', minPrice:3900000, photos:6,
    layouts:[{rooms:1,area:40,priceFrom:4150000},{rooms:2,area:58,priceFrom:5600000}],
    description:'Современный квартал с акцентом на энергоэффективность и продуманное дворовое пространство.'},
  {id:'cplx-05', name:'ЖК «Юбилейный двор»', district:'Ленинский', street:'ул. Юбилейная', developer:'Юбилейный Девелопмент', completion:'3 кв. 2026', status:'Строится', minPrice:3100000, photos:5,
    layouts:[{rooms:0,area:23,priceFrom:3100000},{rooms:1,area:34,priceFrom:3700000}],
    description:'Доступный по цене квартал в развивающемся районе с новой школой и транспортной развязкой.'},
];
SEED_NEW_BUILDINGS.forEach((c,i)=>{ const co=jitterCoord(DISTRICT_COORDS[c.district]||DISTRICT_COORDS['Центральный'], i); c.lat=co[0]; c.lng=co[1]; });

const SEED_SETTINGS = {
  phone: '+7 (913) 673-69-46',
  phoneRaw: '+79136733946',
  email: 'info@kluchi-omsk.ru',
  address: 'г. Омск, ул. Примерная, 1, офис 305',
  hours: 'Пн–Сб: 09:00–19:00, Вс — выходной',
  whatsapp: '',
  telegram: '',
  lat: 54.9893, lng: 73.3682,
  aboutText: 'Агентство «Ключи» помогает жителям и гостям Омска покупать, продавать и арендовать недвижимость без лишних сложностей — от первой консультации до получения ключей от нового дома.',
  heroTitle: 'Поможем найти своё жильё в Омске',
  heroSubtitle: 'Подбираем квартиры, дома и коммерческие помещения, сопровождаем сделку на всех этапах и помогаем оформить ипотеку — быстро и без лишних формальностей.',
};

/* ===================== СОДЕРЖИМОЕ УСЛУГ ===================== */
const SERVICES = [
  {slug:'buy', title:'Покупка недвижимости', desc:'Подбираем варианты под ваш бюджет и задачи, проверяем объект и сопровождаем сделку до получения ключей.',
    benefits:['Подбор из закрытой базы и каталога партнёров','Проверка юридической чистоты объекта','Сопровождение переговоров с продавцом'],
    steps:['Консультация и определение критериев поиска','Подбор и просмотр объектов','Проверка документов и сопровождение сделки'], leadType:'buy'},
  {slug:'sell', title:'Продажа недвижимости', desc:'Определяем рыночную цену, готовим объект к показу и находим покупателя в сжатые сроки.',
    benefits:['Оценка объекта по текущему рынку','Профессиональные фото и описание','Организация показов и переговоров'],
    steps:['Оценка объекта и обсуждение стратегии продажи','Подготовка объявления и показы','Сопровождение сделки и расчётов'], leadType:'sell'},
  {slug:'support', title:'Сопровождение сделок', desc:'Берём на себя юридическую сторону сделки — от проверки документов до регистрации перехода права.',
    benefits:['Проверка документов обеих сторон','Подготовка договора купли-продажи','Сопровождение в Росреестре'],
    steps:['Анализ документов по объекту','Подготовка договора и расчётов','Регистрация сделки'], leadType:'consultation'},
  {slug:'mortgage-help', title:'Помощь с ипотекой', desc:'Подбираем программы нескольких банков и помогаем собрать полный пакет документов для одобрения.',
    benefits:['Подбор программы под вашу ситуацию','Помощь со сбором документов','Расчёт реальной финансовой нагрузки'],
    steps:['Расчёт в ипотечном калькуляторе','Подбор банка и программы','Подача заявки и сопровождение до одобрения'], leadType:'mortgage'},
  {slug:'new-buildings', title:'Подбор новостроек', desc:'Показываем актуальные жилые комплексы Омска напрямую от застройщиков без переплаты за посредничество.',
    benefits:['Актуальные планировки и цены от застройщика','Сравнение нескольких жилых комплексов','Помощь с ипотекой на новостройку'],
    steps:['Обсуждение требований к жилому комплексу','Подбор и просмотр планировок','Оформление договора долевого участия'], leadType:'buy'},
  {slug:'commercial', title:'Коммерческая недвижимость', desc:'Подбираем офисы, торговые и производственные помещения под конкретные задачи бизнеса.',
    benefits:['База офисных, торговых и складских объектов','Расчёт доходности для инвесторов','Сопровождение аренды и покупки'],
    steps:['Определение требований к помещению','Подбор и осмотр вариантов','Согласование условий и сделка'], leadType:'consultation'},
  {slug:'houses', title:'Покупка и продажа частных домов', desc:'Помогаем с загородной недвижимостью — от подбора участка до готового дома под ключ.',
    benefits:['Проверка коммуникаций и состояния дома','Оценка земельного участка','Сопровождение сделки с учётом особенностей загородной недвижимости'],
    steps:['Консультация по требованиям к дому','Подбор и выезд на просмотр','Оформление сделки'], leadType:'buy'},
  {slug:'dacha', title:'Дачи и загородная недвижимость', desc:'Подбираем дачи и садовые участки для отдыха или круглогодичного проживания.',
    benefits:['Проверка статуса земли и построек','Подбор по удалённости от города','Помощь с оформлением садовых товариществ'],
    steps:['Обсуждение пожеланий к загородному отдыху','Подбор и просмотр вариантов','Оформление сделки'], leadType:'buy'},
  {slug:'land', title:'Земельные участки', desc:'Помогаем подобрать участок под ИЖС, ЛПХ или коммерческое использование с учётом всех ограничений.',
    benefits:['Проверка категории земли и разрешённого использования','Проверка подключения коммуникаций','Сопровождение сделки купли-продажи'],
    steps:['Определение цели использования участка','Подбор и выезд на местность','Оформление сделки'], leadType:'buy'},
  {slug:'mortgage-insurance', title:'Страхование ипотеки', desc:'Помогаем подобрать страховую программу, соответствующую требованиям банка, на выгодных условиях.',
    benefits:['Сравнение предложений страховых компаний','Помощь с оформлением полиса','Консультации по продлению страхования'],
    steps:['Уточнение требований банка к страхованию','Подбор страховой программы','Оформление полиса'], leadType:'mortgage'},
];

/* ===================== СОСТОЯНИЕ ПРИЛОЖЕНИЯ ===================== */
const DB = { properties: [], newBuildings: [], leads: [], settings: {} };
let favorites = [];
let adminAuthed = false;
let adminTab = 'listings';
let catalogState = { view:'grid', page:1, pageSize:8 };
let galleryCtx = { photos:0, index:0, category:'apartment' };
let editingPropertyId = null;
let editingComplexId = null;

/* ===================== ЗАГРУЗКА / СОХРАНЕНИЕ ДАННЫХ ===================== */
async function loadAllData(){
  const props = await loadJSON('kluchi:properties', true, null);
  DB.properties = (Array.isArray(props) && props.length) ? props : JSON.parse(JSON.stringify(SEED_PROPERTIES));
  if (!Array.isArray(props) || !props.length) await saveJSON('kluchi:properties', DB.properties, true);

  const nbs = await loadJSON('kluchi:newbuildings', true, null);
  DB.newBuildings = (Array.isArray(nbs) && nbs.length) ? nbs : JSON.parse(JSON.stringify(SEED_NEW_BUILDINGS));
  if (!Array.isArray(nbs) || !nbs.length) await saveJSON('kluchi:newbuildings', DB.newBuildings, true);

  const settings = await loadJSON('kluchi:settings', true, null);
  DB.settings = (settings && typeof settings==='object') ? Object.assign({}, SEED_SETTINGS, settings) : JSON.parse(JSON.stringify(SEED_SETTINGS));
  if (!settings) await saveJSON('kluchi:settings', DB.settings, true);

  DB.leads = (await loadJSON('kluchi:leads', true, [])) || [];
  favorites = (await loadJSON('kluchi:favorites', false, [])) || [];
}
async function persistProperties(){ await saveJSON('kluchi:properties', DB.properties, true); }
async function persistNewBuildings(){ await saveJSON('kluchi:newbuildings', DB.newBuildings, true); }
async function persistLeads(){ await saveJSON('kluchi:leads', DB.leads, true); }
async function persistSettings(){ await saveJSON('kluchi:settings', DB.settings, true); }
async function persistFavorites(){ await saveJSON('kluchi:favorites', favorites, false); }

/* ===================== ШАПКА / ПОДВАЛ (данные из настроек) ===================== */
function updateHeaderFooterFromSettings(){
  const s = DB.settings;
  const phoneLink = 'tel:' + (s.phoneRaw || String(s.phone).replace(/\D/g,''));
  qsa('#headerPhone, #mobilePhone').forEach(el=>{ el.textContent = s.phone; el.href = phoneLink; });
  const fp = qs('#footerPhone'); if (fp){ fp.textContent = s.phone; fp.href = phoneLink; }
  const fe = qs('#footerEmail'); if (fe){ fe.textContent = s.email; fe.href = 'mailto:'+s.email; }
  const fa = qs('#footerAddress'); if (fa) fa.textContent = s.address;
  const fh = qs('#footerHours'); if (fh) fh.textContent = s.hours;
  const fy = qs('#footerYear'); if (fy) fy.textContent = new Date().getFullYear();
  const fm = qs('#footerMessengers');
  if (fm){
    let html='';
    if (s.whatsapp) html += '<a href="https://wa.me/'+escapeAttr(s.whatsapp.replace(/\D/g,''))+'" target="_blank" rel="noopener" aria-label="WhatsApp">'+icon('phone','',17)+'</a>';
    if (s.telegram) html += '<a href="https://t.me/'+escapeAttr(s.telegram.replace('@',''))+'" target="_blank" rel="noopener" aria-label="Telegram">'+icon('send','',17)+'</a>';
    fm.innerHTML = html;
  }
}
function updateFavCountBadge(){
  const el = qs('#favCountHeader');
  if(!el) return;
  if (favorites.length>0){ el.hidden=false; el.textContent = String(favorites.length); }
  else el.hidden = true;
}

/* ===================== РОУТЕР ===================== */
const ROUTES = {
  '': renderHome, home: renderHome, catalog: renderCatalog, property: renderPropertyDetail,
  favorites: renderFavorites, services: renderServices, mortgage: renderMortgage,
  commercial: renderCommercial, 'new-buildings': renderNewBuildings, complex: renderComplexDetail,
  about: renderAbout, contacts: renderContacts, admin: renderAdmin,
};
const PAGE_TITLES = {
  '': 'Ключи — агентство недвижимости в Омске', home: 'Ключи — агентство недвижимости в Омске',
  catalog: 'Каталог недвижимости — Ключи', favorites: 'Избранное — Ключи',
  services: 'Услуги агентства — Ключи', mortgage: 'Ипотека и расчёт платежа — Ключи',
  commercial: 'Коммерческая недвижимость — Ключи', 'new-buildings': 'Новостройки Омска — Ключи',
  about: 'О компании — Ключи', contacts: 'Контакты — Ключи', admin: 'Панель управления — Ключи',
};
function setPageTitle(title){ document.title = title || 'Ключи — агентство недвижимости в Омске'; }
function parseHash(){
  let hash = location.hash || '#/';
  hash = hash.replace(/^#\/?/, '');
  const [path, query] = hash.split('?');
  const segments = path.split('/').filter(Boolean);
  const params = new URLSearchParams(query || '');
  return {segments, params};
}
function router(){
  const {segments, params} = parseHash();
  const page = segments[0] || 'home';
  const fn = ROUTES[page] || render404;
  const app = qs('#app');
  if (Object.prototype.hasOwnProperty.call(PAGE_TITLES, page)) setPageTitle(PAGE_TITLES[page]);
  else if (!ROUTES[page]) setPageTitle('Страница не найдена — Ключи');
  try{ fn(segments.slice(1), params); }
  catch(e){
    console.error(e);
    app.innerHTML = '<div class="container section"><h2>Не удалось загрузить страницу</h2><p class="lede">Попробуйте вернуться на главную и повторить переход.</p><a href="#/" data-link class="btn btn-primary" style="margin-top:18px;display:inline-flex">На главную</a></div>';
  }
  closeMobileMenu();
  closeFiltersPanel();
  window.scrollTo({top:0, left:0, behavior:'instant'});
  updateActiveNav(page);
  replayCardAnimations();
}
function replayCardAnimations(){
  const cards = qsa('.prop-card');
  cards.forEach(c=>{ c.style.animation = 'none'; });
  void (cards[0] && cards[0].offsetHeight);
  cards.forEach(c=>{ c.style.animation = ''; });
}
function navigate(hash){ location.hash = hash; }
function updateActiveNav(page){
  qsa('.nav-link[data-link]').forEach(a=>{
    const href = a.getAttribute('href')||'';
    a.classList.toggle('is-active', href === '#/'+page || (page==='home' && href==='#/'));
  });
}
function render404(){
  qs('#app').innerHTML = '<div class="container section"><h1>Страница не найдена</h1><p class="lede">Похоже, такой страницы не существует — возможно, ссылка устарела.</p><a href="#/" data-link class="btn btn-primary" style="margin-top:20px;display:inline-flex">На главную</a></div>';
}

/* ===================== ГЛОБАЛЬНЫЕ ОБРАБОТЧИКИ ===================== */
let _scrollLockY = 0;
function lockScroll(){
  _scrollLockY = window.scrollY || window.pageYOffset || 0;
  document.body.style.top = (-_scrollLockY) + 'px';
  document.documentElement.classList.add('no-scroll');
}
function unlockScroll(){
  document.documentElement.classList.remove('no-scroll');
  document.body.style.top = '';
  window.scrollTo({ top:_scrollLockY, left:0, behavior:'instant' });
}
function closeMobileMenu(){
  const menu = qs('#mobileMenu');
  const wasOpen = menu && menu.classList.contains('is-open');
  menu && menu.classList.remove('is-open');
  qs('.mobile-menu-backdrop') && qs('.mobile-menu-backdrop').classList.remove('is-open');
  qs('#hamburgerBtn') && qs('#hamburgerBtn').setAttribute('aria-expanded','false');
  if (wasOpen) unlockScroll();
}
function closeFiltersPanel(){
  qs('.filters-panel') && qs('.filters-panel').classList.remove('is-open');
  qs('.filters-backdrop') && qs('.filters-backdrop').remove();
}
function ensureMobileBackdrop(){
  if (qs('.mobile-menu-backdrop')) return;
  const d = document.createElement('div');
  d.className = 'mobile-menu-backdrop';
  d.addEventListener('click', closeMobileMenu);
  document.body.appendChild(d);
}
function bindGlobalEvents(){
  window.addEventListener('scroll', ()=>{
    const h = qs('#siteHeader'); if (h) h.classList.toggle('is-scrolled', window.scrollY>8);
  }, {passive:true});

  const hb = qs('#hamburgerBtn');
  if (hb){
    hb.addEventListener('click', ()=>{
      const menu = qs('#mobileMenu');
      const open = !menu.classList.contains('is-open');
      ensureMobileBackdrop();
      menu.classList.toggle('is-open', open);
      hb.setAttribute('aria-expanded', String(open));
      qs('.mobile-menu-backdrop').classList.toggle('is-open', open);
      if (open){ lockScroll(); } else { unlockScroll(); }
    });
  }

  const mmClose = qs('#mobileMenuClose');
  if (mmClose){ mmClose.addEventListener('click', closeMobileMenu); }

  document.addEventListener('click', (e)=>{
    const acc = e.target.closest('[data-accordion]');
    if (acc){ const panel = document.getElementById(acc.getAttribute('data-accordion')); if (panel) panel.classList.toggle('is-open'); }

    const link = e.target.closest('[data-link]');
    if (link){
      const href = link.getAttribute('href') || '';
      closeMobileMenu();
      closeFiltersPanel();
      if (href.indexOf('#') === 0){
        e.preventDefault();
        if (location.hash === href){ router(); }
        else { location.hash = href; }
      }
    }

    const scrollLink = e.target.closest('[data-scroll]');
    if (scrollLink){
      e.preventDefault();
      const targetId = (scrollLink.getAttribute('href')||'').replace('#','');
      closeMobileMenu();
      closeFiltersPanel();
      scrollToAnchor(targetId);
    }
  });
}
function scrollToAnchor(targetId){
  const page = parseHash().segments[0] || 'home';
  const goAndScroll = ()=>{
    const el = document.getElementById(targetId);
    if (!el) return;
    const headerEl = qs('#siteHeader');
    const headerH = headerEl ? headerEl.offsetHeight : 76;
    const top = el.getBoundingClientRect().top + window.pageYOffset - headerH - 12;
    window.scrollTo({ top, left:0, behavior:'smooth' });
  };
  if (page !== 'home'){
    location.hash = '#/';
    requestAnimationFrame(()=> requestAnimationFrame(goAndScroll));
  } else {
    goAndScroll();
  }
}

/* ===================== ОБЩИЙ КОМПОНЕНТ: КАРТОЧКА ОБЪЕКТА ===================== */
function hashCode(str){ let h=0; for (let i=0;i<String(str).length;i++){ h = (h*31 + String(str).charCodeAt(i))|0; } return h; }
function isFavorite(id){ return favorites.includes(id); }

function propertyCardHTML(p, opts){
  opts = opts || {};
  const fav = isFavorite(p.id);
  const priceStr = p.dealType==='rent' ? formatPriceMonth(p.price) : formatPrice(p.price);
  const specs = [];
  if (p.rooms!==null && p.rooms!==undefined) specs.push('<b>'+roomsLabel(p.rooms)+'</b>');
  if (p.area) specs.push(formatArea(p.area));
  if (p.floor) specs.push('этаж '+p.floor+(p.floors?'/'+p.floors:''));
  else if (p.floors && !p.floor) specs.push(p.floors+' '+pluralRu(p.floors,['этаж','этажа','этажей']));
  const addrHouse = (p.house && p.house!=='—') ? (', '+p.house) : '';
  return (
    '<article class="prop-card" data-prop-id="'+p.id+'">'+
      '<div class="prop-media">'+
        '<a href="#/property/'+p.id+'" data-link aria-label="'+escapeAttr(p.title)+'">'+
          phTile(p.category, hashCode(p.id), CATEGORY_LABELS[p.category])+
          '<span class="prop-tag">'+priceStr+'</span>'+
          '<span class="prop-deal">'+DEAL_LABELS[p.dealType]+'</span>'+
        '</a>'+
        '<button type="button" class="fav-toggle '+(fav?'is-fav':'')+'" data-action="toggle-fav" data-id="'+p.id+'" aria-label="'+(fav?'Убрать из избранного':'Добавить в избранное')+'" title="'+(fav?'Убрать из избранного':'Добавить в избранное')+'">'+icon('heart','',22)+'</button>'+
      '</div>'+
      '<div class="prop-body">'+
        '<div class="prop-addr">'+icon('mapPin','',15)+' <span>'+escapeHTML(p.district)+' округ, '+escapeHTML(p.street)+escapeHTML(addrHouse)+'</span></div>'+
        '<h4 class="prop-title"><a href="#/property/'+p.id+'" data-link>'+escapeHTML(p.title)+'</a></h4>'+
        '<div class="prop-specs">'+specs.join(' <span>·</span> ')+'</div>'+
        (opts.showDesc ? '<p class="prop-desc">'+escapeHTML(p.description)+'</p>' : '')+
        '<div class="prop-foot"><a href="#/property/'+p.id+'" data-link class="btn btn-outline btn-sm btn-block">Подробнее</a></div>'+
      '</div>'+
    '</article>'
  );
}

/* ===================== ГЛАВНАЯ СТРАНИЦА ===================== */
function renderHome(){
  const s = DB.settings;
  const featured = DB.properties.filter(p=>p.published).sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt)).slice(0,8);
  const cats = [
    {cat:'apartment', icon:'house', label:'Квартиры', hint:'В новостройках и вторичном фонде'},
    {cat:'house', icon:'house', label:'Дома', hint:'Для постоянного проживания'},
    {cat:'new-building', icon:'building', label:'Новостройки', hint:'Жилые комплексы Омска', isNB:true},
    {cat:'commercial', icon:'briefcase', label:'Коммерческая', hint:'Офисы, торговля, склады', isCommercial:true},
    {cat:'land', icon:'tree', label:'Участки', hint:'Под ИЖС и бизнес'},
    {cat:'dacha', icon:'tree', label:'Дачи', hint:'Для отдыха за городом'},
  ];
  const districtOptions = DISTRICTS.map(d=>'<option value="'+d+'">'+d+' округ</option>').join('');

  qs('#app').innerHTML =
  '<section class="hero" id="home">'+
    '<div class="container hero-grid">'+
      '<div>'+
        '<p class="hero-eyebrow">Агентство недвижимости в Омске</p>'+
        '<h1>'+escapeHTML(s.heroTitle)+'</h1>'+
        '<p class="hero-sub">'+escapeHTML(s.heroSubtitle)+'</p>'+
        '<div class="hero-cta-row">'+
          '<a href="#/catalog" data-link class="btn btn-gold btn-lg">Подобрать недвижимость</a>'+
          '<button type="button" class="btn btn-outline btn-lg" data-action="open-lead-form" data-type="consultation">Получить консультацию</button>'+
        '</div>'+
        '<div class="hero-stats-row">'+
          '<div><b>'+DISTRICTS.length+' округов</b><span>работаем по всему Омску</span></div>'+
          '<div><b>6 направлений</b><span>от студий до коммерции</span></div>'+
          '<div><b>под ключ</b><span>сопровождение сделки</span></div>'+
        '</div>'+
      '</div>'+
      '<div class="hero-art" aria-hidden="true">'+
        '<div class="hero-art-silhouette"><span style="height:38%"></span><span style="height:62%"></span><span style="height:48%"></span><span style="height:80%"></span><span style="height:55%"></span><span style="height:68%"></span><span style="height:42%"></span></div>'+
        '<span class="hero-art-mark">'+icon('key','',84)+'</span>'+
        '<div class="hero-art-badge">'+icon('badgeCheck','',26)+'<span><b>Проверенные объекты</b><span>Документы и собственники сверены</span></span></div>'+
      '</div>'+
    '</div>'+
    '<div class="container">'+
      '<div class="search-widget">'+
        '<div class="search-tabs">'+
          '<button type="button" class="search-tab is-active" data-deal-tab="sale">Купить</button>'+
          '<button type="button" class="search-tab" data-deal-tab="rent">Снять</button>'+
        '</div>'+
        '<form id="homeSearchForm">'+
          '<input type="hidden" name="dealType" value="sale">'+
          '<div class="search-fields">'+
            '<div class="search-field"><label>Тип недвижимости</label><select name="category"><option value="">Любой тип</option><option value="apartment">Квартиры</option><option value="house">Дома</option><option value="new-building">Новостройки</option><option value="commercial">Коммерческая</option><option value="land">Участки</option><option value="dacha">Дачи</option></select></div>'+
            '<div class="search-field"><label>Округ</label><select name="district"><option value="">Любой округ</option>'+districtOptions+'</select></div>'+
            '<div class="search-field"><label>Комнат</label><select name="rooms"><option value="">Любое</option><option value="0">Студия</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4+</option></select></div>'+
            '<div class="search-field"><label>Цена от</label><input type="number" name="priceMin" placeholder="0" min="0"></div>'+
            '<div class="search-field"><label>Цена до</label><input type="number" name="priceMax" placeholder="Любая" min="0"></div>'+
            '<button type="submit" class="btn btn-gold search-submit">'+icon('search','',18)+' Найти</button>'+
          '</div>'+
        '</form>'+
      '</div>'+
    '</div>'+
    '<div class="hero-bottom-space"></div>'+
  '</section>'+

  '<section class="section">'+
    '<div class="container">'+
      '<div class="section-head"><div><h2>Популярные категории</h2><p class="lede">Выберите направление — покажем все актуальные предложения.</p></div></div>'+
      '<div class="cat-grid">'+
        cats.map(c=>'<a href="'+(c.isNB?'#/new-buildings':(c.isCommercial?'#/commercial':'#/catalog?category='+c.cat))+'" data-link class="cat-tile"><span class="cat-icon">'+icon(c.icon,'',30)+'</span><h4>'+c.label+'</h4><span>'+c.hint+'</span></a>').join('')+
      '</div>'+
    '</div>'+
  '</section>'+

  '<section class="section section-soft">'+
    '<div class="container">'+
      '<div class="section-head"><div><h2>Актуальные предложения</h2><p class="lede">Свежие объекты из нашего каталога.</p></div><a href="#/catalog" data-link class="see-all">Весь каталог</a></div>'+
      '<div class="prop-grid">'+ featured.map(p=>propertyCardHTML(p)).join('') +'</div>'+
    '</div>'+
  '</section>'+

  '<section class="section" id="services-anchor">'+
    '<div class="container">'+
      '<div class="section-head"><div><h2>Чем мы занимаемся</h2><p class="lede">Основные направления работы агентства «Ключи».</p></div><a href="#/services" data-link class="see-all">Все услуги</a></div>'+
      '<div class="services-teaser-grid">'+
        '<div class="service-feature">'+icon('key','',34)+'<h3>Сопровождение сделок под ключ</h3><p>Берём на себя проверку документов, переговоры и регистрацию — вы приходите только на подписание.</p></div>'+
        '<div class="service-mini">'+icon('calculator','why-icon',28)+'<h4>Помощь с ипотекой</h4><p class="lede" style="margin-top:6px">Подбираем программу и считаем реальную нагрузку на бюджет.</p></div>'+
        '<div class="service-mini">'+icon('briefcase','why-icon',28)+'<h4>Коммерческая недвижимость</h4><p class="lede" style="margin-top:6px">Офисы, торговые и складские помещения под задачи бизнеса.</p></div>'+
      '</div>'+
    '</div>'+
  '</section>'+

  '<section class="section section-soft">'+
    '<div class="container">'+
      '<h2 style="margin-bottom:8px">Почему выбирают «Ключи»</h2>'+
      '<p class="lede" style="margin-bottom:10px">Работаем так, чтобы сделка прошла спокойно и без лишних звонков.</p>'+
      '<div class="why-list">'+
        '<div class="why-item"><span class="why-icon">'+icon('badgeCheck','',30)+'</span><div><h4>Профессиональное сопровождение</h4><p>Специалист ведёт сделку от первого звонка до получения ключей.</p></div></div>'+
        '<div class="why-item"><span class="why-icon">'+icon('shield','',30)+'</span><div><h4>Помощь на всех этапах сделки</h4><p>Проверяем документы, готовим договоры и сопровождаем регистрацию.</p></div></div>'+
        '<div class="why-item"><span class="why-icon">'+icon('search','',30)+'</span><div><h4>Подбор подходящих решений</h4><p>Предлагаем варианты, которые реально соответствуют вашему запросу и бюджету.</p></div></div>'+
        '<div class="why-item"><span class="why-icon">'+icon('calculator','',30)+'</span><div><h4>Консультации по ипотеке</h4><p>Сравниваем программы банков и помогаем выбрать выгодные условия.</p></div></div>'+
        '<div class="why-item"><span class="why-icon">'+icon('edit','',30)+'</span><div><h4>Оформление документов</h4><p>Готовим и проверяем документы, чтобы сделка прошла без неожиданностей.</p></div></div>'+
      '</div>'+
    '</div>'+
  '</section>'+

  '<section class="section" id="about-anchor">'+
    '<div class="container split">'+
      '<div><p class="hero-eyebrow">О компании</p><h2>Агентство «Ключи»</h2><p class="lede" style="margin-top:14px">'+escapeHTML(s.aboutText)+'</p><a href="#/about" data-link class="btn btn-outline" style="margin-top:24px">О компании подробнее</a></div>'+
      '<div class="about-office-media">'+phTile('commercial', 42, 'Офис «Ключи»')+'</div>'+
    '</div>'+
  '</section>'+

  '<section class="section">'+
    '<div class="container">'+
      '<div class="mortgage-teaser">'+
        '<div><p class="hero-eyebrow">Ипотека</p><h2>Рассчитайте ипотеку за минуту</h2><p style="margin-top:12px">Узнайте ежемесячный платёж и переплату ещё до обращения в банк — и получите помощь в подборе программы.</p>'+
          '<div class="mortgage-mini-figures"><div><b>до 30 лет</b><span>срок кредита</span></div><div><b>от 15%</b><span>первоначальный взнос</span></div></div>'+
          '<a href="#/mortgage" data-link class="btn btn-gold" style="margin-top:26px">Открыть калькулятор</a>'+
        '</div>'+
        '<div>'+icon('calculator','',120)+'</div>'+
      '</div>'+
    '</div>'+
  '</section>'+

  '<section class="section">'+
    '<div class="container">'+
      '<div class="final-cta">'+
        '<div><h2>Остались вопросы о недвижимости?</h2><p class="lede" style="margin-top:10px">Оставьте заявку — специалист перезвонит и поможет подобрать решение.</p></div>'+
        '<button type="button" class="btn btn-primary btn-lg" data-action="open-lead-form" data-type="consultation">Оставить заявку</button>'+
      '</div>'+
    '</div>'+
  '</section>';

  bindHomeEvents();
}
function bindHomeEvents(){
  const form = qs('#homeSearchForm');
  if (!form) return;
  qsa('.search-tab', form.parentElement).forEach(tab=>{
    tab.addEventListener('click', ()=>{
      qsa('.search-tab', form.parentElement).forEach(t=>t.classList.remove('is-active'));
      tab.classList.add('is-active');
      form.dealType.value = tab.getAttribute('data-deal-tab');
    });
  });
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(form);
    const p = new URLSearchParams();
    for (const [k,v] of fd.entries()) if (v) p.set(k, v);
    navigate('#/catalog?' + p.toString());
  });
}

/* ===================== ТОСТЫ ===================== */
function showToast(msg, iconName){
  const root = qs('#toastRoot');
  if (!root) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = icon(iconName||'check','',18) + '<span>'+escapeHTML(msg)+'</span>';
  root.appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; t.style.transition='opacity .25s ease'; setTimeout(()=>t.remove(), 260); }, 2600);
}

/* ===================== ИЗБРАННОЕ (глобальный обработчик) ===================== */
async function toggleFavorite(id){
  const idx = favorites.indexOf(id);
  if (idx>=0) favorites.splice(idx,1); else favorites.push(id);
  await persistFavorites();
}
document.addEventListener('click', async (e)=>{
  const btn = e.target.closest('[data-action="toggle-fav"]');
  if (!btn) return;
  e.preventDefault();
  const id = btn.getAttribute('data-id');
  await toggleFavorite(id);
  const fav = isFavorite(id);
  qsa('[data-action="toggle-fav"][data-id="'+id+'"]').forEach(b=>{
    b.classList.toggle('is-fav', fav);
    b.setAttribute('aria-label', fav?'Убрать из избранного':'Добавить в избранное');
    if (b.classList.contains('fav-toggle')) b.setAttribute('title', fav?'Убрать из избранного':'Добавить в избранное');
    if (b.classList.contains('btn')) b.innerHTML = icon('heart','',16) + ' ' + (fav?'В избранном':'В избранное');
  });
  updateFavCountBadge();
  if (fav) showToast('Добавлено в избранное','heart');
  if (!fav && parseHash().segments[0]==='favorites') renderFavorites();
});

/* ===================== КАТАЛОГ: ФИЛЬТРАЦИЯ И СОРТИРОВКА ===================== */
function getFiltersConfigForCategory(category){
  const base = {district:true, street:true, price:true};
  if (category==='land') return Object.assign({}, base, {area:true});
  if (category==='commercial') return Object.assign({}, base, {area:true, floor:true, commercialType:true});
  return Object.assign({}, base, {rooms:true, area:true, kitchen:true, floor:true, buildingType:true, condition:true});
}
function filterProperties(list, f){
  return list.filter(p=>{
    if (!p.published) return false;
    if (f.category && p.category!==f.category) return false;
    if (f.dealType && p.dealType!==f.dealType) return false;
    if (f.district && p.district!==f.district) return false;
    if (f.street && !((p.street+' '+p.house).toLowerCase().includes(f.street.toLowerCase()))) return false;
    if (f.priceMin && !(p.price >= Number(f.priceMin))) return false;
    if (f.priceMax && !(p.price <= Number(f.priceMax))) return false;
    if (f.rooms!==undefined && f.rooms!==''){
      if (p.rooms===null || p.rooms===undefined) return false;
      if (f.rooms==='4'){ if (!(p.rooms>=4)) return false; }
      else if (Number(p.rooms)!==Number(f.rooms)) return false;
    }
    if (f.areaMin && !(p.area>=Number(f.areaMin))) return false;
    if (f.areaMax && !(p.area<=Number(f.areaMax))) return false;
    if (f.kitchenMin && !(p.kitchen>=Number(f.kitchenMin))) return false;
    if (f.floorMin && !(p.floor>=Number(f.floorMin))) return false;
    if (f.floorMax && !(p.floor<=Number(f.floorMax))) return false;
    if (f.buildingType && p.buildingType!==f.buildingType) return false;
    if (f.condition && p.condition!==f.condition) return false;
    if (f.commercialType && p.commercialType!==f.commercialType) return false;
    return true;
  });
}
function sortProperties(list, sort){
  const arr = list.slice();
  if (sort==='price-asc') arr.sort((a,b)=>a.price-b.price);
  else if (sort==='price-desc') arr.sort((a,b)=>b.price-a.price);
  else if (sort==='area-desc') arr.sort((a,b)=>(b.area||0)-(a.area||0));
  else arr.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
  return arr;
}
function emptyStateHTML(){
  return '<div class="empty-state">'+icon('search','',48)+'<h3>Ничего не найдено</h3><p>Попробуйте изменить параметры фильтра или сбросить часть условий.</p><button type="button" class="btn btn-outline" id="resetFiltersBtn" style="margin-top:18px">Сбросить фильтры</button></div>';
}

/* ===================== КАТАЛОГ: СТРАНИЦА ===================== */
function renderCatalog(segments, params){
  catalogState.filters = {
    category: params.get('category')||'', dealType: params.get('dealType')||'',
    district: params.get('district')||'', street: params.get('street')||'',
    priceMin: params.get('priceMin')||'', priceMax: params.get('priceMax')||'',
    rooms: params.get('rooms')||'', areaMin: params.get('areaMin')||'', areaMax: params.get('areaMax')||'',
    kitchenMin: params.get('kitchenMin')||'', floorMin: params.get('floorMin')||'', floorMax: params.get('floorMax')||'',
    buildingType: params.get('buildingType')||'', condition: params.get('condition')||'', commercialType: params.get('commercialType')||'',
  };
  catalogState.sort = params.get('sort') || 'new';
  catalogState.page = 1;
  renderCatalogView();
}
function renderCatalogView(){
  const f = catalogState.filters;
  const filtered = filterProperties(DB.properties, f);
  const sorted = sortProperties(filtered, catalogState.sort);
  const totalCount = sorted.length;
  const visible = sorted.slice(0, catalogState.page*catalogState.pageSize);
  const fConfig = getFiltersConfigForCategory(f.category);
  const title = f.category ? CATEGORY_LABELS_PL[f.category] : 'Каталог недвижимости';
  setPageTitle(title+' в Омске — Ключи');

  qs('#app').innerHTML =
  '<div class="container catalog-hero">'+
    '<div class="breadcrumbs"><a href="#/" data-link>Главная</a><span>/</span><span>'+title+'</span></div>'+
    '<h1>'+title+'</h1>'+
  '</div>'+
  '<div class="container">'+
    '<div class="catalog-toolbar">'+
      '<div class="catalog-count" id="catalogCount">'+totalCount+' '+pluralRu(totalCount,['объект','объекта','объектов'])+'</div>'+
      '<div class="toolbar-right">'+
        '<button type="button" class="btn btn-outline btn-sm filters-btn-mobile" id="filtersBtnMobile">'+icon('sliders','',16)+' Фильтры</button>'+
        '<select class="sort-select" id="sortSelect">'+
          '<option value="new" '+(catalogState.sort==='new'?'selected':'')+'>Сначала новые</option>'+
          '<option value="price-asc" '+(catalogState.sort==='price-asc'?'selected':'')+'>Сначала дешёвые</option>'+
          '<option value="price-desc" '+(catalogState.sort==='price-desc'?'selected':'')+'>Сначала дорогие</option>'+
          '<option value="area-desc" '+(catalogState.sort==='area-desc'?'selected':'')+'>По площади</option>'+
        '</select>'+
      '</div>'+
    '</div>'+
    '<div class="catalog-layout">'+
      '<aside class="filters-panel" id="filtersPanel">'+renderFiltersPanelHTML(f, fConfig)+'</aside>'+
      '<div>'+
        '<div class="prop-grid '+(catalogState.view==='list'?'is-list':'')+'" id="catalogGrid">'+
          visible.map(p=>propertyCardHTML(p,{showDesc:catalogState.view==='list'})).join('')+
        '</div>'+
        (!visible.length ? emptyStateHTML() : '')+
        (visible.length < totalCount ? '<div class="load-more-wrap"><button type="button" class="btn btn-outline btn-lg" id="loadMoreBtn">Показать ещё</button></div>' : '')+
      '</div>'+
    '</div>'+
  '</div>';

  bindCatalogEvents();
  replayCardAnimations();
}
function renderFiltersPanelHTML(f, cfg){
  const districtOpts = DISTRICTS.map(d=>'<option value="'+d+'" '+(f.district===d?'selected':'')+'>'+d+' округ</option>').join('');
  let html = '<button type="button" class="icon-btn" id="filtersCloseMobile" style="position:absolute;top:12px;right:12px;display:none" aria-label="Закрыть">'+icon('close','',18)+'</button>';
  html += '<h3>Фильтры</h3>';
  html += '<div class="filter-group"><label>Сделка</label><div class="chip-group">'+
    ['','sale','rent'].map(v=>'<button type="button" class="chip '+(f.dealType===v?'is-active':'')+'" data-filter="dealType" data-value="'+v+'">'+(v===''?'Любая':DEAL_LABELS[v])+'</button>').join('')+'</div></div>';
  html += '<div class="filter-group"><label>Тип недвижимости</label><select data-filter-select="category">'+
    ['','apartment','house','new-building','commercial','land','dacha'].map(v=>'<option value="'+v+'" '+(f.category===v?'selected':'')+'>'+(v===''?'Любой тип':CATEGORY_LABELS_PL[v])+'</option>').join('')+'</select></div>';
  html += '<div class="filter-group"><label>Округ</label><select data-filter-select="district"><option value="">Любой округ</option>'+districtOpts+'</select></div>';
  html += '<div class="filter-group"><label>Улица</label><input type="text" data-filter-input="street" value="'+escapeAttr(f.street)+'" placeholder="Например, Гагарина"></div>';
  html += '<div class="filter-group"><label>Цена, ₽</label><div class="filter-row-2"><input type="number" min="0" data-filter-input="priceMin" placeholder="От" value="'+escapeAttr(f.priceMin)+'"><input type="number" min="0" data-filter-input="priceMax" placeholder="До" value="'+escapeAttr(f.priceMax)+'"></div></div>';
  if (cfg.rooms) html += '<div class="filter-group"><label>Комнат</label><div class="chip-group">'+
    ['','0','1','2','3','4'].map(v=>'<button type="button" class="chip '+(f.rooms===v?'is-active':'')+'" data-filter="rooms" data-value="'+v+'">'+(v===''?'Любое':(v==='0'?'Студия':(v==='4'?'4+':v)))+'</button>').join('')+'</div></div>';
  if (cfg.area) html += '<div class="filter-group"><label>Площадь, м²</label><div class="filter-row-2"><input type="number" min="0" data-filter-input="areaMin" placeholder="От" value="'+escapeAttr(f.areaMin)+'"><input type="number" min="0" data-filter-input="areaMax" placeholder="До" value="'+escapeAttr(f.areaMax)+'"></div></div>';
  if (cfg.kitchen) html += '<div class="filter-group"><label>Площадь кухни, м²</label><input type="number" min="0" data-filter-input="kitchenMin" placeholder="От" value="'+escapeAttr(f.kitchenMin)+'"></div>';
  if (cfg.floor) html += '<div class="filter-group"><label>Этаж</label><div class="filter-row-2"><input type="number" min="0" data-filter-input="floorMin" placeholder="От" value="'+escapeAttr(f.floorMin)+'"><input type="number" min="0" data-filter-input="floorMax" placeholder="До" value="'+escapeAttr(f.floorMax)+'"></div></div>';
  if (cfg.buildingType) html += '<div class="filter-group"><label>Тип дома</label><select data-filter-select="buildingType"><option value="">Любой</option>'+Object.keys(BUILDING_TYPE_LABELS).map(k=>'<option value="'+k+'" '+(f.buildingType===k?'selected':'')+'>'+BUILDING_TYPE_LABELS[k]+'</option>').join('')+'</select></div>';
  if (cfg.condition) html += '<div class="filter-group"><label>Состояние</label><select data-filter-select="condition"><option value="">Любое</option>'+Object.keys(CONDITION_LABELS).map(k=>'<option value="'+k+'" '+(f.condition===k?'selected':'')+'>'+CONDITION_LABELS[k]+'</option>').join('')+'</select></div>';
  if (cfg.commercialType) html += '<div class="filter-group"><label>Тип помещения</label><select data-filter-select="commercialType"><option value="">Любой</option>'+Object.keys(COMMERCIAL_TYPE_LABELS).map(k=>'<option value="'+k+'" '+(f.commercialType===k?'selected':'')+'>'+COMMERCIAL_TYPE_LABELS[k]+'</option>').join('')+'</select></div>';
  html += '<div class="filters-apply-row"><button type="button" class="btn btn-primary btn-block" id="applyFiltersBtn">Показать</button></div>';
  html += '<button type="button" class="btn btn-ghost btn-block" id="resetFiltersBtnTop">Сбросить всё</button>';
  return html;
}
function bindCatalogEvents(){
  const draft = Object.assign({}, catalogState.filters);
  const panel = qs('#filtersPanel');
  qsa('.chip[data-filter]', panel).forEach(chip=>{
    chip.addEventListener('click', ()=>{
      const name = chip.getAttribute('data-filter'), val = chip.getAttribute('data-value');
      draft[name] = val;
      qsa('.chip[data-filter="'+name+'"]', panel).forEach(c=>c.classList.toggle('is-active', c===chip));
    });
  });
  qsa('[data-filter-select]', panel).forEach(sel=>sel.addEventListener('change', ()=>{ draft[sel.getAttribute('data-filter-select')] = sel.value; }));
  qsa('[data-filter-input]', panel).forEach(inp=>inp.addEventListener('change', ()=>{ draft[inp.getAttribute('data-filter-input')] = inp.value; }));
  const applyBtn = qs('#applyFiltersBtn'); if (applyBtn) applyBtn.addEventListener('click', ()=>{ catalogState.filters = Object.assign({}, draft); catalogState.page=1; updateCatalogHash(draft, true); });
  const resetTop = qs('#resetFiltersBtnTop'); if (resetTop) resetTop.addEventListener('click', ()=> navigate('#/catalog'+(catalogState.filters.category?('?category='+catalogState.filters.category):'')));
  const resetEmpty = qs('#resetFiltersBtn'); if (resetEmpty) resetEmpty.addEventListener('click', ()=> navigate('#/catalog'));
  const sortSel = qs('#sortSelect'); if (sortSel) sortSel.addEventListener('change', ()=>{ catalogState.sort = sortSel.value; catalogState.page=1; updateCatalogHash(draft, true); });
  const loadMore = qs('#loadMoreBtn'); if (loadMore) loadMore.addEventListener('click', ()=>{ catalogState.page++; renderCatalogView(); });
  const mobBtn = qs('#filtersBtnMobile');
  const closeBtn = qs('#filtersCloseMobile');
  if (mobBtn) mobBtn.addEventListener('click', ()=>{ panel.classList.add('is-open'); if (closeBtn) closeBtn.style.display='inline-flex'; ensureFiltersBackdrop(); });
  if (closeBtn) closeBtn.addEventListener('click', closeFiltersPanel);
}
function ensureFiltersBackdrop(){
  if (qs('.filters-backdrop')) return;
  const d = document.createElement('div');
  d.className = 'mobile-menu-backdrop filters-backdrop is-open';
  d.addEventListener('click', closeFiltersPanel);
  document.body.appendChild(d);
}
function updateCatalogHash(draft, forceRender){
  const p = new URLSearchParams();
  Object.keys(draft).forEach(k=>{ if (draft[k]) p.set(k, draft[k]); });
  if (catalogState.sort && catalogState.sort!=='new') p.set('sort', catalogState.sort);
  const newHash = '#/catalog' + (p.toString()?('?'+p.toString()):'');
  if (location.hash === newHash){ if (forceRender) renderCatalogView(); }
  else { location.hash = newHash; }
}

/* ===================== КАРТА (Leaflet / OpenStreetMap, запасной вариант без сети) ===================== */
function initLeafletMap(elId, coords, label){
  const el = document.getElementById(elId);
  if (!el) return;
  if (typeof L === 'undefined'){
    el.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;background:var(--mist);color:var(--text-muted);flex-direction:column;gap:8px;text-align:center;padding:20px">'+icon('mapPin','',28)+'<span>Карта временно недоступна</span></div>';
    return;
  }
  try{
    const map = L.map(elId, {scrollWheelZoom:false}).setView(coords, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution:'© OpenStreetMap contributors', maxZoom:19}).addTo(map);
    L.marker(coords).addTo(map).bindPopup(escapeHTML(label));
  }catch(e){ console.error('Map init error', e); }
}

/* ===================== СТРАНИЦА ОБЪЕКТА ===================== */
function renderPropertyDetail(segments){
  const id = segments[0];
  const p = DB.properties.find(x=>x.id===id);
  if (!p){ render404(); return; }
  setPageTitle(p.title+', '+p.district+' округ — '+(p.dealType==='rent'?formatPriceMonth(p.price):formatPrice(p.price))+' | Ключи');
  galleryCtx = {photos: p.photos||1, index:0, category:p.category};

  const specBlocks = [];
  if (p.rooms!==null && p.rooms!==undefined) specBlocks.push([roomsLabel(p.rooms),'комнат']);
  if (p.area) specBlocks.push([formatArea(p.area),'площадь']);
  if (p.kitchen) specBlocks.push([formatArea(p.kitchen),'кухня']);
  if (p.floor) specBlocks.push([p.floor+(p.floors?('/'+p.floors):''),'этаж']);
  else if (p.floors) specBlocks.push([String(p.floors), pluralRu(p.floors,['этаж','этажа','этажей'])]);

  const paramsRows = [['Тип недвижимости', CATEGORY_LABELS[p.category]], ['Сделка', DEAL_LABELS[p.dealType]]];
  if (p.buildingType) paramsRows.push(['Тип дома', BUILDING_TYPE_LABELS[p.buildingType]]);
  if (p.condition) paramsRows.push(['Состояние', CONDITION_LABELS[p.condition]]);
  if (p.commercialType) paramsRows.push(['Тип помещения', COMMERCIAL_TYPE_LABELS[p.commercialType]]);
  paramsRows.push(['Округ', p.district+' округ']);
  paramsRows.push(['Адрес', p.street+(p.house&&p.house!=='—'?(', '+p.house):'')]);

  const similar = DB.properties.filter(x=>x.published && x.id!==p.id && x.category===p.category).slice(0,3);

  qs('#app').innerHTML =
  '<div class="container" style="padding-top:24px">'+
    '<div class="breadcrumbs"><a href="#/" data-link>Главная</a><span>/</span><a href="#/catalog?category='+p.category+'" data-link>'+CATEGORY_LABELS_PL[p.category]+'</a><span>/</span><span>'+escapeHTML(p.title)+'</span></div>'+
    '<div class="pd-top">'+
      '<div>'+
        '<div class="pd-gallery">'+
          '<div class="pd-gallery-main" id="pdGalleryMain">'+
            phTile(p.category, hashCode(p.id), CATEGORY_LABELS[p.category])+
            '<button type="button" class="pd-gallery-nav prev" data-gallery-nav="-1" aria-label="Предыдущее фото">'+icon('chevLeft','',24)+'</button>'+
            '<button type="button" class="pd-gallery-nav next" data-gallery-nav="1" aria-label="Следующее фото">'+icon('chevRight','',24)+'</button>'+
            '<span class="pd-gallery-count" id="pdGalleryCount">1 / '+(p.photos||1)+'</span>'+
          '</div>'+
          '<div class="pd-thumbs" id="pdThumbs">'+
            Array.from({length:p.photos||1}).map((_,i)=>'<div class="pd-thumb '+(i===0?'is-active':'')+'" data-thumb="'+i+'">'+phTile(p.category, hashCode(p.id)+i, '')+'</div>').join('')+
          '</div>'+
        '</div>'+
        '<div class="pd-specs-grid">'+specBlocks.map(s=>'<div class="pd-spec"><b>'+s[0]+'</b><span>'+s[1]+'</span></div>').join('')+'</div>'+
        '<div class="pd-section"><h2>Описание</h2><p class="pd-desc">'+nl2br(p.description)+'</p></div>'+
        '<div class="pd-section"><h2>Параметры объекта</h2><div class="pd-params-table">'+paramsRows.map(r=>'<div><span>'+r[0]+'</span><span>'+escapeHTML(String(r[1]))+'</span></div>').join('')+'</div></div>'+
        '<div class="pd-section"><h2>Расположение</h2><div class="pd-map" id="pdMap"></div></div>'+
        (similar.length? '<div class="pd-section"><h2>Похожие объекты</h2><div class="prop-grid cols-3">'+similar.map(s=>propertyCardHTML(s)).join('')+'</div></div>' : '')+
      '</div>'+
      '<aside class="pd-side">'+
        '<div class="pd-price">'+(p.dealType==='rent'?formatPriceMonth(p.price):formatPrice(p.price))+'</div>'+
        (p.area? '<div class="pd-price-meter">'+formatPrice(Math.round(p.price/p.area))+' за м²</div>' : '')+
        '<div class="pd-addr">'+icon('mapPin','',16)+'<span>'+escapeHTML(p.district)+' округ, '+escapeHTML(p.street)+(p.house&&p.house!=='—'?', '+escapeHTML(p.house):'')+'</span></div>'+
        '<div class="pd-cta-row">'+
          '<a href="tel:'+escapeAttr(DB.settings.phoneRaw||'')+'" class="btn btn-primary btn-block">'+icon('phone','',17)+' Позвонить</a>'+
          '<button type="button" class="btn btn-gold btn-block" data-action="open-lead-form" data-type="object-details" data-prop-id="'+p.id+'">Оставить заявку</button>'+
          '<button type="button" class="btn btn-outline btn-block" data-action="toggle-fav" data-id="'+p.id+'">'+icon('heart','',16)+' '+(isFavorite(p.id)?'В избранном':'В избранное')+'</button>'+
        '</div>'+
        '<div class="pd-agent"><div class="pd-agent-avatar">'+icon('users','',22)+'</div><div><b>Агентство «Ключи»</b><span>Специалист по недвижимости</span></div></div>'+
      '</aside>'+
    '</div>'+
  '</div>';

  const total = p.photos||1;
  function updateGallery(){
    const mainTile = qs('#pdGalleryMain .ph-tile');
    if (mainTile) mainTile.outerHTML = phTile(p.category, hashCode(p.id)+galleryCtx.index, '');
    const cnt = qs('#pdGalleryCount'); if (cnt) cnt.textContent = (galleryCtx.index+1)+' / '+total;
    qsa('.pd-thumb', qs('#pdThumbs')).forEach((t,i)=>t.classList.toggle('is-active', i===galleryCtx.index));
  }
  qsa('[data-gallery-nav]').forEach(btn=> btn.addEventListener('click', (e)=>{ e.stopPropagation(); galleryCtx.index=(galleryCtx.index+Number(btn.getAttribute('data-gallery-nav'))+total)%total; updateGallery(); }));
  qsa('.pd-thumb', qs('#pdThumbs')).forEach(t=> t.addEventListener('click', ()=>{ galleryCtx.index=Number(t.getAttribute('data-thumb')); updateGallery(); }));
  const main = qs('#pdGalleryMain');
  if (main) main.addEventListener('click', (e)=>{ if (e.target.closest('[data-gallery-nav]')) return; openLightbox(p); });

  initLeafletMap('pdMap', [p.lat, p.lng], p.title);
}
function openLightbox(p){
  const total = p.photos||1;
  const root = qs('#modalRoot');
  function render(){
    root.innerHTML =
      '<div class="lightbox-overlay" id="lightboxOverlay">'+
        '<button type="button" class="lightbox-close" id="lightboxClose" aria-label="Закрыть">'+icon('close','',22)+'</button>'+
        '<button type="button" class="lightbox-nav prev" data-lb-nav="-1" aria-label="Предыдущее">'+icon('chevLeft','',24)+'</button>'+
        '<div class="lightbox-stage">'+phTile(p.category, hashCode(p.id)+galleryCtx.index, '')+'<div class="lightbox-count">'+(galleryCtx.index+1)+' / '+total+'</div></div>'+
        '<button type="button" class="lightbox-nav next" data-lb-nav="1" aria-label="Следующее">'+icon('chevRight','',24)+'</button>'+
      '</div>';
    qs('#lightboxClose').addEventListener('click', closeLightbox);
    qs('#lightboxOverlay').addEventListener('click', (e)=>{ if (e.target.id==='lightboxOverlay') closeLightbox(); });
    qsa('[data-lb-nav]').forEach(b=> b.addEventListener('click', ()=>{ galleryCtx.index=(galleryCtx.index+Number(b.getAttribute('data-lb-nav'))+total)%total; render(); }));
  }
  render();
  document.addEventListener('keydown', lightboxKeyHandler);
}
function closeLightbox(){ qs('#modalRoot').innerHTML=''; document.removeEventListener('keydown', lightboxKeyHandler); }
function lightboxKeyHandler(e){ if (e.key==='Escape') closeLightbox(); }

/* ===================== ИЗБРАННОЕ: СТРАНИЦА ===================== */
function renderFavorites(){
  const items = DB.properties.filter(p=>favorites.includes(p.id));
  qs('#app').innerHTML =
  '<div class="container section">'+
    '<h1>Избранное</h1>'+
    '<p class="lede" style="margin:14px 0 32px">Сохранённые объекты хранятся без регистрации и доступны при следующем посещении.</p>'+
    (items.length ? '<div class="prop-grid">'+items.map(p=>propertyCardHTML(p)).join('')+'</div>'
      : '<div class="empty-state">'+icon('heart','',48)+'<h3>Пока здесь пусто</h3><p>Добавляйте понравившиеся объекты нажатием на сердечко на карточке — они появятся на этой странице.</p><a href="#/catalog" data-link class="btn btn-primary" style="margin-top:18px;display:inline-flex">Перейти в каталог</a></div>')+
  '</div>';
}

/* ===================== УСЛУГИ ===================== */
function serviceRowHTML(s){
  return (
    '<div class="service-row" data-service-row>'+
      '<button type="button" class="service-row-head" data-service-toggle>'+
        '<h3>'+s.title+'</h3>'+icon('chevDown','chev',20)+
      '</button>'+
      '<div class="service-row-body"><div class="service-row-inner">'+
        '<p class="svc-desc">'+s.desc+'</p>'+
        '<div class="svc-col"><h5>Преимущества</h5><ul>'+s.benefits.map(b=>'<li>'+icon('check','',16)+'<span>'+b+'</span></li>').join('')+'</ul></div>'+
        '<div class="svc-col"><h5>Этапы работы</h5><ul class="svc-steps">'+s.steps.map((st,idx)=>'<li><b>'+(idx+1)+'.</b><span>'+st+'</span></li>').join('')+'</ul></div>'+
        '<div class="svc-col"><h5>Хотите начать?</h5><button type="button" class="btn btn-gold" data-action="open-lead-form" data-type="'+s.leadType+'">Получить консультацию</button></div>'+
      '</div></div>'+
    '</div>'
  );
}
function renderServices(){
  qs('#app').innerHTML =
    '<div class="container section">'+
      '<div class="breadcrumbs"><a href="#/" data-link>Главная</a><span>/</span><span>Услуги</span></div>'+
      '<h1>Услуги агентства «Ключи»</h1>'+
      '<p class="lede" style="margin-top:14px">Полный цикл работы с недвижимостью — от подбора объекта до оформления сделки.</p>'+
      '<div class="service-accordion" style="margin-top:40px">'+SERVICES.map(serviceRowHTML).join('')+'</div>'+
    '</div>';
  qsa('[data-service-toggle]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const row = btn.closest('.service-row');
      const wasOpen = row.classList.contains('is-open');
      qsa('.service-row').forEach(r=>r.classList.remove('is-open'));
      if (!wasOpen) row.classList.add('is-open');
    });
  });
}

/* ===================== ИПОТЕЧНЫЙ КАЛЬКУЛЯТОР ===================== */
function calcFieldHTML(id, label, value, min, max, step, formattedValue){
  return '<div class="calc-field"><div class="calc-field-head"><label>'+label+'</label><output id="'+id+'Out">'+formattedValue+'</output></div><input type="range" id="'+id+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+value+'"></div>';
}
function renderMortgage(){
  const d = {price:5000000, down:1000000, rate:16, years:20};
  qs('#app').innerHTML =
    '<div class="container section">'+
      '<div class="breadcrumbs"><a href="#/" data-link>Главная</a><span>/</span><span>Ипотека</span></div>'+
      '<h1>Ипотека</h1>'+
      '<p class="lede" style="margin-top:14px">Рассчитайте ежемесячный платёж и переплату, а наш специалист поможет подобрать программу и банк.</p>'+
      '<div class="calc-layout" style="margin-top:40px">'+
        '<div class="calc-card">'+
          calcFieldHTML('mcPrice','Стоимость недвижимости', d.price, 500000, 30000000, 100000, formatPrice(d.price))+
          calcFieldHTML('mcDown','Первоначальный взнос', d.down, 0, 20000000, 50000, formatPrice(d.down))+
          '<div class="calc-field"><div class="calc-field-head"><label>Процентная ставка</label><output id="mcRateOut">'+d.rate+'%</output></div><input type="range" id="mcRate" min="5" max="30" step="0.1" value="'+d.rate+'"></div>'+
          '<div class="calc-field"><div class="calc-field-head"><label>Срок кредита</label><output id="mcYearsOut">'+d.years+' лет</output></div><input type="range" id="mcYears" min="1" max="30" step="1" value="'+d.years+'"></div>'+
        '</div>'+
        '<div class="calc-result-card">'+
          '<div class="calc-result-main"><span>Ежемесячный платёж</span><b id="mcMonthly">—</b></div>'+
          '<div class="calc-result-row"><span>Сумма кредита</span><span id="mcLoan">—</span></div>'+
          '<div class="calc-result-row"><span>Общая сумма выплат</span><span id="mcTotal">—</span></div>'+
          '<div class="calc-result-row"><span>Переплата по процентам</span><span id="mcOverpay">—</span></div>'+
          '<button type="button" class="btn btn-gold btn-block" style="margin-top:24px" data-action="open-lead-form" data-type="mortgage">Проконсультироваться по ипотеке</button>'+
          '<p class="calc-disclaimer">Расчёт носит справочный характер и не является офертой. Точные условия зависят от банка и индивидуальных параметров заёмщика; ставка и срок — редактируемые демонстрационные значения.</p>'+
        '</div>'+
      '</div>'+
    '</div>'+
    '<div class="container section section-soft">'+
      '<h2>Ипотечное сопровождение</h2>'+
      '<div class="why-list" style="margin-top:20px">'+
        '<div class="why-item"><span class="why-icon">'+icon('search','',28)+'</span><div><h4>Подбор программы</h4><p>Сравниваем условия нескольких банков и находим подходящий вариант под вашу ситуацию.</p></div></div>'+
        '<div class="why-item"><span class="why-icon">'+icon('edit','',28)+'</span><div><h4>Сбор документов</h4><p>Подскажем, какие документы нужны банку, и проверим их перед подачей заявки.</p></div></div>'+
        '<div class="why-item"><span class="why-icon">'+icon('shield','',28)+'</span><div><h4>Страхование</h4><p>Поможем подобрать страховую программу, соответствующую требованиям банка.</p></div></div>'+
      '</div>'+
    '</div>';
  bindMortgageEvents();
}
function bindMortgageEvents(){
  const price=qs('#mcPrice'), down=qs('#mcDown'), rate=qs('#mcRate'), years=qs('#mcYears');
  function recalc(){
    const P = Number(price.value);
    down.max = Math.max(P-100000, 0);
    if (Number(down.value) > Number(down.max)) down.value = down.max;
    const D = Number(down.value), R = Number(rate.value), Y = Number(years.value);
    qs('#mcPriceOut').textContent = formatPrice(P);
    qs('#mcDownOut').textContent = formatPrice(D);
    qs('#mcRateOut').textContent = R+'%';
    qs('#mcYearsOut').textContent = Y+' '+pluralRu(Y,['год','года','лет']);
    const loan = Math.max(P-D, 0);
    const mRate = R/100/12, n = Y*12;
    let monthly = mRate===0 ? loan/n : loan*(mRate*Math.pow(1+mRate,n))/(Math.pow(1+mRate,n)-1);
    if (!isFinite(monthly)) monthly = 0;
    const total = monthly*n, overpay = total-loan;
    qs('#mcLoan').textContent = formatPrice(loan);
    qs('#mcMonthly').textContent = formatPrice(monthly);
    qs('#mcTotal').textContent = formatPrice(total);
    qs('#mcOverpay').textContent = formatPrice(overpay);
  }
  [price,down,rate,years].forEach(el=> el.addEventListener('input', recalc));
  recalc();
}

/* ===================== КОММЕРЧЕСКАЯ НЕДВИЖИМОСТЬ ===================== */
function renderCommercial(){
  const items = DB.properties.filter(p=>p.published && p.category==='commercial');
  const types = Object.keys(COMMERCIAL_TYPE_LABELS);
  qs('#app').innerHTML =
    '<div class="container section">'+
      '<div class="breadcrumbs"><a href="#/" data-link>Главная</a><span>/</span><span>Коммерческая недвижимость</span></div>'+
      '<h1>Коммерческая недвижимость</h1>'+
      '<p class="lede" style="margin:14px 0 32px">Офисы, торговые, производственные и складские помещения, здания и готовый бизнес в Омске.</p>'+
      '<div class="cat-grid" style="margin-bottom:48px">'+
        types.map(t=>'<a href="#/catalog?category=commercial&commercialType='+t+'" data-link class="cat-tile"><span class="cat-icon">'+icon('briefcase','',28)+'</span><h4>'+COMMERCIAL_TYPE_LABELS[t]+'</h4><span>'+items.filter(i=>i.commercialType===t).length+' '+pluralRu(items.filter(i=>i.commercialType===t).length,['объект','объекта','объектов'])+'</span></a>').join('')+
      '</div>'+
      '<div class="section-head"><div><h2>Актуальные предложения</h2></div><a href="#/catalog?category=commercial" data-link class="see-all">Все объекты</a></div>'+
      '<div class="prop-grid">'+items.slice(0,8).map(p=>propertyCardHTML(p)).join('')+'</div>'+
    '</div>';
}

/* ===================== НОВОСТРОЙКИ ===================== */
function newBuildingCardHTML(c){
  return (
    '<article class="nb-card">'+
      '<a href="#/complex/'+c.id+'" data-link class="nb-media">'+phTile('new-building', hashCode(c.id), c.name)+'</a>'+
      '<div class="nb-body">'+
        '<h4><a href="#/complex/'+c.id+'" data-link>'+escapeHTML(c.name)+'</a></h4>'+
        '<div class="nb-dev">'+escapeHTML(c.developer)+' · '+escapeHTML(c.district)+' округ</div>'+
        '<div class="nb-meta"><span>'+icon('clock','',14)+' '+escapeHTML(c.completion)+'</span><span>'+icon('layers','',14)+' '+c.layouts.length+' '+pluralRu(c.layouts.length,['планировка','планировки','планировок'])+'</span></div>'+
        '<div class="nb-price">от '+formatPrice(c.minPrice)+'</div>'+
        '<a href="#/complex/'+c.id+'" data-link class="btn btn-outline btn-block">Смотреть планировки</a>'+
      '</div>'+
    '</article>'
  );
}
function renderNewBuildings(){
  qs('#app').innerHTML =
    '<div class="container section">'+
      '<div class="breadcrumbs"><a href="#/" data-link>Главная</a><span>/</span><span>Новостройки</span></div>'+
      '<h1>Новостройки Омска</h1>'+
      '<p class="lede" style="margin:14px 0 32px">Актуальные жилые комплексы от застройщиков — планировки, сроки сдачи и минимальные цены.</p>'+
      '<div class="nb-grid">'+DB.newBuildings.map(newBuildingCardHTML).join('')+'</div>'+
    '</div>';
}
function renderComplexDetail(segments){
  const id = segments[0];
  const c = DB.newBuildings.find(x=>x.id===id);
  if (!c){ render404(); return; }
  setPageTitle(c.name+', '+c.district+' округ — от '+formatPrice(c.minPrice)+' | Ключи');
  const units = DB.properties.filter(p=>p.published && p.complexId===id);
  qs('#app').innerHTML =
    '<div class="container" style="padding-top:24px">'+
      '<div class="breadcrumbs"><a href="#/" data-link>Главная</a><span>/</span><a href="#/new-buildings" data-link>Новостройки</a><span>/</span><span>'+escapeHTML(c.name)+'</span></div>'+
      '<div class="nb-detail-head">'+
        '<div>'+
          '<h1>'+escapeHTML(c.name)+'</h1>'+
          '<p class="lede" style="margin-top:14px">'+escapeHTML(c.description)+'</p>'+
          '<div class="pd-specs-grid" style="margin-top:28px">'+
            '<div class="pd-spec"><b>'+escapeHTML(c.developer||'—')+'</b><span>застройщик</span></div>'+
            '<div class="pd-spec"><b>'+escapeHTML(c.completion||'—')+'</b><span>срок сдачи</span></div>'+
            '<div class="pd-spec"><b>'+escapeHTML(c.district)+'</b><span>округ</span></div>'+
            '<div class="pd-spec"><b>от '+formatPrice(c.minPrice)+'</b><span>минимальная цена</span></div>'+
          '</div>'+
          '<h2 style="margin-top:40px">Планировки</h2>'+
          '<table class="layout-table"><thead><tr><th>Тип</th><th>Площадь</th><th>Цена от</th></tr></thead><tbody>'+
            c.layouts.map(l=>'<tr><td>'+roomsLabel(l.rooms)+'</td><td>'+formatArea(l.area)+'</td><td>'+formatPrice(l.priceFrom)+'</td></tr>').join('')+
          '</tbody></table>'+
          (units.length? '<h2 style="margin-top:40px">Доступные квартиры в этом ЖК</h2><div class="prop-grid cols-3">'+units.map(p=>propertyCardHTML(p)).join('')+'</div>' : '')+
        '</div>'+
        '<aside class="pd-side">'+
          '<div style="aspect-ratio:4/3;border-radius:var(--radius-m);overflow:hidden;margin:-26px -26px 20px">'+phTile('new-building', hashCode(c.id), c.name)+'</div>'+
          '<div class="pd-cta-row">'+
            '<a href="tel:'+escapeAttr(DB.settings.phoneRaw||'')+'" class="btn btn-primary btn-block">'+icon('phone','',17)+' Позвонить</a>'+
            '<button type="button" class="btn btn-gold btn-block" data-action="open-lead-form" data-type="buy" data-complex="'+c.id+'">Узнать подробности</button>'+
          '</div>'+
          '<div class="pd-map" id="nbMap" style="margin-top:20px;height:220px"></div>'+
        '</aside>'+
      '</div>'+
    '</div>';
  initLeafletMap('nbMap', [c.lat, c.lng], c.name);
}

/* ===================== О КОМПАНИИ ===================== */
function renderAbout(){
  const s = DB.settings;
  qs('#app').innerHTML =
    '<div class="container section">'+
      '<div class="breadcrumbs"><a href="#/" data-link>Главная</a><span>/</span><span>О компании</span></div>'+
      '<h1>О компании «Ключи»</h1>'+
      '<p class="lede" style="margin-top:14px;max-width:70ch">'+escapeHTML(s.aboutText)+'</p>'+
      '<div class="split" style="margin-top:56px">'+
        '<div><h2>Направления деятельности</h2><p class="lede" style="margin-top:12px">Сопровождаем сделки с жилой и коммерческой недвижимостью — от квартир и домов до участков и готового бизнеса.</p><a href="#/services" data-link class="btn btn-outline" style="margin-top:22px;display:inline-flex">Смотреть услуги</a></div>'+
        '<div class="about-office-media">'+phTile('commercial', 77, 'Офис «Ключи»')+'</div>'+
      '</div>'+
      '<h2 style="margin-top:64px">Принципы работы</h2>'+
      '<div class="about-principles">'+
        '<div><h4>Прозрачность</h4><p class="lede">Честно рассказываем о состоянии объекта и реальных сроках сделки.</p></div>'+
        '<div><h4>Персональный подход</h4><p class="lede">Подбираем решения под конкретный бюджет и задачи клиента.</p></div>'+
        '<div><h4>Юридическая аккуратность</h4><p class="lede">Проверяем документы на каждом этапе сделки.</p></div>'+
        '<div><h4>Сопровождение до результата</h4><p class="lede">Остаёмся на связи от консультации до получения ключей.</p></div>'+
      '</div>'+
      '<h2 style="margin-top:64px">Команда</h2>'+
      '<p class="lede" style="margin-top:12px">Над каждой сделкой работает специалист, отвечающий за подбор объектов, переговоры и документы. Раздел с составом команды и фотографиями сотрудников дополняется по мере подключения реальных данных.</p>'+
      '<div class="final-cta" style="margin-top:56px">'+
        '<div><h2>Готовы начать?</h2><p class="lede" style="margin-top:10px">Оставьте заявку, и мы свяжемся с вами в ближайшее время.</p></div>'+
        '<button type="button" class="btn btn-primary btn-lg" data-action="open-lead-form" data-type="consultation">Оставить заявку</button>'+
      '</div>'+
    '</div>';
}

/* ===================== КОНТАКТЫ ===================== */
function renderContacts(){
  const s = DB.settings;
  qs('#app').innerHTML =
    '<div class="container section">'+
      '<div class="breadcrumbs"><a href="#/" data-link>Главная</a><span>/</span><span>Контакты</span></div>'+
      '<h1>Контакты</h1>'+
      '<div class="contacts-grid" style="margin-top:32px">'+
        '<div>'+
          '<h3>Агентство недвижимости «Ключи»</h3>'+
          '<div class="contact-info-list">'+
            '<div class="contact-info-row">'+icon('mapPin','why-icon',24)+'<div><b>Адрес</b>'+escapeHTML(s.address)+'</div></div>'+
            '<div class="contact-info-row">'+icon('phone','why-icon',24)+'<div><b>Телефон</b><a href="tel:'+escapeAttr(s.phoneRaw||'')+'">'+escapeHTML(s.phone)+'</a></div></div>'+
            '<div class="contact-info-row">'+icon('mail','why-icon',24)+'<div><b>Email</b><a href="mailto:'+escapeAttr(s.email)+'">'+escapeHTML(s.email)+'</a></div></div>'+
            '<div class="contact-info-row">'+icon('clock','why-icon',24)+'<div><b>Режим работы</b>'+escapeHTML(s.hours)+'</div></div>'+
          '</div>'+
          '<div class="messenger-row">'+
            (s.whatsapp? '<a href="https://wa.me/'+escapeAttr(String(s.whatsapp).replace(/\D/g,''))+'" target="_blank" rel="noopener" class="btn btn-outline btn-sm">WhatsApp</a>' : '')+
            (s.telegram? '<a href="https://t.me/'+escapeAttr(String(s.telegram).replace('@',''))+'" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Telegram</a>' : '')+
            '<button type="button" class="btn btn-gold btn-sm" data-action="open-lead-form" data-type="callback">'+icon('phone','',15)+' Заказать звонок</button>'+
          '</div>'+
          '<div class="pd-map" id="contactsMap" style="margin-top:28px"></div>'+
        '</div>'+
        '<div class="calc-card"><h3 style="margin-bottom:18px">Написать нам</h3><div id="contactsFormWrap">'+leadFormHTML('consultation', {})+'</div></div>'+
      '</div>'+
    '</div>';
  initLeafletMap('contactsMap', [s.lat, s.lng], 'Офис «Ключи»');
  bindLeadFormEvents(qs('#contactsFormWrap [data-lead-form]'), 'consultation', {});
}

/* ===================== ФОРМЫ ЗАЯВОК (переиспользуемые) ===================== */
const LEAD_FORM_TITLES = {
  consultation:'Заказать консультацию', buy:'Хочу купить недвижимость', sell:'Хочу продать недвижимость',
  mortgage:'Заявка на ипотечную консультацию', 'object-details':'Узнать подробности об объекте', callback:'Заказать обратный звонок',
};
function leadFormFieldsHTML(){
  return (
    '<div class="form-field" data-field="name"><label>Имя</label><input type="text" name="name" autocomplete="name"><span class="field-error">Укажите имя (минимум 2 символа)</span></div>'+
    '<div class="form-field" data-field="phone"><label>Телефон</label><input type="tel" name="phone" placeholder="+7 900 000-00-00" autocomplete="tel"><span class="field-error">Проверьте номер телефона</span></div>'+
    '<div class="form-field"><label>Комментарий (необязательно)</label><textarea name="comment" rows="3"></textarea></div>'+
    '<label class="form-consent"><input type="checkbox" name="consent"><span>Я согласен(на) на обработку персональных данных в соответствии с политикой конфиденциальности сайта.</span></label>'+
    '<button type="submit" class="btn btn-primary btn-block">'+icon('send','',16)+' Отправить заявку</button>'+
    '<p class="form-note">Нажимая «Отправить», вы соглашаетесь на обработку данных. Мы перезвоним в рабочее время.</p>'
  );
}
function leadFormHTML(type, ctx){
  ctx = ctx || {};
  const intro = ctx.propertyTitle ? '<p class="modal-eyebrow">По объекту: '+escapeHTML(ctx.propertyTitle)+'</p>' : '';
  return (
    '<form data-lead-form data-type="'+type+'">'+
      intro+leadFormFieldsHTML()+
    '</form>'
  );
}
function openLeadForm(type, ctx){
  ctx = ctx || {};
  const root = qs('#modalRoot');
  root.innerHTML =
    '<div class="modal-overlay" id="leadModalOverlay">'+
      '<div class="modal">'+
        '<button type="button" class="icon-btn modal-close" id="leadModalClose" aria-label="Закрыть">'+icon('close','',18)+'</button>'+
        '<h3>'+(LEAD_FORM_TITLES[type]||'Оставить заявку')+'</h3>'+
        '<div style="margin-top:18px">'+leadFormHTML(type, ctx)+'</div>'+
      '</div>'+
    '</div>';
  qs('#leadModalClose').addEventListener('click', closeModal);
  qs('#leadModalOverlay').addEventListener('click', (e)=>{ if (e.target.id==='leadModalOverlay') closeModal(); });
  document.addEventListener('keydown', modalKeyHandler);
  bindLeadFormEvents(qs('[data-lead-form]'), type, ctx);
}
function closeModal(){ qs('#modalRoot').innerHTML=''; document.removeEventListener('keydown', modalKeyHandler); }
function modalKeyHandler(e){ if (e.key==='Escape') closeModal(); }

function toggleFieldError(input, hasError){
  const field = input.closest('.form-field');
  if (field) field.classList.toggle('has-error', hasError);
}
function bindLeadFormEvents(form, type, ctx){
  if (!form) return;
  ctx = ctx || {};
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if (form.dataset.submitting==='1') return;
    const nameEl = form.querySelector('[name=name]');
    const phoneEl = form.querySelector('[name=phone]');
    const consentEl = form.querySelector('[name=consent]');
    let valid = true;
    const nameBad = !isValidName(nameEl.value); toggleFieldError(nameEl, nameBad); if (nameBad) valid=false;
    const phoneBad = !isValidPhone(phoneEl.value); toggleFieldError(phoneEl, phoneBad); if (phoneBad) valid=false;
    const consentWrap = consentEl.closest('.form-consent');
    if (!consentEl.checked){ valid=false; consentWrap.style.color='var(--danger)'; } else { consentWrap.style.color=''; }
    if (!valid) return;

    form.dataset.submitting = '1';
    const submitBtn = form.querySelector('[type=submit]');
    submitBtn.setAttribute('disabled','true');
    submitBtn.textContent = 'Отправляем…';

    const commentEl = form.querySelector('[name=comment]');
    const lead = {
      id: uid('lead'), type: type, name: nameEl.value.trim(), phone: phoneEl.value.trim(),
      comment: commentEl ? commentEl.value.trim() : '',
      propertyId: ctx.propertyId||null, propertyTitle: ctx.propertyTitle||null, complexId: ctx.complexId||null,
      status: 'new', staffComment: '', createdAt: new Date().toISOString(),
    };
    await new Promise(r=>setTimeout(r, 500));
    DB.leads.unshift(lead);
    await persistLeads();

    const container = form.parentElement;
    container.innerHTML = '<div class="form-success">'+icon('check','',22)+'<div><b>Заявка отправлена</b>Спасибо! Мы свяжемся с вами в ближайшее время по указанному номеру.</div></div>';
    showToast('Заявка принята','check');
    setTimeout(()=>{ if (qs('#leadModalOverlay')) closeModal(); }, 2200);
  });
}
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('[data-action="open-lead-form"]');
  if (!btn) return;
  const type = btn.getAttribute('data-type') || 'consultation';
  const ctx = {};
  const propId = btn.getAttribute('data-prop-id');
  if (propId){
    ctx.propertyId = propId;
    const p = DB.properties.find(x=>x.id===propId);
    if (p) ctx.propertyTitle = p.title;
  }
  const complexId = btn.getAttribute('data-complex');
  if (complexId) ctx.complexId = complexId;
  openLeadForm(type, ctx);
});

/* ===================== АДМИН-ПАНЕЛЬ ===================== */
const ADMIN_TABS = [
  {key:'listings', label:'Объекты', icon:'house'},
  {key:'newbuildings', label:'Новостройки', icon:'building'},
  {key:'leads', label:'Заявки', icon:'send'},
  {key:'settings', label:'Настройки сайта', icon:'sliders'},
];
function renderAdmin(){
  if (!adminAuthed){ renderAdminLogin(); return; }
  renderAdminDashboard();
}
function renderAdminLogin(){
  qs('#app').innerHTML =
    '<div class="container admin-login-wrap">'+
      '<div class="admin-login-card">'+
        '<div class="admin-shield">'+icon('shield','',40)+'</div>'+
        '<h2>Вход для сотрудников</h2>'+
        '<p class="lede" style="margin:10px 0 24px">Доступ только для авторизованных сотрудников агентства.</p>'+
        '<form id="adminLoginForm">'+
          '<div class="form-field" data-field="password" style="text-align:left"><label>Пароль</label><input type="password" name="password" autocomplete="current-password"><span class="field-error">Неверный пароль</span></div>'+
          '<button type="submit" class="btn btn-primary btn-block">Войти</button>'+
        '</form>'+
        '<p class="form-note">Демонстрационная защита интерфейса на стороне клиента (пароль по умолчанию: kluchi2026). Для реальной работы подключите серверную авторизацию сотрудников.</p>'+
      '</div>'+
    '</div>';
  qs('#adminLoginForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const input = e.target.password;
    if (input.value === ADMIN_PASSWORD){ adminAuthed = true; adminTab = 'listings'; renderAdminDashboard(); }
    else { toggleFieldError(input, true); }
  });
}
function renderAdminDashboard(){
  qs('#app').innerHTML =
    '<div class="admin-layout">'+
      '<aside class="admin-sidebar">'+
        '<div class="logo"><span class="logo-mark">'+icon('key','',24)+'</span><span class="logo-text">Ключи</span></div>'+
        '<nav class="admin-nav">'+ADMIN_TABS.map(t=>'<button type="button" data-admin-tab="'+t.key+'" class="'+(adminTab===t.key?'is-active':'')+'">'+icon(t.icon,'',18)+'<span>'+t.label+'</span></button>').join('')+'</nav>'+
        '<div class="admin-logout"><button type="button" class="btn btn-on-ink btn-block" id="adminLogoutBtn">'+icon('logout','',16)+' Выйти</button></div>'+
      '</aside>'+
      '<main class="admin-main" id="adminMain"></main>'+
    '</div>';
  qsa('[data-admin-tab]').forEach(b=> b.addEventListener('click', ()=>{ adminTab = b.getAttribute('data-admin-tab'); renderAdminDashboard(); }));
  qs('#adminLogoutBtn').addEventListener('click', ()=>{ adminAuthed = false; navigate('#/'); });
  const main = qs('#adminMain');
  if (adminTab==='listings') renderAdminListings(main);
  else if (adminTab==='newbuildings') renderAdminNewBuildings(main);
  else if (adminTab==='leads') renderAdminLeads(main);
  else renderAdminSettings(main);
}

/* ---- Объекты ---- */
function renderAdminListings(main){
  main.innerHTML =
    '<div class="admin-head"><h2>Объекты недвижимости</h2><button type="button" class="btn btn-primary" id="addPropertyBtn">'+icon('plus','',16)+' Добавить объект</button></div>'+
    '<div class="admin-note">'+icon('info','',16)+' Фотографии — демонстрационные плейсхолдеры: укажите нужное число «слотов». Для реальных фотографий потребуется подключить файловое хранилище на сервере.</div>'+
    '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Объект</th><th>Категория</th><th>Цена</th><th>Округ</th><th>Статус</th><th></th></tr></thead><tbody>'+
      DB.properties.map(p=>(
        '<tr><td>'+escapeHTML(p.title)+'</td><td>'+CATEGORY_LABELS[p.category]+'</td><td>'+(p.dealType==='rent'?formatPriceMonth(p.price):formatPrice(p.price))+'</td><td>'+escapeHTML(p.district)+'</td>'+
        '<td><span class="badge '+(p.published?'badge-success':'badge-muted')+'">'+(p.published?'Опубликован':'Скрыт')+'</span></td>'+
        '<td><div class="admin-row-actions">'+
          '<button type="button" class="icon-btn" data-admin-edit-prop="'+p.id+'" aria-label="Редактировать">'+icon('edit','',16)+'</button>'+
          '<button type="button" class="icon-btn" data-admin-toggle-pub="'+p.id+'" aria-label="Опубликовать или скрыть">'+icon(p.published?'eyeOff':'eye','',16)+'</button>'+
          '<button type="button" class="icon-btn" data-admin-delete-prop="'+p.id+'" aria-label="Удалить">'+icon('trash','',16)+'</button>'+
        '</div></td></tr>'
      )).join('')+
    '</tbody></table></div>';
  qs('#addPropertyBtn').addEventListener('click', ()=> openPropertyFormModal(null));
  qsa('[data-admin-edit-prop]').forEach(b=> b.addEventListener('click', ()=> openPropertyFormModal(b.getAttribute('data-admin-edit-prop'))));
  qsa('[data-admin-toggle-pub]').forEach(b=> b.addEventListener('click', async ()=>{
    const p = DB.properties.find(x=>x.id===b.getAttribute('data-admin-toggle-pub'));
    if (p){ p.published = !p.published; await persistProperties(); renderAdminListings(main); showToast(p.published?'Объект опубликован':'Объект скрыт','check'); }
  }));
  qsa('[data-admin-delete-prop]').forEach(b=> b.addEventListener('click', async ()=>{
    if (!confirm('Удалить объект безвозвратно?')) return;
    const id = b.getAttribute('data-admin-delete-prop');
    DB.properties = DB.properties.filter(x=>x.id!==id);
    await persistProperties(); renderAdminListings(main); showToast('Объект удалён','trash');
  }));
}
function openPropertyFormModal(id){
  editingPropertyId = id;
  const p = id ? DB.properties.find(x=>x.id===id) : null;
  const sel = (obj,val)=> Object.keys(obj).map(k=>'<option value="'+k+'" '+((p&&p[val]===k)?'selected':'')+'>'+obj[k]+'</option>').join('');
  const root = qs('#modalRoot');
  root.innerHTML =
    '<div class="modal-overlay" id="propModalOverlay"><div class="modal modal-wide">'+
      '<button type="button" class="icon-btn modal-close" id="propModalClose" aria-label="Закрыть">'+icon('close','',18)+'</button>'+
      '<h3>'+(p?'Редактирование объекта':'Новый объект')+'</h3>'+
      '<form id="propertyForm" style="margin-top:18px">'+
        '<div class="form-grid">'+
          '<div class="form-field"><label>Название</label><input name="title" value="'+(p?escapeAttr(p.title):'')+'" required></div>'+
          '<div class="form-field"><label>Категория</label><select name="category">'+Object.keys(CATEGORY_LABELS).map(k=>'<option value="'+k+'" '+(p&&p.category===k?'selected':'')+'>'+CATEGORY_LABELS[k]+'</option>').join('')+'</select></div>'+
          '<div class="form-field"><label>Сделка</label><select name="dealType"><option value="sale" '+(p&&p.dealType==='sale'?'selected':'')+'>Продажа</option><option value="rent" '+(p&&p.dealType==='rent'?'selected':'')+'>Аренда</option></select></div>'+
          '<div class="form-field"><label>Цена, ₽</label><input type="number" name="price" min="0" value="'+(p?p.price:'')+'" required></div>'+
          '<div class="form-field"><label>Округ</label><select name="district">'+DISTRICTS.map(d=>'<option value="'+d+'" '+(p&&p.district===d?'selected':'')+'>'+d+'</option>').join('')+'</select></div>'+
          '<div class="form-field"><label>Улица</label><input name="street" value="'+(p?escapeAttr(p.street):'')+'"></div>'+
          '<div class="form-field"><label>Дом</label><input name="house" value="'+(p?escapeAttr(p.house||''):'')+'"></div>'+
          '<div class="form-field"><label>Комнат (если применимо, 0 = студия)</label><input type="number" name="rooms" min="0" value="'+((p&&p.rooms!=null)?p.rooms:'')+'"></div>'+
          '<div class="form-field"><label>Площадь, м²</label><input type="number" name="area" min="0" step="0.1" value="'+((p&&p.area!=null)?p.area:'')+'"></div>'+
          '<div class="form-field"><label>Площадь кухни, м²</label><input type="number" name="kitchen" min="0" step="0.1" value="'+((p&&p.kitchen!=null)?p.kitchen:'')+'"></div>'+
          '<div class="form-field"><label>Этаж</label><input type="number" name="floor" min="0" value="'+((p&&p.floor!=null)?p.floor:'')+'"></div>'+
          '<div class="form-field"><label>Этажность дома</label><input type="number" name="floors" min="0" value="'+((p&&p.floors!=null)?p.floors:'')+'"></div>'+
          '<div class="form-field"><label>Тип дома</label><select name="buildingType"><option value="">—</option>'+sel(BUILDING_TYPE_LABELS,'buildingType')+'</select></div>'+
          '<div class="form-field"><label>Состояние</label><select name="condition"><option value="">—</option>'+sel(CONDITION_LABELS,'condition')+'</select></div>'+
          '<div class="form-field"><label>Тип коммерческого помещения</label><select name="commercialType"><option value="">—</option>'+sel(COMMERCIAL_TYPE_LABELS,'commercialType')+'</select></div>'+
        '</div>'+
        '<div class="form-field"><label>Описание</label><textarea name="description" rows="3">'+(p?escapeHTML(p.description):'')+'</textarea></div>'+
        '<div class="form-field"><label>Количество фото (плейсхолдеры)</label>'+
          '<div class="photo-slot-picker">'+[1,2,3,4,5,6,7,8,9,10].map(n=>'<button type="button" data-photo-count="'+n+'" class="'+((p?p.photos:6)===n?'is-active':'')+'">'+n+'</button>').join('')+'</div>'+
          '<input type="hidden" name="photos" value="'+(p?p.photos:6)+'">'+
        '</div>'+
        '<label class="form-consent"><input type="checkbox" name="published" '+((!p||p.published)?'checked':'')+'><span>Опубликовать объект на сайте</span></label>'+
        '<button type="submit" class="btn btn-primary btn-block" style="margin-top:10px">'+(p?'Сохранить изменения':'Добавить объект')+'</button>'+
      '</form>'+
    '</div></div>';
  qs('#propModalClose').addEventListener('click', closeModal);
  qs('#propModalOverlay').addEventListener('click', (e)=>{ if (e.target.id==='propModalOverlay') closeModal(); });
  qsa('[data-photo-count]').forEach(b=> b.addEventListener('click', ()=>{
    qsa('[data-photo-count]').forEach(x=>x.classList.remove('is-active'));
    b.classList.add('is-active');
    qs('#propertyForm [name=photos]').value = b.getAttribute('data-photo-count');
  }));
  qs('#propertyForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const get = (k)=> fd.get(k);
    const num = (k)=> fd.get(k)==='' || fd.get(k)===null ? null : Number(fd.get(k));
    const data = {
      title:get('title')||'Без названия', category:get('category'), dealType:get('dealType'),
      price:Number(get('price'))||0, district:get('district'), street:get('street')||'', house:get('house')||'',
      rooms:num('rooms'), area:num('area'), kitchen:num('kitchen'), floor:num('floor'), floors:num('floors'),
      buildingType:get('buildingType')||null, condition:get('condition')||null, commercialType:get('commercialType')||null,
      description:get('description')||'', photos:Number(get('photos'))||6, published: fd.get('published')==='on',
    };
    if (p){ Object.assign(p, data); }
    else {
      const coords = jitterCoord(DISTRICT_COORDS[data.district]||DISTRICT_COORDS['Центральный'], DB.properties.length);
      DB.properties.unshift(Object.assign({id:uid(data.category||'obj'), createdAt:new Date().toISOString().slice(0,10), lat:coords[0], lng:coords[1]}, data));
    }
    await persistProperties();
    closeModal();
    if (qs('#adminMain')){ renderAdminListings(qs('#adminMain')); }
    showToast(p?'Изменения сохранены':'Объект добавлен','check');
  });
  document.addEventListener('keydown', modalKeyHandler);
}

/* ---- Новостройки ---- */
function renderAdminNewBuildings(main){
  main.innerHTML =
    '<div class="admin-head"><h2>Новостройки</h2><button type="button" class="btn btn-primary" id="addComplexBtn">'+icon('plus','',16)+' Добавить ЖК</button></div>'+
    '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Название</th><th>Застройщик</th><th>Округ</th><th>Срок сдачи</th><th>Цена от</th><th></th></tr></thead><tbody>'+
      DB.newBuildings.map(c=>(
        '<tr><td>'+escapeHTML(c.name)+'</td><td>'+escapeHTML(c.developer||'—')+'</td><td>'+escapeHTML(c.district)+'</td><td>'+escapeHTML(c.completion||'—')+'</td><td>'+formatPrice(c.minPrice)+'</td>'+
        '<td><div class="admin-row-actions">'+
          '<button type="button" class="icon-btn" data-edit-complex="'+c.id+'" aria-label="Редактировать">'+icon('edit','',16)+'</button>'+
          '<button type="button" class="icon-btn" data-delete-complex="'+c.id+'" aria-label="Удалить">'+icon('trash','',16)+'</button>'+
        '</div></td></tr>'
      )).join('')+
    '</tbody></table></div>';
  qs('#addComplexBtn').addEventListener('click', ()=> openComplexFormModal(null));
  qsa('[data-edit-complex]').forEach(b=> b.addEventListener('click', ()=> openComplexFormModal(b.getAttribute('data-edit-complex'))));
  qsa('[data-delete-complex]').forEach(b=> b.addEventListener('click', async ()=>{
    if (!confirm('Удалить жилой комплекс?')) return;
    const id = b.getAttribute('data-delete-complex');
    DB.newBuildings = DB.newBuildings.filter(x=>x.id!==id);
    await persistNewBuildings(); renderAdminNewBuildings(main); showToast('ЖК удалён','trash');
  }));
}
function openComplexFormModal(id){
  editingComplexId = id;
  const c = id ? DB.newBuildings.find(x=>x.id===id) : null;
  const L = (c && c.layouts) || [];
  const layoutRow = (i)=>{
    const l = L[i];
    return '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px">'+
      '<input type="number" name="l'+i+'rooms" placeholder="Комнат (0=студия)" value="'+(l?l.rooms:'')+'">'+
      '<input type="number" name="l'+i+'area" placeholder="Площадь м²" value="'+(l?l.area:'')+'">'+
      '<input type="number" name="l'+i+'price" placeholder="Цена от" value="'+(l?l.priceFrom:'')+'">'+
    '</div>';
  };
  const root = qs('#modalRoot');
  root.innerHTML =
    '<div class="modal-overlay" id="complexModalOverlay"><div class="modal modal-wide">'+
      '<button type="button" class="icon-btn modal-close" id="complexModalClose" aria-label="Закрыть">'+icon('close','',18)+'</button>'+
      '<h3>'+(c?'Редактирование ЖК':'Новый жилой комплекс')+'</h3>'+
      '<form id="complexForm" style="margin-top:18px">'+
        '<div class="form-grid">'+
          '<div class="form-field"><label>Название ЖК</label><input name="name" value="'+(c?escapeAttr(c.name):'')+'" required></div>'+
          '<div class="form-field"><label>Застройщик</label><input name="developer" value="'+(c?escapeAttr(c.developer||''):'')+'"></div>'+
          '<div class="form-field"><label>Округ</label><select name="district">'+DISTRICTS.map(d=>'<option value="'+d+'" '+(c&&c.district===d?'selected':'')+'>'+d+'</option>').join('')+'</select></div>'+
          '<div class="form-field"><label>Улица</label><input name="street" value="'+(c?escapeAttr(c.street||''):'')+'"></div>'+
          '<div class="form-field"><label>Срок сдачи</label><input name="completion" value="'+(c?escapeAttr(c.completion||''):'')+'" placeholder="например, 4 кв. 2026"></div>'+
          '<div class="form-field"><label>Статус</label><input name="status" value="'+(c?escapeAttr(c.status||''):'Строится')+'"></div>'+
          '<div class="form-field"><label>Минимальная цена, ₽</label><input type="number" name="minPrice" value="'+(c?c.minPrice:'')+'"></div>'+
          '<div class="form-field"><label>Фото (кол-во плейсхолдеров)</label><input type="number" name="photos" min="1" max="12" value="'+(c?c.photos:6)+'"></div>'+
        '</div>'+
        '<div class="form-field"><label>Описание</label><textarea name="description" rows="3">'+(c?escapeHTML(c.description||''):'')+'</textarea></div>'+
        '<div class="form-field"><label>Планировки (до 3 вариантов; заполните площадь и цену, чтобы вариант учитывался)</label>'+layoutRow(0)+layoutRow(1)+layoutRow(2)+'</div>'+
        '<button type="submit" class="btn btn-primary btn-block">'+(c?'Сохранить изменения':'Добавить ЖК')+'</button>'+
      '</form>'+
    '</div></div>';
  qs('#complexModalClose').addEventListener('click', closeModal);
  qs('#complexModalOverlay').addEventListener('click', (e)=>{ if (e.target.id==='complexModalOverlay') closeModal(); });
  qs('#complexForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const get = (k)=> fd.get(k);
    const layouts = [];
    for (let i=0;i<3;i++){
      const area = get('l'+i+'area'), price = get('l'+i+'price'), rooms = get('l'+i+'rooms');
      if (area && price) layouts.push({rooms: rooms===''?null:Number(rooms), area:Number(area), priceFrom:Number(price)});
    }
    const data = {
      name:get('name')||'ЖК без названия', developer:get('developer')||'', district:get('district'),
      street:get('street')||'', completion:get('completion')||'', status:get('status')||'Строится',
      minPrice:Number(get('minPrice'))||0, photos:Number(get('photos'))||6, description:get('description')||'',
      layouts: layouts.length?layouts:L,
    };
    if (c){ Object.assign(c, data); }
    else {
      const coords = jitterCoord(DISTRICT_COORDS[data.district]||DISTRICT_COORDS['Центральный'], DB.newBuildings.length);
      DB.newBuildings.unshift(Object.assign({id:uid('cplx'), lat:coords[0], lng:coords[1]}, data));
    }
    await persistNewBuildings();
    closeModal();
    if (qs('#adminMain')) renderAdminNewBuildings(qs('#adminMain'));
    showToast(c?'Изменения сохранены':'ЖК добавлен','check');
  });
  document.addEventListener('keydown', modalKeyHandler);
}

/* ---- Заявки ---- */
function renderAdminLeads(main){
  const leads = DB.leads;
  main.innerHTML =
    '<div class="admin-head"><h2>Заявки</h2><div class="catalog-count">'+leads.length+' '+pluralRu(leads.length,['заявка','заявки','заявок'])+'</div></div>'+
    (leads.length ?
      '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Дата</th><th>Тип</th><th>Имя</th><th>Телефон</th><th>Объект</th><th>Статус</th><th>Комментарий</th></tr></thead><tbody>'+
        leads.map(l=>(
          '<tr><td>'+new Date(l.createdAt).toLocaleDateString('ru-RU')+'</td><td>'+(LEAD_TYPE_LABELS[l.type]||l.type)+'</td><td>'+escapeHTML(l.name)+'</td>'+
          '<td><a href="tel:'+escapeAttr(l.phone)+'">'+escapeHTML(l.phone)+'</a></td><td>'+(l.propertyTitle?escapeHTML(l.propertyTitle):'—')+'</td>'+
          '<td><select class="status-select" data-lead-status="'+l.id+'">'+Object.keys(LEAD_STATUS_LABELS).map(k=>'<option value="'+k+'" '+(l.status===k?'selected':'')+'>'+LEAD_STATUS_LABELS[k]+'</option>').join('')+'</select></td>'+
          '<td><input type="text" class="calc-number-input" data-lead-comment="'+l.id+'" value="'+escapeAttr(l.staffComment||'')+'" placeholder="Комментарий сотрудника" style="min-width:180px;margin-top:0"></td></tr>'
        )).join('')+
      '</tbody></table></div>'
      : '<div class="empty-state">'+icon('send','',40)+'<h3>Заявок пока нет</h3><p>Новые обращения с сайта появятся здесь.</p></div>');
  qsa('[data-lead-status]').forEach(sel=> sel.addEventListener('change', async ()=>{
    const lead = DB.leads.find(l=>l.id===sel.getAttribute('data-lead-status'));
    if (lead){ lead.status = sel.value; await persistLeads(); showToast('Статус обновлён','check'); }
  }));
  qsa('[data-lead-comment]').forEach(inp=> inp.addEventListener('change', async ()=>{
    const lead = DB.leads.find(l=>l.id===inp.getAttribute('data-lead-comment'));
    if (lead){ lead.staffComment = inp.value; await persistLeads(); }
  }));
}

/* ---- Настройки сайта ---- */
function renderAdminSettings(main){
  const s = DB.settings;
  main.innerHTML =
    '<div class="admin-head"><h2>Настройки сайта</h2></div>'+
    '<div class="admin-note">'+icon('info','',16)+' Эти данные сразу отражаются в шапке, подвале и на странице контактов.</div>'+
    '<form id="settingsForm" class="calc-card" style="max-width:680px">'+
      '<div class="form-grid">'+
        '<div class="form-field"><label>Телефон (отображаемый)</label><input name="phone" value="'+escapeAttr(s.phone)+'"></div>'+
        '<div class="form-field"><label>Телефон для ссылки (цифры, можно с +)</label><input name="phoneRaw" value="'+escapeAttr(s.phoneRaw)+'"></div>'+
        '<div class="form-field"><label>Email</label><input name="email" value="'+escapeAttr(s.email)+'"></div>'+
        '<div class="form-field"><label>Режим работы</label><input name="hours" value="'+escapeAttr(s.hours)+'"></div>'+
      '</div>'+
      '<div class="form-field"><label>Адрес офиса</label><input name="address" value="'+escapeAttr(s.address)+'"></div>'+
      '<div class="form-grid">'+
        '<div class="form-field"><label>WhatsApp (номер)</label><input name="whatsapp" value="'+escapeAttr(s.whatsapp||'')+'"></div>'+
        '<div class="form-field"><label>Telegram (@username)</label><input name="telegram" value="'+escapeAttr(s.telegram||'')+'"></div>'+
      '</div>'+
      '<div class="form-field"><label>Заголовок на главной</label><input name="heroTitle" value="'+escapeAttr(s.heroTitle)+'"></div>'+
      '<div class="form-field"><label>Подзаголовок на главной</label><textarea name="heroSubtitle" rows="2">'+escapeHTML(s.heroSubtitle)+'</textarea></div>'+
      '<div class="form-field"><label>Текст о компании</label><textarea name="aboutText" rows="3">'+escapeHTML(s.aboutText)+'</textarea></div>'+
      '<button type="submit" class="btn btn-primary">Сохранить настройки</button>'+
    '</form>';
  qs('#settingsForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    for (const pair of fd.entries()) DB.settings[pair[0]] = pair[1];
    await persistSettings();
    updateHeaderFooterFromSettings();
    showToast('Настройки сохранены','check');
  });
}

/* ===================== ЗАПУСК ПРИЛОЖЕНИЯ ===================== */
async function init(){
  try{
    await loadAllData();
  }catch(e){ console.error('Data load error', e); }
  updateHeaderFooterFromSettings();
  updateFavCountBadge();
  bindGlobalEvents();
  router();
}
window.addEventListener('hashchange', router);
init();
