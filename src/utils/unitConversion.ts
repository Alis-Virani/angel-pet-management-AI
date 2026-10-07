import { RawMaterial } from '../types';

/**
 * Convert a quantity from any unit to the base unit
 * @param quantity - The quantity to convert
 * @param fromUnit - The unit to convert from
 * @param material - The raw material with conversion configuration
 * @returns The quantity in base units
 */
export function toBaseQuantity(
  quantity: number,
  fromUnit: string | undefined,
  material: RawMaterial
): number {
  if (typeof quantity !== 'number' || isNaN(quantity)) return 0;
  if (!material) return quantity;

  const baseUnit = (material.baseUnit || material.unit || 'kg').toLowerCase();
  const purchaseUnit = (material.purchaseUnit || material.unit || 'kg').toLowerCase();
  const consumptionUnit = (material.consumptionUnit || material.baseUnit || material.unit || 'kg').toLowerCase();
  const from = (fromUnit || baseUnit).toLowerCase();

  // If already in base unit, return as-is
  if (from === baseUnit) {
    return quantity;
  }

  // If converting from purchase unit
  if (from === purchaseUnit) {
    return quantity * (material.conversionFactor || 1);
  }

  // If converting from consumption unit (should be same as base, but handle gracefully)
  if (from === consumptionUnit) {
    return quantity;
  }

  // For legacy materials without conversion configuration, assume same unit
  if (!material.conversionFactor || material.conversionFactor === 0) {
    return quantity;
  }

  // Default: assume no conversion needed
  return quantity;
}

/**
 * Convert a quantity from base unit to another unit
 * @param baseQuantity - The quantity in base units
 * @param toUnit - The unit to convert to
 * @param material - The raw material with conversion configuration
 * @returns The quantity in the target unit
 */
export function fromBaseQuantity(
  baseQuantity: number,
  toUnit: string | undefined,
  material: RawMaterial
): number {
  if (typeof baseQuantity !== 'number' || isNaN(baseQuantity)) return 0;
  if (!material) return baseQuantity;

  const baseUnit = (material.baseUnit || material.unit || 'kg').toLowerCase();
  const purchaseUnit = (material.purchaseUnit || material.unit || 'kg').toLowerCase();
  const consumptionUnit = (material.consumptionUnit || material.baseUnit || material.unit || 'kg').toLowerCase();
  const target = (toUnit || baseUnit).toLowerCase();

  // If converting to base unit, return as-is
  if (target === baseUnit) {
    return baseQuantity;
  }

  // If converting to purchase unit
  if (target === purchaseUnit) {
    if (material.conversionFactor && material.conversionFactor > 0) {
      return baseQuantity / material.conversionFactor;
    }
    return baseQuantity;
  }

  // If converting to consumption unit (should be same as base)
  if (target === consumptionUnit) {
    return baseQuantity;
  }

  // For legacy materials without conversion configuration, assume same unit
  if (!material.conversionFactor || material.conversionFactor === 0) {
    return baseQuantity;
  }

  // Default: assume no conversion needed
  return baseQuantity;
}

/**
 * Get a user-friendly display name for a unit
 * @param unit - The unit string
 * @returns User-friendly unit name
 */
export function getUnitDisplayName(unit: string | undefined | null): string {
  if (!unit || typeof unit !== 'string') return '';
  const unitMap: { [key: string]: string } = {
    'kg': 'kg',
    'g': 'g',
    'pcs': 'pcs',
    'bag': 'Bag',
    'bags': 'Bag',
    'carton': 'Carton',
    'cartons': 'Carton',
    'box': 'Box',
    'boxes': 'Box'
  };

  const lowerUnit = unit.toLowerCase();
  return unitMap[lowerUnit] || unit;
}

/**
 * Format a quantity with unit for display
 * @param quantity - The quantity
 * @param unit - The unit
 * @returns Formatted string (e.g., "5,000 kg")
 */
export function formatQuantityWithUnit(quantity: number | undefined | null, unit: string | undefined | null): string {
  const safeQty = typeof quantity === 'number' && !isNaN(quantity) ? quantity : 0;
  const displayUnit = getUnitDisplayName(unit);
  return `${safeQty.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${displayUnit}`.trim();
}

/**
 * Validate if a consumption quantity is valid and within stock limits
 * @param quantity - The quantity to consume
 * @param unit - The unit of the quantity
 * @param material - The raw material
 * @returns Object with isValid flag and error message if invalid
 */
export function validateConsumption(
  quantity: number,
  unit: string | undefined,
  material: RawMaterial
): { isValid: boolean; error?: string } {
  if (typeof quantity !== 'number' || quantity <= 0 || isNaN(quantity)) {
    return { isValid: false, error: 'Quantity must be greater than 0' };
  }
  if (!material) {
    return { isValid: false, error: 'Material not found' };
  }

  const baseQuantity = toBaseQuantity(quantity, unit, material);
  const currentStock = material.currentStock ?? 0;

  if (baseQuantity > currentStock) {
    const availableBase = currentStock;
    const availableDisplay = formatQuantityWithUnit(availableBase, material.baseUnit || material.unit || 'kg');
    return {
      isValid: false,
      error: `Insufficient stock. Available: ${availableDisplay}`
    };
  }

  return { isValid: true };
}

/**
 * Get the available stock in both base and purchase units
 * @param material - The raw material
 * @returns Object with stock in both units
 */
export function getStockInBothUnits(material: RawMaterial): {
  baseQuantity: number;
  baseUnit: string;
  purchaseQuantity: number;
  purchaseUnit: string;
} {
  const baseQuantity = material?.currentStock ?? 0;
  const baseUnit = material?.baseUnit || material?.unit || 'kg';
  const purchaseUnit = material?.purchaseUnit || material?.unit || baseUnit;
  const purchaseQuantity = fromBaseQuantity(
    baseQuantity,
    purchaseUnit,
    material
  );

  return {
    baseQuantity,
    baseUnit,
    purchaseQuantity,
    purchaseUnit
  };
}

/**
 * Calculate equivalent pieces from base quantity
 * @param baseQuantity - The quantity in base units
 * @param material - The raw material with pieces conversion
 * @returns Equivalent pieces or undefined if no conversion exists
 */
export function calculateEquivalentPieces(baseQuantity: number | undefined | null, material: RawMaterial): number | undefined {
  if (typeof baseQuantity !== 'number' || isNaN(baseQuantity) || !material) return undefined;
  if (material.piecesPerBaseUnit && material.piecesPerBaseUnit > 0) {
    return baseQuantity * material.piecesPerBaseUnit;
  }
  return undefined;
}
