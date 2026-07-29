// O catálogo será carregado de data/products.json na etapa 4.
export async function loadProducts() {
  const response = await fetch("data/products.json");
  if (!response.ok) throw new Error("Não foi possível carregar os produtos.");
  return response.json();
}
