// 處理多語言字段
export const getLocalizedValue = (field, defaultValue = '') => {
  if (!field) return defaultValue;
  if (typeof field === 'string') return field;
  return field['zh-TW'] || field['en-US'] || defaultValue;
};

// 處理項目數據格式
export const processProjectData = (project) => {
  if (!project) return null;
  
  return {
    ...project,
    name: typeof project.name === 'string' 
      ? { 'zh-TW': project.name, 'en-US': project.name }
      : project.name || { 'zh-TW': '', 'en-US': '' },
    developer: typeof project.developer === 'string'
      ? { 'zh-TW': project.developer, 'en-US': project.developer }
      : project.developer || { 'zh-TW': '', 'en-US': '' },
    // 其他字段的處理...
  };
}; 