import { useMemo } from 'react';

export interface FormattedQuantity {
  totalBase: string;
  detailed: string;
  fractional: string;
}

export const useQuantityFormatter = () => {
  const formatQuantity = useMemo(() => (
    qty: number,
    piecesPerUnit: number,
    purchaseUnit: string,
    baseUnit: string
  ): FormattedQuantity => {
    const pUnit = purchaseUnit || 'unit';
    const bUnit = baseUnit || 'pcs';
    const pRate = Math.max(1, Number(piecesPerUnit || 1));

    if (pRate <= 1) {
      return {
        totalBase: `${qty} ${bUnit}`,
        detailed: `${qty} ${bUnit}`,
        fractional: `${qty} ${bUnit}`
      };
    }

    const wholeUnits = Math.floor(qty / pRate);
    const remaining = qty % pRate;
    const fractional = (qty / pRate).toFixed(2).replace(/\.00$/, '');

    let detailed = '';
    if (wholeUnits > 0 && remaining > 0) {
      detailed = `${wholeUnits} ${pUnit} + ${remaining} ${bUnit}`;
    } else if (wholeUnits > 0) {
      detailed = `${wholeUnits} ${pUnit}`;
    } else {
      detailed = `${remaining} ${bUnit}`;
    }

    return {
      totalBase: `${qty} ${bUnit}`,
      detailed,
      fractional: `${fractional} ${pUnit}`
    };
  }, []);

  return { formatQuantity };
};
