<?php

/**
 * DSBI booking assistant: demo of an agent that books appointments by chat.
 *
 * Mock-up for the planned booking agent. The chat walks the patient through
 * identification, specialty, provider, day and time, and confirmation, while
 * the stage tabs show what the agent is working on. Patients, providers,
 * schedules and bookings are invented in the browser by dsbi_turnos.js;
 * nothing is read from or written to the database, and a reload starts the
 * demo again.
 *
 * @package   OpenEMR
 * @link      https://www.open-emr.org
 * @author    DatasetBI
 * @copyright Copyright (c) 2026 DatasetBI
 * @license   https://github.com/openemr/openemr/blob/master/LICENSE GNU General Public License 3
 */

require_once("../../globals.php");
require_once(__DIR__ . "/../i18n/dsbi_i18n.php");

use OpenEMR\Common\Acl\AccessDeniedHelper;
use OpenEMR\Common\Acl\AclMain;
use OpenEMR\Core\Header;
use OpenEMR\Core\OEGlobalsBag;

if (!AclMain::aclCheckCore('patients', 'appt')) {
    AccessDeniedHelper::denyWithTemplate("ACL check failed for patients/appt: DSBI booking assistant", xl("Booking Assistant"));
}

$version = OEGlobalsBag::getInstance()->getString('v_js_includes');

$language = dsbiI18nLanguage();
$strings = dsbiI18nStrings(__DIR__ . '/lang');
$tt = fn(string $text): string => text($strings[$text] ?? $text);
$ta = fn(string $text): string => attr($strings[$text] ?? $text);
?>
<!DOCTYPE html>
<html lang="<?php echo attr($language[1] ?? 'en'); ?>">
<head>
    <title><?php echo $tt('Booking Assistant'); ?></title>
    <?php Header::setupHeader(); ?>
    <link rel="stylesheet" href="dsbi_turnos.css?v=<?php echo attr_url($version); ?>">
</head>
<body class="dsbi-tur">

<div class="dsbi-tur__toolbar">
    <div class="dsbi-tur__title">
        <i class="fa fa-calendar-check" aria-hidden="true"></i>
        <span><?php echo $tt('Booking Assistant'); ?></span>
        <span class="dsbi-tur__sep" aria-hidden="true">·</span>
        <span class="dsbi-tur__conv" id="tur-conv"></span>
    </div>
    <div class="dsbi-tur__tools">
        <span class="dsbi-tur__badge" title="<?php echo $ta('Patients, providers, slots and bookings on this screen are invented; nothing is saved'); ?>">
            <i class="fa fa-flask" aria-hidden="true"></i> <?php echo $tt('Demo'); ?>
        </span>
        <button type="button" class="btn btn-outline-primary btn-sm" id="tur-reset" title="<?php echo $ta('Start a new conversation'); ?>">
            <i class="fa fa-sync" aria-hidden="true"></i> <?php echo $tt('New conversation'); ?>
        </button>
    </div>
</div>

<div class="dsbi-tur__body">
    <div class="dsbi-tur__main">
        <ol class="dsbi-tur__steps" id="tur-steps" role="tablist" aria-label="<?php echo $ta('Booking stages'); ?>">
            <li role="presentation"><button type="button" role="tab" data-step="patient"><span class="dsbi-tur__stepnum">1</span><span class="dsbi-tur__steptext"><?php echo $tt('Patient'); ?><small data-summary></small></span></button></li>
            <li role="presentation"><button type="button" role="tab" data-step="specialty"><span class="dsbi-tur__stepnum">2</span><span class="dsbi-tur__steptext"><?php echo $tt('Specialty'); ?><small data-summary></small></span></button></li>
            <li role="presentation"><button type="button" role="tab" data-step="provider"><span class="dsbi-tur__stepnum">3</span><span class="dsbi-tur__steptext"><?php echo $tt('Provider'); ?><small data-summary></small></span></button></li>
            <li role="presentation"><button type="button" role="tab" data-step="slot"><span class="dsbi-tur__stepnum">4</span><span class="dsbi-tur__steptext"><?php echo $tt('Day and time'); ?><small data-summary></small></span></button></li>
            <li role="presentation"><button type="button" role="tab" data-step="confirm"><span class="dsbi-tur__stepnum">5</span><span class="dsbi-tur__steptext"><?php echo $tt('Confirmation'); ?><small data-summary></small></span></button></li>
        </ol>

        <section class="dsbi-tur__panel" data-panel="patient" role="tabpanel">
            <header class="dsbi-tur__panel-head">
                <h2><?php echo $tt('Patient identification'); ?></h2>
                <span class="dsbi-tur__agentnote" id="tur-note-patient"></span>
            </header>
            <div id="tur-patient-body"></div>
        </section>

        <section class="dsbi-tur__panel" data-panel="specialty" role="tabpanel" hidden>
            <header class="dsbi-tur__panel-head">
                <h2><?php echo $tt('Specialties with schedules in the next 60 days'); ?></h2>
                <span class="dsbi-tur__agentnote" id="tur-note-specialty"></span>
            </header>
            <div class="dsbi-tur__cards" id="tur-specialties"></div>
        </section>

        <section class="dsbi-tur__panel" data-panel="provider" role="tabpanel" hidden>
            <header class="dsbi-tur__panel-head">
                <h2><?php echo $tt('Providers'); ?> <span class="dsbi-tur__muted" id="tur-provider-scope"></span></h2>
                <span class="dsbi-tur__agentnote" id="tur-note-provider"></span>
            </header>
            <div class="dsbi-tur__cards" id="tur-providers"></div>
        </section>

        <section class="dsbi-tur__panel dsbi-tur__panel--agenda" data-panel="slot" role="tabpanel" hidden>
            <div class="dsbi-tur__agenda-bar">
                <div class="dsbi-tur__tools">
                    <button type="button" class="btn btn-primary btn-sm" id="tur-today"><?php echo $tt('Today'); ?></button>
                    <button type="button" class="btn btn-primary btn-sm" id="tur-first" title="<?php echo $ta('Go to the first free slot'); ?>">
                        <i class="fa fa-forward" aria-hidden="true"></i> <?php echo $tt('First free'); ?>
                    </button>
                </div>
                <div class="dsbi-tur__datenav">
                    <button type="button" class="dsbi-tur__chev" id="tur-prev" title="<?php echo $ta('Previous week'); ?>"><i class="fa fa-chevron-circle-left" aria-hidden="true"></i></button>
                    <span id="tur-range"></span>
                    <button type="button" class="dsbi-tur__chev" id="tur-next" title="<?php echo $ta('Next week'); ?>"><i class="fa fa-chevron-circle-right" aria-hidden="true"></i></button>
                </div>
                <span class="dsbi-tur__muted" id="tur-agenda-scope"></span>
            </div>
            <div class="dsbi-tur__agenda">
                <aside class="dsbi-tur__side">
                    <div class="dsbi-tur__mini" id="tur-mini"></div>
                    <div class="custom-control custom-checkbox dsbi-tur__onlyfree">
                        <input type="checkbox" class="custom-control-input" id="tur-onlyfree">
                        <label class="custom-control-label" for="tur-onlyfree"><?php echo $tt('Only free slots'); ?></label>
                    </div>
                    <ul class="dsbi-tur__legend" aria-label="<?php echo $ta('Legend'); ?>">
                        <li><span class="dsbi-tur__swatch dsbi-tur__swatch--free"></span><?php echo $tt('Free'); ?></li>
                        <li><span class="dsbi-tur__swatch dsbi-tur__swatch--offered"></span><?php echo $tt('Offered in the chat'); ?></li>
                        <li><span class="dsbi-tur__swatch dsbi-tur__swatch--taken"></span><?php echo $tt('Booked'); ?></li>
                        <li><span class="dsbi-tur__swatch dsbi-tur__swatch--selected"></span><?php echo $tt('Selected'); ?></li>
                        <li><span class="dsbi-tur__swatch dsbi-tur__swatch--mine"></span><?php echo $tt('Booked by the assistant'); ?></li>
                        <li><span class="dsbi-tur__swatch dsbi-tur__swatch--cancelled"></span><?php echo $tt('Cancelled'); ?></li>
                    </ul>
                    <p class="dsbi-tur__window"><?php echo $tt('The assistant offers the next 60 days'); ?></p>
                </aside>
                <div class="dsbi-tur__week" id="tur-week" role="grid" aria-label="<?php echo $ta('Slots for the week'); ?>"></div>
            </div>
        </section>

        <section class="dsbi-tur__panel" data-panel="confirm" role="tabpanel" hidden>
            <header class="dsbi-tur__panel-head">
                <h2><?php echo $tt('Confirmation'); ?></h2>
                <span class="dsbi-tur__agentnote" id="tur-note-confirm"></span>
            </header>
            <div id="tur-confirm-body"></div>
            <h3 class="dsbi-tur__subhead"><?php echo $tt('Appointments handled in this conversation'); ?></h3>
            <div class="table-responsive">
                <table class="table table-sm dsbi-tur__table" id="tur-bookings">
                    <thead>
                    <tr>
                        <th scope="col"><?php echo $tt('Code'); ?></th>
                        <th scope="col"><?php echo $tt('Date'); ?></th>
                        <th scope="col"><?php echo $tt('Time'); ?></th>
                        <th scope="col"><?php echo $tt('Provider'); ?></th>
                        <th scope="col"><?php echo $tt('Specialty'); ?></th>
                        <th scope="col"><?php echo $tt('Patient'); ?></th>
                        <th scope="col"><?php echo $tt('Status'); ?></th>
                        <th scope="col"><span class="sr-only"><?php echo $tt('Actions'); ?></span></th>
                    </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </section>
    </div>

    <aside class="dsbi-tur__chat" aria-label="<?php echo $ta('Conversation with the booking assistant'); ?>">
        <header class="dsbi-tur__chat-head">
            <span class="dsbi-tur__avatar" aria-hidden="true"><i class="fa fa-robot"></i></span>
            <div>
                <strong><?php echo $tt('Booking assistant'); ?></strong>
                <span class="dsbi-tur__chat-sub"><i class="fab fa-whatsapp" aria-hidden="true"></i> <?php echo $tt('WhatsApp channel'); ?> · <span id="tur-chat-with"><?php echo $tt('Unidentified contact'); ?></span></span>
            </div>
            <span class="dsbi-tur__online"><?php echo $tt('Online'); ?></span>
        </header>
        <div class="dsbi-tur__log" id="tur-log" role="log" aria-live="polite"></div>
        <form class="dsbi-tur__composer" id="tur-composer" autocomplete="off">
            <input type="text" class="form-control" id="tur-input" placeholder="<?php echo $ta('Write as the patient...'); ?>" aria-label="<?php echo $ta('Message'); ?>">
            <button type="submit" class="btn btn-primary" title="<?php echo $ta('Send'); ?>"><i class="fa fa-paper-plane" aria-hidden="true"></i></button>
        </form>
    </aside>
</div>
<script>
    window.dsbiTurI18n = <?php echo json_encode(['locale' => $language[1] ?? null, 'strings' => (object) $strings], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE); ?>;
</script>
<script src="dsbi_turnos.js?v=<?php echo attr_url($version); ?>"></script>
</body>
</html>
