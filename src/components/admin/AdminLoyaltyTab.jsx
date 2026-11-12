import React, { useState, useEffect, useCallback } from 'react';
import { Award, Users, BookOpen, Settings, Search, Filter, Plus, RefreshCw, AlertCircle, CheckCircle2, ChevronRight, ShieldCheck } from 'lucide-react';
import { getAdminLoyaltyAccounts, getAdminLoyaltyLedger, getAdminLoyaltyConfig } from '../../api/loyaltyService';
import AdminLoyaltyAdjustModal from './AdminLoyaltyAdjustModal';

export default function AdminLoyaltyTab() {
  const [subTab, setSubTab] = useState('accounts'); // accounts | ledger | config
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Accounts state
  const [accounts, setAccounts] = useState([]);
  const [accountsTotal, setAccountsTotal] = useState(0);
  const [searchUser, setSearchUser] = useState('');
  const [filterTier, setFilterTier] = useState('');
  const [selectedUserForAdjust, setSelectedUserForAdjust] = useState(null);

  // Ledger state
  const [ledger, setLedger] = useState([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState('');

  // Config state
  const [configData, setConfigData] = useState(null);

  // Load Accounts
  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminLoyaltyAccounts({
        search: searchUser,
        tier: filterTier,
        limit: 50,
      });
      if (res?.data) {
        setAccounts(res.data.accounts || []);
        setAccountsTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error('[AdminLoyaltyTab] Error loading accounts:', err);
      setError(err?.message || 'Không thể tải danh sách tài khoản điểm.');
    } finally {
      setLoading(false);
    }
  }, [searchUser, filterTier]);

  // Load Ledger
  const loadLedger = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminLoyaltyLedger({
        type: ledgerTypeFilter,
        limit: 50,
      });
      if (res?.data) {
        setLedger(res.data.ledger || []);
        setLedgerTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error('[AdminLoyaltyTab] Error loading ledger:', err);
      setError(err?.message || 'Không thể tải sổ cái giao dịch.');
    } finally {
      setLoading(false);
    }
  }, [ledgerTypeFilter]);

  // Load Config
  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminLoyaltyConfig();
      if (res?.data) {
        setConfigData(res.data);
      }
    } catch (err) {
      console.error('[AdminLoyaltyTab] Error loading config:', err);
      setError(err?.message || 'Không thể tải cấu hình điểm thưởng.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === 'accounts') loadAccounts();
    else if (subTab === 'ledger') loadLedger();
    else if (subTab === 'config') loadConfig();
  }, [subTab, loadAccounts, loadLedger, loadConfig]);

  return (
    <div className="space-y-6">
      {/* ── Sub Navigation ── */}
      <div className="flex items-center justify-between border-b border-[#D6D3CD] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('accounts')}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded transition flex items-center gap-1.5 ${
              subTab === 'accounts'
                ? 'bg-[#141413] text-[#FAF8F5]'
                : 'text-[#141413]/70 hover:bg-[#FAF8F5]'
            }`}
          >
            <Users className="w-4 h-4 text-[#D4AF37]" />
            <span>Tài Khoản Hội Viên ({accountsTotal})</span>
          </button>

          <button
            onClick={() => setSubTab('ledger')}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded transition flex items-center gap-1.5 ${
              subTab === 'ledger'
                ? 'bg-[#141413] text-[#FAF8F5]'
                : 'text-[#141413]/70 hover:bg-[#FAF8F5]'
            }`}
          >
            <BookOpen className="w-4 h-4 text-[#D4AF37]" />
            <span>Sổ Cái Giao Dịch ({ledgerTotal})</span>
          </button>

          <button
            onClick={() => setSubTab('config')}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded transition flex items-center gap-1.5 ${
              subTab === 'config'
                ? 'bg-[#141413] text-[#FAF8F5]'
                : 'text-[#141413]/70 hover:bg-[#FAF8F5]'
            }`}
          >
            <Settings className="w-4 h-4 text-[#D4AF37]" />
            <span>Cấu Hình Tiers & Rules</span>
          </button>
        </div>

        <button
          onClick={() => {
            if (subTab === 'accounts') loadAccounts();
            else if (subTab === 'ledger') loadLedger();
            else if (subTab === 'config') loadConfig();
          }}
          className="p-1.5 rounded hover:bg-[#FAF8F5] text-[#141413]/60 transition"
          title="Làm mới dữ liệu"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* ── 1. ACCOUNTS VIEW ── */}
      {subTab === 'accounts' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-3 bg-white border border-[#D6D3CD] rounded flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <Search className="w-4 h-4 text-[#141413]/40" />
              <input
                type="text"
                placeholder="Tìm theo User ID..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full px-2 py-1.5 border border-[#D6D3CD] rounded focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[#141413]/60 font-semibold">Lọc hạng:</span>
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="px-2.5 py-1.5 border border-[#D6D3CD] rounded focus:border-[#D4AF37] focus:outline-none bg-white font-mono"
              >
                <option value="">Tất cả hạng</option>
                <option value="member">Member</option>
                <option value="silver">Silver Atelier</option>
                <option value="gold">Gold Prestige</option>
                <option value="diamond">Diamond Sovereign</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-[#D6D3CD] rounded shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#D6D3CD] bg-[#FAF8F5] text-[#141413]/70 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">User ID</th>
                    <th className="py-3 px-4">Hạng thành viên</th>
                    <th className="py-3 px-4 text-right">Điểm khả dụng</th>
                    <th className="py-3 px-4 text-right">Điểm trọn đời</th>
                    <th className="py-3 px-4">Ngày gia nhập</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D6D3CD]/60 font-mono">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-[#141413]/60">
                        Đang tải danh sách tài khoản...
                      </td>
                    </tr>
                  ) : accounts.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-[#141413]/60">
                        Không có tài khoản nào phù hợp bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    accounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-[#FAF8F5] transition">
                        <td className="py-3 px-4 font-bold text-[#141413]">
                          {acc.userId}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono font-bold border"
                            style={{
                              backgroundColor: `${acc.badgeColor}20`,
                              borderColor: acc.badgeColor,
                              color: acc.badgeColor === '#1A202C' ? '#D4AF37' : acc.badgeColor,
                            }}
                          >
                            {acc.tierName}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700">
                          {acc.availablePoints.toLocaleString('vi-VN')} pts
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-[#141413]">
                          {acc.lifetimePoints.toLocaleString('vi-VN')} pts
                        </td>
                        <td className="py-3 px-4 text-[#141413]/70 font-body">
                          {new Date(acc.joinedAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-3 px-4 text-right font-body">
                          <button
                            onClick={() => setSelectedUserForAdjust(acc)}
                            className="px-2.5 py-1 bg-[#141413] text-[#FAF8F5] hover:bg-[#D4AF37] hover:text-[#141413] rounded font-semibold text-[11px] transition shadow-xs"
                          >
                            Điều chỉnh điểm
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. GLOBAL LEDGER VIEW ── */}
      {subTab === 'ledger' && (
        <div className="space-y-4">
          <div className="p-3 bg-white border border-[#D6D3CD] rounded flex items-center gap-3 text-xs">
            <span className="text-[#141413]/60 font-semibold">Loại bút toán:</span>
            <select
              value={ledgerTypeFilter}
              onChange={(e) => setLedgerTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-[#D6D3CD] rounded focus:border-[#D4AF37] focus:outline-none bg-white font-mono"
            >
              <option value="">Tất cả loại giao dịch</option>
              <option value="earn">Tích điểm (earn)</option>
              <option value="redeem">Đổi thưởng (redeem)</option>
              <option value="refund_clawback">Thu hồi hoàn tiền (refund_clawback)</option>
              <option value="manual_adjustment">Điều chỉnh thủ công (manual_adjustment)</option>
            </select>
          </div>

          <div className="bg-white border border-[#D6D3CD] rounded shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-[#D6D3CD] bg-[#FAF8F5] text-[#141413]/70 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Thời gian</th>
                    <th className="py-3 px-4">User ID</th>
                    <th className="py-3 px-4">Loại</th>
                    <th className="py-3 px-4">Mã tham chiếu</th>
                    <th className="py-3 px-4 text-right">Điểm biến động</th>
                    <th className="py-3 px-4 text-right">Số dư sau GD</th>
                    <th className="py-3 px-4">Lý do</th>
                    <th className="py-3 px-4">Người thực hiện</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D6D3CD]/60">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-[#141413]/60 font-body">
                        Đang tải sổ cái giao dịch...
                      </td>
                    </tr>
                  ) : ledger.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-[#141413]/60 font-body">
                        Không có giao dịch nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    ledger.map((item) => {
                      const isPositive = item.points > 0;
                      return (
                        <tr key={item.id} className="hover:bg-[#FAF8F5] transition">
                          <td className="py-3 px-4 text-[#141413]/70 font-body">
                            {new Date(item.createdAt).toLocaleString('vi-VN')}
                          </td>
                          <td className="py-3 px-4 font-bold text-[#141413]">
                            {item.userId}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                              item.type === 'earn'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : item.type === 'redeem'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : item.type === 'refund_clawback'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                              {item.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#141413]">
                            {item.sourceReference}
                          </td>
                          <td className={`py-3 px-4 text-right font-bold ${
                            isPositive ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {isPositive ? `+${item.points}` : item.points} pts
                          </td>
                          <td className="py-3 px-4 text-right text-[#141413] font-semibold">
                            {item.balanceAfter} pts
                          </td>
                          <td className="py-3 px-4 text-[#141413]/80 font-body">
                            {item.reason}
                          </td>
                          <td className="py-3 px-4 text-[#141413]/60">
                            {item.adminId || 'System'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. TIERS & RULES CONFIG VIEW ── */}
      {subTab === 'config' && configData && (
        <div className="space-y-6">
          {/* Tiers List */}
          <div className="p-6 bg-white border border-[#D6D3CD] rounded shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#D4AF37]" />
              <h3 className="font-brand font-bold text-base text-[#141413]">Cấu Hình Ngưỡng Hạng Thành Viên (Loyalty Tiers)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {configData.tiers?.map((t) => (
                <div key={t.id} className="p-4 border border-[#D6D3CD] rounded bg-[#FAF8F5] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-brand font-bold text-sm text-[#141413] flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.badge_color }} />
                      {t.tier_name}
                    </span>
                    <span className="font-mono text-xs font-bold text-[#D4AF37]">
                      {t.min_lifetime_points} {t.max_lifetime_points ? `– ${t.max_lifetime_points}` : '+'} pts
                    </span>
                  </div>
                  <ul className="text-xs text-[#141413]/80 space-y-1">
                    {t.benefits?.map((b, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Approved Rules */}
          <div className="p-6 bg-white border border-[#D6D3CD] rounded shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="font-brand font-bold text-base text-[#141413]">Quy Tắc Tích Lũy & Quy Đổi Đã Phê Duyệt</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              {configData.rules?.map((r) => (
                <div key={r.id} className="p-4 border border-[#D6D3CD] rounded bg-[#FAF8F5] space-y-2">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-[#141413]">{r.name}</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] uppercase">
                      {r.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#141413]/60 font-body">Mã rule: {r.code} • Phê duyệt bởi: {r.approvedBy || 'Lumina Executive'}</p>
                  <pre className="p-2.5 bg-white border border-[#D6D3CD] rounded text-[11px] overflow-x-auto text-[#141413]">
                    {JSON.stringify(r.config, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {selectedUserForAdjust && (
        <AdminLoyaltyAdjustModal
          isOpen={Boolean(selectedUserForAdjust)}
          onClose={() => setSelectedUserForAdjust(null)}
          user={selectedUserForAdjust}
          onUpdated={loadAccounts}
        />
      )}
    </div>
  );
}

