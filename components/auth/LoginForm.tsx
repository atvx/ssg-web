import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Login } from '@/types/api';

const LoginForm: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<Login>();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

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
    <div className="card max-w-md w-full mx-auto p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">登录销售助手</h2>
        <p className="mt-2 text-sm text-gray-600">
          或{' '}
          <Link href="/auth/register" className="text-primary-600 hover:text-primary-500">
            注册新账号
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="username" className="form-label">
            用户名
          </label>
          <div className="mt-1">
            <input
              id="username"
              type="text"
              autoComplete="username"
              className="form-input"
              {...register('username', { required: '请输入用户名' })}
            />
            {errors.username && (
              <p className="form-error">{errors.username.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="password" className="form-label">
            密码
          </label>
          <div className="mt-1">
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="form-input"
              {...register('password', { required: '请输入密码' })}
            />
            {errors.password && (
              <p className="form-error">{errors.password.message}</p>
            )}
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn btn-primary"
          >
            {isLoading ? '登录中...' : '登录'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginForm; 