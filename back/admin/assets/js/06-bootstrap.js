async function bootstrap() {
    if (!ensureAdminAuth()) return;
    initDeployEnvBadge();
    initSessionTimer();
    initAdminHistoryGuard();
    try {
      await Promise.all([
        loadDashboard(),
        loadReports(),
        loadProcessedReports(),
        loadAppeals(),
        loadInquiries(),
        loadProcessedInquiries(),
        loadStudentIds(),
        loadReverificationIds(),
        loadUsers(),
        loadLogs(),
      ]);
      await loadDelayed();
    } catch (error) {
      alert(`관리자 데이터 로딩 실패: ${error.message}\n\n세션 쿠키·admin_users·백엔드 서버 상태를 확인해주세요.`);
    }
  }

  bootstrap();
