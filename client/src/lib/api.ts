import axios from 'axios';
import { useAuthStore } from '@/features/auth/authStore';

const api = axios.create({
    baseURL: 'http://localhost:4000/api',
});

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// OIT Services
export const fetchOITs = async (searchQuery?: string) => {
    const params = searchQuery ? { search: searchQuery } : {};
    const response = await api.get('/oits', { params });
    return response.data;
};

export const fetchOITById = async (id: string) => {
    const response = await api.get(`/oits/${id}`);
    return response.data;
};

// Resource Services
export const fetchResources = async (searchQuery?: string) => {
    const params = searchQuery ? { search: searchQuery } : {};
    const response = await api.get('/resources', { params });
    return response.data;
};

export const fetchResourceById = async (id: string) => {
    const response = await api.get(`/resources/${id}`);
    return response.data;
};

// Global Search
export const searchGlobal = async (query: string) => {
    if (!query.trim()) {
        return { oits: [], resources: [] };
    }

    const [oitsResponse, resourcesResponse] = await Promise.all([
        api.get('/oits', { params: { search: query } }),
        api.get('/resources', { params: { search: query } }),
    ]);

    return {
        oits: oitsResponse.data,
        resources: resourcesResponse.data,
    };
};

export default api;
