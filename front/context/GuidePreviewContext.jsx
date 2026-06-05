import React, { createContext, useContext, useMemo } from 'react';

const GuidePreviewContext = createContext({
  isGuidePreview: false,
  guideMessageTab: 'note',
  guideSchoolScrollTo: null,
  activeFocusTarget: null,
  onFocusRect: null,
  focusMeasureKey: 0,
});

export function GuidePreviewProvider({
  children,
  messageTab = 'note',
  schoolScrollTo = null,
  focusTarget = null,
  onFocusRect = null,
  focusMeasureKey = 0,
}) {
  const value = useMemo(
    () => ({
      isGuidePreview: true,
      guideMessageTab: messageTab === 'mail' ? 'mail' : 'note',
      guideSchoolScrollTo: schoolScrollTo,
      activeFocusTarget: focusTarget,
      onFocusRect,
      focusMeasureKey,
    }),
    [messageTab, schoolScrollTo, focusTarget, onFocusRect, focusMeasureKey],
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
