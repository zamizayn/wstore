import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, AlertTriangle, Plus, Minus, ArrowRightLeft } from 'lucide-react';
import Pagination from '../components/Pagination';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function Inventory() {
    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [lowStockOnly, setLowStockOnly] = useState(false);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [adjustmentType, setAdjustmentType] = useState('add'); // 'add' or 'deduct'
    const [adjustmentAmount, setAdjustmentAmount] = useState('');

    const navigate = useNavigate();

    const fetchInventory = async (page = 1) => {
        const branchId = localStorage.getItem('selectedBranchId') || '';
        const res = await fetch(`${API_ENDPOINTS.PRODUCTS}?page=${page}&limit=10&branchId=${branchId}`, { headers: getHeaders() });
        if (res.status === 401) return navigate('/login');
        const result = await res.json();
        setProducts(result.data);
        setPagination({ page: result.page, totalPages: result.totalPages });
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    const handlePageChange = (newPage) => {
        fetchInventory(newPage);
    };

    const openAdjustModal = (product) => {
        setSelectedProduct(product);
        setAdjustmentType('add');
        setAdjustmentAmount('');
        setModalOpen(true);
    };

    const handleAdjustStock = async (e) => {
        e.preventDefault();
        if (!selectedProduct) return;

        const amount = parseInt(adjustmentAmount, 10);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount greater than 0');
            return;
        }

        let newStock = selectedProduct.stock;
        if (adjustmentType === 'add') {
            newStock += amount;
        } else {
            newStock -= amount;
            if (newStock < 0) newStock = 0; // Prevent negative stock
        }

        const url = `${API_ENDPOINTS.PRODUCTS}/${selectedProduct.id}`;

        await fetch(url, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ stock: newStock })
        });

        setModalOpen(false);
        fetchInventory(pagination.page);
    };

    const filteredProducts = lowStockOnly
        ? products.filter(p => p.stock <= 10)
        : products;

    return (
        <>
            <header className="top-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>Inventory Management</h1>

                <div className="filter-controls" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-main)', fontSize: '14px' }}>
                        <input
                            type="checkbox"
                            checked={lowStockOnly}
                            onChange={(e) => setLowStockOnly(e.target.checked)}
                            style={{ accentColor: 'var(--accent)' }}
                        />
                        <AlertTriangle size={16} color={lowStockOnly ? '#ef4444' : 'var(--text-muted)'} />
                        Show Low Stock Only (≤ 10)
                    </label>
                </div>
            </header>

            <div className="content-view active">
                <div className="stats-grid" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div className="stat-card">
                        <div className="icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                            <Boxes size={24} />
                        </div>
                        <div className="stat-info">
                            <h3>{products.length}</h3>
                            <p>Items on this page</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                            <AlertTriangle size={24} />
                        </div>
                        <div className="stat-info">
                            <h3>{products.filter(p => p.stock <= 10).length}</h3>
                            <p>Low Stock Items</p>
                        </div>
                    </div>
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Category</th>
                                <th>Status</th>
                                <th>Current Stock</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map(prod => (
                                <tr key={prod.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <img src={prod.image} alt={prod.name} className="product-img" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                                            <span style={{ fontWeight: '500' }}>{prod.name}</span>
                                        </div>
                                    </td>
                                    <td>{prod.category?.name || 'Uncategorized'}</td>
                                    <td>
                                        {prod.stock === 0 ? (
                                            <span className="badge pending" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>Out of Stock</span>
                                        ) : prod.stock <= 10 ? (
                                            <span className="badge pending" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>Low Stock</span>
                                        ) : (
                                            <span className="badge delivered" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>In Stock</span>
                                        )}
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '16px', fontWeight: 'bold', color: prod.stock <= 10 ? '#ef4444' : 'var(--text-main)' }}>
                                            {prod.stock}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="btn-outline" onClick={() => openAdjustModal(prod)} style={{ padding: '8px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <ArrowRightLeft size={14} /> Adjust Stock
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredProducts.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                        No products found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {!lowStockOnly && (
                    <Pagination
                        currentPage={pagination.page}
                        totalPages={pagination.totalPages}
                        onPageChange={handlePageChange}
                    />
                )}
            </div>

            {modalOpen && selectedProduct && (
                <div className="modal-overlay active">
                    <div className="modal">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <img src={selectedProduct.image} alt="" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} />
                            <div>
                                <h3 style={{ margin: 0 }}>Adjust Stock</h3>
                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>{selectedProduct.name}</p>
                            </div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Current Stock:</span>
                            <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-main)' }}>{selectedProduct.stock}</span>
                        </div>

                        <form onSubmit={handleAdjustStock}>
                            <div className="input-group">
                                <label>Adjustment Type</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setAdjustmentType('add')}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: `1px solid ${adjustmentType === 'add' ? '#22c55e' : 'rgba(255,255,255,0.1)'}`,
                                            background: adjustmentType === 'add' ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                                            color: adjustmentType === 'add' ? '#22c55e' : 'var(--text-main)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            cursor: 'pointer', transition: 'all 0.2s'
                                        }}
                                    >
                                        <Plus size={16} /> Add Stock
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAdjustmentType('deduct')}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: `1px solid ${adjustmentType === 'deduct' ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                                            background: adjustmentType === 'deduct' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                                            color: adjustmentType === 'deduct' ? '#ef4444' : 'var(--text-main)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            cursor: 'pointer', transition: 'all 0.2s'
                                        }}
                                    >
                                        <Minus size={16} /> Deduct Stock
                                    </button>
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Quantity to {adjustmentType === 'add' ? 'Add' : 'Deduct'}</label>
                                <input
                                    type="number"
                                    placeholder="Enter quantity..."
                                    value={adjustmentAmount}
                                    onChange={e => setAdjustmentAmount(e.target.value)}
                                    min="1"
                                    required
                                    style={{ fontSize: '18px', padding: '16px' }}
                                />
                            </div>

                            <div style={{ textAlign: 'center', margin: '20px 0', color: 'var(--text-muted)' }}>
                                New Stock Level will be:{' '}
                                <strong style={{ color: 'var(--text-main)', fontSize: '18px' }}>
                                    {adjustmentType === 'add'
                                        ? selectedProduct.stock + (parseInt(adjustmentAmount) || 0)
                                        : Math.max(0, selectedProduct.stock - (parseInt(adjustmentAmount) || 0))
                                    }
                                </strong>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ background: adjustmentType === 'add' ? '#22c55e' : '#ef4444' }}>
                                    Confirm Adjustment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
