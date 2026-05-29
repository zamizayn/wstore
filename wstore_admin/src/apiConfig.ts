const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/admin`
  : '/api/admin';

export const API_ENDPOINTS = {
  LOGIN: `${BASE_URL}/login`,
  TENANTS: `${BASE_URL}/tenants`,
  BRANCHES: `${BASE_URL}/branches`,
  SUPPORT_REQUESTS: `${BASE_URL}/support-requests`,
  CATEGORIES: `${BASE_URL}/categories`,
  PRODUCTS: `${BASE_URL}/products`,
  PRODUCTS_BASIC: `${BASE_URL}/products/basic`,
  ORDERS: `${BASE_URL}/orders`,
  CUSTOMERS: `${BASE_URL}/customers`,
  ANALYTICS: `${BASE_URL}/analytics`,
  BROADCAST: `${BASE_URL}/customers/broadcast`,
  FCM_REGISTER: `${BASE_URL}/fcm/register`,
  FCM_UNREGISTER: `${BASE_URL}/fcm/unregister`,
  NOTIFICATIONS: `${BASE_URL}/notifications`,
  NOTIFICATIONS_READ: `${BASE_URL}/notifications/read`,
  PRODUCT_SALES: `${BASE_URL}/product-sales`,
  OFFERS: `${BASE_URL}/offers`,
  WHATSAPP_SETTINGS: `${BASE_URL}/tenants/me/whatsapp-settings`,
  CHANGE_PASSWORD: `${BASE_URL}/change-password`,
  GLOBAL_CONFIGS: `${BASE_URL}/global-configs`,
  FORGOT_PASSWORD: `${BASE_URL}/forgot-password`,
  VERIFY_OTP: `${BASE_URL}/verify-otp`,
  RESET_PASSWORD: `${BASE_URL}/reset-password`,
  REGISTRATION_PAYMENT: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/payments/registration` : '/api/payments/registration',

  SUBSCRIPTION_PLANS: `${BASE_URL}/subscription-plans`,
  SUBSCRIPTIONS: `${BASE_URL}/subscriptions`,
  SUBSCRIPTION_STATS: `${BASE_URL}/subscriptions/stats`,

  REGISTRATION_STATUS: (id: number | string) => `${BASE_URL}/tenants/${id}/registration-status`,
  SUBSCRIPTION_HISTORY: (tenantId: number | string) => `${BASE_URL}/subscriptions/${tenantId}/history`,
  SUBSCRIPTION_RENEW: (id: number | string) => `${BASE_URL}/subscriptions/${id}/renew`,
  SUBSCRIPTION_CANCEL: (id: number | string) => `${BASE_URL}/subscriptions/${id}/cancel`,
  SUBSCRIPTION_CHANGE_PLAN: (id: number | string) => `${BASE_URL}/subscriptions/${id}/change-plan`,
  SUBSCRIPTION_PLAN_TOGGLE: (id: number | string) => `${BASE_URL}/subscription-plans/${id}/toggle`,
  DELIVERY_BOYS: `${BASE_URL}/delivery-boys`,
};

export const getHeaders = () => {
  const token = localStorage.getItem('adminToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  } as Record<string, string>;
};
