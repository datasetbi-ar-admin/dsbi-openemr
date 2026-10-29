/**
 * DSBI booking assistant: demo of an agent that books appointments by chat.
 *
 * The conversation drives five stages (patient, specialty, provider, day and
 * time, confirmation); the tabs and panels on the left show what the agent
 * looked up at each one. Choosing from a panel counts as the patient's
 * answer, so chat and panels never disagree.
 *
 * Patients, providers and weekly schedules are fixed below; which slots are
 * already taken comes from a seeded generator, so the agenda looks the same
 * on every load. Bookings and cancellations live only in memory: nothing is
 * sent to the server and a reload starts the demo again.
 *
 * @package   OpenEMR
 * @link      https://www.open-emr.org
 * @author    DatasetBI
 * @copyright Copyright (c) 2026 DatasetBI
 * @license   https://github.com/openemr/openemr/blob/master/LICENSE GNU General Public License 3
 */

(function () {
    'use strict';

    const WINDOW_DAYS = 60;
    const STEPS = ['patient', 'specialty', 'provider', 'slot', 'confirm'];

    // Strings and locale come from the page (index.php), translated by xl()
    // for the session language; English is the source text and the fallback.
    const I18N = window.dsbiTurI18n || { locale: undefined, strings: {} };

    function xl(text) {
        return I18N.strings[text] || text;
    }

    // Whole sentences with {placeholders}, so each language orders the parts its own way.
    function xlf(text, vars) {
        return xl(text).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
    }

    const PATIENTS = [
        { dni: '30456789', name: 'Juan Pérez', dob: '1984-03-12', sex: xl('Male'), coverage: 'OSDE 310', member: '61 234567 8 01', phone: '+54 9 351 555-0142', last: xl('General medicine') + ' · 12/08/2026' },
        { dni: '27890123', name: 'María Gómez', dob: '1979-11-02', sex: xl('Female'), coverage: 'Swiss Medical SMG20', member: '80 0012 3344', phone: '+54 9 351 555-0177', last: xl('Gynecology') + ' · 03/06/2026' },
        { dni: '44123987', name: 'Lucas Romero', dob: '2015-07-21', sex: xl('Male'), coverage: 'APROSS', member: '2 44123987 00', phone: '+54 9 3543 55-0190', last: xl('Pediatrics') + ' · 28/09/2026' }
    ];

    const SERVICES = [
        { id: 'gen', name: xl('General medicine'), icon: 'fa-stethoscope' },
        { id: 'ped', name: xl('Pediatrics'), icon: 'fa-baby' },
        { id: 'car', name: xl('Cardiology'), icon: 'fa-heartbeat' },
        { id: 'gyn', name: xl('Gynecology'), icon: 'fa-venus' },
        { id: 'eco', name: xl('Ultrasound'), icon: 'fa-wave-square' },
        { id: 'nut', name: xl('Nutrition'), icon: 'fa-apple-alt' }
    ];

    // week: ISO weekday (1 = Monday) -> list of [from, to] ranges.
    const PROVIDERS = [
        { id: 'p1', name: 'Dra. Laura Méndez', services: ['gen'], len: 20, room: xl('Office') + ' 3', week: { 1: [['08:00', '12:00']], 3: [['08:00', '12:00']], 5: [['14:00', '18:00']] } },
        { id: 'p2', name: 'Dr. Martín Ferreyra', services: ['car', 'gen'], len: 30, room: xl('Office') + ' 5', week: { 2: [['09:00', '13:00']], 4: [['09:00', '12:00'], ['15:00', '17:00']] } },
        { id: 'p3', name: 'Dra. Sofía Villalba', services: ['ped'], len: 20, room: xl('Office') + ' 1', week: { 1: [['14:00', '18:00']], 2: [['14:00', '17:00']], 4: [['08:00', '11:00']] } },
        { id: 'p7', name: 'Dr. Ignacio Luna', services: ['ped', 'gen'], len: 20, room: xl('Office') + ' 2', week: { 3: [['14:00', '18:00']], 5: [['08:00', '12:00']] } },
        { id: 'p4', name: 'Dra. Carolina Ríos', services: ['gyn', 'eco'], len: 30, room: xl('Office') + ' 4', week: { 3: [['13:00', '17:00']], 5: [['08:00', '12:00']] } },
        { id: 'p5', name: 'Dr. Pablo Quiroga', services: ['eco'], len: 15, room: xl('Imaging'), week: { 1: [['08:00', '10:00']], 2: [['08:00', '10:00']], 3: [['08:00', '10:00']], 4: [['08:00', '10:00']], 5: [['08:00', '10:00']], 6: [['09:00', '11:00']] } },
        { id: 'p6', name: 'Lic. Valeria Paz', services: ['nut'], len: 40, room: xl('Office') + ' 6', week: { 2: [['16:00', '20:00']], 6: [['09:00', '13:00']] } }
    ];

    // null (English) means the browser's own locale.
    const LOCALE = I18N.locale || undefined;
    const fmtWeekday = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric' });
    const fmtMonthDay = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' });
    const fmtMonthYear = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' });
    const fmtLong = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
    const fmtShort = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' });
    const fmtDob = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' });
    const fmtClock = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', hourCycle: LOCALE ? 'h23' : undefined });
    const fmtDow = new Intl.DateTimeFormat(LOCALE, { weekday: 'narrow' });
    const fmtDay = new Intl.DateTimeFormat(LOCALE, { weekday: 'short' });

    // ---- dates -----------------------------------------------------------

    function startOfDay(d) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    function addDays(d, n) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
    }

    function mondayOf(d) {
        return addDays(d, -((d.getDay() + 6) % 7));
    }

    function ymd(d) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function toMinutes(text) {
        const p = text.split(':');
        return Number(p[0]) * 60 + Number(p[1]);
    }

    function hhmm(minutes) {
        return String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
    }

    function age(dob) {
        const d = new Date(dob + 'T00:00:00');
        let years = today.getFullYear() - d.getFullYear();
        if (today < new Date(today.getFullYear(), d.getMonth(), d.getDate())) {
            years--;
        }
        return years;
    }

    function dniText(dni) {
        return dni.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    const now = new Date();
    const today = startOfDay(now);
    const lastDay = addDays(today, WINDOW_DAYS - 1);

    // ---- seeded availability -----------------------------------------------

    function hash(text) {
        let h = 2166136261;
        for (let i = 0; i < text.length; i++) {
            h ^= text.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        h += h << 13; h ^= h >>> 7; h += h << 3; h ^= h >>> 17; h += h << 5;
        return (h >>> 0) / 4294967296;
    }

    // Near dates are fuller, as in a real agenda.
    function takenShare(daysAhead) {
        if (daysAhead < 7) {
            return 0.82;
        }
        if (daysAhead < 21) {
            return 0.6;
        }
        return 0.32;
    }

    const providerById = new Map(PROVIDERS.map((p) => [p.id, p]));
    const serviceById = new Map(SERVICES.map((s) => [s.id, s]));

    function baseSlots(provider, day) {
        const ranges = provider.week[((day.getDay() + 6) % 7) + 1] || [];
        const daysAhead = Math.round((day - today) / 86400000);
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const out = [];
        ranges.forEach((range) => {
            for (let m = toMinutes(range[0]); m + provider.len <= toMinutes(range[1]); m += provider.len) {
                if (daysAhead === 0 && m <= nowMin + 30) {
                    continue;
                }
                const key = provider.id + '|' + ymd(day) + '|' + hhmm(m);
                out.push({ key: key, provider: provider, day: day, minutes: m, time: hhmm(m), taken: hash(key) < takenShare(daysAhead) });
            }
        });
        return out;
    }

    // ---- state -------------------------------------------------------------

    let state;
    let changes;   // key -> { status: 'mine'|'cancelled', code, serviceId, patient, at }
    let codeSeq = 1040;
    let generation = 0;

    function freshState() {
        return {
            view: 'patient',
            working: null,
            patient: null,
            serviceId: null,
            providerId: null,
            providerChosen: false,
            selectedKey: null,
            bookedKey: null,
            offered: new Set(),
            weekStart: mondayOf(today),
            miniMonth: new Date(today.getFullYear(), today.getMonth(), 1),
            onlyFree: false,
            repeat: null,
            startedAt: new Date()
        };
    }

    function statusOf(slot) {
        const change = changes.get(slot.key);
        if (change) {
            return change.status;
        }
        return slot.taken ? 'taken' : 'free';
    }

    // Cancelled slots go back on offer, so they count as bookable.
    function isBookable(slot) {
        const s = statusOf(slot);
        return s === 'free' || s === 'cancelled';
    }

    function inWindow(day) {
        return day >= today && day <= lastDay;
    }

    function providersFor(serviceId, providerId) {
        if (providerId) {
            return [providerById.get(providerId)];
        }
        return PROVIDERS.filter((p) => p.services.includes(serviceId));
    }

    function slotsOn(day, providers) {
        if (!inWindow(day)) {
            return [];
        }
        const list = [];
        providers.forEach((p) => list.push.apply(list, baseSlots(p, day)));
        list.sort((a, b) => a.minutes - b.minutes || a.provider.name.localeCompare(b.provider.name));
        return list;
    }

    function firstFree(providers, limit) {
        const found = [];
        for (let day = today; day <= lastDay && found.length < limit; day = addDays(day, 1)) {
            slotsOn(day, providers).forEach((s) => {
                if (found.length < limit && isBookable(s)) {
                    found.push(s);
                }
            });
        }
        return found;
    }

    function freeCount(providers) {
        let n = 0;
        for (let day = today; day <= lastDay; day = addDays(day, 1)) {
            n += slotsOn(day, providers).filter(isBookable).length;
        }
        return n;
    }

    function scopeProviders() {
        return state.serviceId ? providersFor(state.serviceId, state.providerId) : [];
    }

    function findSlot(key) {
        const parts = key.split('|');
        const d = parts[1].split('-');
        const day = new Date(Number(d[0]), Number(d[1]) - 1, Number(d[2]));
        return baseSlots(providerById.get(parts[0]), day).find((s) => s.key === key) || null;
    }

    function describe(slot) {
        return fmtShort.format(slot.day) + ' ' + slot.time;
    }

    function surname(provider) {
        return provider.name.split(' ').slice(-1)[0];
    }

    function reachable(step) {
        switch (step) {
            case 'patient':
                return true;
            case 'specialty':
                return !!state.patient;
            case 'provider':
                return !!state.serviceId;
            case 'slot':
                return state.providerChosen;
            default:
                return !!state.selectedKey || !!state.bookedKey;
        }
    }

    function isDone(step) {
        switch (step) {
            case 'patient':
                return !!state.patient;
            case 'specialty':
                return !!state.serviceId;
            case 'provider':
                return state.providerChosen;
            case 'slot':
                return !!state.selectedKey || !!state.bookedKey;
            default:
                return !!state.bookedKey && changes.get(state.bookedKey).status === 'mine';
        }
    }

    // ---- DOM helpers -------------------------------------------------------

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) {
            node.className = className;
        }
        if (text !== undefined && text !== null) {
            node.textContent = text;
        }
        return node;
    }

    function icon(name) {
        const i = el('i', 'fa ' + name);
        i.setAttribute('aria-hidden', 'true');
        return i;
    }

    function waiting(iconName, text) {
        const box = el('div', 'dsbi-tur__waiting');
        box.append(icon(iconName), el('span', null, text));
        return box;
    }

    const $ = (id) => document.getElementById(id);
    const logEl = $('tur-log');
    const weekEl = $('tur-week');
    const miniEl = $('tur-mini');

    // ---- stage tabs and panels ---------------------------------------------

    function stepSummary(step) {
        switch (step) {
            case 'patient':
                return state.patient ? state.patient.name : '';
            case 'specialty':
                return state.serviceId ? serviceById.get(state.serviceId).name : '';
            case 'provider':
                if (!state.providerChosen) {
                    return '';
                }
                return state.providerId ? providerById.get(state.providerId).name : xl('First available');
            case 'slot': {
                const key = state.selectedKey || state.bookedKey;
                return key ? describe(findSlot(key)) : '';
            }
            default:
                if (!state.bookedKey) {
                    return state.selectedKey ? xl('Waiting for the patient') : '';
                }
                return changes.get(state.bookedKey).status === 'mine' ? changes.get(state.bookedKey).code : xl('Cancelled');
        }
    }

    function renderSteps() {
        document.querySelectorAll('#tur-steps [data-step]').forEach((btn) => {
            const step = btn.dataset.step;
            btn.disabled = !reachable(step);
            btn.classList.toggle('is-active', step === state.view);
            btn.classList.toggle('is-done', isDone(step));
            btn.classList.toggle('is-working', step === state.working);
            btn.setAttribute('aria-selected', step === state.view ? 'true' : 'false');
            btn.querySelector('[data-summary]').textContent = stepSummary(step);
        });
        document.querySelectorAll('[data-panel]').forEach((panel) => {
            panel.hidden = panel.dataset.panel !== state.view;
        });
    }

    function renderPatient() {
        const body = $('tur-patient-body');
        body.textContent = '';
        const p = state.patient;
        if (!p) {
            $('tur-note-patient').textContent = xl('The assistant asks for the national ID (DNI)');
            body.appendChild(waiting('fa-id-card', xl('Waiting for the patient to send their DNI in the chat.')));
            return;
        }
        $('tur-note-patient').textContent = xl('Found in the patient registry by DNI');
        const card = el('div', 'dsbi-tur__patient');
        card.appendChild(el('div', 'dsbi-tur__patient-avatar', p.name.split(' ').map((w) => w[0]).join('')));
        const info = el('div');
        info.appendChild(el('h3', null, p.name));
        const dl = el('dl', 'dsbi-tur__facts');
        [
            [xl('DNI'), dniText(p.dni)],
            [xl('Date of birth'), fmtDob.format(new Date(p.dob + 'T00:00:00')) + ' (' + age(p.dob) + ' ' + xl('years') + ')'],
            [xl('Sex'), p.sex],
            [xl('Insurance'), p.coverage],
            [xl('Member number'), p.member],
            [xl('Mobile'), p.phone],
            [xl('Last visit'), p.last]
        ].forEach(([k, v]) => {
            const wrap = el('div');
            wrap.append(el('dt', null, k), el('dd', null, v));
            dl.appendChild(wrap);
        });
        info.appendChild(dl);
        const check = el('div', 'dsbi-tur__check');
        check.append(icon('fa-check-circle'), el('span', null, xl('Identity and insurance verified')));
        info.appendChild(check);
        card.appendChild(info);
        body.appendChild(card);
    }

    function renderSpecialties() {
        const box = $('tur-specialties');
        box.textContent = '';
        $('tur-note-specialty').textContent = state.serviceId ? xl('Chosen by the patient') : xl('Offered to the patient in the chat');
        SERVICES.forEach((s) => {
            const providers = providersFor(s.id, null);
            const next = firstFree(providers, 1)[0];
            const card = el('button', 'dsbi-tur__card' + (s.id === state.serviceId ? ' is-chosen' : ''));
            card.type = 'button';
            card.disabled = !state.patient || !!state.serviceId;
            const title = el('span', 'dsbi-tur__card-title');
            title.append(icon(s.icon), el('span', null, s.name));
            card.appendChild(title);
            card.appendChild(el('span', 'dsbi-tur__card-meta', providers.length + ' ' + (providers.length === 1 ? xl('provider') : xl('providers')) + ' · ' + freeCount(providers) + ' ' + xl('free slots')));
            const nextEl = el('span', 'dsbi-tur__card-next', xl('First free') + ': ');
            nextEl.appendChild(el('strong', null, next ? describe(next) : xl('none')));
            card.appendChild(nextEl);
            card.addEventListener('click', () => { user(s.name); chooseSpecialty(s.id); });
            box.appendChild(card);
        });
    }

    function providerCard(provider, label, metaText, providers, chosen) {
        const next = firstFree(providers, 1)[0];
        const card = el('button', 'dsbi-tur__card' + (chosen ? ' is-chosen' : ''));
        card.type = 'button';
        card.disabled = state.providerChosen;
        const title = el('span', 'dsbi-tur__card-title');
        title.append(icon(provider ? 'fa-user-md' : 'fa-bolt'), el('span', null, label));
        card.appendChild(title);
        card.appendChild(el('span', 'dsbi-tur__card-meta', metaText));
        const nextEl = el('span', 'dsbi-tur__card-next', xl('First free') + ': ');
        nextEl.appendChild(el('strong', null, next ? describe(next) : xl('none')));
        card.appendChild(nextEl);
        card.addEventListener('click', () => { user(label); chooseProvider(provider ? provider.id : null); });
        return card;
    }

    function renderProviders() {
        const box = $('tur-providers');
        box.textContent = '';
        if (!state.serviceId) {
            $('tur-provider-scope').textContent = '';
            $('tur-note-provider').textContent = '';
            box.appendChild(waiting('fa-user-md', xl('The specialty is chosen first.')));
            return;
        }
        const service = serviceById.get(state.serviceId);
        const providers = providersFor(state.serviceId, null);
        $('tur-provider-scope').textContent = '· ' + service.name;
        $('tur-note-provider').textContent = state.providerChosen ? xl('Chosen by the patient') : xl('Offered to the patient in the chat');
        providers.forEach((p) => {
            const days = Object.keys(p.week).map((d) => fmtDay.format(addDays(mondayOf(today), Number(d) - 1))).join(', ');
            box.appendChild(providerCard(p, p.name, p.room + ' · ' + days + ' · ' + p.len + ' min', [p], state.providerChosen && state.providerId === p.id));
        });
        if (providers.length > 1) {
            box.appendChild(providerCard(null, xl('First available'), xl('Any provider of') + ' ' + service.name, providers, state.providerChosen && !state.providerId));
        }
    }

    function renderAgenda() {
        const end = addDays(state.weekStart, 6);
        $('tur-range').textContent = fmtMonthDay.format(state.weekStart) + ' – ' + fmtMonthDay.format(end) + ' ' + end.getFullYear();
        $('tur-prev').disabled = state.weekStart <= mondayOf(today);
        $('tur-next').disabled = addDays(state.weekStart, 7) > lastDay;
        $('tur-agenda-scope').textContent = state.serviceId
            ? serviceById.get(state.serviceId).name + ' · ' + (state.providerId ? providerById.get(state.providerId).name : xl('all providers'))
            : '';
        renderWeek();
        renderMini();
    }

    function renderWeek() {
        weekEl.textContent = '';
        const providers = scopeProviders();
        const many = providers.length > 1;
        for (let i = 0; i < 7; i++) {
            const day = addDays(state.weekStart, i);
            const slots = slotsOn(day, providers);
            const free = slots.filter(isBookable).length;
            const col = el('div', 'dsbi-tur__day');
            col.setAttribute('role', 'gridcell');
            if (+day === +today) {
                col.classList.add('is-today');
            }
            const head = el('div', 'dsbi-tur__dayhead', fmtWeekday.format(day));
            if (slots.length) {
                head.appendChild(el('span', 'dsbi-tur__daycount', free + ' ' + (free === 1 ? xl('free') : xl('free slots'))));
            }
            col.appendChild(head);

            const body = el('div', 'dsbi-tur__slots');
            if (!inWindow(day)) {
                col.classList.add('is-off');
                body.appendChild(el('div', 'dsbi-tur__empty', day < today ? xl('Past') : xl('Outside the 60-day window')));
            } else if (!slots.length) {
                col.classList.add('is-off');
                body.appendChild(el('div', 'dsbi-tur__empty', xl('No schedule')));
            }
            slots.forEach((slot) => {
                const status = statusOf(slot);
                if (state.onlyFree && !isBookable(slot) && status !== 'mine') {
                    return;
                }
                const btn = el('button', 'dsbi-tur__slot');
                btn.type = 'button';
                btn.dataset.key = slot.key;
                btn.appendChild(el('span', 'dsbi-tur__time', slot.time));
                let sub = many ? slot.provider.name : '';
                if (status === 'taken') {
                    btn.classList.add('is-taken');
                    btn.disabled = true;
                    sub = xl('Booked');
                } else if (status === 'mine') {
                    btn.classList.add('is-mine');
                    sub = changes.get(slot.key).patient.name;
                } else if (status === 'cancelled') {
                    btn.classList.add('is-cancelled');
                    sub = xl('Cancelled · free again');
                } else if (state.offered.has(slot.key)) {
                    btn.classList.add('is-offered');
                }
                if (slot.key === state.selectedKey) {
                    btn.classList.add('is-selected');
                }
                if (sub) {
                    btn.appendChild(el('small', null, sub));
                }
                btn.title = describe(slot) + ' · ' + slot.provider.name;
                body.appendChild(btn);
            });
            if (state.onlyFree && slots.length && !free) {
                body.appendChild(el('div', 'dsbi-tur__empty', xl('Fully booked')));
            }
            col.appendChild(body);
            weekEl.appendChild(col);
        }
    }

    function renderMini() {
        miniEl.textContent = '';
        const month = state.miniMonth;
        const providers = scopeProviders();
        const table = el('table');
        const head = el('tr');
        const prev = el('button', 'dsbi-tur__mini-nav', '‹');
        prev.type = 'button';
        prev.title = xl('Previous month');
        prev.disabled = month <= new Date(today.getFullYear(), today.getMonth(), 1);
        prev.addEventListener('click', () => { state.miniMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1); renderMini(); });
        const next = el('button', 'dsbi-tur__mini-nav', '›');
        next.type = 'button';
        next.title = xl('Next month');
        next.disabled = new Date(month.getFullYear(), month.getMonth() + 1, 1) > lastDay;
        next.addEventListener('click', () => { state.miniMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1); renderMini(); });
        const thPrev = el('th');
        thPrev.appendChild(prev);
        const thName = el('th', 'dsbi-tur__mini-month', fmtMonthYear.format(month));
        thName.colSpan = 5;
        const thNext = el('th');
        thNext.appendChild(next);
        head.append(thPrev, thName, thNext);
        table.appendChild(head);

        const dows = el('tr');
        const firstMonday = mondayOf(month);
        for (let i = 0; i < 7; i++) {
            dows.appendChild(el('th', null, fmtDow.format(addDays(firstMonday, i))));
        }
        table.appendChild(dows);

        let day = firstMonday;
        const weekEnd = addDays(state.weekStart, 6);
        while (day.getMonth() === month.getMonth() || day < month) {
            const row = el('tr');
            for (let i = 0; i < 7; i++, day = addDays(day, 1)) {
                const cell = el('td');
                cell.appendChild(el('span', null, String(day.getDate())));
                if (day.getMonth() !== month.getMonth()) {
                    cell.classList.add('is-other');
                } else if (inWindow(day)) {
                    const free = slotsOn(day, providers).filter(isBookable).length;
                    cell.classList.add(free ? 'has-free' : 'no-free');
                    if (free) {
                        const target = day;
                        cell.title = free + ' ' + xl('free slots');
                        cell.addEventListener('click', () => goToWeek(target));
                    }
                } else {
                    cell.classList.add('no-free');
                }
                if (day >= state.weekStart && day <= weekEnd) {
                    cell.classList.add('is-week');
                }
                if (+day === +today) {
                    cell.classList.add('is-today');
                }
                row.appendChild(cell);
            }
            table.appendChild(row);
        }
        miniEl.appendChild(table);
    }

    function renderConfirm() {
        const body = $('tur-confirm-body');
        body.textContent = '';
        const key = state.selectedKey || state.bookedKey;
        if (!key) {
            $('tur-note-confirm').textContent = '';
            body.appendChild(waiting('fa-calendar-check', xl('No slot chosen yet.')));
        } else {
            const slot = findSlot(key);
            const change = state.selectedKey ? null : changes.get(key);
            const status = change ? change.status : 'pending';
            $('tur-note-confirm').textContent = status === 'pending' ? xl('Waiting for the patient to confirm in the chat') : xl('Confirmed by the patient in the chat');
            const ticket = el('div', 'dsbi-tur__ticket' + (status === 'mine' ? ' is-booked' : status === 'cancelled' ? ' is-cancelled' : ''));
            const info = el('div');
            info.appendChild(el('div', 'dsbi-tur__ticket-when', fmtLong.format(slot.day) + ' · ' + slot.time));
            const service = change ? change.serviceId : state.serviceId;
            info.appendChild(el('div', null, serviceById.get(service).name + ' · ' + slot.provider.name + ' · ' + slot.provider.room));
            info.appendChild(el('div', 'dsbi-tur__muted', state.patient.name + ' · ' + xl('DNI') + ' ' + dniText(state.patient.dni) + ' · ' + state.patient.coverage));
            ticket.appendChild(info);
            const actions = el('div', 'dsbi-tur__ticket-actions');
            const labels = { pending: [xl('Pending confirmation'), 'pending'], mine: [xl('Booked') + ' · ' + (change ? change.code : ''), 'booked'], cancelled: [xl('Cancelled'), 'cancelled'] };
            actions.appendChild(el('span', 'dsbi-tur__status dsbi-tur__status--' + labels[status][1], labels[status][0]));
            if (status === 'mine') {
                const cancelBtn = el('button', 'btn btn-sm btn-outline-danger', xl('Cancel appointment'));
                cancelBtn.type = 'button';
                cancelBtn.addEventListener('click', () => { user(xl('I need to cancel the appointment')); cancel(key); });
                actions.appendChild(cancelBtn);
            }
            ticket.appendChild(actions);
            body.appendChild(ticket);
        }
        renderBookings();
    }

    function renderBookings() {
        const body = document.querySelector('#tur-bookings tbody');
        body.textContent = '';
        const rows = Array.from(changes.entries()).sort((a, b) => b[1].at - a[1].at);
        if (!rows.length) {
            const tr = el('tr');
            const td = el('td', 'dsbi-tur__none', xl('Nothing booked yet in this conversation.'));
            td.colSpan = 8;
            tr.appendChild(td);
            body.appendChild(tr);
            return;
        }
        rows.forEach(([key, change]) => {
            const slot = findSlot(key);
            const tr = el('tr');
            tr.appendChild(el('td', null, change.code));
            tr.appendChild(el('td', null, fmtShort.format(slot.day)));
            tr.appendChild(el('td', null, slot.time));
            tr.appendChild(el('td', null, slot.provider.name));
            tr.appendChild(el('td', null, serviceById.get(change.serviceId).name));
            tr.appendChild(el('td', null, change.patient.name));
            const st = el('td');
            st.appendChild(change.status === 'mine'
                ? el('span', 'dsbi-tur__status dsbi-tur__status--booked', xl('Booked'))
                : el('span', 'dsbi-tur__status dsbi-tur__status--cancelled', xl('Cancelled')));
            tr.appendChild(st);
            tr.appendChild(el('td'));
            body.appendChild(tr);
        });
    }

    function renderAll() {
        renderSteps();
        renderPatient();
        renderSpecialties();
        renderProviders();
        renderAgenda();
        renderConfirm();
        $('tur-chat-with').textContent = state.patient ? state.patient.name : xl('Unidentified contact');
        $('tur-conv').textContent = xl('Conversation') + ' #' + (4800 + generation) + ' · ' + xl('started') + ' ' + fmtClock.format(state.startedAt);
    }

    function show(step) {
        state.view = step;
        renderSteps();
    }

    // ---- conversation ------------------------------------------------------

    let queue = Promise.resolve();
    let typingEl = null;

    function scrollLog() {
        logEl.scrollTop = logEl.scrollHeight;
    }

    function disableChips() {
        logEl.querySelectorAll('.dsbi-tur__chip').forEach((c) => { c.disabled = true; });
    }

    function bubble(who, text, chips) {
        const msg = el('div', 'dsbi-tur__msg dsbi-tur__msg--' + who);
        msg.appendChild(el('span', null, text));
        if (chips && chips.length) {
            const box = el('div', 'dsbi-tur__chips');
            chips.forEach((chip) => {
                const b = el('button', 'dsbi-tur__chip' + (chip.danger ? ' dsbi-tur__chip--danger' : ''), chip.label);
                b.type = 'button';
                b.addEventListener('click', () => {
                    disableChips();
                    user(chip.say || chip.label);
                    chip.run();
                });
                box.appendChild(b);
            });
            msg.appendChild(box);
        }
        if (who !== 'system') {
            msg.appendChild(el('time', null, fmtClock.format(new Date())));
        }
        logEl.insertBefore(msg, typingEl);
        scrollLog();
    }

    // Steps queue behind each other so the agent "types" between messages.
    function enqueue(fn, delay) {
        const gen = generation;
        queue = queue.then(() => new Promise((resolve) => {
            if (gen !== generation) {
                resolve();
                return;
            }
            if (!delay) {
                fn();
                resolve();
                return;
            }
            typingEl = el('div', 'dsbi-tur__typing');
            typingEl.setAttribute('aria-label', xl('The assistant is typing'));
            typingEl.append(el('span'), el('span'), el('span'));
            logEl.appendChild(typingEl);
            scrollLog();
            setTimeout(() => {
                if (typingEl) {
                    typingEl.remove();
                    typingEl = null;
                }
                if (gen === generation) {
                    fn();
                }
                resolve();
            }, delay);
        }));
    }

    function user(text) {
        disableChips();
        bubble('user', text);
    }

    function agent(text, chips, working) {
        if (working) {
            state.working = working;
            renderSteps();
        }
        enqueue(() => {
            state.working = null;
            renderSteps();
            disableChips();
            bubble('agent', text, chips);
        }, 650 + Math.min(text.length * 6, 650));
    }

    // A line showing what the agent looked up in OpenEMR, like a tool call.
    function lookup(text, after) {
        enqueue(() => {
            const msg = el('div', 'dsbi-tur__msg dsbi-tur__msg--system');
            msg.append(icon('fa-database'), el('span', null, text));
            logEl.appendChild(msg);
            scrollLog();
            if (after) {
                after();
            }
        }, 500);
    }

    function prompt(fn) {
        state.repeat = fn;
        fn();
    }

    // ---- script ------------------------------------------------------------

    function askDni() {
        prompt(() => agent(xl('Hi! I am the booking assistant of the clinic. I can find you an appointment in the next 60 days. To start, please send me your DNI.'),
            PATIENTS.map((p) => ({ label: xl('DNI') + ' ' + dniText(p.dni), run: () => identify(p.dni) })), 'patient'));
    }

    function identify(dni) {
        const p = PATIENTS.find((x) => x.dni === dni.replace(/\D/g, ''));
        state.working = 'patient';
        renderSteps();
        lookup(xl('Patient registry') + ' · ' + xl('search by DNI') + ' ' + dniText(dni.replace(/\D/g, '')) + ' · ' + (p ? '1 ' + xl('match') : xl('no matches')));
        if (!p) {
            agent(xl('I cannot find that DNI among our patients. Could you check it? For this demo you can use one of these:'),
                PATIENTS.map((x) => ({ label: xl('DNI') + ' ' + dniText(x.dni), run: () => identify(x.dni) })));
            return;
        }
        enqueue(() => {
            state.patient = p;
            renderAll();
        }, 0);
        askSpecialty(xlf('Thanks, {name}. I found your record ({coverage}).', { name: p.name.split(' ')[0], coverage: p.coverage }) + ' ');
    }

    function askSpecialty(prefix) {
        enqueue(() => show('specialty'), 0);
        prompt(() => agent((prefix || '') + xl('Which specialty do you need the appointment for?'),
            SERVICES.map((s) => ({ label: s.name, run: () => chooseSpecialty(s.id) })), 'specialty'));
    }

    function chooseSpecialty(id) {
        const service = serviceById.get(id);
        const providers = providersFor(id, null);
        state.working = 'specialty';
        renderSteps();
        lookup(xl('Schedules') + ' · ' + service.name + ' · ' + providers.length + ' ' + (providers.length === 1 ? xl('provider') : xl('providers')) + ' · ' + xl('next 60 days'));
        enqueue(() => {
            state.serviceId = id;
            state.providerId = null;
            state.providerChosen = false;
            state.view = 'provider';
            renderAll();
        }, 0);
        if (providers.length === 1) {
            const p = providers[0];
            agent(xlf('{service} is seen by {provider} ({room}). Shall I look for slots with them?', { service: service.name, provider: p.name, room: p.room }), [
                { label: xl('Yes'), run: () => chooseProvider(p.id) },
                { label: xl('Choose another specialty'), run: () => resetFrom('specialty') }
            ], 'provider');
            state.repeat = null;
            return;
        }
        prompt(() => agent(xlf('For {service} we have {count} providers. Do you prefer someone in particular, or the first available?', { service: service.name, count: providers.length }),
            providers.map((p) => {
                const next = firstFree([p], 1)[0];
                return { label: p.name + (next ? ' · ' + fmtShort.format(next.day) : ''), say: p.name, run: () => chooseProvider(p.id) };
            }).concat([{ label: xl('First available'), run: () => chooseProvider(null) }]), 'provider'));
    }

    function chooseProvider(id) {
        state.working = 'provider';
        renderSteps();
        const providers = providersFor(state.serviceId, id);
        lookup(xl('Free slots') + ' · ' + providers.map(surname).join(', ') + ' · ' + freeCount(providers) + ' ' + xl('found'));
        enqueue(() => {
            state.providerId = id;
            state.providerChosen = true;
            state.selectedKey = null;
            state.view = 'slot';
            jumpToFirstFree();
            renderAll();
        }, 0);
        offerSlots();
    }

    function offerSlots() {
        enqueue(() => {
            const options = firstFree(scopeProviders(), 4);
            state.offered = new Set(options.map((s) => s.key));
            state.view = 'slot';
            if (options.length) {
                goToWeek(options[0].day);
            }
            renderAll();
            if (!options.length) {
                agent(xl('I am sorry, there are no free slots in the next 60 days. Do you want to try another specialty?'),
                    [{ label: xl('Another specialty'), run: () => resetFrom('specialty') }], 'slot');
                return;
            }
            const many = scopeProviders().length > 1;
            state.repeat = offerSlots;
            agent(xl('These are the first free slots. Which one suits you?'),
                options.map((s) => ({
                    label: describe(s) + (many ? ' · ' + surname(s.provider) : ''),
                    run: () => select(s.key)
                })).concat([
                    { label: xl('Later dates'), run: laterSlots },
                    { label: xl('Another provider'), run: () => resetFrom('provider') }
                ]), 'slot');
        }, 0);
    }

    function laterSlots() {
        enqueue(() => {
            const all = firstFree(scopeProviders(), 400);
            const startFrom = addDays(today, 21);
            const later = all.filter((s) => s.day >= startFrom);
            const picks = [];
            const seenDays = new Set();
            later.forEach((s) => {
                if (picks.length < 4 && !seenDays.has(ymd(s.day))) {
                    seenDays.add(ymd(s.day));
                    picks.push(s);
                }
            });
            if (!picks.length) {
                agent(xl('There is nothing else in the 60-day window. These are still free:'), []);
                offerSlots();
                return;
            }
            picks.forEach((s) => state.offered.add(s.key));
            goToWeek(picks[0].day);
            renderAgenda();
            const many = scopeProviders().length > 1;
            agent(xl('From three weeks ahead there is more room. For example:'),
                picks.map((s) => ({ label: describe(s) + (many ? ' · ' + surname(s.provider) : ''), run: () => select(s.key) }))
                    .concat([{ label: xl('Earliest ones'), run: offerSlots }]), 'slot');
        }, 0);
    }

    function select(key) {
        const slot = findSlot(key);
        if (!slot || !isBookable(slot)) {
            return;
        }
        state.selectedKey = key;
        state.bookedKey = null;
        goToWeek(slot.day);
        renderWeek();
        enqueue(() => {
            state.view = 'confirm';
            renderAll();
        }, 0);
        const p = state.patient;
        state.repeat = null;
        agent(xlf('Let me confirm: {service} with {provider}, {date} at {time} ({room}), for {patient} · {coverage}. Shall I book it?', { service: serviceById.get(state.serviceId).name, provider: slot.provider.name, date: fmtLong.format(slot.day), time: slot.time, room: slot.provider.room, patient: p.name, coverage: p.coverage }), [
            { label: xl('Yes, book it'), run: () => book(key) },
            { label: xl('Choose another time'), run: () => { state.selectedKey = null; offerSlots(); } }
        ], 'confirm');
    }

    function book(key) {
        state.working = 'confirm';
        renderSteps();
        const code = 'DSBI-' + (++codeSeq);
        lookup(xlf('Calendar · appointment {code} created (demo, not saved)', { code: code }), () => {
            changes.set(key, { status: 'mine', code: code, serviceId: state.serviceId, patient: state.patient, at: Date.now() });
            state.selectedKey = null;
            state.bookedKey = key;
            state.offered = new Set();
            renderAll();
        });
        const slot = findSlot(key);
        // {br} and {ok} stand in for the line breaks and emoji, which xl() would not keep.
        agent(xlf('Done! Your appointment is booked {ok}{br}{date} · {time}{br}{provider} · {room}{br}Code: {code}{br}Please arrive 10 minutes early with your DNI and insurance card. If you cannot make it, write to me and I will cancel it.', { ok: '✅', br: '\n', date: fmtLong.format(slot.day), time: slot.time, provider: slot.provider.name, room: slot.provider.room, code: code }), [
            { label: xl('Cancel this appointment'), say: xl('I need to cancel the appointment'), danger: true, run: () => cancel(key) },
            { label: xl('Book another one'), run: () => resetFrom('specialty') },
            { label: xl('That is all, thanks'), run: bye }
        ], 'confirm');
    }

    function cancel(key) {
        const change = changes.get(key);
        if (!change || change.status !== 'mine') {
            return;
        }
        const slot = findSlot(key);
        agent(xlf('Do you want to cancel {code} ({when} with {provider})?', { code: change.code, when: describe(slot), provider: slot.provider.name }), [
            { label: xl('Yes, cancel it'), danger: true, run: () => doCancel(key) },
            { label: xl('No, keep it'), run: () => agent(xl('Perfect, it stays booked. See you then!')) }
        ], 'confirm');
    }

    function doCancel(key) {
        const change = changes.get(key);
        const slot = findSlot(key);
        state.working = 'confirm';
        renderSteps();
        lookup(xlf('Calendar · {code} marked as cancelled · slot released', { code: change.code }), () => {
            change.status = 'cancelled';
            change.at = Date.now();
            state.bookedKey = key;
            state.view = 'confirm';
            renderAll();
        });
        agent(xlf('Your appointment {code} is cancelled. The slot on {when} is free again for other patients. Do you want a new one?', { code: change.code, when: describe(slot) }), [
            { label: xl('Find a new slot'), run: () => { state.bookedKey = null; offerSlots(); } },
            { label: xl('No, thanks'), run: bye }
        ], 'confirm');
    }

    function bye() {
        state.repeat = null;
        agent(xlf('Thanks for writing, {name}. Have a good day!', { name: state.patient.name.split(' ')[0] }));
    }

    // Going back to an earlier stage from the chat clears what came after it.
    function resetFrom(step) {
        state.selectedKey = null;
        state.offered = new Set();
        if (step === 'specialty') {
            state.serviceId = null;
            state.providerId = null;
            state.providerChosen = false;
            state.bookedKey = null;
            renderAll();
            askSpecialty();
            return;
        }
        state.providerId = null;
        state.providerChosen = false;
        renderAll();
        chooseSpecialty(state.serviceId);
    }

    // ---- free text from the composer ---------------------------------------

    function norm(text) {
        return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    }

    function understand(text) {
        const t = norm(text);
        const digits = text.replace(/\D/g, '');
        if (!state.patient) {
            if (digits.length >= 7) {
                identify(digits);
            } else {
                agent(xl('To find your record I need your DNI, numbers only.'));
            }
            return;
        }
        if (/cancel/.test(t) && state.bookedKey && changes.get(state.bookedKey).status === 'mine') {
            cancel(state.bookedKey);
            return;
        }
        const service = SERVICES.find((s) => t.includes(norm(s.name)) || (t.length >= 4 && norm(s.name).includes(t)));
        if (service && !state.selectedKey) {
            state.serviceId = null;
            state.providerChosen = false;
            chooseSpecialty(service.id);
            return;
        }
        const provider = state.serviceId && providersFor(state.serviceId, null).find((p) => t.includes(norm(surname(p))));
        if (provider && !state.providerChosen) {
            chooseProvider(provider.id);
            return;
        }
        agent(xl('In this demo I work with the options I offer. Here they are again:'));
        if (state.repeat) {
            state.repeat();
        }
    }

    // ---- navigation --------------------------------------------------------

    function goToWeek(day) {
        state.weekStart = mondayOf(day);
        state.miniMonth = new Date(day.getFullYear(), day.getMonth(), 1);
        renderAgenda();
    }

    function jumpToFirstFree() {
        const first = firstFree(scopeProviders(), 1)[0];
        const day = first ? first.day : today;
        state.weekStart = mondayOf(day);
        state.miniMonth = new Date(day.getFullYear(), day.getMonth(), 1);
    }

    // ---- events ------------------------------------------------------------

    document.querySelectorAll('#tur-steps [data-step]').forEach((btn) => {
        btn.addEventListener('click', () => show(btn.dataset.step));
    });

    weekEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.dsbi-tur__slot');
        if (!btn || btn.disabled) {
            return;
        }
        const key = btn.dataset.key;
        const change = changes.get(key);
        if (change && change.status === 'mine') {
            user(xl('I need to cancel the appointment'));
            cancel(key);
            return;
        }
        user(xl('I prefer') + ' ' + describe(findSlot(key)));
        select(key);
    });

    $('tur-onlyfree').addEventListener('change', (e) => {
        state.onlyFree = e.target.checked;
        renderWeek();
    });
    $('tur-prev').addEventListener('click', () => goToWeek(addDays(state.weekStart, -7)));
    $('tur-next').addEventListener('click', () => goToWeek(addDays(state.weekStart, 7)));
    $('tur-today').addEventListener('click', () => goToWeek(today));
    $('tur-first').addEventListener('click', () => {
        const first = firstFree(scopeProviders(), 1)[0];
        if (first) {
            goToWeek(first.day);
        }
    });

    $('tur-composer').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = $('tur-input');
        const text = input.value.trim();
        if (!text) {
            return;
        }
        input.value = '';
        user(text);
        understand(text);
    });

    function start() {
        generation++;
        queue = Promise.resolve();
        typingEl = null;
        changes = new Map();
        state = freshState();
        logEl.textContent = '';
        $('tur-onlyfree').checked = false;
        renderAll();
        const intro = el('div', 'dsbi-tur__msg dsbi-tur__msg--system');
        intro.append(icon('fa-comment-medical'), el('span', null, xl('New WhatsApp conversation') + ' · ' + fmtClock.format(state.startedAt)));
        logEl.appendChild(intro);
        bubble('user', xl('Hi, I would like to book an appointment'));
        askDni();
    }

    $('tur-reset').addEventListener('click', start);
    start();
}());
