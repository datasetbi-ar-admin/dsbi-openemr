<?php

/**
 * DSBI screens: language of the session and the strings each screen ships.
 *
 * DSBI screens carry their own translations in <screen>/lang/<code>.php
 * (English source text => translation) instead of the shared lang_* tables,
 * so they travel with the code and keep their own wording (for instance
 * "Profesional" rather than the stock "Proveedor" for Provider). Languages
 * without a file fall back to the English source text.
 *
 * @package   OpenEMR
 * @link      https://www.open-emr.org
 * @author    DatasetBI
 * @copyright Copyright (c) 2026 DatasetBI
 * @license   https://github.com/openemr/openemr/blob/master/LICENSE GNU General Public License 3
 */

use OpenEMR\Common\Session\SessionWrapperFactory;

/**
 * Language of the current session as [file code, BCP 47 locale], or null for English.
 *
 * @return array{0: string, 1: string}|null
 */
function dsbiI18nLanguage(): ?array
{
    static $language = false;
    if ($language !== false) {
        return $language;
    }
    $langId = (int) (SessionWrapperFactory::getInstance()->getActiveSession()->get('language_choice') ?: 1);
    $row = sqlQuery("SELECT lang_description FROM lang_languages WHERE lang_id = ?", [$langId]);
    $description = (string) ($row['lang_description'] ?? '');
    $language = null;
    if (str_starts_with($description, 'Spanish')) {
        $language = ['es', str_contains($description, 'Latin') ? 'es-419' : 'es-ES'];
    }
    return $language;
}

/**
 * Strings for the session language from a screen's lang directory.
 *
 * @return array<string, string>
 */
function dsbiI18nStrings(string $langDir): array
{
    $language = dsbiI18nLanguage();
    if ($language === null) {
        return [];
    }
    $file = $langDir . '/' . $language[0] . '.php';
    return is_file($file) ? (array) require $file : [];
}
