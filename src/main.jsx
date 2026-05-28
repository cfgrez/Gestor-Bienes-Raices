import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertTriangle,
  Archive,
  Building2,
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  Filter,
  Home,
  Landmark,
  LineChart,
  Plus,
  Receipt,
  Search,
  ShieldCheck,
  Upload,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import './styles.css';

const STORAGE_KEY = 'cfg_real_estate_app_v1';
const DB_NAME = 'cfg_real_estate_files_v1';
const STORE_NAME = 'pdfFiles';

const emptyData = {
  properties: [],
  tenants: [],
  contracts: [],
  policies: [],
  payments: [],
  expenses: [],
  contributions: [],
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => new Date().toISOString().slice(0, 7);
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const toNumber = (value) => Number(String(value ?? 0).replaceAll('.', '').replace(',', '.')) || 0;
const currency = (value) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
const dateLabel = (value) => (value ? new Date(`${value}T12:00:00`).toLocaleDateString('es-CL') : '—');
const monthLabel = (value) => {
  if (!value) return '—';
  const [year, month] = value.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('es-CL', {
    month: 'long',
    year: 'numeric',
  });
};
const daysUntil = (date) => {
  if (!date) return null;
  const target = new Date(`${date}T12:00:00`);
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
};
const statusLabel = {
  paid: 'Pagado',
  pending: 'Pendiente',
  late: 'Moroso',
  partial: 'Parcial',
  active: 'Activo',
  expired: 'Vencido',
  draft: 'Borrador',
  ended: 'Terminado',
};

function openFileDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function savePdf(file) {
  if (!file) return null;
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Solo se permiten archivos PDF.');
  }
  const db = await openFileDb();
  const id = uid();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({
      id,
      name: file.name,
      type: file.type || 'application/pdf',
      size: file.size,
      uploadedAt: new Date().toISOString(),
      blob: file,
    });
    tx.oncomplete = () => resolve({ id, name: file.name, type: file.type || 'application/pdf', size: file.size });
    tx.onerror = () => reject(tx.error);
  });
}

async function openStoredPdf(fileId) {
  if (!fileId) return;
  const db = await openFileDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(fileId);
    request.onsuccess = () => {
      const record = request.result;
      if (!record) {
        reject(new Error('No se encontró el PDF en este navegador.'));
        return;
      }
      const url = URL.createObjectURL(record.blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      resolve(record);
    };
    request.onerror = () => reject(request.error);
  });
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData;
    return { ...emptyData, ...JSON.parse(raw) };
  } catch {
    return emptyData;
  }
}

function downloadText(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n;]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  return [headers.join(';'), ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(';'))].join('\n');
}

function sampleData() {
  const p1 = uid();
  const p2 = uid();
  const t1 = uid();
  const t2 = uid();
  const c1 = uid();
  const c2 = uid();
  const month = currentMonth();
  return {
    properties: [
      {
        id: p1,
        role: '1234-56',
        address: 'Av. Apoquindo 4500, Local 12',
        commune: 'Las Condes',
        group: 'Locales comerciales',
        owner: 'Inversiones Demo SpA',
        manager: 'Carlos',
        expectedRent: 1850000,
        notes: 'Local con bodega y estacionamiento.',
      },
      {
        id: p2,
        role: '9876-11',
        address: 'Camino El Alba 9000, Oficina 401',
        commune: 'Las Condes',
        group: 'Oficinas',
        owner: 'Inversiones Demo SpA',
        manager: 'María',
        expectedRent: 950000,
        notes: 'Oficina con póliza vigente.',
      },
    ],
    tenants: [
      { id: t1, name: 'Vita Foods SpA', rut: '77.777.777-7', email: 'administracion@vitademo.cl', phone: '+56 9 1111 1111', manager: 'Rodrigo Moreno', status: 'active', notes: 'Buen historial de pago.' },
      { id: t2, name: 'Servicios Alfa Ltda.', rut: '76.123.456-0', email: 'pagos@alfa.cl', phone: '+56 9 2222 2222', manager: 'Carolina Soto', status: 'active', notes: 'Revisar reajuste anual.' },
    ],
    contracts: [
      { id: c1, propertyId: p1, tenantId: t1, startDate: '2025-01-01', endDate: '2026-12-31', noticeDays: 90, type: 'Contrato principal', status: 'active', rentAmount: 1850000, reajuste: 'IPC semestral', docs: [], notes: 'Anexo de aumento escalonado en negociación.' },
      { id: c2, propertyId: p2, tenantId: t2, startDate: '2024-06-01', endDate: '2026-08-31', noticeDays: 60, type: 'Contrato principal', status: 'active', rentAmount: 950000, reajuste: 'IPC anual', docs: [], notes: 'Renovación automática salvo aviso.' },
    ],
    policies: [
      { id: uid(), propertyId: p1, insurer: 'HDI', policyNumber: 'POL-1001', type: 'Incendio y sismo', startDate: '2026-01-01', endDate: '2026-07-31', noticeDays: 45, premium: 420000, fileId: '', fileName: '', notes: 'Solicitar renovación 45 días antes.' },
    ],
    payments: [
      { id: uid(), propertyId: p1, tenantId: t1, contractId: c1, month, dueDate: `${month}-05`, amountDue: 1850000, amountPaid: 1850000, paidDate: `${month}-03`, status: 'paid', notes: 'Transferencia recibida.' },
      { id: uid(), propertyId: p2, tenantId: t2, contractId: c2, month, dueDate: `${month}-05`, amountDue: 950000, amountPaid: 300000, paidDate: '', status: 'partial', notes: 'Pago parcial, falta saldo.' },
    ],
    expenses: [
      { id: uid(), propertyId: p1, date: todayISO(), category: 'Gasto común', supplier: 'Comunidad edificio', description: 'Gastos comunes mensuales', amount: 180000, recurring: true, paid: true },
      { id: uid(), propertyId: p2, date: todayISO(), category: 'Mantención', supplier: 'Técnico eléctrico', description: 'Revisión tablero', amount: 95000, recurring: false, paid: false },
    ],
    contributions: [
      { id: uid(), propertyId: p1, year: '2026', quota: '2', dueDate: '2026-06-30', amount: 520000, paidDate: '', status: 'pending', notes: 'Contribución trimestral.' },
    ],
  };
}

function App() {
  const [data, setData] = useState(loadData);
  const [tab, setTab] = useState('dashboard');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ tenantId: 'all', group: 'all', propertyId: 'all', month: currentMonth() });
  const [toast, setToast] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const lookups = useMemo(() => {
    const propertyById = Object.fromEntries(data.properties.map((p) => [p.id, p]));
    const tenantById = Object.fromEntries(data.tenants.map((t) => [t.id, t]));
    const contractById = Object.fromEntries(data.contracts.map((c) => [c.id, c]));
    const groups = [...new Set(data.properties.map((p) => p.group).filter(Boolean))].sort();
    return { propertyById, tenantById, contractById, groups };
  }, [data]);

  const filteredProperties = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.properties.filter((property) => {
      if (filters.group !== 'all' && property.group !== filters.group) return false;
      if (filters.propertyId !== 'all' && property.id !== filters.propertyId) return false;
      if (!q) return true;
      return [property.role, property.address, property.commune, property.group, property.manager, property.owner]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [data.properties, filters.group, filters.propertyId, query]);

  const filteredPayments = useMemo(() => {
    return data.payments.filter((payment) => {
      const property = lookups.propertyById[payment.propertyId];
      if (filters.tenantId !== 'all' && payment.tenantId !== filters.tenantId) return false;
      if (filters.propertyId !== 'all' && payment.propertyId !== filters.propertyId) return false;
      if (filters.group !== 'all' && property?.group !== filters.group) return false;
      if (filters.month && payment.month !== filters.month) return false;
      return true;
    });
  }, [data.payments, filters, lookups.propertyById]);

  const dashboard = useMemo(() => buildDashboard(data, lookups, filters.month), [data, lookups, filters.month]);
  const reports = useMemo(() => buildReports(data, lookups, filters), [data, lookups, filters]);

  const updateCollection = (collection, item) => {
    setData((prev) => {
      const exists = prev[collection].some((x) => x.id === item.id);
      return { ...prev, [collection]: exists ? prev[collection].map((x) => (x.id === item.id ? item : x)) : [item, ...prev[collection]] };
    });
  };
  const deleteFromCollection = (collection, id) => {
    if (!confirm('¿Seguro que quieres eliminar este registro?')) return;
    setData((prev) => ({ ...prev, [collection]: prev[collection].filter((x) => x.id !== id) }));
  };

  const generateMonthlyPayments = () => {
    const month = filters.month || currentMonth();
    let created = 0;
    setData((prev) => {
      const existingKeys = new Set(prev.payments.map((p) => `${p.contractId}-${p.month}`));
      const newPayments = prev.contracts
        .filter((contract) => contract.status === 'active')
        .filter((contract) => !existingKeys.has(`${contract.id}-${month}`))
        .map((contract) => {
          const property = prev.properties.find((p) => p.id === contract.propertyId);
          created += 1;
          return {
            id: uid(),
            propertyId: contract.propertyId,
            tenantId: contract.tenantId,
            contractId: contract.id,
            month,
            dueDate: `${month}-05`,
            amountDue: contract.rentAmount || property?.expectedRent || 0,
            amountPaid: 0,
            paidDate: '',
            status: 'pending',
            notes: 'Generado automáticamente desde contratos activos.',
          };
        });
      return { ...prev, payments: [...newPayments, ...prev.payments] };
    });
    setToast(created ? `Se generaron ${created} cobros para ${monthLabel(month)}.` : 'No había cobros nuevos para generar en ese mes.');
  };

  const exportBackup = () => {
    const payload = { exportedAt: new Date().toISOString(), version: 1, data };
    downloadText(`respaldo-bienes-raices-${todayISO()}.json`, JSON.stringify(payload, null, 2), 'application/json');
  };

  const importBackup = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = JSON.parse(text);
    const nextData = parsed.data || parsed;
    if (!nextData.properties || !nextData.tenants) throw new Error('El archivo no parece ser un respaldo válido.');
    setData({ ...emptyData, ...nextData });
    setToast('Respaldo importado. Los PDFs deben existir en este mismo navegador si fueron cargados antes.');
    event.target.value = '';
  };

  return (
    <div className="app-shell">
      {toast && <div className="toast"><CheckCircle2 size={18} />{toast}</div>}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Building2 size={24} /></div>
          <div>
            <strong>Gestor BR</strong>
            <span>Bienes raíces</span>
          </div>
        </div>
        <nav>
          <NavButton active={tab === 'dashboard'} icon={<Home />} label="Panel" onClick={() => setTab('dashboard')} />
          <NavButton active={tab === 'properties'} icon={<Landmark />} label="Roles" onClick={() => setTab('properties')} />
          <NavButton active={tab === 'tenants'} icon={<Users />} label="Arrendatarios" onClick={() => setTab('tenants')} />
          <NavButton active={tab === 'contracts'} icon={<FileText />} label="Contratos" onClick={() => setTab('contracts')} />
          <NavButton active={tab === 'policies'} icon={<ShieldCheck />} label="Pólizas" onClick={() => setTab('policies')} />
          <NavButton active={tab === 'payments'} icon={<WalletCards />} label="Arriendos" onClick={() => setTab('payments')} />
          <NavButton active={tab === 'expenses'} icon={<Receipt />} label="Gastos" onClick={() => setTab('expenses')} />
          <NavButton active={tab === 'reports'} icon={<LineChart />} label="Reportes" onClick={() => setTab('reports')} />
          <NavButton active={tab === 'backup'} icon={<Archive />} label="Respaldo" onClick={() => setTab('backup')} />
        </nav>
        <div className="sidebar-note">
          <strong>MVP local</strong>
          <span>Datos guardados en este navegador. Ideal para partir; luego se puede conectar a Supabase/Firebase.</span>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">Administración patrimonial</p>
            <h1>{pageTitle(tab)}</h1>
          </div>
          <div className="top-actions">
            <button className="secondary" onClick={() => setData(sampleData())}>Cargar demo</button>
            <button className="primary" onClick={generateMonthlyPayments}><CalendarClock size={17} /> Generar cobros</button>
          </div>
        </header>

        <section className="filters">
          <label className="searchbox"><Search size={18} /><input placeholder="Buscar dirección, rol, arrendatario, encargado..." value={query} onChange={(e) => setQuery(e.target.value)} /></label>
          <Select label="Grupo" value={filters.group} onChange={(value) => setFilters((f) => ({ ...f, group: value }))} options={[{ value: 'all', label: 'Todos' }, ...lookups.groups.map((g) => ({ value: g, label: g }))]} />
          <Select label="Rol" value={filters.propertyId} onChange={(value) => setFilters((f) => ({ ...f, propertyId: value }))} options={[{ value: 'all', label: 'Todos' }, ...data.properties.map((p) => ({ value: p.id, label: `${p.role} · ${p.address}` }))]} />
          <Select label="Arrendatario" value={filters.tenantId} onChange={(value) => setFilters((f) => ({ ...f, tenantId: value }))} options={[{ value: 'all', label: 'Todos' }, ...data.tenants.map((t) => ({ value: t.id, label: t.name }))]} />
          <label className="field compact"><span>Mes</span><input type="month" value={filters.month} onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value }))} /></label>
        </section>

        {tab === 'dashboard' && <Dashboard data={data} lookups={lookups} dashboard={dashboard} reports={reports} />}
        {tab === 'properties' && <Properties data={data} filteredProperties={filteredProperties} updateCollection={updateCollection} deleteFromCollection={deleteFromCollection} />}
        {tab === 'tenants' && <Tenants data={data} updateCollection={updateCollection} deleteFromCollection={deleteFromCollection} query={query} />}
        {tab === 'contracts' && <Contracts data={data} lookups={lookups} updateCollection={updateCollection} deleteFromCollection={deleteFromCollection} setToast={setToast} />}
        {tab === 'policies' && <Policies data={data} lookups={lookups} updateCollection={updateCollection} deleteFromCollection={deleteFromCollection} setToast={setToast} />}
        {tab === 'payments' && <Payments data={data} lookups={lookups} filteredPayments={filteredPayments} updateCollection={updateCollection} deleteFromCollection={deleteFromCollection} month={filters.month} />}
        {tab === 'expenses' && <Expenses data={data} lookups={lookups} updateCollection={updateCollection} deleteFromCollection={deleteFromCollection} />}
        {tab === 'reports' && <Reports data={data} lookups={lookups} reports={reports} month={filters.month} />}
        {tab === 'backup' && <Backup data={data} exportBackup={exportBackup} importBackup={importBackup} setData={setData} />}
      </main>
    </div>
  );
}

function pageTitle(tab) {
  return {
    dashboard: 'Panel de control',
    properties: 'Roles y propiedades',
    tenants: 'Arrendatarios',
    contracts: 'Contratos y anexos',
    policies: 'Pólizas de seguro',
    payments: 'Ingresos por arriendos',
    expenses: 'Gastos y contribuciones',
    reports: 'Reportes',
    backup: 'Respaldo e importación',
  }[tab];
}

function NavButton({ active, icon, label, onClick }) {
  return <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}>{React.cloneElement(icon, { size: 18 })}<span>{label}</span></button>;
}

function Select({ label, value, onChange, options }) {
  return <label className="field compact"><span>{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></label>;
}

function StatCard({ title, value, icon, hint, tone = '' }) {
  return <div className={`stat ${tone}`}><div><span>{title}</span><strong>{value}</strong><small>{hint}</small></div><div className="stat-icon">{icon}</div></div>;
}

function buildDashboard(data, lookups, selectedMonth) {
  const monthPayments = data.payments.filter((p) => p.month === selectedMonth);
  const incomeDue = monthPayments.reduce((sum, p) => sum + Number(p.amountDue || 0), 0);
  const incomePaid = monthPayments.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
  const expenses = data.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const contributions = data.contributions.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const activeContracts = data.contracts.filter((c) => c.status === 'active').length;
  const expiringContracts = data.contracts.filter((c) => {
    const d = daysUntil(c.endDate);
    return c.status === 'active' && d !== null && d >= 0 && d <= Number(c.noticeDays || 60);
  }).length;
  const expiringPolicies = data.policies.filter((p) => {
    const d = daysUntil(p.endDate);
    return d !== null && d >= 0 && d <= Number(p.noticeDays || 30);
  }).length;
  const latePayments = data.payments.filter((p) => isPaymentLate(p)).length;
  return { incomeDue, incomePaid, expenses, contributions, activeContracts, expiringContracts, expiringPolicies, latePayments };
}

function buildReports(data, lookups, filters) {
  const today = todayISO();
  const propertyAllowed = (propertyId) => {
    const property = lookups.propertyById[propertyId];
    if (filters.propertyId !== 'all' && propertyId !== filters.propertyId) return false;
    if (filters.group !== 'all' && property?.group !== filters.group) return false;
    return true;
  };
  const tenantAllowed = (tenantId) => filters.tenantId === 'all' || tenantId === filters.tenantId;

  const latePayments = data.payments
    .filter((p) => propertyAllowed(p.propertyId) && tenantAllowed(p.tenantId))
    .filter((p) => isPaymentLate(p))
    .map((p) => ({ ...p, property: lookups.propertyById[p.propertyId], tenant: lookups.tenantById[p.tenantId], debt: Math.max(0, Number(p.amountDue || 0) - Number(p.amountPaid || 0)) }));

  const missingCurrentMonth = data.contracts
    .filter((c) => c.status === 'active' && propertyAllowed(c.propertyId) && tenantAllowed(c.tenantId))
    .filter((c) => !data.payments.some((p) => p.contractId === c.id && p.month === filters.month))
    .map((c) => ({ contract: c, property: lookups.propertyById[c.propertyId], tenant: lookups.tenantById[c.tenantId], amountDue: c.rentAmount || lookups.propertyById[c.propertyId]?.expectedRent || 0, month: filters.month }));

  const contractAlerts = data.contracts
    .filter((c) => propertyAllowed(c.propertyId) && tenantAllowed(c.tenantId))
    .map((c) => ({ ...c, days: daysUntil(c.endDate), property: lookups.propertyById[c.propertyId], tenant: lookups.tenantById[c.tenantId] }))
    .filter((c) => c.days !== null && c.days <= Number(c.noticeDays || 60))
    .sort((a, b) => a.days - b.days);

  const policyAlerts = data.policies
    .filter((p) => propertyAllowed(p.propertyId))
    .map((p) => ({ ...p, days: daysUntil(p.endDate), property: lookups.propertyById[p.propertyId] }))
    .filter((p) => p.days !== null && p.days <= Number(p.noticeDays || 30))
    .sort((a, b) => a.days - b.days);

  const contributionAlerts = data.contributions
    .filter((c) => propertyAllowed(c.propertyId) && c.status !== 'paid')
    .map((c) => ({ ...c, days: daysUntil(c.dueDate), property: lookups.propertyById[c.propertyId] }))
    .filter((c) => c.days !== null && c.days <= 30)
    .sort((a, b) => a.days - b.days);

  const expensesByRole = data.expenses
    .filter((e) => propertyAllowed(e.propertyId))
    .reduce((acc, e) => {
      const property = lookups.propertyById[e.propertyId];
      const key = property?.role || 'Sin rol';
      acc[key] = acc[key] || { role: key, address: property?.address || 'Sin propiedad', amount: 0, count: 0 };
      acc[key].amount += Number(e.amount || 0);
      acc[key].count += 1;
      return acc;
    }, {});

  return { latePayments, missingCurrentMonth, contractAlerts, policyAlerts, contributionAlerts, expensesByRole: Object.values(expensesByRole), today };
}

function isPaymentLate(payment) {
  const due = payment.dueDate || `${payment.month}-05`;
  const pendingAmount = Number(payment.amountDue || 0) - Number(payment.amountPaid || 0);
  return payment.status === 'late' || payment.status === 'partial' || (pendingAmount > 0 && due < todayISO());
}

function Dashboard({ data, lookups, dashboard, reports }) {
  return <div className="grid gap">
    <div className="stats-grid">
      <StatCard title="Propiedades / roles" value={data.properties.length} icon={<Landmark />} hint="Roles registrados" />
      <StatCard title="Contratos activos" value={dashboard.activeContracts} icon={<FileText />} hint={`${dashboard.expiringContracts} por vencer`} tone={dashboard.expiringContracts ? 'warning' : ''} />
      <StatCard title="Ingresos cobrados" value={currency(dashboard.incomePaid)} icon={<WalletCards />} hint={`De ${currency(dashboard.incomeDue)} esperado`} />
      <StatCard title="Morosidad" value={dashboard.latePayments} icon={<AlertTriangle />} hint="Pagos atrasados/parciales" tone={dashboard.latePayments ? 'danger' : ''} />
    </div>
    <div className="two-col">
      <Card title="Alertas próximas" icon={<CalendarClock />}>
        <AlertList reports={reports} />
      </Card>
      <Card title="Resumen financiero" icon={<LineChart />}>
        <div className="financial-summary">
          <Row label="Ingresos cobrados mes" value={currency(dashboard.incomePaid)} />
          <Row label="Ingresos esperados mes" value={currency(dashboard.incomeDue)} />
          <Row label="Gastos registrados" value={currency(dashboard.expenses)} />
          <Row label="Contribuciones registradas" value={currency(dashboard.contributions)} />
          <Row label="Saldo simple" value={currency(dashboard.incomePaid - dashboard.expenses - dashboard.contributions)} strong />
        </div>
      </Card>
    </div>
    <Card title="Mapa operativo de roles" icon={<Filter />}>
      <div className="table-wrap"><table><thead><tr><th>Rol</th><th>Dirección</th><th>Grupo</th><th>Arrendatario</th><th>Arriendo esperado</th><th>Encargado</th></tr></thead><tbody>
        {data.properties.map((p) => {
          const contract = data.contracts.find((c) => c.propertyId === p.id && c.status === 'active');
          return <tr key={p.id}><td>{p.role}</td><td>{p.address}</td><td>{p.group || '—'}</td><td>{lookups.tenantById[contract?.tenantId]?.name || 'Sin contrato activo'}</td><td>{currency(contract?.rentAmount || p.expectedRent)}</td><td>{p.manager || '—'}</td></tr>;
        })}
      </tbody></table></div>
    </Card>
  </div>;
}

function AlertList({ reports }) {
  const all = [
    ...reports.contractAlerts.map((x) => ({ type: 'Contrato', title: `${x.tenant?.name || 'Arrendatario'} · ${x.property?.role || ''}`, date: x.endDate, days: x.days })),
    ...reports.policyAlerts.map((x) => ({ type: 'Póliza', title: `${x.insurer} · ${x.property?.role || ''}`, date: x.endDate, days: x.days })),
    ...reports.contributionAlerts.map((x) => ({ type: 'Contribución', title: `${x.property?.role || ''} cuota ${x.quota}`, date: x.dueDate, days: x.days })),
    ...reports.latePayments.map((x) => ({ type: 'Morosidad', title: `${x.tenant?.name || ''} · ${currency(x.debt)}`, date: x.dueDate, days: daysUntil(x.dueDate) })),
  ].sort((a, b) => a.days - b.days).slice(0, 8);
  if (!all.length) return <Empty text="No hay alertas críticas con los filtros actuales." />;
  return <div className="alert-stack">{all.map((a, idx) => <div className="alert-item" key={`${a.type}-${idx}`}><AlertTriangle size={17} /><div><strong>{a.type}: {a.title}</strong><span>{dateLabel(a.date)} · {a.days < 0 ? `vencido hace ${Math.abs(a.days)} días` : `faltan ${a.days} días`}</span></div></div>)}</div>;
}

function Row({ label, value, strong }) {
  return <div className={`row ${strong ? 'strong' : ''}`}><span>{label}</span><b>{value}</b></div>;
}

function Card({ title, icon, children, actions }) {
  return <section className="card"><div className="card-head"><h2>{icon && React.cloneElement(icon, { size: 20 })}{title}</h2>{actions}</div>{children}</section>;
}

function Empty({ text }) {
  return <div className="empty">{text}</div>;
}

function Properties({ data, filteredProperties, updateCollection, deleteFromCollection }) {
  const [editing, setEditing] = useState(null);
  const initial = { id: '', role: '', address: '', commune: '', group: '', owner: '', manager: '', expectedRent: '', notes: '' };
  return <CrudLayout
    title="Nuevo rol / propiedad"
    form={<PropertyForm initial={editing || initial} onCancel={() => setEditing(null)} onSave={(item) => { updateCollection('properties', { ...item, id: item.id || uid(), expectedRent: toNumber(item.expectedRent) }); setEditing(null); }} />}
  >
    <div className="cards-list">
      {filteredProperties.map((p) => <article className="record" key={p.id}>
        <div><h3>{p.role || 'Rol sin número'} · {p.address}</h3><p>{p.commune} · {p.group || 'Sin grupo'} · Encargado: {p.manager || '—'}</p><p className="muted">Propietario: {p.owner || '—'} · Arriendo base: {currency(p.expectedRent)}</p>{p.notes && <p>{p.notes}</p>}</div>
        <RecordActions onEdit={() => setEditing(p)} onDelete={() => deleteFromCollection('properties', p.id)} />
      </article>)}
      {!filteredProperties.length && <Empty text="No hay propiedades registradas o no coinciden con los filtros." />}
    </div>
  </CrudLayout>;
}

function PropertyForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  return <FormShell onSubmit={() => onSave(form)} onCancel={onCancel} isEditing={Boolean(initial.id)}>
    <Field label="Rol SII" value={form.role} onChange={(v) => setForm({ ...form, role: v })} required />
    <Field label="Dirección" value={form.address} onChange={(v) => setForm({ ...form, address: v })} required />
    <Field label="Comuna" value={form.commune} onChange={(v) => setForm({ ...form, commune: v })} />
    <Field label="Grupo de roles" value={form.group} onChange={(v) => setForm({ ...form, group: v })} placeholder="Ej: Locales, oficinas, bodegas" />
    <Field label="Propietario / sociedad" value={form.owner} onChange={(v) => setForm({ ...form, owner: v })} />
    <Field label="Encargado" value={form.manager} onChange={(v) => setForm({ ...form, manager: v })} />
    <Field label="Arriendo base esperado" type="number" value={form.expectedRent} onChange={(v) => setForm({ ...form, expectedRent: v })} />
    <Field label="Notas" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} textarea />
  </FormShell>;
}

function Tenants({ data, updateCollection, deleteFromCollection, query }) {
  const [editing, setEditing] = useState(null);
  const initial = { id: '', name: '', rut: '', email: '', phone: '', manager: '', status: 'active', notes: '' };
  const tenants = data.tenants.filter((t) => !query || [t.name, t.rut, t.email, t.manager].join(' ').toLowerCase().includes(query.toLowerCase()));
  return <CrudLayout title="Nuevo arrendatario" form={<TenantForm initial={editing || initial} onCancel={() => setEditing(null)} onSave={(item) => { updateCollection('tenants', { ...item, id: item.id || uid() }); setEditing(null); }} />}>
    <div className="cards-list">{tenants.map((t) => <article className="record" key={t.id}>
      <div><h3>{t.name}</h3><p>RUT: {t.rut || '—'} · Encargado: {t.manager || '—'} · Estado: {statusLabel[t.status] || t.status}</p><p className="muted">{t.email || 'Sin email'} · {t.phone || 'Sin teléfono'}</p>{t.notes && <p>{t.notes}</p>}</div>
      <RecordActions onEdit={() => setEditing(t)} onDelete={() => deleteFromCollection('tenants', t.id)} />
    </article>)}{!tenants.length && <Empty text="No hay arrendatarios registrados." />}</div>
  </CrudLayout>;
}

function TenantForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  return <FormShell onSubmit={() => onSave(form)} onCancel={onCancel} isEditing={Boolean(initial.id)}>
    <Field label="Nombre / razón social" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
    <Field label="RUT" value={form.rut} onChange={(v) => setForm({ ...form, rut: v })} />
    <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
    <Field label="Teléfono" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
    <Field label="Encargado / contacto" value={form.manager} onChange={(v) => setForm({ ...form, manager: v })} />
    <label className="field"><span>Estado</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Activo</option><option value="ended">Terminado</option></select></label>
    <Field label="Notas" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} textarea />
  </FormShell>;
}

function Contracts({ data, lookups, updateCollection, deleteFromCollection, setToast }) {
  const [editing, setEditing] = useState(null);
  const initial = { id: '', propertyId: data.properties[0]?.id || '', tenantId: data.tenants[0]?.id || '', startDate: todayISO(), endDate: '', noticeDays: 60, type: 'Contrato principal', status: 'active', rentAmount: '', reajuste: '', docs: [], notes: '' };
  const handleUpload = async (contract, file, kind) => {
    try {
      const saved = await savePdf(file);
      const next = { ...contract, docs: [...(contract.docs || []), { id: uid(), kind, fileId: saved.id, fileName: saved.name, uploadedAt: new Date().toISOString() }] };
      updateCollection('contracts', next);
      setEditing(next);
      setToast('PDF guardado correctamente.');
    } catch (error) {
      alert(error.message);
    }
  };
  return <CrudLayout title="Nuevo contrato / anexo" form={<ContractForm data={data} initial={editing || initial} onCancel={() => setEditing(null)} onSave={(item) => { updateCollection('contracts', { ...item, id: item.id || uid(), rentAmount: toNumber(item.rentAmount), noticeDays: Number(item.noticeDays || 60), docs: item.docs || [] }); setEditing(null); }} onUpload={handleUpload} />}>
    <div className="cards-list">{data.contracts.map((c) => {
      const property = lookups.propertyById[c.propertyId];
      const tenant = lookups.tenantById[c.tenantId];
      const d = daysUntil(c.endDate);
      return <article className={`record ${d !== null && d <= Number(c.noticeDays || 60) ? 'soft-warning' : ''}`} key={c.id}>
        <div><h3>{tenant?.name || 'Sin arrendatario'} · {property?.role || 'Sin rol'}</h3><p>{property?.address || '—'} · {c.type} · {statusLabel[c.status] || c.status}</p><p className="muted">Vigencia: {dateLabel(c.startDate)} a {dateLabel(c.endDate)} · Aviso: {c.noticeDays} días · Renta: {currency(c.rentAmount)}</p><p className="muted">Reajuste: {c.reajuste || '—'} · PDFs: {(c.docs || []).length}</p>{c.notes && <p>{c.notes}</p>}<DocumentList docs={c.docs} /></div>
        <RecordActions onEdit={() => setEditing(c)} onDelete={() => deleteFromCollection('contracts', c.id)} />
      </article>;
    })}{!data.contracts.length && <Empty text="No hay contratos registrados." />}</div>
  </CrudLayout>;
}

function ContractForm({ data, initial, onSave, onCancel, onUpload }) {
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  return <FormShell onSubmit={() => onSave(form)} onCancel={onCancel} isEditing={Boolean(initial.id)}>
    <label className="field"><span>Rol / propiedad</span><select required value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}>{data.properties.map((p) => <option key={p.id} value={p.id}>{p.role} · {p.address}</option>)}</select></label>
    <label className="field"><span>Arrendatario</span><select required value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })}>{data.tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
    <Field label="Fecha inicio" type="date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} />
    <Field label="Fecha término" type="date" value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} />
    <Field label="Avisar antes de vencer (días)" type="number" value={form.noticeDays} onChange={(v) => setForm({ ...form, noticeDays: v })} />
    <Field label="Tipo" value={form.type} onChange={(v) => setForm({ ...form, type: v })} placeholder="Contrato principal, anexo, renovación..." />
    <label className="field"><span>Estado</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Activo</option><option value="draft">Borrador</option><option value="ended">Terminado</option><option value="expired">Vencido</option></select></label>
    <Field label="Renta mensual" type="number" value={form.rentAmount} onChange={(v) => setForm({ ...form, rentAmount: v })} />
    <Field label="Reajuste" value={form.reajuste} onChange={(v) => setForm({ ...form, reajuste: v })} placeholder="IPC semestral, anual, UF/m²..." />
    <Field label="Notas" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} textarea />
    <div className="upload-box full">
      <span>Subir contrato o anexo PDF</span>
      <div className="upload-row">
        <label className="upload-button"><Upload size={16} /> Contrato PDF<input type="file" accept="application/pdf" onChange={(e) => e.target.files?.[0] && onUpload({ ...form, id: form.id || uid() }, e.target.files[0], 'Contrato')} /></label>
        <label className="upload-button"><Upload size={16} /> Anexo PDF<input type="file" accept="application/pdf" onChange={(e) => e.target.files?.[0] && onUpload({ ...form, id: form.id || uid() }, e.target.files[0], 'Anexo')} /></label>
      </div>
      <DocumentList docs={form.docs} />
    </div>
  </FormShell>;
}

function DocumentList({ docs = [] }) {
  if (!docs.length) return <p className="muted">Sin PDFs cargados.</p>;
  return <div className="doc-list">{docs.map((doc) => <button type="button" key={doc.id} onClick={() => openStoredPdf(doc.fileId).catch((e) => alert(e.message))}><FileText size={15} /><span>{doc.kind}: {doc.fileName}</span></button>)}</div>;
}

function Policies({ data, lookups, updateCollection, deleteFromCollection, setToast }) {
  const [editing, setEditing] = useState(null);
  const initial = { id: '', propertyId: data.properties[0]?.id || '', insurer: '', policyNumber: '', type: '', startDate: todayISO(), endDate: '', noticeDays: 30, premium: '', fileId: '', fileName: '', notes: '' };
  const onUpload = async (policy, file) => {
    try {
      const saved = await savePdf(file);
      const next = { ...policy, id: policy.id || uid(), fileId: saved.id, fileName: saved.name };
      updateCollection('policies', next);
      setEditing(next);
      setToast('Póliza PDF guardada correctamente.');
    } catch (error) {
      alert(error.message);
    }
  };
  return <CrudLayout title="Nueva póliza" form={<PolicyForm data={data} initial={editing || initial} onCancel={() => setEditing(null)} onSave={(item) => { updateCollection('policies', { ...item, id: item.id || uid(), premium: toNumber(item.premium), noticeDays: Number(item.noticeDays || 30) }); setEditing(null); }} onUpload={onUpload} />}>
    <div className="cards-list">{data.policies.map((p) => {
      const property = lookups.propertyById[p.propertyId];
      const d = daysUntil(p.endDate);
      return <article className={`record ${d !== null && d <= Number(p.noticeDays || 30) ? 'soft-warning' : ''}`} key={p.id}>
        <div><h3>{p.insurer || 'Aseguradora'} · {p.policyNumber || 'Sin número'}</h3><p>{property?.role || 'Sin rol'} · {property?.address || '—'}</p><p className="muted">Tipo: {p.type || '—'} · Vigencia: {dateLabel(p.startDate)} a {dateLabel(p.endDate)} · Prima: {currency(p.premium)}</p>{p.fileId && <div className="doc-list"><button onClick={() => openStoredPdf(p.fileId).catch((e) => alert(e.message))}><FileText size={15} /> Ver póliza PDF: {p.fileName}</button></div>}{p.notes && <p>{p.notes}</p>}</div>
        <RecordActions onEdit={() => setEditing(p)} onDelete={() => deleteFromCollection('policies', p.id)} />
      </article>;
    })}{!data.policies.length && <Empty text="No hay pólizas registradas." />}</div>
  </CrudLayout>;
}

function PolicyForm({ data, initial, onSave, onCancel, onUpload }) {
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  return <FormShell onSubmit={() => onSave(form)} onCancel={onCancel} isEditing={Boolean(initial.id)}>
    <label className="field"><span>Rol / propiedad</span><select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}>{data.properties.map((p) => <option key={p.id} value={p.id}>{p.role} · {p.address}</option>)}</select></label>
    <Field label="Aseguradora" value={form.insurer} onChange={(v) => setForm({ ...form, insurer: v })} />
    <Field label="N° póliza" value={form.policyNumber} onChange={(v) => setForm({ ...form, policyNumber: v })} />
    <Field label="Tipo de seguro" value={form.type} onChange={(v) => setForm({ ...form, type: v })} placeholder="Incendio, sismo, RC, etc." />
    <Field label="Fecha inicio" type="date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} />
    <Field label="Fecha término" type="date" value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} />
    <Field label="Avisar antes de vencer (días)" type="number" value={form.noticeDays} onChange={(v) => setForm({ ...form, noticeDays: v })} />
    <Field label="Prima / costo" type="number" value={form.premium} onChange={(v) => setForm({ ...form, premium: v })} />
    <Field label="Notas" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} textarea />
    <div className="upload-box full"><span>PDF de póliza</span><label className="upload-button"><Upload size={16} /> Subir póliza PDF<input type="file" accept="application/pdf" onChange={(e) => e.target.files?.[0] && onUpload({ ...form, id: form.id || uid() }, e.target.files[0])} /></label>{form.fileName && <p className="muted">Archivo cargado: {form.fileName}</p>}</div>
  </FormShell>;
}

function Payments({ data, lookups, filteredPayments, updateCollection, deleteFromCollection, month }) {
  const [editing, setEditing] = useState(null);
  const initial = { id: '', propertyId: data.properties[0]?.id || '', tenantId: data.tenants[0]?.id || '', contractId: '', month: month || currentMonth(), dueDate: `${month || currentMonth()}-05`, amountDue: '', amountPaid: '', paidDate: '', status: 'pending', notes: '' };
  return <CrudLayout title="Registrar ingreso / arriendo" form={<PaymentForm data={data} initial={editing || initial} onCancel={() => setEditing(null)} onSave={(item) => { updateCollection('payments', { ...item, id: item.id || uid(), amountDue: toNumber(item.amountDue), amountPaid: toNumber(item.amountPaid) }); setEditing(null); }} />}>
    <div className="table-wrap"><table><thead><tr><th>Mes</th><th>Arrendatario</th><th>Rol</th><th>Vence</th><th>Esperado</th><th>Pagado</th><th>Saldo</th><th>Estado</th><th></th></tr></thead><tbody>
      {filteredPayments.map((p) => <tr key={p.id} className={isPaymentLate(p) ? 'danger-row' : ''}><td>{monthLabel(p.month)}</td><td>{lookups.tenantById[p.tenantId]?.name || '—'}</td><td>{lookups.propertyById[p.propertyId]?.role || '—'}</td><td>{dateLabel(p.dueDate)}</td><td>{currency(p.amountDue)}</td><td>{currency(p.amountPaid)}</td><td>{currency(Number(p.amountDue || 0) - Number(p.amountPaid || 0))}</td><td><Badge tone={isPaymentLate(p) ? 'danger' : p.status === 'paid' ? 'success' : 'warning'}>{statusLabel[p.status] || p.status}</Badge></td><td><RecordActions compact onEdit={() => setEditing(p)} onDelete={() => deleteFromCollection('payments', p.id)} /></td></tr>)}
    </tbody></table>{!filteredPayments.length && <Empty text="No hay pagos con los filtros seleccionados." />}</div>
  </CrudLayout>;
}

function PaymentForm({ data, initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  const contractsForTenant = data.contracts.filter((c) => !form.tenantId || c.tenantId === form.tenantId);
  const selectContract = (contractId) => {
    const contract = data.contracts.find((c) => c.id === contractId);
    const property = data.properties.find((p) => p.id === contract?.propertyId);
    setForm({ ...form, contractId, propertyId: contract?.propertyId || form.propertyId, tenantId: contract?.tenantId || form.tenantId, amountDue: contract?.rentAmount || property?.expectedRent || form.amountDue });
  };
  return <FormShell onSubmit={() => onSave(form)} onCancel={onCancel} isEditing={Boolean(initial.id)}>
    <label className="field"><span>Arrendatario</span><select value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })}>{data.tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
    <label className="field"><span>Contrato</span><select value={form.contractId} onChange={(e) => selectContract(e.target.value)}><option value="">Sin asociar</option>{contractsForTenant.map((c) => <option key={c.id} value={c.id}>{data.properties.find((p) => p.id === c.propertyId)?.role} · {dateLabel(c.startDate)}-{dateLabel(c.endDate)}</option>)}</select></label>
    <label className="field"><span>Rol / propiedad</span><select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}>{data.properties.map((p) => <option key={p.id} value={p.id}>{p.role} · {p.address}</option>)}</select></label>
    <Field label="Mes cobrado" type="month" value={form.month} onChange={(v) => setForm({ ...form, month: v, dueDate: `${v}-05` })} />
    <Field label="Fecha vencimiento" type="date" value={form.dueDate} onChange={(v) => setForm({ ...form, dueDate: v })} />
    <Field label="Monto esperado" type="number" value={form.amountDue} onChange={(v) => setForm({ ...form, amountDue: v })} />
    <Field label="Monto pagado" type="number" value={form.amountPaid} onChange={(v) => setForm({ ...form, amountPaid: v })} />
    <Field label="Fecha pago" type="date" value={form.paidDate} onChange={(v) => setForm({ ...form, paidDate: v })} />
    <label className="field"><span>Estado</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="pending">Pendiente</option><option value="partial">Parcial</option><option value="paid">Pagado</option><option value="late">Moroso</option></select></label>
    <Field label="Notas" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} textarea />
  </FormShell>;
}

function Expenses({ data, lookups, updateCollection, deleteFromCollection }) {
  const [expenseEditing, setExpenseEditing] = useState(null);
  const [contributionEditing, setContributionEditing] = useState(null);
  const expenseInitial = { id: '', propertyId: data.properties[0]?.id || '', date: todayISO(), category: '', supplier: '', description: '', amount: '', recurring: false, paid: false };
  const contributionInitial = { id: '', propertyId: data.properties[0]?.id || '', year: new Date().getFullYear().toString(), quota: '', dueDate: '', amount: '', paidDate: '', status: 'pending', notes: '' };
  return <div className="two-col align-start">
    <CrudLayout title="Nuevo gasto" form={<ExpenseForm data={data} initial={expenseEditing || expenseInitial} onCancel={() => setExpenseEditing(null)} onSave={(item) => { updateCollection('expenses', { ...item, id: item.id || uid(), amount: toNumber(item.amount) }); setExpenseEditing(null); }} />}>
      <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Rol</th><th>Categoría</th><th>Monto</th><th>Pagado</th><th></th></tr></thead><tbody>{data.expenses.map((e) => <tr key={e.id}><td>{dateLabel(e.date)}</td><td>{lookups.propertyById[e.propertyId]?.role || '—'}</td><td>{e.category || e.description}</td><td>{currency(e.amount)}</td><td>{e.paid ? 'Sí' : 'No'}</td><td><RecordActions compact onEdit={() => setExpenseEditing(e)} onDelete={() => deleteFromCollection('expenses', e.id)} /></td></tr>)}</tbody></table></div>
    </CrudLayout>
    <CrudLayout title="Nueva contribución" form={<ContributionForm data={data} initial={contributionEditing || contributionInitial} onCancel={() => setContributionEditing(null)} onSave={(item) => { updateCollection('contributions', { ...item, id: item.id || uid(), amount: toNumber(item.amount) }); setContributionEditing(null); }} />}>
      <div className="table-wrap"><table><thead><tr><th>Año</th><th>Cuota</th><th>Rol</th><th>Vence</th><th>Monto</th><th>Estado</th><th></th></tr></thead><tbody>{data.contributions.map((c) => <tr key={c.id} className={c.status !== 'paid' && daysUntil(c.dueDate) <= 0 ? 'danger-row' : ''}><td>{c.year}</td><td>{c.quota}</td><td>{lookups.propertyById[c.propertyId]?.role || '—'}</td><td>{dateLabel(c.dueDate)}</td><td>{currency(c.amount)}</td><td>{statusLabel[c.status] || c.status}</td><td><RecordActions compact onEdit={() => setContributionEditing(c)} onDelete={() => deleteFromCollection('contributions', c.id)} /></td></tr>)}</tbody></table></div>
    </CrudLayout>
  </div>;
}

function ExpenseForm({ data, initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  return <FormShell onSubmit={() => onSave(form)} onCancel={onCancel} isEditing={Boolean(initial.id)}>
    <label className="field"><span>Rol / propiedad</span><select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}>{data.properties.map((p) => <option key={p.id} value={p.id}>{p.role} · {p.address}</option>)}</select></label>
    <Field label="Fecha" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
    <Field label="Categoría" value={form.category} onChange={(v) => setForm({ ...form, category: v })} placeholder="GC, reparación, seguro, abogado..." />
    <Field label="Proveedor" value={form.supplier} onChange={(v) => setForm({ ...form, supplier: v })} />
    <Field label="Descripción" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
    <Field label="Monto" type="number" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} />
    <label className="check"><input type="checkbox" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })} /> Recurrente</label>
    <label className="check"><input type="checkbox" checked={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.checked })} /> Pagado</label>
  </FormShell>;
}

function ContributionForm({ data, initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  return <FormShell onSubmit={() => onSave(form)} onCancel={onCancel} isEditing={Boolean(initial.id)}>
    <label className="field"><span>Rol / propiedad</span><select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}>{data.properties.map((p) => <option key={p.id} value={p.id}>{p.role} · {p.address}</option>)}</select></label>
    <Field label="Año" value={form.year} onChange={(v) => setForm({ ...form, year: v })} />
    <Field label="Cuota" value={form.quota} onChange={(v) => setForm({ ...form, quota: v })} />
    <Field label="Fecha vencimiento" type="date" value={form.dueDate} onChange={(v) => setForm({ ...form, dueDate: v })} />
    <Field label="Monto" type="number" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} />
    <Field label="Fecha pago" type="date" value={form.paidDate} onChange={(v) => setForm({ ...form, paidDate: v })} />
    <label className="field"><span>Estado</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="pending">Pendiente</option><option value="paid">Pagado</option><option value="late">Moroso</option></select></label>
    <Field label="Notas" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} textarea />
  </FormShell>;
}

function Reports({ data, lookups, reports, month }) {
  const exportLate = () => {
    const rows = reports.latePayments.map((p) => ({ mes: p.month, arrendatario: p.tenant?.name, rol: p.property?.role, direccion: p.property?.address, vencimiento: p.dueDate, esperado: p.amountDue, pagado: p.amountPaid, deuda: p.debt, estado: statusLabel[p.status] || p.status }));
    downloadText(`morosidad-${todayISO()}.csv`, toCsv(rows), 'text/csv;charset=utf-8');
  };
  const exportAll = () => {
    const rows = data.properties.map((p) => {
      const activeContract = data.contracts.find((c) => c.propertyId === p.id && c.status === 'active');
      const tenant = lookups.tenantById[activeContract?.tenantId];
      const paid = data.payments.filter((pay) => pay.propertyId === p.id).reduce((s, pay) => s + Number(pay.amountPaid || 0), 0);
      const expenses = data.expenses.filter((e) => e.propertyId === p.id).reduce((s, e) => s + Number(e.amount || 0), 0);
      return { rol: p.role, direccion: p.address, comuna: p.commune, grupo: p.group, arrendatario: tenant?.name || '', renta: activeContract?.rentAmount || p.expectedRent || 0, ingresos_pagados: paid, gastos: expenses, encargado: p.manager };
    });
    downloadText(`reporte-general-${todayISO()}.csv`, toCsv(rows), 'text/csv;charset=utf-8');
  };
  return <div className="grid gap">
    <div className="report-actions"><button className="secondary" onClick={exportLate}><Download size={16} /> Exportar morosidad CSV</button><button className="secondary" onClick={exportAll}><Download size={16} /> Exportar reporte general CSV</button><button className="secondary" onClick={() => window.print()}><FileText size={16} /> Imprimir / PDF</button></div>
    <div className="two-col align-start">
      <Card title="Morosidad y pagos parciales" icon={<AlertTriangle />}>
        <div className="table-wrap"><table><thead><tr><th>Arrendatario</th><th>Rol</th><th>Mes</th><th>Vence</th><th>Deuda</th><th>Estado</th></tr></thead><tbody>{reports.latePayments.map((p) => <tr key={p.id} className="danger-row"><td>{p.tenant?.name || '—'}</td><td>{p.property?.role || '—'}</td><td>{monthLabel(p.month)}</td><td>{dateLabel(p.dueDate)}</td><td>{currency(p.debt)}</td><td>{statusLabel[p.status] || p.status}</td></tr>)}</tbody></table>{!reports.latePayments.length && <Empty text="Sin morosidad registrada." />}</div>
      </Card>
      <Card title={`Contratos activos sin cobro generado en ${monthLabel(month)}`} icon={<WalletCards />}>
        <div className="table-wrap"><table><thead><tr><th>Arrendatario</th><th>Rol</th><th>Renta esperada</th></tr></thead><tbody>{reports.missingCurrentMonth.map((m) => <tr key={m.contract.id}><td>{m.tenant?.name || '—'}</td><td>{m.property?.role || '—'}</td><td>{currency(m.amountDue)}</td></tr>)}</tbody></table>{!reports.missingCurrentMonth.length && <Empty text="Todos los contratos activos tienen cobro generado para este mes." />}</div>
      </Card>
    </div>
    <div className="two-col align-start">
      <Card title="Vencimientos de contratos" icon={<CalendarClock />}>
        <div className="table-wrap"><table><thead><tr><th>Arrendatario</th><th>Rol</th><th>Vence</th><th>Días</th></tr></thead><tbody>{reports.contractAlerts.map((c) => <tr key={c.id} className={c.days < 0 ? 'danger-row' : 'warning-row'}><td>{c.tenant?.name || '—'}</td><td>{c.property?.role || '—'}</td><td>{dateLabel(c.endDate)}</td><td>{c.days}</td></tr>)}</tbody></table>{!reports.contractAlerts.length && <Empty text="Sin contratos próximos a vencer." />}</div>
      </Card>
      <Card title="Vencimientos de pólizas y contribuciones" icon={<ShieldCheck />}>
        <div className="table-wrap"><table><thead><tr><th>Tipo</th><th>Rol</th><th>Detalle</th><th>Vence</th><th>Días</th></tr></thead><tbody>{reports.policyAlerts.map((p) => <tr key={p.id} className={p.days < 0 ? 'danger-row' : 'warning-row'}><td>Póliza</td><td>{p.property?.role || '—'}</td><td>{p.insurer}</td><td>{dateLabel(p.endDate)}</td><td>{p.days}</td></tr>)}{reports.contributionAlerts.map((c) => <tr key={c.id} className={c.days < 0 ? 'danger-row' : 'warning-row'}><td>Contribución</td><td>{c.property?.role || '—'}</td><td>Cuota {c.quota}</td><td>{dateLabel(c.dueDate)}</td><td>{c.days}</td></tr>)}</tbody></table>{!reports.policyAlerts.length && !reports.contributionAlerts.length && <Empty text="Sin vencimientos próximos." />}</div>
      </Card>
    </div>
    <Card title="Gastos acumulados por rol" icon={<Receipt />}>
      <div className="table-wrap"><table><thead><tr><th>Rol</th><th>Dirección</th><th>N° gastos</th><th>Total</th></tr></thead><tbody>{reports.expensesByRole.map((r) => <tr key={r.role}><td>{r.role}</td><td>{r.address}</td><td>{r.count}</td><td>{currency(r.amount)}</td></tr>)}</tbody></table>{!reports.expensesByRole.length && <Empty text="No hay gastos con los filtros actuales." />}</div>
    </Card>
  </div>;
}

function Backup({ data, exportBackup, importBackup, setData }) {
  return <div className="two-col align-start">
    <Card title="Respaldo de datos" icon={<Archive />}>
      <p>Exporta la información principal en formato JSON. Los PDFs están guardados en IndexedDB del navegador; para respaldo multiusuario real se recomienda conectar almacenamiento externo.</p>
      <div className="button-row"><button className="primary" onClick={exportBackup}><Download size={16} /> Descargar respaldo JSON</button><label className="upload-button inline"><Upload size={16} /> Importar JSON<input type="file" accept="application/json" onChange={importBackup} /></label></div>
    </Card>
    <Card title="Zona de administración" icon={<AlertTriangle />}>
      <p>Acciones sensibles para limpiar o reiniciar la aplicación.</p>
      <button className="danger" onClick={() => confirm('Esto borrará todos los datos de esta app en este navegador. ¿Continuar?') && setData(emptyData)}><X size={16} /> Borrar datos locales</button>
    </Card>
  </div>;
}

function CrudLayout({ title, form, children }) {
  const [open, setOpen] = useState(true);
  return <div className="crud-layout">
    <Card title={title} icon={<Plus />} actions={<button className="secondary" onClick={() => setOpen(!open)}>{open ? 'Ocultar formulario' : 'Mostrar formulario'}</button>}>
      {open && form}
    </Card>
    <div>{children}</div>
  </div>;
}

function FormShell({ children, onSubmit, onCancel, isEditing }) {
  return <form className="form-grid" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
    {children}
    <div className="form-actions full"><button type="submit" className="primary"><CheckCircle2 size={16} /> {isEditing ? 'Guardar cambios' : 'Crear registro'}</button>{isEditing && <button type="button" className="secondary" onClick={onCancel}>Cancelar edición</button>}</div>
  </form>;
}

function Field({ label, value, onChange, type = 'text', required = false, placeholder = '', textarea = false }) {
  return <label className={`field ${textarea ? 'full' : ''}`}><span>{label}</span>{textarea ? <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /> : <input type={type} required={required} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />}</label>;
}

function RecordActions({ onEdit, onDelete, compact = false }) {
  return <div className={`record-actions ${compact ? 'compact-actions' : ''}`}><button className="secondary" onClick={onEdit}>Editar</button><button className="ghost-danger" onClick={onDelete}>Eliminar</button></div>;
}

function Badge({ children, tone }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

createRoot(document.getElementById('root')).render(<App />);
