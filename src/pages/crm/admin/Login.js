import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/local`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: values.username,
          password: values.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // 保存用戶信息和 token
        localStorage.setItem('user', JSON.stringify(data));
        localStorage.setItem('jwt', data.jwt); // 額外保存 token
        message.success('登入成功');
        navigate('/crm/admin/dashboard');
      } else {
        throw new Error(data.error?.message || '登入失敗');
      }
    } catch (error) {
      console.error('登入錯誤:', error);
      message.error(error.message || '登入失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* 表單部分 */}
    </div>
  );
};

export default Login; 