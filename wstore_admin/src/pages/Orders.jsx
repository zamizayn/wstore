import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageOpen, Plus, User, MapPin, Trash2, IndianRupee, Copy, Check, Eye, Search, Filter, Calendar, Clock, X } from 'lucide-react';
import Pagination from '../components/Pagination';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [copiedId, setCopiedId] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [addressModalOpen, setAddressModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState('');
    const [viewingOrder, setViewingOrder] = useState(null);
    const [products, setProducts] = useState([]);
    const [formData, setFormData] = useState({
        customerPhone: '',
        customerName: '',
        address: '',
        items: [],
        status: 'pending'
    });
    const [filters, setFilters] = useState({
        status: '',
        search: '',
        startDate: '',
        endDate: ''
    });
    const navigate = useNavigate();

    const fetchOrders = async (page = 1) => {
        const branchId = localStorage.getItem('selectedBranchId') || '';
        let url = `${API_ENDPOINTS.ORDERS}?page=${page}&limit=10&branchId=${branchId}`;

        if (filters.status) url += `&status=${filters.status}`;
        if (filters.search) url += `&search=${filters.search}`;
        if (filters.startDate) url += `&startDate=${filters.startDate}`;
        if (filters.endDate) url += `&endDate=${filters.endDate}`;

        const res = await fetch(url, {
            headers: getHeaders()
        });
        if (res.status === 401) return navigate('/login');
        const result = await res.json();
        setOrders(result.data);
        setPagination({ page: result.page, totalPages: result.totalPages });
    };

    const fetchProducts = async () => {
        const branchId = localStorage.getItem('selectedBranchId') || '';
        const res = await fetch(`${API_ENDPOINTS.PRODUCTS}?limit=100&branchId=${branchId}`, {
            headers: getHeaders()
        });
        const result = await res.json();
        setProducts(result.data || result);
    };

    useEffect(() => {
        fetchOrders();
        fetchProducts();
    }, [filters]);

    const handlePageChange = (newPage) => {
        fetchOrders(newPage);
    };

    const updateStatus = async (id, newStatus) => {
        await fetch(`${API_ENDPOINTS.ORDERS}/${id}/status`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ status: newStatus })
        });
        fetchOrders(pagination.page);
    };

    const addItem = (productId) => {
        const prod = products.find(p => p.id === parseInt(productId));
        if (!prod) return;

        const existing = formData.items.find(item => item.id === prod.id);
        if (existing) {
            setFormData({
                ...formData,
                items: formData.items.map(item => item.id === prod.id ? { ...item, quantity: item.quantity + 1 } : item)
            });
        } else {
            setFormData({
                ...formData,
                items: [...formData.items, {
                    id: prod.id,
                    name: prod.name,
                    price: prod.price,
                    quantity: 1,
                    categoryName: prod.category?.name || 'Uncategorized'
                }]
            });
        }
    };

    const updateQty = (id, delta) => {
        setFormData({
            ...formData,
            items: formData.items.map(item => {
                if (item.id === id) {
                    const newQty = Math.max(1, item.quantity + delta);
                    return { ...item, quantity: newQty };
                }
                return item;
            })
        });
    };

    const removeItem = (id) => {
        setFormData({
            ...formData,
            items: formData.items.filter(item => item.id !== id)
        });
    };

    const calculateTotal = () => {
        return formData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.items.length === 0) return alert('Please add at least one product');

        const total = calculateTotal();
        await fetch(API_ENDPOINTS.ORDERS, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ ...formData, total })
        });

        setModalOpen(false);
        setFormData({ customerPhone: '', customerName: '', address: '', items: [], status: 'pending' });
        fetchOrders();
    };

    const copyToClipboard = (text, id) => {
        const url = text.includes('map: ') ? text.split('map: ')[1].split(' |')[0] : text;
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <>
            <header className="top-header">
                <h1>Orders Log</h1>
            </header>
            <div className="content-view active">
                <div className="action-bar" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <button className="btn-primary" onClick={() => setModalOpen(true)}><Plus size={18} /> Create Manual Order</button>
                    </div>

                    <div className="filters-card">
                        <div className="filters-header">
                            <Filter size={16} className="vibrant-icon" />
                            <h3>Filter Orders</h3>
                        </div>
                        
                        <div className="filters-grid-modern">
                            <div className="filter-item-modern">
                                <label>SEARCH</label>
                                <div className="input-container-modern">
                                    <Search className="input-icon-modern" size={18} />
                                    <input 
                                        type="text"
                                        className="input-modern"
                                        placeholder="ID, name, or phone..."
                                        value={filters.search}
                                        onChange={e => setFilters({ ...filters, search: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="filter-item-modern small">
                                <label>STATUS</label>
                                <div className="input-container-modern">
                                    <Clock className="input-icon-modern" size={18} />
                                    <select 
                                        className="input-modern"
                                        style={{ appearance: 'none', paddingRight: '30px' }}
                                        value={filters.status}
                                        onChange={e => setFilters({ ...filters, status: e.target.value })}
                                    >
                                        <option value="">All Statuses</option>
                                        <option value="pending">Pending</option>
                                        <option value="shipped">Shipped</option>
                                        <option value="delivered">Delivered</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                            </div>

                            <div className="filter-item-modern">
                                <label>DATE RANGE</label>
                                <div className="date-range-group">
                                    <Calendar style={{ marginLeft: '12px', color: '#9ca3af' }} size={16} />
                                    <input 
                                        type="date"
                                        className="date-input-minimal"
                                        value={filters.startDate}
                                        onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                                    />
                                    <span className="date-separator">to</span>
                                    <input 
                                        type="date"
                                        className="date-input-minimal"
                                        value={filters.endDate}
                                        onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button 
                                className="btn-secondary-modern"
                                onClick={() => setFilters({ status: '', search: '', startDate: '', endDate: '' })}
                            >
                                <X size={16} /> Clear Filters
                            </button>
                        </div>
                    </div>
                </div>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Phone</th>
                                <th>Address</th>
                                <th>Total</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                                        <div style={{ color: 'var(--text-muted)' }}><PackageOpen size={48} style={{ opacity: 0.5, marginBottom: '16px' }} /> <p>No orders yet!</p></div>
                                    </td>
                                </tr>
                            ) : orders.map(order => (
                                <tr key={order.id}>
                                    <td>#{order.id}</td>
                                    <td>{order.customerPhone}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span
                                                style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--accent)' }}
                                                onClick={() => { setSelectedAddress(order.address); setAddressModalOpen(true); }}
                                            >
                                                {String(order.address).slice(0, 30)}...
                                            </span>
                                            {String(order.address).includes('map:') && (
                                                <button
                                                    className="action-btn"
                                                    style={{ padding: '4px', margin: 0, background: 'transparent', border: 'none' }}
                                                    onClick={() => copyToClipboard(order.address, order.id)}
                                                    title="Copy Map Link"
                                                >
                                                    {copiedId === order.id ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td>₹{order.total}</td>
                                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <select
                                            className={`status-select-inline ${order.status}`}
                                            value={order.status}
                                            onChange={(e) => updateStatus(order.id, e.target.value)}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="shipped">Shipped</option>
                                            <option value="delivered">Delivered</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button
                                            className="action-btn edit"
                                            onClick={() => { setViewingOrder(order); setViewModalOpen(true); }}
                                            title="View Details"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                />
            </div>

            {modalOpen && (
                <div className="modal-overlay active">
                    <div className="modal" style={{ maxWidth: '600px' }}>
                        <h3>Create Manual Order</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="input-group has-icon">
                                <label>Customer Phone</label>
                                <div className="input-wrapper">
                                    <User className="input-icon" size={18} />
                                    <input type="text" placeholder="e.g. 919876543210" value={formData.customerPhone} onChange={e => setFormData({ ...formData, customerPhone: e.target.value })} required />
                                </div>
                            </div>
                            <div className="input-group has-icon">
                                <label>Customer Name</label>
                                <div className="input-wrapper">
                                    <User className="input-icon" size={18} />
                                    <input type="text" placeholder="Optional name..." value={formData.customerName} onChange={e => setFormData({ ...formData, customerName: e.target.value })} />
                                </div>
                            </div>
                            <div className="input-group has-icon">
                                <label>Delivery Address</label>
                                <div className="input-wrapper">
                                    <MapPin className="input-icon align-top" size={18} />
                                    <textarea rows="2" placeholder="Full delivery address..." value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} required />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Add Products</label>
                                <select onChange={(e) => { if (e.target.value) addItem(e.target.value); e.target.value = ''; }}>
                                    <option value="">Select a product to add...</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name} - ₹{p.price}</option>)}
                                </select>
                            </div>

                            <div className="order-items-list">
                                {formData.items.map(item => (
                                    <div key={item.id} className="order-item-row">
                                        <div className="order-item-info">
                                            <strong>{item.name}</strong>
                                            <span>₹{item.price} per unit</span>
                                        </div>
                                        <div className="order-item-actions">
                                            <button type="button" className="action-btn" onClick={() => updateQty(item.id, -1)}>-</button>
                                            <input type="text" readOnly className="qty-input" value={item.quantity} />
                                            <button type="button" className="action-btn" onClick={() => updateQty(item.id, 1)}>+</button>
                                            <button type="button" className="action-btn delete" onClick={() => removeItem(item.id)}><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="total-summary">
                                <span>Grand Total:</span>
                                <strong>₹{calculateTotal()}</strong>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary"><IndianRupee size={18} /> Place Order</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {addressModalOpen && (
                <div className="modal-overlay active">
                    <div className="modal" style={{ maxWidth: '450px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <MapPin size={24} className="text-accent" />
                            <h3 style={{ margin: 0 }}>Full Delivery Address</h3>
                        </div>
                        <div style={{
                            padding: '20px',
                            background: 'rgba(0,0,0,0.02)',
                            borderRadius: '12px',
                            lineHeight: '1.6',
                            fontSize: '15px',
                            border: '1px solid var(--border)',
                            whiteSpace: 'pre-wrap'
                        }}>
                            {selectedAddress}
                        </div>
                        <div className="modal-actions" style={{ marginTop: '24px' }}>
                            <button className="btn-primary w-full" onClick={() => setAddressModalOpen(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {viewModalOpen && viewingOrder && (
                <div className="modal-overlay active">
                    <div className="modal" style={{ maxWidth: '650px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ margin: 0 }}>Order Details #{viewingOrder.id}</h3>
                            <span className={`badge ${viewingOrder.status}`}>{viewingOrder.status.toUpperCase()}</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                            <div className="detail-group">
                                <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Customer</label>
                                <div style={{ fontWeight: 600 }}>{viewingOrder.customerName || 'Walk-in Customer'}</div>
                                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{viewingOrder.customerPhone}</div>
                            </div>
                            <div className="detail-group">
                                <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Date</label>
                                <div style={{ fontWeight: 600 }}>{new Date(viewingOrder.createdAt).toLocaleString()}</div>
                            </div>
                        </div>

                        <div className="detail-group" style={{ marginBottom: '30px' }}>
                            <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Delivery Address</label>
                            <div style={{
                                padding: '12px',
                                background: 'rgba(0,0,0,0.02)',
                                borderRadius: '12px',
                                fontSize: '14px',
                                border: '1px solid var(--border)'
                            }}>{viewingOrder.address}</div>
                        </div>

                        <div className="detail-group">
                            <label style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Items Breakdown</label>
                            <div className="table-container" style={{ boxShadow: 'none', border: '1px solid var(--border)' }}>
                                <table style={{ fontSize: '14px' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                                            <th style={{ padding: '10px 16px' }}>Product</th>
                                            <th style={{ padding: '10px 16px', textAlign: 'center' }}>Qty</th>
                                            <th style={{ padding: '10px 16px', textAlign: 'right' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {viewingOrder.items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td style={{ padding: '10px 16px' }}>{item.name}</td>
                                                <td style={{ padding: '10px 16px', textAlign: 'center' }}>x{item.quantity}</td>
                                                <td style={{ padding: '10px 16px', textAlign: 'right' }}>₹{item.price * item.quantity}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px', padding: '20px 0', borderTop: '2px dashed var(--border)' }}>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Grand Total</div>
                                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent)' }}>₹{viewingOrder.total}</div>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="btn-primary w-full" onClick={() => setViewModalOpen(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
