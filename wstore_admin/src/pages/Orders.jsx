import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageOpen, Plus, User, MapPin, Trash2, IndianRupee, Copy, Check } from 'lucide-react';
import Pagination from '../components/Pagination';

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [copiedId, setCopiedId] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [addressModalOpen, setAddressModalOpen] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState('');
    const [products, setProducts] = useState([]);
    const [formData, setFormData] = useState({
        customerPhone: '',
        customerName: '',
        address: '',
        items: [],
        status: 'pending'
    });
    const navigate = useNavigate();

    const fetchOrders = async (page = 1) => {
        const res = await fetch(`/api/admin/orders?page=${page}&limit=10`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
        });
        if (res.status === 401) return navigate('/login');
        const result = await res.json();
        setOrders(result.data);
        setPagination({ page: result.page, totalPages: result.totalPages });
    };

    const fetchProducts = async () => {
        const res = await fetch('/api/admin/products?limit=100', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
        });
        const result = await res.json();
        setProducts(result.data || result);
    };

    useEffect(() => { 
        fetchOrders(); 
        fetchProducts();
    }, []);

    const handlePageChange = (newPage) => {
        fetchOrders(newPage);
    };

    const toggleStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'pending' ? 'shipped' : currentStatus === 'shipped' ? 'delivered' : 'pending';

        await fetch(`/api/admin/orders/${id}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                'Content-Type': 'application/json'
            },
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
        await fetch('/api/admin/orders', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                'Content-Type': 'application/json'
            },
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
                <div className="action-bar">
                    <button className="btn-primary" onClick={() => setModalOpen(true)}><Plus size={18}/> Create Manual Order</button>
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
                                <th>Action</th>
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
                                        <span className={`badge ${order.status}`}>{order.status}</span>
                                    </td>
                                    <td>
                                        <button className="action-btn edit" onClick={() => toggleStatus(order.id, order.status)}>Toggle Status</button>
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
                    <div className="modal" style={{maxWidth: '600px'}}>
                        <h3>Create Manual Order</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="input-group has-icon">
                                <label>Customer Phone</label>
                                <div className="input-wrapper">
                                    <User className="input-icon" size={18} />
                                    <input type="text" placeholder="e.g. 919876543210" value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} required />
                                </div>
                            </div>
                            <div className="input-group has-icon">
                                <label>Customer Name</label>
                                <div className="input-wrapper">
                                    <User className="input-icon" size={18} />
                                    <input type="text" placeholder="Optional name..." value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
                                </div>
                            </div>
                            <div className="input-group has-icon">
                                <label>Delivery Address</label>
                                <div className="input-wrapper">
                                    <MapPin className="input-icon align-top" size={18} />
                                    <textarea rows="2" placeholder="Full delivery address..." value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Add Products</label>
                                <select onChange={(e) => { if(e.target.value) addItem(e.target.value); e.target.value = ''; }}>
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
                                            <button type="button" className="action-btn delete" onClick={() => removeItem(item.id)}><Trash2 size={14}/></button>
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
                                <button type="submit" className="btn-primary"><IndianRupee size={18}/> Place Order</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {addressModalOpen && (
                <div className="modal-overlay active">
                    <div className="modal" style={{maxWidth: '450px'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px'}}>
                            <MapPin size={24} className="text-accent" />
                            <h3 style={{margin: 0}}>Full Delivery Address</h3>
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
                        <div className="modal-actions" style={{marginTop: '24px'}}>
                            <button className="btn-primary w-full" onClick={() => setAddressModalOpen(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
