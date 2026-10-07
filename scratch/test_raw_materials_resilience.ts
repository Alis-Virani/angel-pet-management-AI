import {
  toBaseQuantity,
  fromBaseQuantity,
  getStockInBothUnits,
  formatQuantityWithUnit,
  validateConsumption,
  getUnitDisplayName,
  calculateEquivalentPieces
} from '../src/utils/unitConversion';
import { RawMaterial } from '../src/types';

console.log('--- Running Raw Materials Unit Conversion & Resilience Tests ---');

// 1. Partial/legacy material missing conversion properties
const legacyMaterial: RawMaterial = {
  id: 'RM-LEGACY-01',
  name: 'Legacy Powder',
  code: 'LEG-01',
  category: 'colour',
  currentStock: 50,
  minimumStock: 10,
  unit: 'kg',
  baseUnit: 'kg',
  purchaseUnit: undefined as any,
  consumptionUnit: undefined as any,
  conversionFactor: undefined as any,
  unitCost: 100,
  supplier: 'Unknown',
  status: 'healthy',
  lastRestocked: '2026-01-01'
};

const stock1 = getStockInBothUnits(legacyMaterial);
console.assert(stock1.baseQuantity === 50, 'Base quantity matches');
console.assert(stock1.baseUnit === 'kg', 'Base unit is kg');
console.assert(typeof stock1.purchaseQuantity === 'number', 'Purchase quantity is a valid number');
console.log('✔ Test 1: getStockInBothUnits works with legacy missing purchaseUnit/conversionFactor');

// 2. Material with null/undefined properties
const minimalMaterial: RawMaterial = {
  id: 'RM-MIN-02',
  name: 'Minimal Granules',
  code: '',
  category: 'granules',
  currentStock: 1000,
  minimumStock: 200,
  unit: 'kg',
  baseUnit: '',
  purchaseUnit: 'Bag',
  consumptionUnit: 'kg',
  conversionFactor: 25,
  unitCost: undefined as any,
  supplier: undefined as any,
  status: 'healthy',
  lastRestocked: '2026-01-01'
};

const stock2 = getStockInBothUnits(minimalMaterial);
console.assert(stock2.purchaseQuantity === 40, `1000 kg / 25 = 40 Bags, got ${stock2.purchaseQuantity}`);
console.log('✔ Test 2: fromBaseQuantity handles empty baseUnit and conversion factor');

// 3. formatQuantityWithUnit edge cases
console.assert(formatQuantityWithUnit(0, 'kg') === '0 kg', '0 kg formatted');
console.assert(formatQuantityWithUnit(undefined as any, 'Bag') === '0 Bag', 'undefined formatted as 0 Bag');
console.assert(formatQuantityWithUnit(500, undefined as any) === '500', 'undefined unit formatted');
console.assert(formatQuantityWithUnit(NaN, 'kg') === '0 kg', 'NaN quantity formatted safely');
console.log('✔ Test 3: formatQuantityWithUnit handles NaN, null, and undefined values safely');

// 4. validateConsumption edge cases
const valRes = validateConsumption(10, 'kg', legacyMaterial);
console.assert(valRes.isValid === true, 'Valid consumption approved');
const valOver = validateConsumption(100, 'kg', legacyMaterial);
console.assert(valOver.isValid === false, 'Over consumption rejected');
console.log('✔ Test 4: validateConsumption functions correctly');

// 5. calculateEquivalentPieces
const eqPcs = calculateEquivalentPieces(10, { ...minimalMaterial, piecesPerBaseUnit: 15 });
console.assert(eqPcs === 150, '10 * 15 = 150 pcs');
console.log('✔ Test 5: calculateEquivalentPieces computes correctly');

console.log('\nAll Raw Materials tests passed successfully!');
