-- 평가계획 공유 테이블 구조 확인
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'evaluation_shares'
ORDER BY ordinal_position;

-- 특정 공유 코드 EANIYR 조회
SELECT * FROM evaluation_shares WHERE share_code = 'EANIYR';

-- 모든 공유 코드 목록 (최근 10개)
SELECT 
    share_code,
    evaluation_plan_id,
    created_by,
    allow_copy,
    view_count,
    created_at,
    expires_at
FROM evaluation_shares 
ORDER BY created_at DESC 
LIMIT 10;

-- evaluation_shares 테이블 존재 여부 확인
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'evaluation_shares'
);
EOF < /dev/null