import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Users, CheckSquare, Square, MessageSquare, History, ShoppingBag, X } from 'lucide-react';
import Pagination from '../components/Pagination';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function Customers() {
    const [customers, setCustomers] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [selectedPhones, setSelectedPhones] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyOrders, setHistoryOrders] = useState([]);
    const [logsOpen, setLogsOpen] = useState(false);
    const [activityLogs, setActivityLogs] = useState([]);
    const [activeCustomer, setActiveCustomer] = useState(null);
    const [broadcastMsg, setBroadcastMsg] = useState('');
    const [sending, setSending] = useState(false);
    const navigate = useNavigate();

    const fetchCustomers = async (page = 1) => {
        const branchId = localStorage.getItem('selectedBranchId') || '';
        const res = await fetch(`${API_ENDPOINTS.CUSTOMERS}?page=${page}&limit=10&branchId=${branchId}`, {
            headers: getHeaders()
        });
        if (res.status === 401) return navigate('/login');
        const result = await res.json();
        setCustomers(result.data);
        setPagination({ page: result.page, totalPages: result.totalPages });
    };

    const fetchHistory = async (customer) => {
        const res = await fetch(`${API_ENDPOINTS.CUSTOMERS}/${customer.phone}/orders`, {
            headers: getHeaders()
        });
        const data = await res.json();
        setHistoryOrders(data);
        setActiveCustomer(customer);
        setHistoryOpen(true);
    };

    const fetchLogs = async (customer) => {
        const res = await fetch(`${API_ENDPOINTS.CUSTOMERS}/${customer.phone}/logs`, {
            headers: getHeaders()
        });
        const data = await res.json();
        setActivityLogs(data);
        setActiveCustomer(customer);
        setLogsOpen(true);
    };

    useEffect(() => { fetchCustomers(); }, []);

    const formatLogDetails = (log) => {
        const { details, actionType } = log;
        if (!details) return '';
        
        switch(actionType) {
            case 'CATEGORY_VIEWED':
                return <span>Viewing Category: <strong>{details.categoryName || `ID: ${details.categoryId}`}</strong></span>;
            case 'PRODUCT_VIEWED':
                return <span>Viewing Product: <strong>{details.productName || `ID: ${details.productId}`}</strong></span>;
            case 'ADDED_TO_CART':
                return <span>Added to Cart: <strong>{details.productName || `ID: ${details.productId}`}</strong></span>;
            case 'CHECKOUT':
                return details.type === 'native_order' ? 'Started Native WhatsApp Checkout' : 'Initiated Checkout';
            case 'SEARCHED':
                return <span>Searched for: "<strong>{details.query}</strong>"</span>;
            case 'MENU_VIEWED':
                return 'Opened Main Menu';
            case 'SHOP_VIEWED':
                return 'Opened Category List';
            default:
                return JSON.stringify(details) === '{}' ? 'No extra details' : JSON.stringify(details);
        }
    };

    const toggleSelect = (phone) => {
        if (selectedPhones.includes(phone)) {
            setSelectedPhones(selectedPhones.filter(p => p !== phone));
        } else {
            setSelectedPhones([...selectedPhones, phone]);
        }
    };

    const toggleAll = () => {
        if (selectedPhones.length === customers.length) {
            setSelectedPhones([]);
        } else {
            setSelectedPhones(customers.map(c => c.phone));
        }
    };

    const handleBroadcast = async (e) => {
        e.preventDefault();
        if (selectedPhones.length === 0) return alert('Select at least one customer');
        setSending(true);

        try {
            const res = await fetch(API_ENDPOINTS.BROADCAST, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ phones: selectedPhones, message: broadcastMsg })
            });
            const result = await res.json();
            alert(`Sent to ${result.successCount} customers. Failed for ${result.failCount}.`);
            setModalOpen(false);
            setBroadcastMsg('');
            setSelectedPhones([]);
        } catch (e) {
            alert('Broadcast failed');
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            <header className="top-header">
                <h1>Customers</h1>
            </header>
            <div className="content-view active">
                <div className="action-bar">
                    <button 
                        className="btn-primary" 
                        disabled={selectedPhones.length === 0}
                        onClick={() => setModalOpen(true)}
                    >
                        <Send size={18}/> Send Promotion ({selectedPhones.length})
                    </button>
                    <button className="btn-outline" onClick={toggleAll}>
                        {selectedPhones.length === customers.length ? <CheckSquare size={18}/> : <Square size={18}/>}
                        <span>{selectedPhones.length === customers.length ? 'Deselect All' : 'Select All on Page'}</span>
                    </button>
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th style={{width: '40px'}}>#</th>
                                <th>Phone</th>
                                <th>Name</th>
                                <th>Last Interaction</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                                        <div style={{ color: 'var(--text-muted)' }}><Users size={48} style={{ opacity: 0.5, marginBottom: '16px' }} /> <p>No customers found yet.</p></div>
                                    </td>
                                </tr>
                            ) : customers.map(cust => (
                                <tr key={cust.id} onClick={() => toggleSelect(cust.phone)} className={selectedPhones.includes(cust.phone) ? 'row-selected' : ''} style={{cursor: 'pointer'}}>
                                    <td>
                                        {selectedPhones.includes(cust.phone) ? <CheckSquare size={18} className="text-accent" /> : <Square size={18} />}
                                    </td>
                                    <td>{cust.phone}</td>
                                    <td>{cust.name || 'Anonymous'}</td>
                                    <td>{new Date(cust.lastInteraction).toLocaleString()}</td>
                                    <td>
                                        <div style={{display: 'flex', gap: '8px'}}>
                                            <button className="action-btn" onClick={(e) => { e.stopPropagation(); setSelectedPhones([cust.phone]); setModalOpen(true); }}>Send Offer</button>
                                            <button className="action-btn" onClick={(e) => { e.stopPropagation(); fetchLogs(cust); }}><History size={14}/> Logs</button>
                                            <button className="action-btn edit" onClick={(e) => { e.stopPropagation(); fetchHistory(cust); }}><ShoppingBag size={14}/> Orders</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination 
                    currentPage={pagination.page} 
                    totalPages={pagination.totalPages} 
                    onPageChange={(page) => fetchCustomers(page)} 
                />
            </div>

            {modalOpen && (
                <div className="modal-overlay active">
                    <div className="modal">
                        <h3>Send Promotional Offer</h3>
                        <p style={{fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px'}}>
                            Sending to {selectedPhones.length} selected customers via WhatsApp.
                        </p>
                        <form onSubmit={handleBroadcast}>
                            <div className="input-group has-icon">
                                <label>Message Content</label>
                                <div className="input-wrapper">
                                    <MessageSquare className="input-icon align-top" size={18} />
                                    <textarea 
                                        rows="5" 
                                        placeholder="Write your promotional offer here..." 
                                        value={broadcastMsg} 
                                        onChange={e => setBroadcastMsg(e.target.value)} 
                                        required 
                                    />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={sending}>
                                    {sending ? 'Sending...' : 'Broadcast Offer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {historyOpen && (
                <div className="modal-overlay active">
                    <div className="modal" style={{maxWidth: '800px'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
                            <h3>Order History: {activeCustomer.name || activeCustomer.phone}</h3>
                            <button className="btn-outline" style={{padding: '8px'}} onClick={() => setHistoryOpen(false)}><X size={18}/></button>
                        </div>
                        
                        <div className="table-container" style={{maxHeight: '400px', overflowY: 'auto'}}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Order ID</th>
                                        <th>Items</th>
                                        <th>Total</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyOrders.length === 0 ? (
                                        <tr><td colSpan="5" style={{textAlign: 'center', padding: '20px'}}>No orders found for this customer.</td></tr>
                                    ) : historyOrders.map(order => (
                                        <tr key={order.id}>
                                            <td>#{order.id}</td>
                                            <td>
                                                {order.items.map((it, i) => (
                                                    <div key={i} style={{fontSize: '12px'}}>{it.name} x {it.quantity}</div>
                                                ))}
                                            </td>
                                            <td>₹{order.total}</td>
                                            <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                                            <td><span className={`badge ${order.status}`}>{order.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="modal-actions">
                            <button className="btn-primary" onClick={() => { setHistoryOpen(false); setSelectedPhones([activeCustomer.phone]); setModalOpen(true); }}>Send Direct Offer</button>
                        </div>
                    </div>
                </div>
            )}

            {logsOpen && (
                <div className="modal-overlay active">
                    <div className="modal" style={{maxWidth: '800px'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
                            <h3>Activity Logs: {activeCustomer.name || activeCustomer.phone}</h3>
                            <button className="btn-outline" style={{padding: '8px'}} onClick={() => setLogsOpen(false)}><X size={18}/></button>
                        </div>
                        
                        <div className="table-container" style={{maxHeight: '400px', overflowY: 'auto'}}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Action</th>
                                        <th>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activityLogs.length === 0 ? (
                                        <tr><td colSpan="3" style={{textAlign: 'center', padding: '20px'}}>No activity logged yet.</td></tr>
                                    ) : activityLogs.map(log => (
                                        <tr key={log.id}>
                                            <td style={{whiteSpace: 'nowrap'}}>{new Date(log.createdAt).toLocaleString()}</td>
                                            <td><span className="badge">{log.actionType}</span></td>
                                            <td style={{fontSize: '12px', wordBreak: 'break-all'}}>{formatLogDetails(log)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
