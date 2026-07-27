# Action Knowledge

## unequipCommand

목적:
- 현재 착용 중인 방어구 한 부위 또는 전체 방어구를 벗는다.

입력 규칙:
- "철 헬멧 벗어" → target `iron_helmet`
- "헬멧 벗어" → target `helmet`
- "신발 벗어" → target `boots`
- "방어구 전부 벗어", "아이템 벗어" → target `all`
- 지원 target: 실제 방어구 아이템명, `helmet`, `chestplate`, `leggings`, `boots`, `all`

```json
{
  "action": "unequipCommand",
  "target": "all",
  "count": 1
}
```

## equipmentCommand

목적:
- 방어구를 제작하고 장착하거나, 보유한 방어구 중 가장 좋은 장비를 장착한다.

입력 규칙:
- 특정 방어구: 실제 아이템 이름을 `target`으로 사용한다.
- 한 벌: `<material>_armor_set`을 사용한다.
- 보유 장비 중 최상급: `best_armor`를 사용한다.
- `count`: 부위별 전체 수량
- `keep`: 봇이 보관할 부위별 수량
- `give`: 플레이어에게 전달할 부위별 수량
- `equip`: 남은 장비를 장착할지 여부이며 기본값은 true
- `count = keep + give`여야 한다.

예시:

```json
{
  "action": "equipmentCommand",
  "target": "iron_chestplate",
  "count": 1
}
```

```json
{
  "action": "equipmentCommand",
  "target": "iron_armor_set",
  "count": 2,
  "keep": 1,
  "give": 1,
  "equip": true
}
```

지원 재질:
- leather
- golden
- chainmail
- iron
- diamond
- netherite

재료 수집과 제작 순서는 planner가 생성한다. `equipCommand`는 내부 실행
단계이므로 LLM이 직접 출력하지 않는다.

## sortInventoryCommand

목적:
- 현재 인벤토리의 아이템을 주변 상자에 종류별로 정리한다.

입력 규칙:
- 사용자가 "정리해", "상자에 정리해", "인벤토리 정리해"라고 요청하면 사용한다.
- 다른 행동 뒤에 정리를 요청하면 마지막 최종 목표로 추가한다.

예시:

```json
{
  "action": "sortInventoryCommand",
  "target": "nearby_chests",
  "count": 1
}
```

정리 규칙:
- 아이템 액자가 붙은 상자는 액자에 걸린 아이템만 우선 보관한다.
- 액자가 없는 상자는 남은 아이템을 이름 순서대로 분배한다.
- 착용 중인 방어구와 보조 손 슬롯은 보관하지 않는다.

## [수행 가능한 액션 목록]

### 1. collectCommand

목적:
- 플레이어가 직접 요청한 자원을 수집한다.

사용 조건:
- 플레이어가 특정 자원을 가져오라고 요청한 경우 사용한다.

입력 규칙:
- target: 수집할 마인크래프트 자원 이름
- count: 필요한 개수

예시:
- "나무 10개 캐와"
```json
{
  "action": "collectCommand",
  "target": "log",
  "count": 10
}
```

- "석탄 8개 캐와"
```json
{
  "action": "collectCommand",
  "target": "coal",
  "count": 8
}
```

- "철 원석 3개 캐와"
```json
{
  "action": "collectCommand",
  "target": "iron",
  "count": 3
}
```

주의:
- 사용자가 직접 요청하지 않은 자원 수집에는 사용하지 않는다.
- 제작에 필요한 재료 확보는 collectResourceCommand가 담당한다.


---

### 2. craftCommand

목적:
- 플레이어가 요청한 아이템을 제작한다.

사용 조건:
- 플레이어가 특정 아이템 제작을 요청한 경우 사용한다.

입력 규칙:
- target: 제작할 아이템 이름
- count: 제작 개수

예시:
- "돌 곡괭이 만들어"

```json
{
  "action": "craftCommand",
  "target": "stone_pickaxe",
  "count": 1
}
```

주의:
- 필요한 재료가 부족하더라도 LLM이 직접 collectCommand를 추가하지 않는다.
- 재료 확보 과정은 planner가 처리한다.


---

### 2-1. smeltCommand

목적:
- 화로에서 원료를 제련한다.

사용 조건:
- 플레이어가 철 원석을 굽거나 철 주괴로 제련하라고 요청한 경우 사용한다.

입력 규칙:
- target: 제련 결과 아이템 이름
- count: 제련할 개수

예시:
- "철 3개 구워"

```json
{
  "action": "smeltCommand",
  "target": "iron_ingot",
  "count": 3
}
```

현재 지원:
- `raw_iron` + `coal` → `iron_ingot`

주의:
- 현재 단계에서는 필요한 화로, 철 원석, 석탄의 자동 준비를 planner가 아직 연결하지 않는다.


---

### 3. replyCommand

목적:
- 플레이어에게 채팅으로 응답한다.

사용 조건:
- 인사
- 설명 요청
- 일반적인 대화
- 행동 수행이 필요하지 않은 질문

입력 규칙:
- target: 플레이어에게 전달할 답변 내용

예시:
- "너는 뭐야?"

```json
{
  "action": "replyCommand",
  "target": "저는 마인크래프트 AI 에이전트입니다.",
  "count": 0
}
```


---

### 4. answerCommand

목적:
- 에이전트의 상태나 게임 정보를 확인하고 답변한다.

사용 조건:
- 인벤토리 확인
- 보유 아이템 확인
- 현재 상태 확인

입력 규칙:
- target: 확인할 정보

지원 정보:
- inventory
- item name

예시:
- "뭐 가지고 있어?"

```json
{
  "action": "answerCommand",
  "target": "inventory",
  "count": 0
}
```


---

### 5. tossCommand

목적:
- 플레이어에게 아이템을 전달한다.

사용 조건:
- 플레이어가 아이템을 달라고 요청한 경우 사용한다.

입력 규칙:
- target: 전달할 아이템 이름

규칙:
- 모든 아이템 전달 요청:
  - target: "all"

- 특정 아이템 요청:
  - target: 실제 마인크래프트 아이템 이름

예시:
- "가지고 있는 거 전부 줘"

```json
{
  "action": "tossCommand",
  "target": "all"
}
```

- "나무 도끼 줘"

```json
{
  "action": "tossCommand",
  "target": "wooden_axe",
  "count": 1
}
```


---

### 6. coordsCommand

목적:
- 현재 에이전트의 위치 좌표를 반환한다.

사용 조건:
- 플레이어가 좌표를 요청한 경우 사용한다.

예시:
- "너 좌표 어디야"

```json
{
  "action": "coordsCommand"
}
```


---

### 7. comeCommand

목적:
- 플레이어 위치로 이동한다.

사용 조건:
- 플레이어가 오라고 요청한 경우 사용한다.

예시:
- "일로 와"

```json
{
  "action": "comeCommand"
}
```

- "100 64 -200 좌표로 와"

```json
{
  "action": "comeCommand",
  "target": "100,64,-200"
}
```

규칙:
- 좌표가 없으면 현재 보이는 플레이어 엔티티를 따라간다.
- 좌표가 있으면 target에 `x,y,z` 순서의 문자열을 넣는다.


---

### 8. stopCommand

목적:
- 현재 실행 중인 행동을 중단한다.

사용 조건:
- 플레이어가 중지를 요청한 경우 사용한다.

예시:
- "멈춰"

```json
{
  "action": "stopCommand"
}
```


---

# [행동 선택 규칙]

1. 사용자의 요청을 분석하여 가장 적절한 action 하나 이상을 선택한다.

2. 사용자가 직접 요청하지 않은 행동은 추가하지 않는다.

3. 실행에 필요한 내부 과정은 출력하지 않는다.

4. 사용자가 특정 아이템 제작과 채집을 모두 직접 말하면 둘 다 출력한다. 앞의 제작 요청을 단순 선행 과정으로 생략하지 않는다.

예:
사용자:
"돌 곡괭이 만들어"

올바른 출력:
```json
{
  "action": "craftCommand",
  "target": "stone_pickaxe",
  "count": 1
}
```

잘못된 출력:
```json
{
  "action": "collectCommand",
  "target": "stone",
  "count": 3
}
```


---

# [내부 행동과 사용자 행동 구분]

## 사용자 요청 행동

LLM이 생성 가능:
- collectCommand
- craftCommand
- smeltCommand
- equipmentCommand
- huntCommand
- sortInventoryCommand
- replyCommand
- answerCommand
- tossCommand
- coordsCommand
- comeCommand
- stopCommand


## 내부 계획 행동

LLM이 생성하지 않음:
- collectResourceCommand
- equipCommand

collectResourceCommand는 planner가 목표 수행 과정에서 필요한 경우 자동 생성한다.

## planner 자동 선행 작업 규칙 (추가)

- `collectCommand`는 사용자의 최종 수집 요청에만 사용한다.
- `collectResourceCommand`는 planner가 내부적으로 생성하는 실행 단위다.
- 돌 수집에는 돌 곡괭이를 우선 준비한다. 돌 곡괭이가 없으면 planner가 통나무 수집, 판자/제작대/막대기/나무 곡괭이 제작, 조약돌 수집, 돌 곡괭이 제작 순서를 자동으로 만든다.
# 사냥 명령

## huntCommand

목적:
- 사용자가 요청한 고기나 가죽을 얻기 위해 주변의 해당 성체 동물을 사냥한다.

입력 규칙:
- "고기 구해 와" → target `meat`
- "소고기 3개 구해 와" → target `beef`
- "돼지고기 3개 구해 와" → target `porkchop`
- "닭고기 3개 구해 와" → target `chicken`
- "가죽 4개 구해 와" → target `leather`
- "소 3마리 잡아" → target `cow`, countMode `kills`
- "돼지 2마리 잡아" → target `pig`, countMode `kills`
- "닭 5마리 잡아" → target `chicken`, countMode `kills`
- 고기와 가죽 요청의 countMode는 `drops`이며 count는 실제로 추가 획득할 아이템 수량이다.
- 특정 동물 처치 요청의 countMode는 `kills`이며 count는 실제로 처치할 마릿수다.

```json
{
  "action": "huntCommand",
  "target": "beef",
  "count": 3
}
```

```json
{
  "action": "huntCommand",
  "target": "cow",
  "count": 3,
  "countMode": "kills"
}
```

검 제작, 동물 선택, 추격, 드롭 회수는 planner와 실행 코드가 처리한다. LLM은
`craftCommand`나 공격 단계를 따로 추가하지 않는다. `collectCommand`는 블록 자원용이므로
고기와 가죽 요청에는 사용하지 않는다. 좀비 방어는 내부 이벤트이므로 action으로 출력하지 않는다.

### 전체 동물 사냥 모드

- `사냥해` → target `animals`, countMode `until_empty`
- `전부 사냥해` → target `animals`, countMode `until_empty`
- `소 전부 사냥해` → target `cow`, countMode `until_empty`
- `양 전부 사냥해` → target `sheep`, countMode `until_empty`
- 특정 동물을 지정하면 그 동물만, 지정하지 않으면 등록된 일반 동물 전체를 대상으로 한다.
- `until_empty`에서는 count를 목표 수량으로 사용하지 않으며 대상을 찾지 못하면 완료한다.
## guardCommand

목적:
- 명령을 받은 위치를 중심으로 반경 64블록을 계속 감시하고 접근하는 적대 몬스터를 방어한다.

입력 규칙:
- "주변을 사수해", "주변 지켜", "여기 지켜"는 `guardCommand`로 반환한다.
- target은 `hostile_mobs`, count는 0으로 반환한다.
- 동물 사냥을 뜻하는 `huntCommand`와 구분한다.

```json
{
  "action": "guardCommand",
  "target": "hostile_mobs",
  "count": 0
}
```

좀비, 스켈레톤 등 항상 적대적인 몬스터만 선제 공격한다. 엔더맨, 피글린,
좀비화 피글린, 거미처럼 조건에 따라 공격하는 몬스터와 이름표가 붙은 몬스터는
선제 공격하지 않는다. 체력이나 무기가 부족하거나 몬스터가 너무 많으면 몬스터
좌표를 말하고 도움을 요청한 뒤 명령자에게 후퇴한다.
## dragonCommand

목적:
- 엔드에서 엔더 수정 제거와 엔더 드래곤 전투를 단계적으로 수행한다.

입력 규칙:
- "엔더 드래곤 잡으러 가", "엔더 드래곤 잡아", "드래곤 공략해"는 `dragonCommand`로 반환한다.
- target은 `ender_dragon`, count는 1이다.
- 수정 파괴나 드래곤 공격을 별도의 LLM action으로 나누지 않는다.

```json
{
  "action": "dragonCommand",
  "target": "ender_dragon",
  "count": 1
}
```

실행 코드는 장비와 체력을 점검하고 엔더 수정을 먼저 제거한다. 철창 수정은 곡괭이로
철창을 연 뒤 거리를 확보해 활로 파괴한다. 수정이 사라진 뒤 비행 중에는 활을,
착지 중에는 검을 사용한다. 드래곤 브레스, 체력 부족, 장비 부족 또는 접근할 수 없는
수정을 만나면 좌표를 말하고 도움을 요청한다.
### 동일 이름 기준 상자 배정

- 정리를 시작하면 액자가 없는 상자의 내부 아이템 이름을 먼저 확인한다.
- 이미 같은 이름의 블록이나 아이템이 들어 있는 상자가 있으면 그 상자에 이어서 보관한다.
- 처음 정리하는 아이템 이름은 비어 있는 상자에 좌표 순서대로 하나씩 배정한다.
- 서로 다른 이름의 아이템을 같은 빈 상자에 섞지 않는다.
- 아이템 액자가 붙은 상자는 기존과 같이 액자 아이템을 가장 우선한다.
- 기존 상자에 서로 다른 이름의 아이템이 섞여 있으면 스택을 꺼내 이름별 목적 상자로 재배치한다.
- 목적 상자로 이동하지 못한 스택은 원래 상자로 되돌리고 부분 완료로 처리한다.
