# R6-B 로컬 코딩 세션: 예약 상태 관리 및 그룹 생성 콜백 수정

## 대상 파일
- `src/platform/features/booking/BookingView.jsx` (필수)
- `src/platform/features/booking/BookingView.css` (선택)
- `src/platform/features/plans/PlansView.jsx` (필수)

## 작업 내용

### 1. BookingView.jsx 수정
- **현재 문제**: `CURRENT_TASK` 요구사항에도 불구하고 예약 상태 업데이트 컨트롤 및 `onUpdateBookingStatus` 콜백이 누락됨.
- **수정 사항**:
  - 각 예약(Booking) 항목에 접근성(Accessible)을 갖춘 상태 변경 컨트롤 추가.
  - 지원 상태 값: `draft`, `requested`, `confirmed`, `cancelled`, `completed`, `failed`.
  - 상태 변경 시 `onUpdateBookingStatus` 콜백을 호출하며, 인자로 `booking.id`와 선택된 `status`를 전달.
  - **정책 표시 로직**: `Booking` 객체가 존재하지 않더라도 `PlanItems`에서 가져온 `BookingPolicy` 정보를 항상 표시하도록 수정하여 정책 정보가 숨겨지지 않도록 보장.
  - `Booking`과 `BookingPolicy`의 개념적 구분을 유지.

### 2. PlansView.jsx 수정
- **현재 문제**: `handleCreateGroup`이 `onCreateGroup`을 호출한 후 성공 여부와 무관하게 폼을 초기화(reset)함.
- **수정 사항**:
  - `onCreateGroup` 콜백 계약 변경: `CommandResult` 또는 동등한 성공/오류 구조를 반환하도록 수정.
  - **성공 시**: 폼 초기화 수행.
  - **실패 시**: 폼 데이터를 유지하고 오류 메시지를 표시.
  - 이 콜백 계약은 향후 Session C 통합과 일치해야 함.

## 제약 및 검증
- 다른 기존 동작은 보존.
- 빌드 검증 수행 (빌드가 이미 녹색(Green) 상태여도 구현을 수행).
- 출력은 Markdown 형식의 작업 지시서만 포함.
