import { Client } from "pg";
import { validateWire } from "@oathfront/contracts";
import { listenerDatabaseUrl } from "./config.js";
interface Subscriber {
  matchId: string;
  changed: () => void;
  lost: () => void;
}
interface Connection {
  client: Client;
  ready: Promise<void>;
  active: boolean;
  pending: number;
  subscribers: Set<Subscriber>;
}
/** One dedicated LISTEN connection while this API instance has subscribers. */
export class MatchListener {
  private connection: Connection | undefined;
  private disposed = false;
  private readonly databaseUrl: string;
  constructor(databaseUrl: string) {
    this.databaseUrl = listenerDatabaseUrl(databaseUrl);
  }
  private open(): Connection {
    const client = new Client({
      connectionString: this.databaseUrl,
      connectionTimeoutMillis: 3000,
      statement_timeout: 3000,
      application_name: "oathfront-realtime",
    });
    const connection: Connection = {
      client,
      active: true,
      pending: 0,
      subscribers: new Set(),
      ready: Promise.resolve(),
    };
    this.connection = connection;
    const lost = () => {
      void this.close(connection, true);
    };
    client.on("error", lost);
    client.on("end", lost);
    client.on("notification", (notification) => {
      if (
        !connection.active ||
        notification.channel !== "oathfront_match_changed"
      )
        return;
      try {
        const payload = JSON.parse(notification.payload ?? "");
        if (
          !payload ||
          Object.keys(payload).sort().join() !== "matchId,ownerId,revision" ||
          !validateWire("Uuid", payload.matchId) ||
          !validateWire("Uuid", payload.ownerId) ||
          !Number.isSafeInteger(payload.revision) ||
          payload.revision < 0
        )
          throw Error("Invalid notification");
        for (const subscriber of connection.subscribers)
          if (subscriber.matchId === payload.matchId) subscriber.changed();
      } catch {
        lost();
      }
    });
    connection.ready = (async () => {
      try {
        await client.connect();
        await client.query("LISTEN oathfront_match_changed");
      } catch {
        await this.close(connection, true);
        throw Error("Realtime listener unavailable");
      }
    })();
    return connection;
  }
  async subscribe(
    matchId: string,
    changed: () => void,
    lost: () => void,
  ): Promise<() => void> {
    if (this.disposed) throw Error("Realtime listener disposed");
    const connection = this.connection ?? this.open();
    connection.pending++;
    try {
      await connection.ready;
      if (!connection.active || this.disposed)
        throw Error("Realtime listener unavailable");
      const subscriber = { matchId, changed, lost };
      connection.subscribers.add(subscriber);
      return () => {
        connection.subscribers.delete(subscriber);
        this.releaseIdle(connection);
      };
    } finally {
      connection.pending--;
      this.releaseIdle(connection);
    }
  }
  private releaseIdle(connection: Connection) {
    if (!connection.pending && !connection.subscribers.size)
      void this.close(connection, false);
  }
  private async close(connection: Connection, notify: boolean) {
    if (!connection.active) return;
    connection.active = false;
    if (this.connection === connection) this.connection = undefined;
    if (notify)
      for (const subscriber of connection.subscribers) subscriber.lost();
    connection.subscribers.clear();
    await connection.client.end().catch(() => undefined);
  }
  async dispose() {
    this.disposed = true;
    if (this.connection) await this.close(this.connection, true);
  }
}
