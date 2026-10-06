const fs = require('fs');
const path = require('path');
const { loadApp, readIndexHtml, createFakeApi, requireApp, APP_PATH } = require('./setup/loadApp');

const CSS_PATH = path.join(path.dirname(APP_PATH), 'style.css');

function click(document, id) {
  document.getElementById(id).dispatchEvent(new window.Event('click', { bubbles: true }));
}

/** The inline script in <head> that applies a saved theme before first paint. */
function runHeadScript() {
  const head = readIndexHtml().match(/<head>([\s\S]*)<\/head>/)[1];
  const code = head.match(/<script>([\s\S]*?)<\/script>/)[1];
  new Function(code)();
}

function theme(document) {
  return document.documentElement.getAttribute('data-theme');
}

describe('theme toggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete window.matchMedia;
  });

  test('AC-1: the header toggle switches theme and names the theme you will get', async () => {
    const { document } = await loadApp();
    const button = document.getElementById('theme-toggle');
    expect(document.getElementById('app-header').contains(button)).toBe(true);

    expect(theme(document)).toBe('dark');
    expect(button.textContent).toBe('Light theme');

    click(document, 'theme-toggle');
    expect(theme(document)).toBe('light');
    expect(button.textContent).toBe('Dark theme');

    click(document, 'theme-toggle');
    expect(theme(document)).toBe('dark');
    expect(button.textContent).toBe('Light theme');
  });

  test('AC-2: the theme lives on <html> and every colour comes from CSS variables', async () => {
    const { document } = await loadApp();
    expect(document.body.hasAttribute('data-theme')).toBe(false);
    expect(['light', 'dark']).toContain(theme(document));

    const js = fs.readFileSync(APP_PATH, 'utf8');
    expect(js).not.toMatch(/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b|\brgba?\(|\bhsla?\(/);

    const chartMarks = document.querySelectorAll('#chart-on-time rect, #chart-on-time text, #chart-tickets rect, #chart-tickets text');
    expect(chartMarks.length).toBeGreaterThan(0);
    chartMarks.forEach((el) => {
      expect(el.hasAttribute('fill')).toBe(false);
      expect(el.hasAttribute('style')).toBe(false);
    });

    const css = fs.readFileSync(CSS_PATH, 'utf8');
    expect(css).toMatch(/\[data-theme="light"\]\s*\{/);
    expect(css).toMatch(/\[data-theme="dark"\]/);
    const chartRules = css.match(/\.chart-svg \.[^{]+\{[^}]*\}/g) || [];
    expect(chartRules.length).toBeGreaterThanOrEqual(4);
    chartRules.forEach((rule) => {
      expect(rule).toMatch(/fill:\s*var\(--/);
    });
  });

  test('AC-3: the choice is saved in localStorage and restored on load', async () => {
    let { document } = await loadApp();
    click(document, 'theme-toggle');
    expect(window.localStorage.getItem('ops-dashboard-theme')).toBe('light');

    ({ document } = await loadApp());
    expect(theme(document)).toBe('light');
    expect(document.getElementById('theme-toggle').textContent).toBe('Dark theme');
  });

  test('AC-4: dark by default, ignoring the OS setting and any unknown stored value', async () => {
    window.matchMedia = jest.fn(() => ({ matches: true, media: '(prefers-color-scheme: light)' }));
    let { document } = await loadApp();
    expect(theme(document)).toBe('dark');
    expect(document.getElementById('theme-toggle').textContent).toBe('Light theme');
    expect(window.matchMedia).not.toHaveBeenCalled();

    window.localStorage.setItem('ops-dashboard-theme', 'purple');
    ({ document } = await loadApp());
    expect(theme(document)).toBe('dark');
  });

  test('the theme still applies and toggles when the API is unreachable', async () => {
    window.localStorage.setItem('ops-dashboard-theme', 'light');
    const { document } = await loadApp({ failing: ['/api/health'] });
    expect(theme(document)).toBe('light');
    click(document, 'theme-toggle');
    expect(theme(document)).toBe('dark');
  });

  test('index.html ships <html data-theme="dark">, the AC-4 default before any script runs', () => {
    expect(readIndexHtml()).toMatch(/<html[^>]*\sdata-theme="dark"/);
  });

  test('the <head> script applies a saved theme before first paint, and ignores unknown values', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    window.localStorage.setItem('ops-dashboard-theme', 'light');
    runHeadScript();
    expect(theme(document)).toBe('light');

    document.documentElement.setAttribute('data-theme', 'dark');
    window.localStorage.setItem('ops-dashboard-theme', 'purple');
    runHeadScript();
    expect(theme(document)).toBe('dark');
  });

  test('a page without the toggle (e.g. an old cached index.html) still loads the dashboard', async () => {
    await loadApp();
    document.getElementById('theme-toggle').remove();
    const api = createFakeApi();
    const app = requireApp().initApp(document, api.fetchImpl);
    await app.ready;
    expect(document.querySelector('#kpi-orders .kpi-value').textContent).toBe('624');
    expect(theme(document)).toBe('dark');
    app.toggleTheme();
    expect(theme(document)).toBe('light');
  });
});
