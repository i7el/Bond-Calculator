const FRED_API_KEY = 'aa0697e963a58f2c249725701cd14437';

async function fetchFredYield(seriesId) {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json`;
    const resp = await fetch(url);
    const data = await resp.json();
    const obs = data.observations.filter(o => o.value !== '.');
    const latest = obs[obs.length - 1];
    return parseFloat(latest.value);
}