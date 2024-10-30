export function useVisibilityChange(callback: (isVisible: boolean) => void) {
    if (process.server) return;
  
    onMounted(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          callback(entry.isIntersecting);
        },
        { threshold: 0.1 }
      );
  
      const element = document.documentElement;
      observer.observe(element);
  
      onUnmounted(() => {
        observer.disconnect();
      });
    });
  }