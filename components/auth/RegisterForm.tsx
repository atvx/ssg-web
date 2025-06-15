import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { UserCreate } from '@/types/api';

interface RegisterFormData extends UserCreate {
  confirmPassword: string;
}

const RegisterForm: React.FC = () => {
  const { register, handleSubmit, formState: { errors }, watch } = useForm<RegisterFormData>();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const password = watch('password', '');

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 移除确认密码字段
      const { confirmPassword, ...registerData } = data;
      const success = await registerUser(registerData);
      
      if (success) {
        router.push('/auth/login?registered=true');
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
    <div className="card max-w-md w-full mx-auto p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">注册新账号</h2>
        <p className="mt-2 text-sm text-gray-600">
          或{' '}
          <Link href="/auth/login" className="text-primary-600 hover:text-primary-500">
            登录已有账号
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
              {...register('username', { 
                required: '请输入用户名',
                minLength: { value: 3, message: '用户名至少3个字符' }
              })}
            />
            {errors.username && (
              <p className="form-error">{errors.username.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="mobile" className="form-label">
            手机号
          </label>
          <div className="mt-1">
            <input
              id="mobile"
              type="text"
              autoComplete="tel"
              className="form-input"
              {...register('mobile', { 
                pattern: {
                  value: /^1[3-9]\d{9}$/,
                  message: '请输入有效的手机号码'
                }
              })}
            />
            {errors.mobile && (
              <p className="form-error">{errors.mobile.message}</p>
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
              autoComplete="new-password"
              className="form-input"
              {...register('password', { 
                required: '请输入密码',
                minLength: { value: 6, message: '密码至少6个字符' }
              })}
            />
            {errors.password && (
              <p className="form-error">{errors.password.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="form-label">
            确认密码
          </label>
          <div className="mt-1">
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="form-input"
              {...register('confirmPassword', { 
                required: '请确认密码',
                validate: value => value === password || '两次输入的密码不匹配'
              })}
            />
            {errors.confirmPassword && (
              <p className="form-error">{errors.confirmPassword.message}</p>
            )}
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn btn-primary"
          >
            {isLoading ? '注册中...' : '注册'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegisterForm; 