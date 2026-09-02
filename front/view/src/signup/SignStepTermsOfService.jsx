import React from 'react';
import SignupLegalDocumentModal from './SignupLegalDocumentModal';

const SignStepTermsOfService = ({ normalize, onBack }) => (
  <SignupLegalDocumentModal
    visible
    slug="terms_of_service"
    normalize={normalize}
    onClose={onBack}
  />
);

export default SignStepTermsOfService;
