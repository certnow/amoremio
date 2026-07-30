import { escapeHtml } from "../js/utils.js";
import { customerTemplate, normalizePhone, parseCSV, productTemplate, toCSV, validateBackup, validateCustomers, validateProducts } from "./backup-utils.js";

const stamp = () => new Date().toISOString().replace(/[:.]/g, "-");
const download = (name, content, type) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const fail = (error) => { throw new Error(error?.message || String(error)); };
const asDate = (value) => value ? new Date(value).toLocaleString("pt-BR") : "";

async function readAll(supabase, table, order = null) {
  const rows = []; const size = 1000;
  for (let from = 0; ; from += size) {
    let query = supabase.from(table).select("*").range(from, from + size - 1);
    if (order) query = query.order(order);
    const { data, error } = await query; if (error) fail(error);
    rows.push(...(data || [])); if (!data || data.length < size) break;
  }
  return rows;
}

async function collect(supabase) {
  const tables = ["store_settings","categories","products","product_images","product_variants","customers","orders","order_items","display_spots"];
  const values = await Promise.all(tables.map((table) => readAll(supabase, table, table === "orders" ? "created_at" : null)));
  return Object.fromEntries(tables.map((table, index) => [table, values[index]]));
}

function customerRows(data) {
  const stats = new Map();
  data.orders.forEach((order) => { const key = order.customer_id; if (!key) return; const current = stats.get(key) || {count:0,total:0,last:null}; current.count += 1; current.total += Number(order.total || 0); if (!current.last || order.created_at > current.last) current.last = order.created_at; stats.set(key,current); });
  return data.customers.map((customer) => { const stat = stats.get(customer.id) || {}; return {id:customer.id,nome:customer.name,telefone:customer.phone,email:customer.email,endereço:customer.address,observações:customer.notes,data_cadastro:customer.created_at,último_pedido:stat.last || "",quantidade_pedidos:stat.count || 0,valor_total_comprado:Number(stat.total || 0).toFixed(2)}; });
}
function productRows(data) {
  const categories = new Map(data.categories.map((row) => [row.id,row.name]));
  return data.products.map((product) => { const images = data.product_images.filter((row) => row.product_id === product.id).sort((a,b) => a.position-b.position); const variants = data.product_variants.filter((row) => row.product_id === product.id); return {id:product.id,nome:product.name,slug:product.slug,categoria:categories.get(product.category_id)||"",descrição:product.description,material:product.material,medidas:product.dimensions,preço:product.price,preço_promocional:product.promotional_price,estoque:product.stock,ativo:product.active,destaque:product.featured,variações:variants.map(({name,value,price_adjustment,stock,image_url,image_id})=>({name,value,price_adjustment,stock,image_url,image_id})),imagens:images.map((image)=>image.storage_path||image.image_url),imagem_principal:(images.find((image)=>image.is_primary)||images[0])?.storage_path||(images.find((image)=>image.is_primary)||images[0])?.image_url||"",data_criação:product.created_at,data_atualização:product.updated_at}; });
}
function orderRows(data) {
  return data.orders.map((order) => { const items = data.order_items.filter((item)=>item.order_id===order.id); return {número_pedido:order.order_number,cliente:order.customer_name,telefone:order.phone,email:order.email,endereço:order.address,produtos:items.map((item)=>item.product_name).join(" | "),variações:items.map((item)=>item.variant||"").join(" | "),quantidades:items.map((item)=>item.quantity).join(" | "),subtotal:order.subtotal,frete:order.shipping,total:order.total,status:order.status,observações:order.notes,data_pedido:order.created_at}; });
}
function categoryRows(data) { return data.categories.map((row)=>({id:row.id,nome:row.name,slug:row.slug,url_imagem:row.image_url,ativa:row.active,data_criação:row.created_at})); }
function stockRows(data) { const products = new Map(data.products.map((row)=>[row.id,row])); return data.product_variants.length ? data.product_variants.map((row)=>({produto_id:row.product_id,produto:products.get(row.product_id)?.name||"",produto_estoque:products.get(row.product_id)?.stock??"",variação_id:row.id,variação:`${row.name}: ${row.value}`,ajuste_preço:row.price_adjustment,estoque_variação:row.stock,imagem:row.image_url||""})) : data.products.map((row)=>({produto_id:row.id,produto:row.name,produto_estoque:row.stock,variação_id:"",variação:"",ajuste_preço:"",estoque_variação:"",imagem:""})); }

async function logOperation(supabase, userId, operation, resource, count, details = {}) {
  const { error } = await supabase.from("data_operations").insert({user_id:userId,operation,resource,record_count:count,details});
  if (error) fail(error);
}

function makeUniqueSlug(base, used) {
  let candidate = base, index = 2;
  while (used.has(candidate)) candidate = `${base}-copia-${index++}`;
  used.add(candidate); return candidate;
}

async function importCustomers(supabase, rows, strategy) {
  const valid = rows.filter((row)=>row.valid).map((row)=>row.data), existing = await readAll(supabase,"customers");
  const byPhone = new Map(existing.map((row)=>[row.normalized_phone,row])); let created=0,updated=0,ignored=0;
  for (const customer of valid) {
    const current = byPhone.get(customer.normalized_phone);
    if (current && strategy === "ignore") { ignored += 1; continue; }
    if (current && strategy === "duplicate") { ignored += 1; continue; }
    if (current) { const {error}=await supabase.from("customers").update({name:customer.name,phone:customer.phone,email:customer.email,address:customer.address,notes:customer.notes}).eq("id",current.id); if(error)fail(error); updated+=1; }
    else { const payload={...customer}; if(!payload.id)delete payload.id; const{data,error}=await supabase.from("customers").insert(payload).select("*").single(); if(error)fail(error); byPhone.set(data.normalized_phone,data); created+=1; }
  }
  return {created,updated,ignored,total:created+updated};
}

async function importProducts(supabase, rows, strategy) {
  const valid=rows.filter((row)=>row.valid).map((row)=>row.data), [existing,categories]=await Promise.all([readAll(supabase,"products"),readAll(supabase,"categories")]);
  const bySlug=new Map(existing.map((row)=>[row.slug,row])), used=new Set(existing.map((row)=>row.slug));
  const categoryMap=new Map(categories.flatMap((row)=>[[row.slug.toLowerCase(),row.id],[row.name.toLowerCase(),row.id]])); let created=0,updated=0,ignored=0;
  for(const source of valid){const current=bySlug.get(source.slug);if(current&&strategy==="ignore"){ignored+=1;continue}let productId=current?.id||null;const slug=current&&strategy==="duplicate"?makeUniqueSlug(source.slug,used):source.slug;const payload={name:source.name,slug,category_id:categoryMap.get(source.category.toLowerCase())||null,description:source.description,material:source.material,dimensions:source.dimensions,price:source.price,promotional_price:source.promotional_price,stock:source.stock,active:source.active,featured:source.featured};if(current&&strategy==="update"){const{error}=await supabase.from("products").update(payload).eq("id",current.id);if(error)fail(error);updated+=1}else{const{data,error}=await supabase.from("products").insert(payload).select("id,slug").single();if(error)fail(error);productId=data.id;bySlug.set(data.slug,data);used.add(data.slug);created+=1}
    const variants=(source.variations||[]).filter((row)=>row&&row.name&&row.value).map((row)=>({product_id:productId,name:String(row.name),value:String(row.value),price_adjustment:Number(row.price_adjustment||0),stock:Number(row.stock||0),image_url:row.image_url||null}));if(variants.length){const{error}=await supabase.from("product_variants").upsert(variants,{onConflict:"product_id,name,value"});if(error)fail(error)}
    const urls=[...new Set([...(source.images||[]),source.primary_image].filter((value)=>/^https?:\/\//i.test(value)))];if(urls.length){const{data:currentImages,error:readError}=await supabase.from("product_images").select("image_url,position,is_primary").eq("product_id",productId);if(readError)fail(readError);const known=new Set((currentImages||[]).map((row)=>row.image_url)),hasPrimary=(currentImages||[]).some((row)=>row.is_primary),start=(currentImages||[]).reduce((max,row)=>Math.max(max,row.position),-1)+1;const images=urls.filter((url)=>!known.has(url)).map((url,index)=>({product_id:productId,image_url:url,alt_text:source.name,position:start+index,is_primary:!hasPrimary&&url===source.primary_image}));if(images.length){if(!hasPrimary&&!images.some((row)=>row.is_primary))images[0].is_primary=true;const{error}=await supabase.from("product_images").insert(images);if(error)fail(error)}}
  }
  return{created,updated,ignored,total:created+updated};
}

async function restoreBackup(supabase, backup, strategy) {
  const categoryMap=new Map(),productMap=new Map(),customerMap=new Map(),orderMap=new Map(),variantMap=new Map();
  const existingCategories=await readAll(supabase,"categories"),usedCategorySlugs=new Set(existingCategories.map((row)=>row.slug));
  for(const row of backup.categories){const current=existingCategories.find((item)=>item.id===row.id||item.slug===row.slug);if(current&&strategy==="ignore"){categoryMap.set(row.id,current.id);continue}const payload={name:row.name,slug:current&&strategy==="duplicate"?makeUniqueSlug(row.slug,usedCategorySlugs):row.slug,image_url:row.image_url||null,active:Boolean(row.active)};if(current&&strategy==="update"){const{error}=await supabase.from("categories").update(payload).eq("id",current.id);if(error)fail(error);categoryMap.set(row.id,current.id)}else{const{data,error}=await supabase.from("categories").insert(payload).select("id").single();if(error)fail(error);categoryMap.set(row.id,data.id)}}
  const productRows=validateProducts(backup.products.map((row)=>({...row,categoria:"",preço:row.price,preço_promocional:row.promotional_price,estoque:row.stock,ativo:row.active,destaque:row.featured})));const existingProducts=await readAll(supabase,"products"),usedProductSlugs=new Set(existingProducts.map((row)=>row.slug));
  for(const checked of productRows.filter((row)=>row.valid)){const row=checked.data,source=backup.products.find((item)=>item.id===row.id),current=existingProducts.find((item)=>item.id===source.id||item.slug===source.slug);if(current&&strategy==="ignore"){productMap.set(source.id,current.id);continue}const payload={name:source.name,slug:current&&strategy==="duplicate"?makeUniqueSlug(source.slug,usedProductSlugs):source.slug,description:source.description||"",material:source.material||null,dimensions:source.dimensions||null,category_id:categoryMap.get(source.category_id)||null,price:Number(source.price),promotional_price:source.promotional_price==null?null:Number(source.promotional_price),stock:Number(source.stock),active:Boolean(source.active),featured:Boolean(source.featured)};if(current&&strategy==="update"){const{error}=await supabase.from("products").update(payload).eq("id",current.id);if(error)fail(error);productMap.set(source.id,current.id)}else{const{data,error}=await supabase.from("products").insert(payload).select("id").single();if(error)fail(error);productMap.set(source.id,data.id)}}
  for(const row of backup.product_images){const productId=productMap.get(row.product_id);if(!productId)continue;const payload={product_id:productId,image_url:row.image_url,storage_path:row.storage_path||null,alt_text:row.alt_text||"",position:row.position,is_primary:Boolean(row.is_primary)};const{error}=await supabase.from("product_images").upsert(payload,{onConflict:"product_id,position"});if(error&&strategy!=="ignore")fail(error)}
  for(const row of backup.product_variants){const productId=productMap.get(row.product_id);if(!productId)continue;const payload={product_id:productId,name:row.name,value:row.value,price_adjustment:Number(row.price_adjustment||0),stock:Number(row.stock||0),image_url:row.image_url||null};const{data,error}=await supabase.from("product_variants").upsert(payload,{onConflict:"product_id,name,value"}).select("id").single();if(error)fail(error);variantMap.set(row.id,data.id)}
  const customerChecks=validateCustomers(backup.customers.map((row)=>({...row,nome:row.name,telefone:row.phone,endereço:row.address,observações:row.notes})));const existingCustomers=await readAll(supabase,"customers");for(const checked of customerChecks.filter((row)=>row.valid)){const row=checked.data,source=backup.customers.find((item)=>item.id===row.id),current=existingCustomers.find((item)=>item.id===source.id||item.normalized_phone===row.normalized_phone);if(current&&strategy!=="duplicate"){if(strategy==="update"){const{error}=await supabase.from("customers").update({name:row.name,phone:row.phone,email:row.email,address:row.address,notes:row.notes}).eq("id",current.id);if(error)fail(error)}customerMap.set(source.id,current.id);continue}if(current){customerMap.set(source.id,current.id);continue}const payload={name:row.name,phone:row.phone,normalized_phone:row.normalized_phone,email:row.email,address:row.address,notes:row.notes};const{data,error}=await supabase.from("customers").insert(payload).select("id").single();if(error)fail(error);customerMap.set(source.id,data.id)}
  for(const row of backup.orders){if(strategy==="ignore"&&row.id)continue;const payload={customer_id:customerMap.get(row.customer_id)||null,customer_name:row.customer_name,phone:row.phone,email:row.email,address:row.address,subtotal:Number(row.subtotal),shipping:Number(row.shipping||0),total:Number(row.total),status:row.status,notes:row.notes||null};const{data,error}=await supabase.from("orders").insert(payload).select("id").single();if(error)fail(error);orderMap.set(row.id,data.id)}
  for(const row of backup.order_items){const orderId=orderMap.get(row.order_id);if(!orderId)continue;const payload={order_id:orderId,product_id:productMap.get(row.product_id)||null,product_variant_id:variantMap.get(row.product_variant_id)||null,product_name:row.product_name,variant:row.variant||null,quantity:Number(row.quantity),unit_price:Number(row.unit_price)};const{error}=await supabase.from("order_items").insert(payload);if(error)fail(error)}
  if(strategy==="update"&&backup.store_settings[0]){const settings={...backup.store_settings[0]};delete settings.updated_at;const{error}=await supabase.from("store_settings").update(settings).eq("id",true);if(error)fail(error)}
  return{created:orderMap.size+productMap.size+customerMap.size,updated:strategy==="update"?1:0,ignored:0,total:orderMap.size+productMap.size+customerMap.size};
}

export function initDataBackups({supabase,user,say}) {
  const panel=document.querySelector('[data-panel="backups"]'),preview=panel.querySelector("[data-import-preview]"),summary=panel.querySelector("[data-preview-summary]"),head=panel.querySelector("[data-preview-head]"),body=panel.querySelector("[data-preview-body]"),strategy=panel.querySelector("[data-import-strategy]"),confirm=panel.querySelector("[data-import-confirm]"),run=panel.querySelector("[data-run-import]");let pending=null;
  const refreshLast=async()=>{const{data,error}=await supabase.from("data_operations").select("created_at,details").eq("operation","export").eq("resource","backup").order("created_at",{ascending:false}).limit(1).maybeSingle();panel.querySelector("[data-last-backup]").textContent=error||!data?"Último backup realizado: nenhum registro.":`Último backup realizado: ${asDate(data.created_at)}`};
  const exportData=async(resource,button)=>{button.disabled=true;say("Preparando arquivo seguro…");try{const data=await collect(supabase),date=stamp();let rows,columns,content,name,type="text/csv;charset=utf-8";if(resource==="customers"){rows=customerRows(data);columns=["id","nome","telefone","email","endereço","observações","data_cadastro","último_pedido","quantidade_pedidos","valor_total_comprado"]}if(resource==="products"){rows=productRows(data);columns=["id","nome","slug","categoria","descrição","material","medidas","preço","preço_promocional","estoque","ativo","destaque","variações","imagens","imagem_principal","data_criação","data_atualização"]}if(resource==="orders"){rows=orderRows(data);columns=["número_pedido","cliente","telefone","email","endereço","produtos","variações","quantidades","subtotal","frete","total","status","observações","data_pedido"]}if(resource==="categories"){rows=categoryRows(data);columns=["id","nome","slug","url_imagem","ativa","data_criação"]}if(resource==="stock"){rows=stockRows(data);columns=["produto_id","produto","produto_estoque","variação_id","variação","ajuste_preço","estoque_variação","imagem"]}if(resource==="backup"){const backup={backup_version:1,exported_at:new Date().toISOString(),store_settings:data.store_settings,categories:data.categories,products:data.products,product_images:data.product_images,product_variants:data.product_variants,customers:data.customers,orders:data.orders,order_items:data.order_items,display_spots:data.display_spots,storage_references:data.product_images.map(({storage_path,image_url})=>({storage_path,image_url})).filter((row)=>row.storage_path||row.image_url)};content=JSON.stringify(backup,null,2);name=`amoremio-backup-${date}.json`;type="application/json;charset=utf-8";rows=[...data.products,...data.customers,...data.orders]}else{content=toCSV(rows,columns);name=`amoremio-${resource}-${date}.csv`}download(name,content,type);await logOperation(supabase,user.id,"export",resource,rows.length,{filename:name});say("Arquivo baixado com sucesso.");if(resource==="backup")refreshLast()}catch(error){say(`Não foi possível exportar: ${error.message}`)}finally{button.disabled=false}};
  panel.querySelectorAll("[data-export]").forEach((button)=>button.addEventListener("click",()=>exportData(button.dataset.export,button)));
  panel.querySelectorAll("[data-template]").forEach((button)=>button.addEventListener("click",()=>{const type=button.dataset.template,rows=type==="customers"?customerTemplate:productTemplate,columns=Object.keys(rows[0]);download(`modelo-${type}.csv`,toCSV(rows,columns),"text/csv;charset=utf-8")}));
  const showPreview=(type,checked,raw)=>{pending={type,checked,raw};preview.classList.remove("hidden");confirm.checked=false;run.disabled=true;const rows=type==="backup"?[{line:"—",data:{tipo:"Backup completo",registros:Object.values(raw).filter(Array.isArray).reduce((sum,list)=>sum+list.length,0)},errors:checked.errors,valid:checked.valid}]:checked;const valid=rows.filter((row)=>row.valid).length;summary.textContent=`${valid} válido(s) e ${rows.length-valid} inválido(s). Somente os válidos poderão ser importados.`;const columns=[...new Set(rows.flatMap((row)=>Object.keys(row.data||{})))].slice(0,6);head.innerHTML=`<tr><th>Linha</th>${columns.map((key)=>`<th>${escapeHtml(key)}</th>`).join("")}<th>Validação</th></tr>`;body.innerHTML=rows.slice(0,50).map((row)=>`<tr class="${row.valid?"":"is-invalid"}"><td>${row.line}</td>${columns.map((key)=>`<td>${escapeHtml(typeof row.data?.[key]==="object"?JSON.stringify(row.data[key]):String(row.data?.[key]??""))}</td>`).join("")}<td>${row.valid?"Válida":escapeHtml(row.errors.join(" "))}</td></tr>`).join("");preview.scrollIntoView({behavior:"smooth",block:"start"})};
  panel.querySelectorAll("[data-import-file]").forEach((input)=>input.addEventListener("change",async()=>{const file=input.files[0];if(!file)return;try{const text=await file.text(),type=input.dataset.importFile;if(type==="backup"){const raw=JSON.parse(text),checked=validateBackup(raw);showPreview(type,checked,raw)}else{const raw=parseCSV(text),checked=type==="customers"?validateCustomers(raw):validateProducts(raw);showPreview(type,checked,raw)}}catch(error){say(`Arquivo inválido: ${error.message}`)}finally{input.value=""}}));
  confirm.addEventListener("change",()=>{const valid=pending?.type==="backup"?pending.checked.valid:pending?.checked.some((row)=>row.valid);run.disabled=!(confirm.checked&&valid)});
  panel.querySelector("[data-cancel-import]").addEventListener("click",()=>{pending=null;preview.classList.add("hidden");confirm.checked=false;run.disabled=true});
  run.addEventListener("click",async()=>{if(!pending||!confirm.checked)return;if(!window.confirm("Confirma a importação definitiva dos registros válidos? Esta ação será registrada."))return;run.disabled=true;say("Importando dados validados…");try{const result=pending.type==="customers"?await importCustomers(supabase,pending.checked,strategy.value):pending.type==="products"?await importProducts(supabase,pending.checked,strategy.value):await restoreBackup(supabase,pending.raw,strategy.value);await logOperation(supabase,user.id,"import",pending.type,result.total,{strategy:strategy.value,...result});say(`Importação concluída: ${result.created} criado(s), ${result.updated} atualizado(s), ${result.ignored} ignorado(s).`);pending=null;preview.classList.add("hidden")}catch(error){say(`Importação interrompida: ${error.message}`)}finally{confirm.checked=false;run.disabled=true}});
  refreshLast();
}
