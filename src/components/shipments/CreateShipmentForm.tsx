'use client';

import React, { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Trash2,
  Calculator,
  Save,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';
import { Member, Shipment } from '@/types/database';
import { createShipment, updateShipment } from '@/app/actions/shipments';
import {
  calculateVolumetricKg,
  calculateCBM,
  formatDateDDMMYYYY,
  formatRupiah,
} from '@/lib/utils';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  INDONESIA_CITIES,
  IndonesiaCity,
} from '@/lib/indonesia-regions';

interface CreateShipmentFormProps {
  members: Member[];
  regions?: IndonesiaCity[];
  initialData?: Shipment;
  tenantPrefix?: string;
}

interface ItemRow {
  package_type: string;
  dim_p: number;
  dim_l: number;
  dim_t: number;
  actual_kg: number;
}

const STANDARD_SERVICES = ['Reguler', 'Express', 'Charter'] as const;
const DEFAULT_ITEMS: ItemRow[] = [
  { package_type: 'Koli', dim_p: 40, dim_l: 30, dim_t: 30, actual_kg: 10 },
];

export function CreateShipmentForm({
  members,
  regions,
  initialData,
  tenantPrefix = 'GT',
}: CreateShipmentFormProps) {
  const router = useRouter();
  const isEdit = Boolean(initialData);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const initialItems: ItemRow[] =
    initialData?.items && initialData.items.length > 0
      ? initialData.items.map((it) => ({
          package_type: it.package_type || 'Koli',
          dim_p: Number(it.dim_p || 0),
          dim_l: Number(it.dim_l || 0),
          dim_t: Number(it.dim_t || 0),
          actual_kg: Number(it.actual_kg || 0),
        }))
      : DEFAULT_ITEMS;

  const [receiptNumber, setReceiptNumber] = useState(
    initialData?.receipt_number || ''
  );
  const [bookingDate, setBookingDate] = useState(
    initialData?.booking_date?.slice(0, 10) || today
  );
  const [pickupDate, setPickupDate] = useState(
    initialData?.pickup_date?.slice(0, 10) ||
      initialData?.booking_date?.slice(0, 10) ||
      today
  );
  const [refNumber, setRefNumber] = useState(initialData?.ref_number || '');
  const [memberId, setMemberId] = useState(initialData?.member_id || '');

  const [senderName, setSenderName] = useState(initialData?.sender_name || '');
  const [senderPhone, setSenderPhone] = useState(
    initialData?.sender_phone || ''
  );
  const [senderAddress, setSenderAddress] = useState(
    initialData?.sender_address || ''
  );

  const [receiverName, setReceiverName] = useState(
    initialData?.receiver_name || ''
  );
  const [receiverPhone, setReceiverPhone] = useState(
    initialData?.receiver_phone || ''
  );
  const [receiverAddress, setReceiverAddress] = useState(
    initialData?.receiver_address || ''
  );

  const [originCity, setOriginCity] = useState(
    initialData?.origin_city || 'Surabaya'
  );
  const [destinationCity, setDestinationCity] = useState(
    initialData?.destination_city || 'Makassar'
  );
  const [deliveryProvince, setDeliveryProvince] = useState(
    initialData?.delivery_province ||
      (initialData ? '' : 'Sulawesi Selatan')
  );
  const [serviceType, setServiceType] = useState(
    initialData?.service_type || 'Reguler'
  );
  const [transportVia, setTransportVia] = useState(
    initialData?.transport_via || 'Laut'
  );

  const [goodsDescription, setGoodsDescription] = useState(
    initialData?.goods_description || 'General Cargo'
  );
  const [handlingInstructions, setHandlingInstructions] = useState(
    initialData?.handling_instructions || ''
  );

  const [chargeableType, setChargeableType] = useState<
    'Weight' | 'Volume' | 'Flat'
  >(initialData?.chargeable_type || 'Weight');
  const [ratePerUnit, setRatePerUnit] = useState<number>(
    Number(initialData?.rate_per_unit ?? 3500)
  );
  const [shippingCost, setShippingCost] = useState<number>(
    Number(initialData?.shipping_cost ?? 0)
  );
  const [packingCost, setPackingCost] = useState<number>(
    Number(initialData?.packing_cost ?? 0)
  );
  const [hasInsurance, setHasInsurance] = useState<'Tidak' | 'Ya'>(
    Number(initialData?.insurance_cost ?? 0) > 0 ? 'Ya' : 'Tidak'
  );
  const [insuranceCost, setInsuranceCost] = useState<number>(
    Number(initialData?.insurance_cost ?? 0)
  );
  const [otherCost, setOtherCost] = useState<number>(
    Number(initialData?.other_cost ?? 0)
  );

  const [paymentType, setPaymentType] = useState<'Cash' | 'COD' | 'Invoice'>(
    initialData?.payment_type || 'Invoice'
  );
  const [paymentStatus, setPaymentStatus] = useState<'Unpaid' | 'Paid'>(
    initialData?.payment_status || 'Unpaid'
  );

  const [items, setItems] = useState<ItemRow[]>(initialItems);
  const [quickKoliCount, setQuickKoliCount] = useState<number>(
    initialItems.length
  );
  const [showAllItems, setShowAllItems] = useState(false);
  const [autoCalculate, setAutoCalculate] = useState(!isEdit);

  const memberOptions = useMemo(
    () =>
      members.map((m) => ({
        value: m.id,
        label: m.name,
        subLabel: `TOP: ${m.payment_term_days} hr${m.phone ? ` • ${m.phone}` : ''}`,
      })),
    [members]
  );

  const regionList = regions && regions.length > 0 ? regions : INDONESIA_CITIES;

  const cityOptions = useMemo(
    () =>
      regionList.map((c) => ({
        value: c.city,
        label: c.city,
        subLabel: c.province,
      })),
    [regionList]
  );

  const findRegionProvince = (cityName: string): string | null => {
    const target = cityName.trim().toLowerCase();
    const match = regionList.find((c) => c.city.toLowerCase() === target);
    return match ? match.province : null;
  };

  const handleReset = () => {
    setErrorMsg(null);
    setReceiptNumber(initialData?.receipt_number || '');
    setBookingDate(initialData?.booking_date?.slice(0, 10) || today);
    setPickupDate(
      initialData?.pickup_date?.slice(0, 10) ||
        initialData?.booking_date?.slice(0, 10) ||
        today
    );
    setRefNumber(initialData?.ref_number || '');
    setMemberId(initialData?.member_id || '');
    setSenderName(initialData?.sender_name || '');
    setSenderPhone(initialData?.sender_phone || '');
    setSenderAddress(initialData?.sender_address || '');
    setReceiverName(initialData?.receiver_name || '');
    setReceiverPhone(initialData?.receiver_phone || '');
    setReceiverAddress(initialData?.receiver_address || '');
    setOriginCity(initialData?.origin_city || 'Surabaya');
    setDestinationCity(initialData?.destination_city || 'Makassar');
    setDeliveryProvince(
      initialData?.delivery_province || (initialData ? '' : 'Sulawesi Selatan')
    );
    setServiceType(initialData?.service_type || 'Reguler');
    setTransportVia(initialData?.transport_via || 'Laut');
    setGoodsDescription(initialData?.goods_description || 'General Cargo');
    setHandlingInstructions(initialData?.handling_instructions || '');
    setChargeableType(initialData?.chargeable_type || 'Weight');
    setRatePerUnit(Number(initialData?.rate_per_unit ?? 3500));
    setShippingCost(Number(initialData?.shipping_cost ?? 0));
    setPackingCost(Number(initialData?.packing_cost ?? 0));
    const ins = Number(initialData?.insurance_cost ?? 0);
    setHasInsurance(ins > 0 ? 'Ya' : 'Tidak');
    setInsuranceCost(ins);
    setOtherCost(Number(initialData?.other_cost ?? 0));
    setPaymentType(initialData?.payment_type || 'Invoice');
    setPaymentStatus(initialData?.payment_status || 'Unpaid');
    setItems(initialItems);
    setQuickKoliCount(initialItems.length);
    setShowAllItems(false);
    setAutoCalculate(!isEdit);
  };

  const handleMemberChange = (id: string) => {
    setMemberId(id);
    const selected = members.find((m) => m.id === id);
    if (selected) {
      setSenderName(selected.name);
      if (selected.phone) setSenderPhone(selected.phone);
      if (selected.address) setSenderAddress(selected.address);
      setPaymentType('Invoice');
      setPaymentStatus('Unpaid');
    }
  };

  const applyQuickKoliCount = () => {
    const target = Math.max(1, Math.min(2000, Math.round(quickKoliCount || 1)));
    setQuickKoliCount(target);
    if (target === items.length) return;

    if (target < items.length) {
      setItems(items.slice(0, target));
      return;
    }

    const template = items[0] || {
      package_type: 'Koli',
      dim_p: 0,
      dim_l: 0,
      dim_t: 0,
      actual_kg: 0,
    };
    const extra: ItemRow[] = Array.from(
      { length: target - items.length },
      () => ({ ...template })
    );
    setItems([...items, ...extra]);
  };

  const cloneFirstItemToAll = () => {
    if (items.length <= 1) return;
    const first = items[0];
    setItems(items.map(() => ({ ...first })));
  };

  const addItemRow = () => {
    const next = [
      ...items,
      { package_type: 'Koli', dim_p: 0, dim_l: 0, dim_t: 0, actual_kg: 0 },
    ];
    setItems(next);
    setQuickKoliCount(next.length);
  };

  const removeItemRow = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    setItems(next);
    setQuickKoliCount(next.length);
  };

  const clearAllItems = () => {
    setItems([]);
    setQuickKoliCount(0);
    setShowAllItems(false);
  };

  const updateItemRow = (
    index: number,
    field: keyof ItemRow,
    value: string | number
  ) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const totalActualKg = items.reduce(
    (sum, it) => sum + Number(it.actual_kg || 0),
    0
  );
  const totalVolumetricKg = items.reduce(
    (sum, it) =>
      sum +
      calculateVolumetricKg(
        Number(it.dim_p),
        Number(it.dim_l),
        Number(it.dim_t)
      ),
    0
  );
  const totalCBM = items.reduce(
    (sum, it) =>
      sum + calculateCBM(Number(it.dim_p), Number(it.dim_l), Number(it.dim_t)),
    0
  );

  const chargeableWeight = Math.max(totalActualKg, totalVolumetricKg);

  const suggestedShipping = useMemo(() => {
    if (chargeableType === 'Weight') {
      const units = Math.ceil(chargeableWeight);
      return {
        cost: units * ratePerUnit,
        formula: `${units} Kg × ${formatRupiah(ratePerUnit)}`,
      };
    }
    if (chargeableType === 'Volume') {
      const units = Number(totalCBM.toFixed(2));
      return {
        cost: Math.round(units * ratePerUnit),
        formula: `${units} CBM × ${formatRupiah(ratePerUnit)}`,
      };
    }
    return {
      cost: items.length * ratePerUnit,
      formula: `${items.length} Koli × ${formatRupiah(ratePerUnit)}`,
    };
  }, [chargeableType, chargeableWeight, totalCBM, items.length, ratePerUnit]);

  useEffect(() => {
    if (autoCalculate) {
      setShippingCost(suggestedShipping.cost);
    }
  }, [autoCalculate, suggestedShipping.cost]);

  const applySuggestedCost = () => {
    setAutoCalculate(true);
    setShippingCost(suggestedShipping.cost);
  };

  const effectiveInsuranceCost =
    hasInsurance === 'Ya' ? Number(insuranceCost || 0) : 0;

  const totalBill =
    Number(shippingCost || 0) +
    Number(packingCost || 0) +
    effectiveInsuranceCost +
    Number(otherCost || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!senderName.trim()) {
      setErrorMsg('Nama pengirim wajib diisi');
      return;
    }
    if (!receiverName.trim()) {
      setErrorMsg('Nama penerima wajib diisi');
      return;
    }
    if (!destinationCity.trim()) {
      setErrorMsg('Kota tujuan pengiriman wajib diisi');
      return;
    }

    const payload = {
      receipt_number: receiptNumber.trim() || undefined,
      member_id: memberId || null,
      booking_date: bookingDate,
      pickup_date: pickupDate || bookingDate,
      ref_number: refNumber.trim() || undefined,

      sender_name: senderName.trim(),
      sender_phone: senderPhone.trim() || undefined,
      sender_address: senderAddress.trim() || undefined,

      receiver_name: receiverName.trim(),
      receiver_phone: receiverPhone.trim() || undefined,
      receiver_address: receiverAddress.trim() || undefined,

      origin_city: originCity.trim(),
      destination_city: destinationCity.trim(),
      delivery_province: deliveryProvince.trim() || undefined,
      service_type: serviceType,
      transport_via: transportVia,

      goods_description: goodsDescription.trim(),
      handling_instructions: handlingInstructions.trim() || undefined,

      chargeable_type: chargeableType,
      rate_per_unit: Number(ratePerUnit || 0),
      shipping_cost: Number(shippingCost || 0),
      packing_cost: Number(packingCost || 0),
      insurance_cost: effectiveInsuranceCost,
      other_cost: Number(otherCost || 0),

      payment_type: paymentType,
      payment_status: paymentStatus,

      items: items.map((it) => ({
        package_type: it.package_type,
        dim_p: Number(it.dim_p || 0),
        dim_l: Number(it.dim_l || 0),
        dim_t: Number(it.dim_t || 0),
        actual_kg: Number(it.actual_kg || 0),
      })),
    };

    startTransition(async () => {
      try {
        if (isEdit && initialData) {
          await updateShipment(initialData.id, payload);
          router.push(`/shipments/${initialData.id}`);
        } else {
          const created = await createShipment(payload);
          router.push(`/shipments/${created.id}`);
        }
        router.refresh();
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan STT');
      }
    });
  };

  const inputCls =
    'w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand transition-colors';

  const hasLegacyService =
    Boolean(serviceType) &&
    !STANDARD_SERVICES.includes(
      serviceType as (typeof STANDARD_SERVICES)[number]
    );

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-xs">
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Top Action Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href={isEdit && initialData ? `/shipments/${initialData.id}` : '/shipments'}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-700 border border-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="font-bold text-sm text-gray-900">
              {isEdit && initialData
                ? `Edit Resi STT #${initialData.receipt_number}`
                : 'Form Input STT / Resi Operasional'}
            </div>
            <div className="text-[11px] text-slate-500">
              Isi data booking, pickup, pengirim, penerima, rincian koli, dan tarif ekspedisi.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-700 border border-slate-200 font-semibold transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-1.5 px-5 h-9 rounded-xl bg-brand font-bold transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>
              {isPending
                ? 'Menyimpan...'
                : isEdit
                ? 'Update Resi STT'
                : 'Simpan Resi STT'}
            </span>
          </button>
        </div>
      </div>

      {/* Section 1 */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
        <div className="font-bold text-brand uppercase tracking-wider text-xs pb-2 border-b border-slate-100">
          1. Identitas Dokumen & Member Langganan
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              No. Resi / STT
            </label>
            <input
              type="text"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              placeholder={`Auto: ${tenantPrefix}-0001-${formatDateDDMMYYYY(bookingDate)}`}
              className={`${inputCls} font-mono`}
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Tanggal Booking *
            </label>
            <input
              type="date"
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              className={inputCls}
              required
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Tanggal Pickup *
            </label>
            <input
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              className={inputCls}
              required
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              REF / No. Surat Jalan
            </label>
            <input
              type="text"
              value={refNumber}
              onChange={(e) => setRefNumber(e.target.value)}
              placeholder="Contoh: SJ-2026/04/102"
              className={`${inputCls} font-mono`}
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Member Corporate / Shipper
            </label>
            <SearchableSelect
              options={memberOptions}
              value={memberId}
              onChange={handleMemberChange}
              placeholder="-- Pilih Member / Non-Member --"
              searchPlaceholder="Cari nama atau telp member..."
              emptyOptionLabel="-- Non-Member (Umum / Tunai) --"
            />
          </div>
        </div>
      </div>

      {/* Section 2 & 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-sm">
          <div className="font-bold text-gray-900 uppercase tracking-wider text-xs pb-2 border-b border-slate-100">
            2. Pihak Pengirim (Shipper)
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Pelanggan / Pengirim *
            </label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Nama Toko / Pabrik / Perorangan"
              className={inputCls}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Telpon Pengirim
              </label>
              <input
                type="text"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                placeholder="6281xxxx"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Kota Asal *
              </label>
              <SearchableSelect
                options={cityOptions}
                value={originCity}
                onChange={setOriginCity}
                placeholder="Pilih Kota Asal"
                searchPlaceholder="Cari kota/kabupaten asal..."
                allowCustom
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Origin / Alamat Lengkap Pengirim
            </label>
            <textarea
              rows={2}
              value={senderAddress}
              onChange={(e) => setSenderAddress(e.target.value)}
              placeholder="Alamat asal penjemputan / gudang..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 focus:outline-none focus:bg-white focus:border-brand"
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3 shadow-sm">
          <div className="font-bold text-gray-900 uppercase tracking-wider text-xs pb-2 border-b border-slate-100">
            3. Pihak Penerima (Consignee)
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Penerima *
            </label>
            <input
              type="text"
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              placeholder="Nama Toko Tujuan / Penerima"
              className={inputCls}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Telpon Penerima
              </label>
              <input
                type="text"
                value={receiverPhone}
                onChange={(e) => setReceiverPhone(e.target.value)}
                placeholder="6281xxxx"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Kota Tujuan *
              </label>
              <SearchableSelect
                options={cityOptions}
                value={destinationCity}
                onChange={(nextCity) => {
                  setDestinationCity(nextCity);
                  const prov = findRegionProvince(nextCity);
                  if (prov) setDeliveryProvince(prov);
                }}
                placeholder="Pilih Kota Tujuan"
                searchPlaceholder="Cari kota/kabupaten tujuan..."
                allowCustom
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Delivery Province
              </label>
              <input
                type="text"
                value={deliveryProvince}
                onChange={(e) => setDeliveryProvince(e.target.value)}
                placeholder="Sulawesi Selatan..."
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Destination / Alamat Lengkap Penerima
            </label>
            <textarea
              rows={2}
              value={receiverAddress}
              onChange={(e) => setReceiverAddress(e.target.value)}
              placeholder="Alamat lengkap penerima di kota tujuan..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 focus:outline-none focus:bg-white focus:border-brand"
            />
          </div>
        </div>
      </div>

      {/* Section 4 */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
        <div className="font-bold text-gray-900 uppercase tracking-wider text-xs pb-2 border-b border-slate-100">
          4. Layanan, Moda & Keterangan Barang
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Layanan *
            </label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className={inputCls}
              required
            >
              {hasLegacyService && (
                <option value={serviceType}>{serviceType}</option>
              )}
              <option value="Reguler">Reguler</option>
              <option value="Express">Express</option>
              <option value="Charter">Charter</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Via (Moda Transport) *
            </label>
            <select
              value={transportVia}
              onChange={(e) => setTransportVia(e.target.value)}
              className={inputCls}
              required
            >
              <option value="Laut">Laut (Kapal / Breakbulk)</option>
              <option value="Darat">Darat (Truk / Fuso / Tronton)</option>
              <option value="Udara">Udara</option>
              <option value="Container">Container</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Keterangan Isi Barang *
            </label>
            <input
              type="text"
              value={goodsDescription}
              onChange={(e) => setGoodsDescription(e.target.value)}
              placeholder="Contoh: Sparepart Mesin, Pakaian..."
              className={inputCls}
              required
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Keterangan / Packing & Catatan
            </label>
            <input
              type="text"
              value={handlingInstructions}
              onChange={(e) => setHandlingInstructions(e.target.value)}
              placeholder="Packing kayu / Jangan dibanting"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Section 5: Multi-Item Koli */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-brand uppercase tracking-wider text-xs">
              5. Jumlah Koli & Rincian Ukuran Paket
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              [Formula: (P × L × T) / 4000 = Volumetrik Kg]
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
              <span className="text-[11px] text-slate-600 font-semibold">
                Jumlah Koli:
              </span>
              <input
                type="number"
                min="1"
                max="2000"
                value={quickKoliCount}
                onChange={(e) =>
                  setQuickKoliCount(parseInt(e.target.value, 10) || 1)
                }
                className="w-16 h-6 px-1.5 bg-white border border-slate-200 rounded-lg text-center font-bold text-gray-900 tabular-nums"
              />
              <button
                type="button"
                onClick={applyQuickKoliCount}
                className="px-2 h-6 rounded-lg bg-slate-200 hover:bg-slate-300 text-gray-800 text-[11px] font-bold transition-colors"
              >
                Set
              </button>
            </div>

            {items.length > 1 && (
              <button
                type="button"
                onClick={cloneFirstItemToAll}
                title="Salin kemasan, dimensi, dan berat Koli #1 ke semua koli"
                className="px-2.5 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-gray-700 border border-slate-200 text-[11px] font-semibold transition-colors"
              >
                Samakan Koli #1 ke Semua
              </button>
            )}

            <button
              type="button"
              onClick={addItemRow}
              className="flex items-center gap-1 px-3 h-8 rounded-xl bg-brand-soft text-brand border border-brand-soft font-bold text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Koli</span>
            </button>

            {items.length > 0 && (
              <button
                type="button"
                onClick={clearAllItems}
                title="Hapus semua baris koli & ukuran paket"
                className="flex items-center gap-1 px-3 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Semua</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] font-bold">
              <tr>
                <th className="py-2.5 px-2.5 w-12 text-center">Koli #</th>
                <th className="py-2.5 px-2.5 w-28">Kemasan</th>
                <th className="py-2.5 px-2.5 w-24">P (cm)</th>
                <th className="py-2.5 px-2.5 w-24">L (cm)</th>
                <th className="py-2.5 px-2.5 w-24">T (cm)</th>
                <th className="py-2.5 px-2.5 w-28">Aktual (Kg)</th>
                <th className="py-2.5 px-2.5 w-28">Vol. (Kg)</th>
                <th className="py-2.5 px-2.5 w-28">Vol. (CBM)</th>
                <th className="py-2.5 px-2.5 w-12 text-center">Hapus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-6 text-center text-slate-400 text-xs"
                  >
                    Semua baris koli sudah dihapus. Klik &ldquo;Tambah Koli&rdquo; atau masukkan Jumlah Koli lalu klik &ldquo;Set&rdquo;.
                  </td>
                </tr>
              ) : (
                (showAllItems ? items : items.slice(0, 25)).map((row, idx) => {
                const volKg = calculateVolumetricKg(
                  row.dim_p,
                  row.dim_l,
                  row.dim_t
                );
                const cbm = calculateCBM(row.dim_p, row.dim_l, row.dim_t);

                return (
                  <tr key={idx} className="hover:bg-slate-50/70">
                    <td className="py-2 px-2.5 text-center text-slate-500 font-bold">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={row.package_type}
                        onChange={(e) =>
                          updateItemRow(idx, 'package_type', e.target.value)
                        }
                        className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-xl text-gray-900"
                      >
                        <option value="Koli">Koli</option>
                        <option value="Dus">Dus</option>
                        <option value="Peti">Peti Kayu</option>
                        <option value="Karung">Karung</option>
                        <option value="Roll">Roll</option>
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.dim_p || ''}
                        onChange={(e) =>
                          updateItemRow(
                            idx,
                            'dim_p',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                        className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 tabular-nums"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.dim_l || ''}
                        onChange={(e) =>
                          updateItemRow(
                            idx,
                            'dim_l',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                        className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 tabular-nums"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.dim_t || ''}
                        onChange={(e) =>
                          updateItemRow(
                            idx,
                            'dim_t',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                        className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 tabular-nums"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.actual_kg || ''}
                        onChange={(e) =>
                          updateItemRow(
                            idx,
                            'actual_kg',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                        className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 font-bold tabular-nums"
                      />
                    </td>
                    <td className="py-2 px-2.5 text-gray-700 tabular-nums">
                      {volKg} Kg
                    </td>
                    <td className="py-2 px-2.5 text-slate-500 tabular-nums">
                      {cbm} CBM
                    </td>
                    <td className="py-2 px-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>

        {items.length > 25 && (
          <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <span>
              {showAllItems
                ? `Menampilkan seluruh ${items.length} baris koli.`
                : `Menampilkan 25 dari ${items.length} koli agar form tetap ringan. Seluruh ${items.length} koli tetap dihitung & disimpan.`}
            </span>
            <button
              type="button"
              onClick={() => setShowAllItems((prev) => !prev)}
              className="font-bold underline"
            >
              {showAllItems ? 'Ringkas ke 25 baris' : `Tampilkan semua (${items.length})`}
            </button>
          </div>
        )}

        {/* Summary Box */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div>
              <span className="text-slate-500">Total Koli: </span>
              <span className="font-bold text-gray-900">{items.length}</span>
            </div>
            <div>
              <span className="text-slate-500">Berat Aktual: </span>
              <span className="font-bold text-gray-900">{totalActualKg} Kg</span>
            </div>
            <div>
              <span className="text-slate-500">Berat Volumetrik: </span>
              <span className="font-bold text-gray-900">
                {totalVolumetricKg.toFixed(1)} Kg
              </span>
            </div>
            <div>
              <span className="text-slate-500">Kubikasi: </span>
              <span className="font-bold text-gray-900">
                {totalCBM.toFixed(3)} CBM
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-600 text-xs font-semibold">
              Berat Ditagih (Max):
            </span>
            <span className="px-3 py-1 rounded-xl bg-brand-soft border border-brand-soft text-brand font-bold text-xs tabular-nums">
              {chargeableWeight.toFixed(1)} Kg
            </span>
          </div>
        </div>
      </div>

      {/* Section 6: Billing */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            <div className="font-bold text-gray-900 uppercase tracking-wider text-xs">
              6. Asuransi, Biaya & Tipe Pembayaran
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Kalkulasi otomatis: <span className="font-mono font-semibold text-gray-700">{suggestedShipping.formula} = {formatRupiah(suggestedShipping.cost)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={autoCalculate}
                onChange={(e) => setAutoCalculate(e.target.checked)}
                className="rounded border-slate-300 text-brand"
              />
              <span>Auto Hitung Ongkir</span>
            </label>
            <button
              type="button"
              onClick={applySuggestedCost}
              className="flex items-center gap-1.5 px-3 h-8 rounded-xl bg-brand-soft text-brand border border-brand-soft text-xs font-bold"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Hitung Ulang</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Dasar Tarif
            </label>
            <select
              value={chargeableType}
              onChange={(e) =>
                setChargeableType(
                  e.target.value as 'Weight' | 'Volume' | 'Flat'
                )
              }
              className={inputCls}
            >
              <option value="Weight">Per Kg (Weight)</option>
              <option value="Volume">Per CBM (Volume)</option>
              <option value="Flat">Per Koli (Flat)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Tarif Satuan (Rp)
            </label>
            <input
              type="number"
              value={ratePerUnit || ''}
              onChange={(e) =>
                setRatePerUnit(parseFloat(e.target.value) || 0)
              }
              className={`${inputCls} tabular-nums`}
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Ongkos Kirim Utama
            </label>
            <input
              type="number"
              value={shippingCost || ''}
              onChange={(e) => {
                setAutoCalculate(false);
                setShippingCost(parseFloat(e.target.value) || 0);
              }}
              className={`${inputCls} tabular-nums font-bold`}
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Biaya Packing
            </label>
            <input
              type="number"
              value={packingCost || ''}
              onChange={(e) =>
                setPackingCost(parseFloat(e.target.value) || 0)
              }
              className={`${inputCls} tabular-nums`}
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Asuransi *
            </label>
            <select
              value={hasInsurance}
              onChange={(e) => {
                const next = e.target.value as 'Tidak' | 'Ya';
                setHasInsurance(next);
                if (next === 'Tidak') setInsuranceCost(0);
              }}
              className={inputCls}
            >
              <option value="Tidak">Tidak</option>
              <option value="Ya">Ya</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Premi Asuransi (Rp)
            </label>
            <input
              type="number"
              disabled={hasInsurance === 'Tidak'}
              value={hasInsurance === 'Ya' ? insuranceCost || '' : ''}
              onChange={(e) =>
                setInsuranceCost(parseFloat(e.target.value) || 0)
              }
              placeholder={hasInsurance === 'Tidak' ? '0 (Tidak)' : '0'}
              className={`${inputCls} tabular-nums disabled:opacity-50`}
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1">
              Biaya Lain / Handling
            </label>
            <input
              type="number"
              value={otherCost || ''}
              onChange={(e) => setOtherCost(parseFloat(e.target.value) || 0)}
              className={`${inputCls} tabular-nums`}
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Tipe Pembayaran *
              </label>
              <select
                value={paymentType}
                onChange={(e) => {
                  const val = e.target.value as 'Cash' | 'COD' | 'Invoice';
                  setPaymentType(val);
                  if (val === 'Cash') setPaymentStatus('Paid');
                  else setPaymentStatus('Unpaid');
                }}
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 font-semibold"
              >
                <option value="Invoice">Invoice (Member Tempo)</option>
                <option value="Cash">Tunai (Cash)</option>
                <option value="COD">Bayar Tujuan (COD)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Status Bayar
              </label>
              <select
                value={paymentStatus}
                onChange={(e) =>
                  setPaymentStatus(e.target.value as 'Unpaid' | 'Paid')
                }
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-gray-900 font-semibold"
              >
                <option value="Unpaid">Belum Lunas (Unpaid)</option>
                <option value="Paid">Lunas (Paid)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 px-5 py-2.5 rounded-2xl border border-slate-200">
            <span className="text-slate-600 font-semibold text-xs">
              Total Tagihan Resi:
            </span>
            <span className="text-lg font-extrabold text-brand tabular-nums">
              {formatRupiah(totalBill)}
            </span>
          </div>
        </div>
      </div>
    </form>
  );
}
