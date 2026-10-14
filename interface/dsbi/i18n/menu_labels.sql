--
-- DSBI menu labels in Spanish.
--
-- The main menu translates its labels through xl(), which reads the lang_*
-- tables, so DSBI menu entries need their rows there. Safe to run more than
-- once: it only inserts what is missing.
--
-- Run: docker compose exec -T mysql mariadb -uroot -proot openemr < interface/dsbi/i18n/menu_labels.sql
--

INSERT INTO lang_constants (constant_name)
SELECT t.name FROM (SELECT 'Booking Assistant' AS name) t
WHERE NOT EXISTS (SELECT 1 FROM lang_constants c WHERE BINARY c.constant_name = BINARY t.name);

INSERT INTO lang_definitions (cons_id, lang_id, definition)
SELECT c.cons_id, l.lang_id, t.definition
FROM (SELECT 'Booking Assistant' AS name, 'Asistente de turnos' AS definition) t
JOIN lang_constants c ON BINARY c.constant_name = BINARY t.name
JOIN lang_languages l ON l.lang_description IN ('Spanish (Spain)', 'Spanish (Latin American)')
WHERE NOT EXISTS (SELECT 1 FROM lang_definitions d WHERE d.cons_id = c.cons_id AND d.lang_id = l.lang_id);
