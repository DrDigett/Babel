ALTER TABLE nodes ADD COLUMN "order" integer NOT NULL DEFAULT 0;

UPDATE nodes SET "order" = sub.rn - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM nodes
) AS sub
WHERE nodes.id = sub.id;
