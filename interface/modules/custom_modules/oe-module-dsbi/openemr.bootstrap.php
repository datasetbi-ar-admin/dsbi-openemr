<?php

/**
 * DSBI module bootstrap: adds a "DatasetBI" entry to the main menu with the
 * Dashboards and Booking Assistant screens under it.
 *
 * OpenEMR loads this file only while the module is enabled in
 * Administration -> Modules -> Manage Modules. The entries are added through
 * MenuEvent::MENU_UPDATE, which runs for the standard menus and for custom
 * menus (documents/custom_menus/*.json) alike, so no menu file is edited.
 *
 * @package   OpenEMR
 * @link      https://www.open-emr.org
 * @author    DatasetBI
 * @copyright Copyright (c) 2026 DatasetBI
 * @license   https://github.com/openemr/openemr/blob/master/LICENSE GNU General Public License 3
 */

declare(strict_types=1);

use OpenEMR\Core\OEGlobalsBag;
use OpenEMR\Menu\MenuEvent;

$eventDispatcher = OEGlobalsBag::getInstance()->getKernel()->getEventDispatcher();

$eventDispatcher->addListener(MenuEvent::MENU_UPDATE, static function (MenuEvent $event): void {
    $base = '/interface/modules/custom_modules/oe-module-dsbi/public';

    $menu = $event->getMenu();
    if (!is_array($menu)) {
        return;
    }
    $menu = array_values($menu);
    foreach ($menu as $item) {
        if (is_object($item) && ($item->menu_id ?? null) === 'dsbi0') {
            return;
        }
    }

    // Labels are translated here because the menu loader has already run
    // xlt() over the menu file's own labels by the time this event fires.
    $children = [];
    foreach (
        [
            ['dsbidash', 'dsb', xlt('Dashboards{{Dashboards}}'), $base . '/dashboards/index.php'],
            ['dsbitur', 'dtu', xlt('Booking Assistant{{Booking assistant}}'), $base . '/turnos/index.php'],
        ] as [$menuId, $target, $label, $url]
    ) {
        $entry = new stdClass();
        $entry->label = $label;
        $entry->menu_id = $menuId;
        $entry->target = $target;
        $entry->url = $url;
        $entry->children = [];
        $entry->requirement = 0;
        // Same permission as the calendar.
        $entry->acl_req = ['patients', 'appt'];
        $entry->global_req = [];
        $children[] = $entry;
    }

    // One top-level entry holding both screens, to keep the menu bar short.
    // Without a url it is a header: OpenEMR drops it when the user may not
    // see any of its children.
    $group = new stdClass();
    $group->label = xlt('DatasetBI{{Menu}}');
    $group->menu_id = 'dsbi0';
    $group->children = $children;
    $group->requirement = 0;

    // Right after the calendar when the menu has one, otherwise at the end.
    $position = count($menu);
    foreach ($menu as $index => $item) {
        if (is_object($item) && ($item->menu_id ?? null) === 'cal0') {
            $position = $index + 1;
            break;
        }
    }
    array_splice($menu, $position, 0, [$group]);
    $event->setMenu($menu);
});
