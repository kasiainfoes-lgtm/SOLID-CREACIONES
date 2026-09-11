// Auto-generated from TARIFA_SOLID_MEDIDAS_Y_PESO.xlsx (Solid Creaciones, tarifa vigente desde 20/10/2020).
// Do not edit by hand; regenerate from the source spreadsheet if it changes.

export type CatalogPackageType = {
  code: string;
  internalLengthCm: number;
  internalWidthCm: number;
  internalHeightCm: number;
  externalLengthCm: number;
  externalWidthCm: number;
  externalHeightCm: number;
  maxWeightGrams: number;
  packagingWeightGrams: number;
};

export type CatalogProduct = {
  sku: string;
  name: string;
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  packagingType: string;
};

export const PACKAGE_TYPES: CatalogPackageType[] = [
  { code: "BOX_25X17X16", internalLengthCm: 25.0, internalWidthCm: 17.0, internalHeightCm: 16.0, externalLengthCm: 25.0, externalWidthCm: 17.0, externalHeightCm: 16.0, maxWeightGrams: 2000, packagingWeightGrams: 0 },
  { code: "BOX_30X30X12", internalLengthCm: 30.0, internalWidthCm: 30.0, internalHeightCm: 12.0, externalLengthCm: 30.0, externalWidthCm: 30.0, externalHeightCm: 12.0, maxWeightGrams: 2000, packagingWeightGrams: 0 },
  { code: "BOX_30X30X45", internalLengthCm: 30.0, internalWidthCm: 30.0, internalHeightCm: 45.0, externalLengthCm: 30.0, externalWidthCm: 30.0, externalHeightCm: 45.0, maxWeightGrams: 10000, packagingWeightGrams: 0 },
  { code: "BOX_40X20X20", internalLengthCm: 40.0, internalWidthCm: 20.0, internalHeightCm: 20.0, externalLengthCm: 40.0, externalWidthCm: 20.0, externalHeightCm: 20.0, maxWeightGrams: 3000, packagingWeightGrams: 0 },
  { code: "BOX_40X30X95", internalLengthCm: 40.0, internalWidthCm: 30.0, internalHeightCm: 95.0, externalLengthCm: 40.0, externalWidthCm: 30.0, externalHeightCm: 95.0, maxWeightGrams: 25000, packagingWeightGrams: 0 },
  { code: "BOX_50X20X20", internalLengthCm: 50.0, internalWidthCm: 20.0, internalHeightCm: 20.0, externalLengthCm: 50.0, externalWidthCm: 20.0, externalHeightCm: 20.0, maxWeightGrams: 3000, packagingWeightGrams: 0 },
  { code: "BOX_60X20X20", internalLengthCm: 60.0, internalWidthCm: 20.0, internalHeightCm: 20.0, externalLengthCm: 60.0, externalWidthCm: 20.0, externalHeightCm: 20.0, maxWeightGrams: 3200, packagingWeightGrams: 0 },
  { code: "BOX_60X45X55", internalLengthCm: 60.0, internalWidthCm: 45.0, internalHeightCm: 55.0, externalLengthCm: 60.0, externalWidthCm: 45.0, externalHeightCm: 55.0, maxWeightGrams: 30000, packagingWeightGrams: 0 },
  { code: "BOX_70X70X10", internalLengthCm: 70.0, internalWidthCm: 70.0, internalHeightCm: 10.0, externalLengthCm: 70.0, externalWidthCm: 70.0, externalHeightCm: 10.0, maxWeightGrams: 22000, packagingWeightGrams: 0 },
  { code: "BOX_80X80X10", internalLengthCm: 80.0, internalWidthCm: 80.0, internalHeightCm: 10.0, externalLengthCm: 80.0, externalWidthCm: 80.0, externalHeightCm: 10.0, maxWeightGrams: 23000, packagingWeightGrams: 0 },
  { code: "BOX_90X90X10", internalLengthCm: 90.0, internalWidthCm: 90.0, internalHeightCm: 10.0, externalLengthCm: 90.0, externalWidthCm: 90.0, externalHeightCm: 10.0, maxWeightGrams: 24000, packagingWeightGrams: 0 },
  { code: "BOX_100X100X10", internalLengthCm: 100.0, internalWidthCm: 100.0, internalHeightCm: 10.0, externalLengthCm: 100.0, externalWidthCm: 100.0, externalHeightCm: 10.0, maxWeightGrams: 25000, packagingWeightGrams: 0 },
];

export const PRODUCTS: CatalogProduct[] = [
  { sku: "MPI-01", name: "Percha individual – Lyam", weightGrams: 800, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "MPD-01", name: "Percha doble – Lyam", weightGrams: 800, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "MPM-01", name: "Percha mampara – Lyam", weightGrams: 800, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "MPR-01", name: "Portarollo de papel (derecha) – Lyam", weightGrams: 800, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "MPR-02", name: "Portarollo de papel (izquierda) – Lyam", weightGrams: 800, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "MTP-01", name: "Toallero a pared de 30 – Lyam", weightGrams: 900, lengthCm: 40.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_40X20X20" },
  { sku: "MTP-02", name: "Toallero a pared de 40 – Lyam", weightGrams: 1000, lengthCm: 50.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_50X20X20" },
  { sku: "MTP-03", name: "Toallero a pared de 50 – Lyam", weightGrams: 1000, lengthCm: 60.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_60X20X20" },
  { sku: "MTV-01", name: "Toallero vertical a pared – Lyam", weightGrams: 1200, lengthCm: 50.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_50X20X20" },
  { sku: "MES-01", name: "Escobillero de pie – Lyam", weightGrams: 1800, lengthCm: 50.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_50X20X20" },
  { sku: "MEP-01", name: "Escobillero a pared – Lyam", weightGrams: 1800, lengthCm: 50.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_50X20X20" },
  { sku: "MDJ-01", name: "Dosificador de encimera – Lyam", weightGrams: 800, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "MDJ-02", name: "Dosificador de encimera – Lyam", weightGrams: 800, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "MVS-01", name: "Vaso de encimera – Lyam", weightGrams: 800, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "MVS-02", name: "Vaso de encimera – Lyam", weightGrams: 800, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "MDP-01", name: "Dosificador a pared – Lyam", weightGrams: 800, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "MDP-02", name: "Dosificador a pared – Lyam", weightGrams: 800, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "MVP-01", name: "Vaso a pared – Lyam", weightGrams: 800, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "MVP-02", name: "Vaso a pared – Lyam", weightGrams: 800, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "MER-01", name: "Escobillero de pie, con portarollo integrado – Lyam", weightGrams: 6000, lengthCm: 40.0, widthCm: 30.0, heightCm: 95.0, packagingType: "BOX_40X30X95" },
  { sku: "MTF-01", name: "Toallero doble de pie – Lyam", weightGrams: 6000, lengthCm: 40.0, widthCm: 30.0, heightCm: 95.0, packagingType: "BOX_40X30X95" },
  { sku: "MTT-01", name: "Toallero de pie – Lyam", weightGrams: 6000, lengthCm: 40.0, widthCm: 30.0, heightCm: 95.0, packagingType: "BOX_40X30X95" },
  { sku: "MET-01", name: "Estante – Lyam", weightGrams: 1300, lengthCm: 40.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_40X20X20" },
  { sku: "MET-02", name: "Estante – Lyam", weightGrams: 1700, lengthCm: 50.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_50X20X20" },
  { sku: "MET-03", name: "Estante – Lyam", weightGrams: 2000, lengthCm: 60.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_60X20X20" },
  { sku: "XPI-01", name: "Percha individual – Adhex", weightGrams: 600, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "XPD-01", name: "Percha doble – Adhex", weightGrams: 600, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "XCG-01", name: "Colgador gancho – Adhex", weightGrams: 600, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "XTZ-01", name: "Toallero bidé a pared – Adhex", weightGrams: 800, lengthCm: 40.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_40X20X20" },
  { sku: "XTP-01", name: "Toallero a pared de 32 – Adhex", weightGrams: 900, lengthCm: 40.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_40X20X20" },
  { sku: "XTP-02", name: "Toallero a pared de 45 – Adhex", weightGrams: 1000, lengthCm: 60.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_60X20X20" },
  { sku: "XTC-01", name: "Toallero cerrado a pared de 32 – Adhex", weightGrams: 900, lengthCm: 40.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_40X20X20" },
  { sku: "XTC-02", name: "Toallero cerrado a pared de 45 – Adhex", weightGrams: 1000, lengthCm: 60.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_60X20X20" },
  { sku: "XPR-01", name: "Portarollo de papel (derecha) – Adhex", weightGrams: 700, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "XPR-02", name: "Portarollo de papel (izquierda) – Adhex", weightGrams: 700, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "XBJ-01", name: "Bandeja – Adhex", weightGrams: 900, lengthCm: 40.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_40X20X20" },
  { sku: "XES-01", name: "Escobillero de pie – Adhex", weightGrams: 1500, lengthCm: 50.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_50X20X20" },
  { sku: "XEP-01", name: "Escobillero a pared – Adhex", weightGrams: 1500, lengthCm: 50.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_50X20X20" },
  { sku: "XDJ-02", name: "Dosificador de encimera – Adhex", weightGrams: 800, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "XVS-02", name: "Vaso de encimera – Adhex", weightGrams: 800, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "XDP-02", name: "Dosificador a pared – Adhex", weightGrams: 800, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "XVP-02", name: "Vaso a pared – Adhex", weightGrams: 800, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "SPI-01", name: "Percha individual – Lyss", weightGrams: 600, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "SPD-01", name: "Percha doble – Lyss", weightGrams: 600, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "SPR-01", name: "Portarollo de papel (derecha) – Lyss", weightGrams: 700, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "SPR-02", name: "Portarollo de papel (izquierda) – Lyss", weightGrams: 700, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "STP-01", name: "Toallero a pared de 30 – Lyss", weightGrams: 900, lengthCm: 40.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_40X20X20" },
  { sku: "STP-02", name: "Toallero a pared de 40 – Lyss", weightGrams: 1000, lengthCm: 50.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_50X20X20" },
  { sku: "STP-03", name: "Toallero a pared de 50 – Lyss", weightGrams: 1200, lengthCm: 60.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_60X20X20" },
  { sku: "STV-01", name: "Toallero vertical a pared – Lyss", weightGrams: 1200, lengthCm: 50.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_50X20X20" },
  { sku: "SEP-01", name: "Escobillero a pared – Lyss", weightGrams: 1500, lengthCm: 50.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_50X20X20" },
  { sku: "SDP-01", name: "Dosificador a pared – Lyss", weightGrams: 800, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "SDP-02", name: "Dosificador a pared – Lyss", weightGrams: 800, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "SVP-01", name: "Vaso a pared – Lyss", weightGrams: 800, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "SVP-02", name: "Vaso a pared – Lyss", weightGrams: 800, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "VPI-01", name: "Percha individual – Declive", weightGrams: 600, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "VPR-01", name: "Portarollo de papel (derecha) – Declive", weightGrams: 700, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "VPR-02", name: "Portarollo de papel (izquierda) – Declive", weightGrams: 700, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "VTP-01", name: "Toallero a pared – Declive", weightGrams: 900, lengthCm: 40.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_40X20X20" },
  { sku: "VTP-02", name: "Toallero a pared – Declive", weightGrams: 1000, lengthCm: 60.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_60X20X20" },
  { sku: "VTB-01", name: "Toallero bidé a pared – Declive", weightGrams: 800, lengthCm: 40.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_40X20X20" },
  { sku: "MCD-01", name: "Contenedor de ducha atornillar – Complementos", weightGrams: 2200, lengthCm: 40.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_40X20X20" },
  { sku: "MCD-02", name: "Contenedor de ducha atornillar – Complementos", weightGrams: 2500, lengthCm: 50.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_50X20X20" },
  { sku: "MCD-03", name: "Contenedor de ducha atornillar – Complementos", weightGrams: 3200, lengthCm: 60.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_60X20X20" },
  { sku: "SCD-01", name: "Contenedor de ducha adhesivo – Complementos", weightGrams: 2200, lengthCm: 40.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_40X20X20" },
  { sku: "SCD-02", name: "Contenedor de ducha adhesivo – Complementos", weightGrams: 2500, lengthCm: 50.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_50X20X20" },
  { sku: "SCD-03", name: "Contenedor de ducha adhesivo – Complementos", weightGrams: 3200, lengthCm: 60.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_60X20X20" },
  { sku: "XCD-01", name: "Contenedor de ducha adhesivo – Complementos", weightGrams: 2200, lengthCm: 40.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_40X20X20" },
  { sku: "XCP-01", name: "Contenedor de ducha atornillar – Complementos", weightGrams: 2200, lengthCm: 40.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_40X20X20" },
  { sku: "VCD-01", name: "Contenedor de ducha adhesivo – Complementos", weightGrams: 2200, lengthCm: 40.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_40X20X20" },
  { sku: "VCP-01", name: "Contenedor de ducha atornillar – Complementos", weightGrams: 2200, lengthCm: 40.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_40X20X20" },
  { sku: "XBD-01", name: "Banqueta de ducha moderna – Complementos", weightGrams: 9000, lengthCm: 60.0, widthCm: 45.0, heightCm: 55.0, packagingType: "BOX_60X45X55" },
  { sku: "XTB-01", name: "Banqueta de ducha ligera 01 – Complementos", weightGrams: 8000, lengthCm: 60.0, widthCm: 45.0, heightCm: 55.0, packagingType: "BOX_60X45X55" },
  { sku: "XTB-02", name: "Banqueta de ducha ligera 02 – Complementos", weightGrams: 8000, lengthCm: 60.0, widthCm: 45.0, heightCm: 55.0, packagingType: "BOX_60X45X55" },
  { sku: "MBC-01", name: "Banqueta de ducha cubica – Complementos", weightGrams: 10000, lengthCm: 60.0, widthCm: 45.0, heightCm: 55.0, packagingType: "BOX_60X45X55" },
  { sku: "MBL-01", name: "Banqueta de ducha lineal – Complementos", weightGrams: 9000, lengthCm: 60.0, widthCm: 45.0, heightCm: 55.0, packagingType: "BOX_60X45X55" },
  { sku: "MPT-01", name: "Papeleras con tapa basculante – Complementos", weightGrams: 3700, lengthCm: 30.0, widthCm: 30.0, heightCm: 45.0, packagingType: "BOX_30X30X45" },
  { sku: "MPT-02", name: "Papeleras con tapa basculante – Complementos", weightGrams: 4000, lengthCm: 30.0, widthCm: 30.0, heightCm: 45.0, packagingType: "BOX_30X30X45" },
  { sku: "MPA-01", name: "Papeleras sin tapa – Complementos", weightGrams: 3500, lengthCm: 30.0, widthCm: 30.0, heightCm: 45.0, packagingType: "BOX_30X30X45" },
  { sku: "MPA-02", name: "Papeleras sin tapa – Complementos", weightGrams: 3800, lengthCm: 30.0, widthCm: 30.0, heightCm: 45.0, packagingType: "BOX_30X30X45" },
  { sku: "MBJ-01", name: "Bandeja – Complementos", weightGrams: 900, lengthCm: 30.0, widthCm: 30.0, heightCm: 12.0, packagingType: "BOX_30X30X12" },
  { sku: "MBJ-02", name: "Bandeja – Complementos", weightGrams: 900, lengthCm: 30.0, widthCm: 30.0, heightCm: 12.0, packagingType: "BOX_30X30X12" },
  { sku: "MBJ-03", name: "Bandeja – Complementos", weightGrams: 1000, lengthCm: 30.0, widthCm: 30.0, heightCm: 12.0, packagingType: "BOX_30X30X12" },
  { sku: "MBJ-04", name: "Bandeja – Complementos", weightGrams: 800, lengthCm: 30.0, widthCm: 30.0, heightCm: 12.0, packagingType: "BOX_30X30X12" },
  { sku: "MTK-01", name: "Caja porta-Kleenex – Complementos", weightGrams: 1500, lengthCm: 40.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_40X20X20" },
  { sku: "MCK-01", name: "Conjunto bandeja + caja porta Kleenex – Complementos", weightGrams: 2000, lengthCm: 40.0, widthCm: 20.0, heightCm: 20.0, packagingType: "BOX_40X20X20" },
  { sku: "MSH-01", name: "Pictograma – Complementos", weightGrams: 400, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "MSM-01", name: "Pictograma – Complementos", weightGrams: 400, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "MSV-01", name: "Pictograma – Complementos", weightGrams: 400, lengthCm: 25.0, widthCm: 17.0, heightCm: 16.0, packagingType: "BOX_25X17X16" },
  { sku: "MTR-01", name: "Tarima de ducha – Complementos", weightGrams: 22000, lengthCm: 70.0, widthCm: 70.0, heightCm: 10.0, packagingType: "BOX_70X70X10" },
  { sku: "MTR-02", name: "Tarima de ducha – Complementos", weightGrams: 23000, lengthCm: 80.0, widthCm: 80.0, heightCm: 10.0, packagingType: "BOX_80X80X10" },
  { sku: "MTR-03", name: "Tarima de ducha – Complementos", weightGrams: 24000, lengthCm: 90.0, widthCm: 90.0, heightCm: 10.0, packagingType: "BOX_90X90X10" },
  { sku: "MTR-04", name: "Tarima de ducha – Complementos", weightGrams: 25000, lengthCm: 100.0, widthCm: 100.0, heightCm: 10.0, packagingType: "BOX_100X100X10" },
];
