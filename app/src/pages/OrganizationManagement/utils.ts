export const formatBirr = (v: any) => 
  `${(Number.isFinite(Number(v)) ? Number(v) : 0).toLocaleString()} Birr`;
