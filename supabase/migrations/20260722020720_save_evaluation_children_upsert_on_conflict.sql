-- save_evaluation_children — bản đầy đủ sau 2 bản vá ngày 22/07/2026:
--
-- (1) SECURITY DEFINER + kiểm tra quyền MỘT LẦN ở đầu hàm.
--     Trước đây hàm chạy SECURITY INVOKER: mỗi câu lệnh DML bên trong (~150 câu/lần lưu)
--     đánh giá lại RLS; policy manager quét toàn bộ form_submissions × can_view_profile
--     cho từng phiếu → vượt statement_timeout 8s khi hệ thống đạt ~120 phiếu → mọi lần
--     lưu (autosave / Lưu nháp / Xác nhận rà soát) đều bị hủy "canceling statement".
--
-- (2) UPSERT chống "duplicate key ... uniq_skill_action_per_priority".
--     Client mất id hành động (hệ quả những ngày lưu thất bại) → gửi lại hành động cũ
--     như dòng MỚI, INSERT đụng partial unique index (form, priority, nội dung).
--     INSERT các bảng hành động chuyển thành ON CONFLICT DO UPDATE theo đúng index —
--     dòng trùng nội dung được "nhận nuôi" (giữ id + trạng thái/tiến độ Kanban).

CREATE OR REPLACE FUNCTION public.save_evaluation_children(p_form_id uuid, p_skill_assessments jsonb DEFAULT '[]'::jsonb, p_skill_priorities jsonb DEFAULT '[]'::jsonb, p_skill_actions jsonb DEFAULT '[]'::jsonb, p_attitude_priorities jsonb DEFAULT '[]'::jsonb, p_attitude_actions jsonb DEFAULT '[]'::jsonb, p_ai_actions jsonb DEFAULT '[]'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  e jsonb;
  v_pid uuid;
  v_kept_skill_action_ids uuid[] := '{}';
  v_kept_att_action_ids uuid[] := '{}';
  v_kept_ai_action_ids uuid[] := '{}';
  v_new_id uuid;
  v_allowed boolean;
BEGIN
  IF p_form_id IS NULL THEN
    RAISE EXCEPTION 'p_form_id is required';
  END IF;

  -- Kiểm tra quyền một lần cho cả phiếu (thay cho RLS từng dòng):
  --   admin (system_admin/bgd/tcth_admin) · chủ phiếu · người rà soát ·
  --   manager/pgd trong phạm vi quản lý (can_view_profile).
  SELECT
    public.has_role(auth.uid(), 'system_admin'::app_role)
    OR public.has_role(auth.uid(), 'bgd'::app_role)
    OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
    OR fs.employee_id = public.get_my_profile_id()
    OR fs.reviewer_id = public.get_my_profile_id()
    OR (
      (public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'pgd'::app_role))
      AND public.can_view_profile(fs.employee_id)
    )
  INTO v_allowed
  FROM public.form_submissions fs
  WHERE fs.id = p_form_id;

  IF v_allowed IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Bạn không có quyền lưu phiếu đánh giá này' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.skill_assessments WHERE form_id = p_form_id;
  IF jsonb_array_length(p_skill_assessments) > 0 THEN
    INSERT INTO public.skill_assessments (
      form_id, skill_id, is_core, required_level, current_level,
      self_assessed_level, manager_assessed_level, self_l0, manager_l0,
      evidence, employee_comment, manager_note
    )
    SELECT
      p_form_id, (x->>'skill_id')::uuid, COALESCE((x->>'is_core')::boolean, false),
      NULLIF(x->>'required_level','')::int, NULLIF(x->>'current_level','')::int,
      NULLIF(x->>'self_assessed_level','')::int, NULLIF(x->>'manager_assessed_level','')::int,
      COALESCE((x->>'self_l0')::boolean, false), COALESCE((x->>'manager_l0')::boolean, false),
      NULLIF(x->>'evidence',''), NULLIF(x->>'employee_comment',''), NULLIF(x->>'manager_note','')
    FROM jsonb_array_elements(p_skill_assessments) AS x
    WHERE NULLIF(x->>'skill_id','') IS NOT NULL;
  END IF;

  FOR e IN SELECT * FROM jsonb_array_elements(p_skill_priorities)
  LOOP
    IF NULLIF(e->>'skill_id','') IS NULL THEN CONTINUE; END IF;
    INSERT INTO public.form_skill_priorities (
      form_id, skill_id, current_level, target_level, priority_order, reason_text, source_type, status
    ) VALUES (
      p_form_id, (e->>'skill_id')::uuid, NULLIF(e->>'current_level','')::int, NULLIF(e->>'target_level','')::int,
      COALESCE(NULLIF(e->>'priority_order','')::int, 0), NULLIF(e->>'reason_text',''),
      COALESCE(NULLIF(e->>'source_type',''), 'core'), COALESCE(NULLIF(e->>'status',''), 'planned')
    )
    ON CONFLICT (form_id, skill_id) DO UPDATE SET
      current_level = EXCLUDED.current_level, target_level = EXCLUDED.target_level,
      priority_order = COALESCE(EXCLUDED.priority_order, public.form_skill_priorities.priority_order),
      reason_text = EXCLUDED.reason_text,
      source_type = COALESCE(EXCLUDED.source_type, public.form_skill_priorities.source_type),
      status = COALESCE(EXCLUDED.status, public.form_skill_priorities.status),
      updated_at = now();
  END LOOP;
  DELETE FROM public.form_skill_priorities sp
  WHERE sp.form_id = p_form_id
    AND sp.skill_id NOT IN (SELECT (v->>'skill_id')::uuid FROM jsonb_array_elements(p_skill_priorities) v WHERE NULLIF(v->>'skill_id','') IS NOT NULL);

  FOR e IN SELECT * FROM jsonb_array_elements(p_attitude_priorities)
  LOOP
    IF NULLIF(e->>'attitude_dimension_id','') IS NULL THEN CONTINUE; END IF;
    INSERT INTO public.form_attitude_priorities (
      form_id, attitude_dimension_id, attitude_name, self_status, manager_status,
      current_status, desired_status, issue_summary, improvement_goal,
      evidence, employee_comment, manager_comment, priority_order, status
    ) VALUES (
      p_form_id, (e->>'attitude_dimension_id')::int,
      COALESCE(NULLIF(e->>'attitude_name',''), 'Nhóm ' || (e->>'attitude_dimension_id')),
      NULLIF(e->>'self_status',''), NULLIF(e->>'manager_status',''), NULLIF(e->>'current_status',''),
      NULLIF(e->>'desired_status',''), NULLIF(e->>'issue_summary',''), NULLIF(e->>'improvement_goal',''),
      NULLIF(e->>'evidence',''), NULLIF(e->>'employee_comment',''), NULLIF(e->>'manager_comment',''),
      COALESCE(NULLIF(e->>'priority_order','')::int, (e->>'attitude_dimension_id')::int),
      COALESCE(NULLIF(e->>'status',''), 'planned')
    )
    ON CONFLICT (form_id, attitude_dimension_id) DO UPDATE SET
      attitude_name = COALESCE(EXCLUDED.attitude_name, public.form_attitude_priorities.attitude_name),
      self_status = EXCLUDED.self_status, manager_status = EXCLUDED.manager_status,
      current_status = EXCLUDED.current_status, desired_status = EXCLUDED.desired_status,
      issue_summary = EXCLUDED.issue_summary, improvement_goal = EXCLUDED.improvement_goal,
      evidence = EXCLUDED.evidence, employee_comment = EXCLUDED.employee_comment,
      manager_comment = EXCLUDED.manager_comment,
      priority_order = COALESCE(EXCLUDED.priority_order, public.form_attitude_priorities.priority_order),
      status = COALESCE(EXCLUDED.status, public.form_attitude_priorities.status),
      updated_at = now();
  END LOOP;
  DELETE FROM public.form_attitude_priorities ap
  WHERE ap.form_id = p_form_id
    AND ap.attitude_dimension_id NOT IN (SELECT (v->>'attitude_dimension_id')::int FROM jsonb_array_elements(p_attitude_priorities) v WHERE NULLIF(v->>'attitude_dimension_id','') IS NOT NULL);

  FOR e IN SELECT * FROM jsonb_array_elements(p_skill_actions)
  LOOP
    SELECT id INTO v_pid FROM public.form_skill_priorities WHERE form_id = p_form_id AND skill_id = (e->>'skill_id')::uuid;
    IF v_pid IS NULL THEN CONTINUE; END IF;
    IF (e ? 'id') AND NULLIF(e->>'id','') IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.form_skill_actions WHERE id = (e->>'id')::uuid AND form_id = p_form_id) THEN
      UPDATE public.form_skill_actions AS t SET
        skill_priority_id = v_pid,
        row_no = COALESCE(NULLIF(e->>'row_no','')::int, t.row_no),
        action_type = COALESCE(NULLIF(e->>'action_type',''), t.action_type),
        action_text = COALESCE(NULLIF(e->>'action_text',''), t.action_text),
        expected_result = NULLIF(e->>'expected_result',''), deadline = NULLIF(e->>'deadline','')::date,
        requested_support = NULLIF(e->>'requested_support',''), evidence_expected = NULLIF(e->>'evidence_expected',''),
        status = COALESCE(NULLIF(e->>'status',''), t.status), actual_result = NULLIF(e->>'actual_result',''),
        manager_review = NULLIF(e->>'manager_review',''), updated_at = now()
      WHERE t.id = (e->>'id')::uuid;
      v_kept_skill_action_ids := v_kept_skill_action_ids || (e->>'id')::uuid;
    ELSE
      -- UPSERT theo partial unique index uniq_skill_action_per_priority:
      -- nội dung trùng → cập nhật dòng đã có (giữ id + trạng thái/tiến độ Kanban).
      INSERT INTO public.form_skill_actions (
        form_id, skill_priority_id, row_no, action_type, action_text, expected_result,
        deadline, requested_support, evidence_expected, status, actual_result, manager_review
      ) VALUES (
        p_form_id, v_pid, COALESCE(NULLIF(e->>'row_no','')::int, 1), COALESCE(NULLIF(e->>'action_type',''), '70'),
        COALESCE(NULLIF(e->>'action_text',''),'Chưa nhập'), NULLIF(e->>'expected_result',''),
        NULLIF(e->>'deadline','')::date, NULLIF(e->>'requested_support',''), NULLIF(e->>'evidence_expected',''),
        COALESCE(NULLIF(e->>'status',''), 'planned'), NULLIF(e->>'actual_result',''), NULLIF(e->>'manager_review','')
      )
      ON CONFLICT (form_id, skill_priority_id, lower(btrim(action_text)))
        WHERE (COALESCE(btrim(action_text), ''::text) <> ''::text)
          AND (lower(btrim(action_text)) <> ALL (ARRAY['chưa nhập'::text, 'chưa đặt tên'::text, '(chưa đặt tên)'::text, 'chưa có nội dung'::text, 'chưa có nội dung hành động'::text]))
      DO UPDATE SET
        row_no = COALESCE(EXCLUDED.row_no, public.form_skill_actions.row_no),
        action_type = COALESCE(EXCLUDED.action_type, public.form_skill_actions.action_type),
        expected_result = COALESCE(EXCLUDED.expected_result, public.form_skill_actions.expected_result),
        deadline = COALESCE(EXCLUDED.deadline, public.form_skill_actions.deadline),
        requested_support = COALESCE(EXCLUDED.requested_support, public.form_skill_actions.requested_support),
        evidence_expected = COALESCE(EXCLUDED.evidence_expected, public.form_skill_actions.evidence_expected),
        actual_result = COALESCE(EXCLUDED.actual_result, public.form_skill_actions.actual_result),
        manager_review = COALESCE(EXCLUDED.manager_review, public.form_skill_actions.manager_review),
        updated_at = now()
      RETURNING id INTO v_new_id;
      v_kept_skill_action_ids := v_kept_skill_action_ids || v_new_id;
    END IF;
  END LOOP;
  DELETE FROM public.form_skill_actions WHERE form_id = p_form_id AND NOT (id = ANY(v_kept_skill_action_ids));

  FOR e IN SELECT * FROM jsonb_array_elements(p_attitude_actions)
  LOOP
    SELECT id INTO v_pid FROM public.form_attitude_priorities WHERE form_id = p_form_id AND attitude_dimension_id = (e->>'attitude_dimension_id')::int;
    IF v_pid IS NULL THEN CONTINUE; END IF;
    IF (e ? 'id') AND NULLIF(e->>'id','') IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.form_attitude_actions WHERE id = (e->>'id')::uuid AND form_id = p_form_id) THEN
      UPDATE public.form_attitude_actions AS t SET
        attitude_priority_id = v_pid,
        row_no = COALESCE(NULLIF(e->>'row_no','')::int, t.row_no),
        action_text = COALESCE(NULLIF(e->>'action_text',''), t.action_text),
        expected_evidence = NULLIF(e->>'expected_evidence',''), deadline = NULLIF(e->>'deadline','')::date,
        requested_support = NULLIF(e->>'requested_support',''),
        status = COALESCE(NULLIF(e->>'status',''), t.status), actual_result = NULLIF(e->>'actual_result',''),
        manager_review = NULLIF(e->>'manager_review',''), updated_at = now()
      WHERE t.id = (e->>'id')::uuid;
      v_kept_att_action_ids := v_kept_att_action_ids || (e->>'id')::uuid;
    ELSE
      INSERT INTO public.form_attitude_actions (
        form_id, attitude_priority_id, row_no, action_text, expected_evidence,
        deadline, requested_support, status, actual_result, manager_review
      ) VALUES (
        p_form_id, v_pid, COALESCE(NULLIF(e->>'row_no','')::int, 1), COALESCE(NULLIF(e->>'action_text',''),'Chưa nhập'),
        NULLIF(e->>'expected_evidence',''), NULLIF(e->>'deadline','')::date, NULLIF(e->>'requested_support',''),
        COALESCE(NULLIF(e->>'status',''), 'planned'), NULLIF(e->>'actual_result',''), NULLIF(e->>'manager_review','')
      )
      ON CONFLICT (form_id, attitude_priority_id, lower(btrim(action_text)))
        WHERE (COALESCE(btrim(action_text), ''::text) <> ''::text)
          AND (lower(btrim(action_text)) <> ALL (ARRAY['chưa nhập'::text, 'chưa đặt tên'::text, '(chưa đặt tên)'::text, 'chưa có nội dung'::text, 'chưa có nội dung hành động'::text]))
      DO UPDATE SET
        row_no = COALESCE(EXCLUDED.row_no, public.form_attitude_actions.row_no),
        expected_evidence = COALESCE(EXCLUDED.expected_evidence, public.form_attitude_actions.expected_evidence),
        deadline = COALESCE(EXCLUDED.deadline, public.form_attitude_actions.deadline),
        requested_support = COALESCE(EXCLUDED.requested_support, public.form_attitude_actions.requested_support),
        actual_result = COALESCE(EXCLUDED.actual_result, public.form_attitude_actions.actual_result),
        manager_review = COALESCE(EXCLUDED.manager_review, public.form_attitude_actions.manager_review),
        updated_at = now()
      RETURNING id INTO v_new_id;
      v_kept_att_action_ids := v_kept_att_action_ids || v_new_id;
    END IF;
  END LOOP;
  DELETE FROM public.form_attitude_actions WHERE form_id = p_form_id AND NOT (id = ANY(v_kept_att_action_ids));

  FOR e IN SELECT * FROM jsonb_array_elements(p_ai_actions)
  LOOP
    DECLARE
      v_link_skill uuid := NULL;
      v_link_att uuid := NULL;
    BEGIN
      IF NULLIF(e->>'linked_skill_id','') IS NOT NULL THEN
        SELECT id INTO v_link_skill FROM public.form_skill_priorities WHERE form_id = p_form_id AND skill_id = (e->>'linked_skill_id')::uuid;
      END IF;
      IF NULLIF(e->>'linked_attitude_dimension_id','') IS NOT NULL THEN
        SELECT id INTO v_link_att FROM public.form_attitude_priorities WHERE form_id = p_form_id AND attitude_dimension_id = (e->>'linked_attitude_dimension_id')::int;
      END IF;
      IF (e ? 'id') AND NULLIF(e->>'id','') IS NOT NULL
         AND EXISTS (SELECT 1 FROM public.form_ai_actions_v2 WHERE id = (e->>'id')::uuid AND form_id = p_form_id) THEN
        UPDATE public.form_ai_actions_v2 AS t SET
          linked_skill_priority_id = v_link_skill, linked_attitude_priority_id = v_link_att,
          row_no = COALESCE(NULLIF(e->>'row_no','')::int, t.row_no),
          ai_action_text = COALESCE(NULLIF(e->>'ai_action_text',''), t.ai_action_text),
          expected_result = NULLIF(e->>'expected_result',''), deadline = NULLIF(e->>'deadline','')::date,
          requested_support = NULLIF(e->>'requested_support',''), evidence_expected = NULLIF(e->>'evidence_expected',''),
          status = COALESCE(NULLIF(e->>'status',''), t.status), actual_result = NULLIF(e->>'actual_result',''),
          manager_review = NULLIF(e->>'manager_review',''), unlinked_reason = NULLIF(e->>'unlinked_reason',''), updated_at = now()
        WHERE t.id = (e->>'id')::uuid;
        v_kept_ai_action_ids := v_kept_ai_action_ids || (e->>'id')::uuid;
      ELSE
        INSERT INTO public.form_ai_actions_v2 (
          form_id, linked_skill_priority_id, linked_attitude_priority_id, row_no, ai_action_text,
          expected_result, deadline, requested_support, evidence_expected, status, actual_result, manager_review, unlinked_reason
        ) VALUES (
          p_form_id, v_link_skill, v_link_att, COALESCE(NULLIF(e->>'row_no','')::int, 1),
          COALESCE(NULLIF(e->>'ai_action_text',''),'Chưa nhập'), NULLIF(e->>'expected_result',''),
          NULLIF(e->>'deadline','')::date, NULLIF(e->>'requested_support',''), NULLIF(e->>'evidence_expected',''),
          COALESCE(NULLIF(e->>'status',''), 'planned'), NULLIF(e->>'actual_result',''),
          NULLIF(e->>'manager_review',''), NULLIF(e->>'unlinked_reason','')
        )
        ON CONFLICT (form_id, lower(btrim(ai_action_text)))
          WHERE (COALESCE(btrim(ai_action_text), ''::text) <> ''::text)
            AND (lower(btrim(ai_action_text)) <> ALL (ARRAY['chưa nhập'::text, 'chưa đặt tên'::text, '(chưa đặt tên)'::text, 'chưa có nội dung'::text, 'chưa có nội dung hành động'::text]))
        DO UPDATE SET
          linked_skill_priority_id = COALESCE(EXCLUDED.linked_skill_priority_id, public.form_ai_actions_v2.linked_skill_priority_id),
          linked_attitude_priority_id = COALESCE(EXCLUDED.linked_attitude_priority_id, public.form_ai_actions_v2.linked_attitude_priority_id),
          row_no = COALESCE(EXCLUDED.row_no, public.form_ai_actions_v2.row_no),
          expected_result = COALESCE(EXCLUDED.expected_result, public.form_ai_actions_v2.expected_result),
          deadline = COALESCE(EXCLUDED.deadline, public.form_ai_actions_v2.deadline),
          requested_support = COALESCE(EXCLUDED.requested_support, public.form_ai_actions_v2.requested_support),
          evidence_expected = COALESCE(EXCLUDED.evidence_expected, public.form_ai_actions_v2.evidence_expected),
          actual_result = COALESCE(EXCLUDED.actual_result, public.form_ai_actions_v2.actual_result),
          manager_review = COALESCE(EXCLUDED.manager_review, public.form_ai_actions_v2.manager_review),
          unlinked_reason = COALESCE(EXCLUDED.unlinked_reason, public.form_ai_actions_v2.unlinked_reason),
          updated_at = now()
        RETURNING id INTO v_new_id;
        v_kept_ai_action_ids := v_kept_ai_action_ids || v_new_id;
      END IF;
    END;
  END LOOP;
  DELETE FROM public.form_ai_actions_v2 WHERE form_id = p_form_id AND NOT (id = ANY(v_kept_ai_action_ids));
END;
$function$;

-- SECURITY DEFINER: siết quyền gọi hàm — chỉ người dùng đã đăng nhập.
REVOKE ALL ON FUNCTION public.save_evaluation_children(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_evaluation_children(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_evaluation_children(uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) TO authenticated, service_role;
