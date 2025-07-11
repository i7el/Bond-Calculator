// Helper: Calculate bond price, duration, convexity, etc.
function bondCashFlows(face, coupon, ytm, freq, periods) {
    const cf = [];
    for (let t = 1; t <= periods; t++) {
        // coupon for all but last period adds face value
        cf.push(t < periods ? coupon : coupon + face);
    }
    return cf;
}

// Present value of cash flows
function bondPrice(face, coupon, ytm, freq, periods) {
    const r = ytm / (100 * freq);
    const cf = bondCashFlows(face, coupon, ytm, freq, periods);
    return cf.reduce((pv, c, t) => pv + c / Math.pow(1 + r, t + 1), 0);
}

// Macaulay Duration
function macaulayDuration(face, coupon, ytm, freq, periods) {
    const r = ytm / (100 * freq);
    const cf = bondCashFlows(face, coupon, ytm, freq, periods);
    const price = bondPrice(face, coupon, ytm, freq, periods);
    let duration = 0;
    for (let t = 1; t <= periods; t++) {
        duration += (t * cf[t - 1]) / Math.pow(1 + r, t);
    }
    return duration / price / freq;
}

// Modified Duration
function modifiedDuration(macaulay, ytm, freq) {
    return macaulay / (1 + ytm / (100 * freq));
}

// Convexity
function convexity(face, coupon, ytm, freq, periods) {
    const r = ytm / (100 * freq);
    const cf = bondCashFlows(face, coupon, ytm, freq, periods);
    const price = bondPrice(face, coupon, ytm, freq, periods);
    let conv = 0;
    for (let t = 1; t <= periods; t++) {
        conv += (t * (t + 1) * cf[t - 1]) / Math.pow(1 + r, t + 2);
    }
    return conv / price / (freq * freq);
}

function priceChange(price, modDur, conv, delta) {
    // delta in decimal, e.g. ±0.01 for ±100bps
    return -modDur * delta + 0.5 * conv * delta * delta;
}

// Event handlers, charting, API calls, etc.
document.getElementById('fetch10y').onclick = async function() {
    const y = await fetchFredYield('DGS10');
    document.getElementById('ytm').value = y.toFixed(2);
};

document.getElementById('bondForm').onsubmit = function(e) {
    e.preventDefault();

    const face = parseFloat(document.getElementById('faceValue').value);
    const couponRate = parseFloat(document.getElementById('couponRate').value);
    const freq = parseInt(document.getElementById('freq').value);
    const ytm = parseFloat(document.getElementById('ytm').value);
    const maturity = new Date(document.getElementById('maturityDate').value);
    const today = new Date();
    const years = (maturity - today) / (1000 * 3600 * 24 * 365.25);
    const periods = Math.round(years * freq);
    const coupon = face * couponRate / 100 / freq;

    // Calculations
    const price = bondPrice(face, coupon, ytm, freq, periods);
    const macaulay = macaulayDuration(face, coupon, ytm, freq, periods);
    const modDur = modifiedDuration(macaulay, ytm, freq);
    const conv = convexity(face, coupon, ytm, freq, periods);

    // Price changes for ±100bps
    const dPpos = price * priceChange(price, modDur, conv, 0.01);
    const dPneg = price * priceChange(price, modDur, conv, -0.01);

    // Output
    document.getElementById('results').innerHTML = `
        <b>Price:</b> $${price.toFixed(2)}<br>
        <b>Macaulay Duration:</b> ${macaulay.toFixed(3)} years<br>
        <b>Modified Duration:</b> ${modDur.toFixed(3)}<br>
        <b>Convexity:</b> ${conv.toFixed(3)}<br>
        <b>Estimated ΔPrice (+100bps):</b> $${dPpos.toFixed(2)}<br>
        <b>Estimated ΔPrice (–100bps):</b> $${dPneg.toFixed(2)}
    `;

    // Price vs Yield Chart
    drawPriceYieldChart(face, coupon, ytm, freq, periods, price, modDur, conv);
    // Key rate duration chart would require more advanced modeling—placeholder for now
};

function drawPriceYieldChart(face, coupon, ytm, freq, periods, price, modDur, conv) {
    const yields = [];
    const prices = [];
    const durEst = [];
    const convEst = [];
    for (let y = ytm - 2; y <= ytm + 2; y += 0.1) {
        yields.push(y);
        const p = bondPrice(face, coupon, y, freq, periods);
        prices.push(p);

        // Duration-only and convexity-adjusted estimates
        const delta = (y - ytm) / 100;
        durEst.push(price + (-modDur * price * delta));
        convEst.push(price + (-modDur * price * delta) + (0.5 * conv * price * delta * delta));
    }
    const ctx = document.getElementById('priceYieldChart').getContext('2d');
    if (window.priceChart) window.priceChart.destroy();
    window.priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: yields,
            datasets: [
                {label: 'Actual Price', data: prices, borderColor: 'blue'},
                {label: 'Duration Estimate', data: durEst, borderColor: 'red', borderDash: [5,5]},
                {label: 'Convexity Estimate', data: convEst, borderColor: 'green', borderDash: [2,2]}
            ]
        },
        options: {
            scales: {x: {title: {display: true, text: 'Yield (%)'}}, y: {title: {display: true, text: 'Price'}}}
        }
    });
}
