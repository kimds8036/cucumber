let status = 'UNVERIFIED';

export function setStudentVerificationSnapshot(next) {
  status = next || 'UNVERIFIED';
}

export function isStudentVerifiedSnapshot() {
  return status === 'APPROVED';
}
