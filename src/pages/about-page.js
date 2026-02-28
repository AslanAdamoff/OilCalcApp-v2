/**
 * About Page - Port of AboutView.swift + SettingsView.swift
 * Bilingual EN/RU content about the app and standards
 * Includes theme toggle (dark/light)
 */

export function renderAboutPage() {
  const page = document.createElement('div');
  page.className = 'page';

  let lang = 'en';

  function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }

  function toggleTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('oilcalc-theme', theme);
  }

  // Apply saved theme on load
  const savedTheme = localStorage.getItem('oilcalc-theme') || 'dark';
  toggleTheme(savedTheme);

  function render() {
    const currentTheme = getCurrentTheme();
    page.innerHTML = `
      <h1 class="page-title">${lang === 'en' ? 'About' : 'О приложении'}</h1>

      <!-- Theme Switcher -->
      <div class="card" style="padding: 16px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="display:flex;align-items:center;opacity:0.7;">${currentTheme === 'dark' ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>' : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'}</span>
            <span style="font-weight: 600; color: var(--text-primary);">${lang === 'en' ? 'Theme' : 'Тема'}</span>
          </div>
          <div class="segmented" style="max-width: 200px;">
            <input type="radio" name="themeToggle" id="themeDark" value="dark" ${currentTheme === 'dark' ? 'checked' : ''}>
            <label for="themeDark">${lang === 'en' ? 'Dark' : 'Тёмная'}</label>
            <input type="radio" name="themeToggle" id="themeLight" value="light" ${currentTheme === 'light' ? 'checked' : ''}>
            <label for="themeLight">${lang === 'en' ? 'Light' : 'Светлая'}</label>
          </div>
        </div>
      </div>

      <!-- Language Switcher -->
      <div class="card" style="padding: 16px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="display:flex;align-items:center;opacity:0.7;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span>
            <span style="font-weight: 600; color: var(--text-primary);">${lang === 'en' ? 'Language' : 'Язык'}</span>
          </div>
          <div class="segmented" style="max-width: 200px;">
            <input type="radio" name="aboutLang" id="langEn" value="en" ${lang === 'en' ? 'checked' : ''}>
            <label for="langEn">English</label>
            <input type="radio" name="aboutLang" id="langRu" value="ru" ${lang === 'ru' ? 'checked' : ''}>
            <label for="langRu">Русский</label>
          </div>
        </div>
      </div>

      ${lang === 'en' ? renderEnglish() : renderRussian()}

      <div style="text-align: center; margin-top: var(--spacing-xl); padding: var(--spacing-lg); color: var(--text-muted); font-size: var(--font-xs);">
        OilCalcApp Web v1.0<br>
        Created by <strong style="color: var(--accent);">Aslan Adamov</strong><br>
        All rights reserved.
      </div>
    `;

    page.querySelectorAll('input[name="aboutLang"]').forEach(r => {
      r.addEventListener('change', (e) => {
        lang = e.target.value;
        render();
      });
    });

    page.querySelectorAll('input[name="themeToggle"]').forEach(r => {
      r.addEventListener('change', (e) => {
        toggleTheme(e.target.value);
        render();
      });
    });
  }

  render();
  return page;
}

function renderEnglish() {
  return `
    <div class="card">
      <div class="about-section">
        <h3>Description</h3>
        <p>OilCalcApp is a professional tool for surveyors and logistics specialists designed for accurate conversion of mass and volume of petroleum products, as well as analysis of discrepancies (losses) during transportation.</p>
      </div>
    </div>

    <div class="card">
      <div class="about-section">
        <h3>Key Features</h3>
        
        <p class="about-feature-title">1. Conversion Calculator:</p>
        <ul>
          <li>Calculation of volume at 15°C and actual temperature based on mass and density.</li>
          <li>Reverse calculation (mass from volume).</li>
        </ul>

        <p class="about-feature-title">2. Loss Analysis (Trip Calculator):</p>
        <ul>
          <li>Comparison of cargo quantity between multiple route points (loading, discharge, transit).</li>
          <li>Detailed analysis of discrepancies (Delta) by mass and volume for each segment.</li>
          <li>Support for unlimited number of points.</li>
        </ul>

        <p class="about-feature-title">3. Data Management:</p>
        <ul>
          <li>Template system for saving regular routes.</li>
          <li>Full calculation history with detailed view.</li>
        </ul>
      </div>
    </div>

    <div class="card">
      <div class="about-section">
        <h3>Standards and Methodology</h3>
        <p style="margin-bottom: var(--spacing-sm);">The application uses algorithms compliant with international standards for oil and petroleum product calculations:</p>
        <ul>
          <li><span class="about-standard">ASTM D1250-04 / API MPMS Chapter 11.1</span> - Standard Volume Correction Tables.</li>
          <li><span class="about-standard">Table 54A / 54B</span> - For volume correction to 15°C (Generalized Crude Oils & Products).</li>
          <li><span class="about-standard">Table 60A / 60B</span> - For density conversion.</li>
          <li><span class="about-standard">VCF</span> - Uses thermal expansion coefficients for crude oil, fuels, and lubricating oils.</li>
          <li>Units: Mass (kg), Density (kg/l), Temperature (°C).</li>
        </ul>
      </div>
    </div>
  `;
}

function renderRussian() {
  return `
    <div class="card">
      <div class="about-section">
        <h3>Описание</h3>
        <p>OilCalcApp - это профессиональный инструмент для сюрвейеров и специалистов по логистике, предназначенный для точного пересчета массы и объема нефтепродуктов, а также анализа расхождений (потерь) при транспортировке.</p>
      </div>
    </div>

    <div class="card">
      <div class="about-section">
        <h3>Основные возможности</h3>
        
        <p class="about-feature-title">1. Калькулятор пересчета:</p>
        <ul>
          <li>Расчет объема при 15°C и фактической температуре на основе массы и плотности.</li>
          <li>Обратный расчет (массы по объему).</li>
        </ul>

        <p class="about-feature-title">2. Анализ потерь (Trip Calculator):</p>
        <ul>
          <li>Сравнение количества груза между несколькими точками маршрута (погрузка, выгрузка, транзит).</li>
          <li>Детальный анализ расхождений (Delta) по массе и объему для каждого сегмента пути.</li>
          <li>Поддержка неограниченного количества точек.</li>
        </ul>

        <p class="about-feature-title">3. Управление данными:</p>
        <ul>
          <li>Система шаблонов для сохранения регулярных маршрутов.</li>
          <li>Полная история расчетов с детализацией.</li>
        </ul>
      </div>
    </div>

    <div class="card">
      <div class="about-section">
        <h3>Используемые стандарты</h3>
        <p style="margin-bottom: var(--spacing-sm);">Приложение использует алгоритмы, соответствующие международным стандартам для расчетов нефти и нефтепродуктов:</p>
        <ul>
          <li><span class="about-standard">ASTM D1250-04 / API MPMS Chapter 11.1</span> - Стандартные таблицы коррекции объемов.</li>
          <li><span class="about-standard">Table 54A / 54B</span> - Для коррекции объема к 15°C (Generalized Crude Oils & Products).</li>
          <li><span class="about-standard">Table 60A / 60B</span> - Для пересчета плотности.</li>
          <li><span class="about-standard">VCF</span> - Коэффициенты теплового расширения для сырой нефти, топлив и смазочных масел.</li>
          <li>Единицы измерения: Масса (kg), Плотность (kg/l), Температура (°C).</li>
        </ul>
      </div>
    </div>
  `;
}
