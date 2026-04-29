import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Branches from './pages/Branches';

const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('adminToken');
    if (!token) return <Navigate to="/login" />;
    return children;
};

export default function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Dashboard />} />
                    <Route path="branches" element={<Branches />} />
                    <Route path="categories" element={<Categories />} />
                    <Route path="products" element={<Products />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="customers" element={<Customers />} />
                </Route>
            </Routes>
        </Router>
    );
}
