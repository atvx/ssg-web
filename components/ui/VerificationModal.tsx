import React, { useRef, useEffect } from 'react';
import { Modal, Input } from 'antd';
import { useVerification } from '@/contexts/VerificationContext';

// 判断是否为移动设备的Hook
const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);
  
  return isMobile;
};

const VerificationModal: React.FC = () => {
  const {
    verificationModalVisible,
    verificationCode,
    countDown,
    countDownActive,
    phoneNumber,
    verificationTaskId,
    setVerificationCode,
    submitVerificationCode,
    closeVerificationModal,
  } = useVerification();
  
  const isMobile = useIsMobile();
  const verificationInputRefs = useRef<any[]>([]);

  // 处理验证码输入变化
  const handleVerificationInputChange = (index: number, value: string) => {
    // 如果倒计时已结束，不允许输入
    if (!countDownActive) {
      return;
    }
    
    if (value.length > 1) {
      value = value.charAt(0); // 只取第一个字符
    }
    
    // 更新验证码数组
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);
    
    // 如果输入了字符，且不是最后一个输入框，则自动聚焦到下一个输入框
    if (value && index < 5) {
      const nextInput = verificationInputRefs.current[index + 1];
      if (nextInput) {
        nextInput.focus();
      }
    }
    
    // 检查是否所有输入框都已填写，如果是则立即关闭对话框并在后台提交
    if (newCode.every(c => c) && newCode.length === 6) {
      // 立即关闭对话框
      closeVerificationModal();
      
      // 在后台提交验证码（不阻塞UI）
      submitVerificationCode(newCode.join(''), verificationTaskId);
    }
  };
  
  // 处理验证码输入框键盘事件
  const handleVerificationKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // 如果按下退格键，且当前输入框为空，则聚焦到前一个输入框
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      const prevInput = verificationInputRefs.current[index - 1];
      if (prevInput) {
        prevInput.focus();
      }
    }
  };

  // 当模态框显示时，自动聚焦到第一个输入框
  useEffect(() => {
    if (verificationModalVisible && countDownActive) {
      // 初始化引用数组
      verificationInputRefs.current = Array(6).fill(null);
      
      // 自动聚焦到第一个输入框
      setTimeout(() => {
        if (verificationInputRefs.current[0]) {
          verificationInputRefs.current[0].focus();
        }
      }, 100);
    }
  }, [verificationModalVisible, countDownActive]);

  return (
    <Modal
      title="验证码确认"
      open={verificationModalVisible}
      onCancel={closeVerificationModal}
      footer={null}
      width={isMobile ? "90%" : 420}
      maskClosable={true}
      className="rounded-lg"
      closable={true}
    >
      <div className="text-center mb-4">
        <p className="mb-2">请输入发送到 <strong>{phoneNumber}</strong> 的验证码</p>
        <p className="text-sm text-gray-500 hidden">
          输入完成后将自动提交，{countDown} 秒后自动关闭
        </p>
      </div>
      
      <div className="flex justify-center gap-2 mb-6">
        {verificationCode.map((digit, index) => (
          <Input
            key={index}
            ref={(el) => verificationInputRefs.current[index] = el}
            value={digit}
            onChange={(e) => handleVerificationInputChange(index, e.target.value)}
            onKeyDown={(e) => handleVerificationKeyDown(index, e)}
            className="w-10 h-12 text-center text-xl rounded-lg"
            maxLength={1}
            autoFocus={index === 0}
            disabled={!countDownActive}
          />
        ))}
      </div>
      
      {/* 倒计时提示 */}
      <div className="text-center">
        {countDownActive && (
          <div className="flex items-center justify-center text-blue-600">
            <div className="animate-pulse mr-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            </div>
            <p className="text-sm">
              倒计时 <span className="font-mono text-lg font-semibold">{countDown}</span> 秒后，自动关闭
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default VerificationModal; 