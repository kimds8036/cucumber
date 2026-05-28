import React, { createContext, useContext, useMemo } from 'react';

const GuidePreviewContext = createContext({
  isGuidePreview: false,
  guideMessageTab: 'note',
});

export function GuidePreviewProvider({ children, messageTab = 'note' }) {
  const value = useMemo(
    () => ({
      isGuidePreview: true,
      guideMessageTab: messageTab === 'mail' ? 'mail' : 'note',
    }),
    [messageTab],
  );

  return (
    <GuidePreviewContext.Provider value={value}>
      {children}
    </GuidePreviewContext.Provider>
  );
}

export function useGuidePreview() {
  return useContext(GuidePreviewContext);
}
