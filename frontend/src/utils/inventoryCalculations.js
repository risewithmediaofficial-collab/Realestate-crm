import { AREA_UNITS } from './constants';

/**
 * Calculates Canonical Total Area in Sq.Ft from extent and unit.
 * Supports standard real estate units & custom regional multipliers.
 */
export const calculateTotalAreaSqFt = (extent, unitId = 'sqft', customSqFtPerUnit = 1) => {
  const numExtent = parseFloat(extent) || 0;
  if (numExtent <= 0) return 0;
  if (unitId === 'custom') {
    const factor = parseFloat(customSqFtPerUnit) || 1;
    return Math.round(numExtent * factor * 100) / 100;
  }
  const found = AREA_UNITS.find(u => u.id === unitId || u.id === unitId?.toLowerCase());
  const factor = found?.factorToSqFt || 1;
  return Math.round(numExtent * factor * 100) / 100;
};

/**
 * Calculates All-Inclusive Total Package Price from Base Rate, Rate Type, Area, and Charges.
 */
export const calculatePackagePrice = ({
  baseRate = 0,
  rateType = 'per_sqft',
  extent = 0,
  unit = 'sqft',
  totalSqFt = 0,
  developmentCharges = 0,
  registrationCharges = 0,
  otherCharges = 0,
  customSqFtPerUnit = 1
}) => {
  const rate = parseFloat(baseRate) || 0;
  const dev = parseFloat(developmentCharges) || 0;
  const reg = parseFloat(registrationCharges) || 0;
  const other = parseFloat(otherCharges) || 0;
  const numExtent = parseFloat(extent) || 0;
  const sqft = parseFloat(totalSqFt) || calculateTotalAreaSqFt(numExtent, unit, customSqFtPerUnit);

  let baseAmount = 0;
  switch (rateType) {
    case 'fixed':
      baseAmount = rate;
      break;
    case 'per_acre': {
      const acres = unit === 'acre' ? numExtent : (sqft / 43560);
      baseAmount = rate * acres;
      break;
    }
    case 'per_guntha': {
      const gunthas = unit === 'guntha' ? numExtent : (sqft / 1089);
      baseAmount = rate * gunthas;
      break;
    }
    case 'per_cent': {
      const cents = unit === 'cent' ? numExtent : (sqft / 435.6);
      baseAmount = rate * cents;
      break;
    }
    case 'per_sqyard': {
      const sqyards = unit === 'sqyard' ? numExtent : (sqft / 9);
      baseAmount = rate * sqyards;
      break;
    }
    case 'per_ground': {
      const grounds = unit === 'ground' ? numExtent : (sqft / 2400);
      baseAmount = rate * grounds;
      break;
    }
    case 'per_bigha': {
      const bighas = unit === 'bigha' ? numExtent : (sqft / 27225);
      baseAmount = rate * bighas;
      break;
    }
    case 'per_sqft':
    default:
      baseAmount = rate * sqft;
      break;
  }

  const grandTotal = Math.round(baseAmount + dev + reg + other);
  return {
    baseAmount: Math.round(baseAmount),
    developmentCharges: dev,
    registrationCharges: reg,
    otherCharges: other,
    totalPackagePrice: grandTotal > 0 ? grandTotal : 0
  };
};

/**
 * Format Currency with Indian numbering system.
 */
export const formatIndianCurrency = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '₹0';
  const val = Number(num);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
};
