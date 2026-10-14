import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { RawMaterial } from '../../types';
import { getRawMaterials, recordRawMaterialUsage } from '../../services/db';
import { toBaseQuantity, validateConsumption, formatQuantityWithUnit, getStockInBothUnits, calculateEquivalentPieces, calculatePiecesFromWeight, WeightToPiecesInput } from '../../utils/unitConversion';
import { Layers, AlertCircle, Package } from 'lucide-react';

interface RecordMaterialUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUsageRecorded?: () => void;
}

export const RecordMaterialUsageModal: React.FC<RecordMaterialUsageModalProps> = ({
  isOpen,
  onClose,
  onUsageRecorded
}) => {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [quantity, setQuantity] = useState<number>(100);
  const [wastage1, setWastage1] = useState<number>(0);
  const [wastage2, setWastage2] = useState<number>(0);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [productionBatch, setProductionBatch] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Weight-to-pieces calculation fields
  const [numberOfBags, setNumberOfBags] = useState<number>(0);
  const [weightPerBagKg, setWeightPerBagKg] = useState<number>(0);
  const [totalWeightKg, setTotalWeightKg] = useState<number>(0);
  const [weightPerPieceGrams, setWeightPerPieceGrams] = useState<number>(0);
  const [useWeightCalculation, setUseWeightCalculation] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadMaterials();
    }
  }, [isOpen]);

  const loadMaterials = async () => {
    try {
      const list = await getRawMaterials();
      setMaterials(list);
      if (list.length > 0) setSelectedMaterialId(list[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  const selectedMaterial = materials.find((m) => m.id === selectedMaterialId);

  // Update selected unit when material changes
  useEffect(() => {
    if (selectedMaterial) {
      setSelectedUnit(selectedMaterial.consumptionUnit || selectedMaterial.baseUnit || 'kg');
    }
  }, [selectedMaterial]);

  // Get available units for selected material
  const getAvailableUnits = (): string[] => {
    if (!selectedMaterial) return [];
    const units = new Set<string>();
    units.add(selectedMaterial.baseUnit);
    units.add(selectedMaterial.consumptionUnit);
    if (selectedMaterial.purchaseUnit !== selectedMaterial.baseUnit) {
      units.add(selectedMaterial.purchaseUnit);
    }
    return Array.from(units);
  };

  // Calculate converted quantity
  const convertedQuantity = selectedMaterial && quantity > 0
    ? toBaseQuantity(quantity, selectedUnit, selectedMaterial)
    : 0;

  // Calculate converted wastage
  const convertedWastage1 = selectedMaterial && wastage1 > 0
    ? toBaseQuantity(wastage1, selectedUnit, selectedMaterial)
    : 0;

  const convertedWastage2 = selectedMaterial && wastage2 > 0
    ? toBaseQuantity(wastage2, selectedUnit, selectedMaterial)
    : 0;

  // Calculate total deduction
  const totalDeduction = convertedQuantity + convertedWastage1 + convertedWastage2;

  // Calculate equivalent pieces for total
  const equivalentPieces = selectedMaterial && totalDeduction > 0
    ? calculateEquivalentPieces(totalDeduction, selectedMaterial)
    : undefined;

  // Get stock in both units for display
  const stockDisplay = selectedMaterial ? getStockInBothUnits(selectedMaterial) : null;

  // Weight-to-pieces calculation
  const weightCalculationResult = useWeightCalculation ? calculatePiecesFromWeight({
    numberOfBags: numberOfBags || undefined,
    weightPerBagKg: weightPerBagKg || undefined,
    totalWeightKg: totalWeightKg || undefined,
    weightPerPieceGrams: weightPerPieceGrams || undefined
  }) : { totalWeightKg: null, pieces: null, isValid: false, error: undefined };

  // Auto-update quantity from weight calculation when valid
  useEffect(() => {
    if (useWeightCalculation && weightCalculationResult.isValid && weightCalculationResult.totalWeightKg !== null) {
      // Convert kg to the selected unit for the quantity field
      if (selectedUnit.toLowerCase() === 'kg') {
        setQuantity(weightCalculationResult.totalWeightKg);
      } else if (selectedUnit.toLowerCase() === 'g') {
        setQuantity(weightCalculationResult.totalWeightKg * 1000);
      }
    }
  }, [weightCalculationResult, useWeightCalculation, selectedUnit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) {
      setError('Please select a raw material.');
      return;
    }
    if (quantity <= 0) {
      setError('Quantity used must be greater than 0.');
      return;
    }
    if (wastage1 < 0 || wastage2 < 0) {
      setError('Wastage values cannot be negative.');
      return;
    }

    // Validate total consumption with unit conversion
    const totalConsumption = quantity + wastage1 + wastage2;
    const validation = validateConsumption(totalConsumption, selectedUnit, selectedMaterial);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid consumption');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await recordRawMaterialUsage({
        materialId: selectedMaterial.id,
        materialName: selectedMaterial.name,
        quantity: Number(quantity),
        unit: selectedUnit,
        wastage1: Number(wastage1) || undefined,
        wastage2: Number(wastage2) || undefined,
        totalDeduction: totalConsumption,
        date,
        productionBatch: productionBatch.trim() || `BATCH-${new Date().toISOString().split('T')[0]}`,
        notes: notes.trim()
      });

      if (onUsageRecorded) onUsageRecorded();
      // Reset form
      setQuantity(100);
      setWastage1(0);
      setWastage2(0);
      setProductionBatch('');
      setNotes('');
      setError('');
      setNumberOfBags(0);
      setWeightPerBagKg(0);
      setTotalWeightKg(0);
      setWeightPerPieceGrams(0);
      setUseWeightCalculation(false);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to record raw material usage.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Raw Material Consumption"
      subtitle="Log factory granules/dye usage for production batches & auto-deduct stock"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="form-label">Select Raw Material</label>
          <select
            value={selectedMaterialId}
            onChange={(e) => setSelectedMaterialId(e.target.value)}
            className="form-select"
          >
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — Current Stock: {m.currentStock.toLocaleString()} {m.unit}
              </option>
            ))}
          </select>
        </div>

        {selectedMaterial && stockDisplay && (
          <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex justify-between text-xs text-slate-700">
            <span>Supplier: <strong>{selectedMaterial.supplier}</strong></span>
            <span>
              Available Stock: <strong>{formatQuantityWithUnit(stockDisplay.baseQuantity, stockDisplay.baseUnit)}</strong>
              {stockDisplay.purchaseUnit !== stockDisplay.baseUnit && (
                <span className="ml-2 text-slate-500">
                  ({formatQuantityWithUnit(stockDisplay.purchaseQuantity, stockDisplay.purchaseUnit)})
                </span>
              )}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Quantity Consumed</label>
            <input
              type="number"
              min={0.01}
              step="0.01"
              required
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              className="form-input font-bold"
            />
          </div>

          <div>
            <label className="form-label">Unit</label>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="form-select"
            >
              {getAvailableUnits().map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Weight-to-Pieces Calculation Section */}
        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-bold text-blue-900 cursor-pointer">
              <input
                type="checkbox"
                checked={useWeightCalculation}
                onChange={(e) => setUseWeightCalculation(e.target.checked)}
                className="w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
              />
              <Package className="w-4 h-4 text-blue-600" />
              <span>Calculate from Weight</span>
            </label>
            <span className="text-[10px] font-medium text-blue-700 bg-white/80 px-2 py-0.5 rounded border border-blue-200">
              Optional
            </span>
          </div>

          {useWeightCalculation && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Number of Bags</label>
                  <input
                    type="number"
                    min={0.01}
                    step="0.01"
                    placeholder="e.g., 50"
                    value={numberOfBags || ''}
                    onChange={(e) => setNumberOfBags(parseFloat(e.target.value) || 0)}
                    className="w-full h-8 px-3 bg-white text-xs font-semibold text-slate-900 rounded-lg border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Weight per Bag (kg)</label>
                  <input
                    type="number"
                    min={0.01}
                    step="0.01"
                    placeholder="e.g., 50"
                    value={weightPerBagKg || ''}
                    onChange={(e) => setWeightPerBagKg(parseFloat(e.target.value) || 0)}
                    className="w-full h-8 px-3 bg-white text-xs font-semibold text-slate-900 rounded-lg border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <span className="font-semibold">OR</span>
                <span>enter total weight directly:</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Total Weight (kg)</label>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  placeholder="e.g., 2500"
                  value={totalWeightKg || ''}
                  onChange={(e) => setTotalWeightKg(parseFloat(e.target.value) || 0)}
                  className="w-full h-8 px-3 bg-white text-xs font-semibold text-slate-900 rounded-lg border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Weight per Piece (grams)</label>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  placeholder="e.g., 10"
                  value={weightPerPieceGrams || ''}
                  onChange={(e) => setWeightPerPieceGrams(parseFloat(e.target.value) || 0)}
                  className="w-full h-8 px-3 bg-white text-xs font-semibold text-slate-900 rounded-lg border border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Calculation Result Display */}
              {weightCalculationResult.isValid && weightCalculationResult.totalWeightKg !== null && (
                <div className="p-3 bg-white rounded-lg border border-blue-200 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">Total Weight:</span>
                    <span className="font-bold text-blue-700">
                      {weightCalculationResult.totalWeightKg.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">Calculated Pieces:</span>
                    <span className="font-bold text-green-700">
                      {weightCalculationResult.pieces !== null 
                        ? weightCalculationResult.pieces.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                        : '—'}
                    </span>
                  </div>
                </div>
              )}

              {!weightCalculationResult.isValid && weightCalculationResult.error && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-700">
                  {weightCalculationResult.error}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Wastage 1 (Optional)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={wastage1}
              onChange={(e) => setWastage1(parseFloat(e.target.value) || 0)}
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">Wastage 2 (Optional)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={wastage2}
              onChange={(e) => setWastage2(parseFloat(e.target.value) || 0)}
              className="form-input"
            />
          </div>
        </div>

        {selectedMaterial && totalDeduction > 0 && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-800">
            <div className="flex flex-wrap gap-4">
              <span>Converted Consumption: <strong>{formatQuantityWithUnit(convertedQuantity, selectedMaterial.baseUnit)}</strong></span>
              {convertedWastage1 > 0 && (
                <span>Wastage 1: <strong>{formatQuantityWithUnit(convertedWastage1, selectedMaterial.baseUnit)}</strong></span>
              )}
              {convertedWastage2 > 0 && (
                <span>Wastage 2: <strong>{formatQuantityWithUnit(convertedWastage2, selectedMaterial.baseUnit)}</strong></span>
              )}
              <span className="ml-auto">Total Deduction: <strong>{formatQuantityWithUnit(totalDeduction, selectedMaterial.baseUnit)}</strong></span>
            </div>
            {equivalentPieces && equivalentPieces > 0 && (
              <div className="mt-2 pt-2 border-t border-amber-200">
                <span>Equivalent Pieces: <strong>{formatQuantityWithUnit(equivalentPieces, 'pcs')}</strong></span>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="form-label">Consumption Date</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="form-input"
          />
        </div>

        <div>
          <label className="form-label">Production Batch / Machine Line</label>
          <input
            type="text"
            value={productionBatch}
            onChange={(e) => setProductionBatch(e.target.value)}
            className="form-input"
          />
        </div>

        <div>
          <label className="form-label">Usage Notes (Optional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary !bg-amber-600 hover:!bg-amber-700"
          >
            <Layers className="w-4 h-4" />
            <span>{loading ? 'Deducting...' : 'Record Consumption'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
