import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import { authAPI } from '@/lib/api';
import { UserInfo, Login, UserCreate } from '@/types/api';

interface AuthContextType {
  user: UserInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: Login) => Promise<boolean>;
  register: (data: UserCreate) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // 检查用户是否已登录
  useEffect(() => {
    const checkAuth = async () => {
      const token = Cookies.get('token');
      if (token) {
        try {
          const response = await authAPI.getCurrentUser();
          if (response.data.success && response.data.data) {
            setUser(response.data.data as UserInfo);
          } else {
            Cookies.remove('token');
          }
        } catch (error) {
          Cookies.remove('token');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // 登录
  const login = async (data: Login): Promise<boolean> => {
    try {
      const response = await authAPI.login(data);
      if (response.data.success && response.data.data) {
        const { access_token, token_type } = response.data.data;
        Cookies.set('token', access_token, { expires: 7 }); // 7天过期
        
        // 获取用户信息
        const userResponse = await authAPI.getCurrentUser();
        if (userResponse.data.success && userResponse.data.data) {
          setUser(userResponse.data.data as UserInfo);
          return true;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  // 注册
  const register = async (data: UserCreate): Promise<boolean> => {
    try {
      const response = await authAPI.register(data);
      return response.data.success;
    } catch (error) {
      return false;
    }
  };

  // 登出
  const logout = () => {
    Cookies.remove('token');
    setUser(null);
    router.push('/auth/login');
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 自定义Hook，用于访问认证上下文
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth必须在AuthProvider内部使用');
  }
  return context;
}; 