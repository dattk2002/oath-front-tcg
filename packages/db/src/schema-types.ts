export {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  bigint,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
  check,
  customType,
} from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";
export const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });
