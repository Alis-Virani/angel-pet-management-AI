import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { Product, ProductType, RawMaterial } from '../../types';
import {
  addFinishedGoodsLog,
  getProducts,
  getRawMaterials,
  recordRawMaterialUsage
} from '../../services/db';
import {
  calculateEquivalentPieces,
  calculatePiecesFromWeight,
  formatQuantityWithUnit,
  getStockInBothUnits,
  toBaseQuantity
} from '../../utils/unitConversion';
import { AlertCircle, Boxes } from 'lucide-react';

interface AddFinishedGoodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStockAdded?: () => void;
}

export const AddFinishedGoodsModal: React.FC<AddFinishedGoodsModalProps> = ({
  isOpen,
  onClose,
  onStockAdded
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [productType, setProductType] = useState<ProductType>('bottle');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [quantityProduced, setQuantityProduced] = useState('');
  const [materialUnit, setMaterialUnit] = useState('');
  const [numberOfBags, setNumberOfBags] = useState('');
  const [weightPerBagKg, setWeightPerBagKg] = useState('');
  const [weightPerPieceGrams, setWeightPerPieceGrams] = useState('');
  const [wastage1, setWastage1] = useState('');
  const [wastage2, setWastage2] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setQuantityProduced('');
      setNumberOfBags('');
      setWeightPerBagKg('');
      setWeightPerPieceGrams('');
      setWastage1('');
      setWastage2('');
      setNotes('');
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [productList, materialList] = await Promise.all([getProducts(), getRawMaterials()]);
      setProducts(productList);
      setMaterials(materialList);

      const filteredProducts = productList.filter((product) => product.type === productType);
      if (filteredProducts.length > 0) setSelectedProductId(filteredProducts[0].id);
      if (materialList.length > 0) {
        setSelectedMaterialId(materialList[0].id);
        setMaterialUnit(materialList[0].consumptionUnit || materialList[0].baseUnit || materialList[0].unit);
      }
    } catch (e) {
      console.error(e);
      setError('Failed to load production materials.');
    }
  };

  const handleTypeChange = (type: ProductType) => {
    setProductType(type);
    const filtered = products.filter((product) => product.type === type);
    setSelectedProductId(filtered[0]?.id || '');
  };

  const handleMaterialChange = (materialId: string) => {
    setSelectedMaterialId(materialId);
    const material = materials.find((item) => item.id === materialId);
    if (material) {
      setMaterialUnit(material.consumptionUnit || material.baseUnit || material.unit);
    }
  };

  const filteredProducts = products.filter((product) => product.type === productType);
  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const selectedMaterial = materials.find((material) => material.id === selectedMaterialId);
  const materialStock = selectedMaterial ? getStockInBothUnits(selectedMaterial) : null;
  const weightCalculation = calculatePiecesFromWeight({
    numberOfBags: Number(numberOfBags) || undefined,
    weightPerBagKg: Number(weightPerBagKg) || undefined,
    weightPerPieceGrams: Number(weightPerPieceGrams) || undefined
  });
  const totalWeightKg = weightCalculation.totalWeightKg || 0;
  const materialQuantityNumber = totalWeightKg;
  const wastage1Number = Number(wastage1) || 0;
  const wastage2Number = Number(wastage2) || 0;
  const totalMaterialQuantity = materialQuantityNumber + wastage1Number + wastage2Number;
  const convertedMaterialQuantity = selectedMaterial && totalMaterialQuantity > 0
    ? toBaseQuantity(totalMaterialQuantity, materialUnit, selectedMaterial)
    : 0;
  const equivalentPieces = selectedMaterial
    ? weightCalculation.isValid && weightCalculation.pieces !== null
      ? (convertedMaterialQuantity / (totalWeightKg || 1)) * weightCalculation.pieces
      : calculateEquivalentPieces(convertedMaterialQuantity, selectedMaterial)
    : undefined;

  const getMaterialUnits = (material: RawMaterial) =>
    Array.from(new Set([material.baseUnit, material.consumptionUnit, material.purchaseUnit].filter(Boolean)));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedProduct) {
      setError('Please select a product.');
      return;
    }
    const parsedQuantity = Number(quantityProduced);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError('Quantity produced must be greater than 0.');
      return;
    }
    if (!selectedMaterial) {
      setError('Please select the raw material used for this production.');
      return;
    }
    if (!Number.isFinite(materialQuantityNumber) || materialQuantityNumber <= 0) {
      setError('Raw-material quantity must be greater than 0.');
      return;
    }
    if (wastage1Number < 0 || wastage2Number < 0) {
      setError('Wastage values cannot be negative.');
      return;
    }
    if (convertedMaterialQuantity > selectedMaterial.currentStock) {
      setError(`Insufficient stock. Available: ${formatQuantityWithUnit(materialStock?.baseQuantity, materialStock?.baseUnit)}.`);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const batch = notes.trim() || `PROD-${date}`;
      await recordRawMaterialUsage({
        materialId: selectedMaterial.id,
        materialName: selectedMaterial.name,
        quantity: materialQuantityNumber,
        unit: materialUnit,
        wastage1: wastage1Number || undefined,
        wastage2: wastage2Number || undefined,
        totalDeduction: totalMaterialQuantity,
        date,
        productionBatch: batch,
        notes: `Consumed for ${selectedProduct.name} production`
      });
      await addFinishedGoodsLog({
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        type: productType,
        quantityProduced: parsedQuantity,
        unit: selectedProduct.unit || 'pcs',
        date,
        source: 'Production',
        notes: notes.trim()
      });

      onStockAdded?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to record production output.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Daily Finished Production Stock"
      subtitle="Add finished goods and deduct the raw material used in the same entry"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Product Type</label>
            <select value={productType} onChange={(e) => handleTypeChange(e.target.value as ProductType)} className="form-select">
              <option value="bottle">Bottles</option>
              <option value="cap">Caps</option>
            </select>
          </div>
          <div>
            <label className="form-label">Select Manufactured Product</label>
            <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className="form-select">
              {filteredProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} (Current Stock: {product.currentStock.toLocaleString()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedProduct && (
          <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 flex justify-between text-xs text-purple-900">
            <span>Product SKU: <strong>{selectedProduct.sku}</strong></span>
            <span>Current Available: <strong>{selectedProduct.currentStock.toLocaleString()} {selectedProduct.unit}</strong></span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Quantity Produced (Units)</label>
            <input type="number" min={1} required placeholder="Enter quantity produced" value={quantityProduced} onChange={(e) => setQuantityProduced(e.target.value)} className="form-input font-bold" />
          </div>
          <div>
            <label className="form-label">Production Date</label>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="form-input" />
          </div>
        </div>

        <div>
          <label className="form-label">Raw Material Used</label>
          <select value={selectedMaterialId} onChange={(e) => handleMaterialChange(e.target.value)} className="form-select">
            {materials.map((material) => (
              <option key={material.id} value={material.id}>
                {material.name} — Stock: {formatQuantityWithUnit(material.currentStock, material.baseUnit || material.unit)}
              </option>
            ))}
          </select>
        </div>

        {selectedMaterial && materialStock && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex justify-between text-xs text-amber-900">
            <span>Supplier: <strong>{selectedMaterial.supplier}</strong></span>
            <span>Available: <strong>{formatQuantityWithUnit(materialStock.baseQuantity, materialStock.baseUnit)}</strong></span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Number of Bags</label>
            <input type="number" min={0.01} step="0.01" required value={numberOfBags} onChange={(e) => setNumberOfBags(e.target.value)} className="form-input font-bold" placeholder="e.g. 8" />
          </div>
          <div>
            <label className="form-label">Weight per Bag (kg)</label>
            <input type="number" min={0.01} step="0.01" required value={weightPerBagKg} onChange={(e) => setWeightPerBagKg(e.target.value)} className="form-input font-bold" placeholder="e.g. 25" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Weight per Piece (grams)</label>
            <input type="number" min={0.01} step="0.01" required value={weightPerPieceGrams} onChange={(e) => setWeightPerPieceGrams(e.target.value)} className="form-input font-bold" placeholder="e.g. 10" />
          </div>
          <div>
            <label className="form-label">Consumption Unit</label>
            <select value={materialUnit} onChange={(e) => setMaterialUnit(e.target.value)} className="form-select">
              {selectedMaterial && getMaterialUnits(selectedMaterial).map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </select>
          </div>
        </div>

        {weightCalculation.isValid && weightCalculation.totalWeightKg !== null && (
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-900 flex flex-wrap gap-4">
            <span>Total weight: <strong>{weightCalculation.totalWeightKg.toLocaleString('en-IN', { maximumFractionDigits: 2 })} kg</strong></span>
            <span>Calculation: <strong>{(weightCalculation.totalWeightKg * 1000).toLocaleString('en-IN')} g ÷ {Number(weightPerPieceGrams).toLocaleString('en-IN')} g</strong></span>
            {weightCalculation.pieces !== null && (
              <span>Equivalent pieces: <strong>{weightCalculation.pieces.toLocaleString('en-IN', { maximumFractionDigits: 2 })} pcs</strong></span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Wastage 1 (Optional)</label>
            <input type="number" min={0} step="0.01" value={wastage1} onChange={(e) => setWastage1(e.target.value)} className="form-input" />
          </div>
          <div>
            <label className="form-label">Wastage 2 (Optional)</label>
            <input type="number" min={0} step="0.01" value={wastage2} onChange={(e) => setWastage2(e.target.value)} className="form-input" />
          </div>
        </div>

        {selectedMaterial && totalMaterialQuantity > 0 && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 flex flex-wrap gap-4">
            <span>Total deduction: <strong>{formatQuantityWithUnit(convertedMaterialQuantity, selectedMaterial.baseUnit)}</strong></span>
            {equivalentPieces !== undefined && equivalentPieces > 0 && (
              <span>Equivalent pieces: <strong>{formatQuantityWithUnit(equivalentPieces, 'pcs')}</strong></span>
            )}
          </div>
        )}

        <div>
          <label className="form-label">Batch Notes (Optional)</label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="form-input" />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary !bg-purple-600 hover:!bg-purple-700">
            <Boxes className="w-4 h-4" />
            <span>{loading ? 'Saving Production...' : 'Record Production Output'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
