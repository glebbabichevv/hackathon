import type { CityState, AIAnalysis } from '../types/city'

interface Props {
  state: CityState
  analysis: AIAnalysis
}

export function ExportButton({ state, analysis }: Props) {
  const handleExport = () => {
    const win = window.open('', '_blank')
    if (!win) return

    const scoreColor = state.overallScore >= 70 ? '#16a34a' : state.overallScore >= 40 ? '#d97706' : '#dc2626'
    const critAlerts = Object.values(state.sectors).flatMap(s => s.alerts).filter(a => a.severity === 'critical')
    const liveKpis = Object.values(state.sectors).flatMap(s => s.kpis).filter(k => k.isLive)

    win.document.write(`<!DOCTYPE html><html lang="ru"><head>
<meta charset="UTF-8"/>
<title>Ситуационный отчёт — ${state.city} — ${new Date().toLocaleDateString('ru-RU')}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
  h1 { font-size: 22px; color: #0f172a; border-bottom: 3px solid #0ea5e9; padding-bottom: 12px; margin-bottom: 20px; }
  h2 { font-size: 15px; color: #1e3a5f; margin: 24px 0 10px; }
  .meta { display: flex; gap: 30px; background: #f8fafc; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px; }
  .score { font-size: 42px; font-weight: 900; color: ${scoreColor}; }
  .score-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
  .section { margin: 16px 0; padding: 14px 18px; border-left: 4px solid #0ea5e9; background: #f0f9ff; border-radius: 0 8px 8px 0; }
  .critical { border-color: #ef4444; background: #fef2f2; }
  .warning { border-color: #f59e0b; background: #fffbeb; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
  th { background: #1e3a5f; color: white; padding: 8px 12px; text-align: left; }
  td { padding: 7px 12px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8fafc; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; }
  .badge-crit { background: #fecaca; color: #dc2626; }
  .badge-warn { background: #fef3c7; color: #d97706; }
  .badge-live { background: #dcfce7; color: #16a34a; }
  ul { margin: 8px 0 8px 20px; }
  li { margin: 4px 0; font-size: 14px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
  @media print { body { padding: 20px; } }
</style></head><body>

<h1>🏙️ Ситуационный отчёт — ${state.city}</h1>

<div class="meta">
  <div>
    <div class="score">${state.overallScore}</div>
    <div class="score-label">Индекс здоровья / 100</div>
  </div>
  <div style="flex:1">
    <p><strong>Дата и время:</strong> ${new Date().toLocaleString('ru-RU')}</p>
    <p><strong>Статус:</strong> ${state.overallSeverity === 'critical' ? '🔴 Критическая ситуация' : state.overallSeverity === 'warning' ? '🟡 Требует внимания' : '🟢 Штатная обстановка'}</p>
    <p><strong>Реальных данных:</strong> ${liveKpis.length} KPI (Open-Meteo · USGS)</p>
    <p><strong>Критических инцидентов:</strong> ${critAlerts.length}</p>
  </div>
</div>

<div class="section ${state.overallScore < 50 ? 'critical' : 'warning'}">
  <h2>📊 Что происходит</h2>
  <p>${analysis.whatHappening || 'Нет данных AI-анализа'}</p>
</div>

<div class="section ${state.overallScore < 50 ? 'critical' : 'warning'}">
  <h2>⚠️ Уровень критичности</h2>
  <p>${analysis.howCritical || 'Нет данных'}</p>
</div>

<div class="section">
  <h2>✅ Рекомендуемые действия</h2>
  <p>${analysis.whatToDo || 'Нет данных'}</p>
</div>

${analysis.predictions.length > 0 ? `
<h2>📈 Прогнозы на ближайшие 2 часа</h2>
<ul>${analysis.predictions.map(p => `<li>${p}</li>`).join('')}</ul>
` : ''}

<h2>🚨 Критические инциденты (${critAlerts.length})</h2>
${critAlerts.length > 0 ? `
<table>
<tr><th>Сектор</th><th>Инцидент</th><th>Место</th><th>Источник</th><th>Действие</th></tr>
${critAlerts.map(a => `<tr>
  <td>${a.sector}</td>
  <td><strong>${a.title}</strong><br><small>${a.description}</small></td>
  <td>${a.location || '—'}</td>
  <td><span class="badge badge-${a.source ? 'live' : 'warn'}">${a.source || 'Симуляция'}</span></td>
  <td>${a.actionRequired}</td>
</tr>`).join('')}
</table>` : '<p style="color:#64748b">Критических инцидентов нет</p>'}

<h2>📊 KPI по секторам</h2>
<table>
<tr><th>Показатель</th><th>Значение</th><th>Статус</th><th>Источник</th></tr>
${Object.values(state.sectors).flatMap(s => s.kpis).map(k => `
<tr>
  <td>${k.label}</td>
  <td><strong>${k.value} ${k.unit}</strong></td>
  <td><span class="badge badge-${k.severity === 'critical' ? 'crit' : k.severity === 'warning' ? 'warn' : 'live'}">${k.severity === 'critical' ? 'КРИТИЧНО' : k.severity === 'warning' ? 'ВНИМАНИЕ' : 'НОРМА'}</span></td>
  <td>${k.isLive ? `<span class="badge badge-live">🟢 ${k.source}</span>` : '<span class="badge badge-warn">⚪ Симул.</span>'}</td>
</tr>`).join('')}
</table>

<div class="footer">
  Сформировано: ${new Date().toLocaleString('ru-RU')} · Smart City Almaty Dashboard<br/>
  Данные: Open-Meteo (погода + CAMS качество воздуха) · USGS (сейсмика) · AI-анализ: Ollama / Claude
</div>
</body></html>`)

    win.document.close()
    win.document.body.insertAdjacentHTML('beforeend', `
      <div style="position:fixed;bottom:20px;right:20px;z-index:999">
        <button onclick="window.print()" style="background:#0ea5e9;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:14px;cursor:pointer;margin-right:8px">🖨️ Печать / PDF</button>
        <button onclick="window.close()" style="background:#334155;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:14px;cursor:pointer">✕ Закрыть</button>
      </div>
    `)
  }

  const handleDownload = () => {
    const scoreColor = state.overallScore >= 70 ? '#16a34a' : state.overallScore >= 40 ? '#d97706' : '#dc2626'
    const critAlerts = Object.values(state.sectors).flatMap(s => s.alerts).filter(a => a.severity === 'critical')
    const liveKpis = Object.values(state.sectors).flatMap(s => s.kpis).filter(k => k.isLive)
    const date = new Date().toLocaleDateString('ru-RU')
    const datetime = new Date().toLocaleString('ru-RU')

    const html = `<!DOCTYPE html><html lang="ru"><head>
<meta charset="UTF-8"/>
<title>Ситуационный отчёт — ${state.city} — ${date}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
  h1 { font-size: 22px; color: #0f172a; border-bottom: 3px solid #0ea5e9; padding-bottom: 12px; margin-bottom: 20px; }
  h2 { font-size: 15px; color: #1e3a5f; margin: 24px 0 10px; }
  .meta { display: flex; gap: 30px; background: #f8fafc; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px; }
  .score { font-size: 42px; font-weight: 900; color: ${scoreColor}; }
  .score-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
  .section { margin: 16px 0; padding: 14px 18px; border-left: 4px solid #0ea5e9; background: #f0f9ff; border-radius: 0 8px 8px 0; }
  .critical { border-color: #ef4444; background: #fef2f2; }
  .warning { border-color: #f59e0b; background: #fffbeb; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
  th { background: #1e3a5f; color: white; padding: 8px 12px; text-align: left; }
  td { padding: 7px 12px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8fafc; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; }
  .badge-crit { background: #fecaca; color: #dc2626; }
  .badge-warn { background: #fef3c7; color: #d97706; }
  .badge-live { background: #dcfce7; color: #16a34a; }
  ul { margin: 8px 0 8px 20px; }
  li { margin: 4px 0; font-size: 14px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
</style></head><body>

<h1>🏙️ Ситуационный отчёт — ${state.city}</h1>
<div class="meta">
  <div>
    <div class="score">${state.overallScore}</div>
    <div class="score-label">Индекс здоровья / 100</div>
  </div>
  <div style="flex:1">
    <p><strong>Дата и время:</strong> ${datetime}</p>
    <p><strong>Статус:</strong> ${state.overallSeverity === 'critical' ? '🔴 Критическая ситуация' : state.overallSeverity === 'warning' ? '🟡 Требует внимания' : '🟢 Штатная обстановка'}</p>
    <p><strong>Реальных данных:</strong> ${liveKpis.length} KPI (Open-Meteo · HERE · WAQI · OWM · USGS · 2GIS)</p>
    <p><strong>Критических инцидентов:</strong> ${critAlerts.length}</p>
  </div>
</div>

<div class="section ${state.overallScore < 50 ? 'critical' : 'warning'}">
  <h2>📊 Что происходит</h2>
  <p>${analysis.whatHappening || 'Нет данных AI-анализа'}</p>
</div>
<div class="section ${state.overallScore < 50 ? 'critical' : 'warning'}">
  <h2>⚠️ Уровень критичности</h2>
  <p>${analysis.howCritical || 'Нет данных'}</p>
</div>
<div class="section">
  <h2>✅ Рекомендуемые действия</h2>
  <p>${analysis.whatToDo || 'Нет данных'}</p>
</div>
${analysis.predictions.length > 0 ? `<h2>📈 Прогнозы на ближайшие 2 часа</h2><ul>${analysis.predictions.map(p => `<li>${p}</li>`).join('')}</ul>` : ''}

<h2>🚨 Критические инциденты (${critAlerts.length})</h2>
${critAlerts.length > 0 ? `
<table>
<tr><th>Сектор</th><th>Инцидент</th><th>Место</th><th>Источник</th><th>Действие</th></tr>
${critAlerts.map(a => `<tr>
  <td>${a.sector}</td>
  <td><strong>${a.title}</strong><br><small>${a.description}</small></td>
  <td>${a.location || '—'}</td>
  <td><span class="badge badge-${a.source ? 'live' : 'warn'}">${a.source || 'Симуляция'}</span></td>
  <td>${a.actionRequired}</td>
</tr>`).join('')}
</table>` : '<p style="color:#64748b">Критических инцидентов нет</p>'}

<h2>📊 KPI по секторам</h2>
<table>
<tr><th>Показатель</th><th>Значение</th><th>Статус</th><th>Источник</th></tr>
${Object.values(state.sectors).flatMap(s => s.kpis).map(k => `
<tr>
  <td>${k.label}</td>
  <td><strong>${k.value} ${k.unit}</strong></td>
  <td><span class="badge badge-${k.severity === 'critical' ? 'crit' : k.severity === 'warning' ? 'warn' : 'live'}">${k.severity === 'critical' ? 'КРИТИЧНО' : k.severity === 'warning' ? 'ВНИМАНИЕ' : 'НОРМА'}</span></td>
  <td>${k.isLive ? `<span class="badge badge-live">🟢 ${k.source}</span>` : '<span class="badge badge-warn">⚪ Симуляция</span>'}</td>
</tr>`).join('')}
</table>

<div class="footer">
  Сформировано: ${datetime} · Smart City Almaty Dashboard<br/>
  Данные: Open-Meteo · CAMS · USGS · HERE Traffic · WAQI · OpenWeatherMap · 2GIS · AI: Ollama
</div>
</body></html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `smart-city-report-${date.replace(/\./g, '-')}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleDownload}
        className="flex items-center gap-2 text-xs font-semibold text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/10 hover:border-emerald-500/70 px-3 py-1.5 rounded-xl transition-all duration-200"
      >
        ⬇️ Скачать отчёт
      </button>
      <button
        onClick={handleExport}
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 border border-slate-600/40 hover:bg-slate-600/10 hover:border-slate-500/70 px-3 py-1.5 rounded-xl transition-all duration-200"
      >
        🖨️ Печать
      </button>
    </div>
  )
}
