import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import { authAPI } from '@/lib/api';
import { UserInfo, Login, UserCreate } from '@/types/api';

interface AuthContextType {
  user: UserInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: Login, rememberMe?: boolean) => Promise<boolean>;
  register: (data: UserCreate) => Promise<boolean>;
  logout: () => void;
  clearAutoLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // 简单的加密/解密函数
  const encrypt = (text: string): string => {
    return btoa(encodeURIComponent(text));
  };

  const decrypt = (encrypted: string): string => {
    try {
      return decodeURIComponent(atob(encrypted));
    } catch {
      return '';
    }
  };

  // 存储登录凭据
  const saveCredentials = (username: string, password: string) => {
    localStorage.setItem('rememberedUser', encrypt(username));
    localStorage.setItem('rememberedPass', encrypt(password));
    localStorage.setItem('autoLogin', 'true');
    localStorage.removeItem('manualLogout'); // 清除手动退出标记
  };

  // 获取存储的登录凭据
  const getSavedCredentials = (): { username: string; password: string } | null => {
    const autoLogin = localStorage.getItem('autoLogin');
    const manualLogout = localStorage.getItem('manualLogout');
    
    // 如果用户手动退出过，则不自动登录
    if (manualLogout === 'true' || autoLogin !== 'true') {
      return null;
    }

    const savedUser = localStorage.getItem('rememberedUser');
    const savedPass = localStorage.getItem('rememberedPass');
    
    if (savedUser && savedPass) {
      return {
        username: decrypt(savedUser),
        password: decrypt(savedPass)
      };
    }
    return null;
  };

  // 清除存储的登录凭据
  const clearSavedCredentials = () => {
    localStorage.removeItem('rememberedUser');
    localStorage.removeItem('rememberedPass');
    localStorage.removeItem('autoLogin');
  };

  // 检查用户是否已登录或尝试自动登录
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
      } else {
        // 尝试自动登录
        const credentials = getSavedCredentials();
        if (credentials) {
          try {
            const success = await performLogin(credentials, false);
            if (!success) {
              clearSavedCredentials();
            }
          } catch (error) {
            clearSavedCredentials();
          }
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // 执行登录逻辑（内部函数）
  const performLogin = async (data: Login, shouldSave: boolean = false): Promise<boolean> => {
    try {
      const response = await authAPI.login(data);
      if (response.data.success && response.data.data) {
        const { access_token, token_type } = response.data.data;
        Cookies.set('token', access_token, { expires: 7 }); // 7天过期
        
        // 获取用户信息
        const userResponse = await authAPI.getCurrentUser();
        if (userResponse.data.success && userResponse.data.data) {
          setUser(userResponse.data.data as UserInfo);
          
          // 如果需要记住密码，则保存凭据
          if (shouldSave) {
            saveCredentials(data.username, data.password);
          }
          
          return true;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  // 登录
  const login = async (data: Login, rememberMe: boolean = false): Promise<boolean> => {
    return performLogin(data, rememberMe);
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

  // 清除自动登录设置（不退出当前登录）
  const clearAutoLogin = () => {
    localStorage.setItem('manualLogout', 'true');
    clearSavedCredentials();
  };

  // 登出
  const logout = () => {
    Cookies.remove('token');
    setUser(null);
    localStorage.setItem('manualLogout', 'true'); // 标记为手动退出
    router.push('/login');
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    clearAutoLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 自定义Hook，用于访问认证上下文
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  // 服务端渲染保护：如果在服务端或context未定义，返回默认值
  if (typeof window === 'undefined' || context === undefined) {
    return {
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: async () => false,
      logout: () => {},
      register: async () => false,
      clearAutoLogin: () => {}
    };
  }
  
  return context;
}; 