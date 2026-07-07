-- Giới hạn phạm vi xem báo cáo của Phó Giám đốc: chỉ xem đầu mối do mình phụ trách
-- (council_subjects.supervisor_pgd_id = hồ sơ của họ) hoặc báo cáo của chính mình.
-- Trước đây mọi tài khoản có role 'bgd' (gồm cả Giám đốc lẫn 3 Phó Giám đốc) đều xem được
-- TẤT CẢ báo cáo. Nay tách riêng:
--   - Giám đốc Chi nhánh (council_members.member_group = 'giam_doc') + tcth_admin/system_admin: xem tất cả.
--   - Phó Giám đốc (role 'bgd' nhưng không phải Giám đốc): chỉ xem đầu mối mình phụ trách + báo cáo của chính mình.
--   - Người khác: chỉ xem báo cáo của chính mình (như cũ).
CREATE OR REPLACE FUNCTION public.get_council_subject_report(p_subject_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile uuid := public.get_my_profile_id();
  v_is_super_admin boolean := public.has_role(auth.uid(), 'system_admin'::app_role)
    OR public.has_role(auth.uid(), 'tcth_admin'::app_role);
  v_is_giam_doc boolean := EXISTS (
    SELECT 1 FROM public.council_members cm
    WHERE cm.profile_id = v_profile AND cm.is_active AND cm.member_group = 'giam_doc'
  );
  v_subject record;
  v_evaluations jsonb;
  v_total_members integer;
  v_submitted integer;
BEGIN
  SELECT s.id, s.round_id, s.profile_id, s.full_name, s.position, s.subject_level,
         s.supervisor_pgd_id, s.task_summary, s.measurement,
         r.name AS round_name, r.status AS round_status
    INTO v_subject
  FROM public.council_subjects s
  JOIN public.council_rounds r ON r.id = s.round_id
  WHERE s.id = p_subject_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy cán bộ đầu mối';
  END IF;

  IF NOT v_is_super_admin
     AND NOT v_is_giam_doc
     AND (v_subject.supervisor_pgd_id IS NULL OR v_subject.supervisor_pgd_id <> v_profile)
     AND (v_subject.profile_id IS NULL OR v_subject.profile_id <> v_profile)
  THEN
    RAISE EXCEPTION 'Bạn không có quyền xem báo cáo này';
  END IF;

  SELECT count(*) INTO v_total_members
  FROM public.council_members cm
  WHERE cm.is_active
    AND (v_subject.profile_id IS NULL OR cm.profile_id <> v_subject.profile_id);

  SELECT count(*) INTO v_submitted
  FROM public.council_evaluations e
  WHERE e.subject_id = p_subject_id AND e.status = 'submitted';

  SELECT COALESCE(jsonb_agg(row_data ORDER BY group_rank, anon_code), '[]'::jsonb)
    INTO v_evaluations
  FROM (
    SELECT
      CASE COALESCE(cm.member_group, 'thanh_vien')
        WHEN 'giam_doc' THEN 1
        WHEN 'pho_giam_doc' THEN CASE WHEN e.evaluator_id = v_subject.supervisor_pgd_id THEN 2 ELSE 3 END
        ELSE 4
      END AS group_rank,
      ('#' || lpad(((('x' || substr(md5(e.id::text), 1, 6))::bit(24)::int) % 1000)::text, 3, '0')) AS anon_code,
      jsonb_build_object(
        'anon_code', ('#' || lpad(((('x' || substr(md5(e.id::text), 1, 6))::bit(24)::int) % 1000)::text, 3, '0')),
        'member_group', COALESCE(cm.member_group, 'thanh_vien'),
        'is_supervisor', (e.evaluator_id = v_subject.supervisor_pgd_id),
        'scores', COALESCE(
          (SELECT jsonb_object_agg(cs.criterion_id::text, cs.score)
           FROM public.council_evaluation_scores cs WHERE cs.evaluation_id = e.id),
          '{}'::jsonb
        ),
        'evidences', COALESCE(
          (SELECT jsonb_object_agg(cs.criterion_id::text, cs.evidence)
           FROM public.council_evaluation_scores cs
           WHERE cs.evaluation_id = e.id AND cs.evidence IS NOT NULL AND btrim(cs.evidence) <> ''),
          '{}'::jsonb
        ),
        'strengths', e.strengths,
        'weaknesses', e.weaknesses,
        'suggestions', e.suggestions,
        'evidence', e.evidence,
        'wish', e.wish
      ) AS row_data
    FROM public.council_evaluations e
    LEFT JOIN public.council_members cm ON cm.profile_id = e.evaluator_id
    WHERE e.subject_id = p_subject_id AND e.status = 'submitted'
  ) t;

  RETURN jsonb_build_object(
    'subject', jsonb_build_object(
      'id', v_subject.id,
      'round_id', v_subject.round_id,
      'round_name', v_subject.round_name,
      'round_status', v_subject.round_status,
      'full_name', v_subject.full_name,
      'position', v_subject.position,
      'subject_level', v_subject.subject_level,
      'task_summary', v_subject.task_summary,
      'measurement', v_subject.measurement
    ),
    'total_members', v_total_members,
    'submitted_count', v_submitted,
    'evaluations', v_evaluations
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_council_subject_report(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_council_subject_report(uuid) TO authenticated;
