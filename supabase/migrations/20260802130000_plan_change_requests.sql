-- SỬA KẾ HOẠCH HÀNH ĐỘNG SAU PHÊ DUYỆT — PHẢI QUA PHÊ DUYỆT (yêu cầu GĐ 27/07)
--
-- Phiếu đã duyệt thì kế hoạch (mục D/E/F) khoá trên UI. Khi cần điều chỉnh giữa kỳ
-- (bỏ việc dồn từ kỳ trước, đổi hạn, thêm việc trọng tâm) — cán bộ gửi ĐỀ XUẤT SỬA,
-- người đánh giá của phiếu (đúng cấp đã duyệt phiếu: TP/PGĐ/GĐ theo reviewer_id)
-- phê duyệt thì mới áp vào. Thẻ Kanban tự theo vì các bảng hành động đã có trigger
-- sync/archive.
--
-- Giới hạn kế hoạch được ép cả ở server: tối đa 3 hành động upskill, 3 hành động AI,
-- 3 skill ưu tiên; hành động thái độ không giới hạn.
--
-- LƯU Ý an toàn dữ liệu: form_attitude_priorities dùng CHUNG với mục C (self_status/
-- manager_status/evidence...) nên khi áp bản sửa chỉ UPDATE các cột kế hoạch hoặc
-- INSERT dòng mới — KHÔNG BAO GIỜ DELETE dòng của bảng này.

CREATE TABLE IF NOT EXISTS public.plan_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES public.profiles(id),
  note text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  decided_by uuid REFERENCES public.profiles(id),
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_plan_change_pending_per_form
  ON public.plan_change_requests (form_id) WHERE status = 'pending';

ALTER TABLE public.plan_change_requests ENABLE ROW LEVEL SECURITY;

-- Xem: cán bộ của phiếu, người gửi, người đánh giá của phiếu, quản trị/TCTH
CREATE POLICY "plan_change_select" ON public.plan_change_requests FOR SELECT USING (
  employee_id = public.get_my_profile_id()
  OR requested_by = public.get_my_profile_id()
  OR EXISTS (SELECT 1 FROM public.form_submissions f
             WHERE f.id = form_id AND f.reviewer_id = public.get_my_profile_id())
  OR public.has_role(auth.uid(), 'system_admin')
  OR public.has_role(auth.uid(), 'bgd')
  OR public.has_role(auth.uid(), 'tcth_admin')
);

-- Gửi đề xuất: chính cán bộ của phiếu, phiếu đã duyệt (trước duyệt thì sửa thẳng)
CREATE POLICY "plan_change_insert" ON public.plan_change_requests FOR INSERT WITH CHECK (
  requested_by = public.get_my_profile_id()
  AND employee_id = public.get_my_profile_id()
  AND status = 'pending'
  AND EXISTS (SELECT 1 FROM public.form_submissions f
              WHERE f.id = form_id AND f.employee_id = employee_id
                AND f.status::text IN ('approved','closed'))
);

-- Rút đề xuất khi còn chờ duyệt
CREATE POLICY "plan_change_delete_own_pending" ON public.plan_change_requests FOR DELETE USING (
  requested_by = public.get_my_profile_id() AND status = 'pending'
);
-- Không có policy UPDATE: quyết định đi qua RPC security definer bên dưới.

-- ── RPC: người đánh giá của phiếu quyết định ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.decide_plan_change_request(
  p_request_id uuid,
  p_approve boolean,
  p_note text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_me uuid := public.get_my_profile_id();
  v_req record;
  v_form record;
  v_pl jsonb;
  v_ref_map jsonb := '{}'::jsonb;   -- token 'sp0'/'ap0' → uuid thật sau khi insert
  r jsonb;
  v_id uuid;
  v_ids uuid[];
  v_n int;
BEGIN
  SELECT * INTO v_req FROM public.plan_change_requests WHERE id = p_request_id FOR UPDATE;
  IF v_req IS NULL THEN RAISE EXCEPTION 'Không tìm thấy đề xuất'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'Đề xuất đã được xử lý (%).', v_req.status; END IF;

  SELECT * INTO v_form FROM public.form_submissions WHERE id = v_req.form_id;
  -- Đúng cấp như phiếu: chỉ người đánh giá của phiếu (reviewer_id) hoặc quản trị hệ thống
  IF v_me IS DISTINCT FROM v_form.reviewer_id
     AND NOT public.has_role(auth.uid(), 'system_admin') THEN
    RAISE EXCEPTION 'Chỉ người đánh giá của phiếu mới được duyệt đề xuất sửa kế hoạch';
  END IF;

  IF NOT p_approve THEN
    UPDATE public.plan_change_requests
       SET status = 'rejected', decided_by = v_me, decided_at = now(), decision_note = p_note
     WHERE id = p_request_id;
    RETURN 'rejected';
  END IF;

  v_pl := v_req.payload;

  -- Giới hạn kế hoạch (nguyên tắc 27/07) — ép ở server, không tin client
  SELECT count(*) INTO v_n FROM jsonb_array_elements(coalesce(v_pl->'skill_actions','[]'::jsonb)) e
   WHERE btrim(coalesce(e->>'action_text','')) <> '';
  IF v_n > 3 THEN RAISE EXCEPTION 'Kế hoạch có % hành động upskill — tối đa 3', v_n; END IF;
  SELECT count(*) INTO v_n FROM jsonb_array_elements(coalesce(v_pl->'ai_actions','[]'::jsonb)) e
   WHERE btrim(coalesce(e->>'ai_action_text','')) <> '';
  IF v_n > 3 THEN RAISE EXCEPTION 'Kế hoạch có % hành động AI — tối đa 3', v_n; END IF;
  SELECT count(*) INTO v_n FROM jsonb_array_elements(coalesce(v_pl->'skill_priorities','[]'::jsonb)) e;
  IF v_n > 3 THEN RAISE EXCEPTION 'Kế hoạch có % skill ưu tiên — tối đa 3', v_n; END IF;

  -- 1. XOÁ hành động không còn trong đề xuất (trigger archive sẽ lưu trữ thẻ Kanban)
  SELECT coalesce(array_agg((e->>'id')::uuid), '{}') INTO v_ids
    FROM jsonb_array_elements(coalesce(v_pl->'skill_actions','[]'::jsonb)) e WHERE e->>'id' IS NOT NULL;
  DELETE FROM public.form_skill_actions WHERE form_id = v_req.form_id AND NOT (id = ANY(v_ids));

  SELECT coalesce(array_agg((e->>'id')::uuid), '{}') INTO v_ids
    FROM jsonb_array_elements(coalesce(v_pl->'attitude_actions','[]'::jsonb)) e WHERE e->>'id' IS NOT NULL;
  DELETE FROM public.form_attitude_actions WHERE form_id = v_req.form_id AND NOT (id = ANY(v_ids));

  SELECT coalesce(array_agg((e->>'id')::uuid), '{}') INTO v_ids
    FROM jsonb_array_elements(coalesce(v_pl->'ai_actions','[]'::jsonb)) e WHERE e->>'id' IS NOT NULL;
  DELETE FROM public.form_ai_actions_v2 WHERE form_id = v_req.form_id AND NOT (id = ANY(v_ids));

  -- Xoá skill priority bị bỏ (mục D thuần — sau khi actions của nó đã xoá ở trên)
  SELECT coalesce(array_agg((e->>'id')::uuid), '{}') INTO v_ids
    FROM jsonb_array_elements(coalesce(v_pl->'skill_priorities','[]'::jsonb)) e WHERE e->>'id' IS NOT NULL;
  DELETE FROM public.form_skill_priorities WHERE form_id = v_req.form_id AND NOT (id = ANY(v_ids));
  -- form_attitude_priorities: KHÔNG xoá (mang dữ liệu mục C)

  -- 2. UPSERT skill priorities (token ref → id thật)
  FOR r IN SELECT * FROM jsonb_array_elements(coalesce(v_pl->'skill_priorities','[]'::jsonb)) LOOP
    IF r->>'id' IS NOT NULL THEN
      v_id := (r->>'id')::uuid;
      UPDATE public.form_skill_priorities SET
        skill_id = (r->>'skill_id')::uuid,
        current_level = NULLIF(r->>'current_level','')::int,
        target_level = NULLIF(r->>'target_level','')::int,
        priority_order = coalesce(NULLIF(r->>'priority_order','')::int, priority_order),
        reason_text = coalesce(r->>'reason_text', reason_text),
        source_type = coalesce(NULLIF(r->>'source_type',''), source_type),
        status = coalesce(NULLIF(r->>'status',''), status)
      WHERE id = v_id AND form_id = v_req.form_id;
    ELSE
      INSERT INTO public.form_skill_priorities
        (form_id, skill_id, current_level, target_level, priority_order, reason_text, source_type, status)
      VALUES (v_req.form_id, (r->>'skill_id')::uuid,
              NULLIF(r->>'current_level','')::int, NULLIF(r->>'target_level','')::int,
              coalesce(NULLIF(r->>'priority_order','')::int, 1),
              coalesce(r->>'reason_text',''), coalesce(NULLIF(r->>'source_type',''),'core_skill'),
              coalesce(NULLIF(r->>'status',''),'planned'))
      RETURNING id INTO v_id;
    END IF;
    IF r->>'ref' IS NOT NULL THEN v_ref_map := v_ref_map || jsonb_build_object(r->>'ref', v_id::text); END IF;
  END LOOP;

  -- 3. UPSERT attitude priorities (chỉ cột kế hoạch — không đụng cột mục C)
  FOR r IN SELECT * FROM jsonb_array_elements(coalesce(v_pl->'attitude_priorities','[]'::jsonb)) LOOP
    IF r->>'id' IS NOT NULL THEN
      v_id := (r->>'id')::uuid;
      UPDATE public.form_attitude_priorities SET
        current_status = coalesce(r->>'current_status', current_status),
        desired_status = coalesce(r->>'desired_status', desired_status),
        issue_summary = coalesce(r->>'issue_summary', issue_summary),
        improvement_goal = coalesce(r->>'improvement_goal', improvement_goal),
        priority_order = coalesce(NULLIF(r->>'priority_order','')::int, priority_order),
        status = coalesce(NULLIF(r->>'status',''), status)
      WHERE id = v_id AND form_id = v_req.form_id;
    ELSE
      INSERT INTO public.form_attitude_priorities
        (form_id, attitude_dimension_id, attitude_name, current_status, desired_status,
         issue_summary, improvement_goal, priority_order, status)
      VALUES (v_req.form_id, (r->>'attitude_dimension_id')::int, coalesce(r->>'attitude_name',''),
              coalesce(r->>'current_status',''), coalesce(r->>'desired_status',''),
              coalesce(r->>'issue_summary',''), coalesce(r->>'improvement_goal',''),
              coalesce(NULLIF(r->>'priority_order','')::int, 1), coalesce(NULLIF(r->>'status',''),'planned'))
      RETURNING id INTO v_id;
    END IF;
    IF r->>'ref' IS NOT NULL THEN v_ref_map := v_ref_map || jsonb_build_object(r->>'ref', v_id::text); END IF;
  END LOOP;

  -- 4. UPSERT actions (priority_ref = uuid thật hoặc token đã map)
  FOR r IN SELECT * FROM jsonb_array_elements(coalesce(v_pl->'skill_actions','[]'::jsonb)) LOOP
    v_id := coalesce((v_ref_map->>(r->>'priority_ref'))::uuid, NULLIF(r->>'priority_ref','')::uuid);
    IF r->>'id' IS NOT NULL THEN
      UPDATE public.form_skill_actions SET
        skill_priority_id = v_id, row_no = coalesce(NULLIF(r->>'row_no','')::int, row_no),
        action_type = coalesce(NULLIF(r->>'action_type',''), action_type),
        action_text = coalesce(r->>'action_text', action_text),
        expected_result = coalesce(r->>'expected_result', expected_result),
        deadline = NULLIF(r->>'deadline','')::date,
        requested_support = coalesce(r->>'requested_support', requested_support),
        evidence_expected = coalesce(r->>'evidence_expected', evidence_expected),
        status = coalesce(NULLIF(r->>'status',''), status)
      WHERE id = (r->>'id')::uuid AND form_id = v_req.form_id;
    ELSE
      INSERT INTO public.form_skill_actions
        (form_id, skill_priority_id, row_no, action_type, action_text, expected_result,
         deadline, requested_support, evidence_expected, status, actual_result, manager_review)
      VALUES (v_req.form_id, v_id, coalesce(NULLIF(r->>'row_no','')::int,1),
              coalesce(NULLIF(r->>'action_type',''),'70'), coalesce(r->>'action_text',''),
              coalesce(r->>'expected_result',''), NULLIF(r->>'deadline','')::date,
              coalesce(r->>'requested_support',''), coalesce(r->>'evidence_expected',''),
              coalesce(NULLIF(r->>'status',''),'planned'), '', coalesce(r->>'manager_review',''));
    END IF;
  END LOOP;

  FOR r IN SELECT * FROM jsonb_array_elements(coalesce(v_pl->'attitude_actions','[]'::jsonb)) LOOP
    v_id := coalesce((v_ref_map->>(r->>'priority_ref'))::uuid, NULLIF(r->>'priority_ref','')::uuid);
    IF r->>'id' IS NOT NULL THEN
      UPDATE public.form_attitude_actions SET
        attitude_priority_id = v_id, row_no = coalesce(NULLIF(r->>'row_no','')::int, row_no),
        action_text = coalesce(r->>'action_text', action_text),
        expected_evidence = coalesce(r->>'expected_evidence', expected_evidence),
        deadline = NULLIF(r->>'deadline','')::date,
        requested_support = coalesce(r->>'requested_support', requested_support),
        status = coalesce(NULLIF(r->>'status',''), status)
      WHERE id = (r->>'id')::uuid AND form_id = v_req.form_id;
    ELSE
      INSERT INTO public.form_attitude_actions
        (form_id, attitude_priority_id, row_no, action_text, expected_evidence,
         deadline, requested_support, status, actual_result, manager_review)
      VALUES (v_req.form_id, v_id, coalesce(NULLIF(r->>'row_no','')::int,1),
              coalesce(r->>'action_text',''), coalesce(r->>'expected_evidence',''),
              NULLIF(r->>'deadline','')::date, coalesce(r->>'requested_support',''),
              coalesce(NULLIF(r->>'status',''),'planned'), '', coalesce(r->>'manager_review',''));
    END IF;
  END LOOP;

  FOR r IN SELECT * FROM jsonb_array_elements(coalesce(v_pl->'ai_actions','[]'::jsonb)) LOOP
    IF r->>'id' IS NOT NULL THEN
      UPDATE public.form_ai_actions_v2 SET
        row_no = coalesce(NULLIF(r->>'row_no','')::int, row_no),
        ai_action_text = coalesce(r->>'ai_action_text', ai_action_text),
        expected_result = coalesce(r->>'expected_result', expected_result),
        deadline = NULLIF(r->>'deadline','')::date,
        requested_support = coalesce(r->>'requested_support', requested_support),
        evidence_expected = coalesce(r->>'evidence_expected', evidence_expected),
        status = coalesce(NULLIF(r->>'status',''), status),
        linked_skill_priority_id = coalesce((v_ref_map->>(r->>'linked_skill_priority_ref'))::uuid,
                                            NULLIF(r->>'linked_skill_priority_ref','')::uuid),
        linked_attitude_priority_id = coalesce((v_ref_map->>(r->>'linked_attitude_priority_ref'))::uuid,
                                               NULLIF(r->>'linked_attitude_priority_ref','')::uuid),
        unlinked_reason = coalesce(r->>'unlinked_reason', unlinked_reason)
      WHERE id = (r->>'id')::uuid AND form_id = v_req.form_id;
    ELSE
      INSERT INTO public.form_ai_actions_v2
        (form_id, linked_skill_priority_id, linked_attitude_priority_id, row_no, ai_action_text,
         expected_result, deadline, requested_support, evidence_expected, status, actual_result,
         manager_review, unlinked_reason)
      VALUES (v_req.form_id,
              coalesce((v_ref_map->>(r->>'linked_skill_priority_ref'))::uuid, NULLIF(r->>'linked_skill_priority_ref','')::uuid),
              coalesce((v_ref_map->>(r->>'linked_attitude_priority_ref'))::uuid, NULLIF(r->>'linked_attitude_priority_ref','')::uuid),
              coalesce(NULLIF(r->>'row_no','')::int,1), coalesce(r->>'ai_action_text',''),
              coalesce(r->>'expected_result',''), NULLIF(r->>'deadline','')::date,
              coalesce(r->>'requested_support',''), coalesce(r->>'evidence_expected',''),
              coalesce(NULLIF(r->>'status',''),'planned'), '', coalesce(r->>'manager_review',''),
              coalesce(r->>'unlinked_reason',''));
    END IF;
  END LOOP;

  UPDATE public.plan_change_requests
     SET status = 'approved', decided_by = v_me, decided_at = now(), decision_note = p_note
   WHERE id = p_request_id;
  RETURN 'approved';
END;
$function$;
