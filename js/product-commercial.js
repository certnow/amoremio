export const MATERIAL_OPTIONS = ["Aço inoxidável","Aço inoxidável dourado","Aço inoxidável prateado","Prata 925","Semijoia","Bijuteria","Acrílico","Resina","Plástico","Tecido","Outro"];

const fold = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function defaultCare(material) {
  const value = fold(material);
  if (value.includes("aco inoxidavel")) return "Evite contato prolongado com produtos químicos, perfumes e cremes. Após o uso, limpe delicadamente e guarde em local seco.";
  if (value.includes("prata 925")) return "Guarde em local seco e fechado. A prata pode escurecer naturalmente com o tempo e pode ser limpa com produto específico para prata.";
  if (value.includes("semijoia")) return "Evite contato com água, perfumes, cremes e produtos químicos. Após o uso, limpe com pano macio e guarde separadamente.";
  if (value.includes("bijuteria")) return "Evite água, perfumes, cremes e produtos químicos. Guarde a peça separadamente e em local seco para preservar o acabamento.";
  return "Evite contato com produtos químicos, perfumes e cremes. Após o uso, limpe delicadamente e guarde em local seco.";
}

export function publicProductTitle(product) {
  const name = String(product?.name || "").trim();
  if (!product?.auto_material_in_title || !product?.material) return name;
  const material = fold(product.material), normalizedName = fold(name);
  if (material.includes("aco inoxidavel")) {
    if (normalizedName.includes("aco inoxidavel")) return name;
    return `${name.replace(/\s+(dourad[oa]|pratead[oa])$/i, "")} em Aço Inoxidável`;
  }
  if (material === "prata 925") {
    if (normalizedName.includes("prata 925")) return name;
    return `${name.replace(/\s+pratead[oa]$/i, "")} em Prata 925`;
  }
  if (material === "semijoia") {
    if (normalizedName.includes("semijoia")) return name;
    const match = name.match(/\s+(dourad[oa]|pratead[oa])$/i);
    return match ? `${name.slice(0, -match[0].length)} Semijoia${match[0]}` : `${name} Semijoia`;
  }
  return name;
}

export function discountPercent(product) {
  const price = Number(product?.price), promotional = Number(product?.promotional_price);
  if (!(price > 0) || !(promotional >= 0) || promotional >= price) return 0;
  return Math.round(((price - promotional) / price) * 100);
}

export function isSaleProduct(product) {
  return Boolean(product?.active) && Number(product?.stock) > 0 && discountPercent(product) >= 5;
}

export function materialLabel(product) {
  return [product?.material, product?.material_details].filter(Boolean).join(" · ");
}
