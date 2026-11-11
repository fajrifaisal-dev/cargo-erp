import { redirect } from 'next/navigation';
import { Building2, Phone, MapPin, CreditCard, ShieldCheck } from 'lucide-react';
import { getCompanies, getCompanySettings } from '@/app/actions/companies';
import { getAuthContext } from '@/lib/auth';
import { ControlPanel } from '@/components/layout/ControlPanel';
import { ExpeditionModal } from '@/components/admin/ExpeditionModal';
import { ExpeditionActions } from '@/components/admin/ExpeditionActions';
import { getContrastTextColor } from '@/lib/utils';

export const revalidate = 0;

export default async function AdminExpeditionsPage() {
  const auth = await getAuthContext();
  if (!auth) redirect('/login');
  if (!auth.isMasterAdmin) redirect('/');

  const [companies, activeCompany] = await Promise.all([
    getCompanies(),
    getCompanySettings(),
  ]);

  return (
    <div>
      <ControlPanel
        title="Daftar Ekspedisi (Admin Multi-Tenant)"
        subtitle="Kelola seluruh entitas ekspedisi white-label beserta warna tema, rekening, dan profil masing-masing."
        badge={`${companies.length} Ekspedisi`}
        actions={<ExpeditionModal mode="create" />}
      />

      <div className="p-3.5 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-5 text-xs">
        {/* Admin Context Note */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-soft text-brand flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-gray-900">
                Mode Panel Admin Ekspedisi
              </div>
              <div className="text-slate-500">
                Ekspedisi aktif saat ini:{' '}
                <span className="font-bold text-brand">
                  {activeCompany?.name || 'Belum dipilih'}
                </span>
                . Mengaktifkan ekspedisi lain akan otomatis mengganti tema warna & ruang data operasional (STT, Manifest, Invoice, Member).
              </div>
            </div>
          </div>
        </div>

        {/* Expedition List Grid */}
        {companies.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-bold text-gray-900">
              Belum ada data ekspedisi
            </div>
            <div className="text-xs text-slate-500 mt-1 mb-4">
              Tambahkan entitas ekspedisi pertama untuk memulai.
            </div>
            <div className="inline-block">
              <ExpeditionModal mode="create" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companies.map((c) => {
              const isActive = activeCompany?.id === c.id;
              const primaryHex = c.brand_color || '#4F46E5';
              const accentHex = c.brand_accent || '#4338CA';
              const badgeText = getContrastTextColor(primaryHex);

              return (
                <div
                  key={c.id}
                  className={`bg-white rounded-3xl p-5 border transition-all shadow-sm flex flex-col justify-between gap-4 ${
                    isActive
                      ? 'border-brand ring-2 ring-brand-soft'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {c.logo_url ? (
                          <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 p-1 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={c.logo_url}
                              alt={c.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div
                            className="w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-sm flex-shrink-0 shadow-sm"
                            style={{
                              backgroundColor: primaryHex,
                              color: badgeText,
                            }}
                          >
                            {c.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-gray-900 truncate">
                            {c.name}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            slug: {c.slug}
                          </div>
                        </div>
                      </div>

                      {/* Brand Swatch */}
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl flex-shrink-0">
                        <span
                          className="w-3 h-3 rounded-full border border-black/10"
                          style={{ backgroundColor: primaryHex }}
                          title={`Primary: ${primaryHex}`}
                        />
                        <span
                          className="w-3 h-3 rounded-full border border-black/10"
                          style={{ backgroundColor: accentHex }}
                          title={`Accent: ${accentHex}`}
                        />
                        <span className="font-mono text-[10px] text-slate-600">
                          {primaryHex}
                        </span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 text-slate-600">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>{c.phone || 'Belum ada nomor telepon'}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">
                          {c.address || 'Belum ada alamat'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="font-mono text-[11px] truncate">
                          {c.bank_account || 'Belum ada rekening bank'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <ExpeditionModal company={c} mode="edit" />
                    <ExpeditionActions
                      companyId={c.id}
                      companyName={c.name}
                      isActive={isActive}
                      canDelete={companies.length > 1}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
