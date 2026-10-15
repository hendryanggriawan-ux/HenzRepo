import {
  ArrowsLeftRight, Barcode, CashRegister, ChartLineUp, Factory, GearSix, IdentificationCard, Motorcycle,
  Package, Receipt, ShoppingCart, SquaresFour, Toolbox, Truck, UserGear, Users, Vault, WhatsappLogo, Wrench,
} from "@phosphor-icons/react";

const ALL = ["owner", "kasir"];
const OWNER = ["owner"];

export const NAV = [
  {
    group: "Operasional",
    items: [
      { to: "/", label: "Dashboard", icon: SquaresFour, roles: OWNER, end: true, id: "dashboard" },
      { to: "/kasir", label: "Kasir / POS", icon: CashRegister, roles: ALL, id: "kasir" },
      { to: "/penerimaan", label: "Penerimaan Kendaraan", icon: Motorcycle, roles: ALL, id: "penerimaan" },
      { to: "/pembelian", label: "Pembelian Barang", icon: Truck, roles: ALL, id: "pembelian" },
      { to: "/riwayat", label: "Riwayat Transaksi", icon: Receipt, roles: ALL, id: "riwayat" },
      { to: "/tutup-kasir", label: "Tutup Kasir", icon: Vault, roles: ALL, id: "tutup-kasir" },
      { to: "/reminder", label: "Reminder Servis", icon: WhatsappLogo, roles: ALL, id: "reminder" },
    ],
  },
  {
    group: "Master Data",
    items: [
      { to: "/master/barang", label: "Barang & Barcode", icon: Barcode, roles: OWNER, id: "barang" },
      { to: "/master/jasa", label: "Jasa Servis", icon: Wrench, roles: OWNER, id: "jasa" },
      { to: "/master/supplier", label: "Supplier", icon: Factory, roles: OWNER, id: "supplier" },
      { to: "/master/pelanggan", label: "Pelanggan", icon: Users, roles: OWNER, id: "pelanggan" },
      { to: "/master/kendaraan", label: "Kendaraan", icon: Motorcycle, roles: OWNER, id: "kendaraan" },
      { to: "/master/mekanik", label: "Mekanik", icon: UserGear, roles: OWNER, id: "mekanik" },
      { to: "/master/pengguna", label: "Pengguna", icon: IdentificationCard, roles: OWNER, id: "pengguna" },
    ],
  },
  {
    group: "Laporan",
    items: [
      { to: "/laporan/penjualan", label: "Penjualan", icon: ChartLineUp, roles: OWNER, id: "lap-penjualan" },
      { to: "/laporan/pembelian", label: "Pembelian", icon: ShoppingCart, roles: OWNER, id: "lap-pembelian" },
      { to: "/laporan/stok", label: "Stok Barang", icon: Package, roles: OWNER, id: "lap-stok" },
      { to: "/laporan/mekanik", label: "Jasa Mekanik", icon: Toolbox, roles: OWNER, id: "lap-mekanik" },
      { to: "/laporan/mutasi", label: "Mutasi Stok", icon: ArrowsLeftRight, roles: OWNER, id: "lap-mutasi" },
    ],
  },
  {
    group: "Sistem",
    items: [{ to: "/pengaturan", label: "Pengaturan", icon: GearSix, roles: OWNER, id: "pengaturan" }],
  },
];
