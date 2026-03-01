/**
 * Product Nomenclature — Petroleum products catalog
 * Based on KMGI-QCLP-PO-00-115-V2 Annex 1/4
 */

export const ProductCategory = {
    REFINED: 'refined',
    CRUDE: 'crude',
    CHEMICAL: 'chemical',
};

export const products = [
    // Refined fuels
    { id: 'gasoline', name: 'Gasoline', category: ProductCategory.REFINED, densityRange: [0.700, 0.780] },
    { id: 'gas_oil', name: 'Gas Oil (Diesel)', category: ProductCategory.REFINED, densityRange: [0.820, 0.860] },
    { id: 'jet', name: 'Jet Fuel', category: ProductCategory.REFINED, densityRange: [0.775, 0.840] },

    // Crude & heavy
    { id: 'crude_oil', name: 'Crude Oil', category: ProductCategory.CRUDE, densityRange: [0.800, 0.950] },
    { id: 'srgo_srfo', name: 'SRGO/SRFO', category: ProductCategory.REFINED, densityRange: [0.850, 0.950] },

    // Chemicals & bio
    { id: 'naphtha', name: 'Naphtha', category: ProductCategory.CHEMICAL, densityRange: [0.650, 0.750] },
    { id: 'bioethanol', name: 'Bioethanol', category: ProductCategory.CHEMICAL, densityRange: [0.785, 0.795] },
    { id: 'methanol', name: 'Methanol', category: ProductCategory.CHEMICAL, densityRange: [0.790, 0.793] },
    { id: 'biodiesel', name: 'Biodiesel', category: ProductCategory.CHEMICAL, densityRange: [0.860, 0.900] },
    { id: 'n_hexan', name: 'N-Hexan', category: ProductCategory.CHEMICAL, densityRange: [0.655, 0.665] },
    { id: 'etbe_mtbe', name: 'ETBE/MTBE', category: ProductCategory.CHEMICAL, densityRange: [0.740, 0.760] },
    { id: 'ethylene', name: 'Ethylene', category: ProductCategory.CHEMICAL, densityRange: [0.570, 0.580] },
];

/** Get product by ID */
export function getProduct(id) {
    return products.find(p => p.id === id) || null;
}

/** Get ASTM density correction product type ('refined' or 'crude') */
export function getAstmCategory(productId) {
    const p = getProduct(productId);
    return p?.category === ProductCategory.CRUDE ? 'crude' : 'refined';
}
