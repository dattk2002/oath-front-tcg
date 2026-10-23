import type { Duplex } from "node:stream";

/** Node releases its HTTP error listener before emitting upgrade. Keep resets contained until ws owns it. */
export function guardUpgradeSocket(socket: Duplex): () => void {
  const failed = () => socket.destroy();
  const release = () => {
    socket.removeListener("error", failed);
    socket.removeListener("close", release);
  };
  socket.on("error", failed);
  socket.once("close", release);
  return release;
}

/** Finish the HTTP rejection and never leave a half-open, unowned upgraded socket. */
export function rejectUpgrade(socket: Duplex, status = 403) {
  if (socket.destroyed) return;
  socket.end(
    `HTTP/1.1 ${status} Rejected\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`,
    () => socket.destroy(),
  );
}
