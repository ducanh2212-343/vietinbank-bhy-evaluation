-- Trả lại trạng thái trước bản vá advisor (anon lại gọi được RPC như default
-- privileges của project vẫn cấp, và touch_updated_at bỏ khóa search_path).
grant execute on function public.declare_star_batch(integer,integer,text) to anon;
grant execute on function public.handover_stars(uuid,integer,integer,text,text) to anon;
grant execute on function public.revoke_handover(uuid) to anon;
grant execute on function public.award_star(text,integer[],boolean,uuid,text,text,text,text,date,uuid,text) to anon;
grant execute on function public.revoke_star_record(uuid) to anon;

alter function public.touch_updated_at() reset search_path;
grant execute on function public.touch_updated_at() to anon, authenticated;
