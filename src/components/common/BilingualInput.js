import React, { useEffect } from 'react';
import { Form, Input, Space } from 'antd';
import '../../styles/components/BilingualInput.css';
import { useLanguage } from '../../context/LanguageContext';

const BilingualInput = ({ name, required, form }) => {
  const { language } = useLanguage();
  
  useEffect(() => {
    if (!form) {
      console.error('BilingualInput 缺少 form 属性');
      return;
    }
    
    if (!form.getFieldValue(name)) {
      form.setFieldsValue({
        [name]: { 'zh-TW': '', 'en-US': '' }
      });
    }
  }, [form, name]);

  return (
    <div className="bilingual-input-wrapper">
      <div className="bilingual-input-field">
        <div className="input-label">中文</div>
        <Form.Item
          name={[name, 'zh-TW']}
          rules={[{ required, message: '請輸入中文名稱' }]}
          noStyle
        >
          <Input className="styled-input" placeholder="請輸入中文" />
        </Form.Item>
      </div>
      <div className="bilingual-input-field">
        <div className="input-label">English</div>
        <Form.Item
          name={[name, 'en-US']}
          rules={[{ required, message: 'Please enter English name' }]}
          noStyle
        >
          <Input className="styled-input" placeholder="Please enter English" />
        </Form.Item>
      </div>
    </div>
  );
};

export default BilingualInput; 