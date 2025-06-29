import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { UserCreate } from '@/types/api';
import { Form, Input, Button, Alert } from 'antd';
import { UserOutlined, LockOutlined, PhoneOutlined } from '@ant-design/icons';

// 判断是否为移动设备的Hook
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // 初始检查
    checkIsMobile();
    
    // 监听窗口大小变化
    window.addEventListener('resize', checkIsMobile);
    
    // 清理函数
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);
  
  return isMobile;
};

interface RegisterFormData extends UserCreate {
  confirmPassword: string;
}

const RegisterForm: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const [form] = Form.useForm();
  const isMobile = useIsMobile();

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 移除确认密码字段
      const { confirmPassword, ...registerData } = data;
      const success = await registerUser(registerData);
      
      if (success) {
        router.push('/login?registered=true');
      } else {
        setError('注册失败，请稍后再试');
      }
    } catch (err) {
      setError('注册失败，请稍后再试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`w-full max-w-full mx-auto ${isMobile ? 'p-4' : 'p-6'} bg-white shadow-md rounded-xl overflow-hidden`}>
      <div className="text-center mb-6">
        <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900`}>注册新账号</h2>
        <p className="mt-2 text-sm text-gray-600">
          或{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-500">
            登录已有账号
          </Link>
        </p>
      </div>

      {error && (
        <Alert 
          message={error} 
          type="error" 
          showIcon 
          className="mb-4 rounded-lg"
        />
      )}

      <Form
        form={form}
        name="register"
        layout="vertical"
        onFinish={onSubmit}
        className="space-y-4 w-full"
        size={isMobile ? "middle" : "large"}
      >
        <Form.Item
          name="username"
          label="用户名"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 3, message: '用户名至少3个字符' }
          ]}
          className="w-full"
        >
          <Input 
            prefix={<UserOutlined className="text-gray-400" />} 
            placeholder="用户名" 
            className="rounded-lg w-full"
            style={{ width: '100%', maxWidth: '100%' }}
            autoComplete="username"
          />
        </Form.Item>

        <Form.Item
          name="mobile"
          label="手机号"
          rules={[
            {
              pattern: /^1[3-9]\d{9}$/,
              message: '请输入有效的手机号码'
            }
          ]}
          className="w-full"
        >
          <Input 
            prefix={<PhoneOutlined className="text-gray-400" />} 
            placeholder="手机号（可选）" 
            className="rounded-lg w-full"
            style={{ width: '100%', maxWidth: '100%' }}
            autoComplete="tel"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="密码"
          rules={[
            { required: true, message: '请输入密码' },
            { min: 6, message: '密码至少6个字符' }
          ]}
          className="w-full"
        >
          <Input.Password 
            prefix={<LockOutlined className="text-gray-400" />} 
            placeholder="密码"
            className="rounded-lg w-full" 
            style={{ width: '100%', maxWidth: '100%' }}
            autoComplete="new-password"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="确认密码"
          dependencies={['password']}
          rules={[
            { required: true, message: '请确认密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不匹配'));
              },
            }),
          ]}
          className="w-full"
        >
          <Input.Password 
            prefix={<LockOutlined className="text-gray-400" />} 
            placeholder="确认密码"
            className="rounded-lg w-full" 
            style={{ width: '100%', maxWidth: '100%' }}
            autoComplete="new-password"
          />
        </Form.Item>

        <Form.Item className="mb-0 w-full">
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={isLoading} 
            className={`w-full ${isMobile ? 'h-11' : 'h-12'} bg-blue-600 hover:bg-blue-500 rounded-lg`}
            style={{ width: '100%', maxWidth: '100%' }}
          >
            {isLoading ? '注册中...' : '注册'}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default RegisterForm; 