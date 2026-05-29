import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, AlertTriangle, Plus, Minus } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import PaginationBar from '../components/PaginationBar';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

export default function Inventory() {
    const [products, setProducts] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [lowStockOnly, setLowStockOnly] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [adjustmentType, setAdjustmentType] = useState('add');
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

    const handlePageChange = (newPage: number) => {
        fetchInventory(newPage);
    };

    const openAdjustModal = (product: any) => {
        setSelectedProduct(product);
        setAdjustmentType('add');
        setAdjustmentAmount('');
        setModalOpen(true);
    };

    const handleAdjustStock = async (e: any) => {
        e.preventDefault();
        if (!selectedProduct) return;

        const amount = parseInt(adjustmentAmount, 10);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount greater than 0');
            return;
        }

        const newStock = adjustmentType === 'add'
            ? selectedProduct.stock + amount
            : Math.max(0, selectedProduct.stock - amount);

        await fetch(`${API_ENDPOINTS.PRODUCTS}/${selectedProduct.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ stock: newStock })
        });

        setModalOpen(false);
        fetchInventory();
    };

    const stockLevel = (product: any) => {
        if (product.stock <= 0) return 'out';
        if (product.stock <= 10) return 'low';
        return 'ok';
    };

    const filteredProducts = lowStockOnly
        ? products.filter((p: any) => p.stock <= 10)
        : products;

    return (
        <div className="dashboard-content">
            <header className="top-header">
                <div>
                    <h1>Inventory Management</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Track and adjust product stock levels</p>
                </div>
                <label className="switch" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <AlertTriangle size={16} style={{ color: lowStockOnly ? 'var(--warning)' : 'var(--text-muted)' }} />
                    <input type="checkbox" checked={lowStockOnly} onChange={e => setLowStockOnly(e.target.checked)} />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>Low Stock Only</span>
                </label>
            </header>

            <div className="white-card">
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>SKU</th>
                            <th style={{ textAlign: 'center' }}>Current Stock</th>
                            <th style={{ textAlign: 'center' }}>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map((product: any) => (
                            <tr key={product.id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '32px', height: '32px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Boxes size={16} />
                                        </div>
                                        <span style={{ fontWeight: 600 }}>{product.name}</span>
                                    </div>
                                </td>
                                <td style={{ color: 'var(--text-muted)', fontSize: '14px' }}>#{product.id}</td>
                                <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '18px' }}>{product.stock}</td>
                                <td style={{ textAlign: 'center' }}>
                                    {stockLevel(product) === 'out' && <span className="badge badge-danger">Out of Stock</span>}
                                    {stockLevel(product) === 'low' && <span className="badge badge-warning">Low Stock</span>}
                                    {stockLevel(product) === 'ok' && <span className="badge badge-success">In Stock</span>}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <button className="btn-outline" onClick={() => openAdjustModal(product)}>
                                        Adjust Stock
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredProducts.length === 0 && (
                    <EmptyState icon={<Boxes size={48} />} title={lowStockOnly ? 'No low stock items' : 'No products found'} />
                )}

                <PaginationBar
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                />
            </div>

            {modalOpen && selectedProduct && (
                <div className="modal-overlay active" onClick={() => setModalOpen(false)}>
                    <div className="modal" style={{ maxWidth: '420px', padding: '32px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3>Adjust Stock</h3>
                            <button className="btn-outline" style={{ border: 'none', padding: '4px' }} onClick={() => setModalOpen(false)}>✕</button>
                        </div>
                        <p style={{ marginBottom: '24px', color: 'var(--text-muted)' }}>
                            Current stock for <strong>{selectedProduct.name}</strong>: <strong>{selectedProduct.stock}</strong>
                        </p>
                        <form onSubmit={handleAdjustStock}>
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                                <button type="button" className={`btn-outline ${adjustmentType === 'add' ? 'active' : ''}`} style={{ flex: 1, justifyContent: 'center', ...(adjustmentType === 'add' ? { background: 'var(--accent)', color: 'white', borderColor: 'var(--accent)' } : {}) }} onClick={() => setAdjustmentType('add')}>
                                    <Plus size={16} /> Add Stock
                                </button>
                                <button type="button" className={`btn-outline ${adjustmentType === 'deduct' ? 'active' : ''}`} style={{ flex: 1, justifyContent: 'center', ...(adjustmentType === 'deduct' ? { background: 'var(--danger)', color: 'white', borderColor: 'var(--danger)' } : {}) }} onClick={() => setAdjustmentType('deduct')}>
                                    <Minus size={16} /> Deduct Stock
                                </button>
                            </div>
                            <div className="input-group">
                                <label>Quantity</label>
                                <input type="number" min="1" placeholder="Enter quantity" value={adjustmentAmount} onChange={e => setAdjustmentAmount(e.target.value)} required autoFocus />
                            </div>
                            <div className="modal-actions" style={{ marginTop: '24px', gap: '12px' }}>
                                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                                    {adjustmentType === 'add' ? 'Add Stock' : 'Deduct Stock'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
