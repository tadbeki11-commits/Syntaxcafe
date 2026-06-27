-- Corrective backfill after 0002. In this POS payment closes an order to
-- status='done', so a 'done' order is paid. 0002 mapped legacy paid/completed
-- orders to status='done' but left payment_status unset (the old desktop
-- tracked paid via status, not payment_status), so the app's paid-helpers —
-- which key off payment_status — counted every 'done' order as still pending.
-- Set payment_status='paid' for done orders that aren't explicitly cancelled.
-- (payment_status lives only in raw_json on the local schema.)

UPDATE orders SET raw_json = json_set(raw_json, '$.payment_status', 'paid')
 WHERE json_valid(raw_json) = 1
   AND lower(coalesce(json_extract(raw_json, '$.status'), '')) = 'done'
   AND lower(coalesce(json_extract(raw_json, '$.payment_status'), ''))
       NOT IN ('paid', 'cancelled');
