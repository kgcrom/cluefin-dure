// Finance commands extension for pi-coding-agent
// UX shell: 파라미터 파싱과 진행상황 표시만 담당
// 비즈니스 로직은 src/workflow/에 유지
//
// 향후 구현 예정:
// - /stock analyze 005930 → runEquityAnalysis 호출
// - /screen kospi value-quality → runScreening 호출
// - /backtest <strategyId> → runBacktestLoop 호출
//
// 현재는 CLI (src/main.ts)를 통해 실행

export {};
