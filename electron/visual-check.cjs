const { BrowserWindow, screen } = require('electron');

// Opt-in local diagnostic, never created during normal application startup.
// Its button is deliberately beneath the unused portion of the overlay HWND.
module.exports = async function visualCheck(overlay) {
  const area = screen.getDisplayMatching(overlay.getBounds()).workArea;
  const width = Math.min(760, area.width), height = Math.min(660, area.height);
  const win = new BrowserWindow({ x: Math.round(area.x + (area.width - width) / 2), y: area.y, width, height, title: 'Dynamic Island — Visual check', backgroundColor: '#f4f5f8', autoHideMenuBar: true, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  win.setMenu(null);
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`<!doctype html><html><meta charset="utf-8"><title>Dynamic Island — Visual check</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f4f5f8;color:#18202c;font:15px/1.6 Segoe UI,sans-serif}main{padding:110px 34px 30px;min-height:100vh;background:repeating-linear-gradient(45deg,#8795aa0c 0 1px,transparent 1px 18px)}h1{font-size:22px;margin:0 0 12px}p{max-width:590px}button{border:1px solid #67778b66;background:#e7ebf2;color:inherit;border-radius:14px;padding:16px 22px;cursor:pointer;font:inherit}#probe{display:block;width:100%;margin:28px 0 18px}body.dark{background:#151922;color:#edf1f7}body.dark button{background:#272f40}#result{font-weight:600}small{display:block;margin-top:28px;opacity:.65}</style><main><h1>Проверка прозрачности Dynamic Island</h1><p>Над этой поверхностью должен быть виден только остров. Текст и фон под остальной частью его окна должны оставаться без серого слоя.</p><button id="probe">Проверить клик сквозь прозрачную область</button><p id="result" role="status">Кликов: 0</p><button id="theme">Светлый / тёмный фон</button><small>Локальная проверка сборки. Это окно можно закрыть; остров продолжит работать.</small></main><script>let clicks=0;document.getElementById('probe').onclick=()=>document.getElementById('result').textContent='Кликов: '+(++clicks);document.getElementById('theme').onclick=()=>document.body.classList.toggle('dark');</script></html>`));
  win.show();
  overlay.showInactive();
  return win;
};
