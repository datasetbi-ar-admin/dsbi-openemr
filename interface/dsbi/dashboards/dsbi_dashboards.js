/**
 * DSBI dashboards: demo appointment and schedule figures drawn with ECharts.
 *
 * All data is invented here from a fixed seed, so the screen looks the same on
 * every load and never touches patient records.
 *
 * @package   OpenEMR
 * @link      https://www.open-emr.org
 * @author    DatasetBI
 * @copyright Copyright (c) 2026 DatasetBI
 * @license   https://github.com/openemr/openemr/blob/master/LICENSE GNU General Public License 3
 */

(function () {
    'use strict';

    const INK = '#172033';
    const INK_MUTED = '#526079';
    const GRID = '#e2e8f0';
    const SURFACE = '#ffffff';
    const PRIMARY = '#2563eb';
    // Categorical slots in fixed order: attended, no-show, cancelled.
    const SERIES = ['#2a78d6', '#eb6834', '#1baf7a'];
    const SEQUENTIAL = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'];
    const FONT = '"DM Sans Variable", "DM Sans", system-ui, sans-serif';

    function xl(text) {
        const fn = typeof window.xl === 'function' ? window.xl : (window.top && typeof window.top.xl === 'function' ? window.top.xl : null);
        return (fn && fn(text)) || text;
    }

    const number = new Intl.NumberFormat(undefined);
    const percent = new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 });
    const monthName = new Intl.DateTimeFormat(undefined, { month: 'short', year: '2-digit' });
    const dayName = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
    const weekdayName = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
    const slotDate = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

    // Deterministic pseudo-random numbers (mulberry32).
    function seeded(seed) {
        let a = seed;
        return function () {
            a |= 0;
            a = a + 0x6D2B79F5 | 0;
            let t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    const rand = seeded(20261014);
    const between = (min, max) => min + (max - min) * rand();

    /* ---------- Invented data ---------- */

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Southern-hemisphere season: January and February are holiday months.
    const SEASON = [0.78, 0.82, 1.02, 1.04, 1.06, 1.03, 0.94, 1.05, 1.07, 1.06, 1.02, 0.9];

    const months = [];
    for (let i = 11; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - 1 - i, 1);
        const progress = (11 - i) / 11;
        const total = Math.round(3150 * (1 + 0.18 * progress) * SEASON[date.getMonth()] * between(0.97, 1.03));
        // Reminders by WhatsApp started mid-year, so no-shows fall over time.
        const noShowRate = 0.135 - 0.045 * progress + between(-0.006, 0.006);
        const cancelRate = 0.085 + between(-0.01, 0.01);
        const noShow = Math.round(total * noShowRate);
        const cancelled = Math.round(total * cancelRate);
        const offered = Math.round(total / (0.74 + 0.12 * progress + between(-0.015, 0.015)));
        months.push({
            label: monthName.format(date),
            total: total,
            attended: total - noShow - cancelled,
            noShow: noShow,
            cancelled: cancelled,
            occupancy: total / offered
        });
    }

    const days = [];
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const weekday = date.getDay();
        const capacity = weekday === 0 ? 0 : (weekday === 6 ? 80 : 210);
        const booked = capacity === 0 ? 0 : Math.round(capacity * between(0.72, 0.94));
        days.push({ label: dayName.format(date), booked: booked, capacity: capacity });
    }

    const schedules = [
        { name: 'Clinical medicine', provider: 'Dra. Laura Pereyra', slots: 160 },
        { name: 'Pediatrics', provider: 'Dr. Martín Giménez', slots: 120 },
        { name: 'Cardiology', provider: 'Dr. Sergio Ledesma', slots: 64 },
        { name: 'Gynecology', provider: 'Dra. Paula Castro', slots: 80 },
        { name: 'Traumatology', provider: 'Dr. Diego Ferreyra', slots: 72 },
        { name: 'Dermatology', provider: 'Dra. Carolina Sosa', slots: 48 },
        { name: 'Ophthalmology', provider: 'Dr. Javier Molina', slots: 56 },
        { name: 'Physical therapy', provider: 'Lic. Romina Quiroga', slots: 140 }
    ].map(function (schedule, index) {
        const occupancy = [0.93, 0.88, 0.97, 0.81, 0.76, 0.99, 0.68, 0.84][index] + between(-0.02, 0.02);
        // A full schedule would have no free slot to show in the table.
        const booked = Math.min(schedule.slots - 2, Math.round(schedule.slots * occupancy));
        const next = new Date(today);
        next.setDate(today.getDate() + 1 + Math.floor(occupancy * 9 * between(0.6, 1)));
        next.setHours(8 + Math.floor(between(0, 10)), rand() < 0.5 ? 0 : 30);
        return Object.assign({}, schedule, { booked: booked, occupancy: booked / schedule.slots, nextFree: next });
    });

    const HOURS = [];
    for (let h = 8; h <= 19; h++) {
        HOURS.push(String(h).padStart(2, '0') + ':00');
    }
    const WEEKDAYS = [1, 2, 3, 4, 5, 6].map(function (d) {
        // 2026-10-05 is a Monday.
        return weekdayName.format(new Date(2026, 9, 4 + d));
    });
    const heat = [];
    WEEKDAYS.forEach(function (_, d) {
        HOURS.forEach(function (_, h) {
            const saturday = d === 5;
            if (saturday && h > 4) {
                heat.push([h, d, 0]);
                return;
            }
            // Morning peak around 9-11 and a smaller one after work hours.
            const curve = 0.45 + 0.55 * Math.exp(-Math.pow(h - 2, 2) / 4) + 0.35 * Math.exp(-Math.pow(h - 9.5, 2) / 3);
            const dayFactor = [1.12, 1.02, 0.98, 1.0, 0.86, 0.7][d];
            heat.push([h, d, Math.round(18 * curve * dayFactor * between(0.88, 1.12))]);
        });
    });

    /* ---------- Key figures ---------- */

    const last = months[months.length - 1];
    const previous = months[months.length - 2];
    const avgLead = 6.4;
    const avgLeadPrevious = 8.1;

    const kpis = [
        { label: xl('Appointments last month'), value: number.format(last.total), delta: last.total / previous.total - 1, goodWhenUp: true },
        { label: xl('Attendance'), value: percent.format(last.attended / last.total), delta: last.attended / last.total - previous.attended / previous.total, goodWhenUp: true, points: true },
        { label: xl('No-show rate'), value: percent.format(last.noShow / last.total), delta: last.noShow / last.total - previous.noShow / previous.total, goodWhenUp: false, points: true },
        { label: xl('Schedule occupancy'), value: percent.format(last.occupancy), delta: last.occupancy - previous.occupancy, goodWhenUp: true, points: true },
        { label: xl('Average wait for a slot'), value: avgLead.toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' ' + xl('days'), delta: avgLead - avgLeadPrevious, goodWhenUp: false, days: true }
    ];

    function formatDelta(kpi) {
        const sign = kpi.delta > 0 ? '+' : (kpi.delta < 0 ? '−' : '');
        const size = Math.abs(kpi.delta);
        if (kpi.points) {
            return sign + (size * 100).toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' ' + xl('pts');
        }
        if (kpi.days) {
            return sign + size.toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' ' + xl('days');
        }
        return sign + percent.format(size);
    }

    const kpiBox = document.getElementById('dsbi-dash-kpis');
    kpis.forEach(function (kpi) {
        const good = (kpi.delta >= 0) === kpi.goodWhenUp;
        const card = document.createElement('div');
        card.className = 'dsbi-dash__kpi';

        const label = document.createElement('div');
        label.className = 'dsbi-dash__kpi-label';
        label.textContent = kpi.label;

        const value = document.createElement('div');
        value.className = 'dsbi-dash__kpi-value';
        value.textContent = kpi.value;

        // Direction is carried by an arrow and the sign, not only by color.
        const delta = document.createElement('div');
        delta.className = 'dsbi-dash__kpi-delta ' + (good ? 'is-good' : 'is-bad');
        const arrow = document.createElement('i');
        arrow.className = 'fa ' + (kpi.delta >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down');
        arrow.setAttribute('aria-hidden', 'true');
        const note = document.createElement('span');
        note.textContent = ' ' + xl('vs. previous month');
        delta.append(arrow, ' ' + formatDelta(kpi), note);

        card.append(label, value, delta);
        kpiBox.appendChild(card);
    });

    document.getElementById('dsbi-dash-updated').textContent = xl('Updated') + ' ' + today.toLocaleDateString();

    /* ---------- Agenda table ---------- */

    const tbody = document.querySelector('#dsbi-dash-agenda tbody');
    schedules.forEach(function (schedule) {
        const row = tbody.insertRow();
        function cell(text, right) {
            const td = row.insertCell();
            td.textContent = text;
            if (right) {
                td.className = 'text-right';
            }
            return td;
        }
        cell(xl(schedule.name)).style.fontWeight = '600';
        cell(schedule.provider);
        cell(number.format(schedule.slots), true);
        cell(number.format(schedule.booked), true);
        cell(number.format(schedule.slots - schedule.booked), true);

        const meter = document.createElement('div');
        meter.className = 'dsbi-dash__meter';
        const track = document.createElement('span');
        track.className = 'dsbi-dash__meter-track';
        const fill = document.createElement('span');
        fill.className = 'dsbi-dash__meter-fill';
        fill.style.width = (schedule.occupancy * 100).toFixed(1) + '%';
        track.appendChild(fill);
        const value = document.createElement('span');
        value.className = 'dsbi-dash__meter-value';
        value.textContent = percent.format(schedule.occupancy);
        meter.append(track, value);
        row.insertCell().appendChild(meter);

        cell(slotDate.format(schedule.nextFree));
    });

    /* ---------- Charts ---------- */

    if (typeof window.echarts === 'undefined') {
        document.querySelectorAll('.dsbi-dash__chart').forEach(function (el) {
            el.textContent = xl('Charts are unavailable: the ECharts library did not load.');
        });
        return;
    }

    const axisCommon = {
        axisLine: { lineStyle: { color: GRID } },
        axisTick: { show: false },
        axisLabel: { color: INK_MUTED, fontFamily: FONT, fontSize: 12 },
        splitLine: { lineStyle: { color: GRID } }
    };
    const tooltipCommon = {
        backgroundColor: SURFACE,
        borderColor: GRID,
        textStyle: { color: INK, fontFamily: FONT, fontSize: 13 },
        extraCssText: 'box-shadow: 0 4px 12px rgba(20, 38, 61, 0.12); border-radius: 8px;'
    };
    const legendCommon = {
        top: 0,
        left: 0,
        icon: 'roundRect',
        itemWidth: 12,
        itemHeight: 12,
        textStyle: { color: INK, fontFamily: FONT, fontSize: 13 }
    };

    const charts = [];
    function draw(id, option) {
        const chart = window.echarts.init(document.getElementById(id), null, { renderer: 'svg' });
        chart.setOption(Object.assign({ textStyle: { fontFamily: FONT } }, option));
        charts.push(chart);
    }

    const monthLabels = months.map(m => m.label);
    function stackSeries(name, key, color, top) {
        return {
            name: name,
            type: 'bar',
            stack: 'outcome',
            barMaxWidth: 36,
            data: months.map(m => m[key]),
            itemStyle: {
                color: color,
                borderColor: SURFACE,
                borderWidth: 1,
                borderRadius: top ? [4, 4, 0, 0] : 0
            },
            emphasis: { focus: 'series' }
        };
    }

    draw('chart-monthly', {
        color: SERIES,
        legend: legendCommon,
        tooltip: Object.assign({
            trigger: 'axis',
            axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(37, 99, 235, 0.06)' } },
            valueFormatter: v => number.format(v)
        }, tooltipCommon),
        grid: { top: 40, left: 8, right: 8, bottom: 8, containLabel: true },
        xAxis: Object.assign({ type: 'category', data: monthLabels }, axisCommon, { splitLine: { show: false } }),
        yAxis: Object.assign({ type: 'value' }, axisCommon, { axisLine: { show: false } }),
        series: [
            stackSeries(xl('Attended'), 'attended', SERIES[0], false),
            stackSeries(xl('No-show'), 'noShow', SERIES[1], false),
            stackSeries(xl('Cancelled'), 'cancelled', SERIES[2], true)
        ]
    });

    draw('chart-occupancy', {
        tooltip: Object.assign({ trigger: 'axis', valueFormatter: v => percent.format(v) }, tooltipCommon),
        grid: { top: 16, left: 8, right: 48, bottom: 8, containLabel: true },
        xAxis: Object.assign({ type: 'category', boundaryGap: false, data: monthLabels }, axisCommon, { splitLine: { show: false } }),
        yAxis: Object.assign({ type: 'value', min: 0.6, max: 1, axisLabel: Object.assign({}, axisCommon.axisLabel, { formatter: v => percent.format(v) }) }, { axisLine: { show: false }, axisTick: { show: false }, splitLine: axisCommon.splitLine }),
        series: [{
            name: xl('Occupancy'),
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 8,
            showSymbol: false,
            data: months.map(m => m.occupancy),
            lineStyle: { color: PRIMARY, width: 2 },
            itemStyle: { color: PRIMARY, borderColor: SURFACE, borderWidth: 2 },
            areaStyle: {
                color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'rgba(37, 99, 235, 0.22)' },
                    { offset: 1, color: 'rgba(37, 99, 235, 0)' }
                ])
            },
            markLine: {
                silent: true,
                symbol: 'none',
                lineStyle: { color: INK_MUTED, type: 'dashed', width: 1 },
                label: { position: 'insideStartTop', color: INK_MUTED, fontFamily: FONT, formatter: xl('Target') + ' 85%' },
                data: [{ yAxis: 0.85 }]
            },
            endLabel: { show: true, color: INK, fontWeight: 600, formatter: p => percent.format(p.value) }
        }]
    });

    draw('chart-daily', {
        color: [SERIES[0], INK_MUTED],
        legend: legendCommon,
        tooltip: Object.assign({ trigger: 'axis', valueFormatter: v => number.format(v) }, tooltipCommon),
        grid: { top: 40, left: 8, right: 8, bottom: 8, containLabel: true },
        xAxis: Object.assign({ type: 'category', data: days.map(d => d.label) }, axisCommon, { splitLine: { show: false } }),
        yAxis: Object.assign({ type: 'value' }, axisCommon, { axisLine: { show: false } }),
        series: [
            {
                name: xl('Booked'),
                type: 'bar',
                barMaxWidth: 14,
                data: days.map(d => d.booked),
                itemStyle: { color: SERIES[0], borderRadius: [4, 4, 0, 0] }
            },
            {
                name: xl('Capacity'),
                type: 'line',
                step: 'middle',
                symbol: 'none',
                data: days.map(d => d.capacity),
                lineStyle: { color: INK_MUTED, width: 1.5, type: 'dashed' },
                itemStyle: { color: INK_MUTED }
            }
        ]
    });

    const bySchedule = schedules.slice().sort((a, b) => a.occupancy - b.occupancy);
    draw('chart-schedules', {
        tooltip: Object.assign({
            trigger: 'item',
            formatter: function (p) {
                const s = bySchedule[p.dataIndex];
                return '<b>' + window.echarts.format.encodeHTML(xl(s.name)) + '</b><br>' +
                    window.echarts.format.encodeHTML(s.provider) + '<br>' +
                    number.format(s.booked) + ' / ' + number.format(s.slots) + ' · ' + percent.format(s.occupancy);
            }
        }, tooltipCommon),
        grid: { top: 8, left: 8, right: 56, bottom: 8, containLabel: true },
        xAxis: Object.assign({ type: 'value', max: 1, axisLabel: Object.assign({}, axisCommon.axisLabel, { formatter: v => percent.format(v) }) }, { axisLine: { show: false }, axisTick: { show: false }, splitLine: axisCommon.splitLine }),
        yAxis: Object.assign({ type: 'category', data: bySchedule.map(s => xl(s.name)) }, axisCommon, { axisLabel: Object.assign({}, axisCommon.axisLabel, { color: INK }) }),
        series: [{
            type: 'bar',
            barMaxWidth: 18,
            data: bySchedule.map(s => s.occupancy),
            itemStyle: { color: PRIMARY, borderRadius: [0, 4, 4, 0] },
            label: { show: true, position: 'right', color: INK, fontFamily: FONT, formatter: p => percent.format(p.value) }
        }]
    });

    draw('chart-heatmap', {
        tooltip: Object.assign({
            formatter: p => WEEKDAYS[p.value[1]] + ' ' + HOURS[p.value[0]] + '<br><b>' + number.format(p.value[2]) + '</b> ' + xl('appointments')
        }, tooltipCommon),
        grid: { top: 8, left: 8, right: 8, bottom: 48, containLabel: true },
        xAxis: Object.assign({ type: 'category', data: HOURS }, axisCommon, { splitLine: { show: false }, axisLine: { show: false } }),
        yAxis: Object.assign({ type: 'category', data: WEEKDAYS, inverse: true }, axisCommon, { splitLine: { show: false }, axisLine: { show: false } }),
        visualMap: {
            min: 0,
            max: Math.max.apply(null, heat.map(c => c[2])),
            calculable: false,
            orient: 'horizontal',
            left: 'center',
            bottom: 0,
            itemWidth: 12,
            itemHeight: 160,
            inRange: { color: SEQUENTIAL },
            textStyle: { color: INK_MUTED, fontFamily: FONT }
        },
        series: [{
            type: 'heatmap',
            data: heat,
            itemStyle: { borderColor: SURFACE, borderWidth: 2, borderRadius: 4 },
            emphasis: { itemStyle: { borderColor: INK, borderWidth: 1 } }
        }]
    });

    // The frame changes width when the sidebar opens or closes, not only on window resize.
    if (typeof ResizeObserver === 'function') {
        new ResizeObserver(function () {
            charts.forEach(c => c.resize());
        }).observe(document.body);
    } else {
        window.addEventListener('resize', function () {
            charts.forEach(c => c.resize());
        });
    }
})();
