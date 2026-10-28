# Signal — Strategy Lab

A browser-based moving-average crossover backtester for people learning how a simple trading strategy compares with buy-and-hold on simulated stock prices.

## How to use it

1. Download or clone this repository and open `index.html` in your browser. No installation, server, or internet connection is needed.
2. Set the initial capital, short and long moving-average windows, and transaction fee.
3. Click **Run backtest** to compare returns, drawdowns, and equity curves, and read the strategy explanation.

## Tests

These checks were run with Node.js and a lightweight mock of the page elements. Browser layout and interactions have not been formally tested.

| Check | Result |
| --- | --- |
| Fixed seed produces identical prices on repeated runs | Passed |
| Drawdown calculation returns 25% for equity of 100 → 120 → 90 → 110 | Passed |
| Flat prices produce no crossover trades; strategy stays in cash | Passed |
| Buy-and-hold entry fee reduces $10,000 to $9,900 with a 1% fee | Passed |
| Sample crossover data produces trades and finite equity values | Passed; exact trade timing was not separately asserted |
| Invalid windows, insufficient data, and blank or negative fees show errors | Passed |
| Changing capital scales both equity curves and preserves percentage returns | Passed |
| Capital label updates; blank, nonfinite, nonpositive, excessive, or sub-cent capital is rejected | Passed |
| `git diff --check` | Blocked by an unaccepted local Xcode license |

## Build log

- **First version:** Asked for a standalone, responsive backtester. Built the dashboard with seeded prices, moving averages, fees, charts, and explanations. Checked calculations and invalid inputs with Node.js; visual layout remains unverified.
- **Calculation checks:** Asked for realistic trading logic and friendly errors. Added next-close execution and input validation. Checked flat-price behavior, fee deduction, drawdown, and sample crossover output; exact execution timing still needs a dedicated check.
- **Repository check:** Tried `git diff --check` after the first build. It could not run because the local Xcode license had not been accepted. The Node.js checks passed independently.
- **Initial capital:** Asked to make starting capital adjustable. Added a USD field and updated both portfolios and labels. Checked proportional equity scaling, unchanged percentage returns, label updates, and invalid amounts.

## Changes

- Plain HTML, CSS, and vanilla JavaScript dashboard with responsive layouts.
- 756 reproducible simulated daily prices using seed 42.
- Adjustable moving-average windows, initial capital, and percentage fee per trade.
- Long-only crossover strategy with next-close execution and cash between positions.
- Strategy and buy-and-hold returns, maximum drawdowns, equity curves, and price/SMA chart.
- Friendly validation and a plain-English explanation of the current strategy.

Simulated results are for learning and do not predict future performance.
