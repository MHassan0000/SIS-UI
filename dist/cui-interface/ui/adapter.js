(() => {
  'use strict';
  const app = globalThis.__sisStudioUI ??= {};
  // Verified against the authenticated Lahore SIS on 2026-09-28.
  // Never infer selectors from academic values, hidden fields or credentials.
  app.selectors = Object.freeze({
    shell: '.sis-portal-shell',
    header: '.sis-portal-header',
    content: '.main_body > .content_area',
    login: '.sis-login-page, #LoginSubmit',
    logout: '.sis-portal-header a[href="/Login/Sign_out"]',
    navigation: '.sis-portal-header .rounded_menu_boxes a[href], .sis-mobile-nav-list a[href]',
    activeNavigation: '.sis-portal-header a.selected, .circuled_menu_boxes li.selected > a',
    dashboard: '.sis-dash',
    dashboardHero: '.sis-dash-hero',
    session: '.sis-dash-hero > div > p:last-child',
    courseTable: '.sis-dash-table',
    courseRows: '.sis-dash-table > tbody > tr.is-course-row',
    courseCode: '.sis-dash-course-no',
    courseName: '.sis-dash-course-name',
    credits: '.sis-dash-credits',
    attendanceBars: '.sis-dash-att .progress-bar',
    // Verified progressBarTimer.js sets bg-success only after its final draw.
    attendancePending: '.sis-dash-att .progress-bar[aria-valuemax="1"]:not(.bg-success)',
    attendanceContainer: '.lab_class_attendance, .only_class_attendance',
    attendanceCards: '.sis-att-card',
    attendancePercent: '.sis-att-pct',
    attendanceHeading: '.sis-att-hero h2',
    results: '.sis-result',
    resultBlocks: '.single_result_container',
    resultMeta: '.sis-result-meta .tbl_one td',
    resultSummary: '.sis-result-summary .tbl_one td',
    resultGrid: '.sis-result-grid',
    resultTitle: '.sis-result-titlebar',
    dataTables: '.sis-dash-table, .sis-att-table, .sis-result-grid, .sis-reg-table, .sis-profile-table, .quiz_listing > .col-md-12 > table.table, .aps-courses-table',
  });
  app.adapter = {
    authenticated(doc = document) {
      const s = app.selectors;
      return !doc.querySelector(s.login) && !!doc.querySelector(s.logout) && !!doc.querySelector(s.content);
    },
    navigation(doc = document) {
      const seen = new Set();
      return [...doc.querySelectorAll(app.selectors.navigation)].flatMap(link => {
        const label = link.textContent.trim();
        const url = new URL(link.getAttribute('href'), doc.baseURI);
        if (!label || url.origin !== location.origin || url.search || url.hash ||
            /sign.?out|logout/i.test(url.pathname) || seen.has(url.pathname.toLowerCase())) return [];
        seen.add(url.pathname.toLowerCase());
        return [{ label, href: url.href }];
      });
    },
  };
})();
