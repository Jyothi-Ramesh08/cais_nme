'use strict';
// A seeded pseudo-random generator makes every visit use exactly the same prices.
function seededRandom(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function generatePrices(count = 756) {
  const random = seededRandom(42);
  const prices = [100];
  for (let i = 1; i < count; i++) {
    // Box–Muller normal noise, plus a slowly varying simulated market drift.
    const noise = Math.sqrt(-2 * Math.log(Math.max(random(), 1e-10))) * Math.cos(2 * Math.PI * random());
    const drift = 0.00055 + 0.0015 * Math.sin(i / 65);
    prices.push(prices[i - 1] * Math.exp(drift + 0.011 * noise));
  }
  return prices;
}
function movingAverage(prices, window) {
  let sum = 0;
  return prices.map((price, i) => {
    sum += price;
    if (i >= window) sum -= prices[i - window];
    return i >= window - 1 ? sum / window : null;
  });
}
function maxDrawdown(values) {
  let peak = values[0], worst = 0;
  for (const value of values) {
    peak = Math.max(peak, value);
    worst = Math.max(worst, (peak - value) / peak);
  }
  return worst;
}
function backtest(prices, shortWindow, longWindow, feePercent) {
  const short = movingAverage(prices, shortWindow);
  const long = movingAverage(prices, longWindow);
  const fee = feePercent / 100, capital = 10000;
  // Begin once the long SMA exists. Stay in cash until an actual crossover.
  const start = longWindow - 1;
  let cash = capital, shares = 0, pending = null, trades = 0;
  const strategy = [capital], hold = [capital];
  // Buy & hold also pays an entry fee; both portfolios are marked to market
  // at the end (no forced sale or hypothetical exit fee).
  const holdShares = capital * (1 - fee) / prices[start + 1];
  for (let i = start + 1; i < prices.length; i++) {
    // Execute yesterday's signal at today's close: no same-close look-ahead.
    if (pending === 'buy' && cash > 0) {
      shares = cash * (1 - fee) / prices[i]; cash = 0; trades++;
    } else if (pending === 'sell' && shares > 0) {
      cash = shares * prices[i] * (1 - fee); shares = 0; trades++;
    }
    strategy.push(cash + shares * prices[i]);
    hold.push(holdShares * prices[i]);
    pending = null;
    if (short[i - 1] <= long[i - 1] && short[i] > long[i]) pending = 'buy';
    if (short[i - 1] >= long[i - 1] && short[i] < long[i]) pending = 'sell';
  }
  return { short, long, strategy, hold, trades, start };
}
const prices = generatePrices();
const dates = [];
for (let date = new Date(Date.UTC(2023, 0, 2)); dates.length < prices.length; date.setUTCDate(date.getUTCDate() + 1)) {
  if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) dates.push(new Date(date));
}
const dateLabel = date => date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const money = value => '$' + Math.round(value).toLocaleString('en-US');
const percent = value => `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
// Draw local SVG charts: no network, dependencies, or canvas scaling issues.
function drawChart(elementId, series, start, currency) {
  const width = 800, height = elementId === 'equity-chart' ? 270 : 180;
  const left = 3, right = 66, top = 10, bottom = 28;
  const plotW = width - left - right, plotH = height - top - bottom;
  const all = series.flatMap(s => s.values.filter(v => v !== null));
  let low = Math.min(...all), high = Math.max(...all);
  const padding = Math.max((high - low) * 0.15, high * 0.01);
  low -= padding; high += padding;
  const length = series[0].values.length;
  const x = i => left + i / (length - 1) * plotW;
  const y = v => top + (high - v) / (high - low) * plotH;
  let svg = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">`;
  for (let tick = 0; tick < 5; tick++) {
    const value = low + (high - low) * tick / 4, yy = y(value);
    svg += `<line x1="${left}" y1="${yy}" x2="${width - right}" y2="${yy}" stroke="#edefe6" stroke-dasharray="3 4"/><text x="${width - right + 13}" y="${yy + 3}" fill="#9aa190" font-family="monospace" font-size="10">${currency ? money(value) : '$' + value.toFixed(0)}</text>`;
  }
  if (elementId === 'equity-chart') {
    const values = series[0].values;
    const path = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
    svg += `<defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d97743" stop-opacity=".13"/><stop offset="1" stop-color="#d97743" stop-opacity="0"/></linearGradient></defs><polygon points="${x(0)},${top + plotH} ${path} ${x(length - 1)},${top + plotH}" fill="url(#area)"/>`;
  }
  for (const s of [...series].reverse()) {
    const points = s.values.map((v, i) => v === null ? '' : `${x(i).toFixed(2)},${y(v).toFixed(2)}`).filter(Boolean).join(' ');
    svg += `<polyline points="${points}" fill="none" stroke="${s.color}" stroke-width="${s.width || 1.8}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
  }
  for (let tick = 0; tick < 5; tick++) {
    const i = Math.round((length - 1) * tick / 4);
    svg += `<text x="${x(i)}" y="${height - 5}" text-anchor="${tick === 0 ? 'start' : tick === 4 ? 'end' : 'middle'}" fill="#9aa190" font-family="monospace" font-size="9">${dateLabel(dates[start + i])}</text>`;
  }
  document.getElementById(elementId).innerHTML = svg + '</svg>';
}
function run(event) {
  if (event) event.preventDefault();
  const short = Number(document.getElementById('short-window').value);
  const long = Number(document.getElementById('long-window').value);
  const feeInput = document.getElementById('fee');
  const fee = Number(feeInput.value);
  let error = '';
  if (!Number.isInteger(short) || !Number.isInteger(long) || short < 2 || long < 3) error = 'Use whole trading-day windows: at least 2 days for the short window and 3 for the long window.';
  else if (short >= long) error = 'The short window needs to be smaller than the long window. Try 20 and 60 days.';
  else if (long > prices.length - 2) error = `There isn’t enough data for that window. Choose a long window of ${prices.length - 2} days or fewer so a signal can execute.`;
  else if (feeInput.value.trim() === '' || !Number.isFinite(fee) || fee < 0 || fee > 10) error = 'Enter a fee between 0% and 10%, such as 0.10 for a 0.10% fee.';
  const errorEl = document.getElementById('error');
  errorEl.hidden = !error; errorEl.textContent = error;
  if (error) { document.getElementById('run-status').textContent = 'Update the settings to run again'; return; }
  const result = backtest(prices, short, long, fee);
  for (const [id, value] of [['strategy-return', result.strategy.at(-1) / 10000 - 1], ['hold-return', result.hold.at(-1) / 10000 - 1]]) {
    const el = document.getElementById(id); el.textContent = percent(value); el.classList.toggle('negative', value < 0);
  }
  document.getElementById('drawdown').textContent = `−${(maxDrawdown(result.strategy) * 100).toFixed(2)}%`;
  document.getElementById('hold-drawdown').textContent = `Buy & hold: −${(maxDrawdown(result.hold) * 100).toFixed(2)}%`;
  drawChart('equity-chart', [{ values: result.strategy, color: '#d97743', width: 2.2 }, { values: result.hold, color: '#a8b0a0' }], result.start, true);
  drawChart('price-chart', [{ values: prices, color: '#6b775f', width: 1.3 }, { values: result.short, color: '#d97743' }, { values: result.long, color: '#8a9ca3' }], 0, false);
  document.getElementById('short-legend').textContent = short;
  document.getElementById('long-legend').textContent = long;
  document.getElementById('period').textContent = `${dateLabel(dates[result.start])} – ${dateLabel(dates.at(-1))} · ${result.strategy.length} trading days`;
  document.getElementById('explanation').textContent = `Buy when the ${short}-day average crosses above the ${long}-day average; sell when it crosses below. Trades execute at the next day’s close, with a ${fee.toFixed(2)}% fee each time. Invest all available cash, or hold cash between positions. Both portfolios start at $10,000 after the ${long}-day warm-up; buy & hold enters at the next close. Open positions are valued at the final price without an exit fee. Drawdown measures the largest decline from a previous equity peak.`;
  document.getElementById('trade-count').textContent = `${result.trades} EXECUTED TRADES`;
  document.getElementById('run-status').textContent = '✓ Backtest up to date';
}
document.getElementById('strategy-form').addEventListener('submit', run);
document.getElementById('strategy-form').addEventListener('input', () => { document.getElementById('run-status').textContent = 'Settings changed · run to update'; });
run();
