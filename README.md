# MCAI

Mincraft에서 자연어 명령을 받아 행동하는 Mineflayer 기반 개인 프로젝트입니다.<br>
제작, 채집, 제련, 사냥 같은 작업을 planner가 순서대로 나누어 실행합니다.<br>
아직 실제 서버 환경에서 예외 상황을 계속 수정 중 입니다.<br>

```text
Player chat → brain → planner → commands → actions
```

## Features

- `minecraft-data` 레시피를 읽는 재귀 제작 planner
- 인벤토리와 도구 내구도를 반영한 채집 계획
- 화로, 연료, 재료를 준비하는 제련 계획
- 장비 제작, 착용, 전달
- 동물 사냥과 기본적인 적대 몹 방어
- 상자와 액자를 기준으로 한 인벤토리 정리
- 문 열기, 물 회피, 보트를 활용한 복귀 이동
- 엔더 수정 파괴와 엔더 드래곤 전투 흐름

## Setup

```powershell
npm.cmd install
Copy-Item config.example.json config.json
```

`config.json`에서 서버와 LLM 제공자를 설정합니다. 실제 API 키는 파일에 넣지 않고 환경 변수로 설정합니다.

### OpenAI

```json
"llm": {
  "provider": "openai",
  "model": "gpt-5.4-mini",
  "apiKeyEnv": "OPENAI_API_KEY"
}
```

```powershell
$env:OPENAI_API_KEY = "your-api-key"
node index.js
```

### Gemini

```json
"llm": {
  "provider": "gemini",
  "model": "gemini-2.0-flash",
  "apiKeyEnv": "GEMINI_API_KEY"
}
```

```powershell
$env:GEMINI_API_KEY = "your-api-key"
node index.js
```

새 LLM을 추가하려면 `src/llm/providers/`에 provider 파일을 만듭니다. 각 provider는 자신의 기본 모델, API 키 환경 변수, API 호출 방식과 `generateJson({ systemPrompt, userPrompt })`를 관리합니다. `src/llm/index.js`에는 provider 이름과 모듈만 등록합니다.

## Test

```powershell
npm.cmd test
```

## Command examples

```text
나무 도끼 만들어
돌 64개 캐와
철 2개 재련해 와
철 방어구 2벌 만들어서 하나는 나 주고 하나는 입어
고기 15개 모아 와
주변을 사수해
정리해
와봐
100 64 -200으로 이동
엔더 드래곤 잡으러 가자
```

## 프로젝트 구조

```text
src/
├─ actions/     # Mineflayer를 직접 동작시키는 행동
├─ commands/    # 명령 실행과 반환값 처리
├─ core/        # brain, planner와 영역별 planner
├─ data/        # 자원, 레시피, 연료, 전투와 장비 데이터
├─ events/      # 채팅, 생명주기, 안전, 방어와 보트 이벤트
├─ llm/         # LLM provider 선택과 API 연결
└─ utils/       # 인벤토리와 계획에서 공통으로 사용하는 기능
```

## 참고사항

- API 키를 보호하기 위해 `config.json`과 `.env`는 Git에 포함하지 않습니다.
- Forge와 모드 서버에서는 블록, 아이템, 엔티티와 길 찾기 동작이 달라질 수 있습니다. 사용하는 서버에서 직접 테스트한 뒤 사용해 주세요.
- 개인 학습용 프로젝트입니다. MIT 라이선스에 따라 자유롭게 수정하고 확장해서 사용할 수 있습니다.
