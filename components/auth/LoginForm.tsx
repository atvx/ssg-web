import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Login } from '@/types/api';
import { Form, Input, Button, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

const LoginForm: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const [form] = Form.useForm();

  const onSubmit = async (data: Login) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await login(data);
      if (success) {
        router.push('/dashboard');
      } else {
        setError('用户名或密码错误');
      }
    } catch (err) {
      setError('登录失败，请稍后再试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full mx-auto p-6 bg-white shadow-md rounded-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">登录</h2>
        <p className="mt-2 text-sm text-gray-600">
          或{' '}
          <Link href="/auth/register" className="text-blue-600 hover:text-blue-500">
            注册新账号
          </Link>
        </p>
      </div>

      {error && (
        <Alert 
          message={error} 
          type="error" 
          showIcon 
          className="mb-4"
        />
      )}

      <Form
        form={form}
        name="login"
        layout="vertical"
        onFinish={onSubmit}
        className="space-y-4"
        size="large"
      >
        <Form.Item
          name="username"
          label="用户名"
          rules={[{ required: true, message: '请输入用户名' }]}
        >
          <Input 
            prefix={<UserOutlined className="text-gray-400" />} 
            placeholder="用户名" 
            className="rounded-md"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="密码"
          rules={[{ required: true, message: '请输入密码' }]}
        >
          <Input.Password 
            prefix={<LockOutlined className="text-gray-400" />} 
            placeholder="密码"
            className="rounded-md" 
          />
        </Form.Item>

        <Form.Item className="mb-0">
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={isLoading} 
            className="w-full h-10 bg-blue-600 hover:bg-blue-500"
          >
            {isLoading ? '登录中...' : '登录'}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default LoginForm; 