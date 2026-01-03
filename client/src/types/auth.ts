export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'ENGINEER' | 'USER';

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
}

// Helper to check permissions
export const canManageUsers = (role: UserRole): boolean => role === 'SUPER_ADMIN';
export const canManageOITs = (role: UserRole): boolean => ['SUPER_ADMIN', 'ADMIN'].includes(role);
export const canAssignEngineers = (role: UserRole): boolean => ['SUPER_ADMIN', 'ADMIN'].includes(role);

