import { dbCache } from "./dbFactory";
import { stripDots } from "./dbUtils";
import { PackageNotificationDb, PackageNotification } from "../types";
import { dbKeys } from "./dbUtils";

export const notification = dbCache.indexedByKey<PackageNotificationDb, string>(
  {
    rootKey: dbKeys.NOTIFICATION,
    // The `update-available-${dnpName}-${newVersion}` included dots,
    // so for backwards compatibility they must be stripped
    getKey: id => stripDots(id),
    validate: (id, notification) =>
      typeof id === "string" && typeof notification === "object"
  }
);

export function notificationPush(id: string, n: PackageNotification): void {
  notification.set(id, { ...n, timestamp: Date.now(), viewed: false });
}

/**
 * Register the last emitted version for a dnpName
 * Only emit notifications for versions above this one
 */
export const notificationLastEmitVersion = dbCache.indexedByKey<string, string>(
  {
    rootKey: dbKeys.NOTIFICATION_LAST_EMITTED_VERSION,
    getKey: dnpName => stripDots(dnpName),
    validate: (dnpName, lastEmittedVersion) =>
      typeof lastEmittedVersion === "string"
  }
);
