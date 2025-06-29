import React, { createContext, useContext, useState, useRef, ReactNode, useCallback } from 'react';
import { message } from 'antd';
import apiClient from '@/lib/api';

// WebSocket地址
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:8000/ws';

interface VerificationContextType {
  // 状态
  wsConnected: boolean;
  verificationModalVisible: boolean;
  verificationMessage: string;
  verificationTaskId: string;
  verificationCode: string[];
  countDown: number;
  countDownActive: boolean;
  phoneNumber: string;
  
  // 方法
  connectWebSocket: () => void;
  closeWebSocket: () => void;
  setVerificationCode: (code: string[]) => void;
  submitVerificationCode: (code: string, taskId: string) => Promise<void>;
  closeVerificationModal: () => void;
}

const VerificationContext = createContext<VerificationContextType | undefined>(undefined);

// 配置message，取消所有验证码相关提示
const originalSuccessMethod = message.success;
const originalErrorMethod = message.error;

// 自定义函数来过滤验证码相关消息
const shouldFilterMessage = (content: any): boolean => {
  return typeof content === 'string' && 
    (content.toLowerCase().includes('verification') || 
     content.includes('验证码'));
};

// 添加过滤功能，保持原有函数签名
const filteredSuccessMethod: typeof message.success = (content, duration?, onClose?) => {
  if (shouldFilterMessage(content)) {
    return 'filtered-message' as any;
  }
  return originalSuccessMethod(content, duration, onClose);
};

const filteredErrorMethod: typeof message.error = (content, duration?, onClose?) => {
  if (shouldFilterMessage(content)) {
    return 'filtered-message' as any;
  }
  return originalErrorMethod(content, duration, onClose);
};

message.success = filteredSuccessMethod;
message.error = filteredErrorMethod;

export const VerificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // WebSocket相关状态
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  
  // 验证码相关状态
  const [verificationModalVisible, setVerificationModalVisible] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [verificationTaskId, setVerificationTaskId] = useState('');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [countDown, setCountDown] = useState(60);
  const [countDownActive, setCountDownActive] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('未知手机号');
  
  // 倒计时引用
  const countDownRef = useRef<NodeJS.Timeout | null>(null);

  // 连接WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return; // 已连接，不需要重复连接
    }
    
    // 创建WebSocket连接
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    
    // 连接成功事件
    ws.onopen = () => {
      setWsConnected(true);
      // 订阅验证频道
      ws.send(JSON.stringify({
        type: 'subscribe',
        channels: ['verification']
      }));
    };
    
    // 接收消息事件
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // 处理需要验证的情况
        if (data.type === 'verification_needed') {
          setVerificationTaskId(data.task_id);
          setVerificationMessage(data.message);
          
          // 提取手机号
          let extractedPhone = '未知手机号';
          if (data.message) {
            const phoneMatch = data.message.match(/请为手机\s+(.*?)\s+输入/);
            if (phoneMatch && phoneMatch[1]) {
              extractedPhone = phoneMatch[1];
            }
          }
          setPhoneNumber(extractedPhone);
          
          setVerificationModalVisible(true);
          setVerificationCode(['', '', '', '', '', '']); // 重置验证码输入
          
          // 启动倒计时
          setCountDown(60);
          setCountDownActive(true);
          
          if (countDownRef.current) {
            clearInterval(countDownRef.current);
          }
          
          countDownRef.current = setInterval(() => {
            setCountDown((prev) => {
              if (prev <= 1) {
                clearInterval(countDownRef.current as NodeJS.Timeout);
                setCountDownActive(false);
                setVerificationModalVisible(false);
                closeWebSocket();
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
        
        // 处理验证成功的情况
        if (data.type === 'verification_success') {
          if (verificationModalVisible) {
            setVerificationModalVisible(false);
            
            if (countDownRef.current) {
              clearInterval(countDownRef.current);
              setCountDownActive(false);
            }
            
            message.success('验证码验证成功');
          }
        }
      } catch (error) {
        console.error('解析WebSocket消息失败:', error);
      }
    };
    
    // 错误事件
    ws.onerror = (error) => {
      setWsConnected(false);
    };
    
    // 关闭事件
    ws.onclose = () => {
      setWsConnected(false);
    };
  }, [verificationModalVisible]);
  
  // 关闭WebSocket连接
  const closeWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setWsConnected(false);
    }
  }, []);

  // 提交验证码
  const submitVerificationCode = useCallback(async (code: string, taskId: string) => {
    if (!taskId || !code || code.length !== 6) {
      return;
    }
    
    try {
      const response = await apiClient.post(`/api/auth/verification/${taskId}/submit`, { code });
      
      if (response.data.success) {
        message.success('验证码验证成功');
      } else {
        message.error('验证码错误');
      }
    } catch (error) {
      message.error('验证码提交失败');
    }
  }, []);

  // 关闭验证码模态框
  const closeVerificationModal = useCallback(() => {
    setVerificationModalVisible(false);
    
    // 清理验证码相关状态
    setVerificationCode(['', '', '', '', '', '']);
    setVerificationTaskId('');
    setVerificationMessage('');
    
    // 清理倒计时
    if (countDownRef.current) {
      clearInterval(countDownRef.current);
      setCountDownActive(false);
    }
    
    // 关闭WebSocket连接
    closeWebSocket();
  }, [closeWebSocket]);

  // 清理函数
  React.useEffect(() => {
    return () => {
      closeWebSocket();
      if (countDownRef.current) {
        clearInterval(countDownRef.current);
      }
    };
  }, [closeWebSocket]);

  const value: VerificationContextType = {
    // 状态
    wsConnected,
    verificationModalVisible,
    verificationMessage,
    verificationTaskId,
    verificationCode,
    countDown,
    countDownActive,
    phoneNumber,
    
    // 方法
    connectWebSocket,
    closeWebSocket,
    setVerificationCode,
    submitVerificationCode,
    closeVerificationModal,
  };

  return (
    <VerificationContext.Provider value={value}>
      {children}
    </VerificationContext.Provider>
  );
};

export const useVerification = () => {
  const context = useContext(VerificationContext);
  if (context === undefined) {
    throw new Error('useVerification must be used within a VerificationProvider');
  }
  return context;
}; 