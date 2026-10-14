/**
 * Behaviour for the DSBI sidebar layout (interface/themes/tabs_style_dsbi.scss).
 *
 * Does nothing unless that layout is the active "Tabs Layout Theme": the
 * stylesheet announces itself through the --dsbi-shell custom property.
 * It never builds or filters menu entries; it only opens and closes what the
 * stock menu template already rendered.
 *
 * Wide screens: the header button switches the sidebar between labels and an
 * icon rail, and the choice is remembered. Narrow screens: the rail is the
 * resting state and the button slides the full menu over the content as a
 * drawer, which closes again on the backdrop, Escape or once an entry opens.
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
    const DRAWER_CLASS = 'dsbi-drawer';
    const OPEN_CLASS = 'dsbi-open';
    // Matches the breakpoint in tabs_style_dsbi.scss.
    const NARROW_QUERY = '(max-width: 61.99rem)';

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

        const narrow = window.matchMedia(NARROW_QUERY);

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'dsbi-sidebar-toggle';
        toggle.setAttribute('aria-controls', 'mainMenu');
        const icon = document.createElement('i');
        icon.className = 'fa fa-bars';
        icon.setAttribute('aria-hidden', 'true');
        toggle.appendChild(icon);
        navbar.insertBefore(toggle, navbar.firstChild);

        // Covers the content while the drawer is open; a click on it closes the drawer.
        const backdrop = document.createElement('div');
        backdrop.className = 'dsbi-sidebar-backdrop';
        backdrop.setAttribute('aria-hidden', 'true');
        box.appendChild(backdrop);

        function isExpanded() {
            return narrow.matches ? box.classList.contains(DRAWER_CLASS) : !box.classList.contains(RAIL_CLASS);
        }

        function render() {
            const expanded = isExpanded();
            const label = translate(expanded ? 'Collapse menu' : 'Expand menu');
            toggle.title = label;
            toggle.setAttribute('aria-label', label);
            toggle.setAttribute('aria-expanded', String(expanded));
        }

        function setExpanded(expanded) {
            if (narrow.matches) {
                box.classList.toggle(DRAWER_CLASS, expanded);
            } else {
                box.classList.toggle(RAIL_CLASS, !expanded);
                storeCollapsed(!expanded);
            }
            render();
        }

        // Each width keeps its own resting state: the remembered choice on wide
        // screens, the rail on narrow ones.
        function applyWidth() {
            box.classList.remove(DRAWER_CLASS);
            box.classList.toggle(RAIL_CLASS, !narrow.matches && readCollapsed());
            render();
        }

        applyWidth();
        narrow.addEventListener('change', applyWidth);

        toggle.addEventListener('click', function () {
            setExpanded(!isExpanded());
        });
        backdrop.addEventListener('click', function () {
            setExpanded(false);
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && box.classList.contains(DRAWER_CLASS)) {
                setExpanded(false);
                toggle.focus();
            }
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
            // An icon in the rail has no room for its submenu: show the labels first.
            if (!isExpanded()) {
                setExpanded(true);
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

        // On a narrow screen the drawer gets out of the way once an entry opens its tab.
        menu.addEventListener('click', function (event) {
            const label = event.target.closest('.menuLabel');
            if (!label || label.classList.contains('dropdown-toggle') || label.classList.contains('menuDisabled')) {
                return;
            }
            if (box.classList.contains(DRAWER_CLASS)) {
                setExpanded(false);
            }
        });

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
