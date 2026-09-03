# 2026-09 스쿼시 — 회초리·명예의 전당

`008_developer_feedback.sql` ~ `011_developer_feedback_admin_response.sql` 통합본은  
`007_developer_feedback_hall_of_fame.sql` 로 대체되었습니다.

기존 DB에 008~011 이력이 있어도 007은 idempotent(멱등)하게 groups·백필만 수행합니다.
