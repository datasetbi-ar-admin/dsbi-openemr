/**
 * Behaviour for the DSBI sidebar layout (interface/themes/tabs_style_dsbi.scss).
 *
 * Does nothing unless that layout is the active "Tabs Layout Theme": the
 * stylesheet announces itself through the --dsbi-shell custom property.
 * It never builds or filters menu entries; it only opens and closes what the
 * stock menu template already rendered.
 *
 * @package   OpenEMR
 * @link      https://www.open-emr.org
 * @author    DatasetBI
 * @copyright Copyright (c) 2026 DatasetBI
 * @license   https://github.com/openemr/openemr/blob/master/LICENSE GNU General Public License 3
 */

(function () {
    'use strict';

    const STORAGE_KEY = 'dsbi.sidebar.collapsed';
    const RAIL_CLASS = 'dsbi-rail';
    const OPEN_CLASS = 'dsbi-open';

    function translate(text) {
        // xl() yields nothing until the translation bundle has loaded.
        const translated = typeof window.xl === 'function' ? window.xl(text) : '';
        return translated || text;
    }

    function readCollapsed() {
        try {
            return window.localStorage.getItem(STORAGE_KEY) === '1';
        } catch (e) {
            return false;
        }
    }

    function storeCollapsed(collapsed) {
        try {
            window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
        } catch (e) {
            // Storage can be blocked; the sidebar still works for this page load.
        }
    }

    function init() {
        const box = document.getElementById('mainBox');
        const menu = document.getElementById('mainMenu');
        const navbar = box ? box.querySelector(':scope > .navbar') : null;
        const shell = window.getComputedStyle(document.documentElement).getPropertyValue('--dsbi-shell').trim();
        if (!box || !menu || !navbar || shell !== 'sidebar') {
            return;
        }

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'dsbi-sidebar-toggle';
        toggle.setAttribute('aria-controls', 'mainMenu');
        const icon = document.createElement('i');
        icon.className = 'fa fa-angles-left';
        icon.setAttribute('aria-hidden', 'true');
        const text = document.createElement('span');
        toggle.append(icon, text);
        navbar.appendChild(toggle);

        function setRail(collapsed) {
            box.classList.toggle(RAIL_CLASS, collapsed);
            const label = translate(collapsed ? 'Expand menu' : 'Collapse menu');
            text.textContent = label;
            toggle.title = label;
            toggle.setAttribute('aria-label', label);
            toggle.setAttribute('aria-expanded', String(!collapsed));
        }

        setRail(readCollapsed());
        toggle.addEventListener('click', function () {
            const collapsed = !box.classList.contains(RAIL_CLASS);
            setRail(collapsed);
            storeCollapsed(collapsed);
        });

        function setOpen(section, open) {
            section.classList.toggle(OPEN_CLASS, open);
            const label = section.querySelector(':scope > .menuLabel');
            if (label) {
                label.setAttribute('aria-expanded', String(open));
            }
        }

        // Accordion: capture the click before Bootstrap's dropdown handler, which
        // would position the submenu as a floating panel and close it on the next click.
        menu.addEventListener('click', function (event) {
            const label = event.target.closest('.menuLabel.dropdown-toggle');
            if (!label || !menu.contains(label)) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();

            const section = label.parentElement;
            const willOpen = !section.classList.contains(OPEN_CLASS);
            if (box.classList.contains(RAIL_CLASS)) {
                setRail(false);
                storeCollapsed(false);
            }

            // One open branch per level keeps the sidebar short.
            const item = section.parentElement;
            const level = item ? item.parentElement : null;
            if (level) {
                level.querySelectorAll(':scope > * > .menuSection.' + OPEN_CLASS).forEach(function (other) {
                    if (other !== section) {
                        setOpen(other, false);
                    }
                });
            }
            setOpen(section, willOpen);
        }, true);

        // Entries are divs in the stock template; make them reachable by keyboard
        // and give collapsed icons a tooltip. Knockout renders them after load.
        function decorate() {
            menu.querySelectorAll('.menuLabel').forEach(function (label) {
                if (!label.hasAttribute('tabindex')) {
                    label.setAttribute('tabindex', '0');
                }
                if (!label.hasAttribute('role')) {
                    label.setAttribute('role', 'button');
                }
                const caption = label.textContent.trim();
                if (caption && label.title !== caption) {
                    label.title = caption;
                }
            });
        }

        decorate();
        new MutationObserver(decorate).observe(menu, { childList: true, subtree: true });

        menu.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter' && event.key !== ' ') {
                return;
            }
            const label = event.target.closest('.menuLabel');
            if (label && menu.contains(label)) {
                event.preventDefault();
                label.click();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
