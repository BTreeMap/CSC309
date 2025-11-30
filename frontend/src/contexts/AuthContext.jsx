import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authAPI, usersAPI } from '../api';

const AuthContext = createContext(null);

const ROLE_HIERARCHY = {
  regular: 0,
  cashier: 1,
  manager: 2,
  superuser: 3,
};

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
  const [activeRole, setActiveRole] = useState(localStorage.getItem('activeRole') || null);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      const storedActiveRole = localStorage.getItem('activeRole');

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          const userData = JSON.parse(storedUser);
          setUser(userData);

          // Set active role to stored value or user's actual role
          setActiveRole(storedActiveRole || userData.role);

          const freshUserData = await usersAPI.getMe();
          setUser(freshUserData);
          localStorage.setItem('user', JSON.stringify(freshUserData));

          // Update active role if stored role is higher than user's actual role
          if (storedActiveRole && ROLE_HIERARCHY[storedActiveRole] > ROLE_HIERARCHY[freshUserData.role]) {
            setActiveRole(freshUserData.role);
            localStorage.setItem('activeRole', freshUserData.role);
          }
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
      const { token: newToken } = response;

      setToken(newToken);
      localStorage.setItem('token', newToken);

      const userData = await usersAPI.getMe();
      setUser(userData);
      setActiveRole(userData.role);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('activeRole', userData.role);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
      };
    }
  };

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setActiveRole(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeRole');
  }, []);

  const updateUser = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  }, []);

  const switchRole = useCallback((newRole) => {
    if (!user) return false;

    // Can only switch to roles at or below user's actual role
    const userRoleLevel = ROLE_HIERARCHY[user.role] || 0;
    const newRoleLevel = ROLE_HIERARCHY[newRole] || 0;

    if (newRoleLevel > userRoleLevel) {
      return false;
    }

    setActiveRole(newRole);
    localStorage.setItem('activeRole', newRole);
    return true;
  }, [user]);

  const hasRole = useCallback((minRole) => {
    if (!user || !activeRole) return false;

    const activeRoleLevel = ROLE_HIERARCHY[activeRole] || 0;
    const minRoleLevel = ROLE_HIERARCHY[minRole] || 0;

    return activeRoleLevel >= minRoleLevel;
  }, [user, activeRole]);

  // Get available roles for the user (all roles at or below their actual role)
  const availableRoles = useMemo(() => {
    if (!user) return [];

    const userRoleLevel = ROLE_HIERARCHY[user.role] || 0;
    return Object.entries(ROLE_HIERARCHY)
      .filter(([, level]) => level <= userRoleLevel)
      .map(([role]) => role)
      .sort((a, b) => ROLE_HIERARCHY[b] - ROLE_HIERARCHY[a]);
  }, [user]);

  const value = useMemo(() => ({
    user,
    token,
    loading,
    login,
    logout,
    updateUser,
    hasRole,
    switchRole,
    activeRole,
    availableRoles,
    isAuthenticated: !!token && !!user,
  }), [user, token, loading, logout, updateUser, hasRole, switchRole, activeRole, availableRoles]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

