import { escapeHtml } from "../js/utils.js";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
const MAX_EDGE = 2400;

async function optimizeImage(file) {
  if (!ACCEPTED_TYPES.has(file.type)) throw new Error(`${file.name}: use JPG, PNG ou WebP.`);
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const needsCompression = file.size > 1_200_000 || scale < 1;
  if (!needsCompression) {
    bitmap.close();
    if (file.size > MAX_UPLOAD_BYTES) throw new Error(`${file.name}: o arquivo ultrapassa 6 MB.`);
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: file.type === "image/png" });
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.88));
  if (!blob) throw new Error(`${file.name}: não foi possível preparar a imagem.`);
  if (blob.size > MAX_UPLOAD_BYTES) throw new Error(`${file.name}: ainda ultrapassa 6 MB após a compressão.`);
  return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
}

const uniquePath = (productId, file) => {
  const safe = file.name.normalize("NFD").replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
  return `${productId}/${crypto.randomUUID()}-${safe}`;
};

export class ProductGalleryEditor {
  constructor({ supabase, root, input, progress, message }) {
    this.supabase = supabase;
    this.root = root;
    this.input = input;
    this.progress = progress;
    this.message = message;
    this.items = [];
    this.deleted = [];
    this.input.addEventListener("change", () => this.addFiles([...this.input.files]));
    this.root.addEventListener("click", (event) => this.handleClick(event));
    this.root.addEventListener("input", (event) => {
      const item = this.find(event.target.closest("[data-gallery-key]")?.dataset.galleryKey);
      if (item && event.target.matches("[data-image-alt]")) item.alt_text = event.target.value;
    });
  }

  reset() {
    this.items.filter((item) => item.previewUrl).forEach((item) => URL.revokeObjectURL(item.previewUrl));
    this.items = [];
    this.deleted = [];
    this.input.value = "";
    this.progress.hidden = true;
    this.message.textContent = "";
    this.render();
  }

  load(product) {
    this.reset();
    const saved = [...(product.product_images || [])].sort((a, b) =>
      Number(b.is_primary) - Number(a.is_primary) || a.position - b.position
    );
    this.items = saved.map((image, index) => ({
      ...image,
      key: image.id,
      kind: "saved",
      is_primary: image.is_primary || (!saved.some((item) => item.is_primary) && index === 0),
    }));
    this.render();
  }

  async addFiles(files) {
    if (!files.length) return;
    this.message.textContent = `Preparando ${files.length} imagem${files.length === 1 ? "" : "s"}…`;
    const results = await Promise.allSettled(files.map(optimizeImage));
    const errors = [];
    results.forEach((result, index) => {
      if (result.status === "rejected") return errors.push(result.reason.message);
      const file = result.value;
      this.items.push({
        key: crypto.randomUUID(),
        kind: "pending",
        file,
        previewUrl: URL.createObjectURL(file),
        alt_text: "",
        is_primary: this.items.length === 0,
      });
    });
    this.input.value = "";
    this.message.textContent = errors.length
      ? `${this.items.length} imagem(ns) pronta(s). ${errors.join(" ")}`
      : `${files.length} imagem${files.length === 1 ? " pronta" : "s prontas"} para salvar.`;
    this.render();
  }

  find(key) { return this.items.find((item) => item.key === key); }

  handleClick(event) {
    const card = event.target.closest("[data-gallery-key]");
    if (!card) return;
    const index = this.items.findIndex((item) => item.key === card.dataset.galleryKey);
    if (index < 0) return;
    if (event.target.closest("[data-set-primary]")) {
      this.items.forEach((item, itemIndex) => { item.is_primary = itemIndex === index; });
    } else if (event.target.closest("[data-move-up]") && index > 0) {
      [this.items[index - 1], this.items[index]] = [this.items[index], this.items[index - 1]];
    } else if (event.target.closest("[data-move-down]") && index < this.items.length - 1) {
      [this.items[index + 1], this.items[index]] = [this.items[index], this.items[index + 1]];
    } else if (event.target.closest("[data-remove-image]")) {
      const [removed] = this.items.splice(index, 1);
      if (removed.kind === "saved") this.deleted.push(removed);
      if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      if (removed.is_primary && this.items[0]) this.items[0].is_primary = true;
    } else return;
    this.render();
  }

  render() {
    this.root.innerHTML = this.items.length ? this.items.map((item, index) => `
      <article class="gallery-card${item.is_primary ? " is-primary" : ""}" data-gallery-key="${item.key}">
        <div class="gallery-card__image">
          <img src="${escapeHtml(item.previewUrl || item.image_url)}" alt="">
          ${item.is_primary ? '<span class="gallery-card__badge">Principal</span>' : ""}
        </div>
        <label>Texto alternativo <input data-image-alt value="${escapeHtml(item.alt_text || "")}" placeholder="Descrição opcional da foto"></label>
        <div class="gallery-card__controls">
          <button type="button" data-set-primary ${item.is_primary ? "disabled" : ""}>Tornar principal</button>
          <button type="button" data-move-up ${index === 0 ? "disabled" : ""} aria-label="Mover imagem para cima">↑</button>
          <button type="button" data-move-down ${index === this.items.length - 1 ? "disabled" : ""} aria-label="Mover imagem para baixo">↓</button>
          <button type="button" class="danger" data-remove-image>Excluir</button>
        </div>
      </article>`).join("") : '<p class="gallery-empty">Nenhuma imagem adicionada. Selecione várias fotos de uma vez.</p>';
  }

  async save(productId, productName) {
    if (this.items.length && !this.items.some((item) => item.is_primary)) this.items[0].is_primary = true;
    const pending = this.items.filter((item) => item.kind === "pending");
    this.progress.hidden = !pending.length;
    this.progress.max = Math.max(1, pending.length);
    this.progress.value = 0;

    let nextPosition = Math.max(-1, ...this.items.filter((item) => item.kind === "saved").map((item) => Number(item.position))) + 1;
    for (const item of pending) {
      const path = uniquePath(productId, item.file);
      const { error: uploadError } = await this.supabase.storage
        .from("product-images")
        .upload(path, item.file, { contentType: item.file.type, upsert: false });
      if (uploadError) throw new Error(`Falha ao enviar ${item.file.name}: ${uploadError.message}`);
      const { data: publicData } = this.supabase.storage.from("product-images").getPublicUrl(path);
      const { data, error } = await this.supabase.from("product_images").insert({
        product_id: productId,
        storage_path: path,
        image_url: publicData.publicUrl,
        alt_text: item.alt_text || productName,
        position: nextPosition++,
        is_primary: false,
      }).select("*").single();
      if (error) {
        await this.supabase.storage.from("product-images").remove([path]);
        throw new Error(`Falha ao registrar ${item.file.name}: ${error.message}`);
      }
      Object.assign(item, data, { key: data.id, kind: "saved" });
      this.progress.value += 1;
    }

    for (const item of this.items) {
      const { error } = await this.supabase.from("product_images")
        .update({ alt_text: item.alt_text || productName })
        .eq("id", item.id);
      if (error) throw new Error(`Falha ao salvar o texto alternativo: ${error.message}`);
    }

    if (this.items.length) {
      const primary = this.items.find((item) => item.is_primary) || this.items[0];
      const { error } = await this.supabase.rpc("reorder_product_images", {
        target_product_id: productId,
        ordered_image_ids: this.items.map((item) => item.id),
        primary_image_id: primary.id,
      });
      if (error) throw new Error(`Falha ao ordenar a galeria: ${error.message}`);
    }

    for (const item of this.deleted) {
      if (item.storage_path) {
        const { error: storageError } = await this.supabase.storage.from("product-images").remove([item.storage_path]);
        if (storageError) throw new Error(`A imagem foi mantida porque o arquivo não pôde ser excluído: ${storageError.message}`);
      }
      const { error } = await this.supabase.from("product_images").delete().eq("id", item.id);
      if (error) throw new Error(`Falha ao excluir a imagem: ${error.message}`);
    }
    this.deleted = [];
    this.progress.hidden = true;
  }
}
