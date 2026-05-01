import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface User {
  email: string;
  name: string;
  picture_url?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loginGoogle: (googleToken: string) => Promise<void>;
  loginCustom: (email: string, password: string) => Promise<void>;
  registerCustom: (name: string, email: string, password: string) => Promise<void>;
  updateProfile: (name: string, file: File | null) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      } catch (e) {
        console.error("Failed to parse stored user", e);
      }
    }
    setIsLoading(false);
  }, []);

  const handleAuthResponse = async (response: Response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Authentication failed');
    }
    const data = await response.json();
    if (data.status === 'success' && data.user) {
      // Map picture_url to picture for backward compatibility in components if needed,
      // but we will use picture_url
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);
    }
  };

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const loginGoogle = async (googleToken: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: googleToken }),
    });
    await handleAuthResponse(response);
  };

  const loginCustom = async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    await handleAuthResponse(response);
  };

  const registerCustom = async (name: string, email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    await handleAuthResponse(response);
  };

  const updateProfile = async (name: string, file: File | null) => {
    if (!user) return;
    
    const formData = new FormData();
    formData.append('email', user.email);
    formData.append('name', name);
    if (file) {
      formData.append('file', file);
    }

    const response = await fetch(`${API_BASE_URL}/auth/update-profile`, {
      method: 'POST',
      // DO NOT set Content-Type for FormData, browser will set it with boundary
      body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Profile update failed');
    }
    
    const data = await response.json();
    if (data.status === 'success' && data.user) {
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, loginGoogle, loginCustom, registerCustom, updateProfile, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
