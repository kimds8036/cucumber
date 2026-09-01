window.PANEL_LOADERS = {
  dashboard: async () => {
    await loadDashboard();
    await loadDelayed();
  },
  ops: async () => {
    await loadOpsPanel();
  },
  reports: () => loadReports(),
  processedReports: () => loadProcessedReports(),
  appeals: () => loadAppeals(),
  inquiries: () => loadInquiries(),
  processedInquiries: () => loadProcessedInquiries(),
  manualSignup: () => loadManualSignup(),
  studentIds: () => loadStudentIds(),
  certificates: () => loadCertificates(),
  reverificationIds: () => loadReverificationIds(),
  attendance: () => loadAttendance(),
  users: () => loadUsers(),
  logs: () => loadLogs(),
  emergency: () => loadEmergencyFlags(),
  legalDocuments: () => loadLegalDocuments(),
  hallOfFame: () => loadHallOfFame(),
  adminAccounts: () => loadAdminAccounts(),
};

async function bootstrap() {
  if (!ensureAdminAuth()) return;
  initDeployEnvBadge();
  initSidebarDrawer();
  initSessionTimer();
  initAdminHistoryGuard();
  try {
    await loadAdminProfile();
    await loadDashboard();
    state.loadedPanels.add('dashboard');
    await refreshNavBadges();
  } catch (error) {
    alert(`관리자 초기화 실패: ${error.message}\n\n세션·백엔드 상태를 확인해주세요.`);
  }
}

bootstrap();
