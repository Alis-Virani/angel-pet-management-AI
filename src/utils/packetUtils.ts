import { OrderItem, Product } from '../types';

export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function parsePositiveInteger(value: string): number | '' {
  const digitsOnly = value.replace(/\D/g, '');
  const normalizedValue = digitsOnly.replace(/^0+(?=\d)/, '');
  return normalizedValue ? Number(normalizedValue) : '';
}

export function getProductUnitsPerPacket(product?: Pick<Product, 'unitsPerPacket'> | null): number | undefined {
  return isPositiveInteger(product?.unitsPerPacket) ? product.unitsPerPacket : undefined;
}

export function calculatePacketUnits(packetCount: number, unitsPerPacket: number): number {
  return packetCount * unitsPerPacket;
}

export function calculatePacketsFromQuantity(quantity: number, unitsPerPacket: number): number {
  if (!quantity || !unitsPerPacket) return 0;
  const count = quantity / unitsPerPacket;
  return Number.isInteger(count) ? count : Number(count.toFixed(2));
}

export function formatPacketBreakdown(quantity: number, unitsPerPacket: number) {
  if (!quantity || !unitsPerPacket) {
    return { packets: 0, fullPackets: 0, remainderUnits: 0, displayText: '0 Packets' };
  }
  const packets = calculatePacketsFromQuantity(quantity, unitsPerPacket);
  const fullPackets = Math.floor(quantity / unitsPerPacket);
  const remainderUnits = quantity % unitsPerPacket;
  const displayText = remainderUnits === 0
    ? `${packets.toLocaleString('en-IN')} ${packets === 1 ? 'Packet' : 'Packets'}`
    : `${packets.toLocaleString('en-IN')} Packets (${fullPackets} pkts + ${remainderUnits} loose pcs)`;

  return { packets, fullPackets, remainderUnits, displayText };
}

export function orderItemSoldByPacket(item: Pick<OrderItem, 'soldByPacket' | 'packetCount' | 'unitsPerPacket'>): boolean {
  return Boolean(
    item.soldByPacket &&
    isPositiveNumber(item.packetCount) &&
    isPositiveInteger(item.unitsPerPacket)
  );
}
