const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SKU = /^[A-Za-z0-9._-]{2,80}$/;

export const normalizePhone = (value) => String(value ?? "").replace(/\D/g, "");
export const parseNumber = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
};
export const parseBoolean = (value, fallback = true) => {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "").trim().toLowerCase();
  if (["1", "true", "sim", "yes", "ativo"].includes(text)) return true;
  if (["0", "false", "não", "nao", "no", "inativo"].includes(text)) return false;
  return fallback;
};

export function parseCSV(text) {
  const firstLine = String(text).split(/\r?\n/, 1)[0] || "";
  const delimiter = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ";" : ",";
  const rows = []; let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i], next = text[i + 1];
    if (char === '"' && quoted && next === '"') { field += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field); field = "";
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else field += char;
  }
  row.push(field); if (row.some((value) => value.trim())) rows.push(row);
  if (quoted) throw new Error("O CSV possui aspas não fechadas.");
  if (rows.length < 2) throw new Error("O CSV precisa ter cabeçalho e pelo menos uma linha.");
  const headers = rows.shift().map((value) => value.trim().replace(/^\uFEFF/, ""));
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, (values[index] ?? "").trim()])));
}

const csvCell = (value) => {
  const text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
export function toCSV(rows, columns) {
  const lines = [columns.join(";"), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(";"))];
  return `\uFEFF${lines.join("\r\n")}`;
}

export function validateCustomers(rows) {
  return rows.map((source, index) => {
    const phone = normalizePhone(source.telefone ?? source.phone);
    const email = String(source.email ?? "").trim().toLowerCase();
    const data = {id: source.id || null,name:String(source.nome ?? source.name ?? "").trim(),phone,normalized_phone:phone,email,address:String(source.endereço ?? source.endereco ?? source.address ?? "").trim() || null,notes:String(source.observações ?? source.observacoes ?? source.notes ?? "").trim() || null};
    const errors = [];
    if (data.name.length < 2) errors.push("Nome obrigatório.");
    if (phone.length < 10 || phone.length > 15) errors.push("Telefone deve ter entre 10 e 15 dígitos.");
    if (!EMAIL.test(email)) errors.push("E-mail inválido.");
    return {line:index + 2,data,errors,valid:errors.length === 0};
  });
}

function parseList(value) {
  if (!value) return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; }
  catch { return String(value).split("|").map((item) => item.trim()).filter(Boolean); }
}
export function validateProducts(rows) {
  return rows.map((source, index) => {
    const price = parseNumber(source.preço ?? source.preco ?? source.price);
    const promotionalPrice = parseNumber(source.preço_promocional ?? source.preco_promocional ?? source.promotional_price);
    const stock = parseNumber(source.estoque ?? source.stock);
    const data = {id:source.id || null,name:String(source.nome ?? source.name ?? "").trim(),sku:String(source.sku ?? "").trim().toUpperCase(),slug:String(source.slug ?? "").trim().toLowerCase(),category:String(source.categoria ?? source.category ?? "").trim(),description:String(source.descrição ?? source.descricao ?? source.description ?? ""),material:String(source.material ?? "").trim() || null,material_details:String(source.complemento_material ?? source.material_details ?? "").trim() || null,care_instructions:String(source.cuidados ?? source.care_instructions ?? "").trim() || null,auto_material_in_title:parseBoolean(source.material_no_título ?? source.material_no_titulo ?? source.auto_material_in_title,true),dimensions:String(source.medidas ?? source.dimensions ?? "").trim() || null,price,promotional_price:promotionalPrice,stock,active:parseBoolean(source.ativo ?? source.active,true),featured:parseBoolean(source.destaque ?? source.featured,false),variations:parseList(source.variações ?? source.variacoes ?? source.variations),images:parseList(source.imagens ?? source.images),primary_image:String(source.imagem_principal ?? source.primary_image ?? "").trim() || null};
    const errors = [];
    if (data.name.length < 2) errors.push("Nome obrigatório.");
    if (!SKU.test(data.sku)) errors.push("SKU obrigatório; use letras, números, ponto, hífen ou sublinhado.");
    if (!SLUG.test(data.slug)) errors.push("Slug inválido.");
    if (price == null || price < 0) errors.push("Preço inválido.");
    if (promotionalPrice != null && (promotionalPrice < 0 || promotionalPrice >= price)) errors.push("Preço promocional deve ser menor que o preço.");
    if (!Number.isInteger(stock) || stock < 0) errors.push("Estoque deve ser um inteiro positivo.");
    return {line:index + 2,data,errors,valid:errors.length === 0};
  });
}

export function validateBackup(value) {
  const required = ["store_settings","categories","products","product_images","product_variants","customers","orders","order_items"];
  const errors = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) errors.push("O arquivo não contém um objeto JSON válido.");
  required.forEach((key) => { if (!(key in (value || {})) || !Array.isArray(value[key])) errors.push(`Coleção ausente ou inválida: ${key}.`); });
  return {valid:errors.length === 0,errors,data:value};
}

export const customerTemplate = [{nome:"Maria da Silva",telefone:"5561999999999",email:"maria@exemplo.com",endereço:"Rua Exemplo, 100",observações:"Prefere contato pelo WhatsApp"}];
export const productTemplate = [{nome:"Brinco exemplo",sku:"BRINCO-001",slug:"brinco-exemplo",categoria:"Brincos",descrição:"Descrição do produto",material:"Aço inoxidável",complemento_material:"Acabamento polido",cuidados:"Evite contato prolongado com produtos químicos, perfumes e cremes.",material_no_título:true,medidas:"2 cm",preço:"99,90",preço_promocional:"89,90",estoque:10,ativo:true,destaque:false,variações:'[{"name":"Cor","value":"Dourado","price_adjustment":0,"stock":5}]',imagens:"https://exemplo.com/imagem-1.webp|https://exemplo.com/imagem-2.webp",imagem_principal:"https://exemplo.com/imagem-1.webp"}];
