import React from 'react';
import SignupLegalDocumentModal from './SignupLegalDocumentModal';

const SignStepPrivacyPolicy = ({ normalize, onBack }) => (
  <SignupLegalDocumentModal
    visible
    slug="privacy_policy"
    normalize={normalize}
    onClose={onBack}
  />
);

export default SignStepPrivacyPolicy;
