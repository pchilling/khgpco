export const PLACEHOLDER_IMAGE = 'https://placehold.co/400x300?text=No+Image';

// Strapi Cloud URL - 確保這是正確的 URL
const STRAPI_CLOUD_URL = 'https://eloquent-splendor-a265f51ba3.media.strapiapp.com';
// 本地開發 URL，可以通過環境變量覆蓋
const LOCAL_API_URL = process.env.REACT_APP_LOCAL_API_URL || 'http://localhost:1339';

// 添加調試信息
console.log('STRAPI_CLOUD_URL:', STRAPI_CLOUD_URL);
console.log('LOCAL_API_URL:', LOCAL_API_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REACT_APP_USE_CLOUD:', process.env.REACT_APP_USE_CLOUD);

export const getImageUrl = (media) => {
    if (!media?.data?.[0]?.attributes?.url) {
        return PLACEHOLDER_IMAGE;
    }
    
    const { url } = media.data[0].attributes;
    
    if (url.startsWith('http')) {
        return url;
    }
    
    // 如果設置了 REACT_APP_USE_CLOUD=true，即使在開發環境也使用 Strapi Cloud
    const useCloud = process.env.REACT_APP_USE_CLOUD === 'true' || process.env.NODE_ENV === 'production';
    
    const finalUrl = useCloud ? `${STRAPI_CLOUD_URL}${url}` : `${LOCAL_API_URL}${url}`;
    console.log('Image URL:', finalUrl);
    return finalUrl;
};