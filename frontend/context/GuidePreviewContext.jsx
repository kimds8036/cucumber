import React, { createContext, useContext, useMemo } from 'react';

const GuidePreviewContext = createContext({
  isGuidePreview: false,
  guideMessageTab: 'note',
  guideSchoolScrollTo: null,
});

export function GuidePreviewProvider({
  children,
  messageTab = 'note',
  schoolScrollTo = null,
}) {
  const value = useMemo(
    () => ({
      isGuidePreview: true,
      guideMessageTab: messageTab === 'mail' ? 'mail' : 'note',
      guideSchoolScrollTo: schoolScrollTo,
    }),
    [messageTab, schoolScrollTo],
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
