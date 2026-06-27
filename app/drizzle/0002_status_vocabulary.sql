-- Remap existing local rows to the canonical status vocabulary:
--   orders.status         -> {pending, done, cancelled}
--   orders.payment_status -> {pending, paid, cancelled}  (lives in raw_json)
--   payments.status       -> {paid, cancelled}
-- Both the indexed `status` column and the embedded raw_json copy are updated;
-- reads merge raw_json over the column, so raw_json must be canonical too.

UPDATE orders SET status = CASE lower(coalesce(status, ''))
  WHEN 'paid' THEN 'done'
  WHEN 'completed' THEN 'done'
  WHEN 'complete' THEN 'done'
  WHEN 'served' THEN 'done'
  WHEN 'ready' THEN 'done'
  WHEN 'done' THEN 'done'
  WHEN 'deleted' THEN 'cancelled'
  WHEN 'voided' THEN 'cancelled'
  WHEN 'void' THEN 'cancelled'
  WHEN 'refunded' THEN 'cancelled'
  WHEN 'cancelled' THEN 'cancelled'
  WHEN 'canceled' THEN 'cancelled'
  ELSE 'pending'
END;
--> statement-breakpoint
UPDATE orders SET raw_json = json_set(
  raw_json,
  '$.status',
  CASE lower(coalesce(json_extract(raw_json, '$.status'), ''))
    WHEN 'paid' THEN 'done'
    WHEN 'completed' THEN 'done'
    WHEN 'complete' THEN 'done'
    WHEN 'served' THEN 'done'
    WHEN 'ready' THEN 'done'
    WHEN 'done' THEN 'done'
    WHEN 'deleted' THEN 'cancelled'
    WHEN 'voided' THEN 'cancelled'
    WHEN 'void' THEN 'cancelled'
    WHEN 'refunded' THEN 'cancelled'
    WHEN 'cancelled' THEN 'cancelled'
    WHEN 'canceled' THEN 'cancelled'
    ELSE 'pending'
  END,
  '$.payment_status',
  CASE
    WHEN lower(coalesce(json_extract(raw_json, '$.payment_status'), '')) = 'paid' THEN 'paid'
    WHEN lower(coalesce(json_extract(raw_json, '$.payment_status'), '')) IN
         ('cancelled', 'canceled', 'deleted', 'voided', 'refunded') THEN 'cancelled'
    WHEN coalesce(json_extract(raw_json, '$.payment_status'), '') = ''
         AND lower(coalesce(json_extract(raw_json, '$.status'), '')) = 'paid' THEN 'paid'
    ELSE 'pending'
  END
) WHERE json_valid(raw_json) = 1;
--> statement-breakpoint
UPDATE payments SET status = CASE lower(coalesce(status, ''))
  WHEN 'deleted' THEN 'cancelled'
  WHEN 'voided' THEN 'cancelled'
  WHEN 'void' THEN 'cancelled'
  WHEN 'refunded' THEN 'cancelled'
  WHEN 'cancelled' THEN 'cancelled'
  WHEN 'canceled' THEN 'cancelled'
  ELSE 'paid'
END;
--> statement-breakpoint
UPDATE payments SET raw_json = json_set(
  raw_json,
  '$.status',
  CASE lower(coalesce(json_extract(raw_json, '$.status'), ''))
    WHEN 'deleted' THEN 'cancelled'
    WHEN 'voided' THEN 'cancelled'
    WHEN 'void' THEN 'cancelled'
    WHEN 'refunded' THEN 'cancelled'
    WHEN 'cancelled' THEN 'cancelled'
    WHEN 'canceled' THEN 'cancelled'
    ELSE 'paid'
  END
) WHERE json_valid(raw_json) = 1;
