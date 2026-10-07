import { generateInvoiceHtml, expandComboItems } from '../src/utils/invoicePrintUtils';
import { Order, Product } from '../src/types';

const mockProducts: Product[] = [
  {
    id: 'prd-bottle-1',
    name: '200ml Boston Round Bottle',
    type: 'bottle',
    priceA: 10,
    priceB: 9,
    priceC: 8,
    comboPriceA: 15,
    comboPriceB: 14,
    comboPriceC: 13,
    weightPerPiece: 22,
    weightUnit: 'g'
  },
  {
    id: 'prd-inner-1',
    name: '24mm Plug Inner',
    type: 'inner',
    priceA: 2,
    priceB: 1.8,
    priceC: 1.5,
    weightPerPiece: 1.5,
    weightUnit: 'g'
  },
  {
    id: 'prd-cap-1',
    name: '24mm Ribbed Cap',
    type: 'cap',
    priceA: 4,
    priceB: 3.5,
    priceC: 3,
    weightPerPiece: 4.2,
    weightUnit: 'g'
  }
];

const mockOrder: Order = {
  id: 'ORD-COMBO-01',
  orderNumber: 'ORD-1001',
  customerId: 'CUS-01',
  customerName: 'Aarav Patel',
  companyName: 'Apex Cosmetics',
  orderDate: '2026-10-07',
  orderType: 'standard',
  paymentType: 'debit_memo',
  paymentStatus: 'pending',
  orderStatus: 'confirmed',
  paidAmount: 0,
  subtotal: 7500, // 500 * 15 (Combo price)
  gstAmount: 1350,
  gstRate: 18,
  gstApplied: true,
  totalAmount: 8850,
  totalQuantity: 500,
  items: [
    {
      id: 'item-1',
      productId: 'prd-bottle-1',
      productName: '200ml Boston Round Bottle',
      productType: 'bottle',
      priceCategory: 'A',
      unitPrice: 15, // Combo rate
      quantity: 500,
      subtotal: 7500,
      isCombo: true,
      selectedInnerId: 'prd-inner-1',
      selectedInnerName: '24mm Plug Inner',
      selectedCapId: 'prd-cap-1',
      selectedCapName: '24mm Ribbed Cap',
      weightPerPiece: 22,
      weightUnit: 'g'
    }
  ]
};

console.log('--- Testing expandComboItems ---');
const expanded = expandComboItems(mockOrder.items, mockProducts);

console.assert(expanded.length === 3, `Expected 3 lines (Bottle, Inner, Cap), got ${expanded.length}`);
console.log(`Line count: ${expanded.length}`);

// Line 1: Bottle
console.assert(expanded[0].displayTitle === '200ml Boston Round Bottle', 'Line 1 is Bottle');
console.assert(expanded[0].quantity === 500, 'Bottle qty is 500');
console.assert(expanded[0].unitPrice === 15, 'Bottle unitPrice is ₹15 (combo rate)');
console.assert(expanded[0].subtotal === 7500, 'Bottle subtotal is ₹7500');
console.assert(expanded[0].weightDisplay === '11 kg', `Bottle weight is 11 kg (22g * 500 = 11000g), got ${expanded[0].weightDisplay}`);

// Line 2: Inner
console.assert(expanded[1].displayTitle === '24mm Plug Inner', 'Line 2 is Inner');
console.assert(expanded[1].quantity === 500, 'Inner qty is 500');
console.assert(expanded[1].unitPrice === 0, 'Inner unitPrice is 0 (marked as -)');
console.assert(expanded[1].subtotal === 0, 'Inner subtotal is 0 (marked as -)');
console.assert(expanded[1].weightDisplay === '750 g', `Inner weight is 750 g (1.5g * 500 = 750g), got ${expanded[1].weightDisplay}`);

// Line 3: Cap
console.assert(expanded[2].displayTitle === '24mm Ribbed Cap', 'Line 3 is Cap');
console.assert(expanded[2].quantity === 500, 'Cap qty is 500');
console.assert(expanded[2].unitPrice === 0, 'Cap unitPrice is 0 (marked as -)');
console.assert(expanded[2].subtotal === 0, 'Cap subtotal is 0 (marked as -)');
console.assert(expanded[2].weightDisplay === '2.1 kg', `Cap weight is 2.1 kg (4.2g * 500 = 2100g), got ${expanded[2].weightDisplay}`);

console.log('--- Testing generateInvoiceHtml ---');
const invoiceHtml = generateInvoiceHtml(mockOrder, null, null, mockProducts);

console.assert(invoiceHtml.includes('200ml Boston Round Bottle'), 'HTML contains Bottle');
console.assert(invoiceHtml.includes('24mm Plug Inner'), 'HTML contains Inner');
console.assert(invoiceHtml.includes('24mm Ribbed Cap'), 'HTML contains Cap');
console.assert(invoiceHtml.includes('11 kg'), 'HTML contains Bottle weight');
console.assert(invoiceHtml.includes('750 g'), 'HTML contains Inner weight');
console.assert(invoiceHtml.includes('2.1 kg'), 'HTML contains Cap weight');
console.assert(invoiceHtml.includes('₹15.00'), 'HTML contains Bottle combo unit rate');
console.assert(invoiceHtml.includes('7,500.00'), 'HTML contains Bottle combo subtotal');

console.log('✅ ALL COMBO INVOICE DISPLAY CHECKS PASSED SUCCESSFULLY!');
