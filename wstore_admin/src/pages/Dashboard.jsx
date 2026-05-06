import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ShoppingCart, Users, TrendingUp, IndianRupee, Star, Clock, CheckCircle, Truck, AlertCircle, PieChart as PieIcon, BarChart as BarIcon, Save, Key, Phone, Settings2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function Dashboard() {
    const [analytics, setAnalytics] = useState(null);
    const [tenant, setTenant] = useState(null);
    const [stats, setStats] = useState({ categories: 0, products: 0 });
    const [configForm, setConfigForm] = useState({ wabaId: '', phoneNumberId: '', whatsappToken: '', displayMode: 'catalog' });
    const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
    const navigate = useNavigate();

    const fetchDashboardData = async () => {
        const branchId = localStorage.getItem('selectedBranchId') || '';
        const branchParam = branchId ? `&branchId=${branchId}` : '';
        try {
            const [counts, anaRes] = await Promise.all([
                fetch(`${API_ENDPOINTS.ANALYTICS}?${branchParam.replace('&', '')}`, { headers: getHeaders() }),
                fetch(`${API_ENDPOINTS.CATEGORIES}?${branchParam.replace('&', '')}`, { headers: getHeaders() })
            ]);

            if (counts.status === 401) return navigate('/login');

            const anaData = await counts.json();
            const catData = await anaRes.json();

            setAnalytics(anaData);
            setStats({
                categories: catData.total || catData.length,
                products: anaData.totalProducts || 0 // We'll get products from another fetch or internal
            });

            // Simple fetch for product count if needed, or just use analytics
            const prodRes = await fetch(`${API_ENDPOINTS.PRODUCTS}?limit=1${branchParam}`, { headers: getHeaders() });
            const prodData = await prodRes.json();
            setStats(prev => ({ ...prev, products: prodData.total }));

            // Fetch Tenant Details if not superadmin
            if (localStorage.getItem('adminRole') !== 'superadmin') {
                const tRes = await fetch(`${API_ENDPOINTS.TENANTS}/me`, { headers: getHeaders() });
                if (tRes.ok) {
                    const tData = await tRes.json();
                    setTenant(tData);
                    setConfigForm({
                        wabaId: tData.wabaId || '',
                        phoneNumberId: tData.phoneNumberId || '',
                        whatsappToken: tData.whatsappToken || '',
                        displayMode: tData.displayMode || 'catalog'
                    });
                }
            }

        } catch (e) {
            console.error(e);
        }
    };

    const handleUpdateConfig = async (e) => {
        e.preventDefault();
        setIsUpdatingConfig(true);
        try {
            const tId = tenant?.id;
            const res = await fetch(`${API_ENDPOINTS.TENANTS}/${tId}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(configForm)
            });
            if (res.ok) {
                alert('WhatsApp configuration updated successfully!');
                const updated = await res.json();
                setTenant(updated);
            } else {
                const err = await res.json();
                alert('Error: ' + (err.error || 'Failed to update configuration'));
            }
        } catch (err) {
            alert('Error updating configuration.');
        } finally {
            setIsUpdatingConfig(false);
        }
    };

    useEffect(() => { fetchDashboardData(); }, []);

    if (!analytics) return <div className="loading-content">Loading Intelligence...</div>;

    const branchId = localStorage.getItem('selectedBranchId');
    const branchName = localStorage.getItem('branchName') || 'All Branches';
    const displayBranchName = branchId ? branchName : 'All Branches';

    return (
        <div className="dashboard-content">
            <section className="hero-banner">
                <div style={{ position: 'relative', zIndex: 10 }}>
                    <p style={{ fontSize: '14px', marginBottom: '8px', opacity: 0.9 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                    <h1>Good morning, {localStorage.getItem('adminName')?.split(' ')[0] || 'Admin'}</h1>
                    <p>Here's what's happening with your store today.</p>
                </div>

                <div className="hero-stats-grid">
                    <div className="glass-stat-card">
                        <label><IndianRupee size={14} /> REVENUE</label>
                        <div className="value">₹{analytics.revenue.toLocaleString()}</div>
                        <div className="trend" style={{ color: '#4ade80' }}><TrendingUp size={12} /> +12.4% vs last month</div>
                    </div>
                    <div className="glass-stat-card">
                        <label><ShoppingCart size={14} /> TOTAL ORDERS</label>
                        <div className="value">{analytics.totalOrders}</div>
                        <div className="trend" style={{ color: '#4ade80' }}><TrendingUp size={12} /> +8.2% vs last month</div>
                    </div>
                    <div className="glass-stat-card">
                        <label><Users size={14} /> ACTIVE CUSTOMERS</label>
                        <div className="value">{analytics.totalCustomers}</div>
                        <div className="trend" style={{ color: '#fbbf24' }}><TrendingUp size={12} /> +5.1% vs last month</div>
                    </div>
                    <div className="glass-stat-card">
                        <label><Star size={14} /> AVG. ORDER VALUE</label>
                        <div className="value">₹{Math.round(analytics.aov)}</div>
                        <div className="trend" style={{ color: '#4ade80' }}><TrendingUp size={12} /> +2.4% vs last month</div>
                    </div>
                </div>
            </section>

            <div className="dashboard-grid">
                <div className="main-stats">
                    <div className="white-card">
                        <div className="card-header">
                            <div>
                                <h3>Revenue Growth</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Monthly recurring revenue trend</p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }}>Weekly</button>
                                <button className="btn-outline" style={{ padding: '6px 12px', fontSize: '12px', background: '#f1f5f9' }}>Monthly</button>
                            </div>
                        </div>
                        <div style={{ width: '100%', height: 320 }}>
                            <ResponsiveContainer>
                                <AreaChart data={analytics.trend}>
                                    <defs>
                                        <linearGradient id="colorRevFlux" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ background: 'white', borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)' }}
                                        formatter={(val) => [`₹${val}`, 'Revenue']}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorRevFlux)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="white-card" style={{ marginTop: '32px' }}>
                        <div className="card-header">
                            <h3>Recent Orders</h3>
                            <button className="btn-outline" style={{ fontSize: '12px' }} onClick={() => navigate('/admin/orders')}>View All</button>
                        </div>
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Order</th>
                                    <th>Customer</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analytics.recentOrders.map(order => (
                                    <tr key={order.id}>
                                        <td style={{ fontWeight: 700 }}>#{order.id}</td>
                                        <td>{order.customerPhone}</td>
                                        <td style={{ fontWeight: 600 }}>₹{order.total}</td>
                                        <td>
                                            <span className={`status-pill ${order.status === 'delivered' ? 'success' : order.status === 'pending' ? 'warning' : 'info'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="side-panels">
                    <div className="white-card sprint-card">
                        <div className="card-header">
                            <div>
                                <h3 style={{ fontSize: '16px' }}>Order Fulfillment</h3>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Active queue processing</p>
                            </div>
                        </div>
                        <div className="progress-stack">
                            <div className="progress-segment" style={{ width: '65%', background: 'var(--accent)' }}></div>
                            <div className="progress-segment" style={{ width: '20%', background: '#38bdf8' }}></div>
                            <div className="progress-segment" style={{ width: '15%', background: '#fbbf24' }}></div>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', fontSize: '11px', color: 'var(--text-muted)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }}></div> Shipped</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }}></div> Pending</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24' }}></div> Alert</div>
                        </div>
                    </div>

                    <div className="white-card">
                        <div className="card-header">
                            <h3 style={{ fontSize: '16px' }}>Order Breakdown</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {[
                                { label: 'Delivered', count: analytics.statusCounts?.delivered || 0, color: '#10b981', bg: '#dcfce7' },
                                { label: 'Shipped', count: analytics.statusCounts?.shipped || 0, color: '#6366f1', bg: '#e0e7ff' },
                                { label: 'Pending', count: analytics.statusCounts?.pending || 0, color: '#f59e0b', bg: '#fef9c3' },
                                { label: 'Cancelled', count: analytics.statusCounts?.cancelled || 0, color: '#ef4444', bg: '#fee2e2' },
                            ].map(item => (
                                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ width: '40px', height: '40px', background: item.bg, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', color: item.color }}>{item.count}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{item.label}</div>
                                        <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', background: item.color, borderRadius: '3px', width: `${analytics.totalOrders > 0 ? Math.round((item.count / analytics.totalOrders) * 100) : 0}%`, transition: 'width 0.5s ease' }}></div>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, minWidth: '36px', textAlign: 'right' }}>{analytics.totalOrders > 0 ? Math.round((item.count / analytics.totalOrders) * 100) : 0}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="white-card" style={{ marginTop: '32px' }}>
                        <h3 style={{ fontSize: '16px', marginBottom: '20px' }}>Quick Actions</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {[
                                { label: 'Create Order', icon: ShoppingCart, path: '/admin/orders', color: '#6366f1' },
                                { label: 'Add Product', icon: ShoppingBag, path: '/admin/products', color: '#10b981' },
                                { label: 'View Customers', icon: Users, path: '/admin/customers', color: '#f59e0b' },
                                { label: 'Check Inventory', icon: AlertCircle, path: '/admin/inventory', color: '#ef4444' },
                            ].map(action => {
                                const Icon = action.icon;
                                return (
                                    <button
                                        key={action.label}
                                        onClick={() => navigate(action.path)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '14px',
                                            padding: '14px 16px', borderRadius: '14px',
                                            background: 'var(--bg-app)', border: '1px solid var(--border-color)',
                                            cursor: 'pointer', transition: 'all 0.2s',
                                            fontWeight: 600, fontSize: '14px', color: 'var(--text-main)', width: '100%', textAlign: 'left'
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = action.color; e.currentTarget.style.background = 'white'; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-app)'; }}
                                    >
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${action.color}15`, color: action.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Icon size={18} />
                                        </div>
                                        {action.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Low Stock Alerts */}
            {analytics.lowStock && analytics.lowStock.length > 0 && (
                <div className="white-card" style={{ marginTop: '32px' }}>
                    <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', background: '#fef2f2', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <h3>Low Stock Alerts</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{analytics.lowStock.length} products need attention</p>
                            </div>
                        </div>
                        <button className="btn-outline" style={{ fontSize: '12px' }} onClick={() => navigate('/admin/inventory')}>Manage Inventory</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                        {analytics.lowStock.slice(0, 8).map(item => (
                            <div key={item.id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '14px 16px', background: 'var(--bg-app)', borderRadius: '12px',
                                border: `1px solid ${item.stock === 0 ? '#fee2e2' : 'var(--border-color)'}`
                            }}>
                                <span style={{ fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{item.name}</span>
                                <span style={{
                                    fontWeight: 800, fontSize: '13px',
                                    color: item.stock === 0 ? '#ef4444' : '#f59e0b',
                                    background: item.stock === 0 ? '#fef2f2' : '#fefce8',
                                    padding: '4px 10px', borderRadius: '8px'
                                }}>{item.stock === 0 ? 'OUT' : item.stock}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* WhatsApp Configuration - Tenant/Branch only */}
            {tenant && localStorage.getItem('adminRole') !== 'superadmin' && (
                <div className="white-card" style={{ marginTop: '32px' }}>
                    <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', background: '#dcfce7', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                                <Phone size={20} />
                            </div>
                            <div>
                                <h3>WhatsApp Configuration</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>Manage your Meta Business API credentials</p>
                            </div>
                        </div>
                    </div>
                    <form onSubmit={handleUpdateConfig}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="input-group">
                                <label>WABA ID</label>
                                <input
                                    type="text"
                                    placeholder="WhatsApp Business Account ID"
                                    value={configForm.wabaId}
                                    onChange={e => setConfigForm({ ...configForm, wabaId: e.target.value })}
                                />
                            </div>
                            <div className="input-group">
                                <label>Phone Number ID</label>
                                <input
                                    type="text"
                                    placeholder="Meta Phone Number ID"
                                    value={configForm.phoneNumberId}
                                    onChange={e => setConfigForm({ ...configForm, phoneNumberId: e.target.value })}
                                />
                            </div>
                            <div className="input-group" style={{ gridColumn: 'span 2' }}>
                                <label>Access Token</label>
                                <input
                                    type="password"
                                    placeholder="Meta permanent access token"
                                    value={configForm.whatsappToken}
                                    onChange={e => setConfigForm({ ...configForm, whatsappToken: e.target.value })}
                                />
                            </div>
                            <div className="input-group">
                                <label>Display Mode</label>
                                <select
                                    value={configForm.displayMode}
                                    onChange={e => setConfigForm({ ...configForm, displayMode: e.target.value })}
                                >
                                    <option value="catalog">Catalog (Native WhatsApp)</option>
                                    <option value="list">List (Interactive Messages)</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="submit" className="btn-primary" disabled={isUpdatingConfig}>
                                <Save size={16} /> {isUpdatingConfig ? 'Saving...' : 'Save Configuration'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
