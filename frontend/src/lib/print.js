import JsBarcode from "jsbarcode";
import { METHODS, fmtDate, fmtDateTime, methodLabel, num, rp } from "./format";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function barcodeSvg(code, opts = {}) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  try {
    JsBarcode(svg, code, { format: "CODE128", width: 1.5, height: 40, fontSize: 12, margin: 0, font: "monospace", ...opts });
  } catch {
    return `<div>${esc(code)}</div>`;
  }
  return svg.outerHTML;
}

function css(paper) {
  const wide = paper === "80";
  const fs = wide ? 12 : 10;
  return `@page{size:${wide ? 80 : 58}mm auto;margin:0}*{box-sizing:border-box}html,body{margin:0;background:#fff}
body{width:${wide ? 80 : 58}mm;padding:3mm ${wide ? 4 : 3}mm;font-family:"Courier New",Courier,monospace;font-size:${fs}px;line-height:1.35;color:#000}
.c{text-align:center}.b{font-weight:700}.lg{font-size:${fs + 3}px}.sm{font-size:${fs - 1}px}
.hr{border-top:1px dashed #000;margin:5px 0}.row{display:flex;justify-content:space-between;gap:6px}
.row span:last-child{text-align:right;white-space:nowrap}.it{margin-bottom:2px}.pre{white-space:pre-line}
.label{text-align:center;padding:2mm 0 3mm;border-bottom:1px dashed #000;page-break-inside:avoid;break-inside:avoid}
.label svg{max-width:100%;height:auto}`;
}

export const docHtml = (body, paper, title = "Cetak") =>
  `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css(paper)}</style></head><body>${body}</body></html>`;

export function printHtml(body, paper, title) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(docHtml(body, paper, title));
  doc.close();
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => iframe.remove(), 1500);
  }, 300);
}

const row = (l, r, cls = "") => `<div class="row ${cls}"><span>${l}</span><span>${r}</span></div>`;
const hr = `<div class="hr"></div>`;

const header = (s) =>
  `<div class="c b lg">${esc(s.store_name)}</div>` +
  (s.address ? `<div class="c sm pre">${esc(s.address)}</div>` : "") +
  (s.phone ? `<div class="c sm">Telp: ${esc(s.phone)}</div>` : "") +
  hr;

const partLines = (items) =>
  items
    .map((i) => `<div class="it"><div>${esc(i.name)}</div>${row(`${num(i.qty)} x ${num(i.price)}`, num(i.subtotal ?? i.qty * i.price))}</div>`)
    .join("");

const serviceLines = (services) => services.map((s) => `<div class="it">${row(esc(s.name), num(s.price))}</div>`).join("");

const vehicleBlock = (d) =>
  row("No. Polisi", `<b>${esc(d.plate)}</b>`) +
  (d.vehicle_desc ? row("Kendaraan", esc(d.vehicle_desc)) : "") +
  (d.km ? row("KM", esc(d.km)) : "") +
  row("Mekanik", esc(d.mechanic_name));

export function receiptHtml(sale, s) {
  const isService = sale.type === "service";
  const isCash = sale.payment_method === "tunai";
  return [
    header(s),
    row("No", esc(sale.number)),
    row("Tanggal", esc(fmtDateTime(sale.created_at))),
    row("Kasir", esc(sale.cashier)),
    isService ? vehicleBlock(sale) : "",
    sale.customer_name ? row("Pelanggan", esc(sale.customer_name)) : "",
    hr,
    sale.items.length ? (isService ? `<div class="b">SPAREPART</div>` : "") + partLines(sale.items) : "",
    sale.services.length ? `<div class="b">JASA</div>${serviceLines(sale.services)}` : "",
    hr,
    row("Subtotal", num(sale.subtotal)),
    sale.discount ? row("Diskon", `-${num(sale.discount)}`) : "",
    row("TOTAL", rp(sale.total), "b lg"),
    row(`Bayar (${esc(methodLabel(sale.payment_method))})`, num(sale.paid_amount)),
    isCash ? row("Kembali", num(sale.change)) : "",
    !isCash && sale.payment_ref ? row("No. Ref", esc(sale.payment_ref)) : "",
    sale.next_service_date ? `${hr}<div class="c">Service berikutnya:</div><div class="c b">${esc(fmtDate(sale.next_service_date))}</div>` : "",
    hr,
    `<div class="c pre">${esc(s.receipt_footer)}</div>`,
  ].join("");
}

export function estimateHtml(wo, s) {
  return [
    header(s),
    `<div class="c b">ESTIMASI BIAYA SERVIS</div>`,
    hr,
    row("No. WO", esc(wo.number)),
    row("Tanggal", esc(fmtDateTime(wo.created_at))),
    vehicleBlock(wo),
    row("Pelanggan", esc(wo.customer_name)),
    wo.customer_phone ? row("No. HP", esc(wo.customer_phone)) : "",
    wo.complaint ? `${hr}<div class="b">Keluhan:</div><div class="pre">${esc(wo.complaint)}</div>` : "",
    hr,
    wo.parts.length ? `<div class="b">SPAREPART</div>${partLines(wo.parts)}` : "",
    wo.services.length ? `<div class="b">JASA</div>${serviceLines(wo.services)}` : "",
    hr,
    row("Total Part", num(wo.parts_total)),
    row("Total Jasa", num(wo.services_total)),
    row("ESTIMASI", rp(wo.estimate_total), "b lg"),
    hr,
    `<div class="c sm">Estimasi dapat berubah sesuai temuan saat pengerjaan.</div>`,
    `<div class="row" style="margin-top:12px"><span style="flex:1;text-align:center">Pelanggan<br><br><br>(.........)</span><span style="flex:1;text-align:center">Penerima<br><br><br>(.........)</span></div>`,
  ].join("");
}

export function closingHtml(c, s) {
  const sign = (v) => `${v > 0 ? "+" : ""}${num(v)}`;
  return [
    header(s),
    `<div class="c b">LAPORAN TUTUP KASIR</div>`,
    hr,
    row("No", esc(c.number)),
    row("Kasir", esc(c.user_name)),
    row("Dari", esc(fmtDateTime(c.period_start))),
    row("Sampai", esc(fmtDateTime(c.period_end))),
    hr,
    row("Jumlah Transaksi", num(c.count)),
    row("- Penjualan Part", num(c.part_count)),
    row("- Servis", num(c.service_count)),
    row("Penjualan Part", num(c.parts_total)),
    row("Pendapatan Jasa", num(c.services_total)),
    c.discount ? row("Diskon", `-${num(c.discount)}`) : "",
    row("TOTAL PENJUALAN", rp(c.total), "b"),
    hr,
    `<div class="b">PER METODE BAYAR</div>`,
    METHODS.map((m) => row(m.label, num(c.by_method?.[m.value] || 0))).join(""),
    hr,
    row("Modal Awal", num(c.opening_cash)),
    row("Penjualan Tunai", num(c.cash_sales)),
    row("Kas Seharusnya", num(c.expected_cash), "b"),
    row("Uang Fisik", num(c.counted_cash)),
    row("SELISIH", sign(c.difference), "b lg"),
    c.note ? `${hr}<div class="pre">Catatan: ${esc(c.note)}</div>` : "",
    `<div class="row" style="margin-top:14px"><span style="flex:1;text-align:center">Kasir<br><br><br>(.........)</span><span style="flex:1;text-align:center">Owner<br><br><br>(.........)</span></div>`,
  ].join("");
}

export function labelsHtml(entries, s) {
  return entries
    .flatMap(({ item, copies }) =>
      Array.from({ length: Math.max(0, Number(copies) || 0) }, () =>
        `<div class="label"><div class="sm">${esc(s.store_name)}</div><div class="b">${esc(item.name)}</div>` +
        `${barcodeSvg(item.code, { width: s.paper_width === "80" ? 2 : 1.4, height: 38 })}<div class="b">${rp(item.sell_price)}</div></div>`,
      ),
    )
    .join("");
}
