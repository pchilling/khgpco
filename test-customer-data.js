const fetch = require('node-fetch');

async function checkCustomerData() {
  try {
    console.log('🔍 檢查客戶數據...');
    
    // 檢查客戶總數
    const customersResponse = await fetch('https://eloquent-splendor-a265f51ba3.strapiapp.com/api/customers?populate=*');
    const customersData = await customersResponse.json();
    
    console.log('\n📊 客戶數據概況:');
    console.log(`- 狀態碼: ${customersResponse.status}`);
    console.log(`- 客戶總數: ${customersData.data?.length || 0}`);
    console.log(`- 分頁信息:`, customersData.meta?.pagination || '無');
    
    if (customersData.data && customersData.data.length > 0) {
      console.log('\n👥 前5個客戶:');
      customersData.data.slice(0, 5).forEach((customer, index) => {
        console.log(`${index + 1}. ID:${customer.id} - ${customer.attributes.name} (${customer.attributes.phone})`);
      });
      
      console.log('\n🏷️ 客戶來源統計:');
      const sourceCounts = {};
      customersData.data.forEach(customer => {
        const source = customer.attributes.source || 'unknown';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });
      console.log(sourceCounts);
      
      console.log('\n📈 客戶狀態統計:');
      const statusCounts = {};
      customersData.data.forEach(customer => {
        const status = customer.attributes.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      console.log(statusCounts);
    }
    
    // 檢查報名數據
    console.log('\n🎫 檢查報名數據...');
    const registrationsResponse = await fetch('https://eloquent-splendor-a265f51ba3.strapiapp.com/api/registrations?populate=*');
    const registrationsData = await registrationsResponse.json();
    
    console.log(`- 報名總數: ${registrationsData.data?.length || 0}`);
    
    if (registrationsData.data && registrationsData.data.length > 0) {
      console.log('\n📝 前5個報名:');
      registrationsData.data.slice(0, 5).forEach((reg, index) => {
        console.log(`${index + 1}. ID:${reg.id} - ${reg.attributes.name} (${reg.attributes.phone}) - 狀態:${reg.attributes.status}`);
      });
      
      console.log('\n🔄 報名狀態統計:');
      const regStatusCounts = {};
      registrationsData.data.forEach(reg => {
        const status = reg.attributes.status || 'unknown';
        regStatusCounts[status] = (regStatusCounts[status] || 0) + 1;
      });
      console.log(regStatusCounts);
      
      // 檢查已轉換的報名
      const confirmedRegs = registrationsData.data.filter(reg => reg.attributes.status === 'confirmed');
      console.log(`\n✅ 已轉換的報名數量: ${confirmedRegs.length}`);
    }
    
  } catch (error) {
    console.error('❌ 檢查失敗:', error.message);
  }
}

checkCustomerData(); 