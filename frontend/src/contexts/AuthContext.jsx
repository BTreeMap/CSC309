import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, usersAPI } from '../api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          const userData = JSON.parse(storedUser);
          setUser(userData);
          const freshUserData = await usersAPI.getMe();
          setUser(freshUserData);
          localStorage.setItem('user', JSON.stringify(freshUserData));
        } catch (error) {
          console.error('Failed to fetch user data:', error);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (utorid, password) => {
    try {
      const response = await authAPI.login(utorid, password);
      const { token: newToken, expiresAt } = response;
      
      setToken(newToken);
      localStorage.setItem('token', newToken);

      const userData = await usersAPI.getMe();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const hasRole = (minRole) => {
    if (!user) return false;
    
    const roleHierarchy = {
      regular: 0,
      cashier: 1,
      manager: 2,
      superuser: 3,
    };

    const userRoleLevel = roleHierarchy[user.role] || 0;
    const minRoleLevel = roleHierarchy[minRole] || 0;

    return userRoleLevel >= minRoleLevel;
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    updateUser,
    hasRole,
    isAuthenticated: !!token && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

