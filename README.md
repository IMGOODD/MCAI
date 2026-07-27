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

## Project structure

```text
src/
├─ actions/     # Mineflayer-level behavior
├─ commands/    # Command execution and result format
├─ core/        # Brain, planner, and domain planners
├─ data/        # Resources, recipes, fuel, combat, and equipment data
├─ events/      # Chat, lifecycle, safety, defense, and boat events
├─ llm/         # Provider-independent LLM interface
└─ utils/       # Shared inventory and planning utilities
```

## Notes

- `config.json` and `.env` are excluded from Git to protect API keys.
- Forge/modded servers can change block, item, entity, and pathfinding behavior. Test server-specific behavior before relying on the bot.
- This is a personal learning project. Feel free to modify and extend it under the MIT License.
