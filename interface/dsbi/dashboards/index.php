<?php

/**
 * DSBI dashboards: appointment and schedule overview.
 *
 * Demonstration screen for the DatasetBI theme. Every figure is generated in
 * the browser by dsbi_dashboards.js; nothing is read from the database.
 *
 * @package   OpenEMR
 * @link      https://www.open-emr.org
 * @author    DatasetBI
 * @copyright Copyright (c) 2026 DatasetBI
 * @license   https://github.com/openemr/openemr/blob/master/LICENSE GNU General Public License 3
 */

require_once("../../globals.php");

use OpenEMR\Common\Acl\AccessDeniedHelper;
use OpenEMR\Common\Acl\AclMain;
use OpenEMR\Core\Header;
use OpenEMR\Core\OEGlobalsBag;

if (!AclMain::aclCheckCore('patients', 'appt')) {
    AccessDeniedHelper::denyWithTemplate("ACL check failed for patients/appt: DSBI dashboards", xl("Dashboards"));
}

$version = OEGlobalsBag::getInstance()->getString('v_js_includes');
?>
<!DOCTYPE html>
<html>
<head>
    <title><?php echo xlt('Dashboards'); ?></title>
    <?php Header::setupHeader(['echarts']); ?>
    <link rel="stylesheet" href="dsbi_dashboards.css?v=<?php echo attr_url($version); ?>">
</head>
<body class="dsbi-dash">
<main class="dsbi-dash__page">
    <header class="dsbi-dash__head">
        <div>
            <h1 class="dsbi-dash__title"><?php echo xlt('Appointments and schedules'); ?></h1>
            <p class="dsbi-dash__subtitle"><?php echo xlt('Last 12 months'); ?> · <span id="dsbi-dash-updated"></span></p>
        </div>
        <span class="dsbi-dash__badge" title="<?php echo xla('Every figure on this screen is invented for demonstration'); ?>">
            <i class="fa fa-flask" aria-hidden="true"></i> <?php echo xlt('Demo data'); ?>
        </span>
    </header>

    <section class="dsbi-dash__kpis" id="dsbi-dash-kpis" aria-label="<?php echo xla('Key figures'); ?>"></section>

    <section class="dsbi-dash__grid">
        <article class="dsbi-dash__card dsbi-dash__card--wide">
            <header class="dsbi-dash__card-head">
                <h2><?php echo xlt('Monthly appointments by outcome'); ?></h2>
            </header>
            <div class="dsbi-dash__chart dsbi-dash__chart--tall" id="chart-monthly" role="img" aria-label="<?php echo xla('Monthly appointments by outcome'); ?>"></div>
        </article>

        <article class="dsbi-dash__card">
            <header class="dsbi-dash__card-head">
                <h2><?php echo xlt('Schedule occupancy'); ?></h2>
                <span class="dsbi-dash__card-note"><?php echo xlt('Booked slots / offered slots'); ?></span>
            </header>
            <div class="dsbi-dash__chart" id="chart-occupancy" role="img" aria-label="<?php echo xla('Schedule occupancy'); ?>"></div>
        </article>

        <article class="dsbi-dash__card">
            <header class="dsbi-dash__card-head">
                <h2><?php echo xlt('Daily appointments, last 30 days'); ?></h2>
            </header>
            <div class="dsbi-dash__chart" id="chart-daily" role="img" aria-label="<?php echo xla('Daily appointments, last 30 days'); ?>"></div>
        </article>

        <article class="dsbi-dash__card">
            <header class="dsbi-dash__card-head">
                <h2><?php echo xlt('Occupancy by schedule'); ?></h2>
                <span class="dsbi-dash__card-note"><?php echo xlt('Current month'); ?></span>
            </header>
            <div class="dsbi-dash__chart dsbi-dash__chart--tall" id="chart-schedules" role="img" aria-label="<?php echo xla('Occupancy by schedule'); ?>"></div>
        </article>

        <article class="dsbi-dash__card">
            <header class="dsbi-dash__card-head">
                <h2><?php echo xlt('Demand by day and time'); ?></h2>
                <span class="dsbi-dash__card-note"><?php echo xlt('Average appointments per slot'); ?></span>
            </header>
            <div class="dsbi-dash__chart dsbi-dash__chart--tall" id="chart-heatmap" role="img" aria-label="<?php echo xla('Demand by day and time'); ?>"></div>
        </article>

        <article class="dsbi-dash__card dsbi-dash__card--wide">
            <header class="dsbi-dash__card-head">
                <h2><?php echo xlt('Schedules for the next 7 days'); ?></h2>
            </header>
            <div class="table-responsive">
                <table class="table dsbi-dash__table" id="dsbi-dash-agenda">
                    <thead>
                    <tr>
                        <th scope="col"><?php echo xlt('Schedule'); ?></th>
                        <th scope="col"><?php echo xlt('Provider'); ?></th>
                        <th scope="col" class="text-right"><?php echo xlt('Slots'); ?></th>
                        <th scope="col" class="text-right"><?php echo xlt('Booked'); ?></th>
                        <th scope="col" class="text-right"><?php echo xlt('Free'); ?></th>
                        <th scope="col"><?php echo xlt('Occupancy'); ?></th>
                        <th scope="col"><?php echo xlt('Next free slot'); ?></th>
                    </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </article>
    </section>
</main>
<script src="dsbi_dashboards.js?v=<?php echo attr_url($version); ?>"></script>
</body>
</html>
