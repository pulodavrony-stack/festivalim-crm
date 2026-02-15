const { chromium } = require('playwright');

(async () => {
  console.log('Запуск браузера...');
  
  // Запускаем видимый браузер
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Чтобы было видно что происходит
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // 1. Заходим в ЛК UIS
  console.log('1. Открываю ЛК UIS...');
  await page.goto('https://www.uiscom.ru/user/');
  await page.waitForTimeout(3000);
  
  // Проверяем авторизованы ли мы
  const url = page.url();
  console.log('URL:', url);
  
  if (url.includes('/user/') && !url.includes('login')) {
    console.log('Авторизация не нужна — уже в ЛК');
  } else {
    console.log('');
    console.log('⚠️  Нужна авторизация!');
    console.log('Пожалуйста, войдите в ЛК UIS в открывшемся окне браузера.');
    console.log('Скрипт подождёт 60 секунд...');
    console.log('');
    
    // Ждем пока пользователь залогинится
    await page.waitForTimeout(60000);
  }
  
  try {
    // 2. Переходим в настройки безопасности API
    console.log('2. Ищу раздел Аккаунт -> Безопасность -> API...');
    
    // Пробуем разные URL для настроек
    const settingsUrls = [
      'https://my.uiscom.ru/settings/security',
      'https://my.uiscom.ru/account/security',
    ];
    
    // Делаем скриншот текущей страницы
    await page.screenshot({ path: '/tmp/uis-step1.png' });
    console.log('Скриншот: /tmp/uis-step1.png');
    
    // Ищем ссылки на странице
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({
        text: a.textContent?.trim(),
        href: a.href
      })).filter(l => l.text && l.text.length > 0);
    });
    
    console.log('Найдено ссылок:', links.length);
    links.forEach(l => {
      if (l.text.toLowerCase().includes('аккаунт') || 
          l.text.toLowerCase().includes('безопас') ||
          l.text.toLowerCase().includes('api') ||
          l.text.toLowerCase().includes('настрой') ||
          l.text.toLowerCase().includes('интеграц') ||
          l.text.toLowerCase().includes('webhook')) {
        console.log(`  → "${l.text}" : ${l.href}`);
      }
    });
    
    // Скриншот
    await page.screenshot({ path: '/tmp/uis-final.png' });
    console.log('Финальный скриншот: /tmp/uis-final.png');
    
  } catch (err) {
    console.error('Ошибка:', err.message);
  }
  
  console.log('');
  console.log('Браузер останется открытым 120 секунд для ручной работы.');
  console.log('Можете вручную добавить IP 147.45.155.119 в белый список API.');
  await page.waitForTimeout(120000);
  
  await browser.close();
  console.log('Готово!');
})();
