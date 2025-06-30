import { useEffect } from 'react';

// 自定義 Hook：確保組件掛載時滾動到頂部
export const useScrollToTop = (enabled = true) => {
  useEffect(() => {
    if (!enabled) {
      console.log('useScrollToTop: Disabled, skipping scroll');
      return;
    }
    
    console.log('useScrollToTop: Component mounted, scrolling to top');
    
    // 強制滾動到頂部的函數
    const scrollToTop = () => {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant'
      });
    };
    
    // 立即滾動
    scrollToTop();
    
    // 多重保險機制，使用更長的延遲時間
    const timeouts = [
      setTimeout(() => {
        console.log('useScrollToTop: 10ms delayed scroll');
        scrollToTop();
      }, 10),
      
      setTimeout(() => {
        console.log('useScrollToTop: 50ms delayed scroll');
        scrollToTop();
      }, 50),
      
      setTimeout(() => {
        console.log('useScrollToTop: 100ms delayed scroll');
        scrollToTop();
      }, 100),
      
      setTimeout(() => {
        console.log('useScrollToTop: 200ms delayed scroll');
        scrollToTop();
      }, 200),
      
      setTimeout(() => {
        console.log('useScrollToTop: 500ms final scroll');
        scrollToTop();
      }, 500)
    ];
    
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [enabled]);
};

export default useScrollToTop; 