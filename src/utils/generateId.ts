import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a prefixed unique ID matching the contract format.
 * Examples: usr_a1b2c3d4, prod_x8922, ord_SVH8921X
 *
 * @param prefix - The entity prefix (e.g., 'usr', 'prod', 'ord', 'cat', 'ret', 'rev', 'wl', 'ci', 'oi', 'tkt', 'fb', 'pm', 'msg', 'addr', 'sel')
 * @returns A string like "usr_a1b2c3d4"
 */
export function generateId(prefix: string): string {
    const uuid = uuidv4().replace(/-/g, '');
    const shortId = uuid.substring(0, 8);
    return `${prefix}_${shortId}`;
}

/**
 * Generates an order-style ID with uppercase alphanumeric format.
 * Example: ord_SVH8921X
 */
export function generateOrderId(): string {
    const uuid = uuidv4().replace(/-/g, '').substring(0, 6).toUpperCase();
    return `ord_SVH${uuid}`;
}
