<?php

/**
 * DSBI module: shared language helpers for the module's screens.
 *
 * Texts are translated by OpenEMR itself: each screen's strings.php sends
 * them through xl(), and sql/traducciones_dsbi.sql loads the Spanish rows.
 * This file only works out the locale the browser should use to format
 * dates and numbers.
 *
 * @package   OpenEMR
 * @link      https://www.open-emr.org
 * @author    DatasetBI
 * @copyright Copyright (c) 2026 DatasetBI
 * @license   https://github.com/openemr/openemr/blob/master/LICENSE GNU General Public License 3
 */

declare(strict_types=1);

use OpenEMR\Common\Session\SessionWrapperFactory;

/**
 * BCP 47 locale of the session language, or null to use the browser's own.
 */
function dsbiModuleLocale(): ?string
{
    static $locale = false;
    if ($locale !== false) {
        return $locale;
    }
    $choice = SessionWrapperFactory::getInstance()->getActiveSession()->get('language_choice');
    $langId = is_numeric($choice) ? (int) $choice : 1;
    $row = sqlQuery("SELECT lang_description FROM lang_languages WHERE lang_id = ?", [$langId]);
    $description = is_array($row) && is_string($row['lang_description'] ?? null) ? $row['lang_description'] : '';
    $locale = null;
    // Latin American Spanish formats as in Argentina (3.960 · 81,4 %), matching
    // the Rioplatense wording and the Argentine demo data.
    if (str_starts_with($description, 'Spanish')) {
        $locale = str_contains($description, 'Latin') ? 'es-AR' : 'es-ES';
    }
    return $locale;
}

/**
 * Strings a screen hands to its JS, as a JSON literal safe inside <script>.
 *
 * @param array<string, string> $strings
 */
function dsbiModuleI18nJson(array $strings): string
{
    return json_encode(
        ['locale' => dsbiModuleLocale(), 'strings' => (object) $strings],
        JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
    );
}
