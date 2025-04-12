// 測試 Strapi API 的腳本
const axios = require('axios');

// 使用正確的 Strapi 端口
const API_URL = 'http://localhost:1339';

// 測試創建註冊 - 使用最小數據
async function testCreateRegistration() {
    try {
        console.log('Testing registration creation with minimal data...');
        
        // 最小化數據
        const payload = {
            data: {
                name: 'Test User',
                email: 'test@example.com',
                phone: '0912345678',
                event: 1  // 使用數字而不是字符串
            }
        };
        
        console.log('Minimal payload:', JSON.stringify(payload, null, 2));
        console.log(`Sending request to: ${API_URL}/api/registrations`);
        
        const response = await axios.post(
            `${API_URL}/api/registrations`,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('Success! Response:', response.data);
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
            console.error('Response status:', error.response.status);
        } else if (error.request) {
            console.error('No response received. Server might be down or wrong URL.');
        }
    }
}

// 執行測試
testCreateRegistration(); 