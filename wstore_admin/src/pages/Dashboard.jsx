import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ShoppingCart, Users, TrendingUp, IndianRupee, Star, Clock, CheckCircle, Truck, AlertCircle, PieChart as PieIcon, BarChart as BarIcon } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function Dashboard() {
    const [analytics, setAnalytics] = useState(null);
    const [tenant, setTenant] = useState(null);
    const [stats, setStats] = useState({ categories: 0, products: 0 });
    const navigate = useNavigate();

    const fetchDashboardData = async () => {
        try {
            const [counts, anaRes] = await Promise.all([
                fetch(API_ENDPOINTS.ANALYTICS, { headers: getHeaders() }),
                fetch(API_ENDPOINTS.CATEGORIES, { headers: getHeaders() })
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
            const prodRes = await fetch(`${API_ENDPOINTS.PRODUCTS}?limit=1`, { headers: getHeaders() });
            const prodData = await prodRes.json();
            setStats(prev => ({ ...prev, products: prodData.total }));

            // Fetch Tenant Details if not superadmin
            if (localStorage.getItem('adminRole') !== 'superadmin') {
                const tRes = await fetch(`${API_ENDPOINTS.TENANTS}/me`, { headers: getHeaders() });
                if (tRes.ok) {
                    const tData = await tRes.json();
                    setTenant(tData);
                }
            }

        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => { fetchDashboardData(); }, []);

    if (!analytics) return <div className="loading-content">Loading Intelligence...</div>;

    const branchName = localStorage.getItem('branchName');

    return (
        <>
            <header className="top-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h1>Business Overview</h1>
                    <span className="badge" style={{ background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 'bold' }}>{branchName}</span>
                </div>
            </header>

            <div className="content-view active">
                {/* Webhook Status Alert for Tenants */}
                {localStorage.getItem('adminRole') === 'tenant' && tenant && !tenant.webhooksEnabled && (
                    <div className="alert-banner" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #F59E0B', padding: '20px', borderRadius: '16px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <div style={{ background: '#F59E0B', color: '#fff', padding: '12px', borderRadius: '12px' }}>
                                <AlertCircle size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, color: '#92400E' }}>WhatsApp Webhooks Disabled</h3>
                                <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#B45309' }}>You won't receive real-time order notifications until webhooks are enabled on Meta.</p>
                            </div>
                        </div>
                        <button
                            className="btn-primary"
                            style={{ background: '#F59E0B', boxShadow: 'none', width: 'auto' }}
                            onClick={async () => {
                                if (!confirm('Enable Meta Webhooks now? This will connect your messaging service.')) return;
                                const tId = localStorage.getItem('tenantId') || 'me';
                                const res = await fetch(`${API_ENDPOINTS.TENANTS}/${tId}/enable-webhooks`, {
                                    method: 'POST',
                                    headers: getHeaders(),
                                    body: JSON.stringify({
                                        wabaId: tenant.wabaId,
                                        whatsappToken: tenant.whatsappToken
                                    })
                                });
                                if (res.ok) {
                                    alert('Webhooks Active!');
                                    window.location.reload();
                                } else {
                                    const err = await res.json();
                                    alert('Error: ' + (err.error || 'Failed to enable'));
                                }
                            }}
                        >
                            Enable Now
                        </button>
                    </div>
                )}

                <div className="stats-grid">
                    <div className="stat-card premium">
                        <div className="icon-wrapper"><IndianRupee size={80} /></div>
                        <h3>Total Revenue</h3>
                        <p>₹{analytics.revenue.toLocaleString()}</p>
                        <div className="stat-label">Lifetime Earnings</div>
                    </div>
                    <div className="stat-card">
                        <div className="icon-wrapper"><TrendingUp size={80} /></div>
                        <h3>Avg. Order Value</h3>
                        <p>₹{Math.round(analytics.aov)}</p>
                        <div className="stat-label">Value per Basket</div>
                    </div>
                    <div className="stat-card">
                        <div className="icon-wrapper"><ShoppingCart size={80} /></div>
                        <h3>Total Orders</h3>
                        <p>{analytics.totalOrders}</p>
                        <div className="stat-label">Transactions logged</div>
                    </div>
                    <div className="stat-card">
                        <div className="icon-wrapper"><Users size={80} /></div>
                        <h3>Total Customers</h3>
                        <p>{analytics.totalCustomers}</p>
                        <div className="stat-label">Unique Interactions</div>
                    </div>
                    <div className="stat-card">
                        <div className="icon-wrapper"><Star size={80} /></div>
                        <h3>Retention Rate</h3>
                        <p>{analytics.retentionRate}%</p>
                        <div className="stat-label">Repeat Customers</div>
                    </div>
                    <div className="stat-card">
                        <div className="icon-wrapper"><PieIcon size={80} /></div>
                        <h3>Customer LTV</h3>
                        <p>₹{Math.round(analytics.clv)}</p>
                        <div className="stat-label">Avg. Lifetime Spend</div>
                    </div>
                </div>

                <div className="analytics-section">
                    <div className="chart-container">
                        <h3>Sales performance (Last 7 Days)</h3>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <AreaChart data={analytics.trend}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                                    <YAxis hide />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                        formatter={(val) => [`₹${val}`, 'Revenue']}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '32px' }}>
                            <div className="sub-chart">
                                <h3><PieIcon size={16} /> Revenue by Category</h3>
                                <div style={{ height: 200 }}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie
                                                data={analytics.categoryRevenue}
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {analytics.categoryRevenue.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#6366F1', '#10B981', '#F59E0B', '#EF4444'][index % 4]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="sub-chart">
                                <h3><BarIcon size={16} /> Orders by Hour</h3>
                                <div style={{ height: 200 }}>
                                    <ResponsiveContainer>
                                        <BarChart data={analytics.hourlyStats}>
                                            <XAxis dataKey="hour" hide />
                                            <Tooltip />
                                            <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="top-products-list">
                        <h3><Star size={18} /> Top Selling Products</h3>
                        <div className="product-ranking">
                            {analytics.topProducts.map((p, i) => (
                                <div key={i} className="rank-item">
                                    <div className="rank-num">{i + 1}</div>
                                    <div className="rank-info">
                                        <strong>{p.name}</strong>
                                        <span>{p.count} units sold</span>
                                    </div>
                                    <div className="rank-bar-bg">
                                        <div className="rank-bar-fill" style={{ width: `${(p.count / (analytics.topProducts[0]?.count || 1)) * 100}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <h3 style={{ marginTop: '40px' }}><TrendingUp size={18} /> Order Status</h3>
                        <div className="status-summary">
                            <div className="status-item pending">
                                <AlertCircle size={16} /> <span>Pending: {analytics.statusCounts.pending}</span>
                            </div>
                            <div className="status-item shipped">
                                <Truck size={16} /> <span>Shipped: {analytics.statusCounts.shipped}</span>
                            </div>
                            <div className="status-item delivered">
                                <CheckCircle size={16} /> <span>Delivered: {analytics.statusCounts.delivered}</span>
                            </div>
                        </div>

                        {analytics.lowStock?.length > 0 && (
                            <div className="low-stock-alert-panel" style={{ marginTop: '40px' }}>
                                <h3 style={{ color: 'var(--danger)' }}><AlertCircle size={18} /> Low Stock Alerts</h3>
                                <div className="product-ranking">
                                    {analytics.lowStock.map((p, i) => (
                                        <div key={i} className="rank-item">
                                            <div className="rank-num" style={{ color: 'var(--danger)' }}>{p.stock}</div>
                                            <div className="rank-info">
                                                <strong>{p.name}</strong>
                                                <span style={{ color: 'var(--danger)' }}>Action required</span>
                                            </div>
                                            <div className="rank-bar-bg">
                                                <div className="rank-bar-fill" style={{ width: `${(p.stock / 10) * 100}%`, background: 'var(--danger)' }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="recent-activity-section">
                    <h3><Clock size={18} /> Recent Orders</h3>
                    <div className="activity-list">
                        {analytics.recentOrders.length === 0 ? (
                            <p className="empty-msg">No recent activity found.</p>
                        ) : analytics.recentOrders.map(order => (
                            <div key={order.id} className="activity-item">
                                <div className={`activity-icon-bg ${order.status}`}>
                                    {order.status === 'delivered' ? <CheckCircle size={16} /> : order.status === 'shipped' ? <Truck size={16} /> : <ShoppingCart size={16} />}
                                </div>
                                <div className="activity-content">
                                    <div className="activity-main">
                                        <strong>Order #{order.id}</strong>
                                        <span>{order.customerPhone}</span>
                                    </div>
                                    <div className="activity-meta">
                                        <span>₹{order.total}</span>
                                        <span className="dot"></span>
                                        <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                                <div className={`activity-status ${order.status}`}>{order.status}</div>
                            </div>
                        ))}
                    </div>
                    <button className="btn-outline w-full" onClick={() => navigate('/orders')}>View All Orders</button>
                </div>
            </div>
        </>
    );
}
