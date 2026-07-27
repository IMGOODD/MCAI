# 테스트 구조

- `unit/`: 게임 서버 없이 실행하는 빠른 단위 테스트입니다. `src`와 같은 폴더 구조(`actions/`, `commands/`, `utils/` 등)로 파일을 추가합니다.
- `integration/`: Mineflayer 봇 또는 로컬 Minecraft 서버가 필요한 테스트입니다.
- `scenario/`: 채팅 명령부터 행동 완료까지의 사용자 시나리오 테스트입니다.

실행 명령:

```bash
npm test          # 모든 *.test.js 파일
npm run test:unit # 빠른 단위 테스트만
npm run test:watch
```

테스트 파일은 `*.test.js`로 만들고, `node:test`와 `node:assert/strict`를 사용합니다. 외부 게임 서버를 호출하지 않는 테스트를 기본으로 유지하세요.
