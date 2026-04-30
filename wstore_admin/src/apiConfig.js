const BASE_URL = '/api/admin';

export const API_ENDPOINTS = {
    LOGIN: `${BASE_URL}/login`,
    TENANTS: `${BASE_URL}/tenants`,
    BRANCHES: `${BASE_URL}/branches`,
    CATEGORIES: `${BASE_URL}/categories`,
    PRODUCTS: `${BASE_URL}/products`,
    ORDERS: `${BASE_URL}/orders`,
    CUSTOMERS: `${BASE_URL}/customers`,
    ANALYTICS: `${BASE_URL}/analytics`,
    BROADCAST: `${BASE_URL}/customers/broadcast`,
};

export const getHeaders = () => {
    const token = localStorage.getItem('adminToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};
