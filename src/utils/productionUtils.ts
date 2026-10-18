export function calculateNetProductionQuantity(
  totalQuantity: number,
  wastage1: number,
  wastage2: number
): number {
  return totalQuantity - wastage1 - wastage2;
}
