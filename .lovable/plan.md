## Mục tiêu

Đảm bảo phần "Trao đổi 1-1" luôn hiển thị cho Trưởng phòng khi cán bộ đã nhập, và ý kiến của Trưởng phòng được lưu khi bấm Lưu nháp — không ghi đè câu trả lời của cán bộ.

## File sửa

1. `src/pages/StaffEvaluation.tsx` (chính)
2. `src/components/evaluation/EvalSection1on1.tsx` (sửa nhẹ)
3. `src/pages/SelfAssessmentPage.tsx` (sửa nhẹ payload)

## Thay đổi chi tiết

### 1. `StaffEvaluation.tsx`

**Thêm helper (cấp module):**

```ts
const hasEmployeeOneOnOneAnswers = (answers: OneOnOneAnswers) =>
  Object.values(answers || {}).some((a: any) => (a?.employee || '').trim().length > 0);
```

**Trong component, trước render:**

```ts
const hasEmployeeAnswers = hasEmployeeOneOnOneAnswers(oneOnOneAnswers);
const displayOneOnOne = oneOnOneEnabled || hasEmployeeAnswers || isManagerMode;
```

**Sửa render EvalSection1on1 (~line 800):** truyền `enabled={displayOneOnOne}`.

**Sửa `handleSave` (line 439-445):**

```ts
if (isManagerMode) {
  if (oneOnOneEnabled || hasEmployeeAnswers) {
    formPayload.one_on_one_enabled = true;
  }
  formPayload.one_on_one_answers = oneOnOneAnswers as any;
} else {
  formPayload.one_on_one_enabled = oneOnOneEnabled || hasEmployeeAnswers;
  formPayload.one_on_one_answers = oneOnOneAnswers as any;
}
```

Cột `employee` không bị ghi đè vì TP đã được EvalSection1on1 disable input — state `oneOnOneAnswers` giữ nguyên dữ liệu CB đã load từ DB, TP chỉ thay đổi field `manager`.

### 2. `EvalSection1on1.tsx`

Hiện đã có `hasEmployeeAnswers`, `effectiveEnabled`, `toggleLocked`, và disable cột employee khi `isManager`. Bổ sung:

- Khi `isManager && !hasEmployeeAnswers && !enabled`: thay vì render 8 câu trống, hiển thị thông báo gọn:
  > "Cán bộ chưa nhập nội dung trao đổi 1-1."

Logic mới trong CardContent:

- Nếu `isManager && !hasEmployeeAnswers`: hiện thông báo gọn (không render 8 textarea).
- Ngược lại nếu `effectiveEnabled`: render đủ 8 câu như hiện nay.
- Ngược lại: giữ prompt "Bật công tắc..." cho CB.

### 3. `SelfAssessmentPage.tsx`

Tại 2 payload (line 515, 524), thay:

```ts
one_on_one_enabled: oneOnOneEnabled,
```

bằng:

```ts
one_on_one_enabled: oneOnOneEnabled || hasEmployeeOneOnOneAnswers(oneOnOneAnswers),
```

Import/khai báo helper tương tự.

## Không sửa

- DB schema, RLS, Kanban, workflow duyệt/trả lại, BMFormPage.

## Test

1. CB nhập q1+q2 → lưu nháp → TP mở thấy q1+q2 read-only.
2. CB nộp → TP thấy nội dung read-only.
3. TP nhập ý kiến CBQL → Lưu nháp → reload: cả 2 cột còn nguyên.
4. `one_on_one_enabled=false` mà answers có dữ liệu → TP vẫn thấy.
5. CB chưa nhập → TP thấy thông báo gọn.

OK triển khai theo plan này.

Phạm vi đúng:

- `src/pages/StaffEvaluation.tsx`
- `src/components/evaluation/EvalSection1on1.tsx`
- `src/pages/SelfAssessmentPage.tsx`

Không sửa DB schema, RLS, Kanban, workflow duyệt/trả lại, BMFormPage.

Bổ sung 2 lưu ý nhỏ:

1. TypeScript/helper  
Nếu `OneOnOneAnswers` chưa export hoặc chưa import được ở `SelfAssessmentPage.tsx`, có thể khai báo helper theo kiểu an toàn:

```
const hasEmployeeOneOnOneAnswers = (answers: any) =>
  Object.values(answers || {}).some((a: any) => (a?.employee || '').trim().length > 0);
```

Mục tiêu là tránh lỗi build do type không dùng chung giữa các file.

2. Với Trưởng phòng  
`displayOneOnOne = oneOnOneEnabled || hasEmployeeAnswers || isManagerMode` có thể khiến Trưởng phòng luôn thấy section 1-1, kể cả khi cán bộ chưa nhập gì.

Điều này chấp nhận được nếu `EvalSection1on1` hiển thị thông báo gọn:  
“Cán bộ chưa nhập nội dung trao đổi 1-1.”

Không render 8 câu hỏi trống cho Trưởng phòng trong trường hợp này.

Giữ đúng các điểm chính:

- Nếu cán bộ đã nhập 1-1 thì Trưởng phòng luôn nhìn thấy.
- Cột cán bộ read-only với Trưởng phòng.
- Cột ý kiến CBQL/lãnh đạo cho Trưởng phòng nhập.
- Khi Trưởng phòng bấm Lưu nháp, phải lưu `one_on_one_answers`.
- Không ghi đè mất phần `employee`.
- Nếu `one_on_one_enabled=false` nhưng answers có dữ liệu, vẫn hiển thị.
- SelfAssessmentPage khi lưu/nộp phải set `one_on_one_enabled = oneOnOneEnabled || hasEmployeeOneOnOneAnswers(oneOnOneAnswers)`.

Test bắt buộc:

1. Cán bộ nhập q1+q2 → lưu nháp → Trưởng phòng mở thấy q1+q2 read-only.
2. Cán bộ nộp → Trưởng phòng thấy nội dung read-only.
3. Trưởng phòng nhập ý kiến CBQL → Lưu nháp → reload: cả 2 cột còn nguyên.
4. `one_on_one_enabled=false` nhưng answers có dữ liệu → Trưởng phòng vẫn thấy.
5. Cán bộ chưa nhập → Trưởng phòng chỉ thấy thông báo gọn, không thấy 8 câu hỏi trống.